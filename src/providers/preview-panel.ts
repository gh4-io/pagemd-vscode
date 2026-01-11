import * as vscode from 'vscode';
import * as path from 'path';
import { getNonce, getCspMetaTag, getThemeClass, getWebviewUri } from '../utils/webview-utils';
import { runPageMD, buildCliEnv } from '../utils/cli-wrapper';
import { extractCleanMessage } from '../utils/cli-message-extractor';
import { ProfileState } from './profile-picker';
import { log, logStructured } from '../extension';

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
  private isRefreshing = false;

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
            log(`Preview rendered: ${message.pageCount} pages`);
            break;
          case 'ready':
            log('Preview ready');
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
   * @param extensionUri - Extension URI for resource loading
   * @param outputChannel - Output channel for logging
   * @param profileState - Profile state provider
   * @param viewColumn - Where to show the panel (default: Active = same tab)
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    outputChannel: vscode.OutputChannel,
    profileState: ProfileState,
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.Active
  ): PreviewPanel {
    // If panel exists, reveal it in the specified column
    if (PreviewPanel.currentPanel) {
      PreviewPanel.currentPanel.panel.reveal(viewColumn);
      return PreviewPanel.currentPanel;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      PreviewPanel.viewType,
      'PageMD Preview',
      viewColumn,
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
   * Set up document watching based on refresh mode.
   * Called once when preview opens - registers event listeners.
   */
  public setupDocumentWatching(context: vscode.ExtensionContext): void {
    const config = vscode.workspace.getConfiguration('pagemd');
    const refreshMode = config.get<string>('previewRefresh', 'manual');

    log(`Preview refresh mode: ${refreshMode}`);

    if (refreshMode === 'manual') {
      // No auto-refresh - user must manually refresh via command
      return;
    }

    if (refreshMode === 'onSave' || refreshMode === 'live') {
      // Both modes listen for saves
      vscode.workspace.onDidSaveTextDocument(
        (doc) => {
          if (this.isWatchedDocument(doc.uri)) {
            logStructured('DEBUG', 'preview', 'refresh', 'info', 'Document saved, refreshing preview');
            this.refresh();
          }
        },
        null,
        this.disposables
      );
    }

    if (refreshMode === 'live') {
      // Live mode also listens for text changes (uses stdin, no disk I/O)
      vscode.workspace.onDidChangeTextDocument(
        (e) => {
          if (this.isWatchedDocument(e.document.uri)) {
            this.debouncedRefresh();
          }
        },
        null,
        this.disposables
      );
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
   * Debounced refresh for live mode.
   * Uses stdin to pipe content directly - no disk I/O required.
   */
  private debouncedRefresh(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      // refresh() uses stdin for dirty/untitled docs - no save needed
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
    // Prevent concurrent refreshes (race condition guard)
    if (this.isRefreshing) {
      logStructured('DEBUG', 'preview', 'refresh', 'skip', 'Refresh already in progress');
      return;
    }

    if (!this.documentUri) {
      return;
    }

    this.isRefreshing = true;

    try {
      const filePath = this.documentUri.fsPath;
      const profile = this.profileState.getSelectedProfile();

      // Read configurable timeout (M3)
      const config = vscode.workspace.getConfiguration('pagemd');
      const timeout = config.get<number>('previewTimeout', 30000);

      // Check if document is untitled or has unsaved changes
      const doc = vscode.workspace.textDocuments.find(
        d => d.uri.toString() === this.documentUri?.toString()
      );
      const useStdin = doc?.isUntitled || doc?.isDirty;

      // Determine working directory:
      // - For saved files: use file's directory
      // - For untitled: use workspace folder or fallback to home
      let cwd: string;
      if (doc?.isUntitled) {
        cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || require('os').homedir();
      } else {
        cwd = path.dirname(filePath);
      }

      const displayName = doc?.isUntitled ? 'Untitled' : path.basename(filePath);
      log(`Refreshing preview: ${displayName}`);
      logStructured('DEBUG', 'preview', 'refresh', 'info', 'Working directory', { cwd });
      logStructured('DEBUG', 'preview', 'refresh', 'info', 'Profile', { profile: profile || '(default)' });
      logStructured('DEBUG', 'preview', 'refresh', 'info', 'Mode', { mode: useStdin ? 'stdin (unsaved)' : 'file' });

      let html: string;

      if (useStdin && doc) {
        // STDIN MODE: Pipe document content directly, get HTML from stdout
        const content = doc.getText();
        logStructured('DEBUG', 'preview', 'stdin', 'info', 'Document content', { bytes: content.length });

        const args = ['build', '--stdin', '--stdout', '-o', 'html'];
        // Pass markdown file path for correct path resolution (e.g., relative profile paths)
        if (!doc.isUntitled) {
          args.push('--stdin-path', filePath);
        }
        if (profile) {
          args.push('-p', profile);
        }
        const result = await runPageMD({
          args,
          cwd,
          timeout,
          outputChannel: this.outputChannel,
          env: buildCliEnv(),
          stdin: content,
          suppressStdout: true,  // Don't log HTML to output channel
        });

        // Check if panel was disposed during async operation
        if (!this.panel.visible) {
          logStructured('DEBUG', 'preview', 'refresh', 'abort', 'Panel disposed during refresh');
          return;
        }

        logStructured('INFO', 'preview', 'cli', result.code === 0 ? 'success' : 'fail', 'CLI exit', { code: result.code });

        if (result.code !== 0) {
          logStructured('ERROR', 'preview', 'cli', 'fail', 'CLI stderr', { stderr: result.stderr });
          const cleanMessage = extractCleanMessage(result.stderr, result.stdout);
          this.showError(cleanMessage);
          vscode.window.showErrorMessage(`PageMD: ${cleanMessage}`, 'Show Output')
            .then(action => {
              if (action === 'Show Output') {
                this.outputChannel.show();
              }
            });
          return;
        }

        // HTML comes directly from stdout
        html = result.stdout;
        logStructured('DEBUG', 'preview', 'stdin', 'info', 'HTML from stdout', { bytes: html.length });
      } else {
        // FILE MODE: Existing flow - CLI writes HTML file, we read it
        const fileArgs = ['build', filePath, '-o', 'html'];
        if (profile) {
          fileArgs.push('-p', profile);
        }
        // Only suppress stdout when CLI logging is disabled
        // When cliLogLevel is set, user wants to see CLI logs (which go to stdout)
        const cliLogLevel = vscode.workspace.getConfiguration('pagemd').get<string>('cliLogLevel', '');
        const result = await runPageMD({
          args: fileArgs,
          cwd,
          timeout,
          outputChannel: this.outputChannel,
          env: buildCliEnv(),
          suppressStdout: !cliLogLevel,  // Only suppress when CLI logging disabled (empty string)
        });

        // Check if panel was disposed during async operation
        if (!this.panel.visible) {
          logStructured('DEBUG', 'preview', 'refresh', 'abort', 'Panel disposed during refresh');
          return;
        }

        logStructured('INFO', 'preview', 'cli', result.code === 0 ? 'success' : 'fail', 'CLI exit', { code: result.code });

        if (result.code !== 0) {
          logStructured('ERROR', 'preview', 'cli', 'fail', 'CLI stderr', { stderr: result.stderr });
          const cleanMessage = extractCleanMessage(result.stderr, result.stdout);
          this.showError(cleanMessage);
          vscode.window.showErrorMessage(`PageMD: ${cleanMessage}`, 'Show Output')
            .then(action => {
              if (action === 'Show Output') {
                this.outputChannel.show();
              }
            });
          return;
        }

        // Read the generated HTML file
        const htmlPath = filePath.replace(/\.md$/, '.html');
        const htmlUri = vscode.Uri.file(htmlPath);

        logStructured('DEBUG', 'preview', 'file-mode', 'info', 'Looking for HTML', { path: htmlPath });
        if (result.stdout) {
          logStructured('DEBUG', 'preview', 'file-mode', 'info', 'CLI output', {
            output: result.stdout.substring(0, 500) + (result.stdout.length > 500 ? '...' : '')
          });
        }

        try {
          const htmlContent = await vscode.workspace.fs.readFile(htmlUri);
          html = new TextDecoder().decode(htmlContent);
          logStructured('DEBUG', 'preview', 'file-mode', 'info', 'HTML file loaded', { bytes: html.length });

          // Clean up generated HTML file (unless debug mode is on)
          const debugMode = config.get<boolean>('debugMode', false);
          if (!debugMode) {
            try {
              await vscode.workspace.fs.delete(htmlUri);
              logStructured('DEBUG', 'preview', 'file-mode', 'info', 'Cleaned up temporary HTML file');
            } catch {
              // Ignore cleanup errors - file may already be deleted or locked
            }
          } else {
            logStructured('DEBUG', 'preview', 'file-mode', 'info', 'Debug mode: keeping HTML file', { path: htmlPath });
          }
        } catch (readErr) {
          logStructured('ERROR', 'preview', 'file-mode', 'fail', 'HTML read error', { error: String(readErr) });

          // List files in directory to help debug
          try {
            const dirUri = vscode.Uri.file(cwd);
            const files = await vscode.workspace.fs.readDirectory(dirUri);
            const htmlFiles = files.filter(([name]) => name.endsWith('.html')).map(([name]) => name);
            logStructured('DEBUG', 'preview', 'file-mode', 'info', 'HTML files in directory', { files: htmlFiles });
          } catch {
            // Ignore directory listing errors
          }

          this.showError(`HTML file not found. Build may have failed.\nExpected: ${htmlPath}\n\nCLI output:\n${result.stdout || result.stderr || 'No output'}`);
          return;
        }
      }

      // Validate HTML content
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      logStructured('TRACE', 'preview', 'extract', 'info', 'Body extracted', {
        success: !!bodyMatch,
        chars: bodyMatch ? bodyMatch[1].length : 0
      });

      if (html.length < 100) {
        logStructured('WARN', 'preview', 'extract', 'warn', 'HTML very small', { content: html });
      }

      if (!bodyMatch || bodyMatch[1].trim().length === 0) {
        logStructured('WARN', 'preview', 'extract', 'warn', 'No body content found in HTML');
        this.showError('Generated HTML has no body content.');
        return;
      }

      this.renderHtml(html);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logStructured('ERROR', 'preview', 'refresh', 'fail', 'Error during refresh', { error: message });
      // Only show error if panel still visible
      if (this.panel.visible) {
        this.showError(message);
      }
    } finally {
      this.isRefreshing = false;
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
   * Get webview URI for zoom toolbar script.
   */
  private getZoomToolbarUri(): vscode.Uri {
    return getWebviewUri(this.panel.webview, this.extensionUri, ['media', 'zoom-toolbar.js']);
  }

  /**
   * Get stylesheet URIs based on current settings.
   */
  private getStylesheetLinks(nonce: string): string {
    const mediaPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'styles');
    const webview = this.panel.webview;

    // Always include base and toolbar
    const stylesheets: vscode.Uri[] = [
      vscode.Uri.joinPath(mediaPath, 'preview-base.css'),
      vscode.Uri.joinPath(mediaPath, 'preview-toolbar.css'),
    ];

    // Conditional stylesheets based on settings
    const config = vscode.workspace.getConfiguration('pagemd');

    if (config.get('preview.emulatePageLayout', true)) {
      stylesheets.push(vscode.Uri.joinPath(mediaPath, 'preview-layout.css'));
    }

    if (config.get('preview.showDimensions', true)) {
      stylesheets.push(vscode.Uri.joinPath(mediaPath, 'preview-dimensions.css'));
    }

    const debugLevel = config.get<string>('preview.debugLevel', '');
    if (debugLevel) {
      stylesheets.push(vscode.Uri.joinPath(mediaPath, 'preview-debug.css'));
    }

    if (config.get('preview.twoColumnSpread', false)) {
      stylesheets.push(vscode.Uri.joinPath(mediaPath, 'preview-book.css'));
    }

    return stylesheets
      .map(uri => `<link rel="stylesheet" href="${webview.asWebviewUri(uri)}">`)
      .join('\n    ');
  }

  /**
   * Generate CSS variables for preview based on VS Code settings.
   * External CSS files use these variables for styling.
   */
  private getPreviewStyles(): string {
    const config = vscode.workspace.getConfiguration('pagemd');
    const marginColor = config.get<string>('preview.marginColor', '#0ff');
    const paperColor = config.get<string>('preview.paperColor', '#ffffff');
    const bgColor = config.get<string>('preview.backgroundColor', '#777777');
    const pageGap = config.get<string>('preview.pageGap', '') || '5mm';
    const spreadGap = config.get<string>('preview.spreadGap', '') || '5mm';
    const zoom = config.get<number>('preview.zoom', 100);

    return `:root {
      --pagemd-margin-color: ${marginColor};
      --pagemd-paper-color: ${paperColor};
      --pagemd-bg-color: ${bgColor};
      --pagemd-page-gap: ${pageGap};
      --pagemd-spread-gap: ${spreadGap};
      --pagemd-font-color: #000;
      --pagemd-zoom: ${zoom / 100};
    }`;
  }

  /**
   * Get preview settings as JSON string for injection into webview.
   */
  private getPreviewSettingsJson(): string {
    const config = vscode.workspace.getConfiguration('pagemd');
    const pagedJsUri = this.getPagedJsUri();
    const settings = {
      highlightMargins: config.get<boolean>('preview.highlightMargins', true),
      showDimensions: config.get<boolean>('preview.showDimensions', true),
      dimensionUnit: config.get<string>('preview.dimensionUnit', 'in'),
      pagedJsUri: this.panel.webview.asWebviewUri(pagedJsUri).toString(),
    };
    return JSON.stringify(settings);
  }

  /**
   * Generate zoom toolbar HTML with controls.
   * Logic moved to external media/zoom-toolbar.js for maintainability.
   * State persisted via VS Code webview state API (session-only).
   */
  private getZoomToolbar(nonce: string): string {
    const config = vscode.workspace.getConfiguration('pagemd');
    const zoom = config.get<number>('preview.zoom', 100);
    const zoomToolbarUri = this.getZoomToolbarUri();

    // IMPORTANT: position:fixed must be inline - Paged.js strips it from stylesheets
    return `
    <div class="pagemd-zoom-toolbar" style="position: fixed; bottom: 20px; right: 20px;">
      <button id="zoom-out-btn" title="Zoom Out (Ctrl+-)">−</button>
      <span class="zoom-level" id="zoom-level">${zoom}%</span>
      <button id="zoom-in-btn" title="Zoom In (Ctrl++)">+</button>
      <span class="zoom-separator"></span>
      <button class="fit-btn" id="fit-width-btn" title="Fit to Width">Fit</button>
      <button class="fit-btn" id="reset-zoom-btn" title="Reset Zoom (Ctrl+0)">100%</button>
      <span class="zoom-separator"></span>
      <button class="mode-btn" id="hand-tool-btn" title="Hand Tool (H) - Click and drag to pan">✋</button>
      <button class="mode-btn" id="book-toggle-btn" title="Toggle Book Spread (2-column)">📖</button>
      <button class="mode-btn" id="view-toggle-btn" title="Toggle View (Paged/Browser)">🌐</button>
    </div>
    <script nonce="${nonce}" src="${zoomToolbarUri}"></script>`;
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
    const stylesheetLinks = this.getStylesheetLinks(nonce);
    const zoomToolbar = this.getZoomToolbar(nonce);

    // Build body classes based on settings
    const config = vscode.workspace.getConfiguration('pagemd');
    const bodyClasses = [themeClass];
    if (config.get('preview.twoColumnSpread', false)) {
      bodyClasses.push('two-column');
    }
    if (config.get('preview.firstPagePosition') === 'right') {
      bodyClasses.push('first-page-right');
    }
    // Add debug class based on level
    const debugLevel = config.get<string>('preview.debugLevel', '');
    if (debugLevel) {
      bodyClasses.push(`debug-${debugLevel}`);
    }
    // Add highlight-margins class when enabled
    if (config.get<boolean>('preview.highlightMargins', true)) {
      bodyClasses.push('highlight-margins');
    }

    // Extract body content if full HTML document
    let bodyContent = content;
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    }

    // Extract styles from original document, preserving @layer structure
    let styles = '';
    const styleMatches = content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    for (const match of styleMatches) {
      const fullStyleTag = match[0];
      let styleContent = match[1];

      // IMPORTANT: Even though VS Code 1.103+ wraps defaults in @layer vscode-default
      // (see https://github.com/microsoft/vscode/issues/261430), Paged.js generates
      // UNLAYERED CSS which always beats layered CSS per cascade rules.
      // We must use !important to ensure document styles win over Paged.js.
      //
      // CRITICAL: With !important, layer order REVERSES (base !important beats frontmatter !important).
      // Solution: Make frontmatter TRULY UNLAYERED by removing @layer wrapper.
      // Unlayered CSS with !important beats layered CSS with !important.

      const criticalProps = [
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'color',
        'background-color',
        'background',
      ];

      const isFrontmatterLayer = /data-layer=["']frontmatter["']/.test(fullStyleTag);

      if (isFrontmatterLayer) {
        // Frontmatter: Strip @layer wrapper completely to make it unlayered
        // Match @layer frontmatter { ... } and extract the inner CSS
        const layerMatch = styleContent.match(/@layer\s+frontmatter\s*\{\s*([\s\S]*?)\s*\}\s*$/i);
        if (layerMatch) {
          styleContent = layerMatch[1];
        }

        // CRITICAL: Add !important ONLY to frontmatter (unlayered)
        // Per CSS spec: layered !important beats unlayered !important (inverted cascade)
        // So we MUST NOT add !important to layered styles, only to unlayered frontmatter
        for (const prop of criticalProps) {
          const regex = new RegExp(`(${prop}\\s*:\\s*)([^;!]+)(;)`, 'gi');
          styleContent = styleContent.replace(regex, '$1$2 !important$3');
        }
      } else {
        // Other layers: Keep @layer wrapper, but DO NOT add !important
        // Layered styles without !important are overridden by unlayered !important
        // This gives frontmatter the highest priority
        // Note: Paged.js unlayered CSS will override these layered styles, but
        // frontmatter unlayered !important will override Paged.js
      }

      // Append the content (including @layer wrapper) to styles
      // The template will wrap all of this in a single <style> tag
      styles += styleContent + '\n';
    }

    // Extract data-color-scheme attribute from CLI-generated HTML
    let colorScheme = 'auto';
    const htmlMatch = content.match(/<html[^>]*data-color-scheme=["']([^"']+)["']/i);
    if (htmlMatch) {
      colorScheme = htmlMatch[1];
    }

    // For paged preview, override 'auto' to 'light' for print consistency
    // User's explicit light/dark choice is preserved
    if (colorScheme === 'auto') {
      colorScheme = 'light';
    }

    // Note: We skip external CSS links as they won't resolve in webview
    // All necessary styles come from the CLI-generated HTML inline styles

    return `<!DOCTYPE html>
<html lang="en" data-color-scheme="${colorScheme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${csp}
  <title>PageMD Preview</title>
  ${stylesheetLinks}
  <style>
    /* Declare layer order: vscode-default at lowest priority, our layers override */
    /* See: https://github.com/microsoft/vscode/issues/261430 */
    /* pagemd-preview = extension CSS for .pagedjs_* elements */
    /* frontmatter layer intentionally NOT declared - undeclared layers have highest priority */
    @layer vscode-default, pagemd-preview, base, primary, layout, syntax, profile;

    /* Document styles from CLI (in layers: base, primary, layout, syntax, profile, frontmatter) */
    ${styles}

    /* CSS variables (dynamic per-session) */
    ${previewStyles}
  </style>
</head>
<body class="${bodyClasses.join(' ')}">
  <div class="pagemd-content">
    ${bodyContent}
  </div>
  <iframe id="browser-view-iframe" class="pagemd-browser-view" sandbox="allow-scripts allow-same-origin"></iframe>
  ${zoomToolbar}
  <script nonce="${nonce}">
    // Initialize PagedConfig before Paged.js loads
    window.PagedConfig = window.PagedConfig || { auto: true };
    // Pass preview settings to previewer.js
    window.pagemdSettings = ${this.getPreviewSettingsJson()};
    // Pass debug level state
    window.pagemdDebugLevel = '${config.get<string>('preview.debugLevel', '')}';
    // Store raw HTML for browser mode toggle (before Paged.js transforms it)
    // Use data-color-scheme for document theming (same as paged preview)
    window.pagemdRawHtml = ${JSON.stringify(`<!DOCTYPE html>
<html data-color-scheme="${colorScheme}"><head><meta charset="UTF-8"><style>${styles}</style></head>
<body>${bodyContent}</body></html>`)};
  </script>
  <script nonce="${nonce}" src="${previewerUri}"></script>
  <script nonce="${nonce}" src="${pagedJsUri}"></script>
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
    const errorCssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'styles', 'preview-error.css')
    );

    this.panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${csp}
  <title>PageMD Preview Error</title>
  <link rel="stylesheet" href="${errorCssUri}">
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
