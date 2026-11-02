import {generateKeyPairSigner, type KeyPairSigner} from '@solana/kit';
import {getWallets} from '@wallet-standard/app';
import {expect, it, vi, onTestFinished} from 'vitest';

import {
  createWalletController,
  WalletConnectionError,
  WalletDisconnectionError,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletNotSelectedError,
  WalletReadyState,
  WalletSignInError,
  WalletSignOffchainMessageError,
} from '../core.js';
import {
  encodeOffchainMessage,
  offchainMessageSigner,
  registerWallets,
  signBytes,
  standardWallet,
  testController,
  withKeyPair,
} from './helpers.js';

const OFFCHAIN_SIGN_IN = {useOffchainMessage: {messageVersion: 1}} as const;

async function setup() {
  const a = standardWallet('A');
  const b = standardWallet('B', 1);
  const unregister = registerWallets(a.wallet, b.wallet);
  const onError = vi.fn(() => {
    throw new Error('Handler failure');
  });
  const owner = createWalletController({
    chain: 'solana:devnet',
    onError,
    storage: null,
  });
  onTestFinished(owner.dispose);
  owner.select('A');
  await owner.connect();
  return {a, b, onError, owner, unregister};
}

async function offchainMessageWallet(signWith?: KeyPairSigner) {
  const {wallet} = standardWallet();
  const signer = await withKeyPair(wallet);
  const account = wallet.accounts[0]!;
  account.features = ['solana:signOffchainMessage'];
  const signOffchainMessage = offchainMessageSigner(signWith ?? signer);
  const onError = vi.fn();
  const owner = testController(
    {
      ...wallet,
      features: {
        ...wallet.features,
        'solana:signOffchainMessage': {
          signOffchainMessage,
          supportedMessageVersions: [1],
          version: '1.0.0',
        },
      },
    },
    {onError},
  );
  owner.select(wallet.name);
  await owner.connect();
  return {account, onError, owner, signOffchainMessage};
}

async function offchainSignInWallet({
  signWith,
  version = '1.1.0',
}: {signWith?: KeyPairSigner; version?: string} = {}) {
  const {wallet} = standardWallet();
  const signer = await withKeyPair(wallet);
  const account = wallet.accounts[0]!;
  const signedMessage = encodeOffchainMessage('Please sign in.', [
    account.publicKey,
  ]);
  const output = {
    account,
    signature: await signBytes(signWith ?? signer, signedMessage),
    signedMessage,
    signedMessageFormat: {kind: 'offchainMessage', messageVersion: 1},
  };
  const signIn = vi.fn(async () => [output]);
  const owner = testController({
    ...wallet,
    features: {...wallet.features, 'solana:signIn': {signIn, version}},
  });
  owner.select(wallet.name);
  return {output, owner, signIn};
}

it('preserves the active account through a rejected switch and reports each failure once, to the adapter', async () => {
  const {b, owner, onError, unregister} = await setup();
  const account = owner.getSnapshot().account;
  expect(owner.getSnapshot().wallet).toMatchObject({
    adapter: {name: 'A', readyState: WalletReadyState.Installed, url: ''},
    readyState: WalletReadyState.Installed,
  });
  owner.select('B');
  expect(owner.getSnapshot().selectedWallet?.adapter.name).toBe('B');
  expect(owner.getSnapshot().wallet?.adapter.name).toBe('A');
  expect(owner.getSnapshot().account).toBe(account);
  expect(b.wallet.features['standard:connect'].connect).not.toHaveBeenCalled();
  const rejection = new Error('User rejected');
  b.wallet.features['standard:connect'].connect.mockRejectedValueOnce(
    rejection,
  );
  const failure = await owner.connect().catch(error => error);
  expect(failure).toBeInstanceOf(WalletConnectionError);
  expect(failure.cause).toBe(rejection);
  expect(failure.error).toBe(rejection);
  expect(onError).toHaveBeenCalledExactlyOnceWith(
    failure,
    expect.objectContaining({name: 'B'}),
  );
  expect(owner.getSnapshot().account).toBe(account);
  let approve!: (result: {accounts: typeof b.wallet.accounts}) => void;
  let approveFirst!: typeof approve;
  b.wallet.features['standard:connect'].connect
    .mockReturnValueOnce(
      new Promise(resolve => {
        approveFirst = resolve;
      }),
    )
    .mockReturnValueOnce(
      new Promise(resolve => {
        approve = resolve;
      }),
    );
  const pending = owner.connect();
  owner.select('A');
  expect(owner.getSnapshot().account).toBe(account);
  // A newer request supersedes the pending one: Kit's AbortError, not a failure report.
  owner.select('B');
  const superseded = owner.connect();
  approveFirst({accounts: b.wallet.accounts});
  await expect(pending).rejects.toMatchObject({name: 'AbortError'});
  expect(onError).toHaveBeenCalledTimes(1);
  owner.select('A');
  approve({accounts: b.wallet.accounts});
  await superseded;
  expect(owner.getSnapshot().wallet?.adapter.name).toBe('B');
  expect(owner.getSnapshot().selectedWallet?.adapter.name).toBe('A');
  const remoteFailure = new Error('Remote disconnect failed');
  b.wallet.features['standard:disconnect'].disconnect.mockRejectedValueOnce(
    remoteFailure,
  );
  const failedDisconnect = owner.disconnect().catch(error => error);
  expect(owner.getSnapshot().selectedWallet).toBeNull();
  owner.select('A');
  const disconnectError = await failedDisconnect;
  expect(disconnectError).toBeInstanceOf(WalletDisconnectionError);
  expect(disconnectError.cause).toBe(remoteFailure);
  expect(owner.getSnapshot().publicKey).toBeNull();
  expect(owner.getSnapshot().selectedWallet?.adapter.name).toBe('A');
  expect(onError).toHaveBeenLastCalledWith(
    disconnectError,
    expect.objectContaining({name: 'B'}),
  );
  expect(onError).toHaveBeenCalledTimes(2);
  unregister();
  expect(owner.getSnapshot().wallets).toEqual([]);
  expect(owner.getSnapshot().selectedWallet).toBeNull();
});

it('reports a wallet that connects without accounts as not connected, as v1 apps expect', async () => {
  const {wallet} = standardWallet('Empty');
  wallet.accounts = [];
  wallet.features['standard:connect'].connect.mockResolvedValueOnce({
    accounts: [],
  });
  const owner = testController(wallet);
  owner.select(wallet.name);
  await expect(owner.connect()).rejects.toBeInstanceOf(WalletNotConnectedError);
});

it('does not reconnect an already-connected wallet, as in v1', async () => {
  const {a, owner} = await setup();
  expect(a.wallet.features['standard:connect'].connect).toHaveBeenCalledOnce();

  await owner.connect();

  expect(a.wallet.features['standard:connect'].connect).toHaveBeenCalledOnce();
});

it('accepts any selection, as in v1, rejects connecting to one that does not resolve, and lists a duplicated name once', async () => {
  const {a, b, owner} = await setup();
  owner.select('Missing');
  expect(owner.getSnapshot().selectedWallet).toBeNull();
  expect(owner.getSnapshot().wallet?.adapter.name).toBe('A');
  await expect(owner.connect()).rejects.toBeInstanceOf(WalletNotReadyError);
  const remove = getWallets().register({...b.wallet, name: 'A'});
  try {
    owner.select('A');
    expect(
      owner.getSnapshot().wallets.map(wallet => wallet.adapter.name),
    ).toEqual(['A', 'B']);
    await owner.connect();
    expect(owner.getSnapshot().publicKey?.toBase58()).toBe(
      a.wallet.accounts[0]!.address,
    );
  } finally {
    remove();
  }
  expect(owner.getSnapshot().selectedWallet?.adapter.name).toBe('A');
  owner.select(null);
  await expect(owner.connect()).rejects.toBeInstanceOf(WalletNotSelectedError);
  expect(owner.getSnapshot().wallet?.adapter.name).toBe('A');
});

it('requires the verified public key on offchain messages, not the wallet account the key was read from', async () => {
  const {account, owner, signOffchainMessage} = await offchainMessageWallet();
  const verified = Uint8Array.from(account.publicKey);
  account.publicKey.fill(9);

  await owner.getSnapshot().signOffchainMessage!('hello');

  expect(signOffchainMessage).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({requiredSigners: [verified]}),
  );
});

it('rejects and reports an offchain message signature the connected account did not make', async () => {
  const foreignKey = await generateKeyPairSigner();
  const {onError, owner, signOffchainMessage} =
    await offchainMessageWallet(foreignKey);

  const failure = await owner.getSnapshot().signOffchainMessage!('hello').catch(
    error => error,
  );

  expect(failure).toBeInstanceOf(WalletSignOffchainMessageError);
  expect(signOffchainMessage).toHaveBeenCalledOnce();
  expect(onError).toHaveBeenCalledExactlyOnceWith(
    failure,
    expect.objectContaining({name: 'Lifecycle wallet'}),
  );
});

it('rejects offchain message required signers that omit the connected account, without asking the wallet', async () => {
  const {owner, signOffchainMessage} = await offchainMessageWallet();
  const other = new Uint8Array(32).fill(9);

  await expect(
    owner.getSnapshot().signOffchainMessage!('hello', {
      requiredSigners: [other],
    }),
  ).rejects.toBeInstanceOf(WalletSignOffchainMessageError);

  expect(signOffchainMessage).not.toHaveBeenCalled();
});

it('rejects offchain message required signers that are not 32 bytes, without asking the wallet', async () => {
  const {account, owner, signOffchainMessage} = await offchainMessageWallet();
  const oversized = Uint8Array.of(...account.publicKey, 0);

  await expect(
    owner.getSnapshot().signOffchainMessage!('hello', {
      requiredSigners: [oversized],
    }),
  ).rejects.toBeInstanceOf(WalletSignOffchainMessageError);

  expect(signOffchainMessage).not.toHaveBeenCalled();
});

it('signs in over an offchain message with wallets advertising a later 1.x solana:signIn', async () => {
  const {output, owner, signIn} = await offchainSignInWallet({
    version: '1.2.0',
  });

  const result = await owner.getSnapshot().signIn!(OFFCHAIN_SIGN_IN);

  expect(owner.getSnapshot().supportsSignInWithOffchainMessage).toBe(true);
  expect(result).toEqual(output);
  expect(signIn).toHaveBeenCalledExactlyOnceWith(OFFCHAIN_SIGN_IN);
  expect(owner.getSnapshot().connected).toBe(true);
});

it('rejects offchain sign-in output the account did not sign', async () => {
  const foreignKey = await generateKeyPairSigner();
  const {owner, signIn} = await offchainSignInWallet({signWith: foreignKey});

  await expect(
    owner.getSnapshot().signIn!(OFFCHAIN_SIGN_IN),
  ).rejects.toBeInstanceOf(WalletSignInError);

  expect(signIn).toHaveBeenCalledOnce();
  expect(owner.getSnapshot().connected).toBe(false);
});
