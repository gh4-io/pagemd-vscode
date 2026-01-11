# Building

Extension build process and scripts.

---

## Contents

- [Build Process](#build-process)
- [Extension Build](#extension-build)
- [Build Scripts](#build-scripts)
- [Project Structure](#project-structure)

---

## Build Process

Building the extension involves two separate processes:

1. **Extension bundling** - Compile TypeScript to JavaScript
2. **CLI bundling** - Copy PageMD CLI for distribution

See [[development/CLI-Bundling|CLI Bundling]] for CLI bundling details.

---

## Extension Build

### Development Build

Compile extension with sourcemaps:

```bash
npm run bundle
```

Output: `out/extension.js`

### Production Build

Minified, no sourcemaps:

```bash
npm run bundle:prod
```

### Watch Mode

Auto-rebuild on changes:

```bash
npm run bundle:watch
```

---

## Build Scripts

| Script | Purpose | Output |
|--------|---------|--------|
| `bundle` | Dev build with sourcemaps | `out/extension.js` |
| `bundle:prod` | Production build, minified | `out/extension.js` |
| `bundle:watch` | Watch mode for development | `out/extension.js` |
| `bundle-cli` | Copy CLI from sibling repo | `bin/` |

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

## See Also

- [[development/Setup|Setup]] - Development environment setup
- [[development/CLI-Bundling|CLI Bundling]] - Bundling the PageMD CLI
- [[development/Packaging|Packaging]] - Creating VSIX packages
