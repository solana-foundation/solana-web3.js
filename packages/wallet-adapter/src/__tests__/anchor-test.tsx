import {AnchorProvider} from '@anchor-lang/core';
import {
  type Address,
  type Blockhash,
  compileTransaction,
  createTransactionMessage,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import {Connection} from '@solana/web3.js';
import {act, renderHook} from '@testing-library/react';
import type {ReactNode} from 'react';
import {expect, it, vi} from 'vitest';

import {useAnchorWallet, useWallet} from '../index.js';
import {WalletProvider} from '../WalletProvider.js';
import {
  registerWallets,
  signingStandardWallet,
  SIGNATURE,
  standardWallet,
} from './helpers.js';

const lifetime = {
  blockhash: getBase58Decoder().decode(new Uint8Array(32).fill(1)) as Blockhash,
  lastValidBlockHeight: 42n,
};

function kitTransaction(feePayer: Address, version: 'legacy' | 0 = 0) {
  return compileTransaction(
    pipe(
      createTransactionMessage({version}),
      message => setTransactionMessageFeePayer(feePayer, message),
      message => setTransactionMessageLifetimeUsingBlockhash(lifetime, message),
    ),
  );
}

async function connectedAnchorWallet(
  wallet: Parameters<typeof registerWallets>[0],
) {
  registerWallets(wallet);
  const onError = vi.fn();
  const rendered = renderHook(
    () => ({anchor: useAnchorWallet(), wallet: useWallet()}),
    {
      wrapper: ({children}: {children: ReactNode}) => (
        <WalletProvider chain="solana:devnet" storage={null} onError={onError}>
          {children}
        </WalletProvider>
      ),
    },
  );
  expect(rendered.result.current.anchor).toBeUndefined();
  act(() => rendered.result.current.wallet.select(wallet.name));
  await act(() => rendered.result.current.wallet.connect());
  expect(rendered.result.current.wallet.connected).toBe(true);
  return {...rendered, onError};
}

it('hands AnchorProvider a wallet that signs through the connected account', async () => {
  const {wallet, signTransaction} = signingStandardWallet();
  const {result, rerender} = await connectedAnchorWallet(wallet);
  const anchor = result.current.anchor!;
  const {
    publicKey,
    signTransaction: sign,
    signAllTransactions,
  } = result.current.wallet;
  expect(anchor).toMatchObject({
    address: publicKey!.toBase58(),
    publicKey,
    signAllTransactions,
    signTransaction: sign,
  });
  rerender();
  expect(result.current.anchor).toBe(anchor);

  const provider = new AnchorProvider(
    new Connection('http://127.0.0.1:8899'),
    anchor,
  );
  expect(provider.wallet).toBe(anchor);

  const transactions = [
    kitTransaction(anchor.address),
    kitTransaction(anchor.address, 'legacy'),
  ];
  const signed = await anchor.modifyAndSignTransactions(transactions);
  expect(signTransaction).toHaveBeenCalledTimes(1);
  expect(signed).toHaveLength(2);
  signed.forEach((transaction, i) => {
    expect(transaction.messageBytes).toEqual(transactions[i]!.messageBytes);
    expect(transaction.signatures[anchor.address]).toEqual(SIGNATURE);
    expect(transaction.lifetimeConstraint).toEqual(lifetime);
    expect(Object.isFrozen(transaction)).toBe(true);
  });
});

it('reports Anchor signing failures like the rest of the adapter', async () => {
  const {wallet, signTransaction} = signingStandardWallet();
  const {result, onError} = await connectedAnchorWallet(wallet);
  const anchor = result.current.anchor!;

  wallet.features['solana:signTransaction'].supportedTransactionVersions = [
    'legacy',
  ];
  await expect(
    anchor.modifyAndSignTransactions([kitTransaction(anchor.address)]),
  ).rejects.toMatchObject({name: 'WalletSignTransactionError'});
  expect(signTransaction).not.toHaveBeenCalled();

  signTransaction.mockRejectedValueOnce(new Error('User rejected'));
  const rejection = anchor.modifyAndSignTransactions([
    kitTransaction(anchor.address, 'legacy'),
  ]);
  await expect(rejection).rejects.toMatchObject({
    message: 'User rejected',
    name: 'WalletSignTransactionError',
  });
  expect(onError).toHaveBeenCalledTimes(2);
  expect(onError).toHaveBeenLastCalledWith(
    await rejection.catch((error: unknown) => error),
    expect.objectContaining({name: wallet.name}),
  );
});

it('is undefined for a wallet that cannot sign transactions', async () => {
  const {result} = await connectedAnchorWallet(standardWallet().wallet);
  expect(result.current.anchor).toBeUndefined();
});

it('is undefined for a wallet that can only sign and send', async () => {
  const base = standardWallet();
  const {result} = await connectedAnchorWallet({
    ...base.wallet,
    accounts: base.wallet.accounts.map(account => ({
      ...account,
      features: ['solana:signAndSendTransaction'] as const,
    })),
    features: {
      ...base.wallet.features,
      'solana:signAndSendTransaction': {
        signAndSendTransaction: vi.fn(),
        supportedTransactionVersions: ['legacy', 0],
        version: '1.0.0',
      },
    },
  });
  expect(result.current.wallet.signer).not.toBeNull();
  expect(result.current.anchor).toBeUndefined();
});

it('is undefined again after disconnecting', async () => {
  const {result} = await connectedAnchorWallet(signingStandardWallet().wallet);
  expect(result.current.anchor).toBeDefined();
  await act(() => result.current.wallet.disconnect());
  expect(result.current.anchor).toBeUndefined();
});
