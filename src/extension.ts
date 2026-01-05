import * as vscode from 'vscode';
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

/**
 * PageMD VS Code Extension
 *
 * Thin client that wraps the PageMD CLI for in-editor preview and PDF export.
 * All rendering is delegated to CLI/core packages - no pipeline logic in extension host.
 */

// Shared state
let outputChannel: vscode.OutputChannel;
let profileState: ProfileState;
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

  // Initialize profile state
  profileState = new ProfileState(context);

  // Create diagnostics collection
  diagnostics = vscode.languages.createDiagnosticCollection('pagemd');
  context.subscriptions.push(diagnostics);
  context.subscriptions.push(setupDiagnosticsCleanup(diagnostics));

  // Create status bar item
  statusBarItem = createStatusBarItem();
  context.subscriptions.push(statusBarItem);
  updateStatusBar(statusBarItem, profileState.getSelectedProfile());

  // Register commands
  const commands = [
    vscode.commands.registerCommand('pagemd.exportAs', () =>
      exportAsCmd(outputChannel, profileState)
    ),
    vscode.commands.registerCommand('pagemd.exportPdf', () =>
      exportPdf(outputChannel, profileState)
    ),
    vscode.commands.registerCommand('pagemd.openPreview', () =>
      openPreviewCmd(context, outputChannel, profileState)
    ),
    vscode.commands.registerCommand('pagemd.selectProfile', () =>
      selectProfileCmd(profileState, statusBarItem, outputChannel)
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
  ];

  context.subscriptions.push(...commands);

  log('Commands registered: exportAs, exportPdf, openPreview, selectProfile, validate, createDocument, inspectDocument');
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
