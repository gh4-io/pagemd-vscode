/**
 * Unit tests for zoom-toolbar.js pure math functions.
 *
 * These functions are extracted/mirrored from media/zoom-toolbar.js
 * for testing purposes. Run with Node.js directly:
 *   node src/test/zoom-math.test.js
 *
 * Or integrate with a test runner like vitest/jest if added later.
 */

// ============================================================================
// Functions Under Test (mirrored from media/zoom-toolbar.js)
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
// Test Utilities
// ============================================================================

let passCount = 0;
let failCount = 0;

function describe(name, fn) {
  console.log(`\n  ${name}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`    ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.log(`    ✗ ${name}`);
    console.log(`      ${err.message}`);
    failCount++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(actual - expected);
      const threshold = Math.pow(10, -precision) / 2;
      if (diff > threshold) {
        throw new Error(`Expected ~${expected}, got ${actual} (diff: ${diff})`);
      }
    }
  };
}

// ============================================================================
// Tests
// ============================================================================

console.log('\nzoom-toolbar.js unit tests\n' + '='.repeat(40));

describe('clamp()', function() {
  it('returns value when within bounds', function() {
    expect(clamp(50, 25, 400)).toBe(50);
    expect(clamp(100, 25, 400)).toBe(100);
    expect(clamp(25, 25, 400)).toBe(25);
    expect(clamp(400, 25, 400)).toBe(400);
  });

  it('clamps to minimum when below', function() {
    expect(clamp(10, 25, 400)).toBe(25);
    expect(clamp(0, 25, 400)).toBe(25);
    expect(clamp(-100, 25, 400)).toBe(25);
  });

  it('clamps to maximum when above', function() {
    expect(clamp(500, 25, 400)).toBe(400);
    expect(clamp(1000, 25, 400)).toBe(400);
  });

  it('handles edge case where min equals max', function() {
    expect(clamp(50, 100, 100)).toBe(100);
    expect(clamp(150, 100, 100)).toBe(100);
  });
});

describe('safePx()', function() {
  it('parses pixel values', function() {
    expect(safePx('12px')).toBe(12);
    expect(safePx('100.5px')).toBe(100.5);
    expect(safePx('0px')).toBe(0);
  });

  it('parses other numeric CSS values', function() {
    expect(safePx('50%')).toBe(50);
    expect(safePx('2em')).toBe(2);
    expect(safePx('1.5rem')).toBe(1.5);
  });

  it('handles CSS keywords by returning 0', function() {
    expect(safePx('normal')).toBe(0);
    expect(safePx('auto')).toBe(0);
    expect(safePx('none')).toBe(0);
  });

  it('handles null/undefined/empty by returning 0', function() {
    expect(safePx(null)).toBe(0);
    expect(safePx(undefined)).toBe(0);
    expect(safePx('')).toBe(0);
  });

  it('handles invalid strings by returning 0', function() {
    expect(safePx('invalid')).toBe(0);
    expect(safePx('abc123')).toBe(0);
  });
});

describe('calculateFitZoom()', function() {
  it('returns 100 for invalid inputs', function() {
    expect(calculateFitZoom(0, 500, 0.1)).toBe(100);
    expect(calculateFitZoom(500, 0, 0.1)).toBe(100);
    expect(calculateFitZoom(-100, 500, 0.1)).toBe(100);
    expect(calculateFitZoom(500, -100, 0.1)).toBe(100);
  });

  it('calculates zoom for content smaller than viewport', function() {
    // Content 500px + 10% padding = 550px
    // Available 1100px -> 1100/550 = 200%
    expect(calculateFitZoom(500, 1100, 0.1)).toBe(200);
  });

  it('calculates zoom for content larger than viewport', function() {
    // Content 1000px + 10% padding = 1100px
    // Available 550px -> 550/1100 = 50%
    expect(calculateFitZoom(1000, 550, 0.1)).toBe(50);
  });

  it('clamps to maximum 400%', function() {
    // Very small content relative to viewport
    expect(calculateFitZoom(100, 5000, 0.1)).toBe(400);
  });

  it('clamps to minimum 25%', function() {
    // Very large content relative to viewport
    expect(calculateFitZoom(10000, 100, 0.1)).toBe(25);
  });

  it('handles zero padding', function() {
    // Content 500px, no padding
    // Available 1000px -> 1000/500 = 200%
    expect(calculateFitZoom(500, 1000, 0)).toBe(200);
  });

  it('uses default 10% padding when not specified', function() {
    // Content 500px + 10% = 550px
    // Available 550px -> 550/550 = 100%
    expect(calculateFitZoom(500, 550)).toBe(100);
  });
});

describe('state serialization', function() {
  const defaultState = {
    zoomLevel: 100,
    bookMode: false,
    viewMode: 'paged',
    handToolActive: false,
    autoFitEnabled: false
  };

  it('serializes state to JSON', function() {
    const json = JSON.stringify(defaultState);
    expect(json).toBe('{"zoomLevel":100,"bookMode":false,"viewMode":"paged","handToolActive":false,"autoFitEnabled":false}');
  });

  it('deserializes JSON to state', function() {
    const json = '{"zoomLevel":150,"bookMode":true,"viewMode":"browser"}';
    const state = JSON.parse(json);
    expect(state.zoomLevel).toBe(150);
    expect(state.bookMode).toBe(true);
    expect(state.viewMode).toBe('browser');
  });

  it('merges partial state with defaults', function() {
    const saved = { zoomLevel: 75 };
    const merged = { ...defaultState, ...saved };
    expect(merged.zoomLevel).toBe(75);
    expect(merged.bookMode).toBe(false);
    expect(merged.viewMode).toBe('paged');
  });
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(40));
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(40) + '\n');

process.exit(failCount > 0 ? 1 : 0);
