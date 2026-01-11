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
**Default:** `""` (blank)

Extension-level default profile. Only used when the markdown file doesn't specify a `profile:` field in its frontmatter.

**Profile Selection Hierarchy:**
1. **Frontmatter** `profile:` field (highest priority - document author's choice)
2. **Environment variable** `PAGEMD_PROFILE`
3. **This setting** (extension fallback)
4. **Built-in default** `standard_letter` (when all above are blank)

**Leave blank** (recommended) to respect frontmatter profiles and let the CLI use its default.

**Example:** Set an extension-wide default that applies to all documents without frontmatter profiles:

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

### pagemd.previewRefresh

**Type:** `string`
**Default:** `"manual"`
**Options:** `"manual"`, `"onSave"`, `"live"`

When to refresh the preview:

| Value | Behavior |
|-------|----------|
| `manual` | Only refresh via Refresh Preview command |
| `onSave` | Refresh when file is saved |
| `live` | Refresh as you type (debounced, no disk I/O) |

```json
"pagemd.previewRefresh": "live"
```

**Live mode** uses stdin to pipe document content directly to the CLI, enabling true live preview without saving the file to disk. This preserves your undo history and dirty state.

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
**Default:** `"5mm"` (when empty)

Vertical gap between page rows. Applies in both single-page and book spread modes.

```json
"pagemd.preview.pageGap": "10mm"
```

Leave empty to use the default (5mm).

---

### pagemd.preview.spreadGap

**Type:** `string` (CSS length)
**Default:** `"5mm"` (when empty)

Horizontal gap between left and right pages in book spread mode. Has no effect in single-page mode.

```json
"pagemd.preview.spreadGap": "8mm"
```

Leave empty to use the default (5mm).

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

### pagemd.preview.debugLevel

**Type:** `string`
**Default:** `""` (no debug)
**Options:** `""`, `"basic"`, `"layout"`, `"context"`, `"combined"`, `"full"`

Preview panel debug visualization level. Shows colored overlays on layout containers to help debug spacing and alignment issues.

| Level | Visual Elements |
|-------|-----------------|
| `""` | No debug visuals (default) |
| `basic` | Container outlines, page gaps, spread gaps |
| `layout` | Basic + margins, bleeds, content area, footnote area, headers/footers |
| `context` | Semantic elements (article, section, aside, figure, blockquote, nav, header, footer) with labeled boxes |
| `combined` | Layout + Context |
| `full` | All debug visualizations |

```json
"pagemd.preview.debugLevel": "basic"
```

**Color Legend (Basic tier):**

| Container | Color | Purpose |
|-----------|-------|---------|
| `.pagemd-content` | Red tint + dashed outline | Content wrapper |
| `.pagedjs_pages` | Green tint + dashed outline | Pages container |
| `.pagemd-page-wrapper` | Blue tint + dashed outline | Page wrapper |
| `.pagedjs_page` | Orange tint + dashed outline | Individual page |
| Page gaps | Green stripes | Vertical space between rows |
| Spread gaps | Purple stripes | Horizontal space in book spread |

**Color Legend (Context tier):**

| Element | Color | Border Style | Label Position |
|---------|-------|--------------|----------------|
| `<article>` | Cyan | 3px Solid | Top-right |
| `<section>` | Lime | 2px Dashed | Top-left (staggered) |
| `<aside>` | Yellow | 2px Dotted | Top-right |
| `<figure>` | Pink | 2px Solid | Top-left (staggered) |
| `<blockquote>` | Orange | 2px Dashed | Top-left (staggered) |
| `<nav>` | Violet | 2px Solid | Top-left |
| `<header>` | Teal | 2px Dotted | Top-left |
| `<footer>` | Coral | 2px Dotted | Bottom-left |
| `<div>` (in article) | Silver | 1px Dashed | Top-left (staggered) |

**Features:**
- No background fill/tint - borders only for clarity
- Top-level `<article>` label positioned top-right
- Nested elements have staggered labels (100px increments left-to-right)
- Supports up to 4 levels of nesting for sections, blockquotes, and divs

A legend appears in the bottom-left corner showing the active tier.

<!-- SCREENSHOT: debug-visualization.png - Preview with debug colors enabled -->

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

### pagemd.previewTimeout

**Type:** `number` (milliseconds)
**Default:** `30000`
**Range:** `5000` - `300000`

Preview generation timeout. Controls how long the preview panel waits for CLI to generate HTML before timing out. Increase for large or complex documents with many pages.

```json
"pagemd.previewTimeout": 60000
```

**Note:** This is separate from `pagemd.pdfTimeout` which only affects PDF export operations.

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

Run browser in headless mode. When disabled, the browser window stays visible after rendering completes, allowing you to inspect the rendered output with DevTools.

```json
"pagemd.headless": false
```

**Behavior (non-headless mode):**
- PDF/HTML renders normally
- **Tab stays open** for inspection (use DevTools F12)
- **Browser window remains** as an orphaned process
- **CLI process exits cleanly** (no timeout)
- Console message: `📋 Browser left open for inspection. Close it manually when done.`

**When to use:**
- Debugging CSS layout issues
- Inspecting Paged.js output
- Checking margin/page-break behavior
- Diagnosing rendering problems

**Close browser manually** when done - it won't close automatically.

Maps to `PAGEMD_HEADLESS` environment variable.

---

### pagemd.cliLogLevel

**Type:** `string`
**Default:** `""` (disabled)
**Options:** `""`, `"FATAL"`, `"ERROR"`, `"WARN"`, `"INFO"`, `"DEBUG"`, `"TRACE"`

CLI subprocess logging level. Controls CLI output visibility in the PageMD output channel.

**This setting controls two things:**

1. **Build output visibility** - Whether CLI build progress appears in the output channel
2. **Build output format** - Compact summary vs full debug report

| Level | Build Output | Description |
|-------|--------------|-------------|
| `""` (empty) | Hidden | No CLI output (default, cleanest) |
| `FATAL`-`INFO` | Compact | `timestamp [PageMD-CLI] Processing: filename.md` with summary |
| `DEBUG`-`TRACE` | Full report | Compact header + Loaded Resources + Directory Context |

**Compact output format (WARN recommended for clean output):**
```
2026-01-11 13:57:38.440 [PageMD-CLI] Processing: 01-basic-document.md
	✓ Success: 1 outputs created
2026-01-11 13:57:38.682 [PageMD-CLI] Build Summary:
	Total files: 1
	Successful: 1
	Failed: 0
	Total outputs: 1
	Duration: 0.25s
```

**DEBUG output format:**
```
2026-01-11 13:57:38.440 [PageMD-CLI] Processing: 01-basic-document.md
	✓ Success: 1 outputs created
2026-01-11 13:57:38.682 [PageMD-CLI] Build Summary:
======================================================================
  DEBUG MODE ACTIVE
======================================================================

Build Summary:
  Total files: 1
  ...

Loaded Resources:
  Styles (merge order):
     [base] styles/base.css
     ...
----------------------------------------------------------------------
```

**Recommendation:**
- **For everyday use:** Leave empty `""` (no CLI output, only extension messages)
- **For clean CLI output:** Set to `"WARN"` (shows build progress without internal diagnostics)
- **For debugging:** Set to `"DEBUG"` (shows full resource loading report)

```json
"pagemd.cliLogLevel": "WARN"
```

Maps to `PAGEMD_LOG_LEVEL` environment variable passed to CLI.

---

### pagemd.extensionLogLevel

**Type:** `string`
**Default:** `"INFO"`
**Options:** `""`, `"FATAL"`, `"ERROR"`, `"WARN"`, `"INFO"`, `"DEBUG"`, `"TRACE"`

Extension internal logging level. Controls extension diagnostic messages in the PageMD output channel.

| Level | Description |
|-------|-------------|
| `""` | Disabled (no extension logs) |
| `FATAL` | Only fatal errors |
| `ERROR` | Errors and fatal |
| `WARN` | Warnings and above |
| `INFO` | Informational messages (default) |
| `DEBUG` | Detailed debug info |
| `TRACE` | All trace logs |

**Extension messages look like:**
```
2026-01-11 13:02:17.348 [PageMD-Ext] Preview refresh mode: manual
2026-01-11 13:02:17.348 [PageMD-Ext] Refreshing preview: document.md
2026-01-11 13:02:21.654 [PageMD-Ext] Preview rendered: 23 pages
```

```json
"pagemd.extensionLogLevel": "DEBUG"
```

---

## Settings Summary Table

| Setting | Type | Default | Group |
|---------|------|---------|-------|
| `pagemd.defaultProfile` | string | `""` | General |
| `pagemd.cliPath` | string | `""` | General |
| `pagemd.outputPath` | string | `""` | General |
| `pagemd.showOutputPanelOn` | string | `"onError"` | General |
| `pagemd.previewRefresh` | string | `"manual"` | Preview |
| `pagemd.preview.emulatePageLayout` | boolean | `true` | Preview: Layout |
| `pagemd.preview.twoColumnSpread` | boolean | `false` | Preview: Layout |
| `pagemd.preview.firstPagePosition` | string | `"right"` | Preview: Layout |
| `pagemd.preview.pageGap` | string | `""` (5mm) | Preview: Layout |
| `pagemd.preview.spreadGap` | string | `""` (5mm) | Preview: Layout |
| `pagemd.preview.zoom` | number | `100` | Preview: Layout |
| `pagemd.preview.showDimensions` | boolean | `true` | Preview: Layout |
| `pagemd.preview.dimensionUnit` | string | `"in"` | Preview: Layout |
| `pagemd.preview.paperColor` | string | `"#ffffff"` | Preview: Appearance |
| `pagemd.preview.backgroundColor` | string | `"#777777"` | Preview: Appearance |
| `pagemd.preview.highlightMargins` | boolean | `true` | Preview: Appearance |
| `pagemd.preview.marginColor` | string | `"#0ff"` | Preview: Appearance |
| `pagemd.preview.debugLevel` | string | `""` | Preview: Appearance |
| `pagemd.outputFormats` | array | `["html", "pdf"]` | Rendering |
| `pagemd.syntaxHighlight` | boolean | `true` | Rendering |
| `pagemd.mermaidDiagrams` | boolean | `true` | Rendering |
| `pagemd.browserPath` | string | `""` | Rendering |
| `pagemd.keepBrowserAlive` | boolean | `false` | Rendering |
| `pagemd.jpegQuality` | number | `90` | Export |
| `pagemd.pdfTimeout` | number | `30000` | Export |
| `pagemd.previewTimeout` | number | `30000` | Preview |
| `pagemd.pagedJsMode` | string | `"browser"` | Export |
| `pagemd.headless` | boolean | `true` | Export |
| `pagemd.cliDebugLevel` | string | `""` | Export |

---

## See Also

- [[Commands]] - Available commands
- [[Preview]] - Preview features guide
- [[Troubleshooting]] - Common issues
