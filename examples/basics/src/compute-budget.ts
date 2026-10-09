import assert from 'node:assert/strict';

import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
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

const microLamports = 100_000n;
const transferInstruction = SystemProgram.transfer({
  fromPubkey: sender.publicKey,
  lamports: 1_000_000n,
  toPubkey: recipient.publicKey,
});
const priceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports,
});

const simulationTransaction = new Transaction({
  ...latestBlockhash,
  feePayer: sender.publicKey,
}).add(
  ComputeBudgetProgram.setComputeUnitLimit({units: 1_400_000}),
  priceInstruction,
  transferInstruction,
);
const simulation = await connection.simulateTransaction(
  new VersionedTransaction(simulationTransaction.compileMessage()),
  {replaceRecentBlockhash: true, sigVerify: false},
);
assert.equal(simulation.value.err, null);
assert.ok(simulation.value.unitsConsumed);

const unitLimit = Math.ceil(Number(simulation.value.unitsConsumed) * 1.1);
const transaction = new Transaction().add(
  ComputeBudgetProgram.setComputeUnitLimit({units: unitLimit}),
  priceInstruction,
  transferInstruction,
);
const signature = await sendAndConfirmTransaction(connection, transaction, [
  sender,
]);

const confirmed = await connection.getTransaction(signature, {
  maxSupportedTransactionVersion: 0,
});
assert.ok(confirmed?.meta?.computeUnitsConsumed);
assert.ok(confirmed.meta.computeUnitsConsumed <= BigInt(unitLimit));
assert.ok(confirmed.meta.fee > 5000n);

console.log('Transaction signature:', signature);
console.log('Simulated units consumed:', simulation.value.unitsConsumed);
console.log('Compute unit limit:', unitLimit);
console.log('Units consumed:', confirmed.meta.computeUnitsConsumed);
console.log('Fee (lamports):', confirmed.meta.fee);
