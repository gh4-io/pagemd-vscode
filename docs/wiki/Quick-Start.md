# Quick Start

Get from zero to PDF in 5 minutes.

---

## Contents

- [Prerequisites](#prerequisites)
- [Step 1: Install the Extension](#step-1-install-the-extension)
- [Step 2: Open a Markdown File](#step-2-open-a-markdown-file)
- [Step 3: Open Paged Preview](#step-3-open-paged-preview)
- [Step 4: Export to PDF](#step-4-export-to-pdf)
- [Next Steps](#next-steps)

---

## Prerequisites

- VS Code 1.85.0 or later
- Node.js 20+ installed

---

## Step 1: Install the Extension

**Option A: VS Code Marketplace**

1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions panel)
3. Search for "PageMD"
4. Click **Install**

**Option B: VSIX File**

1. Download the `.vsix` file from [Releases](https://github.com/gh4-io/pagemd-vscode/releases)
2. In VS Code, press `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Select the downloaded file

**Verification:**

Open Command Palette (`Ctrl+Shift+P`) and type "PageMD". You should see:

```
PageMD: Export to PDF
PageMD: Open Paged Preview
PageMD: Select Profile
...
```

---

## Step 2: Open a Markdown File

Create or open a Markdown file. For testing, create `test.md`:

```markdown
---
title: My First Document
document_id: TEST-001
---

# Hello PageMD

This is my first PageMD document.

## Features

- Paged preview
- PDF export
- Profile-driven styling
```

---

## Step 3: Open Paged Preview

1. With the Markdown file open, press `Ctrl+Shift+P`
2. Type "PageMD: Open Paged Preview"
3. Press Enter

<!-- SCREENSHOT: preview-panel.png - Paged preview panel showing document -->

**What you'll see:**

- A preview panel opens to the side
- Your document is rendered with pagination
- Page margins are highlighted in cyan (if enabled)
- Zoom controls appear in the toolbar

**Verification:**

- Document renders without errors
- Page breaks are visible between pages
- Margin boxes show cyan borders

---

## Step 4: Export to PDF

1. Press `Ctrl+Shift+P`
2. Type "PageMD: Export to PDF"
3. Press Enter

**Expected output:**

```
PageMD: Exported to TEST-001 My First Document.pdf
```

The PDF is saved in the same directory as your Markdown file.

**Verification:**

- Open the PDF file
- Content matches the preview
- Page layout matches the preview

---

## Common Issues

### "CLI not found"

The extension bundles the PageMD CLI, but you can also install it globally:

```bash
npm install -g pagemd
```

### Preview is blank

Check the Output panel (`View` → `Output` → select "PageMD") for error messages.

### Margins not visible

Enable margin highlighting:

1. Open Settings (`Ctrl+,`)
2. Search "pagemd.preview.highlightMargins"
3. Ensure it's checked

---

## Next Steps

- [[guides/Preview|Preview]] - Learn about preview features
- [[reference/Commands|Commands]] - Explore all commands
- [[reference/Settings|Settings]] - Customize the extension
- [[Troubleshooting]] - Common issues and solutions

---

## See Also

- [[guides/Installation|Installation]] - Detailed installation options
- [[general/Overview|Overview]] - What is PageMD?
- [[guides/Basic-Usage|Basic Usage]] - Common tasks
