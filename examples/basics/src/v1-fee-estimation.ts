import assert from 'node:assert/strict';

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  MessageV1,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
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

const amount = 1_000_000n;
const message = new TransactionMessage({
  instructions: [
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      lamports: amount,
      toPubkey: recipient.publicKey,
    }),
  ],
  payerKey: sender.publicKey,
  recentBlockhash: latestBlockhash.blockhash,
});

const simulation = await connection.simulateTransaction(
  new VersionedTransaction(
    message.compileToV1Message({
      computeUnitLimit: 1_400_000,
      loadedAccountsDataSizeLimit: 64 * 1024 * 1024,
    }),
  ),
  {replaceRecentBlockhash: true},
);
assert.equal(simulation.value.err, null);
assert.ok(simulation.value.unitsConsumed !== undefined);
assert.ok(simulation.value.loadedAccountsDataSize !== undefined);

const transactionConfig = {
  computeUnitLimit: Math.ceil(Number(simulation.value.unitsConsumed) * 1.1),
  loadedAccountsDataSizeLimit: Math.ceil(
    simulation.value.loadedAccountsDataSize * 1.1,
  ),
  priorityFeeLamports: 10_000n,
};
const v1Message = message.compileToV1Message(transactionConfig);

const {value: estimatedFee} = await connection.getFeeForMessage(v1Message);
assert.equal(estimatedFee, 5_000n + transactionConfig.priorityFeeLamports);

const transaction = new VersionedTransaction(v1Message);
await transaction.sign([sender]);
const signature = await connection.sendTransaction(transaction);
await connection.confirmTransaction({signature, ...latestBlockhash});

const confirmed = await connection.getTransaction(signature, {
  commitment: 'confirmed',
  maxSupportedTransactionVersion: 1,
});
assert.ok(confirmed?.meta);
assert.ok(confirmed.transaction.message instanceof MessageV1);
assert.deepEqual(
  confirmed.transaction.message.transactionConfig,
  transactionConfig,
);
assert.equal(confirmed.meta.err, null);
assert.equal(confirmed.meta.fee, estimatedFee);
assert.equal(
  confirmed.meta.computeUnitsConsumed,
  simulation.value.unitsConsumed,
);

const senderBalance = await connection.getBalance(sender.publicKey);
assert.equal(senderBalance, startingBalance - amount - estimatedFee);

console.log('Transfer signature:', signature);
console.log('Compute units consumed:', confirmed.meta.computeUnitsConsumed);
console.log('Compute unit limit:', transactionConfig.computeUnitLimit);
console.log('Fee paid:', confirmed.meta.fee);
