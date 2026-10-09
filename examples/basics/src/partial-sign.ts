import assert from 'node:assert/strict';

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

const connection = new Connection(
  process.env.RPC_URL ?? 'http://127.0.0.1:8899',
  'confirmed',
);

const server = await Keypair.generate();
const user = await Keypair.generate();
const recipient = await Keypair.generate();

const airdropSignatures = await Promise.all(
  [server, user].map(keypair =>
    connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL),
  ),
);
const airdropBlockhash = await connection.getLatestBlockhash();
await Promise.all(
  airdropSignatures.map(signature =>
    connection.confirmTransaction({signature, ...airdropBlockhash}),
  ),
);

const serverStartingBalance = await connection.getBalance(server.publicKey);
const userStartingBalance = await connection.getBalance(user.publicKey);

const amount = 1_000_000n;
const latestBlockhash = await connection.getLatestBlockhash();
const serverTransaction = new Transaction({
  ...latestBlockhash,
  feePayer: server.publicKey,
}).add(
  SystemProgram.transfer({
    fromPubkey: user.publicKey,
    lamports: amount,
    toPubkey: recipient.publicKey,
  }),
);
await serverTransaction.partialSign(server);
assert.equal(await serverTransaction.verifySignatures(), false);
assert.equal(await serverTransaction.verifySignatures(false), true);

const partiallySigned = await serverTransaction.serialize({
  requireAllSignatures: false,
});

const userTransaction = Transaction.from(partiallySigned);
await userTransaction.partialSign(user);
assert.equal(await userTransaction.verifySignatures(), true);

const signature = await connection.sendRawTransaction(
  await userTransaction.serialize(),
);
await connection.confirmTransaction({signature, ...latestBlockhash});

const serverBalance = await connection.getBalance(server.publicKey);
const userBalance = await connection.getBalance(user.publicKey);
const recipientBalance = await connection.getBalance(recipient.publicKey);
assert.equal(recipientBalance, amount);
assert.equal(userBalance, userStartingBalance - amount);
assert.equal(serverBalance, serverStartingBalance - 10_000n);

console.log('Transfer signature:', signature);
console.log('Fee payer:', userTransaction.feePayer?.toBase58());
console.log('Fee paid by server:', serverStartingBalance - serverBalance);
console.log('User balance:', userBalance);
console.log('Recipient balance:', recipientBalance);
