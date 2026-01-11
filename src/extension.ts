import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { exportPdf } from './commands/export-pdf';
import { exportAs as exportAsCmd, exportAll as exportAllCmd } from './commands/export';
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
import { initCommand as initCommandImpl } from './commands/init';
import { ProfileState } from './providers/profile-picker';
import { FormatState, showFormatPicker } from './providers/format-state';
import { OutputPathState } from './providers/output-path-state';
import { PreviewPanel } from './providers/preview-panel';

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

  // Check for deprecated settings and offer migration
  checkDeprecatedSettings();

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
    vscode.commands.registerCommand('pagemd.exportAll', () =>
      exportAllCmd(outputChannel, profileState, formatState, outputPathState)
    ),
    vscode.commands.registerCommand('pagemd.openPreview', () =>
      openPreviewCmd(context, outputChannel, profileState)
    ),
    vscode.commands.registerCommand('pagemd.openPreviewToSide', () =>
      openPreviewCmd(context, outputChannel, profileState, { toSide: true })
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
    vscode.commands.registerCommand('pagemd.init', (uri?: vscode.Uri) =>
      initCommandImpl(outputChannel, uri)
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
    vscode.commands.registerCommand('pagemd.refreshPreview', () => {
      if (PreviewPanel.currentPanel) {
        PreviewPanel.currentPanel.refresh();
      }
    }),
    vscode.commands.registerCommand('pagemd.openDevTools', () => {
      vscode.commands.executeCommand('workbench.action.webview.openDeveloperTools');
    }),
  ];

  context.subscriptions.push(...commands);

  log('Commands registered: exportAs, exportPdf, exportAll, openPreview, openPreviewToSide, selectProfile, validate, createDocument, inspectDocument, init, selectFormats, setOutputPath, resetSessionOverrides, refreshPreview, openDevTools');
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

/**
 * Log level priority mapping.
 * Lower numbers = more severe (always shown).
 * Higher numbers = more verbose (filtered out unless level is increased).
 */
const LOG_LEVELS = {
  OFF: 0,
  FATAL: 1,
  ERROR: 2,
  WARN: 3,
  INFO: 4,
  DEBUG: 5,
  TRACE: 6,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Get current extension log level from settings.
 */
function getExtensionLogLevel(): LogLevel {
  const config = vscode.workspace.getConfiguration('pagemd');
  return config.get<LogLevel>('extensionLogLevel', 'INFO');
}

/**
 * Check if a log message should be shown based on current log level.
 */
function shouldLog(messageLevel: LogLevel): boolean {
  const config = vscode.workspace.getConfiguration('pagemd');
  const configuredLevel = config.get<string>('extensionLogLevel', 'INFO');

  // Empty string disables all logging
  if (!configuredLevel) {
    return false;
  }

  // Show message if its priority is <= configured level priority
  // (lower number = more severe = always shown)
  const levelValue = LOG_LEVELS[configuredLevel as LogLevel];
  if (levelValue === undefined) {
    return true; // Unknown level, default to showing
  }
  return LOG_LEVELS[messageLevel] <= levelValue;
}

/**
 * Format timestamp in bracket-compatible format.
 * Returns: YYYY-MM-DD HH:mm:ss.SSS
 */
function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}.${ms}`;
}

/**
 * Simple lifecycle logger for extension events.
 * Format: YYYY-MM-DD HH:mm:ss.SSS [PageMD] message
 *
 * Always shown (bypasses log level filtering).
 */
function log(message: string): void {
  const timestamp = formatTimestamp();
  outputChannel.appendLine(`${timestamp} [PageMD-Ext] ${message}`);
}

/**
 * Structured logger for detailed diagnostic messages.
 * Format: YYYY-MM-DD HH:mm:ss.SSS [level] [PageMD] [module][section] result: message; data
 *
 * Respects pagemd.extensionLogLevel setting - only logs at or above configured level.
 */
function logStructured(
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL',
  module: string,
  section: string,
  result?: string,
  message?: string,
  data?: any
): void {
  // Check if this log level should be shown
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = formatTimestamp();
  const metadata = `${timestamp} [PageMD-Ext] [${level}] [${module}][${section}]`;

  // Waterfall logic
  const hasResult = result !== undefined && result !== null;
  const hasMessage = message !== undefined && message !== null;
  const hasData = data !== undefined && data !== null;

  let payload = '';
  if (hasData) {
    const resultPart = hasResult ? result : '';
    const messagePart = hasMessage ? String(message) : '';
    payload = `${resultPart}: ${messagePart}; ${JSON.stringify(data)}`;
  } else if (hasMessage) {
    const resultPart = hasResult ? result : '';
    payload = `${resultPart}: ${String(message)}`;
  } else if (hasResult) {
    payload = `${result}:`;
  }

  outputChannel.appendLine(payload ? `${metadata} ${payload}` : metadata);
}

// Export for use in other extension files
export { outputChannel, log, logStructured };

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

/**
 * Check for deprecated settings and offer migration.
 * - debugMode, logLevel → preview.debugLevel + cliLogLevel (v0.2.0)
 * - autoRefreshPreview, previewTrigger → previewRefresh (v0.1.3)
 */
function checkDeprecatedSettings(): void {
  const config = vscode.workspace.getConfiguration('pagemd');

  // Helper to check if a setting is explicitly set (not just default)
  const isExplicitlySet = <T>(inspect: vscode.WorkspaceConfiguration['inspect'] extends (key: string) => infer R ? R : never): boolean => {
    const result = inspect as { globalValue?: T; workspaceValue?: T; workspaceFolderValue?: T } | undefined;
    return result?.globalValue !== undefined
      || result?.workspaceValue !== undefined
      || result?.workspaceFolderValue !== undefined;
  };

  // Check deprecated settings
  const hasDebugMode = isExplicitlySet(config.inspect<boolean>('debugMode'));
  const hasLogLevel = isExplicitlySet(config.inspect<string>('logLevel'));
  const hasAutoRefresh = isExplicitlySet(config.inspect<boolean>('autoRefreshPreview'));
  const hasPreviewTrigger = isExplicitlySet(config.inspect<string>('previewTrigger'));

  if (!hasDebugMode && !hasLogLevel && !hasAutoRefresh && !hasPreviewTrigger) {
    return; // No deprecated settings found
  }

  const deprecated = [
    hasDebugMode ? 'debugMode' : null,
    hasLogLevel ? 'logLevel' : null,
    hasAutoRefresh ? 'autoRefreshPreview' : null,
    hasPreviewTrigger ? 'previewTrigger' : null,
  ].filter(Boolean);

  log('Deprecated settings detected: ' + deprecated.join(', '));

  // Build migration message
  const deprecatedList: string[] = [];
  if (hasDebugMode) {
    deprecatedList.push('debugMode → preview.debugLevel + cliLogLevel');
  }
  if (hasLogLevel) {
    deprecatedList.push('logLevel → cliLogLevel');
  }
  if (hasAutoRefresh || hasPreviewTrigger) {
    deprecatedList.push('autoRefreshPreview + previewTrigger → previewRefresh');
  }

  vscode.window.showWarningMessage(
    `PageMD: Deprecated settings detected. Please migrate: ${deprecatedList.join(', ')}`,
    'Open Settings',
    'Learn More',
    'Dismiss'
  ).then(selection => {
    if (selection === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'pagemd');
    } else if (selection === 'Learn More') {
      vscode.window.showInformationMessage(
        'Migration: autoRefreshPreview + previewTrigger → previewRefresh ("manual", "onSave", or "live"). ' +
        'debugMode=true → preview.debugLevel="basic". logLevel="X" → cliLogLevel="X". Remove old settings after migrating.'
      );
    }
  });
}
