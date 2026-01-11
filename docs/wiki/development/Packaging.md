# Packaging

Guide for creating VSIX packages and publishing to the marketplace.

---

## Contents

- [VSIX Packaging](#vsix-packaging)
- [Installing VSIX](#installing-vsix)
- [Rebuild and Reinstall](#rebuild-and-reinstall)
- [Uninstalling](#uninstalling)
- [Package Contents](#package-contents)
- [Publishing to Marketplace](#publishing-to-marketplace)

---

## VSIX Packaging

### Without Bundled CLI

Lightweight package (~50KB) - users install CLI separately:

```bash
npm run bundle:prod
npm run package
```

Output: `pagemd-<version>.vsix`

### With Bundled CLI

Full package (~50MB) - includes CLI for zero-config use:

```bash
# Step 1: Bundle CLI from sibling pagemd repo
npm run bundle-cli

# Step 2: Install CLI dependencies (production only)
cd bin && npm install --omit=dev && cd ..

# Step 3: Build extension
npm run bundle:prod

# Step 4: Create VSIX
npm run package
```

### Pre-publish Script

The `vscode:prepublish` script runs automatically before `vsce package`:

```bash
npm run bundle-cli && cd bin && npm install --omit=dev && cd .. && node scripts/link-workspace-pkgs.js && npm run bundle:prod
```

This handles CLI bundling, dependency installation, workspace package linking, and extension building in one step.

---

## Installing VSIX

After packaging, install to VS Code for testing.

### Find VSIX Filename

The filename follows the pattern `<name>-<version>.vsix` from `package.json`:

```bash
# Check version in package.json
grep '"version"' package.json
# Example output: "version": "0.1.2"

# VSIX filename will be: pagemd-0.1.2.vsix
ls *.vsix
```

### GUI Installation

1. Open VS Code
2. `Ctrl+Shift+X` (Extensions panel)
3. Click `...` menu → **Install from VSIX...**
4. Select the `.vsix` file

### Command Line Installation

```bash
code --install-extension pagemd-<version>.vsix
```

---

## Rebuild and Reinstall

Quick workflow for iterating on changes:

```bash
cd /path/to/pagemd-vscode
npm run bundle:prod
npm run package
code --install-extension pagemd-*.vsix --force
```

The `--force` flag reinstalls over the existing version without uninstalling first.

**With bundled CLI:**
```bash
npm run bundle-cli
cd bin && npm install --omit=dev && cd ..
npm run bundle:prod
npm run package
code --install-extension pagemd-*.vsix --force
```

---

## Uninstalling

### GUI

1. `Ctrl+Shift+X` (Extensions panel)
2. Find "PageMD"
3. Click **Uninstall**

### Command Line

```bash
code --uninstall-extension gh4-io.pagemd
```

---

## Package Contents

The VSIX includes (from `.vscodeignore`):

| Included | Excluded |
|----------|----------|
| `out/extension.js` | `src/` (TypeScript source) |
| `media/` | `node_modules/` |
| `bin/` (if bundled) | `.git/` |
| `package.json` | `*.map` (sourcemaps) |
| `README.md` | Test files |

---

## Publishing to Marketplace

### Prerequisites

- VS Code Marketplace publisher account
- Personal Access Token (PAT)

### Login

First time only:

```bash
vsce login <publisher>
```

### Publish

```bash
# Publish current version
vsce publish

# Or publish with version bump
vsce publish minor
vsce publish major
vsce publish patch
```

### Version Bumping

| Command | Version Change |
|---------|---------------|
| `vsce publish patch` | 0.1.0 → 0.1.1 |
| `vsce publish minor` | 0.1.0 → 0.2.0 |
| `vsce publish major` | 0.1.0 → 1.0.0 |

---

## See Also

- [[development/Building|Building]] - Extension build process
- [[development/CLI-Bundling|CLI Bundling]] - Bundling the PageMD CLI
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
