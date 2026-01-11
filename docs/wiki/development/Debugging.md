# Debugging

Advanced debugging techniques for extension development.

---

## Contents

- [Extension Debugging](#extension-debugging)
- [CLI Subprocess Debugging](#cli-subprocess-debugging)
- [Webview Debugging](#webview-debugging)
- [Common Debug Scenarios](#common-debug-scenarios)

---

## Extension Debugging

### Launch Configuration

Press `F5` to start debugging using the configuration in `.vscode/launch.json`.

### Setting Breakpoints

1. Open source file in `src/`
2. Click in gutter next to line number
3. Red dot appears indicating breakpoint
4. Trigger command to hit breakpoint

### Debug Console

Access variables and execute expressions while paused:

1. Pause at breakpoint
2. Open Debug Console (`Ctrl+Shift+Y`)
3. Type expressions to evaluate

---

## CLI Subprocess Debugging

### Output Panel Logs

View CLI stdout/stderr:

1. `View` → `Output`
2. Select "PageMD" from dropdown
3. Observe CLI command execution

**Note:** By default, HTML output is suppressed from the output channel when using stdin mode (`--stdout` flag). This prevents thousands of lines of HTML from cluttering the log. Diagnostic messages (file sizes, exit codes, errors) are still logged.

**To see full stdout for trace debugging:**

In `src/providers/preview-panel.ts`, temporarily disable stdout suppression:

```typescript
// Find the runPageMD call in stdin mode
const result = await runPageMD({
  args,
  cwd,
  timeout,
  outputChannel: this.outputChannel,
  env: buildCliEnv(),
  stdin: content,
  suppressStdout: false,  // Change to false to see full HTML in output
});
```

**When to enable full stdout:**
- Debugging HTML generation issues
- Inspecting exact CLI output
- Tracing template rendering problems
- Verifying CSS injection

**When to keep suppressed (default):**
- Normal development (HTML clutters logs)
- Extension users (no need to see HTML)

### CLI Arguments

Check what arguments are passed to CLI:

```typescript
// In cli-wrapper.ts, add console.log before spawn
console.log('CLI args:', args);
const child = spawn(cliPath, args);
```

### Manual CLI Testing

Test CLI commands separately:

```bash
cd /path/to/bundled/cli
node apps/cli/src/index.js build test.md -o pdf
```

---

## Webview Debugging

### Open Webview DevTools

Multiple ways to open DevTools for the preview webview:

**Quick access (recommended):**

- **Right-click** inside the preview → "Open DevTools"
- **More Actions menu (⋮)** on preview tab → "Open DevTools"
- **Command Palette:** `Ctrl+Shift+P` → "Open DevTools"

**VS Code native command:**

- `Ctrl+Shift+P` → "Developer: Open Webview Developer Tools"

DevTools opens for the preview webview context.

### Console Logs

Add logs in `media/previewer.js`:

```javascript
console.log('Paged.js rendered:', totalPages);
```

View in Webview DevTools Console.

### Inspect Preview HTML

1. Open Webview DevTools
2. Click Elements tab
3. Inspect injected HTML structure

---

## Common Debug Scenarios

### Command Not Executing

**Symptom:** Command palette entry does nothing

**Debug steps:**
1. Set breakpoint in `extension.ts` activation
2. Verify command is registered
3. Set breakpoint in command handler
4. Check if handler is called

### CLI Not Found

**Symptom:** "CLI not found" error

**Debug steps:**
1. Set breakpoint in `cli-wrapper.ts` `findCLI()`
2. Step through resolution logic
3. Check paths being tested
4. Verify CLI exists at expected location

### Preview Not Updating

**Symptom:** Preview shows stale content

**Debug steps:**
1. Set breakpoint in `preview-panel.ts` `updateContent()`
2. Verify method is called on file change
3. Check CLI output in Output panel
4. Open Webview DevTools, verify HTML changed

### Paged.js Not Paginating

**Symptom:** Preview shows unpaginated content

**Debug steps:**
1. Open Webview DevTools
2. Check Console for Paged.js errors
3. Verify `paged.polyfill.js` loaded
4. Verify `previewer.js` called `window.PagedPolyfill.preview()`

---

## See Also

- [[development/Testing|Testing]] - Testing procedures
- [[Troubleshooting]] - Common issues and solutions
- [VS Code Extension Debugging](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
