#!/usr/bin/env node
/**
 * Bundle CLI into a single file using esbuild.
 * Replaces bundle-cli.js + link-workspace-pkgs.js with one step.
 *
 * Usage: node scripts/bundle-cli-esbuild.js
 *
 * Expects pagemd repo to be at ../pagemd (sibling submodule).
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const cliRoot = path.resolve(__dirname, '../../pagemd');
const outDir = path.resolve(__dirname, '../bin');

// Verify sibling pagemd exists
if (!fs.existsSync(cliRoot)) {
  console.error('Error: pagemd repo not found at', cliRoot);
  console.error('This script expects the workspace structure with submodules.');
  process.exit(1);
}

// Verify CLI source exists
const cliEntry = path.join(cliRoot, 'apps/cli/src/index.js');
if (!fs.existsSync(cliEntry)) {
  console.error('Error: CLI entry not found at', cliEntry);
  process.exit(1);
}

console.log('PageMD CLI Bundler (esbuild)');
console.log('============================');

// Clean output directory
if (fs.existsSync(outDir)) {
  console.log('Cleaning bin/ directory...');
  fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });

// Copy static assets
const staticDirs = ['profiles', 'templates', 'layouts', 'styles'];
console.log('Copying static assets...');
for (const dir of staticDirs) {
  const src = path.join(cliRoot, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(outDir, dir), { recursive: true });
    console.log(`  ✓ ${dir}/`);
  }
}

// Build aliases for workspace packages
const packagesDir = path.join(cliRoot, 'packages');
const packages = fs.readdirSync(packagesDir).filter(p =>
  fs.statSync(path.join(packagesDir, p)).isDirectory()
);

const alias = {};
for (const pkg of packages) {
  const pkgPath = path.join(packagesDir, pkg, 'src/index.js');
  if (fs.existsSync(pkgPath)) {
    alias[`@pagemd/${pkg}`] = pkgPath;
    console.log(`  Alias: @pagemd/${pkg}`);
  }
}

// Bundle CLI
console.log('\nBundling CLI with esbuild...');

async function bundle() {
  try {
    const result = await esbuild.build({
      entryPoints: [cliEntry],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: path.join(outDir, 'pagemd-cli.mjs'),

      // External dependencies (will be installed via npm or are optional)
      external: [
        'puppeteer-core',
        'fsevents',    // macOS-only, optional
        'typescript',  // Optional cosmiconfig loader
      ],

      // Resolve workspace packages via aliases
      alias,

      // ESM banner for require() compatibility
      banner: {
        js: `import{createRequire}from'module';const require=createRequire(import.meta.url);`
      },

      // Enable source maps for debugging
      sourcemap: true,

      // Minify in production
      minify: process.argv.includes('--production'),

      // Tree shaking
      treeShaking: true,

      // Bundle metadata
      metafile: true,
    });

    // Report bundle stats
    const outputs = result.metafile.outputs;
    const mainBundle = Object.keys(outputs).find(k => k.endsWith('.mjs'));
    if (mainBundle) {
      const size = outputs[mainBundle].bytes;
      console.log(`  ✓ Bundle size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    }

  } catch (error) {
    console.error('Bundle failed:', error.message);

    // Check for common issues
    if (error.message.includes('shiki')) {
      console.error('\nNote: shiki may have bundling issues. Consider adding to external.');
    }

    process.exit(1);
  }
}

// Create minimal package.json
function createPackageJson() {
  const pkg = {
    name: 'pagemd-cli-bundle',
    version: '0.1.0',
    type: 'module',
    private: true,
    dependencies: {
      'puppeteer-core': '^24.34.0'
    }
  };

  fs.writeFileSync(
    path.join(outDir, 'package.json'),
    JSON.stringify(pkg, null, 2)
  );
  console.log('  ✓ package.json created');
}

// Run bundler
bundle().then(() => {
  createPackageJson();
  console.log('\n✓ CLI bundle complete:', outDir);
  console.log('  Next: cd bin && npm install --omit=dev');
}).catch(err => {
  console.error('Bundler error:', err);
  process.exit(1);
});
