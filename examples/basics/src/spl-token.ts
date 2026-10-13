import assert from 'node:assert/strict';

import {
  findAssociatedTokenPda,
  getCreateMintInstructionPlan,
  getMintDecoder,
  getMintToATAInstructionPlanAsync,
  getTokenDecoder,
  getTransferToATAInstructionPlanAsync,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';

const connection = new Connection(
  process.env.RPC_URL ?? 'http://127.0.0.1:8899',
  'confirmed',
);

const payer = await Keypair.generate();
const mint = await Keypair.generate();
const recipient = await Keypair.generate();
const decimals = 6;

const airdropSignature = await connection.requestAirdrop(
  payer.publicKey,
  LAMPORTS_PER_SOL,
);
const latestBlockhash = await connection.getLatestBlockhash();
await connection.confirmTransaction({
  signature: airdropSignature,
  ...latestBlockhash,
});

const createMintInstructions = await getCreateMintInstructionPlan(connection, {
  decimals,
  mintAuthority: payer.publicKey.toBase58(),
  newMint: mint,
  payer,
});

await sendAndConfirmTransaction(
  connection,
  new Transaction().add(createMintInstructions),
  [payer, mint],
);

const mintAmount = 1_000_000_000n;
await sendAndConfirmTransaction(
  connection,
  new Transaction().add(
    await getMintToATAInstructionPlanAsync({
      amount: mintAmount,
      decimals,
      mint: mint.publicKey.toBase58(),
      mintAuthority: payer,
      owner: payer.publicKey.toBase58(),
      payer,
    }),
  ),
  [payer],
);

const transferAmount = 250_000_000n;
const transferSignature = await sendAndConfirmTransaction(
  connection,
  new Transaction().add(
    await getTransferToATAInstructionPlanAsync({
      amount: transferAmount,
      authority: payer,
      decimals,
      mint: mint.publicKey.toBase58(),
      payer,
      recipient: recipient.publicKey.toBase58(),
    }),
  ),
  [payer],
);

const [payerAta] = await findAssociatedTokenPda({
  mint: mint.publicKey.toBase58(),
  owner: payer.publicKey.toBase58(),
  tokenProgram: TOKEN_PROGRAM_ADDRESS,
});
const [recipientAta] = await findAssociatedTokenPda({
  mint: mint.publicKey.toBase58(),
  owner: recipient.publicKey.toBase58(),
  tokenProgram: TOKEN_PROGRAM_ADDRESS,
});

const mintAccount = await connection.getAccountInfo(mint.publicKey);
const payerTokenAccount = await connection.getAccountInfo(
  new PublicKey(payerAta),
);
const recipientTokenAccount = await connection.getAccountInfo(
  new PublicKey(recipientAta),
);
assert.ok(mintAccount && payerTokenAccount && recipientTokenAccount);
assert.ok(mintAccount.owner.equals(new PublicKey(TOKEN_PROGRAM_ADDRESS)));

const mintData = getMintDecoder().decode(mintAccount.data);
const payerToken = getTokenDecoder().decode(payerTokenAccount.data);
const recipientToken = getTokenDecoder().decode(recipientTokenAccount.data);

assert.equal(mintData.decimals, decimals);
assert.equal(mintData.supply, mintAmount);
assert.equal(payerToken.amount, mintAmount - transferAmount);
assert.equal(recipientToken.amount, transferAmount);
assert.equal(recipientToken.owner, recipient.publicKey.toBase58());

console.log('Mint:', mint.publicKey.toBase58());
console.log('Transfer signature:', transferSignature);
console.log('Supply:', mintData.supply);
console.log('Payer balance:', payerToken.amount);
console.log('Recipient balance:', recipientToken.amount);
