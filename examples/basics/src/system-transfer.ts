import assert from 'node:assert/strict';

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
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

const startingBalance = await connection.getBalance(sender.publicKey);
assert.equal(startingBalance, BigInt(LAMPORTS_PER_SOL));

const amount = 1_000_000n;
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    lamports: amount,
    toPubkey: recipient.publicKey,
  }),
);
const signature = await sendAndConfirmTransaction(connection, transaction, [
  sender,
]);

const senderBalance = await connection.getBalance(sender.publicKey);
const recipientBalance = await connection.getBalance(recipient.publicKey);
assert.equal(recipientBalance, amount);
assert.ok(senderBalance < startingBalance - amount);

console.log('Transfer signature:', signature);
console.log('Sender balance:', senderBalance);
console.log('Recipient balance:', recipientBalance);
