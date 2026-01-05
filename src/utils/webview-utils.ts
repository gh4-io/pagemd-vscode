import * as vscode from 'vscode';

/**
 * Generate a random nonce for CSP.
 */
export function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Get webview-safe URI for a local resource.
 */
export function getWebviewUri(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  pathList: string[]
): vscode.Uri {
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
}

/**
 * Generate Content Security Policy meta tag.
 *
 * Note: 'unsafe-eval' is required for Paged.js polyfill which uses
 * dynamic code evaluation for CSS parsing and pagination.
 */
export function getCspMetaTag(webview: vscode.Webview, nonce: string): string {
  const cspSource = webview.cspSource;
  return `<meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    style-src ${cspSource} 'unsafe-inline';
    script-src 'nonce-${nonce}' 'unsafe-eval';
    img-src ${cspSource} data: https:;
    font-src ${cspSource} data:;
    frame-src blob:;
  ">`;
}

/**
 * Detect VS Code theme and return appropriate class.
 */
export function getThemeClass(): string {
  const kind = vscode.window.activeColorTheme.kind;
  switch (kind) {
    case vscode.ColorThemeKind.Light:
      return 'vscode-light';
    case vscode.ColorThemeKind.Dark:
      return 'vscode-dark';
    case vscode.ColorThemeKind.HighContrast:
      return 'vscode-high-contrast';
    case vscode.ColorThemeKind.HighContrastLight:
      return 'vscode-high-contrast-light';
    default:
      return 'vscode-dark';
  }
}
