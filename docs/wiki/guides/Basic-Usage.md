# Basic Usage

Quick guide to using the PageMD extension for common tasks.

---

## Contents

- [Exporting Documents](#exporting-documents)
- [Using Preview](#using-preview)
- [Selecting Profiles](#selecting-profiles)
- [Validating Documents](#validating-documents)
- [Creating Documents](#creating-documents)

---

## Exporting Documents

### Export to PDF

1. Open a Markdown file
2. `Ctrl+Shift+P` → "PageMD: Export to PDF"
3. PDF created in output directory

**Default output location:** Same directory as source file

**Change output directory:** Set `pagemd.outputDir` in settings

### Export to Other Formats

1. Open a Markdown file
2. `Ctrl+Shift+P` → "PageMD: Export Document..."
3. Select format: PDF, HTML, PNG, or JPEG
4. File created in output directory

---

## Using Preview

### Open Preview

1. Open a Markdown file
2. `Ctrl+Shift+P` → "PageMD: Open Paged Preview"
3. Preview panel opens showing paginated document

### Preview Controls

| Control | Function |
|---------|----------|
| `+` | Zoom in |
| `−` | Zoom out |
| `Fit` | Fit to width |
| Number | Current zoom level |

### Preview Options

Toggle via toolbar buttons:

- **Margins** - Show/hide cyan margin overlays
- **Dimensions** - Show/hide size labels
- **Two-column** - Book-style spread view

### Live Updates

Preview automatically refreshes when you save the file.

---

## Selecting Profiles

### Change Profile

1. `Ctrl+Shift+P` → "PageMD: Select Profile"
2. Choose from available profiles
3. Profile applied to next export/preview

### Available Profiles

Default profiles included:

- `standard_letter` - US Letter (8.5" × 11")
- `standard_a4` - A4 (210mm × 297mm)
- `technical_manual` - Technical documentation style
- `report_formal` - Formal report style
- `minimal_clean` - Minimal styling

See [[../../pagemd/docs/wiki/guides/Profiles|PageMD CLI: Profiles]] for profile details.

---

## Validating Documents

### Run Validation

1. Open a Markdown file
2. `Ctrl+Shift+P` → "PageMD: Validate Document"
3. Errors appear in Problems panel

### What Gets Validated

- Frontmatter syntax
- Profile existence
- Resource paths
- Schema compliance

### Fix Validation Errors

1. Open Problems panel (`Ctrl+Shift+M`)
2. Click error to jump to line
3. Fix issue
4. Re-validate

---

## Creating Documents

### Create New Document

1. `Ctrl+Shift+P` → "PageMD: Create Document..."
2. Select document type
3. Choose profile
4. New file created with template

### Document Types

- **Basic Document** - Minimal frontmatter
- **Report** - Formal report structure
- **Manual** - Technical manual template

---

## See Also

- [[Installation|Installation]] - Setup and configuration
- [[Preview|Preview]] - Detailed preview guide
- [[reference/Commands|Commands]] - All available commands
- [PageMD CLI: Basic Usage](../../pagemd/docs/wiki/guides/Basic-Usage.md)
