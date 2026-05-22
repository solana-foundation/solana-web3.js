#!/usr/bin/env node
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);

const loadable = [
  { entry: 'lib/index.cjs.js', kind: 'cjs' },
  { entry: 'lib/index.browser.cjs.js', kind: 'cjs' },
  { entry: 'lib/index.native.js', kind: 'cjs' },
  { entry: 'lib/index.esm.js', kind: 'esm' },
  { entry: 'lib/index.browser.esm.js', kind: 'esm' },
];

const textOnly = ['lib/index.iife.js', 'lib/index.iife.min.js'];

let failed = 0;

for (const entry of [...loadable.map(t => t.entry), ...textOnly]) {
  const absolute = resolve(root, entry);
  if (!existsSync(absolute)) {
    console.error(`MISSING ${entry}`);
    failed++;
    continue;
  }
  const source = readFileSync(absolute, 'utf8');
  if (/\b__VERSION__\b/.test(source)) {
    console.error(`FAIL ${entry}: bare __VERSION__ identifier in bundle`);
    failed++;
  } else {
    console.log(`ok   ${entry} (substitution)`);
  }
}

for (const { entry, kind } of loadable) {
  const absolute = resolve(root, entry);
  if (!existsSync(absolute)) continue;
  try {
    const mod =
      kind === 'cjs'
        ? require(absolute)
        : await import(pathToFileURL(absolute).href);
    const Connection = mod.Connection ?? mod.default?.Connection;
    if (typeof Connection !== 'function') {
      throw new Error('Connection export missing or not constructible');
    }
    new Connection('http://127.0.0.1:8899');
    console.log(`ok   ${entry} (Connection)`);
  } catch (err) {
    console.error(`FAIL ${entry}: ${err.message}`);
    failed++;
  }
}

process.exit(failed === 0 ? 0 : 1);
