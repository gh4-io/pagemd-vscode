# CLI Bundling

Guide for bundling the PageMD CLI with the extension.

---

## Contents

- [Overview](#overview)
- [Do I Need to Bundle?](#do-i-need-to-bundle)
- [Prerequisites](#prerequisites)
- [Bundle Command](#bundle-command)
- [What Gets Bundled](#what-gets-bundled)
- [Output Structure](#output-structure)
- [Without Bundling](#without-bundling)
- [Bundling for Distribution](#bundling-for-distribution)
- [Common Errors](#common-errors)
- [Clean Build](#clean-build)

---

## Overview

The extension can bundle the PageMD CLI for zero-configuration distribution. This section explains when and how to bundle.

> **Already set up?** If you have both repos as siblings with `npm install` complete in each, skip to [Bundling for Distribution](#bundling-for-distribution).

---

## Do I Need to Bundle?

**For development:** NO. The extension falls back to global CLI or npx.

**For distribution (VSIX):** YES, if you want users to have zero-config experience.

---

## Prerequisites

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

---

## Bundle Command

**Run from the `pagemd-vscode` directory:**

```bash
cd pagemd-vscode      # IMPORTANT: Must be in extension directory
npm run bundle-cli
```

**What happens:**
1. Script checks for `../pagemd` (sibling directory)
2. If not found, exits with error
3. If found, copies CLI + resources to `bin/`

**Important:** This script copies source files - it does NOT build the CLI. The CLI must already be set up in the sibling `pagemd` repo (with `npm install` completed). If you need to build the CLI first, see the [PageMD CLI Developer Guide](../../../pagemd/docs/wiki/development/Setup.md).

---

## What Gets Bundled

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

---

## Output Structure

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

---

## Without Bundling

**The extension does NOT auto-bundle.** If `bin/` doesn't exist, the extension falls back to finding CLI elsewhere at runtime:

1. `pagemd.cliPath` setting (if configured)
2. Workspace `./node_modules/.bin/pagemd`
3. Global npm installation
4. `npx pagemd` (slowest, downloads on each run)

**For development:** This is fine. Install CLI globally (`npm install -g pagemd`) or let npx handle it.

**For distribution:** Users without CLI installed will get errors unless you bundle, or they install CLI separately.

See [[guides/Installation#cli-resolution|Installation]] for full resolution order.

---

## Bundling for Distribution

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

---

## Common Errors

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

---

## Clean Build

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

## See Also

- [[development/Building|Building]] - Extension build process
- [[development/Packaging|Packaging]] - Creating VSIX packages
- [[guides/Installation|Installation]] - CLI resolution order
