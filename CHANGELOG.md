# Changelog

All notable changes to the PageMD VS Code extension will be documented in this file.

## [0.1.2] - 2026-01-02

### Added

- **Enhanced Dimension Labels (Phase 2)** - Visual dimension annotations around pages
  - **Multi-sided layout** - Labels positioned outside page bounds (no layout shift)
  - **Top label** - Page width dimension
  - **Left label** - Page height + left margin value
  - **Right label** - Right margin value
  - **Bottom label** - Top/bottom margin values
  - **Info panel** - @page rule name, page size (Letter/A4/etc), orientation, padding
  - **Theme-aware styling** - #202020 text (light), #e0e0e0 (dark), adapts to high-contrast
  - **Unit conversion** - Toggle between inches and millimeters
  - **Per-page labels** - Full info repeated on every page (pages can differ)
  - **Extra page spacing** - Increased margins around pages when labels enabled
  - New setting: `pagemd.preview.showDimensions` (default: true)
  - New setting: `pagemd.preview.dimensionUnit` (default: "in", options: "in", "mm")

### Fixed

- **Layout info extraction** - Now extracts @page CSS BEFORE Paged.js transforms it (Paged.js removes original rules)
- **VS Code API caching** - Fixed "API already acquired" error by caching acquireVsCodeApi() result
- **@page rule detection** - Improved scoring to prefer rules with non-zero margins over Paged.js defaults
- **HTML file cleanup** - Preview now deletes generated HTML files after loading (unless `debugMode` is enabled)

## [0.1.1] - 2026-01-02

### Added

- **Preview Visual Settings** - 8 new configurable settings for preview appearance:
  - `pagemd.preview.highlightMargins` - Cyan margin box highlighting
  - `pagemd.preview.marginColor` - Customizable margin highlight color
  - `pagemd.preview.emulatePageLayout` - White pages on gray background
  - `pagemd.preview.paperColor` - Page background color
  - `pagemd.preview.backgroundColor` - Color outside pages
  - `pagemd.preview.twoColumnSpread` - Book-style spread view
  - `pagemd.preview.pageGap` - Gap between pages
  - `pagemd.preview.zoom` - Initial zoom level
- **Zoom Toolbar** - Floating controls at bottom-right of preview
  - Zoom in/out buttons (25% increments)
  - Fit to width button
  - Reset to 100% button
- **Keyboard Shortcuts** - Zoom control via keyboard
  - `Ctrl++`/`Cmd++` to zoom in
  - `Ctrl+-`/`Cmd+-` to zoom out
  - `Ctrl+0`/`Cmd+0` to reset zoom
- **Smart CLI Resolution** - 5-tier fallback for finding PageMD CLI:
  1. Custom `pagemd.cliPath` setting
  2. Local CLI relative to extension (monorepo dev)
  3. Workspace CLI (`apps/cli/src/index.js`)
  4. `node_modules/.bin/pagemd`
  5. `npx pagemd` (fallback)

### Fixed

- **onSave/onType refresh** - Path comparison now handles Windows case-insensitivity
- **onType mode** - Auto-saves document before CLI refresh (CLI reads from disk)
- **Zoom toolbar positioning** - Uses fixed overlay container to avoid Paged.js transform issues

## [0.1.0] - 2025-12-31

### Added

- **Export to PDF** command with progress notification and cancellation support
- **Profile Picker** with QuickPick UI and status bar indicator
- **Paged Preview** webview with auto-refresh (onSave/onType modes)
- **Validate Document** command with editor diagnostics
- Theme-aware preview (light/dark/high-contrast)
- Context menu integration for markdown files
- Configuration settings:
  - `pagemd.defaultProfile` - Default rendering profile
  - `pagemd.debugMode` - Enable debug artifacts
  - `pagemd.autoRefreshPreview` - Auto-refresh preview
  - `pagemd.previewTrigger` - Refresh trigger mode

### Architecture

- Thin client wrapping PageMD CLI (subprocess approach)
- No pipeline logic in extension host
- Cross-platform process management (Windows/Linux/macOS)
