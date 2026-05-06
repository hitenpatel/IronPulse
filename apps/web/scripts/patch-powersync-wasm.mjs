#!/usr/bin/env node
/**
 * Patches PowerSync's pre-built UMD worker chunks so the Emscripten WASM
 * loader uses a resolvable URL instead of the hardcoded file:// CI build path
 * (var _scriptName="file:///home/runner/work/...").
 *
 * Two things are done:
 *   1. Replace _scriptName in each wa-sqlite UMD chunk with self.location.href
 *      so scriptDirectory resolves to the worker's own directory.
 *   2. Copy each .wasm file with its original (non-hashed) name into
 *      public/@powersync/worker/ so the Emscripten loader can find it.
 *
 * The hash→name mapping is read dynamically from index.umd.js so it stays
 * correct after PowerSync version bumps.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public/@powersync');
const workerDir = resolve(publicDir, 'worker');
const indexUmd = resolve(publicDir, 'index.umd.js');

if (!existsSync(indexUmd)) {
  console.error('[patch-powersync-wasm] public/@powersync/index.umd.js not found — run copy-assets first');
  process.exit(1);
}

// ── 1. Extract wasm hash mapping from index.umd.js ────────────────────────
const src = readFileSync(indexUmd, 'utf-8');

const wasmMap = {};
// Each WASM module looks like:
//   /***/ "../../node_modules/.../wa-sqlite-async.wasm"
//   ... (banner) ...
//   module.exports = __webpack_require__.p + "ca59e199e1138b553fad.wasm";
const keyRe = /\/\*\*\*\/ "([^"]+\.wasm)"/g;
let km;
while ((km = keyRe.exec(src)) !== null) {
  const originalName = km[1].split('/').pop();
  // Find the next hash.wasm after this key
  const after = src.slice(km.index + km[0].length, km.index + km[0].length + 1500);
  const hashMatch = after.match(/([a-f0-9]{20}\.wasm)/);
  if (hashMatch) {
    wasmMap[originalName] = hashMatch[1];
  }
}

if (Object.keys(wasmMap).length === 0) {
  console.error('[patch-powersync-wasm] Could not extract WASM mapping from index.umd.js');
  process.exit(1);
}

console.log('[patch-powersync-wasm] WASM mapping:');
for (const [orig, hashed] of Object.entries(wasmMap)) {
  console.log(`  ${orig} -> ${hashed}`);
}

// ── 2. Copy .wasm files with original names into worker/ ──────────────────
for (const [orig, hashed] of Object.entries(wasmMap)) {
  const src = resolve(publicDir, hashed);
  const dest = resolve(workerDir, orig);
  if (!existsSync(src)) {
    console.warn(`[patch-powersync-wasm] Source not found: ${hashed}`);
    continue;
  }
  copyFileSync(src, dest);
  console.log(`[patch-powersync-wasm] Copied ${hashed} -> worker/${orig}`);
}

// ── 3. Patch _scriptName in wa-sqlite UMD chunk files ─────────────────────
// The broken pattern: var _scriptName="file:///home/runner/work/..."
const BROKEN_RE = /var _scriptName="file:\/\/\/[^"]+"/g;
const FIXED     = 'var _scriptName=typeof self!=="undefined"&&self.location?self.location.href:""';

let patchedCount = 0;
const { readdirSync } = await import('fs');
const chunkFiles = readdirSync(workerDir).filter(f =>
  f.endsWith('.umd.js') && f.includes('wa-sqlite')
);

for (const file of chunkFiles) {
  const filePath = resolve(workerDir, file);
  const content = readFileSync(filePath, 'utf-8');
  if (!BROKEN_RE.test(content)) continue;
  BROKEN_RE.lastIndex = 0;
  const patched = content.replace(BROKEN_RE, FIXED);
  writeFileSync(filePath, patched);
  patchedCount++;
  console.log(`[patch-powersync-wasm] Patched _scriptName in worker/${file}`);
}

if (patchedCount === 0) {
  console.log('[patch-powersync-wasm] No _scriptName patches needed (already clean or not present)');
}

console.log('[patch-powersync-wasm] Done.');
