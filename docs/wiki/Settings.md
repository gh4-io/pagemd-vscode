# Settings

Complete reference for all PageMD VS Code extension settings.

---

## Contents

- [General](#general)
- [Preview](#preview)
- [Preview: Layout](#preview-layout)
- [Preview: Appearance](#preview-appearance)
- [Rendering](#rendering)
- [Export](#export)

---

## General

### pagemd.defaultProfile

**Type:** `string`
**Default:** `"standard_letter"`

Default profile for rendering when no profile is specified in frontmatter.

```json
"pagemd.defaultProfile": "technical_report"
```

---

### pagemd.cliPath

**Type:** `string`
**Default:** `""` (auto-detect)

Custom path to the PageMD CLI executable. Leave empty to use the 5-tier auto-detection.

```json
"pagemd.cliPath": "/usr/local/bin/pagemd"
```

See [[Installation#cli-resolution]] for the detection order.

---

### pagemd.outputPath

**Type:** `string`
**Default:** `""` (same directory as source)

Custom output directory for generated files. Can be relative to workspace or absolute.

```json
"pagemd.outputPath": "./output"
```

Leave empty to save outputs alongside the source Markdown file.

---

### pagemd.showOutputPanelOn

**Type:** `string`
**Default:** `"onError"`
**Options:** `"always"`, `"never"`, `"onError"`

When to show the output panel:

| Value | Behavior |
|-------|----------|
| `always` | Show for every operation |
| `never` | Never auto-show |
| `onError` | Show only when errors occur |

```json
"pagemd.showOutputPanelOn": "always"
```

---

## Preview

### pagemd.autoRefreshPreview

**Type:** `boolean`
**Default:** `true`

Automatically refresh preview when the file changes.

```json
"pagemd.autoRefreshPreview": true
```

---

### pagemd.previewTrigger

**Type:** `string`
**Default:** `"onSave"`
**Options:** `"onSave"`, `"onType"`

When to refresh the preview:

| Value | Behavior |
|-------|----------|
| `onSave` | Refresh when file is saved |
| `onType` | Refresh as you type (debounced) |

```json
"pagemd.previewTrigger": "onType"
```

**Note:** `onType` provides faster feedback but uses more resources.

---

## Preview: Layout

### pagemd.preview.emulatePageLayout

**Type:** `boolean`
**Default:** `true`

Show white pages on gray background for print-accurate preview.

```json
"pagemd.preview.emulatePageLayout": true
```

---

### pagemd.preview.twoColumnSpread

**Type:** `boolean`
**Default:** `false`

Show pages side-by-side like an open book.

<!-- SCREENSHOT: two-column-spread.png - Book-style spread view -->

```json
"pagemd.preview.twoColumnSpread": true
```

---

### pagemd.preview.firstPagePosition

**Type:** `string`
**Default:** `"right"`
**Options:** `"left"`, `"right"`

Position of first page in book spread view. `right` matches typical book layout with recto pages on right.

```json
"pagemd.preview.firstPagePosition": "left"
```

---

### pagemd.preview.pageGap

**Type:** `string` (CSS length)
**Default:** `"5mm"`

Gap between pages in preview.

```json
"pagemd.preview.pageGap": "10mm"
```

---

### pagemd.preview.spreadGap

**Type:** `string` (CSS length)
**Default:** `"15mm"`

Vertical gap between page spreads in two-column book view.

```json
"pagemd.preview.spreadGap": "20mm"
```

---

### pagemd.preview.zoom

**Type:** `number`
**Default:** `100`
**Range:** `25` - `400`

Initial preview zoom level (percentage).

```json
"pagemd.preview.zoom": 75
```

---

### pagemd.preview.showDimensions

**Type:** `boolean`
**Default:** `true`

Show margin and page size dimensions when margin highlighting is enabled.

<!-- SCREENSHOT: dimension-labels.png - Page with dimension labels visible -->

```json
"pagemd.preview.showDimensions": true
```

---

### pagemd.preview.dimensionUnit

**Type:** `string`
**Default:** `"in"`
**Options:** `"in"`, `"mm"`

Preferred unit for dimension labels.

```json
"pagemd.preview.dimensionUnit": "mm"
```

---

## Preview: Appearance

### pagemd.preview.paperColor

**Type:** `string` (CSS color)
**Default:** `"#ffffff"`

Page background color.

```json
"pagemd.preview.paperColor": "#fffff0"
```

---

### pagemd.preview.backgroundColor

**Type:** `string` (CSS color)
**Default:** `"#777777"`

Background color outside pages (simulates desk/table surface).

```json
"pagemd.preview.backgroundColor": "#333333"
```

---

### pagemd.preview.highlightMargins

**Type:** `boolean`
**Default:** `true`

Show colored borders around page margin boxes for debugging layout.

<!-- SCREENSHOT: margin-highlighting.png - Cyan margin overlay -->

```json
"pagemd.preview.highlightMargins": true
```

---

### pagemd.preview.marginColor

**Type:** `string` (CSS color)
**Default:** `"#0ff"` (cyan)

Color for margin box highlighting.

```json
"pagemd.preview.marginColor": "#ff0000"
```

---

## Rendering

Settings that affect how the CLI renders documents. These map directly to CLI environment variables.

**Design principle:** All extension defaults match CLI defaults. When settings are at their defaults, no environment variables are passed, allowing frontmatter and profiles to take full control.

### pagemd.outputFormats

**Type:** `array`
**Default:** `["html", "pdf"]`
**Valid values:** `"html"`, `"pdf"`, `"png"`, `"jpeg"`

Default output formats for export commands. Multiple formats can be selected.

```json
"pagemd.outputFormats": ["pdf", "html"]
```

Use the **PageMD: Select Output Formats** command to temporarily override this setting for the current session.

---

### pagemd.syntaxHighlight

**Type:** `boolean`
**Default:** `true`

Enable syntax highlighting for code blocks using shiki.

```json
"pagemd.syntaxHighlight": true
```

Disable to reduce rendering time for documents without code blocks. Maps to `PAGEMD_SYNTAX_HIGHLIGHT` env var.

---

### pagemd.mermaidDiagrams

**Type:** `boolean`
**Default:** `true`

Enable Mermaid diagram rendering for ` ```mermaid ` code blocks.

```json
"pagemd.mermaidDiagrams": true
```

Disable if you don't use Mermaid diagrams or want faster rendering. Maps to `PAGEMD_MERMAID` env var.

---

### pagemd.logLevel

**Type:** `string`
**Default:** `"WARN"`
**Options:** `"TRACE"`, `"DEBUG"`, `"INFO"`, `"WARN"`, `"ERROR"`, `"FATAL"`, `"OFF"`

CLI logging verbosity level.

| Level | Description |
|-------|-------------|
| `TRACE` | Everything including internal details |
| `DEBUG` | Diagnostic information |
| `INFO` | General operational messages |
| `WARN` | Warnings (default) |
| `ERROR` | Errors only |
| `FATAL` | Critical failures only |
| `OFF` | No logging |

```json
"pagemd.logLevel": "DEBUG"
```

Maps to `PAGEMD_LOG_LEVEL` env var.

---

### pagemd.browserPath

**Type:** `string`
**Default:** `""` (auto-detect)

Custom path to Chrome or Chromium executable for PDF rendering.

```json
"pagemd.browserPath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
```

Leave empty to use automatic detection (recommended). Maps to `PAGEMD_BROWSER_PATH` env var.

---

### pagemd.keepBrowserAlive

**Type:** `boolean`
**Default:** `false`

Keep the browser instance alive between renders for faster repeated exports.

```json
"pagemd.keepBrowserAlive": true
```

**Note:** Enabling this uses more memory but significantly speeds up consecutive exports. Maps to `PAGEMD_KEEP_CHROME` env var.

---

## Export

### pagemd.jpegQuality

**Type:** `number`
**Default:** `90`
**Range:** `1` - `100`

JPEG quality for image exports.

```json
"pagemd.jpegQuality": 85
```

---

### pagemd.pdfTimeout

**Type:** `number` (milliseconds)
**Default:** `30000`
**Range:** `5000` - `300000`

PDF generation timeout (matches CLI default: 30 seconds). Increase for large or complex documents.

```json
"pagemd.pdfTimeout": 60000
```

---

### pagemd.pagedJsMode

**Type:** `string`
**Default:** `"browser"`
**Options:** `"browser"`, `"cli"`

Paged.js execution mode:

| Mode | Description |
|------|-------------|
| `browser` | Run Paged.js in browser (faster, default) |
| `cli` | Run Paged.js as CLI preprocessor |

```json
"pagemd.pagedJsMode": "cli"
```

---

### pagemd.headless

**Type:** `boolean`
**Default:** `true`

Run browser in headless mode. Disable for debugging browser rendering issues.

```json
"pagemd.headless": false
```

**Note:** Non-headless mode shows the browser window during rendering.

---

### pagemd.debugMode

**Type:** `boolean`
**Default:** `false`

Enable debug artifacts and verbose logging. When enabled:

- Debug artifacts are saved alongside outputs
- Verbose logging appears in Output panel
- Additional diagnostic information in preview

```json
"pagemd.debugMode": true
```

---

## Settings Summary Table

| Setting | Type | Default | Group |
|---------|------|---------|-------|
| `pagemd.defaultProfile` | string | `"standard_letter"` | General |
| `pagemd.cliPath` | string | `""` | General |
| `pagemd.outputPath` | string | `""` | General |
| `pagemd.showOutputPanelOn` | string | `"onError"` | General |
| `pagemd.autoRefreshPreview` | boolean | `true` | Preview |
| `pagemd.previewTrigger` | string | `"onSave"` | Preview |
| `pagemd.preview.emulatePageLayout` | boolean | `true` | Preview: Layout |
| `pagemd.preview.twoColumnSpread` | boolean | `false` | Preview: Layout |
| `pagemd.preview.firstPagePosition` | string | `"right"` | Preview: Layout |
| `pagemd.preview.pageGap` | string | `"5mm"` | Preview: Layout |
| `pagemd.preview.spreadGap` | string | `"15mm"` | Preview: Layout |
| `pagemd.preview.zoom` | number | `100` | Preview: Layout |
| `pagemd.preview.showDimensions` | boolean | `true` | Preview: Layout |
| `pagemd.preview.dimensionUnit` | string | `"in"` | Preview: Layout |
| `pagemd.preview.paperColor` | string | `"#ffffff"` | Preview: Appearance |
| `pagemd.preview.backgroundColor` | string | `"#777777"` | Preview: Appearance |
| `pagemd.preview.highlightMargins` | boolean | `true` | Preview: Appearance |
| `pagemd.preview.marginColor` | string | `"#0ff"` | Preview: Appearance |
| `pagemd.outputFormats` | array | `["html", "pdf"]` | Rendering |
| `pagemd.syntaxHighlight` | boolean | `true` | Rendering |
| `pagemd.mermaidDiagrams` | boolean | `true` | Rendering |
| `pagemd.logLevel` | string | `"WARN"` | Rendering |
| `pagemd.browserPath` | string | `""` | Rendering |
| `pagemd.keepBrowserAlive` | boolean | `false` | Rendering |
| `pagemd.jpegQuality` | number | `90` | Export |
| `pagemd.pdfTimeout` | number | `30000` | Export |
| `pagemd.pagedJsMode` | string | `"browser"` | Export |
| `pagemd.headless` | boolean | `true` | Export |
| `pagemd.debugMode` | boolean | `false` | Export |

---

## See Also

- [[Commands]] - Available commands
- [[Preview]] - Preview features guide
- [[Troubleshooting]] - Common issues
