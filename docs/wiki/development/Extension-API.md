# Extension API

Reference for VS Code Extension APIs used in PageMD.

---

## Contents

- [APIs Used](#apis-used)
- [PreviewPanel Class](#previewpanel-class)
- [Command Registration](#command-registration)
- [Webview Panel](#webview-panel)
- [Quick Pick](#quick-pick)
- [Configuration](#configuration)
- [Diagnostics](#diagnostics)
- [Child Process](#child-process)
- [Patterns](#patterns)

---

## APIs Used

| API | Purpose |
|-----|---------|
| `vscode.commands` | Command registration |
| `vscode.window.createWebviewPanel` | Preview panel |
| `vscode.window.showQuickPick` | Profile selection |
| `vscode.workspace.getConfiguration` | Settings access |
| `vscode.languages.createDiagnosticCollection` | Validation errors |
| `child_process.spawn` | CLI subprocess |

---

## PreviewPanel Class

**File:** `src/providers/preview-panel.ts`

The PreviewPanel class manages the VS Code webview that displays paginated HTML. It's the **core component** connecting the editor to the PageMD rendering pipeline.

### Architecture

```
┌─────────────────────────────────────────────────┐
│ VS Code Extension Host                          │
│  └─ PreviewPanel (singleton)                    │
│       ├─ CLI wrapper → generates HTML           │
│       ├─ Webview HTML generator                 │
│       └─ Settings provider                      │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ Webview Context (sandboxed)                     │
│  ├─ previewer.js (Paged.js hooks)               │
│  ├─ paged.polyfill.js (pagination engine)       │
│  ├─ Toolbar controls (inline script)            │
│  └─ Dimension labels (injected post-render)     │
└─────────────────────────────────────────────────┘
```

### Singleton Pattern

Only one preview panel exists at a time:

```typescript
public static currentPanel: PreviewPanel | undefined;

public static createOrShow(
  extensionUri: vscode.Uri,
  outputChannel: vscode.OutputChannel,
  profileState: ProfileState,
  viewColumn?: vscode.ViewColumn
): PreviewPanel {
  // If panel exists, reveal it
  if (PreviewPanel.currentPanel) {
    PreviewPanel.currentPanel.panel.reveal(viewColumn);
    return PreviewPanel.currentPanel;
  }

  // Create new panel
  const panel = vscode.window.createWebviewPanel(
    'pagedPreview',
    'Paged Preview',
    viewColumn || vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [extensionUri]
    }
  );

  PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri, outputChannel, profileState);
  return PreviewPanel.currentPanel;
}
```

### Instance State

| Variable | Type | Purpose |
|----------|------|---------|
| `panel` | `vscode.WebviewPanel` | VS Code webview container |
| `extensionUri` | `vscode.Uri` | Extension root for resource loading |
| `outputChannel` | `vscode.OutputChannel` | Logging sink |
| `profileState` | `ProfileState` | Selected profile (workspace state) |
| `documentUri` | `vscode.Uri \| undefined` | Currently previewed markdown |
| `disposables` | `vscode.Disposable[]` | Event listener cleanup list |
| `debounceTimer` | `NodeJS.Timeout \| undefined` | onType refresh debounce |

### Lifecycle Methods

```typescript
// Create or reveal panel
PreviewPanel.createOrShow(extensionUri, outputChannel, profileState)

// Setup document watching (call after createOrShow)
panel.setupDocumentWatching(context)

// Load document into preview
panel.update(documentUri)

// Regenerate preview (called automatically on save/type)
panel.refresh()

// Cleanup when panel closes
panel.dispose()
```

### Data Flow

```
User saves markdown
  → onDidSaveTextDocument fires
  → refresh() called
  → runPageMD(['build', file, '-o', 'html', '-p', profile])
  → Read generated HTML file
  → Extract <body> content and <style> tags
  → wrapHtml() adds CSP, Paged.js, toolbar
  → panel.webview.html = wrappedHtml
  → Paged.js runs in webview
  → User sees paginated preview
```

### Document Watching

```typescript
public setupDocumentWatching(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration('pagemd');
  const refreshMode = config.get<string>('previewRefresh', 'manual');

  if (refreshMode === 'manual') return;

  // onSave and live modes listen to save events
  if (refreshMode === 'onSave' || refreshMode === 'live') {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (this.isWatchedDocument(doc.uri)) {
          this.refresh();
        }
      })
    );
  }

  // live mode also listens to changes (uses stdin, no disk I/O)
  if (refreshMode === 'live') {
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (this.isWatchedDocument(e.document.uri)) {
          this.debouncedRefresh();
        }
      })
    );
  }
}

private debouncedRefresh(): void {
  if (this.debounceTimer) clearTimeout(this.debounceTimer);
  this.debounceTimer = setTimeout(() => {
    // refresh() uses stdin for dirty docs - no save needed
    this.refresh();
  }, 500);
}
```

### Event Handlers

Registered in constructor:

```typescript
// Panel disposal
this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

// Theme changes
vscode.window.onDidChangeActiveColorTheme(() => {
  this.refresh();
}, null, this.disposables);

// Configuration changes
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration('pagemd')) {
    this.refresh();
  }
}, null, this.disposables);

// Messages from webview
this.panel.webview.onDidReceiveMessage((message) => {
  switch (message.type) {
    case 'rendered':
      this.outputChannel.appendLine(`Rendered ${message.pageCount} pages`);
      break;
    case 'ready':
      this.outputChannel.appendLine('Preview ready');
      break;
  }
}, null, this.disposables);
```

### Related Files

| File | Purpose |
|------|---------|
| `src/commands/preview.ts` | Command entry point |
| `src/utils/webview-utils.ts` | CSP, nonces, theme detection |
| `src/utils/cli-wrapper.ts` | CLI subprocess execution |
| `media/previewer.js` | Paged.js hooks, dimension labels |
| `media/paged.polyfill.js` | Paged.js v0.4.3 runtime |

---

## Command Registration

### Basic Command

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pagemd.commandName', () => {
      vscode.window.showInformationMessage('Command executed');
    })
  );
}
```

### Command with Parameters

```typescript
vscode.commands.registerCommand('pagemd.commandName', async (arg) => {
  // Handle arg
});
```

---

## Webview Panel

### Create Panel

```typescript
const panel = vscode.window.createWebviewPanel(
  'pagedPreview',
  'Paged Preview',
  vscode.ViewColumn.Beside,
  {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [
      vscode.Uri.joinPath(context.extensionUri, 'media')
    ]
  }
);
```

### Set HTML Content

```typescript
panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <div id="content">...</div>
</body>
</html>`;
```

### Handle Messages

```typescript
panel.webview.onDidReceiveMessage(
  message => {
    switch (message.command) {
      case 'action':
        // Handle action
        break;
    }
  },
  undefined,
  context.subscriptions
);
```

---

## Quick Pick

### Show Quick Pick

```typescript
const selection = await vscode.window.showQuickPick(
  ['Option 1', 'Option 2'],
  {
    placeHolder: 'Select an option'
  }
);

if (selection) {
  // Handle selection
}
```

### Quick Pick Items

```typescript
interface ProfileItem extends vscode.QuickPickItem {
  profile: Profile;
}

const items: ProfileItem[] = profiles.map(p => ({
  label: p.name,
  description: p.description,
  profile: p
}));

const selected = await vscode.window.showQuickPick(items);
```

---

## Configuration

### Read Setting

```typescript
const config = vscode.workspace.getConfiguration('pagemd');
const cliPath = config.get<string>('cliPath');
const outputDir = config.get<string>('outputDir', './output');
```

### Update Setting

```typescript
await config.update('cliPath', '/custom/path', vscode.ConfigurationTarget.Global);
```

---

## Diagnostics

### Create Collection

```typescript
const diagnostics = vscode.languages.createDiagnosticCollection('pagemd');
```

### Add Diagnostic

```typescript
const doc = vscode.window.activeTextEditor?.document;
if (doc) {
  const range = new vscode.Range(
    new vscode.Position(lineNumber, 0),
    new vscode.Position(lineNumber, lineLength)
  );

  const diagnostic = new vscode.Diagnostic(
    range,
    'Error message',
    vscode.DiagnosticSeverity.Error
  );

  diagnostics.set(doc.uri, [diagnostic]);
}
```

### Clear Diagnostics

```typescript
diagnostics.clear();
```

---

## Child Process

### Spawn Process

```typescript
import { spawn } from 'child_process';

const child = spawn('pagemd', ['build', 'file.md'], {
  cwd: workspaceFolder
});

child.stdout.on('data', (data) => {
  console.log(data.toString());
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`Exit code: ${code}`);
});
```

### Collect Output

```typescript
let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
});

await new Promise((resolve) => {
  child.on('close', (code) => {
    resolve({ code, stdout, stderr });
  });
});
```

---

## Patterns

### Disposables Pattern

Track event listeners for automatic cleanup:

```typescript
private disposables: vscode.Disposable[] = [];

// In constructor - pass disposables array as third arg
this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
vscode.window.onDidChangeActiveColorTheme(() => this.refresh(), null, this.disposables);

// In dispose method
public dispose(): void {
  PreviewPanel.currentPanel = undefined;
  if (this.debounceTimer) clearTimeout(this.debounceTimer);
  this.panel.dispose();

  // Clean up all registered listeners
  while (this.disposables.length) {
    this.disposables.pop()?.dispose();
  }
}
```

### Cross-Platform Path Handling

Normalize paths for Windows/Linux compatibility:

```typescript
private isWatchedDocument(uri: vscode.Uri): boolean {
  if (!this.documentUri) return false;

  // Normalize for comparison (Windows case-insensitivity, path separators)
  const watchedPath = this.documentUri.fsPath.toLowerCase().replace(/\\/g, '/');
  const checkPath = uri.fsPath.toLowerCase().replace(/\\/g, '/');
  return watchedPath === checkPath;
}
```

### CSP-Safe Event Handlers

Use `addEventListener` instead of inline handlers (required by strict CSP):

```html
<!-- CSP blocks: onclick="..." -->
<!-- CSP allows: addEventListener() -->
<button id="zoom-in-btn">+</button>

<script nonce="${nonce}">
  document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
    zoomIn();
  });
</script>
```

### Pre-Transform State Capture

Capture state before Paged.js transforms CSS (Paged.js removes @page rules):

```javascript
let cachedLayoutInfo = null;

window.PagedConfig.before = async () => {
  // Extract BEFORE Paged.js transforms
  cachedLayoutInfo = extractLayoutInfo();
};

window.PagedConfig.after = async (flow) => {
  // Use cached info AFTER Paged.js finishes
  if (cachedLayoutInfo) {
    injectDimensionLabels(cachedLayoutInfo);
  }
};
```

---

## See Also

- [[Setup]] - Development environment setup
- [[../general/Architecture|Architecture]] - Extension architecture
- [[../general/Preview-Architecture|Preview Architecture]] - Deep-dive into preview internals
- [VS Code Extension API](https://code.visualstudio.com/api)
