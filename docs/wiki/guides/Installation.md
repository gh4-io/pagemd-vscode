# Installation

Install and configure PageMD for VS Code.

---

## Contents

- [Requirements](#requirements)
- [Installation Methods](#installation-methods)
- [CLI Resolution](#cli-resolution)
- [Verification](#verification)
- [Updating](#updating)

---

## Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| VS Code | 1.85.0+ | Required |
| Node.js | 20+ | For CLI operations |
| Chrome/Chromium | Any recent | Optional (falls back to bundled) |

---

## Installation Methods

### VS Code Marketplace (Recommended)

1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for "PageMD"
4. Click **Install**

### VSIX File (Manual)

1. Download `.vsix` from [GitHub Releases](https://github.com/gh4-io/pagemd-vscode/releases)
2. In VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Select the downloaded file

### From Source (Development)

```bash
git clone https://github.com/gh4-io/pagemd-vscode.git
cd pagemd-vscode
npm install
npm run bundle
```

Then press `F5` in VS Code to launch Extension Development Host.

**Note:** This builds the extension without bundled CLI. For distribution builds with bundled CLI, see [[Developer-Guide#cli-bundling]].

### Production Build (Setup Script)

For a complete production build with bundled CLI, use the setup script:

#### Prerequisites

- Windows with PowerShell
- Node.js 20 or later installed
- Git installed

#### Steps

1. **Create an empty folder** for the build
   - Example: `C:\pagemd-build\`
   - The script will clone repositories into this folder

2. **Download the setup script**
   - Get `setup-pagemd-prod.ps1` from the repository
   - Save it to your empty build folder

3. **Open PowerShell**
   - Press the Windows key
   - Type `powershell`
   - Click on Windows PowerShell

4. **Navigate to your build folder**
   ```powershell
   cd C:\pagemd-build
   ```

5. **Run the setup script**
   ```powershell
   .\setup-pagemd-prod.ps1
   ```

6. **Select option 4** (Bundled Extension - Recommended)
   - This creates a self-contained extension with CLI included

7. **Follow the prompts**
   - Press Enter to accept defaults
   - The script will clone, build, and package everything

#### What the Script Does

1. Clones both `pagemd` and `pagemd-vscode` repositories
2. Installs all dependencies
3. Bundles the CLI into the extension
4. Compiles the TypeScript code
5. Creates a `.vsix` file for installation
6. Optionally installs to VS Code

#### Verification

After the script completes:

1. Check that the build succeeded:
   ```powershell
   ls pagemd-vscode\out\
   ```
   You should see `extension.js` listed.

2. Check that the VSIX was created:
   ```powershell
   ls pagemd-vscode\*.vsix
   ```

#### Troubleshooting

If the build fails:
- Read the error messages shown in the script output
- Check that Node.js 20+ is installed: `node --version`
- Check that Git is installed: `git --version`
- Ensure you have internet access for cloning and npm install

---

## CLI Resolution

The extension needs the PageMD CLI to render documents. It searches in this order:

| Priority | Source | Path |
|----------|--------|------|
| 1 | Custom setting | `pagemd.cliPath` setting |
| 2 | Bundled CLI | `<extension>/cli/node_modules/.bin/pagemd` |
| 3 | Workspace local | `./node_modules/.bin/pagemd` |
| 4 | Global npm | Result of `npm root -g` + `/pagemd/apps/cli/src/index.js` |
| 5 | npx fallback | `npx pagemd` (requires npm) |

### Using Bundled CLI

The extension bundles the PageMD CLI for zero-configuration use. No additional setup required.

For details on how CLI bundling works, see [[Developer-Guide#cli-bundling]].

### Using Global CLI

Install PageMD globally for faster startup:

```bash
npm install -g pagemd
```

### Using Custom Path

If you have a development build or custom location:

1. Open Settings (`Ctrl+,`)
2. Search "pagemd.cliPath"
3. Enter the full path to the `pagemd` executable

---

## Verification

### Check Extension is Active

1. Open a `.md` file
2. Press `Ctrl+Shift+P`
3. Type "PageMD"
4. Verify commands appear in the list

### Check CLI is Found

1. Open Output panel (`View` → `Output`)
2. Select "PageMD" from dropdown
3. Run any PageMD command
4. Check for "Using CLI:" message

**Expected output:**

```
[PageMD] Using CLI: /path/to/pagemd
[PageMD] CLI version: 1.0.0
```

### First Export Test

1. Create a simple Markdown file
2. Run "PageMD: Export to PDF"
3. Verify PDF is created

---

## Updating

### Marketplace Installation

VS Code auto-updates extensions. To manually update:

1. Open Extensions panel (`Ctrl+Shift+X`)
2. Find PageMD
3. Click **Update** if available

### VSIX Installation

1. Download new `.vsix` from Releases
2. Uninstall current version (right-click → Uninstall)
3. Install new VSIX

---

## Troubleshooting Installation

### Extension Not Activating

The extension activates when you open a Markdown file. If commands don't appear:

1. Open a `.md` file
2. Wait a few seconds
3. Try `Ctrl+Shift+P` again

### CLI Not Found

See [[Troubleshooting#cli-resolution]] for detailed CLI resolution issues.

### Permission Errors

On Linux/macOS, ensure the CLI is executable:

```bash
chmod +x /path/to/pagemd
```

---

## See Also

- [[Quick-Start]] - Get started in 5 minutes
- [[Settings]] - Configure the extension
- [[Troubleshooting]] - Common issues
