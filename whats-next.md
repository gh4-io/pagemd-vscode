# Handoff: Tiered Debug System Implementation

## Original Task
Implement tiered debug visualization system for PageMD VS Code extension preview panel, replacing boolean `debugMode` with dropdown controls for both preview and CLI debug levels.

## Work Completed

### 1. Settings Schema (package.json)
- **Removed:** `pagemd.debugMode` (boolean), `pagemd.logLevel` (enum)
- **Added:** `pagemd.preview.debugLevel` - dropdown: `""`, `basic`, `layout`, `context`, `combined`, `full`
- **Added:** `pagemd.cliDebugLevel` - dropdown: `""`, `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`

### 2. Preview Debug Tiers (preview-debug.css)
Complete rewrite with class-based tiers:
- `.debug-basic` - Container outlines (red/green/blue/orange), page gaps (green stripes), spread gaps (purple stripes)
- `.debug-layout` - Margins, bleeds (magenta), content area (yellow), footnotes (blue), headers/footers
- `.debug-context` - Semantic elements with bright colors and class names in labels
- `.debug-combined` - Layout + Context
- `.debug-full` - All visualizations

**Context tier semantic elements (no fill, borders only):**
| Element | Color | Border | Label |
|---------|-------|--------|-------|
| `<article>` | Cyan | 3px solid | Top-right |
| `<section>` | Lime | 2px dashed | Staggered |
| `<aside>` | Yellow | 2px dotted | Top-right |
| `<figure>` | Pink | 2px solid | Staggered |
| `<blockquote>` | Orange | 2px dashed | Staggered |
| `<nav>` | Violet | 2px solid | Top-left |
| `<header>` | Teal | 2px dotted | Top-left |
| `<footer>` | Coral | 2px dotted | Bottom-left |

**DIV containers (4 nesting levels with class names):**
| Level | Color | Position |
|-------|-------|----------|
| 1 | Magenta | top: -12px, left: 0 |
| 2 | Cyan | top: 0, left: 60px |
| 3 | Lime | top: 12px, left: 120px |
| 4 | Yellow | top: 24px, left: 180px |

Labels show: `DIV: class-name-here` using CSS `attr(class)`

### 3. Preview Panel Updates (preview-panel.ts)
- Line ~486-493: Added `debug-${debugLevel}` body class
- Line ~490-493: Added `highlight-margins` body class when setting enabled
- Line ~536: Changed `window.pagemdDebugMode` to `window.pagemdDebugLevel`

### 4. Highlight Margins Fix (preview-layout.css)
- Lines 21-24, 31-37: CSS now requires `.highlight-margins` class for margin box highlighting
- Setting `pagemd.preview.highlightMargins` now properly controls visibility

### 5. CLI Debug Updates
- `cli-wrapper.ts:115-121` - Unified `cliDebugLevel` sets both `PAGEMD_DEBUG=1` and `PAGEMD_LOG_LEVEL`
- `export.ts:128,144` - Changed from boolean `debugMode` to string `cliDebugLevel`

### 6. Migration Logic (extension.ts)
- Lines 236-284: `checkDeprecatedSettings()` detects old settings and prompts migration

### 7. VS Code API Fix (previewer.js)
- Lines 8-21: Fixed "API already acquired" error by using `window._pagemdVscodeApi`

### 8. Documentation (Settings.md)
- Removed `pagemd.logLevel` and `pagemd.debugMode` sections
- Added `pagemd.preview.debugLevel` with tier tables and color legends
- Added `pagemd.cliDebugLevel` with level descriptions
- Updated summary table

## Work Remaining
None for core implementation. Optional future work:
- Add more semantic elements if needed
- Screenshot documentation for wiki

## Critical Context

### Files Modified
```
project/pagemd-vscode/
├── package.json                          # Settings schema
├── src/
│   ├── extension.ts                      # Migration logic
│   ├── providers/preview-panel.ts        # Body classes, debugLevel
│   ├── commands/export.ts                # cliDebugLevel check
│   └── utils/cli-wrapper.ts              # buildCliEnv() unified debug
├── media/
│   ├── previewer.js                      # VS Code API caching fix
│   ├── zoom-toolbar.js                   # pagemdDebugLevel check
│   └── styles/
│       ├── preview-debug.css             # Complete rewrite - tiered classes
│       └── preview-layout.css            # .highlight-margins class requirement
└── docs/wiki/reference/Settings.md       # Documentation updates
```

### Key Design Decisions
1. **Blank string as default** - Empty string means "off" for both preview and CLI debug
2. **Class-based CSS tiers** - Each tier adds a body class (`.debug-basic`, etc.)
3. **No fill/tint for context tier** - Borders only for clarity
4. **Staggered labels** - Prevents overlap via vertical + horizontal offset
5. **Class names in DIV labels** - Uses CSS `attr(class)` for debugging

### Testing
- TypeScript compilation: Pass
- Unit tests: 49/49 passing
- Manual testing needed for visual verification

## Current State
- All implementation complete
- Code compiles without errors
- Tests pass
- Ready for visual testing and commit
