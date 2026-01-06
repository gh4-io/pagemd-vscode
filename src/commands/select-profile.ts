import * as vscode from 'vscode';
import * as path from 'path';
import { ProfileState, showProfilePicker } from '../providers/profile-picker';
import { FormatState } from '../providers/format-state';

/**
 * Select profile command handler.
 *
 * Shows profile picker and updates workspace state.
 * Updates status bar after selection.
 */
export async function selectProfile(
  profileState: ProfileState,
  statusBarItem: vscode.StatusBarItem,
  outputChannel: vscode.OutputChannel,
  formatState?: FormatState
): Promise<void> {
  // Determine working directory
  const cwd = getWorkingDirectory();
  if (!cwd) {
    vscode.window.showWarningMessage('PageMD: Open a workspace or file to select a profile');
    return;
  }

  const currentProfile = profileState.getSelectedProfile();
  outputChannel.appendLine(`[PageMD] Current profile: ${currentProfile}`);

  const selected = await showProfilePicker(cwd, currentProfile);

  if (!selected) {
    // User cancelled
    return;
  }

  if (selected.id === currentProfile) {
    vscode.window.showInformationMessage(`PageMD: Profile "${selected.id}" already selected`);
    return;
  }

  // Update state
  await profileState.setSelectedProfile(selected.id);

  // Update status bar
  updateStatusBar(statusBarItem, selected.id, formatState);

  // Show confirmation
  outputChannel.appendLine(`[PageMD] Profile changed: ${currentProfile} → ${selected.id}`);
  vscode.window.showInformationMessage(`PageMD: Profile set to "${selected.id}"`);
}

/**
 * Get working directory for CLI commands.
 */
function getWorkingDirectory(): string | undefined {
  // Priority 1: Active editor's directory
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    return path.dirname(editor.document.uri.fsPath);
  }

  // Priority 2: First workspace folder
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].uri.fsPath;
  }

  return undefined;
}

/**
 * Update status bar item with profile name and format override indicator.
 */
export function updateStatusBar(
  statusBarItem: vscode.StatusBarItem,
  profileId: string,
  formatState?: FormatState
): void {
  let text = `$(gear) ${profileId}`;
  let tooltip = `Profile: ${profileId}`;

  // Show format override indicator if session override is set
  if (formatState?.hasSessionOverride()) {
    const formats = formatState.getSelectedFormats();
    text += ` | ${formats.map(f => f.toUpperCase()).join(',')}`;
    tooltip += `\nFormats: ${formats.join(', ')} (session override)`;
  }

  tooltip += '\nClick to change profile';

  statusBarItem.text = text;
  statusBarItem.tooltip = tooltip;
}

/**
 * Create and configure status bar item.
 */
export function createStatusBarItem(): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'pagemd.selectProfile';
  statusBarItem.show();
  return statusBarItem;
}
