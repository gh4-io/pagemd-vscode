import * as vscode from 'vscode';
import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Result from CLI command execution
 */
export interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
  killed: boolean;
}

/**
 * Configuration for CLI execution
 */
export interface CliConfig {
  args: string[];
  cwd: string;
  timeout?: number;
  token?: vscode.CancellationToken;
  outputChannel?: vscode.OutputChannel;
}

/**
 * Find the PageMD CLI executable path.
 * Priority: 1) Custom cliPath setting, 2) Local CLI in extension, 3) npx fallback
 */
function resolveCliPath(outputChannel?: vscode.OutputChannel): { command: string; prependArgs: string[] } {
  const vsConfig = vscode.workspace.getConfiguration('pagemd');
  const customCliPath = vsConfig.get<string>('cliPath', '');

  // 1) User-configured path
  if (customCliPath) {
    outputChannel?.appendLine(`[PageMD] Using custom CLI path: ${customCliPath}`);
    return { command: customCliPath, prependArgs: [] };
  }

  // 2) Try bundled CLI (for distributed extension with bundled CLI)
  // Build mode detection:
  //   - esbuild (VSIX): bundles to out/extension.js → __dirname = 'out/'
  //   - tsc (F5 dev):   preserves structure out/utils/cli-wrapper.js → __dirname = 'out/utils/'
  // Detect by checking if __dirname ends with 'utils' (tsc) or 'out' (esbuild)
  const isTscBuild = __dirname.endsWith('utils') || __dirname.endsWith('utils/') || __dirname.endsWith('utils\\');
  const extensionRoot = isTscBuild
    ? path.resolve(__dirname, '..', '..')  // out/utils/ → extension root
    : path.resolve(__dirname, '..');       // out/ → extension root
  // New esbuild single-file bundle
  const bundledCliPath = path.resolve(extensionRoot, 'bin', 'pagemd-cli.mjs');

  if (fs.existsSync(bundledCliPath)) {
    outputChannel?.appendLine(`[PageMD] Using bundled CLI: ${bundledCliPath}`);
    return { command: 'node', prependArgs: [bundledCliPath] };
  }

  // 3) Try to find CLI relative to extension (for development in monorepo)
  // The extension is at project/pagemd-vscode, CLI is at project/pagemd/apps/cli
  const localCliPath = path.resolve(extensionRoot, '..', 'pagemd', 'apps', 'cli', 'src', 'index.js');

  if (fs.existsSync(localCliPath)) {
    outputChannel?.appendLine(`[PageMD] Using local CLI: ${localCliPath}`);
    return { command: 'node', prependArgs: [localCliPath] };
  }

  // 4) Try workspace root (look for project structure)
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    // Check if we're in the PageMD monorepo
    const workspaceCliPath = path.join(workspaceFolder.uri.fsPath, 'apps', 'cli', 'src', 'index.js');
    if (fs.existsSync(workspaceCliPath)) {
      outputChannel?.appendLine(`[PageMD] Using workspace CLI: ${workspaceCliPath}`);
      return { command: 'node', prependArgs: [workspaceCliPath] };
    }

    // Check for node_modules/.bin/pagemd
    const binPath = path.join(workspaceFolder.uri.fsPath, 'node_modules', '.bin', 'pagemd');
    if (fs.existsSync(binPath)) {
      outputChannel?.appendLine(`[PageMD] Using node_modules CLI: ${binPath}`);
      return { command: binPath, prependArgs: [] };
    }
  }

  // 5) Fallback to npx
  outputChannel?.appendLine('[PageMD] Falling back to npx pagemd');
  return { command: 'npx', prependArgs: ['pagemd'] };
}

/**
 * Run the PageMD CLI with the given arguments.
 *
 * Uses subprocess spawning (Phase 1 architecture).
 * Streams output to OutputChannel if provided.
 * Supports timeout and VS Code CancellationToken.
 */
export function runPageMD(config: CliConfig): Promise<CliResult> {
  const { args, cwd, timeout = 30000, token, outputChannel } = config;

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let killed = false;
    let child: ChildProcess;

    // Resolve CLI path with intelligent fallback
    const { command, prependArgs } = resolveCliPath(outputChannel);
    const fullArgs = [...prependArgs, ...args];

    const options: SpawnOptions = {
      cwd,
      shell: true,
      detached: os.platform() !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    };

    // Log the full command being executed
    outputChannel?.appendLine(`[PageMD] Executing: ${command} ${fullArgs.join(' ')}`);
    outputChannel?.appendLine(`[PageMD] CWD: ${cwd}`);

    try {
      child = spawn(command, fullArgs, options);
    } catch (err) {
      outputChannel?.appendLine(`[PageMD] Spawn error: ${err}`);
      reject(err);
      return;
    }

    // Stream stdout
    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      outputChannel?.append(text);
    });

    // Stream stderr
    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      outputChannel?.append(text);
    });

    // Handle spawn errors
    child.on('error', (err) => {
      cleanup();
      reject(err);
    });

    // Handle process exit
    child.on('close', (code) => {
      cleanup();
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
        killed,
      });
    });

    // Cancellation token listener
    let tokenDisposable: vscode.Disposable | undefined;
    if (token) {
      tokenDisposable = token.onCancellationRequested(() => {
        killed = true;
        killChild();
      });
    }

    // Timeout handling
    let timeoutId: NodeJS.Timeout | undefined;
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        killed = true;
        killChild();
        outputChannel?.appendLine(`\n[PageMD] Process timed out after ${timeout}ms`);
      }, timeout);
    }

    function killChild(): void {
      if (os.platform() === 'win32') {
        // Windows: Use taskkill to kill process tree
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
      } else if (child.pid) {
        // Unix: Kill process group
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {
          child.kill('SIGTERM');
        }
      }
    }

    function cleanup(): void {
      tokenDisposable?.dispose();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  });
}

/**
 * Get list of available profiles from CLI.
 * Returns parsed JSON array of profile objects.
 */
export async function listProfiles(cwd: string): Promise<ProfileInfo[]> {
  const result = await runPageMD({
    args: ['list', 'profiles', '--json'],
    cwd,
    timeout: 10000,
  });

  if (result.code !== 0) {
    throw new Error(`Failed to list profiles: ${result.stderr}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`Failed to parse profile list: ${result.stdout}`);
  }
}

/**
 * Profile information returned by list profiles --json
 */
export interface ProfileInfo {
  id: string;
  description?: string;
  extends?: string;
  source: 'project' | 'workspace';
  filePath: string;
}
