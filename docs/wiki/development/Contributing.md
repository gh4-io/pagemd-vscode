# Contributing

Guide for contributing to the PageMD VS Code extension.

---

## Contents

- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Development Workflow](#development-workflow)

---

## Code Style

- TypeScript with strict mode
- ESLint for linting
- Consistent naming: `camelCase` for functions, `PascalCase` for classes

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run typecheck
```

---

## Commit Messages

Use conventional commit format:

```
feat: Add new export format
fix: Resolve preview refresh issue
docs: Update command reference
chore: Update dependencies
```

### Prefixes

| Prefix | Purpose |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `chore:` | Maintenance |
| `refactor:` | Code restructure |
| `test:` | Test additions/changes |

---

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`feat/new-feature`)
3. Make changes with tests
4. Update documentation
5. Submit PR with description

### PR Description Template

```markdown
## What Changed

Brief summary of changes.

## Why

Explanation of motivation and context.

## How to Test

1. Step 1
2. Step 2
3. Expected result
```

---

## Issue Reporting

Include in bug reports:

- VS Code version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Output panel logs

### Issue Template

```markdown
**Environment**
- VS Code: [version]
- Extension: [version]
- OS: [Windows/Linux/macOS]

**Steps to Reproduce**
1. [Step 1]
2. [Step 2]

**Expected Behavior**
[What should happen]

**Actual Behavior**
[What actually happens]

**Logs**
[Output panel logs]
```

---

## Development Workflow

1. Clone repository
2. `npm install`
3. Make changes
4. `npm run lint` (fix issues)
5. `npm run typecheck` (verify types)
6. Press `F5` (test in Extension Development Host)
7. Commit with conventional message
8. Push and create PR

---

## See Also

- [[development/Setup|Setup]] - Development environment setup
- [[development/Testing|Testing]] - Testing procedures
- [Contributing Guidelines](https://github.com/gh4-io/pagemd-vscode/blob/main/CONTRIBUTING.md)
