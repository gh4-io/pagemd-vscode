#!/usr/bin/env node
/**
 * Bundle CLI + packages from sibling pagemd repo at build time.
 * This allows the extension to ship with a bundled CLI instead of
 * requiring users to install PageMD separately.
 *
 * Usage: node scripts/bundle-cli.js
 *
 * Expects pagemd repo to be at ../pagemd (sibling submodule).
 */

const fs = require('fs');
const path = require('path');

const cliRoot = path.resolve(__dirname, '../../pagemd');
const outDir = path.resolve(__dirname, '../bin');

// Check if sibling pagemd exists
if (!fs.existsSync(cliRoot)) {
  console.error('Error: pagemd repo not found at', cliRoot);
  console.error('This script expects the workspace structure with submodules.');
  process.exit(1);
}

// Check CLI source exists
const cliSrc = path.join(cliRoot, 'apps/cli');
if (!fs.existsSync(cliSrc)) {
  console.error('Error: CLI source not found at', cliSrc);
  process.exit(1);
}

// Clean output directory
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });

// Copy CLI (preserve apps/cli structure for path resolution)
console.log('Copying CLI...');
fs.mkdirSync(path.join(outDir, 'apps'), { recursive: true });
fs.cpSync(path.join(cliRoot, 'apps/cli'), path.join(outDir, 'apps/cli'), { recursive: true });

// Copy packages
console.log('Copying packages...');
fs.cpSync(path.join(cliRoot, 'packages'), path.join(outDir, 'packages'), { recursive: true });

// Copy profiles
console.log('Copying profiles...');
fs.cpSync(path.join(cliRoot, 'profiles'), path.join(outDir, 'profiles'), { recursive: true });

// Copy templates
console.log('Copying templates...');
fs.cpSync(path.join(cliRoot, 'templates'), path.join(outDir, 'templates'), { recursive: true });

// Copy layouts
console.log('Copying layouts...');
fs.cpSync(path.join(cliRoot, 'layouts'), path.join(outDir, 'layouts'), { recursive: true });

// Copy styles
console.log('Copying styles...');
fs.cpSync(path.join(cliRoot, 'styles'), path.join(outDir, 'styles'), { recursive: true });

// Copy root package.json for node_modules resolution
console.log('Copying package.json...');
fs.cpSync(path.join(cliRoot, 'package.json'), path.join(outDir, 'package.json'));

console.log('CLI bundle complete:', outDir);
console.log('Note: Run "npm install" in bin/, then "node scripts/link-workspace-pkgs.js" to complete setup.');
