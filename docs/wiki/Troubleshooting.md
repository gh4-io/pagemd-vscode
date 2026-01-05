# Troubleshooting

Common issues and solutions for the PageMD VS Code extension.

---

## Contents

- [CLI Resolution](#cli-resolution)
  - [CLI Not Found](#cli-not-found)
  - [Wrong CLI Version](#wrong-cli-version)
  - [CLI Falls Back to npx](#cli-falls-back-to-npx-developer-issue)
- [Preview Issues](#preview-issues)
  - [Preview is Blank](#preview-is-blank)
  - [Preview Shows Raw HTML](#preview-shows-raw-html)
  - [Preview Doesn't Update](#preview-doesnt-update)
  - [Margins Not Visible](#margins-not-visible)
  - [Pages Not Centered](#pages-not-centered)
  - [Two-Column Book Layout Not Working](#two-column-book-layout-not-working)
  - [Cannot Scroll to See Full Page](#cannot-scroll-to-see-full-page)
  - [Dimension Labels Cut Off](#dimension-labels-cut-off)
  - [Background Doesn't Cover Full Area](#background-doesnt-cover-full-area)
- [Export Problems](#export-problems)
- [Validation Errors](#validation-errors)
- [Performance](#performance)
- [Debugging](#debugging)

---

## CLI Resolution

### CLI Not Found

**Symptom:** "CLI not found" error when running commands

**Causes:**

1. PageMD CLI not installed
2. CLI not in expected location
3. Node.js not installed

**Solutions:**

1. **Check CLI resolution order:**

   The extension searches in this order:

   | Priority | Location | Description |
   |----------|----------|-------------|
   | 1 | `pagemd.cliPath` setting | User-configured custom path |
   | 2 | `<extension>/bin/apps/cli/src/index.js` | Bundled CLI (VSIX distribution) |
   | 3 | `<extension>/../pagemd/apps/cli/src/index.js` | Sibling CLI (F5 development) |
   | 4 | `<workspace>/node_modules/.bin/pagemd` | Workspace npm install |
   | 5 | `npx pagemd` | Fallback (slow, downloads each time) |

2. **Install globally:**

   ```bash
   npm install -g pagemd
   ```

3. **Set custom path:**

   ```json
   "pagemd.cliPath": "/path/to/pagemd"
   ```

4. **Verify Node.js:**

   ```bash
   node --version  # Should be 20+
   ```

---

### Wrong CLI Version

**Symptom:** Features don't work as expected

**Solution:**

Check CLI version in Output panel and update if needed:

```bash
npm update -g pagemd
```

---

### CLI Falls Back to npx (Developer Issue)

**Symptom:** Extension uses `npx pagemd` instead of bundled or sibling CLI, causing slow performance

**Diagnosis:**

Check Output panel (`View` → `Output` → "PageMD"):

```
[PageMD] Falling back to npx pagemd  ← This indicates path resolution failed
```

**Root Cause:**

The `__dirname` path resolution in `cli-wrapper.ts` is incorrect. This is a **known regression** that occurs when developers incorrectly assume esbuild preserves directory structure.

**Technical Details:**

| Assumption | Reality |
|------------|---------|
| esbuild creates `out/utils/cli-wrapper.js` | esbuild bundles to single `out/extension.js` |
| `__dirname` = `out/utils/` | `__dirname` = `out/` |
| `path.resolve(__dirname, '..', '..')` gets extension root | Goes TWO levels up (wrong!) |
| | `path.resolve(__dirname, '..')` gets extension root (correct) |

**Correct Code:**

```typescript
// CORRECT: esbuild bundles to out/extension.js, so __dirname = 'out/'
const extensionRoot = path.resolve(__dirname, '..');
```

**Wrong Code (DO NOT USE):**

```typescript
// WRONG: Assumes TypeScript compilation preserving out/utils/ structure
const extensionRoot = path.resolve(__dirname, '..', '..');
```

**Verify Fix:**

After fixing, Output panel should show:

```
[PageMD] Using bundled CLI: /path/to/extension/bin/apps/cli/src/index.js
```

or for F5 development:

```
[PageMD] Using local CLI: /path/to/pagemd/apps/cli/src/index.js
```

---

## Preview Issues

### Preview is Blank

**Symptom:** Preview panel opens but shows nothing

**Causes:**

1. CLI failed to generate HTML
2. Paged.js error
3. Invalid Markdown/frontmatter

**Solutions:**

1. **Check Output panel:**

   `View` → `Output` → select "PageMD"

2. **Enable debug mode:**

   ```json
   "pagemd.debugMode": true
   ```

3. **Verify CLI works:**

   ```bash
   pagemd build yourfile.md -o html --stdout
   ```

---

### Preview Shows Raw HTML

**Symptom:** HTML tags visible instead of rendered content

**Solution:**

This indicates Paged.js failed to load. Check:

1. Extension installed correctly (reinstall if needed)
2. `media/paged.polyfill.js` exists in extension folder

---

### Preview Doesn't Update

**Symptom:** Changes don't appear in preview

**Solutions:**

1. **Check auto-refresh setting:**

   ```json
   "pagemd.autoRefreshPreview": true
   ```

2. **Check trigger mode:**

   ```json
   "pagemd.previewTrigger": "onSave"  // Try "onType"
   ```

3. **Manually reopen preview** (close and rerun command)

---

### Margins Not Visible

**Symptom:** Margin highlighting doesn't appear

**Solutions:**

1. **Enable highlighting:**

   ```json
   "pagemd.preview.highlightMargins": true
   ```

2. **Check profile CSS:** Profile may override margin boxes

3. **Verify @page rules exist** in profile's layout CSS

---

### Pages Not Centered

**Symptom:** Pages align to the left instead of center

**Solution:**

Pages should center automatically. If not, check for CSS conflicts in your profile that override the default flexbox/grid centering.

---

### Two-Column Book Layout Not Working

**Symptom:** Pages stack vertically instead of side-by-side in book spread mode

**Solutions:**

1. **Enable two-column mode:**

   ```json
   "pagemd.preview.twoColumnSpread": true
   ```

2. **Configure first page position:**

   ```json
   "pagemd.preview.firstPagePosition": "right"  // or "left"
   ```

   | Setting | Layout (5 pages) |
   |---------|------------------|
   | `left` | `[1][2]` `[3][4]` `[5][ ]` |
   | `right` | `[ ][1]` `[2][3]` `[4][5]` |

3. **Adjust spread gap** (vertical space between spread rows):

   ```json
   "pagemd.preview.spreadGap": "15mm"
   ```

---

### Cannot Scroll to See Full Page

**Symptom:** Horizontal scrollbar appears but can't scroll to see entire page width

**Causes:**

1. Window narrower than page content
2. Dimension labels cut off at edges

**Solutions:**

The preview should allow horizontal scrolling automatically. If content is clipped:

1. **Reduce zoom level** to fit content
2. **Check for CSS conflicts** in profile
3. **Restart preview** (close and reopen)

---

### Dimension Labels Cut Off

**Symptom:** Margin labels on left/right edges are partially visible

**Solution:**

Scroll horizontally to see full labels. The preview adds 100px padding on each side for labels, but very narrow windows may still require scrolling.

---

### Background Doesn't Cover Full Area

**Symptom:** White gaps visible at edges when scrolling

**Solution:**

The gray background should extend to all edges. If gaps appear:

1. **Scroll to verify** - background follows scroll
2. **Check zoom level** - extreme zoom may reveal edges
3. **Refresh preview** - close and reopen

---

## Export Problems

### Export Times Out

**Symptom:** "Timeout" error during PDF export

**Causes:**

1. Large document
2. Complex CSS/layout
3. Slow system

**Solutions:**

1. **Increase timeout:**

   ```json
   "pagemd.pdfTimeout": 120000  // 2 minutes
   ```

2. **Simplify document** for testing

3. **Check resources:** Large images can slow rendering

---

### Browser Not Found

**Symptom:** "Chrome/Chromium not found" error

**Solutions:**

1. **Install Chrome:** PageMD prefers system Chrome

2. **Let Puppeteer install Chromium:**

   The CLI should auto-install Chromium on first run

3. **Set browser path** (if using custom Chrome):

   ```bash
   export PAGEMD_BROWSER_PATH="/path/to/chrome"
   ```

---

### Export Creates Empty PDF

**Symptom:** PDF is 0 bytes or blank pages

**Causes:**

1. Rendering error
2. CSS hides content
3. Page size mismatch

**Solutions:**

1. **Enable debug mode** and check artifacts:

   ```json
   "pagemd.debugMode": true
   ```

2. **Check debug HTML** in output folder

3. **Verify profile** has valid layout CSS

---

### Wrong Output Location

**Symptom:** Can't find exported file

**Solutions:**

1. **Check `outputPath` setting:**

   ```json
   "pagemd.outputPath": ""  // Empty = same as source
   ```

2. **Look in source directory** by default

3. **Check Output panel** for exact path

---

## Validation Errors

### Frontmatter Validation Fails

**Symptom:** Squiggles in editor, validation errors

**Solutions:**

1. **Check required fields** for your profile

2. **Verify YAML syntax:**

   ```yaml
   ---
   title: My Document
   document_id: DOC-001
   ---
   ```

3. **Check field types** (strings, numbers, arrays)

---

### Profile Not Found

**Symptom:** "Profile not found" error

**Solutions:**

1. **Check profile name** matches filename (without extension)

2. **Check profile locations:**
   - Workspace: `.pagemd/profiles/`
   - Project: `profiles/`

3. **Use `list profiles`:**

   ```bash
   pagemd list profiles
   ```

---

## Performance

### Slow Preview Refresh

**Solutions:**

1. **Use `onSave` instead of `onType`:**

   ```json
   "pagemd.previewTrigger": "onSave"
   ```

2. **Reduce document size** for testing

3. **Disable dimension labels:**

   ```json
   "pagemd.preview.showDimensions": false
   ```

---

### High Memory Usage

**Solutions:**

1. **Close unused preview panels**

2. **Restart VS Code** periodically

3. **Check for large embedded images**

---

## Debugging

### Enable Debug Mode

```json
"pagemd.debugMode": true
```

Debug mode:

- Saves debug artifacts
- Shows verbose logging in Output panel
- Preserves intermediate files

### Check Output Panel

1. `View` → `Output`
2. Select "PageMD" from dropdown
3. Review messages for errors

### Debug Artifacts

With debug mode enabled, check output folder for:

| File | Contents |
|------|----------|
| `*.debug.html` | Pre-pagination HTML |
| `*.paged.html` | Post-pagination HTML |
| `*.debug.png` | Screenshot |
| `*.log` | Render log |

### CLI Verbose Mode

Test CLI directly:

```bash
PAGEMD_LOG_LEVEL=DEBUG pagemd build file.md
```

---

## Getting Help

### Issue Reporting

Include:

1. VS Code version
2. Extension version
3. Node.js version
4. Operating system
5. Steps to reproduce
6. Output panel logs
7. Sample document (if possible)

### Support Channels

- [GitHub Issues](https://github.com/gh4-io/pagemd-vscode/issues)
- [PageMD CLI Issues](https://github.com/gh4-io/pagemd/issues)

---

## See Also

- [[Installation]] - Setup guide
- [[Settings]] - Configuration reference
- [[Preview]] - Preview features
