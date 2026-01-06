import * as vscode from 'vscode';

/**
 * State manager for output path.
 * Stores output path in workspace state for session persistence.
 * Falls back to configuration default if no session selection exists.
 *
 * DESIGN: Hybrid pattern matching ProfileState - setting provides default,
 * workspace state allows session-specific override without changing settings.
 */
export class OutputPathState {
  private static readonly KEY = 'pagemd.activeOutputPath';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Get current output path.
   * Falls back to configuration default (empty = same as source).
   */
  getOutputPath(): string {
    const saved = this.context.workspaceState.get<string>(OutputPathState.KEY);
    if (saved !== undefined) {
      return saved;
    }
    const config = vscode.workspace.getConfiguration('pagemd');
    return config.get<string>('outputPath', '');
  }

  /**
   * Set output path for session.
   */
  async setOutputPath(path: string): Promise<void> {
    await this.context.workspaceState.update(OutputPathState.KEY, path);
  }

  /**
   * Clear workspace-specific selection (use default from settings).
   */
  async clearSelection(): Promise<void> {
    await this.context.workspaceState.update(OutputPathState.KEY, undefined);
  }

  /**
   * Check if output path is session-overridden (not using default).
   */
  hasSessionOverride(): boolean {
    return this.context.workspaceState.get<string>(OutputPathState.KEY) !== undefined;
  }
}
