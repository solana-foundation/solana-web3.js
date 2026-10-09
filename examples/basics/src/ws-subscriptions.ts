import assert from 'node:assert/strict';
import {setTimeout} from 'node:timers/promises';

import {
  type AccountInfoWithSpace,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  type Logs,
  type SignatureResult,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

const connection = new Connection(
  process.env.RPC_URL ?? 'http://127.0.0.1:8899',
  'confirmed',
);

const sender = await Keypair.generate();
const recipient = await Keypair.generate();

const airdropSignature = await connection.requestAirdrop(
  sender.publicKey,
  LAMPORTS_PER_SOL,
);
const latestBlockhash = await connection.getLatestBlockhash();
await connection.confirmTransaction({
  signature: airdropSignature,
  ...latestBlockhash,
});

let accountSubscriptionId = 0;
const accountNotification = new Promise<AccountInfoWithSpace<Uint8Array>>(
  resolve => {
    accountSubscriptionId = connection.onAccountChange(
      recipient.publicKey,
      resolve,
    );
  },
);

let logsSubscriptionId = 0;
const logsNotification = new Promise<Logs>(resolve => {
  logsSubscriptionId = connection.onLogs(recipient.publicKey, resolve);
});

const amount = 1_000_000n;
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    lamports: amount,
    toPubkey: recipient.publicKey,
  }),
);
const subscriptionReadySignal = AbortSignal.timeout(10_000);
await Promise.all([
  connection.awaitSubscriptionReady(accountSubscriptionId, {
    abortSignal: subscriptionReadySignal,
  }),
  connection.awaitSubscriptionReady(logsSubscriptionId, {
    abortSignal: subscriptionReadySignal,
  }),
]);
const signature = await connection.sendTransaction(transaction, [sender]);

const signatureNotification = new Promise<SignatureResult>(resolve => {
  connection.onSignature(signature, resolve);
});

const [accountInfo, logs, signatureResult] = await Promise.race([
  Promise.all([accountNotification, logsNotification, signatureNotification]),
  setTimeout(10_000, undefined, {ref: false}).then(() => {
    throw new Error('Timed out waiting for subscription notifications');
  }),
]);

await connection.removeAccountChangeListener(accountSubscriptionId);
await connection.removeOnLogsListener(logsSubscriptionId);

assert.equal(accountInfo.lamports, amount);
assert.ok(accountInfo.owner.equals(SystemProgram.programId));
assert.equal(logs.signature, signature);
assert.equal(logs.err, null);
assert.equal(signatureResult.err, null);

console.log('Transfer signature:', signature);
console.log('Recipient lamports:', accountInfo.lamports);
console.log('Logs:', logs.logs);
