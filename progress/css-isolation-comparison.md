# CSS Isolation Approaches Comparison

**Goal:** Prevent VS Code's injected CSS from contaminating PageMD document rendering.

**Problem:** VS Code injects styles into webviews that override document fonts, colors, and layout. The `!important` hack (commit `6937f98`) partially works but is fragile.

---

## Branch: `gh4-io/feature/css-isolation-iframe`

**Approach:** Render document in an isolated iframe with its own document context.

**Status:** Blocked by CSP

### What Was Tried

1. **Blob URL iframe** (`d61f2e2`)
   - Create blob URL from HTML string, set as iframe.src
   - **Result:** Opaque origin - scripts from webview URIs blocked

2. **srcdoc attribute** (stashed)
   - Use iframe.srcdoc instead of blob URL
   - **Result:** iframe inherits parent CSP, scripts blocked

3. **Inlined scripts** (committed `88842fd`)
   - Read script files, embed directly in HTML
   - **Result:** Still blocked - srcdoc inherits parent CSP requiring nonces

### Blockers

- VS Code enforces strict CSP with session-unique nonces
- Blob URLs create opaque origin (can't access webview resources)
- srcdoc iframes inherit parent CSP (need nonces we can't provide)
- No way to run Paged.js in iframe without violating CSP

### Files Modified

- `src/providers/preview-panel.ts` - iframe HTML generation
- `media/previewer.js` - iframe initialization
- `media/zoom-toolbar.js` - cross-frame DOM access
- `media/styles/preview-base.css` - iframe positioning

---

## Branch: `gh4-io/feature/css-isolation-shadow-dom`

**Approach:** Use Shadow DOM for style encapsulation without iframe.

**Status:** Implementation complete, needs user testing

### Implementation Summary

1. **preview-panel.ts changes:**
   - Removed `!important` hack (no longer needed)
   - Changed from `.pagemd-content` to `#shadow-host` div
   - Passes document styles and content via `window.pagemdDocumentStyles` and `window.pagemdDocumentContent`
   - Escapes `</` in JSON to prevent script termination

2. **previewer.js rewritten:**
   - Creates shadow root on `#shadow-host` with `attachShadow({ mode: 'open' })`
   - Injects document styles and content into shadow DOM
   - Configures Paged.js to render inside shadow DOM
   - Dynamically loads Paged.js after shadow DOM is ready
   - Exposes `window.pagemdGetShadowRoot()` for zoom-toolbar access

3. **zoom-toolbar.js updated:**
   - Added `getShadowRoot()`, `shadowQuery()`, `shadowQueryAll()` helpers
   - All queries for `.pagedjs_pages`, `.pagedjs_page`, `.pagemd-content` now use shadow DOM
   - View toggle hides/shows `#shadow-host` instead of `.pagemd-content`

4. **preview-base.css updated:**
   - Removed VS Code font reset hacks (shadow DOM handles isolation)
   - Added `#shadow-host` styles for positioning

### CSP Fix Applied

**Problem:** Dynamically created script elements still need nonces for VS Code CSP.

**Solution:** Capture nonce from `document.currentScript` at load time, apply to dynamically loaded Paged.js:
```javascript
const scriptNonce = document.currentScript?.nonce || '';
// ... later ...
script.nonce = scriptNonce;
```

### Benefits Confirmed

- CSP compatible (scripts use captured nonce)
- Style encapsulation (VS Code CSS can't reach shadow DOM)
- Same origin (Paged.js loads normally)
- Simpler than iframe approach

### Files Modified

- `src/providers/preview-panel.ts` - Shadow host generation
- `media/previewer.js` - Complete rewrite for shadow DOM
- `media/zoom-toolbar.js` - Shadow DOM accessor helpers
- `media/styles/preview-base.css` - Updated for shadow host

---

## Comparison Criteria

| Criterion | Iframe | Shadow DOM |
|-----------|--------|------------|
| CSP compatibility | Blocked | Expected OK |
| Style isolation | Complete | Complete |
| Script isolation | Complete | None (shared) |
| Complexity | High | Medium |
| Paged.js compat | Unknown (blocked) | Unknown |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-09 | Pivot to Shadow DOM | Iframe approach blocked by VS Code CSP |

---

## Next Steps

1. Implement Shadow DOM approach on `gh4-io/feature/css-isolation-shadow-dom`
2. Test Paged.js compatibility with shadow DOM
3. If successful, merge to alpha and close iframe branch
4. If blocked, document findings and evaluate alternatives
