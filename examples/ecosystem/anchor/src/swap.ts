import assert from 'node:assert/strict';
import {setTimeout} from 'node:timers/promises';

import {AnchorProvider, Program} from '@anchor-lang/core';
import {
  findAssociatedTokenPda,
  getCloseAccountInstruction,
  getCreateAssociatedTokenIdempotentInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token';
import {Surfnet} from '@solana/surfpool';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';

import idl from '../idl/whirlpool.json' with {type: 'json'};
import type {Whirlpool} from '../idl/whirlpool.ts';

const SOL_USDC_POOL = new PublicKey(
  'Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE',
);
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const TICKS_PER_ARRAY = 88;
const MAX_SQRT_PRICE = 79226673515401279992447579055n;
const SOL_FUNDING = 10 * LAMPORTS_PER_SOL;
const USDC_IN = 100_000_000n;

const surfnet = Surfnet.startWithConfig({
  offline: false,
  remoteRpcUrl: process.env.MAINNET_RPC_URL ?? 'https://api.mainnet.solana.com',
});

const connection = new Connection(surfnet.rpcUrl, {
  commitment: 'confirmed',
  wsEndpoint: surfnet.wsUrl,
});

const trader = await Keypair.generate();
surfnet.fundSol(trader.publicKey.toBase58(), SOL_FUNDING);
surfnet.fundToken(
  trader.publicKey.toBase58(),
  USDC_MINT.toBase58(),
  Number(USDC_IN),
);

const provider = new AnchorProvider(connection, trader);
const program = new Program<Whirlpool>(idl, provider);
const programId = new PublicKey(program.address);

const {data: pool} = await program.account.whirlpool.fetch(SOL_USDC_POOL);
assert.equal(pool.tokenMintA, WSOL_MINT.toBase58());
assert.equal(pool.tokenMintB, USDC_MINT.toBase58());

const ticksPerArray = pool.tickSpacing * TICKS_PER_ARRAY;
const startTickIndex =
  Math.floor((pool.tickCurrentIndex + pool.tickSpacing) / ticksPerArray) *
  ticksPerArray;
async function findTickArray(offset: number) {
  const [address] = await PublicKey.findProgramAddress(
    [
      new TextEncoder().encode('tick_array'),
      SOL_USDC_POOL.toBytes(),
      new TextEncoder().encode(String(startTickIndex + offset * ticksPerArray)),
    ],
    programId,
  );
  return address;
}
const [tickArray0, tickArray1, tickArray2] = await Promise.all([
  findTickArray(0),
  findTickArray(1),
  findTickArray(2),
]);

const [wsolAccount] = await findAssociatedTokenPda({
  mint: WSOL_MINT,
  owner: trader.publicKey,
  tokenProgram: TOKEN_PROGRAM_ADDRESS,
});
const [usdcAccount] = await findAssociatedTokenPda({
  mint: USDC_MINT,
  owner: trader.publicKey,
  tokenProgram: TOKEN_PROGRAM_ADDRESS,
});

const events = new AbortController();
const traded = new Promise<bigint>((resolve, reject) => {
  program.addEventListener('traded', event => resolve(event.outputAmount), {
    abortSignal: events.signal,
    onError: (error, {fatal}) => {
      if (fatal) reject(error);
    },
  });
});

const createAtaIx = getCreateAssociatedTokenIdempotentInstruction({
  ata: wsolAccount,
  mint: WSOL_MINT,
  owner: trader.publicKey,
  payer: trader,
});

const swapIx = await program.methods
  .swap(USDC_IN, 0n, MAX_SQRT_PRICE, true, false)
  .accounts({
    tickArray0,
    tickArray1,
    tickArray2,
    tokenAuthority: trader.publicKey,
    tokenOwnerAccountA: wsolAccount,
    tokenOwnerAccountB: usdcAccount,
    tokenVaultA: pool.tokenVaultA,
    tokenVaultB: pool.tokenVaultB,
    whirlpool: SOL_USDC_POOL,
  })
  .instruction();

const closeIx = getCloseAccountInstruction({
  account: wsolAccount,
  destination: trader.publicKey,
  owner: trader,
});

const swapTransaction = new Transaction().add(createAtaIx, swapIx, closeIx);

const swapSignature = await sendAndConfirmTransaction(
  connection,
  swapTransaction,
  [trader],
);

const solOut = await Promise.race([
  traded,
  setTimeout(10_000, undefined, {ref: false}).then(() => {
    throw new Error('Timed out waiting for the traded event');
  }),
]);
events.abort();

const {data: poolAfter} = await program.account.whirlpool.fetch(SOL_USDC_POOL);
const solBalance = await connection.getBalance(trader.publicKey);
const usdcBalance = await connection.getTokenAccountBalance(
  new PublicKey(usdcAccount),
);

assert.ok(solOut > 0n);
assert.ok(solBalance > BigInt(SOL_FUNDING));
assert.equal(usdcBalance.value.amount, '0');
assert.ok(poolAfter.sqrtPrice > pool.sqrtPrice);
assert.equal(await connection.getAccountInfo(new PublicKey(wsolAccount)), null);

console.log('Pool:', SOL_USDC_POOL.toBase58());
console.log('Pool liquidity:', pool.liquidity);
console.log('Pool sqrt price before:', pool.sqrtPrice);
console.log('Pool sqrt price after:', poolAfter.sqrtPrice);
console.log('Swap signature:', swapSignature);
console.log('USDC in:', USDC_IN);
console.log('SOL out (lamports):', solOut);
console.log('Trader SOL balance (lamports):', solBalance);
