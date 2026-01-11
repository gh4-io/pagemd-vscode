# Preview

Guide to using the paged preview panel.

---

## Contents

- [Opening the Preview](#opening-the-preview)
- [Understanding the Preview](#understanding-the-preview)
- [Toolbar Controls](#toolbar-controls)
- [View Modes](#view-modes)
- [Visual Features](#visual-features)
- [Unsaved Document Preview](#unsaved-document-preview)
- [Refresh Behavior](#refresh-behavior)
- [Theme Integration](#theme-integration)
- [Advanced Features](#advanced-features)

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

### How the Preview Works

The preview uses a multi-step process:

1. **Build HTML** - Extension calls CLI to generate HTML from your Markdown
2. **Inject Paged.js** - Wraps HTML with Paged.js runtime for pagination
3. **Render Pages** - Paged.js applies CSS and creates individual pages
4. **Add Features** - Extension adds toolbar, dimension labels, and zoom controls

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

## Toolbar Controls

The floating toolbar provides quick access to preview features:

<!-- SCREENSHOT: zoom-controls.png - Toolbar with all buttons -->

### Zoom Controls

| Button | Action | Keyboard |
|--------|--------|----------|
| **−** | Zoom out (25% steps) | `Ctrl+-` |
| **+** | Zoom in (25% steps) | `Ctrl+=` |
| **100%** | Click zoom level to manually enter percentage | - |
| **Fit** | Fit page width (enables auto-fit on resize) | - |
| **100%** button | Reset to 100% | `Ctrl+0` |

**Zoom range:** 25% to 400%

**Click to edit:** Click the zoom percentage to type a custom value (15-400%).

**Auto-fit mode:** After clicking "Fit", the preview automatically re-fits when you resize the panel. Manual zoom (using +/− or entering a value) disables auto-fit.

### View Mode Controls

| Button | Action | Keyboard |
|--------|--------|----------|
| **✋** (Hand) | Toggle hand tool for panning | `H` |
| **📖** (Book) | Toggle two-column book spread | - |
| **🌐** (Globe) | Toggle between paged and browser view | - |
| **📄** (Paged.js) | Toggle Paged.js pagination in browser view | - |

**Paged.js Toggle (Browser View Only):**

- Only appears when in browser view mode (🌐 active)
- Default: Off (raw HTML without pagination)
- When enabled: Applies Paged.js pagination in continuous scroll
- Visual feedback: Button shows active state (highlighted) when pagination is enabled
- Use case: Compare paginated vs. unpaginated rendering in same view

---

## View Modes

### Paged View (Default)

Shows your document paginated with Paged.js:

- Page breaks follow CSS @page rules
- Margin boxes visible (headers/footers)
- Simulates PDF output exactly

### Browser View

Shows your document as continuous HTML (no pagination by default):

- Useful for comparing paged vs. unpaginated rendering
- Faster for quick content checks (no Paged.js processing by default)
- Toggle with globe button (🌐)
- Optional Paged.js toggle button (only visible in browser view)

**Security (CSP Sandboxing):**

Browser view uses Content Security Policy to protect against malicious content:

- **Allowed:** Inline styles, images from `self`/`blob:`/`data:`/`https:`, fonts
- **Blocked:** External scripts (`script-src 'none'`)
- **Safe for:** Untrusted markdown, external content, collaborative editing

**Performance:**

- Default (Paged.js off): Instant rendering, no pagination overhead
- With Paged.js enabled: Same pagination as paged view, but in continuous scroll
- Persistent blob URLs enable fast mode switching (paged ↔ browser)

### Book Spread View

Shows pages side-by-side like an open book:

- Enable with book button (📖)
- First page position: left or right (configurable)
- Useful for checking facing pages together

**Settings:**

```json
"pagemd.preview.twoColumnSpread": false,  // Enable book spread by default
"pagemd.preview.firstPagePosition": "right"  // "left" or "right"
```

**Note:** Book toggle button only works in paged view mode. Switching to browser view disables it.

---

## Hand Tool

The hand tool lets you pan the preview by clicking and dragging.

### Using the Hand Tool

1. **Activate:** Click the hand button (✋) or press `H`
2. **Pan:** Click and drag anywhere in the preview
3. **Deactivate:** Click the hand button again or press `H`

**Cursor states:**

- **Inactive:** Normal pointer cursor
- **Active (ready):** Open hand cursor (grab)
- **Active (dragging):** Closed hand cursor (grabbing)

**Notes:**

- Hand tool works at any zoom level
- Especially useful at high zoom (200%+) for navigating large pages
- Click toolbar buttons works normally even with hand tool active

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

Displays margin and page size measurements around each page.

<!-- SCREENSHOT: dimension-labels.png - Page with dimension labels visible -->

**What it shows:**

- **Top:** Page width
- **Left:** Page height and left margin
- **Right:** Right margin
- **Bottom:** Top and bottom margins
- **Info panel:** Page name, size, orientation, and padding

**Example output:**

```
         8.5in
           ↓
    ┌──────────────┐
11in│              │ margin: 0.5in
    └──────────────┘
    top: 1in | bottom: 1in
    @page | Letter | portrait
```

**Enable/disable:**

```json
"pagemd.preview.showDimensions": true
```

**Change units:**

```json
"pagemd.preview.dimensionUnit": "mm"  // or "in"
```

**Note:** Dimension labels only appear when `highlightMargins` is also enabled.

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

**What it does:**

- Sets page background to `paperColor` (simulates paper)
- Sets outer background to `backgroundColor` (simulates desk/table)
- Adds padding around pages for visual separation

---

### Page Gaps and Spacing

Controls spacing between pages in the preview.

**Page gap** (vertical spacing between pages):

```json
"pagemd.preview.pageGap": "5mm"
```

**Spread gap** (vertical spacing between spreads in book view):

```json
"pagemd.preview.spreadGap": "15mm"
```

**CSS variables** (used internally):

- `--pagemd-page-gap` - Vertical/horizontal gap between pages
- `--pagemd-spread-gap` - Row gap in book spread mode

---

## Unsaved Document Preview

The preview panel supports unsaved documents, including:

- **Untitled documents** - New files created with `Ctrl+N`
- **Modified documents** - Files with unsaved changes (dirty state)

### How It Works

When previewing an unsaved document:

1. Extension detects document is untitled or dirty
2. Document content is piped to CLI via stdin (no file save required)
3. HTML is returned via stdout and rendered directly
4. No temporary files created on disk

### Working Directory

- **Saved files:** Uses the file's directory
- **Untitled files:** Uses workspace folder, or home directory if no workspace

### Path Resolution for Unsaved Documents

Relative paths in frontmatter (e.g., `styles: ["./custom.css"]`) resolve from:

- **Workspace folder** if one is open
- **Home directory** otherwise

If a relative path cannot be resolved, the build will fail with an error.

### Tips

- Save the file first if you need relative paths from a specific location
- Use absolute paths or profile-defined styles for untitled documents
- Check the Output panel for path resolution details

---

## Refresh Behavior

Control when the preview refreshes with the `pagemd.previewRefresh` setting:

| Mode | Behavior | Use Case |
|------|----------|----------|
| `manual` | Only refresh via command | Full control, minimal resources (default) |
| `onSave` | Refresh when file is saved | Balanced - see changes after save |
| `live` | Refresh as you type (500ms debounce) | Real-time feedback while editing |

```json
"pagemd.previewRefresh": "live"
```

### Live Mode

Live mode uses stdin to pipe document content directly to the CLI:

- **No disk I/O** - Changes preview without saving file
- **Preserves dirty state** - Undo/redo history unaffected
- **True live preview** - See changes as you type

### Manual Refresh

To manually refresh the preview (works in all modes):

- **More Actions menu (⋮)** on the preview tab → "Refresh Preview"
- **Right-click** inside the preview → "Refresh Preview"
- **Command Palette:** `Ctrl+Shift+P` → "Refresh Preview"

**Note:** Menu entries only appear when the preview panel is active.

### Opening DevTools

To debug preview rendering, open the webview developer tools:

- **More Actions menu (⋮)** on the preview tab → "Open DevTools"
- **Right-click** inside the preview → "Open DevTools"
- **Command Palette:** `Ctrl+Shift+P` → "Open DevTools"

DevTools provides access to:

- **Elements tab** - Inspect rendered HTML and Paged.js structure
- **Console tab** - View Paged.js logs, errors, and warnings
- **Styles tab** - Debug CSS, inspect computed styles

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

## Advanced Features

### CSS Variables Reference

The preview injects these CSS variables for customization:

| Variable | Purpose | Source |
|----------|---------|--------|
| `--pagemd-zoom` | Current zoom level (decimal) | `pagemd.preview.zoom / 100` |
| `--pagemd-page-gap` | Gap between pages | `pagemd.preview.pageGap` |
| `--pagemd-spread-gap` | Gap between spreads | `pagemd.preview.spreadGap` |
| `--pagemd-bg-color` | Background color | `pagemd.preview.backgroundColor` |
| `--pagemd-paper-color` | Page background | `pagemd.preview.paperColor` |
| `--pagemd-margin-color` | Margin highlight color | `pagemd.preview.marginColor` |
| `--pagemd-font-color` | Default text color | `#000` (fixed) |

### Default Values

| Setting | Default | Range |
|---------|---------|-------|
| `pagemd.preview.zoom` | `100` | 25-400 |
| `pagemd.preview.pageGap` | `"5mm"` | Any CSS length |
| `pagemd.preview.spreadGap` | `"15mm"` | Any CSS length |
| `pagemd.preview.backgroundColor` | `"#777777"` | Any CSS color |
| `pagemd.preview.paperColor` | `"#ffffff"` | Any CSS color |
| `pagemd.preview.marginColor` | `"#0ff"` | Any CSS color |
| `pagemd.preview.highlightMargins` | `true` | Boolean |
| `pagemd.preview.showDimensions` | `true` | Boolean |
| `pagemd.preview.dimensionUnit` | `"in"` | `"in"` or `"mm"` |
| `pagemd.preview.emulatePageLayout` | `true` | Boolean |
| `pagemd.preview.twoColumnSpread` | `false` | Boolean |
| `pagemd.preview.firstPagePosition` | `"right"` | `"left"` or `"right"` |

### Changing Defaults in Code

Defaults are defined in:

- **Extension:** `project/pagemd-vscode/package.json` (under `contributes.configuration`)
- **Preview panel:** `project/pagemd-vscode/src/providers/preview-panel.ts` (line 445+)
- **Settings read:** `getPreviewStyles()` method (line 445)

To change a default:

1. Edit `package.json` → `contributes.configuration` → find setting
2. Change `"default"` value
3. Rebuild extension: `npm run package`

**Example:** Change default page gap to 10mm:

```json
"pagemd.preview.pageGap": {
  "type": "string",
  "default": "10mm",  // Changed from "5mm"
  "description": "Gap between pages in preview"
}
```

---

## Performance Tips

### For Large Documents

1. Use `onSave` instead of `onType` refresh
2. Increase timeout if rendering is slow:
   ```json
   "pagemd.pdfTimeout": 120000
   ```
3. Use browser view without Paged.js for fastest content checks

### For Complex Layouts

1. Enable debug mode to see render diagnostics:
   ```json
   "pagemd.debugMode": true
   ```
2. Check Output panel for timing information

### Fast Mode Switching

Browser view uses persistent blob URLs for fast mode switching:

- Paged ↔ Browser: Instant (content already cached)
- Paged.js toggle in browser view: Fast (content reused)
- No re-rendering needed when switching between modes

### Toolbar Position

The toolbar is positioned via JavaScript (not CSS fixed positioning) because Paged.js uses CSS transforms that break `position: fixed`.

- Updates on scroll and resize events
- Positioned at bottom-right of viewport
- 20px margin from edges

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

### Hand Tool Not Working

1. Verify you're clicking outside the toolbar area
2. Check that you're not in an input field when pressing `H`
3. Try clicking the hand button instead of keyboard shortcut

### Zoom Not Working in Book Spread

1. Book spread uses CSS Grid layout
2. `safe center` alignment allows scrolling at high zoom
3. Try "Fit" button to recalculate for current view

---

## See Also

- [[Settings#preview-visual]] - Preview visual settings
- [[Commands#pagemd-open-paged-preview]] - Preview command
- [[Troubleshooting]] - Common issues
- [[Preview-Architecture]] - Technical architecture details
