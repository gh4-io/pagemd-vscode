import * as vscode from 'vscode';
import * as path from 'path';
import { runPageMD } from '../utils/cli-wrapper';
import { listProfiles } from '../utils/cli-wrapper';

/**
 * Create a new PageMD document, profile, or project.
 *
 * Prompts for resource type, name, and template selection.
 * Uses pagemd init or pagemd create CLI commands.
 */
export async function createDocument(
  outputChannel: vscode.OutputChannel
): Promise<void> {
  // Step 1: Select resource type
  const resourceType = await vscode.window.showQuickPick(
    [
      { label: 'Markdown Document', value: 'markdown', description: 'Create a new markdown file with frontmatter' },
      { label: 'Profile', value: 'profile', description: 'Create a new profile manifest' },
      { label: 'Project', value: 'project', description: 'Initialize a new PageMD project' },
    ],
    {
      placeHolder: 'Select resource type to create',
      title: 'PageMD: Create Resource',
    }
  );

  if (!resourceType) {
    return; // User cancelled
  }

  // Step 2: Prompt for name
  const defaultName = resourceType.value === 'project' ? 'my-pagemd-project' : 'untitled';
  const name = await vscode.window.showInputBox({
    prompt: `Enter name for new ${resourceType.label.toLowerCase()}`,
    placeHolder: defaultName,
    value: defaultName,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Name cannot be empty';
      }
      // Basic filename validation
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        return 'Name must contain only letters, numbers, hyphens, and underscores';
      }
      return undefined;
    },
  });

  if (!name) {
    return; // User cancelled
  }

  // Step 3: Select template/base profile
  let template = 'standard_letter'; // Default
  try {
    const cwd = getWorkingDirectory();
    const profiles = await listProfiles(cwd);

    const selected = await vscode.window.showQuickPick(
      profiles.map((p) => ({
        label: p.id,
        description: p.description,
        value: p.id,
      })),
      {
        placeHolder: 'Select base template/profile',
        title: 'PageMD: Select Template',
      }
    );

    if (!selected) {
      return; // User cancelled
    }

    template = selected.value;
  } catch (err) {
    // Profile listing failed - proceed with default
    outputChannel.appendLine(`[PageMD] Could not list profiles, using default: ${err}`);
  }

  // Step 4: Execute CLI command
  await executeCreate(resourceType.value, name, template, outputChannel);
}

/**
 * Get working directory for CLI execution.
 * Prefers workspace folder, falls back to active file directory.
 */
function getWorkingDirectory(): string {
  // Try workspace folder first
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].uri.fsPath;
  }

  // Fall back to active document directory
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    return path.dirname(editor.document.uri.fsPath);
  }

  // Last resort: home directory (user will need to move file)
  return process.env.HOME || process.env.USERPROFILE || '.';
}

/**
 * Execute the CLI command to create the resource.
 */
async function executeCreate(
  resourceType: string,
  name: string,
  template: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const cwd = getWorkingDirectory();

  // Build CLI arguments based on resource type
  let args: string[];
  let expectedPath: string;

  if (resourceType === 'project') {
    // pagemd init --type project --name <name> --template <template>
    args = ['init', '--type', 'project', '--name', name, '--template', template];
    expectedPath = path.join(cwd, name, 'README.md'); // Open project README
  } else if (resourceType === 'markdown') {
    // pagemd init --type markdown --name <name> --template <template>
    args = ['init', '--type', 'markdown', '--name', name, '--template', template];
    expectedPath = path.join(cwd, `${name}.md`);
  } else if (resourceType === 'profile') {
    // pagemd create profile --source <template> --output <name>.json
    args = ['create', 'profile', '--source', template, '--output', `${name}.json`];
    expectedPath = path.join(cwd, `${name}.json`);
  } else {
    vscode.window.showErrorMessage(`PageMD: Unsupported resource type: ${resourceType}`);
    return;
  }

  outputChannel.appendLine(`\n${'='.repeat(60)}`);
  outputChannel.appendLine(`[PageMD] Creating ${resourceType}: ${name}`);
  outputChannel.appendLine(`[PageMD] Template: ${template}`);
  outputChannel.appendLine(`[PageMD] Working directory: ${cwd}`);
  outputChannel.appendLine(`${'='.repeat(60)}\n`);

  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Creating ${resourceType}: ${name}...`,
        cancellable: true,
      },
      async (progress, token) => {
        return runPageMD({
          args,
          cwd,
          timeout: 30000,
          token,
          outputChannel,
        });
      }
    );

    outputChannel.appendLine(`\n[PageMD] Exit code: ${result.code}`);

    if (result.killed) {
      vscode.window.showWarningMessage('PageMD: Creation cancelled');
      return;
    }

    if (result.code === 0) {
      // Success - open the created file
      vscode.window
        .showInformationMessage(
          `PageMD: Created ${resourceType} "${name}"`,
          'Open File',
          'Show Output'
        )
        .then((action) => {
          if (action === 'Open File') {
            openCreatedFile(expectedPath);
          } else if (action === 'Show Output') {
            outputChannel.show();
          }
        });
    } else {
      // Parse error from stderr
      const errorMatch = result.stderr.match(/Error:\s*(.+)/i);
      const errorMessage = errorMatch?.[1] || 'Unknown error';

      vscode.window
        .showErrorMessage(
          `PageMD: Creation failed - ${errorMessage}`,
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
    outputChannel.appendLine(`\n[PageMD] Error: ${message}`);

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
 * Open the created file in the editor.
 */
async function openCreatedFile(filePath: string): Promise<void> {
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
