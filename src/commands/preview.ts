import * as vscode from 'vscode';
import { PreviewPanel } from '../providers/preview-panel';
import { ProfileState } from '../providers/profile-picker';

/**
 * Open paged preview for the active markdown file.
 */
export async function openPreview(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  profileState: ProfileState
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

  // Save file if dirty
  if (document.isDirty) {
    const saved = await document.save();
    if (!saved) {
      vscode.window.showWarningMessage('PageMD: Failed to save file before preview');
      return;
    }
  }

  outputChannel.appendLine(`[PageMD] Opening preview: ${document.fileName}`);

  // Create or show preview panel
  const panel = PreviewPanel.createOrShow(
    context.extensionUri,
    outputChannel,
    profileState
  );

  // Set up document watching
  panel.setupDocumentWatching(context);

  // Update with current document
  await panel.update(document.uri);
}
