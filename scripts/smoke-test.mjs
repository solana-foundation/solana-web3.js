#!/usr/bin/env node
// Loads each built bundle and constructs `Connection` — the path that threw
// `ReferenceError: __VERSION__ is not defined` in v3.0.0-rc.0. Run after
// `compile:js` to catch bundler-substitution regressions before publish.

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);

const targets = [
  { entry: 'lib/index.cjs.js', kind: 'cjs' },
  { entry: 'lib/index.browser.cjs.js', kind: 'cjs' },
  { entry: 'lib/index.native.js', kind: 'cjs' },
  { entry: 'lib/index.esm.js', kind: 'esm' },
  { entry: 'lib/index.browser.esm.js', kind: 'esm' },
];

let failed = 0;
for (const { entry, kind } of targets) {
  const absolute = resolve(root, entry);
  if (!existsSync(absolute)) {
    console.error(`MISSING ${entry}`);
    failed++;
    continue;
  }
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
    console.log(`ok   ${entry}`);
  } catch (err) {
    console.error(`FAIL ${entry}: ${err.message}`);
    failed++;
  }
}

process.exit(failed === 0 ? 0 : 1);
