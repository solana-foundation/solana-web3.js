#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {runInNewContext} from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);

const loadable = [
  {entry: 'lib/index.cjs.js', kind: 'cjs'},
  {entry: 'lib/index.browser.cjs.js', kind: 'cjs'},
  {entry: 'lib/index.native.js', kind: 'cjs'},
  {entry: 'lib/index.esm.js', kind: 'esm'},
  {entry: 'lib/index.browser.esm.js', kind: 'esm'},
  {entry: 'lib/index.iife.js', kind: 'iife'},
  {entry: 'lib/index.iife.min.js', kind: 'iife'},
];

function loadIife(absolute) {
  const sandbox = {
    console,
    crypto: globalThis.crypto,
    fetch: globalThis.fetch,
    isSecureContext: true,
    TextDecoder,
    TextEncoder,
    URL,
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  runInNewContext(readFileSync(absolute, 'utf8'), sandbox, {
    filename: absolute,
  });
  return sandbox.solanaWeb3;
}

let failed = 0;
let expectedExports;
let expectedTransaction;

for (const {entry, kind} of loadable) {
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
  } else if (kind !== 'esm' && !source.startsWith('"use strict";')) {
    console.error(`FAIL ${entry}: missing "use strict" directive`);
    failed++;
  } else {
    console.log(`ok   ${entry} (substitution)`);
  }
}

for (const {entry, kind} of loadable) {
  const absolute = resolve(root, entry);
  if (!existsSync(absolute)) continue;
  try {
    const mod =
      kind === 'cjs'
        ? require(absolute)
        : kind === 'esm'
          ? await import(pathToFileURL(absolute).href)
          : loadIife(absolute);
    const exports = Object.keys(mod).sort();
    expectedExports ??= exports;
    assert.deepEqual(
      exports,
      expectedExports,
      'Public exports differ across bundles',
    );
    const {Connection, Keypair, PublicKey, SystemProgram, Transaction} = mod;
    if (typeof Connection !== 'function') {
      throw new Error('Connection export missing or not constructible');
    }
    new Connection('http://127.0.0.1:8899');
    console.log(`ok   ${entry} (Connection)`);

    const signer = await Keypair.fromSeed(new Uint8Array(32).fill(1));
    const message = new TextEncoder().encode('bundle smoke test');
    const signature = await signer.signBytes(message);
    assert.equal(await signer.verifySignature(signature, message), true);
    const transaction = new Transaction({
      feePayer: signer.publicKey,
      recentBlockhash: '11111111111111111111111111111111',
    }).add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: new PublicKey('11111111111111111111111111111111'),
        lamports: 1,
      }),
    );
    await transaction.sign(signer);
    const wire = Buffer.from(await transaction.serialize()).toString('base64');
    expectedTransaction ??= wire;
    assert.equal(
      wire,
      expectedTransaction,
      'Signed transactions differ across bundles',
    );
    assert.equal(
      Transaction.from(Buffer.from(wire, 'base64')).instructions.length,
      1,
    );
    console.log(`ok   ${entry} (exports, signing, serialization)`);
  } catch (err) {
    console.error(`FAIL ${entry}: ${err.message}`);
    failed++;
  }
}

process.exit(failed === 0 ? 0 : 1);
