// Build script: bundles annotation widget source into a single IIFE file
// Usage: node annotation-widget-build/build.js
// Output: public/annotation-widget.js

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const entry = path.resolve(__dirname, 'src/index.js');
const outfile = path.resolve(__dirname, '../public/annotation-widget.js');

async function build() {
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    outfile,
    minify: true,
    target: 'es2020',
    charset: 'utf8'
  });

  const size = fs.statSync(outfile).size;
  console.log(`[annotation-widget] Built: ${outfile} (${(size / 1024).toFixed(1)} KB)`);
}

build().catch(err => {
  console.error('[annotation-widget] Build failed:', err);
  process.exit(1);
});
