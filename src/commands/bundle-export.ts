import * as vscode from 'vscode';
import * as path from 'path';
import { runPageMD, CliResult, buildCliEnv } from '../utils/cli-wrapper';
import { extractCleanMessage } from '../utils/cli-message-extractor';
import { ProfileState } from '../providers/profile-picker';
import { logStructured } from '../extension';

/**
 * Bundle Export Command
 *
 * Exports markdown file(s) to a bundled static site with:
 * - External CSS (styles.css shared across pages)
 * - Assets copied to assets/ folder
 * - Wikilinks converted to .html with slugs
 *
 * Calls CLI with: pagemd build <file> -o html --bundle -d <outputDir>
 */
export async function bundleExport(
  outputChannel: vscode.OutputChannel,
  profileState: ProfileState,
  uri?: vscode.Uri
): Promise<void> {
  // Get active editor or use provided URI
  const editor = vscode.window.activeTextEditor;
  const filePath = uri?.fsPath || editor?.document.uri.fsPath;

  if (!filePath || !filePath.endsWith('.md')) {
    vscode.window.showWarningMessage('PageMD: Please open a Markdown file first');
    return;
  }

  const document = uri
    ? await vscode.workspace.openTextDocument(uri)
    : editor?.document;

  if (!document) {
    vscode.window.showWarningMessage('PageMD: Could not open document');
    return;
  }

  // Prompt for output directory
  const outputDir = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Select Output Folder',
    title: 'Bundle Export: Select Output Directory',
  });

  if (!outputDir || outputDir.length === 0) {
    return; // User cancelled
  }

  // Save file if modified
  if (document.isDirty) {
    const saved = await document.save();
    if (!saved) {
      vscode.window.showWarningMessage('PageMD: Failed to save file before export');
      return;
    }
  }

  const fileName = path.basename(filePath);
  const cwd = path.dirname(filePath);
  const outputDirPath = outputDir[0].fsPath;

  // Get profile from state (respects workspace selection)
  const profile = profileState.getSelectedProfile();
  const config = vscode.workspace.getConfiguration('pagemd');
  const cliLogLevel = config.get<string>('cliLogLevel', '');
  const showOutputPanelOn = config.get<string>('showOutputPanelOn', 'onError');
  const pdfTimeout = config.get<number>('pdfTimeout', 30000);

  // Build environment variables from settings
  const cliEnv = buildCliEnv();

  // Build CLI arguments: pagemd build <file> -o html --bundle -d <outputDir>
  const args = ['build', filePath, '-o', 'html', '--bundle', '-d', outputDirPath];
  if (profile) {
    args.push('-p', profile);
  }
  if (cliLogLevel) {
    args.push('--debug');
  }

  // Show output channel based on setting
  const shouldShowOutput = showOutputPanelOn === 'always';
  if (shouldShowOutput) {
    outputChannel.show(true);
  }
  outputChannel.appendLine(`\n${'='.repeat(60)}`);
  logStructured('INFO', 'command', 'bundleExport', 'start', 'Bundle exporting document', {
    file: fileName,
    outputDir: outputDirPath,
    profile,
  });
  outputChannel.appendLine(`${'='.repeat(60)}\n`);

  // Run with progress
  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Bundle exporting ${fileName}...`,
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

    handleResult(result, outputDirPath, outputChannel, showOutputPanelOn);
  } catch (err) {
    handleError(err, outputChannel);
  }
}

/**
 * Handle CLI result - show success or failure notification.
 */
function handleResult(
  result: CliResult,
  outputDirPath: string,
  outputChannel: vscode.OutputChannel,
  showOutputPanelOn: string
): void {
  outputChannel.appendLine('');
  logStructured(
    'INFO',
    'command',
    'bundleExport',
    result.code === 0 ? 'success' : 'fail',
    'Bundle export complete',
    { exitCode: result.code }
  );

  if (result.killed) {
    vscode.window.showWarningMessage('PageMD: Bundle export cancelled');
    return;
  }

  if (result.code === 0) {
    // Show output panel on success if configured
    if (showOutputPanelOn === 'always') {
      outputChannel.show(true);
    }

    vscode.window
      .showInformationMessage(
        `PageMD: Bundle exported to ${path.basename(outputDirPath)}/`,
        'Open Folder',
        'Show Output'
      )
      .then((action) => {
        if (action === 'Open Folder') {
          vscode.env.openExternal(vscode.Uri.file(outputDirPath));
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
 * Handle spawn/process errors.
 */
function handleError(err: unknown, outputChannel: vscode.OutputChannel): void {
  const message = err instanceof Error ? err.message : String(err);
  outputChannel.appendLine('');
  logStructured('ERROR', 'command', 'bundleExport', 'fail', 'Bundle export error', {
    error: message,
  });

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
