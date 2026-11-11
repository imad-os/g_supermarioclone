#!/usr/bin/env node
/**
 * Pip's Golden Trail - Static GitHub Pages Builder (tools/build-docs.mjs)
 * Packages the complete static My PC application into /docs (and /dist) so GitHub Pages
 * can serve cleanly from either the /docs folder or the repository root.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['docs', 'dist'];

const STATIC_FILES = [
  'index.html',
  'mypc-app.json',
  'icon.svg',
  'style.css',
  '.nojekyll',
  'CLAUDE.md',
  'CREDITS.md',
  'README.md'
];

const STATIC_DIRS = [
  'js',
  'levels',
  'proof'
];

for (const dirName of TARGET_DIRS) {
  const outDir = path.join(ROOT, dirName);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const file of STATIC_FILES) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(outDir, file));
    }
  }

  for (const subDir of STATIC_DIRS) {
    const srcDir = path.join(ROOT, subDir);
    const dstDir = path.join(outDir, subDir);
    if (fs.existsSync(srcDir)) {
      fs.cpSync(srcDir, dstDir, { recursive: true });
    }
  }
}

console.log('✓ Built complete My PC static package into /docs and /dist for GitHub Pages.');
