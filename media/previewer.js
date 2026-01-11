/**
 * PagedConfig hooks for VS Code webview preview.
 * Based on vscode-ext-paged-media previewer.js pattern.
 */

"use strict";

// Acquire VS Code API IMMEDIATELY at load time - before any other code runs
// This ensures we get the reference before Paged.js or any callbacks execute
// acquireVsCodeApi() can only be called once per webview lifetime
(function initVsCodeApi() {
  if (typeof acquireVsCodeApi === 'function' && !window._pagemdVscodeApi) {
    try {
      window._pagemdVscodeApi = acquireVsCodeApi();
    } catch (e) {
      // Shouldn't happen if we're first, but log for debugging
      console.error('[PageMD] VS Code API acquisition failed:', e.message);
    }
  }
})();

// Helper to get cached API reference
function getVsCodeApi() {
  return window._pagemdVscodeApi;
}

// Store layout info extracted before Paged.js transforms the CSS
let cachedLayoutInfo = null;

if (!window.PagedConfig) {
  // Initialize PagedConfig if not already set
  window.PagedConfig = {
    auto: true,
  };
}

if (!window.PagedConfig.before) {
  // Wait for DOM ready before processing
  let ready = new Promise(function(resolve, reject) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        resolve(document.readyState);
      });
    } else {
      resolve(document.readyState);
    }
  });

  window.PagedConfig.before = async () => {
    await ready;
    // Extract layout info BEFORE Paged.js transforms the CSS
    // (Paged.js removes @page rules and generates its own styles)
    cachedLayoutInfo = extractLayoutInfo();
    console.log('[PageMD] Layout info extracted before Paged.js:', JSON.stringify(cachedLayoutInfo, null, 2));
    setup();
  };
}

if (!window.PagedConfig.after) {
  // Post-render cleanup and notifications
  window.PagedConfig.after = async (flow) => {
    addClassToContentRoots();
    moveTrailingSpaceCharacters();

    // Inject dimension labels if enabled (use cached layout info from before hook)
    if (window.pagemdSettings?.showDimensions &&
        window.pagemdSettings?.highlightMargins &&
        cachedLayoutInfo) {
      const unit = window.pagemdSettings?.dimensionUnit || 'in';
      injectDimensionLabels(cachedLayoutInfo, unit);
    }

    notifyRendered();
  };
}

/**
 * Setup content for Paged.js rendering.
 */
function setup() {
  const container = document.querySelector(".pagemd-content");

  if (!container) {
    console.warn("PageMD: No .pagemd-content element found");
    return;
  }

  if (window.PagedConfig.content) {
    // Already set by external process (e.g., Puppeteer)
    return;
  }

  // Move styles to head for proper loading
  moveStylesToHead(container);

  // Configure Paged.js - render INTO the container (don't remove it)
  // This preserves .pagemd-content as wrapper for scroll boundary control
  window.PagedConfig.content = container.innerHTML;
  window.PagedConfig.renderTo = container;

  // Clear the container content (Paged.js will populate it)
  container.innerHTML = '';
}

/**
 * Move style and link tags from body to head.
 * Required for proper CSS loading in webview.
 */
function moveStylesToHead(container) {
  const styles = Array.from(container.querySelectorAll("link[rel='stylesheet'], style"));

  styles.forEach(style => {
    const clone = document.createElement(style.tagName);

    if (style.tagName === "LINK") {
      clone.setAttribute("rel", style.getAttribute("rel"));
      clone.setAttribute("href", style.getAttribute("href"));
    } else if (style.tagName === "STYLE") {
      clone.innerHTML = style.innerHTML;
    }

    document.head.appendChild(clone);
    style.remove();
  });
}

/**
 * Add markdown-body class to each page content div.
 * Preserves styling after pagination.
 */
function addClassToContentRoots() {
  const divs = Array.from(document.querySelectorAll(".pagedjs_page_content > div"));
  divs.forEach(element => {
    if (!element.className.includes("markdown-body")) {
      element.className += " markdown-body";
    }
  });
}

/**
 * Fix trailing spaces in code blocks that span pages.
 * Prevents disappearing spaces at page breaks.
 */
function moveTrailingSpaceCharacters() {
  const codes = Array.from(
    document.querySelectorAll("code[data-split-to]")
  ).filter(e => e.innerText.endsWith(" "));

  codes.forEach(e => {
    const ref = e.dataset["ref"];
    if (!ref) return;

    const chunked = document.querySelectorAll(`code[data-ref="${ref}"]`);

    for (let idx = 1; idx < chunked.length; idx++) {
      const [e0, e1] = [chunked[idx - 1], chunked[idx]];
      const match = e0.innerText.match(/\n? +$/);

      if (match) {
        const trailer = match.input.substr(
          match.index + (match.input[0] === " " ? 0 : 1)
        );
        e0.innerText = e0.innerText.substr(0, match.index);
        e1.innerText = trailer + e1.innerText;
      }
    }
  });
}

/**
 * Default layout info when @page rules cannot be extracted.
 */
function getDefaultLayoutInfo() {
  return {
    pageName: '@page',
    size: { width: '8.5in', height: '11in', name: 'Letter', orientation: 'portrait' },
    margins: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    padding: { top: '0', right: '0', bottom: '0', left: '0' },
    rawCss: 'Letter portrait'
  };
}

/**
 * Extract page layout info from @page CSS rules.
 * Returns structured object with size, margins, padding, orientation.
 */
function extractLayoutInfo() {
  // Search ALL style tags for @page rules (CLI output may not have data-layer attribute)
  const styles = document.querySelectorAll('style');

  // Guard: no styles at all
  if (!styles || styles.length === 0) {
    return getDefaultLayoutInfo();
  }

  const cssText = Array.from(styles).map(s => s.textContent || '').join('\n');

  // Find ALL @page rules - we need the one with actual size/margin declarations
  // Paged.js may inject defaults, so look for the layout-specific rule
  const pageRules = [...cssText.matchAll(/@page\s*{([^}]+)}/g)];

  // Find the best @page rule - prefer ones with:
  // 1. Non-zero margin values (actual layout CSS, not Paged.js defaults)
  // 2. Named sizes (Letter, A4, etc.) or explicit dimensions
  let pageBody = '';
  let bestScore = 0;
  const namedSizes = ['letter', 'a4', 'legal', 'a3', 'a5', 'b5'];

  for (const match of pageRules) {
    const body = match[1];
    let score = 0;

    // Check for non-zero margin (big indicator of actual layout CSS)
    const marginMatch = body.match(/margin:\s*([^;]+)/);
    if (marginMatch) {
      const marginVal = marginMatch[1].trim();
      // Score higher for non-zero margins
      if (marginVal !== '0' && !marginVal.match(/^0\s*$/)) {
        score += 10;
      }
    }

    // Check for named size or explicit dimensions
    const sizeMatch = body.match(/size:\s*([^;]+)/);
    if (sizeMatch) {
      const sizeVal = sizeMatch[1].toLowerCase();
      if (namedSizes.some(s => sizeVal.includes(s))) {
        score += 5;
      }
      if (/[\d.]+\s*(in|mm|cm|pt|px)/i.test(sizeVal)) {
        score += 3;
      }
    }

    // Keep track of best match
    if (score > bestScore) {
      bestScore = score;
      pageBody = body;
    }

    // Fallback: keep last rule with size or margin
    if (score === 0 && bestScore === 0 && (body.includes('size:') || body.includes('margin:'))) {
      pageBody = body;
    }
  }

  // If still no pageBody, use the first @page rule found
  if (!pageBody && pageRules.length > 0) {
    pageBody = pageRules[0][1];
  }

  // Guard: no @page rules found at all
  if (!pageBody && pageRules.length === 0) {
    return getDefaultLayoutInfo();
  }

  // Extract size (e.g., "Letter portrait", "8.5in 11in", "A4")
  const sizeMatch = pageBody.match(/size:\s*([^;]+)/);
  const sizeValue = sizeMatch?.[1]?.trim() || 'Custom';

  // Parse size into dimensions and orientation
  const sizeInfo = parseSizeValue(sizeValue);

  // Extract margin (single value or 4 values)
  const marginMatch = pageBody.match(/margin:\s*([^;]+)/);
  const marginValue = marginMatch?.[1]?.trim() || '0';
  const margins = parseMarginValue(marginValue);

  // Extract padding if present
  const paddingMatch = pageBody.match(/padding:\s*([^;]+)/);
  const paddingValue = paddingMatch?.[1]?.trim() || '0';
  const padding = parseMarginValue(paddingValue);

  return {
    pageName: '@page',
    size: sizeInfo,
    margins: margins,
    padding: padding,
    rawCss: sizeValue
  };
}

/**
 * Parse CSS size value into structured object.
 */
function parseSizeValue(sizeValue) {
  const knownSizes = {
    'letter': { width: '8.5in', height: '11in', name: 'Letter' },
    'a4': { width: '210mm', height: '297mm', name: 'A4' },
    'legal': { width: '8.5in', height: '14in', name: 'Legal' },
    'a3': { width: '297mm', height: '420mm', name: 'A3' },
    'a5': { width: '148mm', height: '210mm', name: 'A5' },
    'b5': { width: '176mm', height: '250mm', name: 'B5' }
  };

  const lower = sizeValue.toLowerCase();
  const isLandscape = lower.includes('landscape');
  const orientation = isLandscape ? 'landscape' : 'portrait';

  // Check for named size
  for (const [key, dims] of Object.entries(knownSizes)) {
    if (lower.includes(key)) {
      return {
        width: isLandscape ? dims.height : dims.width,
        height: isLandscape ? dims.width : dims.height,
        name: dims.name,
        orientation: orientation
      };
    }
  }

  // Try to parse explicit dimensions (e.g., "8.5in 11in")
  const dimMatch = sizeValue.match(/([\d.]+\s*(?:in|mm|cm|pt|px))\s+([\d.]+\s*(?:in|mm|cm|pt|px))/i);
  if (dimMatch) {
    return {
      width: dimMatch[1].replace(/\s/g, ''),
      height: dimMatch[2].replace(/\s/g, ''),
      name: 'Custom',
      orientation: orientation
    };
  }

  return {
    width: 'auto',
    height: 'auto',
    name: sizeValue || 'Custom',
    orientation: orientation
  };
}

/**
 * Parse CSS margin/padding value into individual sides.
 * Supports: single value, 2 values (v h), 3 values (top h bottom), 4 values (top right bottom left)
 */
function parseMarginValue(value) {
  const parts = value.split(/\s+/).filter(p => p);

  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  } else if (parts.length === 2) {
    return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  } else if (parts.length === 3) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  } else if (parts.length >= 4) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  }

  return { top: '0', right: '0', bottom: '0', left: '0' };
}

/**
 * Convert a CSS dimension value to the specified unit (in or mm).
 * @param {string} value - CSS value like "0.5in" or "12.7mm"
 * @param {string} toUnit - Target unit: "in" or "mm"
 * @returns {string} Converted value with unit
 */
function convertUnit(value, toUnit) {
  if (!value || value === '0' || value === 'auto') return value;

  const match = value.match(/([\d.]+)\s*(in|mm|cm|pt|px)?/i);
  if (!match) return value;

  const num = parseFloat(match[1]);
  const fromUnit = (match[2] || 'px').toLowerCase();

  // Convert everything to inches first
  let inches;
  switch (fromUnit) {
    case 'in': inches = num; break;
    case 'mm': inches = num / 25.4; break;
    case 'cm': inches = num / 2.54; break;
    case 'pt': inches = num / 72; break;
    case 'px': inches = num / 96; break;
    default: return value;
  }

  // Convert to target unit
  if (toUnit === 'mm') {
    const mm = inches * 25.4;
    return mm.toFixed(1).replace(/\.0$/, '') + 'mm';
  } else {
    return inches.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + 'in';
  }
}

/**
 * Format padding values for display.
 */
function formatPadding(padding, unit) {
  const t = convertUnit(padding.top, unit);
  const r = convertUnit(padding.right, unit);
  const b = convertUnit(padding.bottom, unit);
  const l = convertUnit(padding.left, unit);

  // Check if all sides are the same
  if (t === r && r === b && b === l) {
    return t === '0' ? 'none' : t;
  }
  return `${t} ${r} ${b} ${l}`;
}

/**
 * Inject dimension labels around pages with wrapper elements.
 * Labels are positioned outside page bounds for clean display.
 */
function injectDimensionLabels(layoutInfo, unit) {
  const pages = document.querySelectorAll('.pagedjs_page');

  pages.forEach((page, index) => {
    // Skip if already wrapped
    if (page.parentElement?.classList.contains('pagemd-page-wrapper')) return;

    // Create wrapper for positioning context
    const wrapper = document.createElement('div');
    wrapper.className = 'pagemd-page-wrapper';

    // Insert wrapper and move page into it
    page.parentNode.insertBefore(wrapper, page);
    wrapper.appendChild(page);

    const sz = layoutInfo.size;
    const mg = layoutInfo.margins;

    // Convert dimensions to display unit
    const width = convertUnit(sz.width, unit);
    const height = convertUnit(sz.height, unit);
    const marginTop = convertUnit(mg.top, unit);
    const marginRight = convertUnit(mg.right, unit);
    const marginBottom = convertUnit(mg.bottom, unit);
    const marginLeft = convertUnit(mg.left, unit);

    // Create labels container (outside page, positioned absolutely)
    const labelsHtml = `
      <div class="pagemd-label pagemd-label-top">
        <span class="pagemd-dim">${width}</span>
      </div>
      <div class="pagemd-label pagemd-label-left">
        <span class="pagemd-dim">${height}</span>
        <span class="pagemd-margin">margin: ${marginLeft}</span>
      </div>
      <div class="pagemd-label pagemd-label-right">
        <span class="pagemd-margin">margin: ${marginRight}</span>
      </div>
      <div class="pagemd-label pagemd-label-bottom">
        <span class="pagemd-margin">top: ${marginTop} | bottom: ${marginBottom}</span>
      </div>
      <div class="pagemd-info-panel">
        <span class="pagemd-info-item">${layoutInfo.pageName}</span>
        <span class="pagemd-info-sep">|</span>
        <span class="pagemd-info-item">${sz.name}</span>
        <span class="pagemd-info-sep">|</span>
        <span class="pagemd-info-item">${sz.orientation}</span>
        ${hasPadding(layoutInfo.padding) ? `<span class="pagemd-info-sep">|</span><span class="pagemd-info-item">padding: ${formatPadding(layoutInfo.padding, unit)}</span>` : ''}
      </div>
    `;

    // Insert labels into wrapper (after page)
    wrapper.insertAdjacentHTML('beforeend', labelsHtml);
  });
}

/**
 * Check if padding has any non-zero values.
 */
function hasPadding(padding) {
  return padding && (padding.top !== '0' || padding.right !== '0' ||
                      padding.bottom !== '0' || padding.left !== '0');
}

/**
 * Notify VS Code extension that rendering is complete.
 */
function notifyRendered() {
  const vscode = getVsCodeApi();
  vscode.postMessage({
    type: 'rendered',
    pageCount: document.querySelectorAll('.pagedjs_page').length
  });
}
