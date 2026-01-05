# Developer Guide

Guide for contributing to the PageMD VS Code extension.

---

## Contents

- [Repository Setup](#repository-setup)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Building](#building)
- [CLI Bundling](#cli-bundling)
- [Testing](#testing)
- [Adding New Commands](#adding-new-commands)
- [Packaging](#packaging)
- [Contributing](#contributing)

---

## Repository Setup

### Prerequisites

- Node.js 20+
- VS Code 1.85.0+
- Git

### Clone and Install

```bash
git clone https://github.com/gh4-io/pagemd-vscode.git
cd pagemd-vscode
npm install
```

### Development Mode

1. Open the folder in VS Code
2. Press `F5` to launch Extension Development Host
3. Test commands in the new VS Code window

---

## Development Workflow

### Watch Mode

Rebuild on file changes:

```bash
npm run bundle:watch
```

### TypeScript Checking

Run type checks without building:

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Full Build

```bash
npm run bundle
```

---

## Project Structure

```
pagemd-vscode/
├── src/
│   ├── extension.ts          # Entry point
│   ├── commands/             # Command handlers
│   ├── providers/            # UI providers
│   └── utils/                # Utilities
├── media/                    # Webview assets
├── scripts/                  # Build scripts
├── docs/wiki/                # Documentation
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
└── esbuild.config.js         # Build config
```

### Key Files

| File | Purpose |
|------|---------|
| `extension.ts` | Extension activation, command registration |
| `commands/*.ts` | Individual command implementations |
| `providers/preview-panel.ts` | Webview panel for preview |
| `utils/cli-wrapper.ts` | CLI subprocess management |
| `media/paged.polyfill.js` | Bundled Paged.js runtime |

---

## Building

Building the extension involves two separate processes:

1. **Extension bundling** - Compile TypeScript to JavaScript
2. **CLI bundling** - Copy PageMD CLI for distribution

### Extension Build (Development)

Compile extension with sourcemaps:

```bash
npm run bundle
```

Output: `out/extension.js`

### Extension Build (Production)

Minified, no sourcemaps:

```bash
npm run bundle:prod
```

### Watch Mode

Auto-rebuild on changes:

```bash
npm run bundle:watch
```

### Build Scripts Summary

| Script | Purpose | Output |
|--------|---------|--------|
| `bundle` | Dev build with sourcemaps | `out/extension.js` |
| `bundle:prod` | Production build, minified | `out/extension.js` |
| `bundle:watch` | Watch mode for development | `out/extension.js` |
| `bundle-cli` | Copy CLI from sibling repo | `bin/` |

---

## CLI Bundling

The extension can bundle the PageMD CLI for zero-configuration distribution. This section explains when and how to bundle.

> **Already set up?** If you have both repos as siblings with `npm install` complete in each, skip to [Bundling for Distribution](#bundling-for-distribution).

### Do I Need to Bundle?

**For development:** NO. The extension falls back to global CLI or npx.

**For distribution (VSIX):** YES, if you want users to have zero-config experience.

### Prerequisites

**You need BOTH repositories as siblings:**

```
parent-folder/           # Any folder name works
├── pagemd/              # CLI repo (required for bundling)
└── pagemd-vscode/       # Extension repo (run commands here)
```

The `bundle-cli` script looks for `../pagemd` relative to the extension folder. If the sibling structure doesn't exist, bundling will fail.

### Setup Options

**Option A: Clone both repos as siblings**

```bash
mkdir my-workspace && cd my-workspace
git clone https://github.com/gh4-io/pagemd.git
git clone https://github.com/gh4-io/pagemd-vscode.git
```

**Option B: Use the monorepo workspace (if available)**

```bash
git clone https://github.com/gh4-io/pagemd-workspace.git
cd pagemd-workspace
git submodule update --init --recursive
```

### Bundle Command

**Run from the `pagemd-vscode` directory:**

```bash
cd pagemd-vscode      # IMPORTANT: Must be in extension directory
npm run bundle-cli
```

**What happens:**
1. Script checks for `../pagemd` (sibling directory)
2. If not found, exits with error
3. If found, copies CLI + resources to `bin/`

**Important:** This script copies source files - it does NOT build the CLI. The CLI must already be set up in the sibling `pagemd` repo (with `npm install` completed). If you need to build the CLI first, see the [PageMD CLI Developer Guide](../../../pagemd/docs/wiki/Developer-Guide.md).

### What Gets Bundled

The script (`scripts/bundle-cli.js`) copies from `../pagemd`:

| Source | Destination | Purpose |
|--------|-------------|---------|
| `apps/cli/` | `bin/apps/cli/` | CLI entry point (preserves path structure) |
| `packages/` | `bin/packages/` | Core pipeline modules |
| `profiles/` | `bin/profiles/` | Default profiles |
| `templates/` | `bin/templates/` | HTML templates |
| `layouts/` | `bin/layouts/` | Layout CSS |
| `styles/` | `bin/styles/` | Global styles |
| `package.json` | `bin/package.json` | Dependency resolution |

After `npm install` in bin/, `scripts/link-workspace-pkgs.js` copies workspace packages to `node_modules/@pagemd/` so imports resolve correctly.

### Output Structure

After bundling:

```
pagemd-vscode/
├── bin/
│   ├── apps/cli/         # CLI entry (apps/cli structure preserved)
│   ├── packages/         # Pipeline modules (source)
│   ├── node_modules/     # Dependencies + @pagemd/* copies
│   ├── profiles/         # Default profiles
│   ├── templates/        # HTML templates
│   ├── layouts/          # Layout CSS
│   ├── styles/           # Global styles
│   └── package.json      # Dependencies
├── out/
│   └── extension.js      # Compiled extension
└── media/
    └── paged.polyfill.js # Paged.js runtime
```

### Without Bundling

**The extension does NOT auto-bundle.** If `bin/` doesn't exist, the extension falls back to finding CLI elsewhere at runtime:

1. `pagemd.cliPath` setting (if configured)
2. Workspace `./node_modules/.bin/pagemd`
3. Global npm installation
4. `npx pagemd` (slowest, downloads on each run)

**For development:** This is fine. Install CLI globally (`npm install -g pagemd`) or let npx handle it.

**For distribution:** Users without CLI installed will get errors unless you bundle, or they install CLI separately.

See [[Installation#cli-resolution]] for full resolution order.

### Bundling for Distribution

Create a VSIX with bundled CLI:

```bash
npm run package
```

This single command runs `vscode:prepublish` which:
1. Bundles CLI from sibling pagemd repo
2. Installs production dependencies in bin/
3. Copies workspace packages to node_modules/@pagemd/
4. Builds extension (production)

**Manual steps (if needed):**

```bash
npm run bundle-cli                    # Copy CLI from sibling repo
cd bin && npm install --omit=dev && cd ..  # Install dependencies
node scripts/link-workspace-pkgs.js   # Link @pagemd/* packages
npm run bundle:prod                   # Build extension
npm run package                       # Create VSIX (skip prepublish)
```

### Installing the VSIX

After packaging, install to VS Code for testing.

**Find the VSIX filename:**

The filename follows the pattern `<name>-<version>.vsix` from `package.json`:

```bash
# Check version in package.json
grep '"version"' package.json
# Example output: "version": "0.1.2"

# VSIX filename will be: pagemd-0.1.2.vsix
ls *.vsix
```

**GUI:**
1. Open VS Code
2. `Ctrl+Shift+X` (Extensions panel)
3. Click `...` menu → **Install from VSIX...**
4. Select the `.vsix` file

**Command line:**
```bash
code --install-extension pagemd-<version>.vsix
```

### Rebuild and Reinstall

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

### Uninstalling

**GUI:**
1. `Ctrl+Shift+X` (Extensions panel)
2. Find "PageMD"
3. Click **Uninstall**

**Command line:**
```bash
code --uninstall-extension gh4-io.pagemd
```

### Common Errors

**"Error: pagemd repo not found"**

The sibling `pagemd` folder doesn't exist. Check:
- Are you in the `pagemd-vscode` directory?
- Does `../pagemd` exist?
- Did you clone both repos?

**"Cannot find module"**

CLI dependencies not installed. Run:
```bash
cd bin && npm install && cd ..
```

### Clean Build

If you encounter strange errors or want a fresh start, clean all generated files:

**Extension repo (pagemd-vscode):**
```bash
rm -rf node_modules out bin
npm install
```

**CLI repo (pagemd):**
```bash
rm -rf node_modules
npm install
```

**Both repos (full reset):**
```bash
# From parent folder containing both repos
cd pagemd && rm -rf node_modules && npm install && cd ..
cd pagemd-vscode && rm -rf node_modules out bin && npm install && cd ..
```

After cleaning, start fresh from [Bundling for Distribution](#bundling-for-distribution).

---

## Testing

### Manual Testing

1. Press `F5` to launch Extension Development Host
2. Open a Markdown file
3. Test each command

### Debugging

1. Set breakpoints in `src/` files
2. Press `F5` to launch with debugger attached
3. Trigger commands to hit breakpoints

### Output Panel

View extension logs:

1. `View` → `Output`
2. Select "PageMD" from dropdown

---

## Adding New Commands

### 1. Define in package.json

```json
{
  "contributes": {
    "commands": [
      {
        "command": "pagemd.newCommand",
        "title": "PageMD: New Command",
        "icon": "$(icon-name)"
      }
    ]
  }
}
```

### 2. Create Command Handler

Create `src/commands/new-command.ts`:

```typescript
import * as vscode from 'vscode';
import { CLIWrapper } from '../utils/cli-wrapper';

export async function newCommand(cli: CLIWrapper) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  // Implementation
  const result = await cli.run(['...args']);

  if (result.exitCode === 0) {
    vscode.window.showInformationMessage('Success');
  } else {
    vscode.window.showErrorMessage(result.stderr);
  }
}
```

### 3. Register in extension.ts

```typescript
import { newCommand } from './commands/new-command';

export function activate(context: vscode.ExtensionContext) {
  const cli = new CLIWrapper();

  context.subscriptions.push(
    vscode.commands.registerCommand('pagemd.newCommand', () => newCommand(cli))
  );
}
```

### 4. Update Documentation

Add to [[Commands]] page.

---

## Packaging

### VSIX Without Bundled CLI

Lightweight package (~50KB) - users install CLI separately:

```bash
npm run bundle:prod
npm run package
```

Output: `pagemd-<version>.vsix`

### VSIX With Bundled CLI

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

### Package Contents

The VSIX includes (from `.vscodeignore`):

| Included | Excluded |
|----------|----------|
| `out/extension.js` | `src/` (TypeScript source) |
| `media/` | `node_modules/` |
| `bin/` (if bundled) | `.git/` |
| `package.json` | `*.map` (sourcemaps) |
| `README.md` | Test files |

### Publishing to Marketplace

```bash
# Login (first time)
vsce login <publisher>

# Publish
vsce publish

# Or publish with version bump
vsce publish minor
```

Requires:
- VS Code Marketplace publisher account
- Personal Access Token (PAT)

---

## Contributing

### Code Style

- TypeScript with strict mode
- ESLint for linting
- Consistent naming: `camelCase` for functions, `PascalCase` for classes

### Commit Messages

```
feat: Add new export format
fix: Resolve preview refresh issue
docs: Update command reference
chore: Update dependencies
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Update documentation
5. Submit PR with description

### Issue Reporting

Include:

- VS Code version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Output panel logs

---

## Extension APIs Used

| API | Purpose |
|-----|---------|
| `vscode.commands` | Command registration |
| `vscode.window.createWebviewPanel` | Preview panel |
| `vscode.window.showQuickPick` | Profile selection |
| `vscode.workspace.getConfiguration` | Settings access |
| `vscode.languages.createDiagnosticCollection` | Validation errors |
| `child_process.spawn` | CLI subprocess |

---

## See Also

- [[Architecture]] - Technical architecture
- [[Commands]] - Command reference
- [VS Code Extension API](https://code.visualstudio.com/api)
