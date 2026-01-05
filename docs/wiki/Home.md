# PageMD for VS Code

The official VS Code extension for PageMD - export Markdown to PDF with paged preview and CSS paged-media support.

<!-- SCREENSHOT: preview-panel.png - Paged preview panel showing document -->

---

## Quick Links

| Getting Started | Reference | Operations |
|-----------------|-----------|------------|
| [[Quick-Start]] | [[Commands]] | [[Troubleshooting]] |
| [[Installation]] | [[Settings]] | [[Developer-Guide]] |
| [[Introduction]] | [[Preview]] | [[Architecture]] |

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

## Features

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

## Current Status

| Component | Status |
|-----------|--------|
| Export (PDF/HTML/PNG/JPEG) | Done |
| Paged Preview Panel | Done |
| Profile Selection | Done |
| Document Validation | Done |
| Document Inspection | Done |
| Document Creation | Done |
| Marketplace Publishing | Pending |

---

## Requirements

- VS Code 1.85.0 or later
- Node.js 20+ (for CLI operations)
- PageMD CLI (bundled with extension or installed separately)

---

## See Also

- [[Quick-Start]] - Get started in 5 minutes
- [[Installation]] - Detailed installation options
- [[Commands]] - All available commands
- [PageMD CLI Documentation](../../pagemd/docs/wiki/Home.md)
