#!/usr/bin/env node
// Bundles the agent wallet into a self-registering browser script with its
// keypair, RPC endpoint and signing mode baked in, ready for
// `agent-browser --init-script`.
import {generateKeyPairSync} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

import {getBase58Decoder} from '@solana/kit';
import {build} from 'esbuild';

const USAGE = `Usage: init-script [options]

  --keypair <path>   Solana CLI keypair JSON (default: a fresh keypair)
  --rpc <url>        RPC used by signAndSendTransaction (default: http://127.0.0.1:8899)
  --chain <chain>    Advertised chain, repeatable (default: every solana: cluster)
  --mode <mode>      auto | manual (default: auto)
  --delay <ms>       Wait before each auto approval
  --name <name>      Wallet name (default: Agent Wallet)
  --out <path>       Output file (default: stdout)`;

const {values: args} = parseArgs({
  options: {
    chain: {multiple: true, type: 'string'},
    delay: {type: 'string'},
    help: {short: 'h', type: 'boolean'},
    keypair: {type: 'string'},
    mode: {default: 'auto', type: 'string'},
    name: {default: 'Agent Wallet', type: 'string'},
    out: {type: 'string'},
    rpc: {default: 'http://127.0.0.1:8899', type: 'string'},
  },
});

if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
function fail(message) {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(1);
}

if (args.mode !== 'auto' && args.mode !== 'manual') {
  fail('--mode must be auto or manual.');
}
const badChain = args.chain?.find(chain => !chain.startsWith('solana:'));
if (badChain) {
  fail(`--chain must start with solana: (got ${badChain}).`);
}
const delay = args.delay === undefined ? undefined : Number(args.delay);
if (delay !== undefined && !(Number.isInteger(delay) && delay >= 0)) {
  fail(
    `--delay must be a non-negative integer of milliseconds (got ${args.delay}).`,
  );
}

function generateSecretKey() {
  const {privateKey, publicKey} = generateKeyPairSync('ed25519');
  return [
    ...Buffer.from(privateKey.export({format: 'jwk'}).d, 'base64url'),
    ...Buffer.from(publicKey.export({format: 'jwk'}).x, 'base64url'),
  ];
}

function readSecretKey(path) {
  let secretKey;
  try {
    secretKey = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`--keypair ${path} could not be read as JSON: ${error.message}`);
  }
  const isByte = byte => Number.isInteger(byte) && byte >= 0 && byte <= 255;
  if (
    !Array.isArray(secretKey) ||
    secretKey.length !== 64 ||
    !secretKey.every(isByte)
  ) {
    fail(`--keypair ${path} must be a JSON array of 64 bytes (0-255).`);
  }
  return secretKey;
}

const secretKey = args.keypair
  ? readSecretKey(args.keypair)
  : generateSecretKey();
const config = {
  chains: args.chain ?? [
    'solana:mainnet',
    'solana:devnet',
    'solana:testnet',
    'solana:localnet',
  ],
  delay,
  mode: args.mode,
  name: args.name,
  rpcUrl: args.rpc,
  secretKey,
};

const {outputFiles} = await build({
  bundle: true,
  define: {
    __AGENT_WALLET_CONFIG__: JSON.stringify(config),
    // Development builds of Kit and @wallet-standard/errors throw
    // human-readable messages instead of bare error codes.
    'process.env.NODE_ENV': '"development"',
  },
  entryPoints: [fileURLToPath(new URL('../src/browser.ts', import.meta.url))],
  format: 'iife',
  minify: true,
  platform: 'browser',
  target: 'es2022',
  write: false,
});
const script = outputFiles[0].text;

if (args.out) {
  mkdirSync(dirname(args.out), {recursive: true});
  writeFileSync(args.out, script);
} else {
  process.stdout.write(script);
}
const address = getBase58Decoder().decode(new Uint8Array(secretKey.slice(32)));
console.error(`agent wallet ${address} (${args.mode}) -> ${args.rpc}`);
