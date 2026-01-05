# Preview

Guide to using the paged preview panel.

---

## Contents

- [Opening the Preview](#opening-the-preview)
- [Understanding the Preview](#understanding-the-preview)
- [Zoom Controls](#zoom-controls)
- [Visual Features](#visual-features)
- [Refresh Behavior](#refresh-behavior)
- [Theme Integration](#theme-integration)

---

## Opening the Preview

### Command Palette

1. Open a Markdown file
2. `Ctrl+Shift+P` → "PageMD: Open Paged Preview"

### Editor Title Bar

Click the preview icon in the editor title bar (appears for Markdown files).

### Result

A new panel opens beside your editor showing the rendered document.

<!-- SCREENSHOT: preview-panel.png - Paged preview panel showing document -->

---

## Understanding the Preview

The preview shows your document rendered with:

- **Paged.js pagination** - Real page breaks as they'll appear in PDF
- **CSS paged-media** - @page rules, margin boxes, page numbers
- **Profile styling** - Templates, layouts, and CSS from the active profile

### Page Structure

```
┌─────────────────────────────────────┐
│          @top-center               │  ← Header margin box
├─────────────────────────────────────┤
│                                     │
│         Content area                │
│                                     │
├─────────────────────────────────────┤
│          @bottom-center             │  ← Footer margin box
└─────────────────────────────────────┘
```

---

## Zoom Controls

<!-- SCREENSHOT: zoom-controls.png - Toolbar with zoom buttons -->

### Toolbar Buttons

| Button | Action | Keyboard |
|--------|--------|----------|
| **−** | Zoom out | `Ctrl+-` |
| **+** | Zoom in | `Ctrl+=` |
| **100%** | Reset to 100% | `Ctrl+0` |
| **Fit** | Fit page width | `Ctrl+1` |

### Zoom Range

- Minimum: 25%
- Maximum: 400%
- Default: 100% (or `pagemd.preview.zoom` setting)

### Mouse Zoom

- `Ctrl+Scroll` - Zoom in/out

---

## Visual Features

### Margin Highlighting

Shows colored borders around page margin boxes.

<!-- SCREENSHOT: margin-highlighting.png - Cyan margin overlay -->

**Enable/disable:**

```json
"pagemd.preview.highlightMargins": true
```

**Change color:**

```json
"pagemd.preview.marginColor": "#0ff"
```

---

### Dimension Labels

Displays margin and page size measurements.

<!-- SCREENSHOT: dimension-labels.png - Page with dimension labels visible -->

**Enable/disable:**

```json
"pagemd.preview.showDimensions": true
```

**Change units:**

```json
"pagemd.preview.dimensionUnit": "mm"  // or "in"
```

---

### Page Layout Emulation

Shows white pages on a gray background for print-accurate preview.

**Enable/disable:**

```json
"pagemd.preview.emulatePageLayout": true
```

**Customize colors:**

```json
"pagemd.preview.paperColor": "#ffffff",
"pagemd.preview.backgroundColor": "#777777"
```

---

### Two-Column Spread

Shows pages side-by-side like an open book.

<!-- SCREENSHOT: two-column-spread.png - Book-style spread view -->

**Enable/disable:**

```json
"pagemd.preview.twoColumnSpread": true
```

---

### Page Gap

Controls spacing between pages.

```json
"pagemd.preview.pageGap": "5mm"
```

---

## Refresh Behavior

### Auto-Refresh

When `autoRefreshPreview` is enabled (default), the preview updates automatically.

**Trigger modes:**

| Mode | Behavior | Setting |
|------|----------|---------|
| `onSave` | Refresh when file is saved | Default |
| `onType` | Refresh as you type (debounced) | More responsive |

```json
"pagemd.autoRefreshPreview": true,
"pagemd.previewTrigger": "onSave"
```

### Manual Refresh

If auto-refresh is disabled, re-run the preview command to refresh.

---

## Theme Integration

The preview respects VS Code's current theme:

| Theme | Behavior |
|-------|----------|
| Light | Standard rendering |
| Dark | Standard rendering |
| High Contrast | High contrast mode support |

**Note:** The preview renders with your profile's CSS, which may override theme colors for document content.

---

## Performance Tips

### For Large Documents

1. Use `onSave` instead of `onType` refresh
2. Increase timeout if rendering is slow:
   ```json
   "pagemd.pdfTimeout": 120000
   ```

### For Complex Layouts

1. Enable debug mode to see render diagnostics:
   ```json
   "pagemd.debugMode": true
   ```
2. Check Output panel for timing information

---

## Troubleshooting Preview

### Preview is Blank

1. Check Output panel for errors
2. Verify CLI is found (see [[Troubleshooting#cli-resolution]])
3. Try refreshing with debug mode enabled

### Preview is Slow

1. Large documents take longer to paginate
2. Complex CSS can slow rendering
3. Consider `onSave` instead of `onType` refresh

### Margins Not Visible

1. Enable `highlightMargins` setting
2. Check if profile CSS overrides margin boxes
3. Verify page has defined margins in CSS

---

## See Also

- [[Settings#preview-visual]] - Preview visual settings
- [[Commands#pagemd-open-paged-preview]] - Preview command
- [[Troubleshooting]] - Common issues
