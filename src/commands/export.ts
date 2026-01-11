import * as vscode from 'vscode';
import * as path from 'path';
import { runPageMD, CliResult, buildCliEnv } from '../utils/cli-wrapper';
import { extractCleanMessage } from '../utils/cli-message-extractor';
import { ProfileState } from '../providers/profile-picker';
import { FormatState } from '../providers/format-state';
import { OutputPathState } from '../providers/output-path-state';
import { logStructured } from '../extension';

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
  profileState: ProfileState,
  formatState?: FormatState,
  outputPathState?: OutputPathState
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
    profileState,
    outputPathState
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
  profileState: ProfileState,
  outputPathState?: OutputPathState
): Promise<void> {
  const filePath = document.uri.fsPath;
  const fileName = path.basename(filePath);
  const cwd = path.dirname(filePath);

  // Get profile from state (respects workspace selection)
  const profile = profileState.getSelectedProfile();
  const config = vscode.workspace.getConfiguration('pagemd');
  const cliLogLevel = config.get<string>('cliLogLevel', '');
  const showOutputPanelOn = config.get<string>('showOutputPanelOn', 'onError');
  const jpegQuality = config.get<number>('jpegQuality', 90);
  const pdfTimeout = config.get<number>('pdfTimeout', 30000); // CLI default: 30000
  const pagedJsMode = config.get<string>('pagedJsMode', 'browser');

  // Get output path from state (respects session override) or setting
  const outputPath = outputPathState?.getOutputPath()
    ?? config.get<string>('outputPath', '');

  // Build environment variables from settings (only non-default values)
  const cliEnv = buildCliEnv();

  // Build CLI arguments
  const args = ['build', filePath, '-o', format.id];
  if (profile) {
    args.push('-p', profile);
  }
  if (cliLogLevel) {
    args.push('--debug');
  }
  if (outputPath) {
    args.push('-d', outputPath);
  }
  if (format.id === 'jpeg') {
    // JPEG quality applies only to JPEG format
    args.push('--jpeg-quality', String(jpegQuality));
  }
  // Note: Headless mode controlled via PAGEMD_HEADLESS env var in buildCliEnv()
  if (pagedJsMode === 'cli') {
    args.push('--pagedjs');
  }

  // Show output channel based on setting
  const shouldShowOutput = showOutputPanelOn === 'always';
  if (shouldShowOutput) {
    outputChannel.show(true);
  }
  outputChannel.appendLine(`\n${'='.repeat(60)}`);
  logStructured('INFO', 'command', 'export', 'start', 'Exporting document', { format: format.label, file: fileName, profile });
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
          env: cliEnv,
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

  outputChannel.appendLine('');
  logStructured('INFO', 'command', 'export', result.code === 0 ? 'success' : 'fail', 'Export complete', { exitCode: result.code });

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

    // Extract clean error message from CLI output
    const cleanMessage = extractCleanMessage(result.stderr, result.stdout);

    vscode.window
      .showErrorMessage(`PageMD: ${cleanMessage}`, 'Show Output')
      .then((action) => {
        if (action === 'Show Output') {
          outputChannel.show();
        }
      });
  }
}

/**
 * Export the active markdown file to ALL selected formats.
 *
 * Uses formatState to get the list of formats, then exports to all of them
 * in a single CLI call (multiple -o flags).
 */
export async function exportAll(
  outputChannel: vscode.OutputChannel,
  profileState: ProfileState,
  formatState: FormatState,
  outputPathState?: OutputPathState
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

  // Get selected formats
  const formatIds = formatState.getSelectedFormats();
  if (formatIds.length === 0) {
    vscode.window.showWarningMessage('PageMD: No output formats selected. Use "Select Output Formats" first.');
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

  const filePath = document.uri.fsPath;
  const fileName = path.basename(filePath);
  const cwd = path.dirname(filePath);

  // Get profile from state (respects workspace selection)
  const profile = profileState.getSelectedProfile();
  const config = vscode.workspace.getConfiguration('pagemd');
  const cliLogLevel = config.get<string>('cliLogLevel', '');
  const showOutputPanelOn = config.get<string>('showOutputPanelOn', 'onError');
  const jpegQuality = config.get<number>('jpegQuality', 90);
  const pdfTimeout = config.get<number>('pdfTimeout', 30000);
  const pagedJsMode = config.get<string>('pagedJsMode', 'browser');

  // Get output path from state (respects session override) or setting
  const outputPath = outputPathState?.getOutputPath()
    ?? config.get<string>('outputPath', '');

  // Build environment variables from settings
  const cliEnv = buildCliEnv();

  // Build CLI arguments with multiple -o flags
  const args = ['build', filePath];
  for (const formatId of formatIds) {
    args.push('-o', formatId);
  }
  if (profile) {
    args.push('-p', profile);
  }
  if (cliLogLevel) {
    args.push('--debug');
  }
  if (outputPath) {
    args.push('-d', outputPath);
  }
  if (formatIds.includes('jpeg')) {
    args.push('--jpeg-quality', String(jpegQuality));
  }
  if (pagedJsMode === 'cli') {
    args.push('--pagedjs');
  }

  // Format labels for display
  const formatLabels = formatIds.map(id => id.toUpperCase()).join(', ');

  // Show output channel based on setting
  const shouldShowOutput = showOutputPanelOn === 'always';
  if (shouldShowOutput) {
    outputChannel.show(true);
  }
  outputChannel.appendLine(`\n${'='.repeat(60)}`);
  logStructured('INFO', 'command', 'exportAll', 'start', 'Exporting document to all formats', { formats: formatLabels, file: fileName, profile });
  outputChannel.appendLine(`${'='.repeat(60)}\n`);

  // Run with progress
  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Exporting ${fileName} to ${formatLabels}...`,
        cancellable: true,
      },
      async (progress, token) => {
        return runPageMD({
          args,
          cwd,
          timeout: pdfTimeout,
          token,
          outputChannel,
          env: cliEnv,
        });
      }
    );

    handleMultiResult(result, filePath, formatIds, outputChannel, showOutputPanelOn);
  } catch (err) {
    handleMultiError(err, formatLabels, outputChannel);
  }
}

/**
 * Handle CLI result for multi-format export.
 */
function handleMultiResult(
  result: CliResult,
  filePath: string,
  formatIds: string[],
  outputChannel: vscode.OutputChannel,
  showOutputPanelOn: string
): void {
  const fileName = path.basename(filePath);
  const formatLabels = formatIds.map(id => id.toUpperCase()).join(', ');

  outputChannel.appendLine('');
  logStructured('INFO', 'command', 'exportAll', result.code === 0 ? 'success' : 'fail', 'Export complete', { exitCode: result.code, formats: formatLabels });

  if (result.killed) {
    vscode.window.showWarningMessage('PageMD: Export cancelled');
    return;
  }

  if (result.code === 0) {
    if (showOutputPanelOn === 'always') {
      outputChannel.show(true);
    }

    // Build list of output files
    const outputFiles = formatIds.map(id => {
      const format = EXPORT_FORMATS.find(f => f.id === id);
      return fileName.replace(/\.md$/, format?.extension || `.${id}`);
    });

    vscode.window
      .showInformationMessage(
        `PageMD: Exported ${outputFiles.length} files (${formatLabels})`,
        'Show Output'
      )
      .then((action) => {
        if (action === 'Show Output') {
          outputChannel.show();
        }
      });
  } else {
    if (showOutputPanelOn === 'always' || showOutputPanelOn === 'onError') {
      outputChannel.show(true);
    }

    const cleanMessage = extractCleanMessage(result.stderr, result.stdout);

    vscode.window
      .showErrorMessage(`PageMD: ${cleanMessage}`, 'Show Output')
      .then((action) => {
        if (action === 'Show Output') {
          outputChannel.show();
        }
      });
  }
}

/**
 * Handle spawn/process errors for multi-format export.
 */
function handleMultiError(
  err: unknown,
  formatLabels: string,
  outputChannel: vscode.OutputChannel
): void {
  const message = err instanceof Error ? err.message : String(err);
  outputChannel.appendLine('');
  logStructured('ERROR', 'command', 'exportAll', 'fail', 'Export error', { error: message, formats: formatLabels });

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

/**
 * Handle spawn/process errors.
 */
function handleError(
  err: unknown,
  format: ExportFormat,
  outputChannel: vscode.OutputChannel
): void {
  const message = err instanceof Error ? err.message : String(err);
  outputChannel.appendLine('');
  logStructured('ERROR', 'command', 'export', 'fail', 'Export error', { error: message });

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
