# Testing

Testing and debugging procedures for the extension.

---

## Contents

- [Manual Testing](#manual-testing)
- [Debugging](#debugging)
- [Output Panel](#output-panel)
- [Test Workflow](#test-workflow)

---

## Manual Testing

1. Press `F5` to launch Extension Development Host
2. Open a Markdown file
3. Test each command

### Commands to Test

| Command | Expected Result |
|---------|----------------|
| `PageMD: Export to PDF` | PDF created in output directory |
| `PageMD: Export Document...` | Quick pick shows format options |
| `PageMD: Open Paged Preview` | Preview panel opens with pagination |
| `PageMD: Select Profile` | Quick pick shows available profiles |
| `PageMD: Validate Document` | Diagnostics appear for invalid frontmatter |
| `PageMD: Inspect Document` | Output panel shows resolved configuration |
| `PageMD: Create Document...` | Quick pick shows document types |

---

## Debugging

1. Set breakpoints in `src/` files
2. Press `F5` to launch with debugger attached
3. Trigger commands to hit breakpoints

### Breakpoint Locations

| File | Purpose |
|------|---------|
| `extension.ts` | Command registration, activation |
| `commands/*.ts` | Command execution logic |
| `providers/preview-panel.ts` | Preview panel behavior |
| `utils/cli-wrapper.ts` | CLI subprocess calls |

---

## Output Panel

View extension logs:

1. `View` → `Output`
2. Select "PageMD" from dropdown

### What to Look For

- CLI command execution logs
- CLI stdout/stderr output
- Error messages from CLI wrapper
- Preview panel initialization logs

---

## Test Workflow

### Quick Iteration

1. Make changes to source files
2. Press `Ctrl+Shift+F5` to reload Extension Development Host
3. Test changes immediately

### Full Test Cycle

1. Make changes
2. Run linter: `npm run lint`
3. Type check: `npm run typecheck`
4. Build: `npm run bundle`
5. Launch Extension Development Host: `F5`
6. Test all affected commands

---

## See Also

- [[development/Debugging|Debugging]] - Advanced debugging techniques
- [[development/Setup|Setup]] - Development environment
- [[Troubleshooting]] - Common issues and solutions
