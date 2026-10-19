import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  compressTransactionMessageUsingAddressLookupTables,
  createTransactionMessage,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Blockhash,
} from '@solana/kit';
import {isWalletStandardError} from '@wallet-standard/errors';
import {describe, expect, it} from 'vitest';

import {createAgentWallet} from '../wallet.js';

const MEMO_PROGRAM = address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const LOOKUP_TABLE = address('AddressLookupTab1e1111111111111111111111111');
const LOOKED_UP_ACCOUNT = address(
  'SysvarC1ock11111111111111111111111111111111',
);

function memoTransactionMessage(
  feePayer: Address,
  accounts: {address: Address; role: AccountRole}[] = [],
) {
  return pipe(
    createTransactionMessage({version: 0}),
    message => setTransactionMessageFeePayer(feePayer, message),
    message =>
      setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: '11111111111111111111111111111111' as Blockhash,
          lastValidBlockHeight: 0n,
        },
        message,
      ),
    message =>
      appendTransactionMessageInstruction(
        {accounts, data: new Uint8Array([1]), programAddress: MEMO_PROGRAM},
        message,
      ),
  );
}

async function manualWallet() {
  return await createAgentWallet({
    features: [
      'standard:connect',
      'solana:signMessage',
      'solana:signTransaction',
    ],
    mode: 'manual',
  });
}

describe('createAgentWallet', () => {
  it('holds a non-silent connect for approval', async () => {
    const {approvals, wallet} = await manualWallet();
    const connect = wallet.features['standard:connect']!.connect();
    expect(approvals.pending()).toEqual([
      {id: 1, inputs: [], method: 'standard:connect'},
    ]);
    expect(wallet.accounts).toEqual([]);
    approvals.approve(1);
    await connect;
    expect(wallet.accounts).toHaveLength(1);
  });

  it('returns no accounts from a silent connect before approval', async () => {
    const {approvals, wallet} = await manualWallet();
    const {accounts} = await wallet.features['standard:connect']!.connect({
      silent: true,
    });
    expect(accounts).toEqual([]);
    expect(approvals.pending()).toEqual([]);
    expect(wallet.accounts).toEqual([]);
  });

  it('connects silently without asking in auto mode', async () => {
    const {approvals, wallet} = await createAgentWallet({
      features: ['standard:connect'],
      mode: 'auto',
    });
    const {accounts} = await wallet.features['standard:connect']!.connect({
      silent: true,
    });
    expect(accounts).toHaveLength(1);
    expect(approvals.pending()).toEqual([]);
    expect(wallet.accounts).toHaveLength(1);
  });

  it('summarizes a message and rejects it as the user', async () => {
    const {approvals, signers, wallet} = await manualWallet();
    const signing = wallet.features['solana:signMessage']!.signMessage({
      account: {address: signers[0]!.address},
      message: new TextEncoder().encode('gm'),
    });
    expect(approvals.pending()[0]!.inputs).toEqual([
      {account: signers[0]!.address, message: 'gm'},
    ]);
    approvals.reject(1);
    expect(
      isWalletStandardError(await signing.catch((error: unknown) => error)),
    ).toBe(true);
  });

  it('signs the message bytes that were approved', async () => {
    const {approvals, signers, wallet} = await manualWallet();
    const message = new TextEncoder().encode('gm');
    const signing = wallet.features['solana:signMessage']!.signMessage({
      account: {address: signers[0]!.address},
      message,
    });
    message.set(new TextEncoder().encode('no'));
    approvals.approve(1);
    const [output] = await signing;
    expect(new TextDecoder().decode(output!.signedMessage)).toBe('gm');
  });

  it('summarizes a transaction', async () => {
    const {approvals, signers, wallet} = await manualWallet();
    const feePayer = signers[0]!.address;
    const transaction = getTransactionEncoder().encode(
      compileTransaction(memoTransactionMessage(feePayer)),
    );
    const signing = wallet.features['solana:signTransaction']!.signTransaction({
      account: {address: feePayer},
      transaction: new Uint8Array(transaction),
    });
    expect(approvals.pending()[0]!.inputs).toEqual([
      {
        account: feePayer,
        feePayer,
        instructions: 1,
        programs: [MEMO_PROGRAM],
        version: 0,
      },
    ]);
    approvals.approve(1);
    const [output] = await signing;
    expect(output!.signedTransaction).toHaveLength(transaction.length);
  });

  it('summarizes a transaction that loads accounts from a lookup table', async () => {
    const {approvals, signers, wallet} = await manualWallet();
    const feePayer = signers[0]!.address;
    const message = compressTransactionMessageUsingAddressLookupTables(
      memoTransactionMessage(feePayer, [
        {address: LOOKED_UP_ACCOUNT, role: AccountRole.READONLY},
      ]),
      {[LOOKUP_TABLE]: [LOOKED_UP_ACCOUNT]},
    );
    const transaction = getTransactionEncoder().encode(
      compileTransaction(message),
    );
    void wallet.features['solana:signTransaction']!.signTransaction({
      account: {address: feePayer},
      transaction: new Uint8Array(transaction),
    });
    expect(approvals.pending()[0]!.inputs).toEqual([
      {
        account: feePayer,
        feePayer,
        instructions: 1,
        programs: [MEMO_PROGRAM],
        version: 0,
      },
    ]);
  });
});
