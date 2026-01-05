import * as vscode from 'vscode';
import * as path from 'path';
import { runPageMD } from '../utils/cli-wrapper';
import { ProfileState } from '../providers/profile-picker';

/**
 * Validate the active markdown file.
 *
 * Runs pagemd validate via CLI and displays results.
 * Updates diagnostics collection for editor squiggles.
 */
export async function validateDocument(
  outputChannel: vscode.OutputChannel,
  profileState: ProfileState,
  diagnostics: vscode.DiagnosticCollection
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

  outputChannel.appendLine(`\n${'='.repeat(60)}`);
  outputChannel.appendLine(`[PageMD] Validating: ${fileName}`);
  outputChannel.appendLine(`[PageMD] Profile: ${profile}`);
  outputChannel.appendLine(`${'='.repeat(60)}\n`);

  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Validating ${fileName}...`,
      },
      async () => {
        return runPageMD({
          args: ['validate', filePath, '-p', profile],
          cwd,
          timeout: 30000,
          outputChannel,
        });
      }
    );

    // Parse validation output and update diagnostics
    const issues = parseValidationOutput(result.stdout + result.stderr);
    updateDiagnostics(document.uri, issues, diagnostics);

    outputChannel.appendLine(`\n[PageMD] Exit code: ${result.code}`);

    // Show result notification
    if (result.code === 0) {
      vscode.window.showInformationMessage(`PageMD: ${fileName} is valid`);
    } else {
      const errorCount = issues.filter((i) => i.severity === 'error').length;
      const warnCount = issues.filter((i) => i.severity === 'warning').length;

      let message = `PageMD: Validation failed -`;
      if (errorCount > 0) message += ` ${errorCount} error(s)`;
      if (warnCount > 0) message += ` ${warnCount} warning(s)`;

      vscode.window
        .showErrorMessage(message, 'Show Output', 'Show Problems')
        .then((action) => {
          if (action === 'Show Output') {
            outputChannel.show();
          } else if (action === 'Show Problems') {
            vscode.commands.executeCommand('workbench.actions.view.problems');
          }
        });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`\n[PageMD] Error: ${message}`);
    vscode.window.showErrorMessage(`PageMD: Validation error - ${message}`);
  }
}

/**
 * Parsed validation issue.
 */
interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  line?: number;
}

/**
 * Parse validation output into structured issues.
 */
function parseValidationOutput(output: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Match error patterns from CLI output
  // Format: "Error: <message>" or "- <message>" under Errors/Warnings sections
  const lines = output.split('\n');
  let currentSection: 'errors' | 'warnings' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section headers
    if (trimmed === 'Errors:') {
      currentSection = 'errors';
      continue;
    } else if (trimmed === 'Warnings:') {
      currentSection = 'warnings';
      continue;
    } else if (trimmed.startsWith('✓') || trimmed.startsWith('✗') || trimmed === '') {
      // Reset section on new file or empty line
      if (!trimmed.startsWith('-')) {
        currentSection = null;
      }
    }

    // Extract issues from list items
    if (trimmed.startsWith('- ') && currentSection) {
      const message = trimmed.slice(2);
      issues.push({
        severity: currentSection === 'errors' ? 'error' : 'warning',
        message,
      });
    }

    // Also catch standalone error messages
    if (trimmed.startsWith('Error:')) {
      issues.push({
        severity: 'error',
        message: trimmed.slice(7).trim(),
      });
    }
  }

  return issues;
}

/**
 * Update VS Code diagnostics collection.
 */
function updateDiagnostics(
  uri: vscode.Uri,
  issues: ValidationIssue[],
  diagnostics: vscode.DiagnosticCollection
): void {
  const diags: vscode.Diagnostic[] = issues.map((issue) => {
    // Default to line 0 if line number not provided
    const line = issue.line ?? 0;
    const range = new vscode.Range(line, 0, line, Number.MAX_VALUE);

    const severity =
      issue.severity === 'error'
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning;

    const diag = new vscode.Diagnostic(range, issue.message, severity);
    diag.source = 'PageMD';
    return diag;
  });

  diagnostics.set(uri, diags);
}

/**
 * Clear diagnostics when file is closed.
 */
export function setupDiagnosticsCleanup(
  diagnostics: vscode.DiagnosticCollection
): vscode.Disposable {
  return vscode.workspace.onDidCloseTextDocument((doc) => {
    diagnostics.delete(doc.uri);
  });
}
