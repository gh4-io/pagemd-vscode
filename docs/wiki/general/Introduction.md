# Introduction

PageMD for VS Code brings professional PDF export and paged preview to your Markdown workflow without leaving the editor.

---

## Contents

- [What is PageMD?](#what-is-pagemd)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Architecture Overview](#architecture-overview)
- [Relationship to PageMD CLI](#relationship-to-pagemd-cli)

---

## What is PageMD?

PageMD is a profile-driven pipeline that converts Markdown into PDF, HTML, PNG, and JPEG using Puppeteer and Paged.js. The VS Code extension provides a visual interface to this pipeline:

- Preview documents with accurate pagination
- Export to multiple formats with one click
- Switch profiles to change styling and layout
- Validate frontmatter and configuration

The extension acts as a thin client - all rendering logic lives in the PageMD CLI, which the extension spawns as a subprocess.

---

## Goals

1. **Seamless Integration** - Work with Markdown files directly in VS Code
2. **Accurate Preview** - Show pagination as it will appear in final PDF
3. **Visual Debugging** - Highlight margins, show dimensions, inspect layout
4. **Profile-Driven** - Switch styling with a single command
5. **Zero Configuration** - Works out of the box with sensible defaults

---

## Non-Goals

The extension intentionally does NOT:

- **Replace VS Code's Markdown preview** - The built-in preview remains unchanged
- **Embed pipeline logic** - All rendering is delegated to the CLI
- **Support non-Markdown formats** - PageMD is Markdown-focused
- **Provide a WYSIWYG editor** - This is a preview/export tool, not an editor

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    VS Code                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────┐  │
│  │   Editor    │───▶│  Extension  │───▶│ Preview │  │
│  │ (Markdown)  │    │  (Commands) │    │ (Panel) │  │
│  └─────────────┘    └──────┬──────┘    └─────────┘  │
└────────────────────────────┼────────────────────────┘
                             │ subprocess
                             ▼
                    ┌─────────────────┐
                    │   PageMD CLI    │
                    │  (Rendering)    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  PDF/HTML/PNG   │
                    └─────────────────┘
```

---

## Relationship to PageMD CLI

| Feature | Extension | CLI |
|---------|-----------|-----|
| PDF Export | Via command | Direct |
| HTML Export | Via command | Direct |
| Preview | Webview panel | N/A |
| Validation | Editor diagnostics | JSON report |
| Profile Selection | Quick pick UI | `--profile` flag |
| Batch Processing | Single file | Files/folders |

The extension provides UI convenience while the CLI handles heavy lifting. They share the same rendering pipeline, so output is identical.

---

## See Also

- [[Quick-Start]] - Get started in 5 minutes
- [[Architecture]] - Detailed technical architecture
- [PageMD CLI](https://github.com/gh4-io/pagemd) - Core rendering pipeline
