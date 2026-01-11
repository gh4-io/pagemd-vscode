import * as vscode from 'vscode';
import { PreviewPanel } from '../providers/preview-panel';
import { ProfileState } from '../providers/profile-picker';
import { logStructured } from '../extension';

/**
 * Options for opening the paged preview.
 */
export interface OpenPreviewOptions {
  /** Open in split view (beside current editor) instead of same tab */
  toSide?: boolean;
}

/**
 * Open paged preview for the active markdown file.
 * @param context - Extension context
 * @param outputChannel - Output channel for logging
 * @param profileState - Profile state provider
 * @param options - Preview options (toSide: open in split view)
 */
export async function openPreview(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  profileState: ProfileState,
  options: OpenPreviewOptions = {}
): Promise<void> {
  // Get active editor
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('PageMD: No active editor');
    return;
  }

  // Validate file type
  const document = editor.document;
  if (document.languageId !== 'markdown') {
    vscode.window.showWarningMessage('PageMD: Please open a Markdown file first');
    return;
  }

  // No save required - preview panel handles unsaved/untitled docs via stdin

  const viewColumn = options.toSide
    ? vscode.ViewColumn.Beside
    : vscode.ViewColumn.Active;

  logStructured('INFO', 'command', 'preview', 'start', 'Opening preview', {
    file: document.fileName,
    mode: options.toSide ? 'split' : 'same tab'
  });

  // Create or show preview panel
  const panel = PreviewPanel.createOrShow(
    context.extensionUri,
    outputChannel,
    profileState,
    viewColumn
  );

  // Set up document watching
  panel.setupDocumentWatching(context);

  // Update with current document
  await panel.update(document.uri);
}
