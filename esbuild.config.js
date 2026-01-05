// @ts-check
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: './out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

/**
 * Copy Paged.js assets to media/ directory for webview use.
 */
function copyMediaAssets() {
  const mediaDir = path.join(__dirname, 'media');
  const pagedJsSource = path.join(__dirname, 'node_modules', 'pagedjs', 'dist', 'paged.polyfill.js');
  const pagedJsDest = path.join(mediaDir, 'paged.polyfill.js');

  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  if (fs.existsSync(pagedJsSource)) {
    fs.copyFileSync(pagedJsSource, pagedJsDest);
    console.log('Copied paged.polyfill.js to media/');
  } else {
    console.warn('Warning: paged.polyfill.js not found. Run npm install first.');
  }
}

async function main() {
  // Copy media assets before building
  copyMediaAssets();

  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
