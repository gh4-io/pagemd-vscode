import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * File logger utility for PageMD extension.
 *
 * Writes logs to a file when enabled via settings.
 * Each write overwrites the file (only contains latest log output).
 *
 * Settings:
 * - pagemd.logToFile: boolean - Enable file logging
 * - pagemd.logFilePath: string - Custom log file path (optional)
 *
 * Default log file location:
 * - Workspace: {workspaceRoot}/pagemd.log
 * - No workspace: {temp}/pagemd.log
 */

let fileLogEnabled = false;
let logFilePath: string | null = null;

/**
 * Initialize file logger based on settings.
 * Should be called on extension activation and when settings change.
 */
export function initFileLogger(): void {
  const config = vscode.workspace.getConfiguration('pagemd');
  fileLogEnabled = config.get<boolean>('logToFile', false);

  if (!fileLogEnabled) {
    logFilePath = null;
    return;
  }

  // Determine log file path
  const customPath = config.get<string>('logFilePath', '');
  if (customPath) {
    logFilePath = customPath;
  } else {
    // Default: workspace root or temp directory
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      logFilePath = path.join(workspaceFolder.uri.fsPath, 'pagemd.log');
    } else {
      logFilePath = path.join(os.tmpdir(), 'pagemd.log');
    }
  }
}

/**
 * Close the file logger and release resources.
 * Should be called on extension deactivation.
 */
export function closeFileLogger(): void {
  // No stream to close - using writeFileSync
  logFilePath = null;
  fileLogEnabled = false;
}

/**
 * Clear the log file (call at start of new action).
 * Each export/preview/build operation should clear the log first,
 * then append entries during that operation.
 */
export function clearLogFile(): void {
  if (!fileLogEnabled || !logFilePath) {
    return;
  }

  try {
    fs.writeFileSync(logFilePath, '', 'utf8');
  } catch (err) {
    console.error(`PageMD log clear error: ${err}`);
  }
}

/**
 * Write content to the log file (appends to existing content).
 * @param content The content to append
 */
export function writeToLogFile(content: string): void {
  if (!fileLogEnabled || !logFilePath) {
    return;
  }

  try {
    fs.appendFileSync(logFilePath, content + '\n', 'utf8');
  } catch (err) {
    // Silently fail - don't interrupt extension operation
    console.error(`PageMD file write error: ${err}`);
  }
}

/**
 * Check if file logging is currently enabled.
 */
export function isFileLogEnabled(): boolean {
  return fileLogEnabled;
}

/**
 * Get the current log file path (or null if not logging to file).
 */
export function getLogFilePath(): string | null {
  return fileLogEnabled ? logFilePath : null;
}

/**
 * Handle settings change - reinitialize logger if needed.
 */
export function onSettingsChange(): void {
  const config = vscode.workspace.getConfiguration('pagemd');
  const newEnabled = config.get<boolean>('logToFile', false);
  const newPath = config.get<string>('logFilePath', '');

  // Check if settings changed
  const pathChanged = newPath !== (logFilePath || '');
  const enabledChanged = newEnabled !== fileLogEnabled;

  if (enabledChanged || (newEnabled && pathChanged)) {
    initFileLogger();
  }
}
