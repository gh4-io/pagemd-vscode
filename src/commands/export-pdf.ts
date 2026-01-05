import * as vscode from 'vscode';
import { ProfileState } from '../providers/profile-picker';
import { exportDocument, EXPORT_FORMATS } from './export';

/**
 * Export the active markdown file to PDF.
 *
 * DEPRECATED: This function redirects to the generic exportDocument() for backward compatibility.
 * New code should use exportAs() for user-selected format or exportDocument() directly.
 */
export async function exportPdf(
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
      vscode.window.showWarningMessage('PageMD: Failed to save file before export');
      return;
    }
  }

  // Redirect to generic export with PDF format
  const pdfFormat = EXPORT_FORMATS.find((fmt) => fmt.id === 'pdf')!;
  await exportDocument(document, pdfFormat, outputChannel, profileState);
}
