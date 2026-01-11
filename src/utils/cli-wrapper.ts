import * as vscode from 'vscode';
import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { logStructured } from '../extension';

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
  env?: Record<string, string>;
  /** Content to pipe to stdin (for --stdin mode) */
  stdin?: string;
  /** Suppress stdout from output channel (e.g., when stdout contains HTML) */
  suppressStdout?: boolean;
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
    if (outputChannel) {
      logStructured('INFO', 'cli-wrapper', 'resolve', 'success', 'Using custom CLI path', { path: customCliPath });
    }
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
    if (outputChannel) {
      logStructured('INFO', 'cli-wrapper', 'resolve', 'success', 'Using bundled CLI', { path: bundledCliPath });
    }
    return { command: 'node', prependArgs: [bundledCliPath] };
  }

  // 3) Try to find CLI relative to extension (for development in monorepo)
  // The extension is at project/pagemd-vscode, CLI is at project/pagemd/apps/cli
  const localCliPath = path.resolve(extensionRoot, '..', 'pagemd', 'apps', 'cli', 'src', 'index.js');

  if (fs.existsSync(localCliPath)) {
    if (outputChannel) {
      logStructured('INFO', 'cli-wrapper', 'resolve', 'success', 'Using local CLI', { path: localCliPath });
    }
    return { command: 'node', prependArgs: [localCliPath] };
  }

  // 4) Try workspace root (look for project structure)
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    // Check if we're in the PageMD monorepo
    const workspaceCliPath = path.join(workspaceFolder.uri.fsPath, 'apps', 'cli', 'src', 'index.js');
    if (fs.existsSync(workspaceCliPath)) {
      if (outputChannel) {
        logStructured('INFO', 'cli-wrapper', 'resolve', 'success', 'Using workspace CLI', { path: workspaceCliPath });
      }
      return { command: 'node', prependArgs: [workspaceCliPath] };
    }

    // Check for node_modules/.bin/pagemd
    const binPath = path.join(workspaceFolder.uri.fsPath, 'node_modules', '.bin', 'pagemd');
    if (fs.existsSync(binPath)) {
      if (outputChannel) {
        logStructured('INFO', 'cli-wrapper', 'resolve', 'success', 'Using node_modules CLI', { path: binPath });
      }
      return { command: binPath, prependArgs: [] };
    }
  }

  // 5) Fallback to npx
  if (outputChannel) {
    logStructured('WARN', 'cli-wrapper', 'resolve', 'fallback', 'Using npx pagemd');
  }
  return { command: 'npx', prependArgs: ['pagemd'] };
}

/**
 * Build environment variables object from VS Code settings.
 *
 * DESIGN PRINCIPLE: Only pass env vars when settings differ from CLI defaults.
 * When all settings are at defaults, this returns empty object, so CLI runs
 * with its defaults and frontmatter/profile can take full control.
 *
 * CLI Defaults Reference (from packages/core/src/env.js):
 * - PAGEMD_LOG_LEVEL: 'WARN'
 * - PAGEMD_DEBUG: false (disabled)
 * - PAGEMD_SYNTAX_HIGHLIGHT: true (enabled)
 * - PAGEMD_MERMAID: true (enabled)
 * - PAGEMD_BROWSER_PATH: null (auto-detect)
 * - PAGEMD_KEEP_CHROME: false (disabled)
 * - PAGEMD_HEADLESS: true (enabled)
 * - PAGEMD_PAGEDJS_MODE: 'browser'
 * - PAGEMD_TIMEOUT: 30000
 * - PAGEMD_JPEG_QUALITY: 90
 */
export function buildCliEnv(): Record<string, string> {
  const config = vscode.workspace.getConfiguration('pagemd');
  const env: Record<string, string> = {};

  // CLI log level
  // Empty string = disabled (CLI production default). Non-empty = set log level.
  const cliLogLevel = config.get<string>('cliLogLevel', '');
  if (cliLogLevel) {
    env.PAGEMD_LOG_LEVEL = cliLogLevel;
  }

  // Syntax highlighting - only pass if disabled (default is true/enabled)
  const syntaxHighlight = config.get<boolean>('syntaxHighlight', true);
  if (!syntaxHighlight) {
    env.PAGEMD_SYNTAX_HIGHLIGHT = '0';
  }

  // Mermaid diagrams - only pass if disabled (default is true/enabled)
  const mermaidDiagrams = config.get<boolean>('mermaidDiagrams', true);
  if (!mermaidDiagrams) {
    env.PAGEMD_MERMAID = '0';
  }

  // Browser path - only pass if set (default is empty/auto-detect)
  const browserPath = config.get<string>('browserPath', '');
  if (browserPath) {
    env.PAGEMD_BROWSER_PATH = browserPath;
  }

  // Keep browser alive - only pass if enabled (default is false)
  const keepBrowserAlive = config.get<boolean>('keepBrowserAlive', false);
  if (keepBrowserAlive) {
    env.PAGEMD_KEEP_CHROME = '1';
  }

  // Headless mode - only pass if disabled (default is true/enabled)
  // When disabled, browser stays open for inspection but process exits normally
  const headless = config.get<boolean>('headless', true);
  if (!headless) {
    env.PAGEMD_HEADLESS = '0';
  }

  // Paged.js mode - only pass if not default 'browser'
  const pagedJsMode = config.get<string>('pagedJsMode', 'browser');
  if (pagedJsMode !== 'browser') {
    env.PAGEMD_PAGEDJS_MODE = pagedJsMode;
  }

  // PDF timeout - only pass if not default 30000
  const pdfTimeout = config.get<number>('pdfTimeout', 30000);
  if (pdfTimeout !== 30000) {
    env.PAGEMD_TIMEOUT = String(pdfTimeout);
  }

  // JPEG quality - only pass if not default 90
  const jpegQuality = config.get<number>('jpegQuality', 90);
  if (jpegQuality !== 90) {
    env.PAGEMD_JPEG_QUALITY = String(jpegQuality);
  }

  return env;
}

/**
 * Run the PageMD CLI with the given arguments.
 *
 * Uses subprocess spawning (Phase 1 architecture).
 * Streams output to OutputChannel if provided.
 * Supports timeout and VS Code CancellationToken.
 */
export function runPageMD(config: CliConfig): Promise<CliResult> {
  const { args, cwd, timeout = 30000, token, outputChannel, env: customEnv, stdin: stdinContent, suppressStdout = false } = config;

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let killed = false;
    let child: ChildProcess;

    // Resolve CLI path with intelligent fallback
    const { command, prependArgs } = resolveCliPath(outputChannel);
    const fullArgs = [...prependArgs, ...args];

    // Merge custom env vars with process env
    // Custom env vars only contain non-default values (see buildCliEnv)
    const mergedEnv = customEnv && Object.keys(customEnv).length > 0
      ? { ...process.env, ...customEnv }
      : process.env;

    const options: SpawnOptions = {
      cwd,
      shell: true,
      detached: os.platform() !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: mergedEnv,
    };

    // Log the full command being executed
    if (outputChannel) {
      logStructured('DEBUG', 'cli-wrapper', 'execute', 'start', 'Executing CLI', { command, args: fullArgs });
      logStructured('DEBUG', 'cli-wrapper', 'execute', 'info', 'Working directory', { cwd });
      if (customEnv && Object.keys(customEnv).length > 0) {
        logStructured('INFO', 'cli-wrapper', 'execute', 'info', 'Custom environment', customEnv);
      }
    }

    try {
      child = spawn(command, fullArgs, options);
    } catch (err) {
      if (outputChannel) {
        logStructured('ERROR', 'cli-wrapper', 'execute', 'fail', 'Process spawn failed', { error: String(err) });
      }
      reject(err);
      return;
    }

    // Pipe stdin content if provided (for --stdin mode)
    if (stdinContent && child.stdin) {
      child.stdin.write(stdinContent, 'utf-8');
      child.stdin.end();
      if (outputChannel) {
        logStructured('DEBUG', 'cli-wrapper', 'execute', 'info', 'Piped stdin', { bytes: stdinContent.length });
      }
    }

    // Stream stdout
    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      // Only append to output channel if not suppressed (e.g., when stdout contains HTML)
      if (!suppressStdout) {
        outputChannel?.append(text);
      }
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
        if (outputChannel) {
          outputChannel.appendLine(''); // blank line for readability
          logStructured('ERROR', 'cli-wrapper', 'execute', 'fail', 'Process timed out', { timeout });
        }
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
