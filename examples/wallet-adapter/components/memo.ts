import {PublicKey, TransactionInstruction} from '@solana/web3.js';

export const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
);

export const MEMO_V1_PROGRAM_ID = new PublicKey(
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
);

export const MEMO_TEXT = 'Hello, from the Solana Wallet Adapter example app!';

export function memoInstruction(): TransactionInstruction {
  return new TransactionInstruction({
    data: new TextEncoder().encode(MEMO_TEXT),
    keys: [],
    programId: MEMO_PROGRAM_ID,
  });
}
