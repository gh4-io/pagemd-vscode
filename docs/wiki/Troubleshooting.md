# Troubleshooting

Common issues and solutions for the PageMD VS Code extension.

---

## Contents

- [CLI Resolution](#cli-resolution)
  - [CLI Not Found](#cli-not-found)
  - [Wrong CLI Version](#wrong-cli-version)
  - [CLI Falls Back to npx](#cli-falls-back-to-npx-developer-issue)
  - [Bundled CLI Can't Find Profiles](#bundled-cli-cant-find-profiles-developer-issue)
- [Preview Issues](#preview-issues)
  - [Preview is Blank](#preview-is-blank)
  - [Preview Shows Raw HTML](#preview-shows-raw-html)
  - [Preview Doesn't Update](#preview-doesnt-update)
  - [VS Code Styles Bleeding Into Document](#vs-code-styles-bleeding-into-document)
  - [Margins Not Visible](#margins-not-visible)
  - [Pages Not Centered](#pages-not-centered)
  - [Two-Column Book Layout Not Working](#two-column-book-layout-not-working)
  - [Cannot Scroll to See Full Page](#cannot-scroll-to-see-full-page)
  - [Scroll Margins at High Zoom](#scroll-margins-at-high-zoom)
  - [Dimension Labels Cut Off](#dimension-labels-cut-off)
  - [Background Doesn't Cover Full Area](#background-doesnt-cover-full-area)
  - [Browser View Shows Blank Page](#browser-view-shows-blank-page)
  - [Paged.js Toggle Button Not Visible](#pagedjs-toggle-button-not-visible)
  - [External Scripts Not Running in Browser View](#external-scripts-not-running-in-browser-view)
  - [Browser View Styles Missing](#browser-view-styles-missing)
  - [Custom CSS position:fixed Not Working](#custom-css-positionfixed-not-working)
- [Export Problems](#export-problems)
  - [Non-Headless Mode for Debugging](#non-headless-mode-for-debugging)
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

### Bundled CLI Can't Find Profiles (Developer Issue)

**Symptom:** Extension preview fails with "Profile not found: standard_letter"

**Log output:**
```
level=WARN;msg="Profiles not found at expected location";data={"expected":"...\.vscode\\profiles","derived":"...\.vscode"}
```

**Root Cause:**

The bundled CLI's `getPackageRootFromCli()` function assumed running from `apps/cli/src/` structure. The esbuild bundle places CLI in `bin/` with resources alongside it.

| Mode | Resources Location |
|------|--------------------|
| Source | 3 levels up from CLI (`apps/cli/src/` → `project/`) |
| Bundled | Same directory as CLI (`bin/profiles/`, `bin/templates/`, etc.) |

**Fix Location:** `@pagemd/core/path-resolver.js` - `getPackageRootFromCli()` function

The function now auto-detects bundled mode by checking if `profiles/` exists at the same level as `__dirname`.

**After Fixing:** Rebuild and repackage:

```bash
cd pagemd-vscode
npm run bundle-cli:prod
cd bin && npm install && cd ..
npm run bundle:prod
npm run package
```

**Note:** This is separate from the "CLI Falls Back to npx" issue above. That issue is about the extension finding the CLI; this issue is about the CLI finding its own resources.

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

1. **Check refresh mode setting:**

   ```json
   "pagemd.previewRefresh": "onSave"  // Or "live" for real-time updates
   ```

2. **Manually refresh preview** (Command Palette → "Refresh Preview")

3. **Manually reopen preview** (close and rerun command)

---

### VS Code Styles Bleeding Into Document

**Symptom:** Document text appears in wrong font, code blocks have VS Code colors, links use VS Code theme colors instead of document styles.

**Cause:** VS Code injects default webview styles in `@layer vscode-default`. If document CSS doesn't properly override these, VS Code styling shows through.

**Solutions:**

1. **Ensure base.css covers all VS Code properties:**

   VS Code sets properties on these elements that must be explicitly overridden:
   - `body`: font-family, font-size, font-weight, color, margin, padding
   - `code`: font-family, color, background-color, padding, border-radius
   - `a:hover`: color
   - `blockquote`: background, border-color
   - `video`: max-width, max-height

2. **Check CSS layer order in DevTools:**

   Open DevTools in preview (`Ctrl+Shift+I`), select an affected element, look at Styles panel. Layers should appear in this order (lowest to highest priority):
   - `vscode-default`
   - `pagemd-preview`
   - `base`
   - `primary`
   - `layout` → `syntax` → `profile` → `frontmatter`

3. **Verify `!important` injection is working:**

   In DevTools Styles panel, document styles for font-family, font-size, color, etc. should show `!important` flag.

4. **Check for unlayered CSS:**

   If Paged.js generated CSS appears unlayered in DevTools, it will override all layered CSS. This is expected - the `!important` hack compensates for this.

**Technical Details:** See [[general/Preview-Architecture#css-cascade-architecture]] for full documentation.

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

### Scroll Margins at High Zoom

**Behavior:** The preview automatically adds 60px scroll margins on both left and right sides when content is zoomed. This ensures:

- Equal spacing on both edges when scrolling at high zoom (200%+)
- Pages remain centered at normal zoom levels
- Full content visibility - can scroll to see all content edges

**Debug Visualization:**

When `pagemd.debugMode` is enabled, scroll boundary spacers are visible:

| Element | Color | Description |
|---------|-------|-------------|
| Left spacer | Magenta | Left scroll boundary (60px) |
| Right spacer | Cyan | Right scroll boundary (60px) |

**Technical Implementation:**

The preview uses DOM spacer elements injected around `.pagedjs_pages`:

```
.pagemd-content (inline-flex container)
  ├── .pagemd-scroll-spacer-left (60px)
  ├── .pagedjs_pages (zoomed content, centered via margin auto)
  └── .pagemd-scroll-spacer-right (60px)
```

This approach works because:
- Real DOM elements participate in scroll area calculation
- `inline-flex` with `min-width: 100%` shrink-wraps when content overflows, fills viewport when content fits
- `margin: 0 auto` on `.pagedjs_pages` centers content between spacers

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

### Browser View Shows Blank Page

**Symptom:** Browser view panel opens but displays empty/blank content

**Causes:**

1. Content still loading
2. CSP (Content Security Policy) blocking required resources
3. Styles not inline or from same origin

**Solutions:**

1. **Wait for content to load** - browser view may take a moment to render

2. **Check DevTools console:**

   Right-click in preview → "Inspect Element" → Console tab
   Look for CSP violation errors

3. **Verify styles are inline:**

   Browser view requires inline styles or blob/data URIs. External stylesheet links will be blocked by CSP.

4. **Check Output panel:**

   `View` → `Output` → select "PageMD"

---

### Paged.js Toggle Button Not Visible

**Symptom:** Cannot find the Paged.js toggle button (📄) to switch between paged and unpaged views

**Causes:**

Button only appears in browser view mode, not in paged view mode

**Solution:**

**Switch to browser view first:**

1. Click the globe button (🌐) in preview toolbar to switch to browser view mode
2. The Paged.js toggle button (📄) will appear in browser view
3. Click toggle button to switch between paged and unpaged rendering

**Toolbar flow:**

```
Paged View (default) → [🌐 Browser] → Browser View → [📄 Paged.js Toggle] → Toggle on/off
```

---

### External Scripts Not Running in Browser View

**Symptom:** JavaScript from external files doesn't execute in browser view

**Cause:**

Intentional security restriction - browser view blocks external scripts via CSP (Content Security Policy)

**Solution:**

**This is by design for security.** External scripts cannot run in browser view mode.

If you need interactive JavaScript:
- Use the CLI to build HTML with full JavaScript support
- Open the built HTML file in a regular browser

**Note:** Inline scripts in the HTML may work, but external script files will always be blocked.

---

### Browser View Styles Missing

**Symptom:** Formatting and colors don't appear correctly in browser view

**Cause:**

CSP restricts external stylesheets from loading

**Solutions:**

1. **Verify styles are inline:**

   Browser view requires styles to be embedded in the HTML document, not linked externally

2. **Check for external stylesheet links:**

   External `<link rel="stylesheet">` elements will be blocked

3. **Use blob/data URIs:**

   If styles must be separate, they need to be loaded via blob or data URIs, not external URLs

**Technical Note:** The browser view uses a strict CSP that blocks external resources to prevent security issues. All styling must be inline or from same-origin sources.

---

### Custom CSS position:fixed Not Working

**Symptom:** Elements styled with `position: fixed` appear in normal flow instead of fixed to viewport

**Cause:**

Paged.js transforms all CSS from `<style>` tags and linked stylesheets during pagination. As part of this transformation, it removes `position: fixed` because fixed positioning conflicts with paginated document flow.

**Technical Details:**

| What Happens | Why |
|--------------|-----|
| Paged.js parses all `<style>` tags | Needs to process `@page` rules and page-breaking CSS |
| CSS is rewritten to `<style data-pagedjs-inserted-styles>` | Creates new processed stylesheet |
| `position: fixed` is stripped | Fixed elements would overlap paginated pages |
| Original stylesheets removed | Replaced by processed version |

**Evidence in DevTools:**

If you inspect the page and look at the `<style data-pagedjs-inserted-styles="true">` tag, you'll see your class exists but the `position: fixed` property is missing.

**Solution:**

Use inline styles on the element instead of CSS classes:

```html
<!-- This gets stripped by Paged.js -->
<style>
.my-fixed-element { position: fixed; bottom: 20px; right: 20px; }
</style>

<!-- This works - inline styles are not processed -->
<div class="my-fixed-element" style="position: fixed; bottom: 20px; right: 20px;">
  Fixed content
</div>
```

**Why Inline Styles Work:**

- Paged.js only processes CSS in `<style>` tags and `<link>` stylesheets
- Element `style=""` attributes are NOT parsed or modified
- The browser applies inline styles after Paged.js finishes

**Note:** `!important` does NOT help in this case because Paged.js removes the property entirely - it doesn't override it. There's no cascade competition; the property simply doesn't exist in the processed CSS.

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

   For PDF export:
   ```json
   "pagemd.pdfTimeout": 120000  // 2 minutes
   ```

   For preview panel:
   ```json
   "pagemd.previewTimeout": 120000  // 2 minutes
   ```

2. **Simplify document** for testing

3. **Check resources:** Large images can slow rendering

---

### Non-Headless Mode for Debugging

**Purpose:** Keep browser visible after PDF generation for debugging CSS/layout issues.

**Enable:**
```json
"pagemd.headless": false
```

**Behavior:**
- PDF renders normally
- **Tab stays open** for inspection (use DevTools F12)
- **Browser window remains** visible (orphaned process)
- **CLI process exits cleanly** (no timeout)
- Message in output: `📋 Browser left open for inspection. Close it manually when done.`

**When to Use:**
- Debugging CSS layout issues
- Inspecting Paged.js output
- Checking margin/page-break behavior
- Diagnosing rendering problems

**Close browser manually** when done - it won't close automatically.

**Technical Note:** The browser becomes an orphaned process because puppeteer-core's `disconnect()` releases the WebSocket connection but doesn't terminate the browser. This is intentional - it allows inspection without blocking the extension.

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

1. **Use `onSave` instead of `live` mode:**

   ```json
   "pagemd.previewRefresh": "onSave"
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

**Error Message Format:**

Error popups show clean, user-friendly messages extracted from CLI output. Full details (timestamps, log metadata, JSON data) are preserved in the Output panel.

**Example:**

| Popup Message | Output Panel |
|---------------|--------------|
| `duplicated mapping key at line 78` | Full logger output with timestamps, [ERROR] tags, JSON objects, stack traces |

**To see full details:** Click the "Show Output" button on any error popup to open the Output panel with complete diagnostic information.

**Technical Note:** The extension extracts the `✓ Success:` and `✗ Failed:` messages from CLI output for popups. This is a temporary solution; future versions will use direct API imports for structured error objects.

### Debug Artifacts

With debug mode enabled, check `debug/` folder (next to output) for:

| File | Contents |
|------|----------|
| `{name}.paged.html` | HTML snapshot after Paged.js processing |
| `{name}.screenshot.png` | Full page screenshot |

**Example:** Building `report.md` with debug mode creates:
```
output/
├── report.pdf
├── report.html
└── debug/
    ├── report.paged.html
    └── report.screenshot.png
```

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
