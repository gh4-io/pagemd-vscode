import * as vscode from 'vscode';
import * as path from 'path';
import { getNonce, getCspMetaTag, getThemeClass, getWebviewUri } from '../utils/webview-utils';
import { runPageMD } from '../utils/cli-wrapper';
import { ProfileState } from './profile-picker';

/**
 * Manages the paged preview webview panel.
 * Singleton pattern - only one preview panel at a time.
 */
export class PreviewPanel {
  public static currentPanel: PreviewPanel | undefined;
  private static readonly viewType = 'pagemd.preview';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly outputChannel: vscode.OutputChannel;
  private readonly profileState: ProfileState;
  private documentUri: vscode.Uri | undefined;
  private disposables: vscode.Disposable[] = [];
  private debounceTimer: NodeJS.Timeout | undefined;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    outputChannel: vscode.OutputChannel,
    profileState: ProfileState
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.outputChannel = outputChannel;
    this.profileState = profileState;

    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case 'rendered':
            this.outputChannel.appendLine(
              `[PageMD] Preview rendered: ${message.pageCount} pages`
            );
            break;
          case 'ready':
            this.outputChannel.appendLine('[PageMD] Preview ready');
            break;
        }
      },
      null,
      this.disposables
    );

    // Handle theme changes
    vscode.window.onDidChangeActiveColorTheme(
      () => this.refresh(),
      null,
      this.disposables
    );

    // Handle configuration changes
    vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (e.affectsConfiguration('pagemd')) {
          this.refresh();
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Create or reveal the preview panel.
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    outputChannel: vscode.OutputChannel,
    profileState: ProfileState
  ): PreviewPanel {
    const column = vscode.ViewColumn.Beside;

    // If panel exists, reveal it
    if (PreviewPanel.currentPanel) {
      PreviewPanel.currentPanel.panel.reveal(column);
      return PreviewPanel.currentPanel;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      PreviewPanel.viewType,
      'PageMD Preview',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    PreviewPanel.currentPanel = new PreviewPanel(
      panel,
      extensionUri,
      outputChannel,
      profileState
    );

    return PreviewPanel.currentPanel;
  }

  /**
   * Set up document watching based on trigger mode.
   * Called once when preview opens - registers event listeners.
   */
  public setupDocumentWatching(context: vscode.ExtensionContext): void {
    const config = vscode.workspace.getConfiguration('pagemd');
    const autoRefresh = config.get<boolean>('autoRefreshPreview', true);

    if (!autoRefresh) {
      this.outputChannel.appendLine('[PageMD] Auto-refresh disabled');
      return;
    }

    // Always listen for saves - works for both onSave and onType modes
    vscode.workspace.onDidSaveTextDocument(
      (doc) => {
        if (this.isWatchedDocument(doc.uri)) {
          this.outputChannel.appendLine('[PageMD] Document saved, refreshing preview');
          this.refresh();
        }
      },
      null,
      this.disposables
    );

    // For onType mode, also listen for changes (will auto-save before refresh)
    const trigger = config.get<string>('previewTrigger', 'onSave');
    if (trigger === 'onType') {
      this.outputChannel.appendLine('[PageMD] onType mode enabled');
      vscode.workspace.onDidChangeTextDocument(
        (e) => {
          if (this.isWatchedDocument(e.document.uri)) {
            this.debouncedRefresh();
          }
        },
        null,
        this.disposables
      );
    } else {
      this.outputChannel.appendLine('[PageMD] onSave mode enabled');
    }
  }

  /**
   * Check if a document URI matches the watched document.
   * Handles path normalization for cross-platform compatibility.
   */
  private isWatchedDocument(uri: vscode.Uri): boolean {
    if (!this.documentUri) {
      return false;
    }
    // Normalize paths for comparison (handles Windows case-insensitivity)
    const watchedPath = this.documentUri.fsPath.toLowerCase().replace(/\\/g, '/');
    const checkPath = uri.fsPath.toLowerCase().replace(/\\/g, '/');
    return watchedPath === checkPath;
  }

  /**
   * Debounced refresh for onType mode.
   * Auto-saves the document before refresh since CLI reads from disk.
   */
  private debouncedRefresh(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(async () => {
      // Auto-save before refresh - CLI reads from disk
      if (this.documentUri) {
        const doc = vscode.workspace.textDocuments.find(
          d => this.isWatchedDocument(d.uri)
        );
        if (doc?.isDirty) {
          this.outputChannel.appendLine('[PageMD] Auto-saving for onType refresh');
          await doc.save();
          // Note: The save will trigger onDidSaveTextDocument which calls refresh()
          // so we don't need to call refresh() here
          return;
        }
      }
      // If document wasn't dirty, refresh directly
      this.refresh();
    }, 500); // 500ms debounce
  }

  /**
   * Update preview with new document.
   */
  public async update(documentUri: vscode.Uri): Promise<void> {
    this.documentUri = documentUri;
    this.panel.title = `Preview: ${path.basename(documentUri.fsPath)}`;
    await this.refresh();
  }

  /**
   * Refresh the preview content.
   */
  public async refresh(): Promise<void> {
    if (!this.documentUri) {
      return;
    }

    const filePath = this.documentUri.fsPath;
    const cwd = path.dirname(filePath);
    const profile = this.profileState.getSelectedProfile();

    this.outputChannel.appendLine(`[PageMD] Refreshing preview: ${path.basename(filePath)}`);
    this.outputChannel.appendLine(`[PageMD] Working directory: ${cwd}`);
    this.outputChannel.appendLine(`[PageMD] Profile: ${profile}`);

    try {
      // Generate HTML via CLI
      const result = await runPageMD({
        args: ['build', filePath, '-o', 'html', '-p', profile],
        cwd,
        timeout: 30000,
        outputChannel: this.outputChannel,
      });

      this.outputChannel.appendLine(`[PageMD] CLI exit code: ${result.code}`);

      if (result.code !== 0) {
        this.outputChannel.appendLine(`[PageMD] CLI stderr: ${result.stderr}`);
        this.showError(`Build failed (code ${result.code}): ${result.stderr || result.stdout || 'Unknown error'}`);
        return;
      }

      // Read the generated HTML file
      const htmlPath = filePath.replace(/\.md$/, '.html');
      const htmlUri = vscode.Uri.file(htmlPath);

      this.outputChannel.appendLine(`[PageMD] Looking for HTML at: ${htmlPath}`);
      this.outputChannel.appendLine(`[PageMD] CLI stdout: ${result.stdout.substring(0, 500)}${result.stdout.length > 500 ? '...' : ''}`);

      try {
        const htmlContent = await vscode.workspace.fs.readFile(htmlUri);
        const html = new TextDecoder().decode(htmlContent);
        this.outputChannel.appendLine(`[PageMD] HTML file loaded: ${html.length} bytes`);

        // Log body content extraction for debugging
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        this.outputChannel.appendLine(`[PageMD] Body extracted: ${bodyMatch ? 'yes' : 'no'} (${bodyMatch?.[1]?.length || 0} chars)`);

        if (html.length < 100) {
          this.outputChannel.appendLine(`[PageMD] WARNING: HTML file very small. Content: ${html}`);
        }

        if (!bodyMatch || bodyMatch[1].trim().length === 0) {
          this.outputChannel.appendLine('[PageMD] WARNING: No body content found in HTML');
          this.showError('Generated HTML has no body content.\n\nCLI output:\n' + result.stdout);
          return;
        }

        this.renderHtml(html);

        // Clean up generated HTML file (unless debug mode is on)
        const debugMode = vscode.workspace.getConfiguration('pagemd').get<boolean>('debugMode', false);
        if (!debugMode) {
          try {
            await vscode.workspace.fs.delete(htmlUri);
            this.outputChannel.appendLine(`[PageMD] Cleaned up temporary HTML file`);
          } catch {
            // Ignore cleanup errors - file may already be deleted or locked
          }
        } else {
          this.outputChannel.appendLine(`[PageMD] Debug mode: keeping HTML file at ${htmlPath}`);
        }
      } catch (readErr) {
        this.outputChannel.appendLine(`[PageMD] HTML read error: ${readErr}`);

        // List files in directory to help debug
        try {
          const dirUri = vscode.Uri.file(cwd);
          const files = await vscode.workspace.fs.readDirectory(dirUri);
          const htmlFiles = files.filter(([name]) => name.endsWith('.html')).map(([name]) => name);
          this.outputChannel.appendLine(`[PageMD] HTML files in dir: ${htmlFiles.join(', ') || 'none'}`);
        } catch {
          // Ignore directory listing errors
        }

        this.showError(`HTML file not found. Build may have failed.\nExpected: ${htmlPath}\n\nCLI output:\n${result.stdout || result.stderr || 'No output'}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.outputChannel.appendLine(`[PageMD] Error: ${message}`);
      this.showError(message);
    }
  }

  /**
   * Get webview URI for Paged.js polyfill.
   */
  private getPagedJsUri(): vscode.Uri {
    return getWebviewUri(this.panel.webview, this.extensionUri, ['media', 'paged.polyfill.js']);
  }

  /**
   * Get webview URI for previewer script.
   */
  private getPreviewerUri(): vscode.Uri {
    return getWebviewUri(this.panel.webview, this.extensionUri, ['media', 'previewer.js']);
  }

  /**
   * Get inline CSS for zoom toolbar (avoiding external file issues).
   */
  private getZoomToolbarCss(): string {
    return `
    .pagemd-zoom-toolbar {
      position: absolute;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-panel-border, #3c3c3c);
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      z-index: 2147483647;
      font-family: var(--vscode-font-family, system-ui);
      font-size: 13px;
      pointer-events: auto;
    }
    .pagemd-zoom-toolbar button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 4px;
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #fff);
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    }
    .pagemd-zoom-toolbar button:hover {
      background: var(--vscode-button-secondaryHoverBackground, #505050);
    }
    .pagemd-zoom-toolbar button:active {
      background: var(--vscode-button-background, #0e639c);
    }
    .pagemd-zoom-toolbar .zoom-level {
      min-width: 48px;
      text-align: center;
      color: var(--vscode-foreground, #ccc);
      font-variant-numeric: tabular-nums;
    }
    .pagemd-zoom-toolbar .zoom-separator {
      width: 1px;
      height: 20px;
      background: var(--vscode-panel-border, #3c3c3c);
      margin: 0 4px;
    }
    .pagemd-zoom-toolbar button.fit-btn {
      width: auto;
      padding: 0 10px;
      font-size: 11px;
      font-weight: normal;
    }
    .pagemd-zoom-toolbar button.mode-btn {
      font-size: 16px;
    }
    .pagemd-zoom-toolbar button.mode-btn[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .pagemd-zoom-toolbar button.mode-btn.active {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #fff);
    }`;
  }

  /**
   * Generate preview CSS based on VS Code settings.
   * Injects CSS variables and conditional style rules.
   */
  private getPreviewStyles(): string {
    const config = vscode.workspace.getConfiguration('pagemd');
    const highlightMargins = config.get<boolean>('preview.highlightMargins', true);
    const emulateLayout = config.get<boolean>('preview.emulatePageLayout', true);
    const twoColumn = config.get<boolean>('preview.twoColumnSpread', false);
    const firstPagePosition = config.get<string>('preview.firstPagePosition', 'right');
    const showDimensions = config.get<boolean>('preview.showDimensions', true);
    const marginColor = config.get<string>('preview.marginColor', '#0ff');
    const paperColor = config.get<string>('preview.paperColor', '#ffffff');
    const bgColor = config.get<string>('preview.backgroundColor', '#777777');
    const pageGap = config.get<string>('preview.pageGap', '5mm');
    const spreadGap = config.get<string>('preview.spreadGap', '15mm');
    const zoom = config.get<number>('preview.zoom', 100);

    // CSS variables root
    let css = `:root {
      --pagemd-margin-color: ${marginColor};
      --pagemd-paper-color: ${paperColor};
      --pagemd-bg-color: ${bgColor};
      --pagemd-page-gap: ${pageGap};
      --pagemd-spread-gap: ${spreadGap};
      --pagemd-font-color: #000;
      --pagemd-zoom: ${zoom / 100};
    }`;

    // Highlight margins CSS
    if (highlightMargins) {
      css += `
      .pagedjs_page { box-shadow: 0 0.5mm 2mm #000; }
      [class*="pagedjs_margin-top"],
      [class*="pagedjs_margin-left"],
      [class*="pagedjs_margin-right"],
      [class*="pagedjs_margin-bottom"] {
        box-shadow: 0 0 0 1px inset var(--pagemd-margin-color);
      }`;
    }

    // Page layout emulation CSS
    if (emulateLayout) {
      css += `
      .pagedjs_pages {
        background-color: var(--pagemd-bg-color);
        padding: 20px;
        /* Center pages horizontally in single-column mode */
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .pagedjs_page {
        color: var(--pagemd-font-color);
        background-color: var(--pagemd-paper-color);
        margin: var(--pagemd-page-gap);
      }
      .pagedjs_page hr {
        border-color: var(--pagemd-font-color);
      }`;
    }

    // Two-column spread CSS (book view) - uses CSS Grid for reliable layout
    if (twoColumn) {
      css += `
      /* Two-column book spread - CSS Grid layout */
      .pagedjs_pages {
        display: grid;
        grid-template-columns: repeat(2, auto);
        column-gap: var(--pagemd-page-gap);
        row-gap: var(--pagemd-spread-gap);
        justify-content: center;
        width: fit-content;
        margin: 0 auto;
        padding: 20px;
      }

      /* Pages maintain natural size, grid handles gaps */
      .pagedjs_pages > .pagedjs_page,
      .pagedjs_pages > .pagemd-page-wrapper {
        margin: 0;
      }`;

      // Page 1 on right: push first page to column 2 (creates margin gap, no placeholder)
      if (firstPagePosition === 'right') {
        css += `
      /* First page on right - push to column 2 (column 1 empty = margin) */
      .pagedjs_pages > .pagedjs_page:first-child,
      .pagedjs_pages > .pagemd-page-wrapper:first-child {
        grid-column: 2;
      }`;
      }
    }

    // Initial zoom transform
    if (zoom !== 100) {
      css += `
      .pagedjs_pages {
        transform: scale(var(--pagemd-zoom));
        transform-origin: top center;
      }`;
    }

    // Dimension labels CSS (only when both highlightMargins and showDimensions enabled)
    if (highlightMargins && showDimensions) {
      css += `
      /* Page wrapper for positioning context - extra margin for labels */
      .pagemd-page-wrapper {
        position: relative;
        display: inline-block;
        margin: 60px 80px 80px 80px; /* top right bottom left - room for labels */
      }

      /* Base label style - readable dark text */
      .pagemd-label {
        position: absolute;
        font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-size: 12px;
        color: #202020;
        white-space: nowrap;
        pointer-events: none;
      }

      /* Top label: centered above page */
      .pagemd-label-top {
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 8px;
        text-align: center;
      }

      /* Left label: centered left of page */
      .pagemd-label-left {
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        margin-right: 12px;
        text-align: right;
      }

      /* Right label: centered right of page */
      .pagemd-label-right {
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        margin-left: 12px;
        text-align: left;
      }

      /* Bottom label: centered below page */
      .pagemd-label-bottom {
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: 8px;
        text-align: center;
      }

      /* Info panel below bottom label */
      .pagemd-info-panel {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 35px;
        padding: 8px 12px;
        font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-size: 12px;
        color: #202020;
        border-top: 1px dashed #ccc;
        text-align: center;
      }

      .pagemd-info-item { }
      .pagemd-info-sep {
        margin: 0 8px;
        opacity: 0.5;
      }

      /* Dimension and margin sub-labels */
      .pagemd-dim {
        font-weight: 500;
        display: block;
      }
      .pagemd-margin {
        font-size: 11px;
        opacity: 0.85;
        margin-top: 2px;
        display: block;
      }

      /* Dark theme adjustments */
      .vscode-dark .pagemd-label { color: #e0e0e0; }
      .vscode-dark .pagemd-info-panel { color: #e0e0e0; border-color: #555; }

      /* High contrast theme */
      .vscode-high-contrast .pagemd-label { color: #fff; }
      .vscode-high-contrast .pagemd-info-panel { color: #fff; border-color: #fff; }`;
    }

    return css;
  }

  /**
   * Get preview settings as JSON string for injection into webview.
   */
  private getPreviewSettingsJson(): string {
    const config = vscode.workspace.getConfiguration('pagemd');
    const settings = {
      highlightMargins: config.get<boolean>('preview.highlightMargins', true),
      showDimensions: config.get<boolean>('preview.showDimensions', true),
      dimensionUnit: config.get<string>('preview.dimensionUnit', 'in'),
    };
    return JSON.stringify(settings);
  }

  /**
   * Generate zoom toolbar HTML with controls.
   * Uses event listeners instead of inline onclick (blocked by CSP).
   */
  private getZoomToolbar(nonce: string): string {
    const config = vscode.workspace.getConfiguration('pagemd');
    const zoom = config.get<number>('preview.zoom', 100);

    return `
    <div class="pagemd-zoom-toolbar">
      <button id="zoom-out-btn" title="Zoom Out (Ctrl+-)">−</button>
      <span class="zoom-level" id="zoom-level">${zoom}%</span>
      <button id="zoom-in-btn" title="Zoom In (Ctrl++)">+</button>
      <span class="zoom-separator"></span>
      <button class="fit-btn" id="fit-width-btn" title="Fit to Width">Fit</button>
      <button class="fit-btn" id="reset-zoom-btn" title="Reset Zoom (Ctrl+0)">100%</button>
      <span class="zoom-separator"></span>
      <button class="mode-btn" id="book-toggle-btn" title="Toggle Book Spread (2-column)">📖</button>
      <button class="mode-btn" id="view-toggle-btn" title="Toggle View (Paged/Browser)">🌐</button>
    </div>
    <script nonce="${nonce}">
      (function() {
        let zoomLevel = ${zoom};

        function updateZoom() {
          const pages = document.querySelector('.pagedjs_pages');
          if (pages) {
            pages.style.transform = 'scale(' + (zoomLevel / 100) + ')';
            pages.style.transformOrigin = 'top center';
          }
          const zoomDisplay = document.getElementById('zoom-level');
          if (zoomDisplay) {
            zoomDisplay.textContent = zoomLevel + '%';
          }
        }

        function zoomIn() {
          zoomLevel = Math.min(400, zoomLevel + 25);
          updateZoom();
        }

        function zoomOut() {
          zoomLevel = Math.max(25, zoomLevel - 25);
          updateZoom();
        }

        function resetZoom() {
          zoomLevel = 100;
          updateZoom();
        }

        function fitToWidth() {
          const pages = document.querySelector('.pagedjs_pages');
          const page = document.querySelector('.pagedjs_page');
          if (pages && page) {
            const containerWidth = pages.parentElement.clientWidth - 40;
            const pageWidth = page.offsetWidth;
            zoomLevel = Math.floor((containerWidth / pageWidth) * 100);
            zoomLevel = Math.max(25, Math.min(400, zoomLevel));
            updateZoom();
          }
        }

        // Attach event listeners (CSP-safe)
        document.getElementById('zoom-out-btn')?.addEventListener('click', zoomOut);
        document.getElementById('zoom-in-btn')?.addEventListener('click', zoomIn);
        document.getElementById('fit-width-btn')?.addEventListener('click', fitToWidth);
        document.getElementById('reset-zoom-btn')?.addEventListener('click', resetZoom);

        // View mode state (session-only, resets on panel close)
        let viewMode = 'paged'; // 'paged' or 'browser'
        let bookMode = false;
        let blobUrl = null;

        function setControlsEnabled(enabled) {
          const ids = ['zoom-out-btn', 'zoom-in-btn', 'fit-width-btn', 'reset-zoom-btn', 'book-toggle-btn'];
          ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
              if (enabled) {
                el.removeAttribute('disabled');
              } else {
                el.setAttribute('disabled', 'true');
              }
            }
          });
        }

        function toggleViewMode() {
          const viewBtn = document.getElementById('view-toggle-btn');
          const content = document.querySelector('.pagemd-content');
          const iframe = document.getElementById('browser-view-iframe');
          const pages = document.querySelector('.pagedjs_pages');

          if (viewMode === 'paged') {
            // Switch to browser mode
            viewMode = 'browser';
            viewBtn.textContent = '📄'; // Show page icon (click to return to paged)
            viewBtn.classList.add('active');

            // Hide paged content
            if (content) content.style.display = 'none';
            if (pages) pages.style.display = 'none';

            // Show iframe with raw HTML
            if (iframe && window.pagemdRawHtml) {
              const blob = new Blob([window.pagemdRawHtml], { type: 'text/html' });
              blobUrl = URL.createObjectURL(blob);
              iframe.src = blobUrl;
              iframe.classList.add('active');
            }

            // Disable zoom and book controls
            setControlsEnabled(false);
          } else {
            // Switch back to paged mode
            viewMode = 'paged';
            viewBtn.textContent = '🌐'; // Show globe icon (click to go to browser)
            viewBtn.classList.remove('active');

            // Show paged content
            if (content) content.style.display = '';

            // Restore book mode layout if active
            if (pages) {
              if (bookMode) {
                pages.style.display = 'grid';
                pages.style.gridTemplateColumns = 'repeat(2, auto)';
                pages.style.justifyContent = 'center';
              } else {
                pages.style.display = 'flex';
              }
            }

            // Hide and cleanup iframe
            if (iframe) {
              iframe.classList.remove('active');
              if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                blobUrl = null;
              }
              iframe.src = 'about:blank';
            }

            // Re-enable zoom and book controls
            setControlsEnabled(true);
          }
        }

        function toggleBookMode() {
          if (viewMode !== 'paged') return; // Only works in paged mode

          const bookBtn = document.getElementById('book-toggle-btn');
          const pages = document.querySelector('.pagedjs_pages');

          bookMode = !bookMode;

          if (bookMode) {
            bookBtn.classList.add('active');
            if (pages) {
              pages.style.display = 'grid';
              pages.style.gridTemplateColumns = 'repeat(2, auto)';
              pages.style.justifyContent = 'center';
            }
          } else {
            bookBtn.classList.remove('active');
            if (pages) {
              pages.style.display = 'flex';
              pages.style.gridTemplateColumns = '';
              pages.style.justifyContent = '';
            }
          }
        }

        document.getElementById('view-toggle-btn')?.addEventListener('click', toggleViewMode);
        document.getElementById('book-toggle-btn')?.addEventListener('click', toggleBookMode);

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
          if (e.ctrlKey || e.metaKey) {
            if (e.key === '=' || e.key === '+') {
              e.preventDefault();
              zoomIn();
            } else if (e.key === '-') {
              e.preventDefault();
              zoomOut();
            } else if (e.key === '0') {
              e.preventDefault();
              resetZoom();
            }
          }
        });

        // Position toolbar fixed in viewport using JavaScript
        // (CSS fixed doesn't work due to Paged.js transform containers)
        function positionToolbar() {
          const toolbar = document.querySelector('.pagemd-zoom-toolbar');
          if (!toolbar) return;

          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          const toolbarRect = toolbar.getBoundingClientRect();

          // Position at bottom-right of viewport
          toolbar.style.top = (window.scrollY + viewportHeight - toolbarRect.height - 20) + 'px';
          toolbar.style.left = (window.scrollX + viewportWidth - toolbarRect.width - 20) + 'px';
        }

        // Move toolbar to body and set up scroll tracking
        function initToolbar() {
          const toolbar = document.querySelector('.pagemd-zoom-toolbar');
          if (!toolbar) return;

          // Move to body if not already there
          if (toolbar.parentElement !== document.body) {
            document.body.appendChild(toolbar);
          }

          // Initial position
          positionToolbar();

          // Update on scroll and resize
          window.addEventListener('scroll', positionToolbar, { passive: true });
          window.addEventListener('resize', positionToolbar, { passive: true });

          // Also track scroll on document element (some browsers)
          document.documentElement.addEventListener('scroll', positionToolbar, { passive: true });
        }

        // Run after Paged.js finishes
        window.addEventListener('pagedjs-complete', function() {
          setTimeout(initToolbar, 50);
        });
        // Also run on load as fallback
        window.addEventListener('load', function() {
          setTimeout(initToolbar, 100);
        });
        // And run immediately in case DOM is ready
        if (document.readyState === 'complete') {
          setTimeout(initToolbar, 50);
        }
      })();
    </script>`;
  }

  /**
   * Render HTML content in webview.
   */
  private renderHtml(html: string): void {
    const nonce = getNonce();
    const themeClass = getThemeClass();

    // Inject CSP and theme
    const webviewHtml = this.wrapHtml(html, nonce, themeClass);
    this.panel.webview.html = webviewHtml;
  }

  /**
   * Wrap HTML with webview shell and inject Paged.js runtime.
   */
  private wrapHtml(content: string, nonce: string, themeClass: string): string {
    const csp = getCspMetaTag(this.panel.webview, nonce);
    const pagedJsUri = this.getPagedJsUri();
    const previewerUri = this.getPreviewerUri();
    const previewStyles = this.getPreviewStyles();
    const zoomToolbarCss = this.getZoomToolbarCss();
    const zoomToolbar = this.getZoomToolbar(nonce);

    // Extract body content if full HTML document
    let bodyContent = content;
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    }

    // Extract styles from original document
    let styles = '';
    const styleMatches = content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    for (const match of styleMatches) {
      styles += match[1];
    }

    // Note: We skip external CSS links as they won't resolve in webview
    // All necessary styles come from the CLI-generated HTML inline styles

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${csp}
  <title>PageMD Preview</title>
  <style>
    /* Document styles from CLI */
    ${styles}

    /* Preview-specific base styles */
    html {
      min-height: 100%;
      background-color: var(--pagemd-bg-color);
    }
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      background-color: var(--pagemd-bg-color);
    }
    /* Content wrapper - allow horizontal expansion with room for dimension labels */
    .pagemd-content {
      width: fit-content;
      min-width: 100%;
      min-height: 100vh;
      padding: 20px 100px; /* top/bottom, left/right - room for margin labels */
      box-sizing: border-box;
    }

    /* Preview visual settings */
    ${previewStyles}

    /* Zoom toolbar */
    ${zoomToolbarCss}

    /* Browser view iframe (hidden by default) */
    .pagemd-browser-view {
      display: none;
      width: 100%;
      height: 100vh;
      border: none;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1000;
      background: white;
    }
    .pagemd-browser-view.active {
      display: block;
    }
  </style>
</head>
<body class="${themeClass}">
  <div class="pagemd-content">
    ${bodyContent}
  </div>
  <iframe id="browser-view-iframe" class="pagemd-browser-view"></iframe>
  ${zoomToolbar}
  <script nonce="${nonce}">
    // Initialize PagedConfig before Paged.js loads
    window.PagedConfig = window.PagedConfig || { auto: true };
    // Pass preview settings to previewer.js
    window.pagemdSettings = ${this.getPreviewSettingsJson()};
    // Store raw HTML for browser mode toggle (before Paged.js transforms it)
    window.pagemdRawHtml = ${JSON.stringify(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${styles}</style></head>
<body class="${themeClass}">${bodyContent}</body></html>`)};
  </script>
  <script nonce="${nonce}" src="${previewerUri}"></script>
  <script nonce="${nonce}" src="${pagedJsUri}"></script>
  <script nonce="${nonce}">
    // Handle messages from webview
    const vscode = acquireVsCodeApi();

    // Listen for Paged.js rendered event (sent by previewer.js)
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'rendered') {
        vscode.postMessage(message);
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * Show error in webview.
   */
  private showError(message: string): void {
    const nonce = getNonce();
    const themeClass = getThemeClass();
    const csp = getCspMetaTag(this.panel.webview, nonce);

    this.panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${csp}
  <title>PageMD Preview Error</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-errorForeground);
    }
    .error-icon { font-size: 48px; margin-bottom: 16px; }
    .error-message {
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      padding: 12px;
      border-radius: 4px;
      white-space: pre-wrap;
    }
  </style>
</head>
<body class="${themeClass}">
  <div class="error-icon">⚠️</div>
  <h2>Preview Error</h2>
  <div class="error-message">${escapeHtml(message)}</div>
</body>
</html>`;
  }

  /**
   * Dispose the panel and clean up.
   */
  public dispose(): void {
    PreviewPanel.currentPanel = undefined;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
