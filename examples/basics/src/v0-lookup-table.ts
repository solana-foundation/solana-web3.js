import assert from 'node:assert/strict';
import {setTimeout} from 'node:timers/promises';

import {
  AddressLookupTableProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

const connection = new Connection(
  process.env.RPC_URL ?? 'http://127.0.0.1:8899',
  'confirmed',
);

const payer = await Keypair.generate();
const recipients = await Promise.all(
  Array.from({length: 3}, () => Keypair.generate()),
);
const recipientKeys = recipients.map(recipient => recipient.publicKey);

const airdropSignature = await connection.requestAirdrop(
  payer.publicKey,
  LAMPORTS_PER_SOL,
);
const airdropBlockhash = await connection.getLatestBlockhash();
await connection.confirmTransaction({
  signature: airdropSignature,
  ...airdropBlockhash,
});

const recentSlot = await connection.getSlot('finalized');
const [createInstruction, lookupTableAddress] =
  await AddressLookupTableProgram.createLookupTable({
    authority: payer.publicKey,
    payer: payer.publicKey,
    recentSlot,
  });
const extendInstruction = AddressLookupTableProgram.extendLookupTable({
  addresses: recipientKeys,
  authority: payer.publicKey,
  lookupTable: lookupTableAddress,
  payer: payer.publicKey,
});
await sendAndConfirmTransaction(
  connection,
  new Transaction().add(createInstruction, extendInstruction),
  [payer],
);

const {value: lookupTable} =
  await connection.getAddressLookupTable(lookupTableAddress);
assert.ok(lookupTable);
assert.deepEqual(
  lookupTable.state.addresses.map(address => address.toBase58()),
  recipientKeys.map(key => key.toBase58()),
);

let attempts = 0;
while ((await connection.getSlot()) <= lookupTable.state.lastExtendedSlot) {
  assert.ok(++attempts < 50, 'Lookup table did not become usable in time');
  await setTimeout(100);
}

const amount = 1_000_000n;
const latestBlockhash = await connection.getLatestBlockhash();
const message = new TransactionMessage({
  instructions: recipientKeys.map(toPubkey =>
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      lamports: amount,
      toPubkey,
    }),
  ),
  payerKey: payer.publicKey,
  recentBlockhash: latestBlockhash.blockhash,
}).compileToV0Message([lookupTable]);

assert.equal(message.addressTableLookups.length, 1);
assert.ok(
  message.addressTableLookups[0]?.accountKey.equals(lookupTableAddress),
);

const transaction = new VersionedTransaction(message);
await transaction.sign([payer]);
const signature = await connection.sendTransaction(transaction);
await connection.confirmTransaction({signature, ...latestBlockhash});

const confirmedTransaction = await connection.getTransaction(signature, {
  commitment: 'confirmed',
  maxSupportedTransactionVersion: 0,
});
assert.ok(confirmedTransaction);
assert.equal(confirmedTransaction.version, 0);

const recipientBalances = await Promise.all(
  recipientKeys.map(key => connection.getBalance(key)),
);
for (const balance of recipientBalances) {
  assert.equal(balance, amount);
}

console.log('Lookup table:', lookupTableAddress.toBase58());
console.log('Transfer signature:', signature);
console.log('Transaction version:', confirmedTransaction.version);
console.log('Recipient balances:', recipientBalances);
