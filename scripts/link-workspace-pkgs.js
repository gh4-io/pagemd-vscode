#!/usr/bin/env node
/**
 * Copy workspace packages to node_modules/@pagemd after npm install.
 * This must run AFTER npm install in bin/ to avoid being overwritten.
 *
 * Usage: node scripts/link-workspace-pkgs.js
 */

const fs = require('fs');
const path = require('path');

const binDir = path.resolve(__dirname, '../bin');
const packagesDir = path.join(binDir, 'packages');
const nodeModulesScope = path.join(binDir, 'node_modules', '@pagemd');

// Check bin/packages exists
if (!fs.existsSync(packagesDir)) {
  console.error('Error: bin/packages not found. Run bundle-cli first.');
  process.exit(1);
}

// Create @pagemd scope in node_modules
fs.mkdirSync(nodeModulesScope, { recursive: true });

// Copy each package
console.log('Copying workspace packages to node_modules/@pagemd...');
const packages = fs.readdirSync(packagesDir);
for (const pkg of packages) {
  const srcPath = path.join(packagesDir, pkg);
  if (fs.statSync(srcPath).isDirectory()) {
    const destPath = path.join(nodeModulesScope, pkg);
    // Remove existing if any
    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { recursive: true });
    }
    fs.cpSync(srcPath, destPath, { recursive: true });
    console.log(`  Copied @pagemd/${pkg}`);
  }
}

console.log('Workspace packages linked.');
