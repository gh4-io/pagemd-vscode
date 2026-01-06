# Commands

Complete reference for all PageMD VS Code extension commands.

---

## Contents

- [Command Summary](#command-summary)
- [Export Commands](#export-commands)
- [Preview Commands](#preview-commands)
- [Profile Commands](#profile-commands)
- [Document Commands](#document-commands)
- [Session State Commands](#session-state-commands)
- [Menu Integration](#menu-integration)

---

## Command Summary

| Command | Title | Description |
|---------|-------|-------------|
| `pagemd.exportPdf` | Export to PDF | Quick PDF export |
| `pagemd.exportAs` | Export Document... | Export with format selection |
| `pagemd.openPreview` | Open Paged Preview | Open preview panel |
| `pagemd.selectProfile` | Select Profile | Switch rendering profile |
| `pagemd.validate` | Validate Document | Run validation checks |
| `pagemd.inspectDocument` | Inspect Document | Show resolved config |
| `pagemd.createDocument` | Create Document... | Create from template |
| `pagemd.selectFormats` | Select Output Formats | Pick formats for session |
| `pagemd.setOutputPath` | Set Output Path | Set output directory for session |
| `pagemd.resetSessionOverrides` | Reset Session Overrides | Clear all session state |

---

## Export Commands

### PageMD: Export to PDF

**Command ID:** `pagemd.exportPdf`
**Keyboard:** None (assign in Keyboard Shortcuts)

Quick export to PDF using current profile.

**Usage:**

1. Open a Markdown file
2. `Ctrl+Shift+P` → "PageMD: Export to PDF"

**Output:**

PDF saved in the same directory as the source file (or `outputPath` if configured).

**Filename pattern:**

```
{document_id} {title}.pdf
```

---

### PageMD: Export Document...

**Command ID:** `pagemd.exportAs`
**Keyboard:** None (assign in Keyboard Shortcuts)

Export with format selection dialog.

<!-- SCREENSHOT: export-dialog.png - Export format selection -->

**Usage:**

1. Open a Markdown file
2. `Ctrl+Shift+P` → "PageMD: Export Document..."
3. Select format(s): PDF, HTML, PNG, JPEG

**Supported formats:**

| Format | Extension | Notes |
|--------|-----------|-------|
| PDF | `.pdf` | Full paged output |
| HTML | `.html` | Rendered HTML with styles |
| PNG | `.png` | First page screenshot |
| JPEG | `.jpg` | First page screenshot |

---

## Preview Commands

### PageMD: Open Paged Preview

**Command ID:** `pagemd.openPreview`
**Keyboard:** None (assign in Keyboard Shortcuts)

Open the paged preview panel for the current document.

<!-- SCREENSHOT: preview-panel.png - Paged preview panel showing document -->

**Usage:**

1. Open a Markdown file
2. `Ctrl+Shift+P` → "PageMD: Open Paged Preview"

**Features:**

- Pagination via Paged.js
- Zoom controls (+/-, fit width, reset)
- Margin highlighting
- Dimension labels
- Auto-refresh on save/type

See [[Preview]] for detailed preview features.

---

## Profile Commands

### PageMD: Select Profile

**Command ID:** `pagemd.selectProfile`
**Keyboard:** None (assign in Keyboard Shortcuts)

Switch the rendering profile for the current session.

<!-- SCREENSHOT: profile-picker.png - Profile selection QuickPick -->

**Usage:**

1. `Ctrl+Shift+P` → "PageMD: Select Profile"
2. Select from available profiles

**Profile sources:**

- Workspace profiles (`.pagemd/profiles/`)
- Project profiles (`profiles/`)
- Built-in profiles (`standard_letter`, etc.)

**Note:** Profile selection persists for the session. To make permanent, add to frontmatter:

```yaml
---
pipeline_profile: technical_report
---
```

---

## Document Commands

### PageMD: Validate Document

**Command ID:** `pagemd.validate`
**Keyboard:** None (assign in Keyboard Shortcuts)

Run validation checks without rendering.

**Usage:**

1. Open a Markdown file
2. `Ctrl+Shift+P` → "PageMD: Validate Document"

**Validation checks:**

- Frontmatter schema validation
- Required fields (per profile)
- Path resolution
- Resource existence

**Output:**

- Editor diagnostics (squiggles)
- Problems panel entries
- Output panel messages

---

### PageMD: Inspect Document

**Command ID:** `pagemd.inspectDocument`
**Keyboard:** None (assign in Keyboard Shortcuts)

Show resolved configuration for the document.

**Usage:**

1. Open a Markdown file
2. `Ctrl+Shift+P` → "PageMD: Inspect Document"

**Displayed information:**

- Active profile
- Resolved metadata
- Loaded resources (templates, styles, layouts)
- Output configuration
- Path resolution results

---

### PageMD: Create Document...

**Command ID:** `pagemd.createDocument`
**Keyboard:** None (assign in Keyboard Shortcuts)

Create a new document from a template.

**Usage:**

1. `Ctrl+Shift+P` → "PageMD: Create Document..."
2. Select template type: Document, Profile, or Project

**Template types:**

| Type | Creates |
|------|---------|
| Document | Markdown file with frontmatter |
| Profile | JSON profile manifest |
| Project | Folder structure with defaults |

---

## Session State Commands

Commands for managing temporary session overrides. These affect the current VS Code session only and do not modify persistent settings.

### PageMD: Select Output Formats

**Command ID:** `pagemd.selectFormats`
**Keyboard:** None (assign in Keyboard Shortcuts)

Open a multi-select picker to choose output formats for the session.

**Usage:**

1. `Ctrl+Shift+P` → "PageMD: Select Output Formats"
2. Select one or more formats (multi-select enabled)
3. Confirm selection

**Available formats:**

| Format | Description |
|--------|-------------|
| PDF | Print-ready document |
| HTML | Standalone web page |
| PNG | Raster image (lossless) |
| JPEG | Raster image (compressed) |

**Behavior:**

- Overrides `pagemd.outputFormats` setting for current session
- Status bar shows format indicator when session override is active (e.g., `standard_letter | PDF,HTML`)
- Use **Reset Session Overrides** to clear

---

### PageMD: Set Output Path

**Command ID:** `pagemd.setOutputPath`
**Keyboard:** None (assign in Keyboard Shortcuts)

Set a custom output directory for the current session.

**Usage:**

1. `Ctrl+Shift+P` → "PageMD: Set Output Path"
2. Enter directory path (absolute or relative to workspace)
3. Leave empty to use source file directory

**Behavior:**

- Overrides `pagemd.outputPath` setting for current session
- Relative paths resolve from workspace root
- Use **Reset Session Overrides** to clear

---

### PageMD: Reset Session Overrides

**Command ID:** `pagemd.resetSessionOverrides`
**Keyboard:** None (assign in Keyboard Shortcuts)

Clear all session state and revert to settings defaults.

**Usage:**

1. `Ctrl+Shift+P` → "PageMD: Reset Session Overrides"

**What gets reset:**

| State | Reverts To |
|-------|------------|
| Profile selection | `pagemd.defaultProfile` setting |
| Output formats | `pagemd.outputFormats` setting |
| Output path | `pagemd.outputPath` setting |

**Note:** This does NOT modify your persistent settings (settings.json). It only clears temporary session overrides stored in workspace state.

---

## Menu Integration

Commands are also available in context menus.

### Editor Title Bar

For Markdown files, these appear in the editor title bar:

- **Open Paged Preview** (eye icon)
- **Export Document...** (export icon)

### Explorer Context Menu

Right-click a Markdown file in Explorer:

- **Export Document...** → Export with format selection

---

## Keyboard Shortcuts

No default shortcuts are assigned. To add shortcuts:

1. `Ctrl+Shift+P` → "Preferences: Open Keyboard Shortcuts"
2. Search "pagemd"
3. Click the + icon to add a shortcut

**Suggested shortcuts:**

| Command | Suggested Shortcut |
|---------|-------------------|
| Export to PDF | `Ctrl+Shift+E` |
| Open Paged Preview | `Ctrl+Shift+V` |
| Select Profile | `Ctrl+Shift+R` |

---

## See Also

- [[Preview]] - Preview features guide
- [[Settings]] - Extension settings
- [[Appendix#keyboard-shortcuts]] - Full shortcut reference
