/**
 * Zoom toolbar controller for PageMD preview webview.
 * Handles zoom, book mode, view mode, hand tool, and keyboard shortcuts.
 *
 * State is persisted using VS Code webview state API:
 * - Survives HTML replacement (refresh)
 * - Clears when panel closes (session-only)
 *
 * Note: CSS `zoom` property is used for scaling. This is non-standard but
 * works reliably in VS Code webviews which use Chromium.
 */
(function() {
  'use strict';

  // ============================================================================
  // VS Code API for State Persistence
  // ============================================================================

  /**
   * Get the VS Code API reference.
   * IMPORTANT: acquireVsCodeApi() can only be called ONCE per webview lifetime.
   * previewer.js acquires first and stores in window._pagemdVscodeApi.
   * We reuse that reference here.
   */
  function getVsCodeApi() {
    // Use shared reference from previewer.js (acquired at load time)
    if (window._pagemdVscodeApi) {
      return window._pagemdVscodeApi;
    }
    // Fallback: acquire if previewer.js hasn't loaded yet (shouldn't happen)
    if (typeof acquireVsCodeApi === 'function') {
      try {
        window._pagemdVscodeApi = acquireVsCodeApi();
        return window._pagemdVscodeApi;
      } catch (e) {
        console.warn('[PageMD] VS Code API already acquired elsewhere');
      }
    }
    return null;
  }

  // ============================================================================
  // State Management
  // ============================================================================

  const defaultState = {
    zoomLevel: 100,
    bookMode: false,
    viewMode: 'paged', // 'paged' or 'browser'
    handToolActive: false,
    autoFitEnabled: false
  };

  let state = { ...defaultState };

  /**
   * Load state from VS Code webview state API.
   * Falls back to defaults if no saved state exists.
   */
  function loadState() {
    try {
      const api = getVsCodeApi();
      if (api) {
        const saved = api.getState();
        if (saved) {
          state = { ...defaultState, ...saved };
        }
      }
    } catch (err) {
      console.error('[PageMD] Failed to load state:', err);
    }
  }

  /**
   * Save current state to VS Code webview state API.
   * Called after every state change.
   */
  function saveState() {
    try {
      const api = getVsCodeApi();
      if (api) {
        api.setState({ ...state });
      }
    } catch (err) {
      console.error('[PageMD] Failed to save state:', err);
    }
  }

  // ============================================================================
  // Pure Math Functions (exported for testing)
  // ============================================================================

  /**
   * Clamp value within min/max bounds.
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum bound
   * @param {number} max - Maximum bound
   * @returns {number} Clamped value
   */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Safe parseFloat that handles CSS keywords.
   * @param {string|null|undefined} value - CSS value like "12px", "normal", "auto"
   * @returns {number} Parsed number or 0
   */
  function safePx(value) {
    if (!value || value === 'normal' || value === 'auto' || value === 'none') {
      return 0;
    }
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Calculate zoom level to fit content within available width.
   * @param {number} contentWidth - Width of content at 100% zoom
   * @param {number} availableWidth - Available viewport width
   * @param {number} [proportionalPadding=0.1] - Extra padding as percentage
   * @returns {number} Zoom level (25-400)
   */
  function calculateFitZoom(contentWidth, availableWidth, proportionalPadding) {
    if (proportionalPadding === undefined) proportionalPadding = 0.1;
    if (contentWidth <= 0 || availableWidth <= 0) return 100;
    const totalWidth = contentWidth * (1 + proportionalPadding);
    const zoom = Math.floor((availableWidth / totalWidth) * 100);
    return clamp(zoom, 25, 400);
  }

  // ============================================================================
  // Zoom Controls
  // ============================================================================

  /**
   * Update zoom display and apply CSS zoom to pages container.
   */
  function updateZoom() {
    try {
      const pages = document.querySelector('.pagedjs_pages');
      if (pages) {
        // Use CSS zoom instead of transform - properly affects layout and scrollbars
        pages.style.zoom = (state.zoomLevel / 100);
        // Clear any transform that might be set
        pages.style.transform = 'none';
      }
      const zoomDisplay = document.getElementById('zoom-level');
      if (zoomDisplay && zoomDisplay.tagName !== 'INPUT') {
        zoomDisplay.textContent = state.zoomLevel + '%';
      }
      // Adjust scroll boundary AFTER browser repaints (timing critical)
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          adjustScrollBoundary();
        });
      });
    } catch (err) {
      console.error('[PageMD] Failed to update zoom:', err);
    }
  }

  /**
   * Adjust scroll boundary for zoomed content using DOM spacer elements.
   *
   * ALWAYS adds spacers to ensure consistent scroll boundaries at all zoom levels.
   * Spacers extend scroll area with equal padding (60px) on both sides.
   *
   * Spacer visibility: magenta/cyan when debugMode active, transparent otherwise
   */
  function adjustScrollBoundary() {
    try {
      const content = document.querySelector('.pagemd-content');
      const pages = document.querySelector('.pagedjs_pages');

      if (!content || !pages) {
        return;
      }

      const scrollPadding = 60;

      // Check if debug mode is active via window variable (non-empty string = active)
      const debugLevel = window.pagemdDebugLevel || '';
      const debugMode = !!debugLevel;

      // Use inline-flex so container shrink-wraps to content width (including spacers)
      content.style.display = 'inline-flex';
      content.style.flexDirection = 'row';
      content.style.alignItems = 'flex-start';
      content.style.minWidth = '100%';

      let leftSpacer = content.querySelector('.pagemd-scroll-spacer-left');
      let rightSpacer = content.querySelector('.pagemd-scroll-spacer-right');

      if (!leftSpacer) {
        leftSpacer = document.createElement('div');
        leftSpacer.className = 'pagemd-scroll-spacer-left';
        content.insertBefore(leftSpacer, content.firstChild);
      }

      if (!rightSpacer) {
        rightSpacer = document.createElement('div');
        rightSpacer.className = 'pagemd-scroll-spacer-right';
        content.appendChild(rightSpacer);
      }

      // Spacer styling: visible in debug mode, transparent otherwise
      const leftColor = debugMode ? 'magenta' : 'transparent';
      const rightColor = debugMode ? 'cyan' : 'transparent';
      leftSpacer.style.cssText = `flex: 0 0 ${scrollPadding}px; background: ${leftColor}; min-height: 100px;`;
      rightSpacer.style.cssText = `flex: 0 0 ${scrollPadding}px; background: ${rightColor}; min-height: 100px;`;

      // Center .pagedjs_pages between spacers using auto margins
      pages.style.marginLeft = 'auto';
      pages.style.marginRight = 'auto';

    } catch (err) {
      console.error('[PageMD] Failed to adjust scroll boundary:', err);
    }
  }

  function zoomIn() {
    state.zoomLevel = clamp(state.zoomLevel + 25, 25, 400);
    state.autoFitEnabled = false;
    updateZoom();
    saveState();
  }

  function zoomOut() {
    state.zoomLevel = clamp(state.zoomLevel - 25, 25, 400);
    state.autoFitEnabled = false;
    updateZoom();
    saveState();
  }

  function resetZoom() {
    state.zoomLevel = 100;
    state.autoFitEnabled = false;
    updateZoom();
    saveState();
  }

  function fitToWidth() {
    try {
      const pages = document.querySelector('.pagedjs_pages');
      const page = document.querySelector('.pagedjs_page');
      if (!pages || !page) return;

      // Get available container width (parent viewport)
      const parent = pages.parentElement;
      if (!parent) return;
      const parentStyle = getComputedStyle(parent);
      const availableWidth = parent.clientWidth
        - safePx(parentStyle.paddingLeft)
        - safePx(parentStyle.paddingRight);

      // Get page dimensions (offsetWidth is layout size, unaffected by parent transform)
      const pageWidth = page.offsetWidth;
      if (!pageWidth || pageWidth <= 0) return;

      // Calculate content width based on layout mode
      let contentWidth;
      const pagesStyle = getComputedStyle(pages);

      // Proportional padding: 5% of page width on each side (scales with content)
      const proportionalPadding = pageWidth * 0.10; // 5% * 2 sides = 10% total

      if (state.bookMode) {
        // Book mode: 2 pages + column gap + proportional padding
        const columnGap = safePx(pagesStyle.columnGap);
        contentWidth = (pageWidth * 2) + columnGap + proportionalPadding;
      } else {
        // Single mode: page + margins + proportional padding
        const pageStyle = getComputedStyle(page);
        const marginLeft = safePx(pageStyle.marginLeft);
        const marginRight = safePx(pageStyle.marginRight);
        contentWidth = pageWidth + marginLeft + marginRight + proportionalPadding;
      }

      // Safety check before division
      if (contentWidth <= 0 || availableWidth <= 0) return;

      // Calculate zoom to fit (with safety bounds)
      state.zoomLevel = calculateFitZoom(contentWidth, availableWidth, 0);
      state.autoFitEnabled = true;
      updateZoom();
      saveState();
    } catch (err) {
      console.error('[PageMD] Failed to fit to width:', err);
    }
  }

  // ============================================================================
  // Click-to-Edit Zoom Level
  // ============================================================================

  function setupZoomLevelClick() {
    const zoomDisplay = document.getElementById('zoom-level');
    if (!zoomDisplay) return;

    zoomDisplay.addEventListener('click', function handleClick() {
      // Create input to replace span
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'zoom-input';
      input.value = state.zoomLevel;
      input.min = '15';
      input.max = '400';
      input.step = '1';

      // Replace span with input
      zoomDisplay.replaceWith(input);
      input.focus();
      input.select();

      let finalized = false; // Guard against double-finalize

      function finalize() {
        if (finalized) return;
        finalized = true;

        const newZoom = parseInt(input.value, 10);
        if (!isNaN(newZoom)) {
          state.zoomLevel = clamp(newZoom, 15, 400);
          state.autoFitEnabled = false; // Manual entry disables auto-fit
        }
        updateZoom();
        saveState();

        // Recreate the span
        const newSpan = document.createElement('span');
        newSpan.id = 'zoom-level';
        newSpan.className = 'zoom-level';
        newSpan.textContent = state.zoomLevel + '%';
        if (input.parentNode) {
          input.replaceWith(newSpan);
        }

        // Re-attach click listener to new span
        setupZoomLevelClick();
      }

      input.addEventListener('blur', finalize);
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.blur(); // Triggers finalize via blur handler
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finalized = true; // Prevent blur from applying changes
          // Cancel: restore span without changing zoom
          const newSpan = document.createElement('span');
          newSpan.id = 'zoom-level';
          newSpan.className = 'zoom-level';
          newSpan.textContent = state.zoomLevel + '%';
          if (input.parentNode) {
            input.replaceWith(newSpan);
          }
          setupZoomLevelClick();
        }
      });
    });
  }

  // ============================================================================
  // View Mode Toggle (Paged / Browser)
  // ============================================================================

  let currentBlobUrl = null;
  let blobContentHash = null;

  /**
   * Simple hash function for content comparison.
   * @param {string} content - Content to hash
   * @returns {number} Hash value
   */
  function hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Get or create blob URL for browser view.
   * Caches the blob URL and reuses it if content hasn't changed.
   * Wraps HTML with CSP meta tag for security.
   * @returns {string|null} Blob URL or null if no content available
   */
  function getBrowserViewUrl() {
    const rawHtml = window.pagemdRawHtml || '';
    if (!rawHtml) return null;

    const newHash = hashContent(rawHtml);

    // Reuse existing blob URL if content unchanged
    if (currentBlobUrl && blobContentHash === newHash) {
      return currentBlobUrl;
    }

    // Content changed - revoke old blob, create new
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }

    // Wrap HTML with CSP meta tag for security
    const cspMeta = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' blob: data:; script-src \'none\'; style-src \'unsafe-inline\' blob: data:; img-src \'self\' blob: data: https:; font-src \'self\' blob: data:;">';

    // Inject CSP into the HTML head
    const wrappedHtml = rawHtml.replace(
      /<head>/i,
      '<head>' + cspMeta
    );

    const blob = new Blob([wrappedHtml], { type: 'text/html' });
    currentBlobUrl = URL.createObjectURL(blob);
    blobContentHash = newHash;

    return currentBlobUrl;
  }

  /**
   * Cleanup blob URL when content is refreshed.
   * Called when new HTML content arrives.
   */
  function cleanupBlobUrl() {
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
      blobContentHash = null;
    }
  }

  function setControlsEnabled(enabled) {
    const ids = ['zoom-out-btn', 'zoom-in-btn', 'fit-width-btn', 'reset-zoom-btn', 'book-toggle-btn'];
    ids.forEach(function(id) {
      const el = document.getElementById(id);
      if (el) {
        if (enabled) {
          el.removeAttribute('disabled');
        } else {
          el.setAttribute('disabled', 'true');
        }
      }
    });
  }

  function toggleViewMode() {
    try {
      const viewBtn = document.getElementById('view-toggle-btn');
      const content = document.querySelector('.pagemd-content');
      const iframe = document.getElementById('browser-view-iframe');
      const pages = document.querySelector('.pagedjs_pages');

      if (state.viewMode === 'paged') {
        // Switch to browser mode
        state.viewMode = 'browser';
        if (viewBtn) {
          viewBtn.classList.add('active');
        }

        // Hide paged content
        if (content) content.style.display = 'none';
        if (pages) pages.style.display = 'none';

        // Show iframe with raw HTML (using cached blob URL)
        if (iframe) {
          const url = getBrowserViewUrl();
          if (url) {
            iframe.src = url;
            iframe.classList.add('active');
          }
        }

        // Disable zoom and book controls
        setControlsEnabled(false);
      } else {
        // Switch back to paged mode
        state.viewMode = 'paged';
        if (viewBtn) {
          viewBtn.classList.remove('active');
        }

        // Show paged content
        if (content) content.style.display = '';

        // Restore book mode layout if active
        if (pages) {
          if (state.bookMode) {
            pages.style.display = 'grid';
            pages.style.gridTemplateColumns = 'repeat(2, auto)';
            pages.style.columnGap = 'var(--pagemd-spread-gap)';
            pages.style.rowGap = 'var(--pagemd-page-gap)';
            pages.style.justifyContent = 'safe center';
            pages.classList.add('two-column');
          } else {
            pages.style.display = 'flex';
            pages.classList.remove('two-column');
          }
        }

        // Hide iframe (blob URL persists for reuse)
        if (iframe) {
          iframe.classList.remove('active');
          iframe.src = 'about:blank';
        }

        // Re-enable zoom and book controls
        setControlsEnabled(true);

        // Restore scroll boundary layout (inline-flex + spacers)
        adjustScrollBoundary();
      }
      saveState();
    } catch (err) {
      console.error('[PageMD] Failed to toggle view mode:', err);
    }
  }

  // ============================================================================
  // Book Mode Toggle (2-column spread)
  // ============================================================================

  function toggleBookMode() {
    try {
      if (state.viewMode !== 'paged') return; // Only works in paged mode

      const bookBtn = document.getElementById('book-toggle-btn');
      const pages = document.querySelector('.pagedjs_pages');

      state.bookMode = !state.bookMode;

      if (state.bookMode) {
        if (bookBtn) bookBtn.classList.add('active');
        if (pages) {
          pages.style.display = 'grid';
          pages.style.gridTemplateColumns = 'repeat(2, auto)';
          pages.style.columnGap = 'var(--pagemd-spread-gap)';
          pages.style.rowGap = 'var(--pagemd-page-gap)';
          pages.style.justifyContent = 'safe center';
          pages.classList.add('two-column');
        }
      } else {
        if (bookBtn) bookBtn.classList.remove('active');
        if (pages) {
          pages.style.display = 'flex';
          pages.style.gridTemplateColumns = '';
          pages.style.columnGap = '';
          pages.style.rowGap = '';
          pages.style.justifyContent = '';
          pages.classList.remove('two-column');
        }
      }
      saveState();
    } catch (err) {
      console.error('[PageMD] Failed to toggle book mode:', err);
    }
  }

  // ============================================================================
  // Hand Tool (Pan)
  // ============================================================================

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;

  function toggleHandTool() {
    const handBtn = document.getElementById('hand-tool-btn');
    state.handToolActive = !state.handToolActive;

    if (state.handToolActive) {
      if (handBtn) handBtn.classList.add('active');
      document.body.classList.add('hand-mode');
    } else {
      if (handBtn) handBtn.classList.remove('active');
      document.body.classList.remove('hand-mode');
      // Clean up if toggled off while dragging
      if (isDragging) {
        isDragging = false;
        document.body.classList.remove('dragging');
      }
    }
    saveState();
  }

  function handleMouseDown(e) {
    if (!state.handToolActive) return;

    // Only activate on primary button (left click)
    if (e.button !== 0) return;

    // Don't activate if clicking on toolbar or buttons
    if (e.target.closest('.pagemd-zoom-toolbar')) return;

    isDragging = true;
    document.body.classList.add('dragging');

    startX = e.pageX - window.scrollX;
    startY = e.pageY - window.scrollY;
    scrollLeft = window.scrollX;
    scrollTop = window.scrollY;

    e.preventDefault();
  }

  function handleMouseMove(e) {
    if (!isDragging) return;

    e.preventDefault();

    const x = e.pageX - window.scrollX;
    const y = e.pageY - window.scrollY;
    const walkX = startX - x;
    const walkY = startY - y;

    window.scrollTo(scrollLeft + walkX, scrollTop + walkY);
  }

  function handleMouseUp(e) {
    if (!isDragging) return;

    isDragging = false;
    document.body.classList.remove('dragging');
    e.preventDefault();
  }

  function handleMouseLeave(e) {
    if (isDragging && e.target === document.documentElement) {
      isDragging = false;
      document.body.classList.remove('dragging');
    }
  }

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  function handleKeyDown(e) {
    // Hand tool toggle (H key)
    if (e.key === 'h' || e.key === 'H') {
      // Only if not typing in an input field
      if (!e.target.matches('input, textarea')) {
        e.preventDefault();
        toggleHandTool();
      }
    }

    // Zoom shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    }
  }

  // ============================================================================
  // Toolbar Initialization
  // ============================================================================

  /**
   * Initialize toolbar.
   * Toolbar uses CSS position:fixed for stable viewport positioning.
   * No JavaScript scroll tracking needed.
   */
  function initToolbar() {
    const toolbar = document.querySelector('.pagemd-zoom-toolbar');
    if (!toolbar) return;

    // Ensure toolbar is direct child of body for proper fixed positioning
    // (avoids issues if Paged.js transforms ancestor elements)
    if (toolbar.parentElement !== document.body) {
      document.body.appendChild(toolbar);
    }
  }

  // ============================================================================
  // Auto-fit on Resize
  // ============================================================================

  let resizeTimeout = null;

  function handleResize() {
    // Debounce resize events
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      if (state.autoFitEnabled) {
        fitToWidth();
      }
      // Always adjust scroll boundary on resize
      adjustScrollBoundary();
    }, 150);
  }

  // ============================================================================
  // UI State Restoration
  // ============================================================================

  /**
   * Restore UI elements to match saved state after page load.
   */
  function restoreUIState() {
    try {
      // Restore zoom
      updateZoom();

      // Restore book mode
      if (state.bookMode) {
        const bookBtn = document.getElementById('book-toggle-btn');
        const pages = document.querySelector('.pagedjs_pages');
        if (bookBtn) bookBtn.classList.add('active');
        if (pages) {
          pages.style.display = 'grid';
          pages.style.gridTemplateColumns = 'repeat(2, auto)';
          pages.style.columnGap = 'var(--pagemd-spread-gap)';
          pages.style.rowGap = 'var(--pagemd-page-gap)';
          pages.style.justifyContent = 'safe center';
          pages.classList.add('two-column');
        }
      }

      // Restore hand tool
      if (state.handToolActive) {
        const handBtn = document.getElementById('hand-tool-btn');
        if (handBtn) handBtn.classList.add('active');
        document.body.classList.add('hand-mode');
      }

      // Restore view mode (browser mode requires special handling)
      if (state.viewMode === 'browser') {
        // Reset to paged first, then toggle to browser
        state.viewMode = 'paged';
        toggleViewMode();
      }
    } catch (err) {
      console.error('[PageMD] Failed to restore UI state:', err);
    }
  }

  // ============================================================================
  // Event Listener Attachment
  // ============================================================================

  function attachEventListeners() {
    // Zoom controls
    document.getElementById('zoom-out-btn')?.addEventListener('click', zoomOut);
    document.getElementById('zoom-in-btn')?.addEventListener('click', zoomIn);
    document.getElementById('fit-width-btn')?.addEventListener('click', fitToWidth);
    document.getElementById('reset-zoom-btn')?.addEventListener('click', resetZoom);

    // Mode toggles
    document.getElementById('view-toggle-btn')?.addEventListener('click', toggleViewMode);
    document.getElementById('book-toggle-btn')?.addEventListener('click', toggleBookMode);
    document.getElementById('hand-tool-btn')?.addEventListener('click', toggleHandTool);

    // Hand tool mouse events
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);

    // Auto-fit on resize
    window.addEventListener('resize', handleResize, { passive: true });

    // Click-to-edit zoom level
    setupZoomLevelClick();
  }

  // ============================================================================
  // Cleanup on Unload
  // ============================================================================

  /**
   * Cleanup blob URL when page unloads (content refresh).
   */
  window.addEventListener('beforeunload', function() {
    cleanupBlobUrl();
  });

  // ============================================================================
  // Initialization
  // ============================================================================

  function init() {
    try {
      // Load saved state
      loadState();

      // Attach event listeners
      attachEventListeners();

      // Wait for Paged.js to complete before restoring UI state
      window.addEventListener('pagedjs-complete', function() {
        setTimeout(function() {
          initToolbar();
          restoreUIState();
          adjustScrollBoundary();
        }, 50);
      });

      // Also run on load as fallback
      window.addEventListener('load', function() {
        setTimeout(function() {
          initToolbar();
          restoreUIState();
          adjustScrollBoundary();
        }, 100);
      });

      // And run immediately in case DOM is ready
      if (document.readyState === 'complete') {
        setTimeout(function() {
          initToolbar();
          restoreUIState();
          adjustScrollBoundary();
        }, 50);
      }
    } catch (err) {
      console.error('[PageMD] Zoom toolbar initialization failed:', err);
    }
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================================
  // Exports for Testing
  // ============================================================================

  if (typeof window !== 'undefined') {
    window.pagemdZoomToolbar = {
      // Pure functions for unit testing
      clamp: clamp,
      safePx: safePx,
      calculateFitZoom: calculateFitZoom,
      // State accessors for testing
      getState: function() { return { ...state }; },
      setState: function(newState) {
        state = { ...state, ...newState };
        saveState();
      },
      // Actions for integration testing
      zoomIn: zoomIn,
      zoomOut: zoomOut,
      resetZoom: resetZoom,
      fitToWidth: fitToWidth,
      toggleBookMode: toggleBookMode,
      toggleViewMode: toggleViewMode,
      toggleHandTool: toggleHandTool,
      adjustScrollBoundary: adjustScrollBoundary
    };
  }
})();
