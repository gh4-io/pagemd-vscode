/**
 * Unit tests for previewer.js layout parsing functions.
 *
 * These functions are extracted from media/previewer.js
 * for testing purposes. Run with Node.js directly:
 *   node src/test/preview-logic.test.js
 *
 * Or integrate with a test runner like vitest/jest if added later.
 */

// ============================================================================
// Functions Under Test (extracted from media/previewer.js)
// ============================================================================

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
    toEqual(expected) {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new Error(`Expected ${expectedStr}, got ${actualStr}`);
      }
    }
  };
}

// ============================================================================
// Tests
// ============================================================================

console.log('\npreviewer.js layout parsing tests\n' + '='.repeat(40));

describe('parseSizeValue()', function() {
  it('parses Letter portrait size', function() {
    const result = parseSizeValue('Letter portrait');
    expect(result.width).toBe('8.5in');
    expect(result.height).toBe('11in');
    expect(result.name).toBe('Letter');
    expect(result.orientation).toBe('portrait');
  });

  it('parses Letter landscape size', function() {
    const result = parseSizeValue('Letter landscape');
    expect(result.width).toBe('11in');
    expect(result.height).toBe('8.5in');
    expect(result.name).toBe('Letter');
    expect(result.orientation).toBe('landscape');
  });

  it('parses A4 portrait size', function() {
    const result = parseSizeValue('A4 portrait');
    expect(result.width).toBe('210mm');
    expect(result.height).toBe('297mm');
    expect(result.name).toBe('A4');
    expect(result.orientation).toBe('portrait');
  });

  it('parses A4 landscape size', function() {
    const result = parseSizeValue('A4 landscape');
    expect(result.width).toBe('297mm');
    expect(result.height).toBe('210mm');
    expect(result.name).toBe('A4');
    expect(result.orientation).toBe('landscape');
  });

  it('parses explicit dimensions in inches', function() {
    const result = parseSizeValue('8.5in 11in');
    expect(result.width).toBe('8.5in');
    expect(result.height).toBe('11in');
    expect(result.name).toBe('Custom');
    expect(result.orientation).toBe('portrait');
  });

  it('parses explicit dimensions in mm', function() {
    const result = parseSizeValue('210mm 297mm');
    expect(result.width).toBe('210mm');
    expect(result.height).toBe('297mm');
    expect(result.name).toBe('Custom');
    expect(result.orientation).toBe('portrait');
  });

  it('handles Legal size', function() {
    const result = parseSizeValue('Legal');
    expect(result.width).toBe('8.5in');
    expect(result.height).toBe('14in');
    expect(result.name).toBe('Legal');
  });

  it('handles case-insensitive input', function() {
    const result = parseSizeValue('LETTER');
    expect(result.name).toBe('Letter');
    expect(result.width).toBe('8.5in');
  });

  it('returns auto for unknown size strings', function() {
    const result = parseSizeValue('unknown');
    expect(result.width).toBe('auto');
    expect(result.height).toBe('auto');
    expect(result.name).toBe('unknown');
  });
});

describe('parseMarginValue()', function() {
  it('parses single value (all sides same)', function() {
    const result = parseMarginValue('1in');
    expect(result).toEqual({
      top: '1in',
      right: '1in',
      bottom: '1in',
      left: '1in'
    });
  });

  it('parses two values (vertical horizontal)', function() {
    const result = parseMarginValue('1in 2in');
    expect(result).toEqual({
      top: '1in',
      right: '2in',
      bottom: '1in',
      left: '2in'
    });
  });

  it('parses three values (top horizontal bottom)', function() {
    const result = parseMarginValue('1in 2in 3in');
    expect(result).toEqual({
      top: '1in',
      right: '2in',
      bottom: '3in',
      left: '2in'
    });
  });

  it('parses four values (top right bottom left)', function() {
    const result = parseMarginValue('1in 2in 3in 4in');
    expect(result).toEqual({
      top: '1in',
      right: '2in',
      bottom: '3in',
      left: '4in'
    });
  });

  it('handles zero margins', function() {
    const result = parseMarginValue('0');
    expect(result).toEqual({
      top: '0',
      right: '0',
      bottom: '0',
      left: '0'
    });
  });

  it('handles mm units', function() {
    const result = parseMarginValue('25.4mm');
    expect(result).toEqual({
      top: '25.4mm',
      right: '25.4mm',
      bottom: '25.4mm',
      left: '25.4mm'
    });
  });

  it('handles mixed units in four-value syntax', function() {
    const result = parseMarginValue('1in 20mm 0.5in 10mm');
    expect(result).toEqual({
      top: '1in',
      right: '20mm',
      bottom: '0.5in',
      left: '10mm'
    });
  });

  it('handles extra whitespace', function() {
    const result = parseMarginValue('  1in   2in  ');
    expect(result).toEqual({
      top: '1in',
      right: '2in',
      bottom: '1in',
      left: '2in'
    });
  });
});

describe('convertUnit()', function() {
  it('converts inches to mm', function() {
    expect(convertUnit('1in', 'mm')).toBe('25.4mm');
  });

  it('converts mm to inches', function() {
    expect(convertUnit('25.4mm', 'in')).toBe('1in');
  });

  it('converts cm to inches', function() {
    expect(convertUnit('2.54cm', 'in')).toBe('1in');
  });

  it('converts pt to inches', function() {
    expect(convertUnit('72pt', 'in')).toBe('1in');
  });

  it('converts px to inches', function() {
    expect(convertUnit('96px', 'in')).toBe('1in');
  });

  it('converts inches to mm with fractional result', function() {
    expect(convertUnit('0.5in', 'mm')).toBe('12.7mm');
  });

  it('handles zero value', function() {
    expect(convertUnit('0', 'mm')).toBe('0');
    expect(convertUnit('0', 'in')).toBe('0');
  });

  it('handles auto value', function() {
    expect(convertUnit('auto', 'mm')).toBe('auto');
    expect(convertUnit('auto', 'in')).toBe('auto');
  });

  it('preserves same unit conversion (inches to inches)', function() {
    expect(convertUnit('1in', 'in')).toBe('1in');
  });

  it('preserves same unit conversion (mm to mm)', function() {
    expect(convertUnit('25.4mm', 'mm')).toBe('25.4mm');
  });

  it('handles decimal precision correctly', function() {
    // 0.5in = 12.7mm, convert back to inches should give 0.5in
    expect(convertUnit('12.7mm', 'in')).toBe('0.5in');
  });

  it('strips trailing .0 from mm results', function() {
    // 2in = 50.8mm (should show as "50.8mm" not "50.80mm")
    expect(convertUnit('2in', 'mm')).toBe('50.8mm');
  });

  it('strips trailing .00 from inch results', function() {
    // 25.4mm = 1.00in (should show as "1in" not "1.00in")
    expect(convertUnit('25.4mm', 'in')).toBe('1in');
  });
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(40));
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(40) + '\n');

process.exit(failCount > 0 ? 1 : 0);
