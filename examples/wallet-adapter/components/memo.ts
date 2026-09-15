import {PublicKey, TransactionInstruction} from '@solana/web3.js';

export const MEMO_PROGRAM_ID = new PublicKey(
  'Memo4c2pN8afCj432Lb7RMVKi9PbQnnW7ewFFaV3oAH',
);

export const MEMO_TEXT = 'Hello, from the Solana Wallet Adapter example app!';

export function memoInstruction(): TransactionInstruction {
  return new TransactionInstruction({
    data: new TextEncoder().encode(MEMO_TEXT),
    keys: [],
    programId: MEMO_PROGRAM_ID,
  });
}
