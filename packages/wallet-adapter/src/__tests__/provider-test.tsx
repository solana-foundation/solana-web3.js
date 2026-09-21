import {act, renderHook} from '@testing-library/react';
import {getWallets} from '@wallet-standard/app';
import {hydrateRoot, type Root} from 'react-dom/client';
import {renderToString} from 'react-dom/server';
import {StrictMode, Suspense, useEffect, type ReactNode} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {ConnectionProvider} from '../ConnectionProvider.js';
import {WalletProvider} from '../WalletProvider.js';
import {useAnchorWallet, useConnection, useWallet} from '../index.js';
import {
  WalletConfigError,
  WalletNotReadyError,
  type WalletControllerOptions,
} from '../core.js';
import {standardWallet, registerWallets} from './helpers.js';

describe('provider', () => {
  it('requires a provider', () => {
    expect(() => renderHook(useWallet)).toThrow(WalletConfigError);
  });

  it('observes browser registration and recreates Kit configuration without leaking StrictMode resources', async () => {
    const {wallet, listeners} = standardWallet();
    const excluded = standardWallet('Excluded');
    registerWallets(wallet, excluded.wallet);
    let chain: 'solana:devnet' | 'solana:mainnet' = 'solana:devnet';
    let filter: WalletControllerOptions['filter'] = candidate =>
      candidate.name !== excluded.wallet.name;
    const {result, rerender, unmount} = renderHook(useWallet, {
      wrapper: ({children}: {children: ReactNode}) => (
        <StrictMode>
          <WalletProvider chain={chain} storage={null} filter={filter}>
            {children}
          </WalletProvider>
        </StrictMode>
      ),
    });
    const snapshot = result.current;
    expect(snapshot.wallets.map(w => w.adapter.name)).toEqual([wallet.name]);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(listeners.size).toBe(1);
    expect(excluded.listeners.size).toBe(0);
    rerender();
    expect(result.current).toBe(snapshot);
    await act(async () => {
      result.current.select(wallet.name);
      await result.current.connect();
    });
    expect(result.current.connected).toBe(true);
    filter = () => false;
    rerender();
    expect(result.current.connected).toBe(false);
    expect(result.current.wallets).toEqual([]);
    expect(listeners.size).toBe(0);
    filter = undefined;
    chain = 'solana:mainnet';
    rerender();
    expect(result.current.wallets).toEqual([]);
    expect(listeners.size).toBe(0);
    unmount();
    expect(listeners.size).toBe(0);
    expect(excluded.listeners.size).toBe(0);
  });

  it('serves operations to effects of children that run before the provider has a client', async () => {
    const {wallet} = standardWallet();
    registerWallets(wallet);
    function AutoSelect() {
      const {select, connect} = useWallet();
      useEffect(() => {
        select(wallet.name);
        void connect();
      }, [select, connect]);
      return null;
    }
    const {result} = renderHook(useWallet, {
      wrapper: ({children}: {children: ReactNode}) => (
        <WalletProvider chain="solana:devnet" storage={null}>
          <AutoSelect />
          {children}
        </WalletProvider>
      ),
    });
    await act(async () => {});
    expect(wallet.features['standard:connect'].connect).toHaveBeenCalledTimes(
      1,
    );
    expect(result.current.connected).toBe(true);
  });

  it('does not acquire a wallet from an abandoned render', () => {
    const {wallet, listeners} = standardWallet();
    registerWallets(wallet);
    const never = new Promise<never>(() => {});
    function Suspend(): never {
      throw never;
    }
    renderHook(() => null, {
      wrapper: () => (
        <Suspense fallback={null}>
          <WalletProvider
            chain="solana:devnet"
            storage={null}
            children={null}
          />
          <Suspend />
        </Suspense>
      ),
    });
    expect(listeners.size).toBe(0);
  });

  it('preserves server-rendered children and activates discovery during hydration', async () => {
    const {wallet, listeners} = standardWallet();
    const unregister = getWallets().register(wallet);
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    function Picker() {
      return (
        <main>
          <h1>Account</h1>
          <span>
            {useWallet()
              .wallets.map(wallet => wallet.adapter.name)
              .join(', ') || 'Disconnected'}
          </span>
        </main>
      );
    }
    const app = (
      <WalletProvider chain="solana:devnet" storage={storage}>
        <Picker />
      </WalletProvider>
    );
    const html = renderToString(app);
    expect(html).toBe('<main><h1>Account</h1><span>Disconnected</span></main>');
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(listeners.size).toBe(0);
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    const serverContent = container.firstChild;
    const onRecoverableError = vi.fn();
    let root: Root | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, app, {onRecoverableError});
      });
      expect(container.textContent).toBe(`Account${wallet.name}`);
      expect(container.firstChild).toBe(serverContent);
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(storage.getItem).toHaveBeenCalledWith('kit-wallet');
      expect(
        wallet.features['standard:connect'].connect,
      ).not.toHaveBeenCalled();
    } finally {
      await act(async () => root?.unmount());
      container.remove();
      unregister();
    }
    expect(listeners.size).toBe(0);
  });

  it('keeps Connection identity until endpoint or config changes', () => {
    let config: {commitment: 'confirmed' | 'finalized'} | undefined;
    const {result, rerender} = renderHook(useConnection, {
      wrapper: ({children}: {children: ReactNode}) => (
        <ConnectionProvider endpoint="http://localhost:8899" config={config}>
          {children}
        </ConnectionProvider>
      ),
    });
    const connection = result.current.connection;
    rerender();
    expect(result.current.connection).toBe(connection);
    config = {commitment: 'finalized'};
    rerender();
    expect(result.current.connection).not.toBe(connection);
  });
});

it('publishes the same authorized capabilities through WalletContext and the React hooks', async () => {
  const {wallet, listeners} = standardWallet();
  wallet.accounts[0]!.features = [
    'solana:signMessage',
    'solana:signTransaction',
  ];
  const output = {
    account: wallet.accounts[0]!,
    signedMessage: new Uint8Array([1]),
    signature: new Uint8Array(64),
  };
  const signIn = vi.fn(async () => [output]);
  const signMessage = vi.fn(
    async (_input: {account: unknown; message: Uint8Array}) => [output],
  );
  const signing = {
    ...wallet,
    features: {
      ...wallet.features,
      'solana:signIn': {version: '1.0.0', signIn},
      'solana:signMessage': {version: '1.0.0', signMessage},
      'solana:signTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signTransaction: vi.fn(),
      },
    },
  };
  const onError = vi.fn();
  registerWallets(signing);
  const {result} = renderHook(
    () => {
      const wallet = useWallet();
      const anchor = useAnchorWallet();
      expect(anchor?.publicKey).toBe(
        wallet.signTransaction ? wallet.publicKey : undefined,
      );
      expect(anchor?.signTransaction).toBe(wallet.signTransaction);
      expect(anchor?.signAllTransactions).toBe(wallet.signAllTransactions);
      return wallet;
    },
    {
      wrapper: ({children}: {children: ReactNode}) => (
        <WalletProvider chain="solana:devnet" storage={null} onError={onError}>
          {children}
        </WalletProvider>
      ),
    },
  );
  expect(result.current.signIn).toBeUndefined();
  expect(result.current.signMessage).toBeUndefined();
  act(() => result.current.select(wallet.name));
  expect(result.current.signIn).toBeTypeOf('function');
  expect(result.current.signMessage).toBeUndefined();
  await act(async () => {
    expect(await result.current.signIn!()).toBe(output);
  });
  expect(wallet.features['standard:connect'].connect).not.toHaveBeenCalled();
  expect(result.current.wallet!.adapter.name).toBe(signing.name);
  expect(await result.current.signMessage!(new Uint8Array([1]))).toEqual(
    output.signature,
  );
  expect(signMessage).toHaveBeenCalledExactlyOnceWith({
    account: wallet.accounts[0],
    message: new Uint8Array([1]),
  });
  // Wallets compare the account by identity; the Kit UI handle is not the wallet's account object.
  expect(signMessage.mock.calls[0]![0]!.account).toBe(wallet.accounts[0]);
  act(() => {
    signing.accounts = signing.accounts.map(account => ({
      ...account,
      label: 'Renamed',
    }));
    for (const listener of listeners) listener();
  });
  await result.current.signMessage!(new Uint8Array([2]));
  expect(signMessage).toHaveBeenLastCalledWith({
    account: signing.accounts[0],
    message: new Uint8Array([2]),
  });
  act(() => {
    signing.accounts = signing.accounts.map(account => ({
      ...account,
      features: [],
    }));
    for (const listener of listeners) listener();
  });
  expect(result.current.signMessage).toBeUndefined();
  expect(result.current.signIn).toBeTypeOf('function');
  const rejection = new Error('Sign-in declined');
  signIn.mockRejectedValueOnce(rejection);
  await act(async () => {
    await expect(result.current.signIn!()).rejects.toMatchObject({
      cause: rejection,
    });
  });
  expect(onError).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({cause: rejection}),
    expect.objectContaining({
      name: wallet.name,
    }),
  );
  expect(result.current.publicKey?.toBase58()).toBe(output.account.address);
});

it('signs offchain messages through the solana:signOffchainMessage feature', async () => {
  const {wallet} = standardWallet();
  wallet.accounts[0]!.features = ['solana:signOffchainMessage'];
  const output = {
    signedOffchainMessage: new Uint8Array([1, 2, 3]),
    signature: new Uint8Array(64),
  };
  const signOffchainMessage = vi.fn(async () => [output]);
  const signing = {
    ...wallet,
    features: {
      ...wallet.features,
      'solana:signOffchainMessage': {
        version: '1.0.0',
        supportedMessageVersions: [1],
        signOffchainMessage,
      },
    },
  };
  registerWallets(signing);
  const {result} = renderHook(useWallet, {
    wrapper: ({children}: {children: ReactNode}) => (
      <WalletProvider chain="solana:devnet" storage={null}>
        {children}
      </WalletProvider>
    ),
  });
  expect(result.current.signOffchainMessage).toBeUndefined();
  act(() => result.current.select(wallet.name));
  await act(async () => result.current.connect());
  expect(result.current.signOffchainMessage).toBeTypeOf('function');
  expect(await result.current.signOffchainMessage!('hello')).toEqual(output);
  expect(signOffchainMessage).toHaveBeenCalledExactlyOnceWith({
    account: wallet.accounts[0],
    message: 'hello',
    messageVersion: 1,
    requiredSigners: [wallet.accounts[0]!.publicKey],
  });
  const extraSigner = new Uint8Array(32).fill(9);
  await result.current.signOffchainMessage!('hello', {
    requiredSigners: [wallet.accounts[0]!.publicKey, extraSigner],
  });
  expect(signOffchainMessage).toHaveBeenLastCalledWith({
    account: wallet.accounts[0],
    message: 'hello',
    messageVersion: 1,
    requiredSigners: [wallet.accounts[0]!.publicKey, extraSigner],
  });
});

it('signs in over an offchain message only when the wallet advertises solana:signIn 1.1.0', async () => {
  const {wallet} = standardWallet();
  const output = {
    account: wallet.accounts[0]!,
    signedMessage: new Uint8Array([1]),
    signature: new Uint8Array(64),
    signedMessageFormat: {kind: 'offchainMessage', messageVersion: 1},
  };
  const signIn = vi.fn(async () => [output]);
  const legacy = {
    ...wallet,
    features: {...wallet.features, 'solana:signIn': {version: '1.0.0', signIn}},
  };
  const upgraded = standardWallet('Upgraded wallet', 1).wallet;
  const offchainOutput = {...output, account: upgraded.accounts[0]!};
  const offchainSignIn = vi.fn(async () => [offchainOutput]);
  const current = {
    ...upgraded,
    features: {
      ...upgraded.features,
      'solana:signIn': {version: '1.1.0', signIn: offchainSignIn},
    },
  };
  const onError = vi.fn();
  registerWallets(legacy, current);
  const {result} = renderHook(useWallet, {
    wrapper: ({children}: {children: ReactNode}) => (
      <WalletProvider chain="solana:devnet" storage={null} onError={onError}>
        {children}
      </WalletProvider>
    ),
  });
  const input = {
    statement: 'Please sign in.',
    useOffchainMessage: {messageVersion: 1},
  } as const;

  expect(result.current.supportsSignInWithOffchainMessage).toBe(false);
  act(() => result.current.select(legacy.name));
  expect(result.current.supportsSignInWithOffchainMessage).toBe(false);
  await act(async () => {
    await expect(result.current.signIn!(input)).rejects.toThrow(
      WalletNotReadyError,
    );
  });
  expect(signIn).not.toHaveBeenCalled();
  expect(onError).toHaveBeenCalledOnce();
  await act(async () => {
    expect(await result.current.signIn!({statement: 'Plain'})).toBe(output);
  });
  expect(signIn).toHaveBeenCalledExactlyOnceWith({statement: 'Plain'});

  act(() => result.current.select(current.name));
  expect(result.current.supportsSignInWithOffchainMessage).toBe(true);
  await act(async () => {
    expect(await result.current.signIn!(input)).toBe(offchainOutput);
  });
  expect(offchainSignIn).toHaveBeenCalledExactlyOnceWith(input);
  expect(result.current.publicKey?.toBase58()).toBe(
    upgraded.accounts[0]!.address,
  );
});
