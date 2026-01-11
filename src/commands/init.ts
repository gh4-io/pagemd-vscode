import * as vscode from 'vscode';
import * as path from 'path';
import { runPageMD, buildCliEnv } from '../utils/cli-wrapper';
import { extractCleanMessage } from '../utils/cli-message-extractor';
import { logStructured } from '../extension';

/**
 * Initialize a new PageMD project, profile, or markdown document.
 * Triggered from Explorer context menu on folders.
 */
export async function initCommand(
  outputChannel: vscode.OutputChannel,
  uri?: vscode.Uri
): Promise<void> {
  // 1. Determine target folder
  const targetFolder = uri?.fsPath || getCurrentWorkspaceFolder();
  if (!targetFolder) {
    vscode.window.showErrorMessage('PageMD: No folder selected');
    return;
  }

  // 2. Prompt for name
  const name = await vscode.window.showInputBox({
    prompt: 'Enter project/document name',
    placeHolder: 'my-pagemd-project',
    value: 'my-pagemd-project',
    validateInput: (value) => {
      if (!value?.trim()) {
        return 'Name cannot be empty';
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        return 'Name must contain only letters, numbers, hyphens, and underscores';
      }
      return undefined;
    },
  });

  if (!name) {
    return; // User cancelled
  }

  // 3. Prompt for type
  const typeSelection = await vscode.window.showQuickPick(
    [
      {
        label: 'Project',
        value: 'project',
        description: 'Full project folder with markdown, profile, and stubs',
        picked: true,
      },
      {
        label: 'Markdown',
        value: 'markdown',
        description: 'Markdown file with accompanying profile',
      },
      {
        label: 'Profile',
        value: 'profile',
        description: 'Profile manifest only',
      },
    ],
    {
      placeHolder: 'Select resource type',
      title: 'PageMD: Initialize',
    }
  );

  if (!typeSelection) {
    return; // User cancelled
  }

  // 4. Execute CLI command
  await executeInit(name, typeSelection.value, targetFolder, outputChannel);
}

/**
 * Execute the CLI init command.
 */
async function executeInit(
  name: string,
  type: string,
  outputDir: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  // Build CLI args
  const args = ['init', name, '--type', type, '--output', outputDir];

  outputChannel.appendLine('');
  outputChannel.appendLine(`${'='.repeat(60)}`);
  logStructured('INFO', 'command', 'init', 'start', `Initializing ${type}`, { name, type, outputDir });
  outputChannel.appendLine(`${'='.repeat(60)}`);
  outputChannel.appendLine('');

  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Initializing ${type}: ${name}...`,
        cancellable: true,
      },
      async (progress, token) => {
        return runPageMD({
          args,
          cwd: outputDir,
          timeout: 30000,
          token,
          outputChannel,
          env: buildCliEnv(),
        });
      }
    );

    outputChannel.appendLine('');
    logStructured('INFO', 'command', 'init', result.code === 0 ? 'success' : 'fail', 'Command completed', { exitCode: result.code });

    if (result.killed) {
      vscode.window.showWarningMessage('PageMD: Initialization cancelled');
      return;
    }

    if (result.code === 0) {
      // Success - determine which file to open
      let createdPath: string;
      if (type === 'project') {
        createdPath = path.join(outputDir, name, `${name}.md`);
      } else if (type === 'markdown') {
        createdPath = path.join(outputDir, `${name}.md`);
      } else {
        // profile
        createdPath = path.join(outputDir, `${name}.json`);
      }

      vscode.window
        .showInformationMessage(
          `PageMD: Initialized ${type} "${name}"`,
          'Open',
          'Show Output'
        )
        .then((action) => {
          if (action === 'Open') {
            openFile(createdPath);
          } else if (action === 'Show Output') {
            outputChannel.show();
          }
        });
    } else {
      // Error handling
      const cleanMessage = extractCleanMessage(result.stderr, result.stdout);

      vscode.window
        .showErrorMessage(
          `PageMD: ${cleanMessage}`,
          'Show Output'
        )
        .then((action) => {
          if (action === 'Show Output') {
            outputChannel.show();
          }
        });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine('');
    logStructured('ERROR', 'command', 'init', 'fail', 'Command error', { error: message });
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
 * Get the current workspace folder.
 */
function getCurrentWorkspaceFolder(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Open the created file in the editor.
 */
async function openFile(filePath: string): Promise<void> {
  try {
    const uri = vscode.Uri.file(filePath);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  } catch (err) {
    vscode.window.showWarningMessage(
      `PageMD: Could not open file: ${path.basename(filePath)}`
    );
  }
}
