import * as vscode from 'vscode';

/**
 * Available export formats for picker
 */
export const AVAILABLE_FORMATS = [
  { id: 'pdf', label: 'PDF', description: 'Print-ready document' },
  { id: 'html', label: 'HTML', description: 'Standalone web page' },
  { id: 'png', label: 'PNG', description: 'Raster image (lossless)' },
  { id: 'jpeg', label: 'JPEG', description: 'Raster image (compressed)' },
];

/**
 * QuickPickItem for format selection
 */
interface FormatQuickPickItem extends vscode.QuickPickItem {
  id: string;
}

/**
 * State manager for selected output formats.
 * Stores format selection in workspace state for session persistence.
 * Falls back to configuration default if no session selection exists.
 *
 * DESIGN: Hybrid pattern matching ProfileState - setting provides default,
 * workspace state allows session-specific override without changing settings.
 */
export class FormatState {
  private static readonly KEY = 'pagemd.selectedFormats';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Get currently selected output formats.
   * Falls back to configuration default.
   */
  getSelectedFormats(): string[] {
    const saved = this.context.workspaceState.get<string[]>(FormatState.KEY);
    if (saved && saved.length > 0) {
      return saved;
    }
    const config = vscode.workspace.getConfiguration('pagemd');
    return config.get<string[]>('outputFormats', ['html', 'pdf']);
  }

  /**
   * Set selected output formats.
   */
  async setSelectedFormats(formats: string[]): Promise<void> {
    await this.context.workspaceState.update(FormatState.KEY, formats);
  }

  /**
   * Clear workspace-specific selection (use default from settings).
   */
  async clearSelection(): Promise<void> {
    await this.context.workspaceState.update(FormatState.KEY, undefined);
  }

  /**
   * Check if formats are session-overridden (not using default).
   */
  hasSessionOverride(): boolean {
    const saved = this.context.workspaceState.get<string[]>(FormatState.KEY);
    return saved !== undefined && saved.length > 0;
  }
}

/**
 * Show format picker (multi-select) dialog.
 * Returns selected format IDs or undefined if cancelled.
 */
export async function showFormatPicker(
  currentFormats: string[]
): Promise<string[] | undefined> {
  const items: FormatQuickPickItem[] = AVAILABLE_FORMATS.map((fmt) => ({
    label: fmt.label,
    description: fmt.description,
    picked: currentFormats.includes(fmt.id),
    id: fmt.id,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    title: 'Select Output Formats',
    placeHolder: 'Choose formats for export (multi-select)',
    canPickMany: true,
  });

  if (!selected || selected.length === 0) {
    return undefined;
  }

  return selected.map((s) => s.id);
}
