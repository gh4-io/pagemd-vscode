# Overview

High-level overview of the PageMD VS Code extension.

---

## Contents

- [What is PageMD for VS Code?](#what-is-pagemd-for-vs-code)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Use Cases](#use-cases)

---

## What is PageMD for VS Code?

PageMD for VS Code is a thin client extension that wraps the [PageMD CLI](https://github.com/gh4-io/pagemd) pipeline. It provides:

- **Paged Preview** - Live preview with pagination, zoom controls, and visual debugging
- **Export to PDF/HTML/PNG/JPEG** - Profile-driven rendering with CSS paged-media
- **Profile Selection** - Switch between rendering profiles on the fly
- **Document Validation** - Real-time validation with editor diagnostics
- **Document Inspection** - View resolved configuration and resources

The extension does not override VS Code's built-in Markdown preview. Instead, it offers an opt-in paged preview panel that renders using the same pipeline as the CLI.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Paged Preview** | Live preview with accurate pagination via Paged.js |
| **Export Formats** | PDF, HTML, PNG, JPEG |
| **Margin Visualization** | Cyan overlays showing page margins |
| **Dimension Labels** | Display margin and page sizes |
| **Zoom Controls** | +/-, fit width, reset to 100% |
| **Two-Column Spread** | Book-style side-by-side page view |
| **Profile Picker** | Quick profile selection via Command Palette |
| **Validation** | Real-time frontmatter and schema validation |

---

## How It Works

### Thin Client Architecture

```
VS Code Extension → CLI Subprocess → Chrome/Chromium → PDF/HTML
```

1. **Extension** handles UI, commands, and user interaction
2. **CLI** handles all rendering, validation, and processing
3. **Chrome** renders HTML with Paged.js for pagination
4. **Output** is PDF, HTML, PNG, or JPEG file

This separation ensures:
- Identical output between CLI and extension
- Extension stays lightweight (~50KB)
- Updates to rendering logic don't require extension updates

### Preview Flow

```
Markdown file → CLI (HTML) → Webview (Paged.js) → Paginated preview
```

1. Extension watches for file changes
2. CLI generates HTML via `pagemd build --stdout`
3. HTML injected into webview
4. Paged.js paginates in browser
5. Visual debugging overlays added

---

## Use Cases

### Technical Documentation

- Manuals with consistent formatting
- API documentation with syntax highlighting
- Design specifications with diagrams

### Reports and Papers

- Business reports with headers/footers
- Academic papers with citations
- Project proposals with branding

### Books and eBooks

- Technical books with code examples
- Course materials with exercises
- Reference guides with indexes

### Print-Ready Materials

- Brochures with precise margins
- Flyers with custom layouts
- Certificates with exact dimensions

---

## See Also

- [[Architecture|Architecture]] - Technical architecture
- [[Concepts|Key Concepts]] - Core concepts
- [[../guides/Basic-Usage|Basic Usage]] - Getting started
- [PageMD CLI Overview](../../pagemd/docs/wiki/general/Overview.md)
