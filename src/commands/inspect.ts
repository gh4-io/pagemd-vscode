import * as vscode from 'vscode';
import * as path from 'path';
import { runPageMD } from '../utils/cli-wrapper';
import { ProfileState } from '../providers/profile-picker';

/**
 * Inspect the active markdown document configuration.
 *
 * Runs pagemd inspect --json and displays formatted results.
 * Shows resolved profile, metadata, resources, and outputs.
 */
export async function inspectDocument(
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

  const filePath = document.uri.fsPath;
  const fileName = path.basename(filePath);
  const cwd = path.dirname(filePath);
  const profile = profileState.getSelectedProfile();

  // Build CLI arguments
  const args = ['inspect', filePath, '--json', '-p', profile];

  outputChannel.appendLine(`\n${'='.repeat(60)}`);
  outputChannel.appendLine(`[PageMD] Inspecting: ${fileName}`);
  outputChannel.appendLine(`[PageMD] Profile: ${profile}`);
  outputChannel.appendLine(`${'='.repeat(60)}\n`);

  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Inspecting ${fileName}...`,
      },
      async () => {
        return runPageMD({
          args,
          cwd,
          timeout: 30000,
          outputChannel,
        });
      }
    );

    outputChannel.appendLine(`\n[PageMD] Exit code: ${result.code}`);

    if (result.code === 0) {
      // Parse JSON output
      try {
        const inspectData = JSON.parse(result.stdout);
        const formatted = formatInspectData(inspectData, fileName);

        // Display in output channel
        outputChannel.appendLine(`\n${'='.repeat(60)}`);
        outputChannel.appendLine('INSPECTION RESULTS');
        outputChannel.appendLine(`${'='.repeat(60)}\n`);
        outputChannel.appendLine(formatted);
        outputChannel.appendLine(`\n${'='.repeat(60)}`);

        // Show output and notify
        outputChannel.show(true);
        vscode.window.showInformationMessage(
          `PageMD: Inspection complete for ${fileName}`,
          'Show Output'
        ).then((action) => {
          if (action === 'Show Output') {
            outputChannel.show();
          }
        });
      } catch (parseErr) {
        outputChannel.appendLine(`\n[PageMD] Failed to parse JSON output`);
        outputChannel.appendLine(result.stdout);
        vscode.window.showErrorMessage('PageMD: Failed to parse inspection output');
      }
    } else {
      // Parse error from stderr
      const errorMatch = result.stderr.match(/Error:\s*(.+)/i);
      const errorMessage = errorMatch?.[1] || 'Unknown error';

      vscode.window
        .showErrorMessage(
          `PageMD: Inspection failed - ${errorMessage}`,
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
 * Inspection data structure returned by pagemd inspect --json
 */
interface InspectData {
  profile?: {
    id: string;
    description?: string;
    source?: string;
    filePath?: string;
  };
  metadata?: {
    title?: string;
    author?: string;
    date?: string;
    [key: string]: unknown;
  };
  resources?: {
    templates?: string[];
    layouts?: string[];
    styles?: string[];
    [key: string]: unknown;
  };
  outputs?: {
    [format: string]: {
      enabled: boolean;
      path?: string;
      mode?: string;
    };
  };
  [key: string]: unknown;
}

/**
 * Format inspection data for display in output channel.
 */
function formatInspectData(data: InspectData, fileName: string): string {
  const lines: string[] = [];

  lines.push(`Document: ${fileName}`);
  lines.push('');

  // Profile section
  if (data.profile) {
    lines.push('PROFILE:');
    lines.push(`  ID: ${data.profile.id}`);
    if (data.profile.description) {
      lines.push(`  Description: ${data.profile.description}`);
    }
    if (data.profile.source) {
      lines.push(`  Source: ${data.profile.source}`);
    }
    if (data.profile.filePath) {
      lines.push(`  File: ${data.profile.filePath}`);
    }
    lines.push('');
  }

  // Metadata section
  if (data.metadata) {
    lines.push('METADATA:');
    for (const [key, value] of Object.entries(data.metadata)) {
      if (value !== undefined && value !== null) {
        lines.push(`  ${key}: ${formatValue(value)}`);
      }
    }
    lines.push('');
  }

  // Resources section
  if (data.resources) {
    lines.push('RESOURCES:');
    for (const [key, value] of Object.entries(data.resources)) {
      if (Array.isArray(value) && value.length > 0) {
        lines.push(`  ${key}:`);
        for (const item of value) {
          lines.push(`    - ${item}`);
        }
      } else if (value !== undefined && value !== null) {
        lines.push(`  ${key}: ${formatValue(value)}`);
      }
    }
    lines.push('');
  }

  // Outputs section
  if (data.outputs) {
    lines.push('OUTPUTS:');
    for (const [format, config] of Object.entries(data.outputs)) {
      if (typeof config === 'object' && config !== null) {
        const enabled = (config as { enabled?: boolean }).enabled ? 'enabled' : 'disabled';
        const outputPath = (config as { path?: string }).path || 'default';
        const mode = (config as { mode?: string }).mode || 'default';
        lines.push(`  ${format}: ${enabled}`);
        lines.push(`    Path: ${outputPath}`);
        lines.push(`    Mode: ${mode}`);
      }
    }
    lines.push('');
  }

  // Additional sections (if any)
  const knownKeys = ['profile', 'metadata', 'resources', 'outputs'];
  const otherKeys = Object.keys(data).filter(k => !knownKeys.includes(k));

  if (otherKeys.length > 0) {
    lines.push('ADDITIONAL:');
    for (const key of otherKeys) {
      lines.push(`  ${key}: ${formatValue(data[key])}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format a value for display (handle arrays, objects, primitives).
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.join(', ')}]`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
