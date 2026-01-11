# Adding Commands

Guide for adding new commands to the extension.

---

## Contents

- [Overview](#overview)
- [Step 1: Define in package.json](#step-1-define-in-packagejson)
- [Step 2: Create Command Handler](#step-2-create-command-handler)
- [Step 3: Register in extension.ts](#step-3-register-in-extensionts)
- [Step 4: Update Documentation](#step-4-update-documentation)

---

## Overview

Adding a new command involves:
1. Defining command in `package.json`
2. Creating command handler file
3. Registering command in `extension.ts`
4. Updating documentation

---

## Step 1: Define in package.json

Add command to `contributes.commands`:

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

### Command Naming

- Use `pagemd.` prefix
- Use camelCase: `pagemd.exportToPdf`
- Title should start with "PageMD: "

### Icon Reference

Available icons: [Product Icon Reference](https://code.visualstudio.com/api/references/icons-in-labels)

---

## Step 2: Create Command Handler

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

  const filePath = editor.document.uri.fsPath;

  try {
    // Call CLI
    const result = await cli.run(['command', filePath]);

    if (result.exitCode === 0) {
      vscode.window.showInformationMessage('Success');
    } else {
      vscode.window.showErrorMessage(result.stderr || 'Command failed');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error}`);
  }
}
```

### Command Patterns

**Simple command (no parameters):**
```typescript
export async function simpleCommand() {
  vscode.window.showInformationMessage('Hello');
}
```

**Command with CLI call:**
```typescript
export async function cliCommand(cli: CLIWrapper) {
  const result = await cli.run(['build', 'file.md']);
  // Handle result
}
```

**Command with user input:**
```typescript
export async function inputCommand() {
  const input = await vscode.window.showInputBox({
    prompt: 'Enter value'
  });
  if (input) {
    // Use input
  }
}
```

---

## Step 3: Register in extension.ts

Import and register command:

```typescript
import { newCommand } from './commands/new-command';

export function activate(context: vscode.ExtensionContext) {
  const cli = new CLIWrapper();

  context.subscriptions.push(
    vscode.commands.registerCommand('pagemd.newCommand', () => newCommand(cli))
  );
}
```

### Registration Patterns

**No parameters:**
```typescript
vscode.commands.registerCommand('pagemd.cmd', commandHandler)
```

**With CLI wrapper:**
```typescript
vscode.commands.registerCommand('pagemd.cmd', () => commandHandler(cli))
```

**With context:**
```typescript
vscode.commands.registerCommand('pagemd.cmd', () => commandHandler(context))
```

---

## Step 4: Update Documentation

Add to [[reference/Commands|Commands]] page:

```markdown
### PageMD: New Command

**Command:** `pagemd.newCommand`

**Description:** Brief description of what the command does.

**How to use:**
1. Open a Markdown file
2. Run command from Command Palette
3. Expected result

**Parameters:** None

**Output:** Description of output
```

---

## See Also

- [[development/Setup|Setup]] - Development environment
- [[development/Testing|Testing]] - Testing new commands
- [[reference/Commands|Commands]] - Command reference
