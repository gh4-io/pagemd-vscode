import * as vscode from 'vscode';
import * as path from 'path';
import { runPageMD, CliResult } from '../utils/cli-wrapper';
import { ProfileState } from '../providers/profile-picker';

/**
 * Export format definition for QuickPick
 */
export interface ExportFormat {
  id: string;
  label: string;
  extension: string;
  description: string;
}

/**
 * Available export formats
 */
export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'pdf',
    label: 'PDF',
    extension: '.pdf',
    description: 'Recommended - Paged.js layout with print-ready output',
  },
  {
    id: 'html',
    label: 'HTML',
    extension: '.html',
    description: 'Standalone HTML file with embedded styles',
  },
  {
    id: 'png',
    label: 'PNG',
    extension: '.png',
    description: 'Raster image (renders each page as PNG)',
  },
  {
    id: 'jpeg',
    label: 'JPEG',
    extension: '.jpeg',
    description: 'Raster image (renders each page as JPEG)',
  },
];

/**
 * Export the active markdown file with user-selected format.
 *
 * Shows QuickPick for format selection, then delegates to exportDocument().
 */
export async function exportAs(
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

  // Show format picker
  const selectedFormat = await vscode.window.showQuickPick(
    EXPORT_FORMATS.map((fmt) => ({
      label: fmt.label,
      description: fmt.description,
      format: fmt,
    })),
    {
      placeHolder: 'Select export format',
      title: 'PageMD: Export Document',
    }
  );

  if (!selectedFormat) {
    return; // User cancelled
  }

  // Export with selected format
  await exportDocument(
    document,
    selectedFormat.format,
    outputChannel,
    profileState
  );
}

/**
 * Export a document to the specified format.
 *
 * Core export implementation used by both exportAs() and exportPdf().
 */
export async function exportDocument(
  document: vscode.TextDocument,
  format: ExportFormat,
  outputChannel: vscode.OutputChannel,
  profileState: ProfileState
): Promise<void> {
  const filePath = document.uri.fsPath;
  const fileName = path.basename(filePath);
  const cwd = path.dirname(filePath);

  // Get profile from state (respects workspace selection)
  const profile = profileState.getSelectedProfile();
  const config = vscode.workspace.getConfiguration('pagemd');
  const debugMode = config.get<boolean>('debugMode', false);
  const outputPath = config.get<string>('outputPath', '');
  const showOutputPanelOn = config.get<string>('showOutputPanelOn', 'onError');
  const jpegQuality = config.get<number>('jpegQuality', 90);
  const pdfTimeout = config.get<number>('pdfTimeout', 60000);
  const headless = config.get<boolean>('headless', true);
  const pagedJsMode = config.get<string>('pagedJsMode', 'browser');

  // Build CLI arguments
  const args = ['build', filePath, '-o', format.id, '-p', profile];
  if (debugMode) {
    args.push('--debug');
  }
  if (outputPath) {
    args.push('-d', outputPath);
  }
  if (format.id === 'jpeg') {
    // JPEG quality applies only to JPEG format
    args.push('--jpeg-quality', String(jpegQuality));
  }
  if (!headless) {
    args.push('--no-headless');
  }
  if (pagedJsMode === 'cli') {
    args.push('--pagedjs');
  }

  // Show output channel based on setting
  const shouldShowOutput = showOutputPanelOn === 'always';
  if (shouldShowOutput) {
    outputChannel.show(true);
  }
  outputChannel.appendLine(`\n${'='.repeat(60)}`);
  outputChannel.appendLine(`[PageMD] Exporting to ${format.label}: ${fileName}`);
  outputChannel.appendLine(`[PageMD] Profile: ${profile}`);
  outputChannel.appendLine(`${'='.repeat(60)}\n`);

  // Run with progress
  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Exporting ${fileName} to ${format.label}...`,
        cancellable: true,
      },
      async (progress, token) => {
        return runPageMD({
          args,
          cwd,
          timeout: pdfTimeout,
          token,
          outputChannel,
        });
      }
    );

    handleResult(result, filePath, format, outputChannel, showOutputPanelOn);
  } catch (err) {
    handleError(err, format, outputChannel);
  }
}

/**
 * Handle CLI result - show success or failure notification.
 */
function handleResult(
  result: CliResult,
  filePath: string,
  format: ExportFormat,
  outputChannel: vscode.OutputChannel,
  showOutputPanelOn: string
): void {
  const fileName = path.basename(filePath);
  const outputPath = filePath.replace(/\.md$/, format.extension);
  const outputName = path.basename(outputPath);

  outputChannel.appendLine(`\n[PageMD] Exit code: ${result.code}`);

  if (result.killed) {
    vscode.window.showWarningMessage('PageMD: Export cancelled');
    return;
  }

  if (result.code === 0) {
    // Show output panel on success if configured
    if (showOutputPanelOn === 'always') {
      outputChannel.show(true);
    }

    vscode.window
      .showInformationMessage(
        `PageMD: Exported ${outputName}`,
        'Open File',
        'Show Output'
      )
      .then((action) => {
        if (action === 'Open File') {
          vscode.env.openExternal(vscode.Uri.file(outputPath));
        } else if (action === 'Show Output') {
          outputChannel.show();
        }
      });
  } else {
    // Show output panel on error if configured
    if (showOutputPanelOn === 'always' || showOutputPanelOn === 'onError') {
      outputChannel.show(true);
    }

    // Parse error message from stderr
    const errorMatch = result.stderr.match(/Error:\s*(.+)/i);
    const errorMessage = errorMatch?.[1] || 'Unknown error';

    vscode.window
      .showErrorMessage(`PageMD: Export failed - ${errorMessage}`, 'Show Output')
      .then((action) => {
        if (action === 'Show Output') {
          outputChannel.show();
        }
      });
  }
}

/**
 * Handle spawn/process errors.
 */
function handleError(
  err: unknown,
  format: ExportFormat,
  outputChannel: vscode.OutputChannel
): void {
  const message = err instanceof Error ? err.message : String(err);
  outputChannel.appendLine(`\n[PageMD] Error: ${message}`);

  // Check for common issues
  if (message.includes('ENOENT') || message.includes('not found')) {
    vscode.window
      .showErrorMessage(
        'PageMD: CLI not found. Install with: npm install -g @pagemd/cli',
        'Show Output'
      )
      .then((action) => {
        if (action === 'Show Output') {
          outputChannel.show();
        }
      });
  } else {
    vscode.window
      .showErrorMessage(`PageMD: ${message}`, 'Show Output')
      .then((action) => {
        if (action === 'Show Output') {
          outputChannel.show();
        }
      });
  }
}
