import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { exportPdf } from './commands/export-pdf';
import { exportAs as exportAsCmd } from './commands/export';
import { openPreview as openPreviewCmd } from './commands/preview';
import {
  selectProfile as selectProfileCmd,
  createStatusBarItem,
  updateStatusBar,
} from './commands/select-profile';
import {
  validateDocument as validateDocumentCmd,
  setupDiagnosticsCleanup,
} from './commands/validate';
import { createDocument as createDocumentCmd } from './commands/create-document';
import { inspectDocument as inspectDocumentCmd } from './commands/inspect';
import { ProfileState } from './providers/profile-picker';
import { FormatState, showFormatPicker } from './providers/format-state';
import { OutputPathState } from './providers/output-path-state';

/**
 * PageMD VS Code Extension
 *
 * Thin client that wraps the PageMD CLI for in-editor preview and PDF export.
 * All rendering is delegated to CLI/core packages - no pipeline logic in extension host.
 */

// Shared state
let outputChannel: vscode.OutputChannel;
let profileState: ProfileState;
let formatState: FormatState;
let outputPathState: OutputPathState;
let statusBarItem: vscode.StatusBarItem;
let diagnostics: vscode.DiagnosticCollection;

/**
 * Called when the extension is activated.
 * Activation occurs when a markdown file is opened (see activationEvents in package.json).
 */
export function activate(context: vscode.ExtensionContext): void {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel('PageMD');
  context.subscriptions.push(outputChannel);

  log('PageMD extension activated');

  // Check for Chrome installation (soft warning if not found)
  checkChromeInstallation();

  // Initialize state providers
  profileState = new ProfileState(context);
  formatState = new FormatState(context);
  outputPathState = new OutputPathState(context);

  // Create diagnostics collection
  diagnostics = vscode.languages.createDiagnosticCollection('pagemd');
  context.subscriptions.push(diagnostics);
  context.subscriptions.push(setupDiagnosticsCleanup(diagnostics));

  // Create status bar item
  statusBarItem = createStatusBarItem();
  context.subscriptions.push(statusBarItem);
  updateStatusBar(statusBarItem, profileState.getSelectedProfile(), formatState);

  // Register commands
  const commands = [
    vscode.commands.registerCommand('pagemd.exportAs', () =>
      exportAsCmd(outputChannel, profileState, formatState, outputPathState)
    ),
    vscode.commands.registerCommand('pagemd.exportPdf', () =>
      exportPdf(outputChannel, profileState)
    ),
    vscode.commands.registerCommand('pagemd.openPreview', () =>
      openPreviewCmd(context, outputChannel, profileState)
    ),
    vscode.commands.registerCommand('pagemd.selectProfile', () =>
      selectProfileCmd(profileState, statusBarItem, outputChannel, formatState)
    ),
    vscode.commands.registerCommand('pagemd.validate', () =>
      validateDocumentCmd(outputChannel, profileState, diagnostics)
    ),
    vscode.commands.registerCommand('pagemd.createDocument', () =>
      createDocumentCmd(outputChannel)
    ),
    vscode.commands.registerCommand('pagemd.inspectDocument', () =>
      inspectDocumentCmd(outputChannel, profileState)
    ),
    // New commands for session state management
    vscode.commands.registerCommand('pagemd.selectFormats', async () => {
      const selected = await showFormatPicker(formatState.getSelectedFormats());
      if (selected) {
        await formatState.setSelectedFormats(selected);
        updateStatusBar(statusBarItem, profileState.getSelectedProfile(), formatState);
        vscode.window.showInformationMessage(
          `PageMD: Output formats set to ${selected.map(f => f.toUpperCase()).join(', ')}`
        );
      }
    }),
    vscode.commands.registerCommand('pagemd.setOutputPath', async () => {
      const current = outputPathState.getOutputPath();
      const result = await vscode.window.showInputBox({
        prompt: 'Output directory (leave empty for source directory)',
        value: current,
        placeHolder: '/path/to/output or leave empty',
      });
      if (result !== undefined) {
        await outputPathState.setOutputPath(result);
        vscode.window.showInformationMessage(
          result ? `PageMD: Output path set to ${result}` : 'PageMD: Using source directory for output'
        );
      }
    }),
    vscode.commands.registerCommand('pagemd.resetSessionOverrides', async () => {
      await profileState.clearSelection();
      await formatState.clearSelection();
      await outputPathState.clearSelection();
      updateStatusBar(statusBarItem, profileState.getSelectedProfile(), formatState);
      vscode.window.showInformationMessage('PageMD: Session overrides cleared - using settings defaults');
    }),
  ];

  context.subscriptions.push(...commands);

  log('Commands registered: exportAs, exportPdf, openPreview, selectProfile, validate, createDocument, inspectDocument, selectFormats, setOutputPath, resetSessionOverrides');
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
  log('PageMD extension deactivated');
}

// =============================================================================
// Utilities
// =============================================================================

function log(message: string): void {
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] ${message}`);
}

/**
 * Detect if Chrome/Chromium is installed on the system.
 * Returns path to Chrome executable or null if not found.
 */
function detectChrome(): string | null {
  const platform = os.platform();
  const chromePaths: string[] = [];

  if (platform === 'win32') {
    chromePaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
    );
  } else if (platform === 'darwin') {
    chromePaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    );
  } else if (platform === 'linux') {
    // Try 'which' command first
    try {
      const result = execSync('which google-chrome || which google-chrome-stable || which chromium || which chromium-browser', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      if (result) {
        return result;
      }
    } catch {
      // 'which' failed, try static paths
    }
    chromePaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    );
  }

  for (const chromePath of chromePaths) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  return null;
}

/**
 * Check for Chrome on activation and show soft warning if not found.
 * PDF generation will still fail with a clear error, but this gives users a heads-up.
 */
function checkChromeInstallation(): void {
  const chromePath = detectChrome();

  if (!chromePath) {
    log('Chrome/Chromium not detected on system');
    vscode.window.showInformationMessage(
      'PageMD: Chrome not detected. PDF generation requires Chrome or Chromium.',
      'Learn More',
      'Dismiss'
    ).then(selection => {
      if (selection === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://www.google.com/chrome/'));
      }
    });
  } else {
    log(`Chrome detected: ${chromePath}`);
  }
}
