import * as vscode from 'vscode';
import { listProfiles, ProfileInfo } from '../utils/cli-wrapper';

/**
 * QuickPickItem for profile selection.
 */
interface ProfileQuickPickItem extends vscode.QuickPickItem {
  profile: ProfileInfo;
}

/**
 * State manager for selected profile.
 * Stores profile selection in workspace state for persistence.
 */
export class ProfileState {
  private static readonly KEY = 'pagemd.selectedProfile';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Get currently selected profile ID.
   * Falls back to configuration default (empty string = use frontmatter/CLI default).
   */
  getSelectedProfile(): string {
    const saved = this.context.workspaceState.get<string>(ProfileState.KEY);
    if (saved) {
      return saved;
    }
    const config = vscode.workspace.getConfiguration('pagemd');
    return config.get<string>('defaultProfile', '');
  }

  /**
   * Set selected profile ID.
   */
  async setSelectedProfile(profileId: string): Promise<void> {
    await this.context.workspaceState.update(ProfileState.KEY, profileId);
  }

  /**
   * Clear workspace-specific selection (use default).
   */
  async clearSelection(): Promise<void> {
    await this.context.workspaceState.update(ProfileState.KEY, undefined);
  }
}

/**
 * Show profile picker QuickPick dialog.
 * Returns selected profile info or undefined if cancelled.
 */
export async function showProfilePicker(
  cwd: string,
  currentProfile: string
): Promise<ProfileInfo | undefined> {
  // Show loading indicator
  const profiles = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Loading profiles...',
    },
    async () => {
      try {
        return await listProfiles(cwd);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`PageMD: Failed to load profiles - ${message}`);
        return [];
      }
    }
  );

  if (profiles.length === 0) {
    vscode.window.showWarningMessage('PageMD: No profiles found');
    return undefined;
  }

  // Convert to QuickPickItems
  const items: ProfileQuickPickItem[] = profiles.map((profile) => {
    const isCurrent = profile.id === currentProfile;
    const source = profile.source === 'workspace' ? '(workspace)' : '';
    const extendsInfo = profile.extends ? `extends ${profile.extends}` : '';
    const details = [source, extendsInfo].filter(Boolean).join(' • ');

    return {
      label: `${isCurrent ? '$(check) ' : ''}${profile.id}`,
      description: profile.description || '',
      detail: details || undefined,
      picked: isCurrent,
      profile,
    };
  });

  // Sort: current first, then alphabetically
  items.sort((a, b) => {
    if (a.picked) return -1;
    if (b.picked) return 1;
    return a.profile.id.localeCompare(b.profile.id);
  });

  // Show QuickPick
  const selected = await vscode.window.showQuickPick(items, {
    title: 'Select PageMD Profile',
    placeHolder: 'Choose a profile for rendering',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  return selected?.profile;
}
