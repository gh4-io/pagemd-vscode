# PageMD VS Code Extension

Markdown to PDF with Paged.js - paged preview and export directly in VS Code.

## Features

- **Export to PDF** - Convert markdown files to PDF using PageMD's profile-based rendering
- **Paged Preview** - Live preview with pagination, auto-refreshing on save or as you type
- **Profile Picker** - Quick profile selection via status bar or command palette
- **Validation** - Document validation with editor diagnostics (squiggles)

## Requirements

- VS Code 1.85.0 or higher
- PageMD CLI (bundled with extension OR installed separately)

## CLI Options

The extension requires the PageMD CLI. Choose one approach:

| Approach | Extension Size | Setup | Best For |
|----------|---------------|-------|----------|
| **Bundled CLI** | ~50MB | Zero config | End users, easy distribution |
| **Separate CLI** | ~50KB | Install CLI separately | Developers, shared CLI across tools |

**CLI Resolution Order:** Bundled → Workspace (`node_modules`) → Global (`PATH`)

Override with `pagemd.cliPath` setting if needed.

## Installation

### Option A: Bundled CLI (Recommended for Users)

Install extension with CLI included - no separate CLI installation needed.

#### Install VSIX

**GUI:**
1. Open VS Code → `Ctrl+Shift+X` (Extensions)
2. Click `...` → **Install from VSIX...**
3. Select `.vsix` file → **Install**
4. Reload when prompted

**Command Line:**
```bash
code --install-extension pagemd-0.1.0.vsix
```

**Drag and Drop (Windows/macOS):**
Drag `.vsix` into Extensions sidebar.

#### Build Bundled VSIX from Source

```bash
# Clone both repos as siblings
git clone https://github.com/gh4-io/pagemd.git
git clone https://github.com/gh4-io/pagemd-vscode.git

# Install CLI
cd pagemd
npm install

# Build extension with bundled CLI
cd ../pagemd-vscode
npm install
npm run bundle-cli        # Copy CLI into extension
npm run vscode:prepublish # Production build
npm run package           # Create .vsix
```

Output: `pagemd-vscode/pagemd-*.vsix` (~50MB, includes CLI)

### Option B: Separate CLI (Recommended for Developers)

Install lightweight extension + CLI separately. Useful when:
- You already have PageMD CLI installed
- You want to share CLI across multiple tools
- You're developing/debugging the CLI

#### Step 1: Install CLI

```bash
# Global install
npm install -g @pagemd/cli

# Or workspace install
npm install @pagemd/cli
```

#### Step 2: Install Extension (without bundled CLI)

```bash
# Clone and build extension only
git clone https://github.com/gh4-io/pagemd-vscode.git
cd pagemd-vscode
npm install
npm run vscode:prepublish  # Skip bundle-cli step
npm run package
```

Output: `pagemd-*.vsix` (~50KB, CLI-less)

Then install the VSIX (see GUI/CLI methods above).

#### Step 3: Configure CLI Path (if needed)

If CLI isn't in PATH, set in VS Code settings:
```json
"pagemd.cliPath": "/path/to/pagemd/apps/cli/src/index.js"
```

### Verify Installation

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type `PageMD`
3. Should see: `Export to PDF`, `Open Paged Preview`, etc.
4. Check Output panel (`View → Output → PageMD`) for:
   - "Using bundled CLI" (Option A)
   - "Using CLI from PATH" or configured path (Option B)

### Development Mode

For extension development with live reload:

```bash
cd pagemd-vscode
npm install
npm run bundle        # or bundle:watch for continuous rebuild
```

Press `F5` in VS Code to launch Extension Development Host.

## Uninstall

### Uninstall Extension

**GUI:**
1. Open VS Code → `Ctrl+Shift+X` (Extensions)
2. Find "PageMD" in installed extensions
3. Click gear icon → **Uninstall**
4. Reload when prompted

**Command Line:**
```bash
code --uninstall-extension gh4-io.pagemd
```

### Uninstall CLI (Option B only)

If you installed the CLI separately:

```bash
# Global install
npm uninstall -g @pagemd/cli

# Workspace install
npm uninstall @pagemd/cli
```

### Clean Up Settings (Optional)

Remove PageMD settings from VS Code:
1. Open Settings (`Ctrl+,`)
2. Search for "pagemd"
3. Click "Reset Setting" on each PageMD setting

Or manually edit `settings.json` and remove all `pagemd.*` entries.

## Commands

| Command | Description |
|---------|-------------|
| `PageMD: Export Document...` | Export document with format selection (PDF, HTML, PNG, JPEG) |
| `PageMD: Export to PDF` | Quick export to PDF format |
| `PageMD: Open Paged Preview` | Show paged preview in side panel with live refresh |
| `PageMD: Select Profile` | Choose rendering profile from workspace or project |
| `PageMD: Validate Document` | Validate document and show diagnostics in Problems panel |
| `PageMD: Create Document...` | Create new markdown, profile, or project from template |
| `PageMD: Inspect Document` | View document configuration, profile, and resources |

## Settings

### General

| Setting | Default | Description |
|---------|---------|-------------|
| `pagemd.defaultProfile` | `standard_letter` | Default rendering profile |
| `pagemd.debugMode` | `false` | Enable debug artifacts and verbose logging |
| `pagemd.outputPath` | `""` | Custom output directory (relative or absolute, empty = same as source) |
| `pagemd.showOutputPanelOn` | `onError` | Show output panel: `always`, `never`, or `onError` |
| `pagemd.cliPath` | `""` | Custom path to pagemd CLI (empty = auto-detect) |

### Preview Visual Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `pagemd.preview.highlightMargins` | `true` | Show cyan borders around page margin boxes |
| `pagemd.preview.marginColor` | `#0ff` | Color for margin box highlighting |
| `pagemd.preview.showDimensions` | `true` | Show margin/page size labels when highlighting enabled |
| `pagemd.preview.dimensionUnit` | `in` | Preferred unit for dimension labels (`in` or `mm`) |
| `pagemd.preview.emulatePageLayout` | `true` | Show white pages on gray background |
| `pagemd.preview.paperColor` | `#ffffff` | Page background color |
| `pagemd.preview.backgroundColor` | `#777777` | Background color outside pages |
| `pagemd.preview.twoColumnSpread` | `false` | Show pages side-by-side like an open book |
| `pagemd.preview.pageGap` | `5mm` | Gap between pages in preview |
| `pagemd.preview.zoom` | `100` | Preview zoom level (25-400%) |

### Preview Behavior

| Setting | Default | Description |
|---------|---------|-------------|
| `pagemd.previewRefresh` | `manual` | When to refresh: `manual`, `onSave`, or `live` |

### Export Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `pagemd.jpegQuality` | `90` | JPEG quality for image exports (1-100) |
| `pagemd.pdfTimeout` | `60000` | PDF generation timeout in milliseconds |
| `pagemd.headless` | `true` | Run browser in headless mode (false = browser stays open for inspection) |
| `pagemd.pagedJsMode` | `browser` | Paged.js execution mode: `browser` or `cli` |

## Usage

1. Open a markdown file
2. Use Command Palette (`Ctrl+Shift+P`) → `PageMD: Export to PDF`
3. Or click the PDF icon in the editor title bar
4. Select a profile via the status bar (bottom right)

### Preview

1. Open a markdown file
2. Use Command Palette → `PageMD: Open Paged Preview`
3. Preview updates based on `previewRefresh` setting (manual, onSave, or live)

#### Zoom Controls

The preview includes a zoom toolbar (bottom-right):
- **+/-** buttons to zoom in/out (25% increments)
- **Fit** button to fit page width to viewport
- **100%** button to reset zoom

#### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl++` / `Cmd++` | Zoom in |
| `Ctrl+-` / `Cmd+-` | Zoom out |
| `Ctrl+0` / `Cmd+0` | Reset zoom to 100% |

#### Visual Features

- **Margin highlighting** - Cyan borders show page margin boxes (headers, footers, margins)
- **Dimension labels** - Multi-sided labels around each page showing:
  - Width and height dimensions (top and left)
  - Individual margin values (all 4 sides)
  - Info panel with @page rule, page size (Letter/A4), orientation, and padding
  - Theme-aware styling (subtle gray, adapts to light/dark themes)
  - Unit conversion (toggle between inches and millimeters via setting)
- **Page layout emulation** - White pages on gray background for print-accurate preview
- **Two-column spread** - Side-by-side pages like an open book (disabled by default)

## Architecture

This extension is a thin client that wraps the PageMD CLI. All rendering is performed by the CLI - no pipeline logic runs in the extension host.

**Design:**
- Spawns `pagemd` CLI for each operation
- Extension contains no rendering logic
- CLI can be bundled (~50MB) or external (~50KB extension)

**CLI Resolution Order:**
1. Bundled CLI (`<extension>/dist/cli/`)
2. Workspace CLI (`node_modules/.bin/pagemd`)
3. Global CLI (`pagemd` in PATH)
4. Custom path (`pagemd.cliPath` setting)

**Bundled CLI Structure (when using Option A):**
```
pagemd-vscode/
├── dist/
│   ├── extension.js
│   └── cli/
│       ├── apps/cli/
│       ├── packages/
│       ├── profiles/
│       ├── templates/
│       └── styles/
```

## Development

```bash
# Build
npm run bundle

# Watch mode
npm run bundle:watch

# Type check
npm run typecheck

# Package VSIX
npm run package
```

## Troubleshooting

### Export Fails with "CLI not found"

**Cause:** PageMD CLI not found in any resolution path.

**Solutions by installation type:**

**Option A (Bundled):** Rebuild extension with CLI:
```bash
cd pagemd-vscode
npm run bundle-cli
npm run vscode:prepublish
npm run package
# Reinstall the new .vsix
```

**Option B (Separate):** Install or configure CLI:
```bash
# Install globally
npm install -g @pagemd/cli

# Or set explicit path in VS Code settings
"pagemd.cliPath": "/path/to/pagemd/apps/cli/src/index.js"
```

**Verify CLI is accessible:**
```bash
pagemd --version  # Should output version
```

### Preview Doesn't Update

**Check:**
- `pagemd.previewRefresh` is set to `onSave` or `live` (default: `manual`)
- File is saved (if `previewRefresh` is `onSave`)
- No errors in Output panel (View → Output → PageMD)

### PDF Generation Times Out

**Solution:** Increase timeout in settings:
```json
"pagemd.pdfTimeout": 120000  // 2 minutes
```

### Browser Rendering Issues

**Solution:** Disable headless mode to see what the browser renders:
```json
"pagemd.headless": false
```

This opens a visible browser window during export. The PDF renders normally and the process completes, but the browser stays open for inspection. Close it manually when done.

### Output Panel Always Shows / Never Shows

**Solution:** Adjust `pagemd.showOutputPanelOn`:
- `"always"` - Show for all operations
- `"onError"` - Show only when export fails (default)
- `"never"` - Never show automatically (manual via View → Output)

### Custom Output Directory Not Working

**Verify:**
- Path is relative to workspace folder or absolute
- Directory exists (PageMD won't create parent directories)
- Path uses forward slashes or escaped backslashes in JSON

Example:
```json
"pagemd.outputPath": "./output"  // Relative to workspace
"pagemd.outputPath": "C:/output"  // Absolute (Windows)
```

## License

MIT
