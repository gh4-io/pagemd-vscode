# Development Setup

Guide for setting up the PageMD VS Code extension development environment.

---

## Contents

- [Prerequisites](#prerequisites)
- [Clone and Install](#clone-and-install)
- [Development Mode](#development-mode)
- [Development Workflow](#development-workflow)

---

## Prerequisites

- Node.js 20+
- VS Code 1.85.0+
- Git

---

## Clone and Install

```bash
git clone https://github.com/gh4-io/pagemd-vscode.git
cd pagemd-vscode
npm install
```

---

## Development Mode

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

## See Also

- [[development/Building|Building]] - Extension build process
- [[development/CLI-Bundling|CLI Bundling]] - Bundling the PageMD CLI
- [[development/Testing|Testing]] - Testing procedures
