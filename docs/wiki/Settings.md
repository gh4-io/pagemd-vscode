# Settings

Complete reference for all PageMD VS Code extension settings.

---

## Contents

- [General](#general)
- [Preview](#preview)
- [Preview: Layout](#preview-layout)
- [Preview: Appearance](#preview-appearance)
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
**Default:** `60000`
**Range:** `5000` - `300000`

PDF generation timeout. Increase for large or complex documents.

```json
"pagemd.pdfTimeout": 120000
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
| `pagemd.jpegQuality` | number | `90` | Export |
| `pagemd.pdfTimeout` | number | `60000` | Export |
| `pagemd.pagedJsMode` | string | `"browser"` | Export |
| `pagemd.headless` | boolean | `true` | Export |
| `pagemd.debugMode` | boolean | `false` | Export |

---

## See Also

- [[Commands]] - Available commands
- [[Preview]] - Preview features guide
- [[Troubleshooting]] - Common issues
