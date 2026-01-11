# Key Concepts

Core concepts for understanding the PageMD VS Code extension.

---

## Contents

- [Thin Client Architecture](#thin-client-architecture)
- [CLI Integration](#cli-integration)
- [Paged Preview](#paged-preview)
- [Profiles](#profiles)
- [Validation](#validation)

---

## Thin Client Architecture

The extension follows a **thin client** model:

- **Extension** provides UI and commands
- **CLI** handles all rendering and processing
- **Communication** via subprocess (stdin/stdout)

### Benefits

| Benefit | Description |
|---------|-------------|
| **Consistency** | Identical output between CLI and extension |
| **Lightweight** | Extension stays small (~50KB) |
| **Maintainability** | Rendering updates don't require extension republishing |
| **Testability** | CLI can be tested independently |

---

## CLI Integration

### CLI Resolution

The extension finds the CLI in this order:

1. **Custom path** - `pagemd.cliPath` setting
2. **Bundled CLI** - `<extension>/bin/`
3. **Workspace local** - `./node_modules/.bin/pagemd`
4. **Global npm** - System-wide installation
5. **npx fallback** - Download on demand

See [[../guides/Installation#cli-resolution|Installation]] for details.

### CLI Commands Used

| Extension Action | CLI Command |
|-----------------|-------------|
| Export to PDF | `pagemd build <file> -o pdf` |
| Export to HTML | `pagemd build <file> -o html` |
| Preview | `pagemd build <file> -o html --stdout` |
| Validate | `pagemd validate <file>` |
| Inspect | `pagemd inspect <file> --json` |
| List profiles | `pagemd list profiles --json` |

---

## Paged Preview

### How It Works

```
Markdown → CLI (unpaginated HTML) → Webview (Paged.js) → Paginated view
```

1. CLI generates HTML without pagination
2. Extension injects HTML into webview
3. Paged.js runs in webview, applying CSS paged-media rules
4. DOM is paginated into `<div class="pagedjs_page">` elements
5. Preview controls overlay for zoom, margins, dimensions

### Preview vs Built-in Preview

| Feature | Paged Preview | Built-in Preview |
|---------|--------------|-----------------|
| Pagination | Yes | No |
| Page breaks | Yes | No |
| Margin visualization | Yes | No |
| Headers/footers | Yes | No |
| CSS paged-media | Yes | No |
| Speed | Slower | Faster |

**When to use:**
- **Paged Preview** - Exporting to PDF, need pagination accuracy
- **Built-in Preview** - Quick editing, live markdown preview

---

## Profiles

Profiles control how documents are rendered. They define:

- Page size and margins
- Fonts and colors
- Headers and footers
- Layout structure

### Profile Selection

1. `Ctrl+Shift+P` → "PageMD: Select Profile"
2. Choose profile from list
3. Profile applied to next export/preview

### Default Profiles

| Profile | Page Size | Use Case |
|---------|-----------|----------|
| `standard_letter` | US Letter | General documents (US) |
| `standard_a4` | A4 | General documents (international) |
| `technical_manual` | Letter | Technical documentation |
| `report_formal` | Letter | Formal reports |
| `minimal_clean` | Letter | Minimal styling |

See [PageMD CLI: Profiles](../../pagemd/docs/wiki/guides/Profiles.md) for creating custom profiles.

---

## Validation

### What Gets Validated

- **Frontmatter syntax** - YAML parsing errors
- **Profile existence** - Profile ID references
- **Resource paths** - CSS, image, font paths
- **Schema compliance** - Profile schema validation

### Validation Flow

```
Document change → CLI validate → Diagnostics → Problems panel
```

Errors appear in:
- **Problems panel** (`Ctrl+Shift+M`)
- **Editor gutter** (red squiggles)

### Validation Modes

- **Automatic** - On file save (if enabled)
- **Manual** - Run "PageMD: Validate Document"

---

## See Also

- [[Overview|Overview]] - Extension overview
- [[Architecture|Architecture]] - Technical details
- [[../guides/Basic-Usage|Basic Usage]] - Using the extension
- [PageMD CLI Concepts](../../pagemd/docs/wiki/general/Concepts.md)
