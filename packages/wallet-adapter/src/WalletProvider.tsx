import type {ReactNode} from 'react';
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  createWalletController,
  type WalletController,
  type WalletControllerOptions,
} from './wallet-controller.js';
import {WalletConfigError, WalletNotReadyError} from './errors.js';
import type {WalletContextState} from './types.js';

export type WalletProviderProps = WalletControllerOptions & {
  children: ReactNode;
};

export const WalletContext = createContext<WalletContextState | null>(null);

export function useWallet(): WalletContextState {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new WalletConfigError('WalletProvider is missing.');
  return wallet;
}

type Operations = Pick<
  WalletController,
  'select' | 'connect' | 'disconnect' | 'sendTransaction'
>;

/**
 * Operations with one identity for the provider's lifetime, forwarding to whichever controller is mounted.
 * Children's effects run before the provider's own, so they can use these before the client exists.
 */
function forwardedOperations(owner: {
  current: WalletController | null;
}): Operations {
  const mounted = () => {
    if (!owner.current)
      throw new WalletNotReadyError('WalletProvider has not mounted.');
    return owner.current;
  };
  return {
    connect: () => mounted().connect(),
    disconnect: () => mounted().disconnect(),
    select: name => mounted().select(name),
    sendTransaction: (transaction, connection, options) =>
      mounted().sendTransaction(transaction, connection, options),
  };
}

/** What children see on the server and until the browser client exists. */
function pendingSnapshot(
  operations: Operations,
  autoConnect: boolean,
): WalletContextState {
  return Object.freeze({
    ...operations,
    account: null,
    address: null,
    autoConnect,
    connected: false,
    connecting: false,
    disconnecting: false,
    publicKey: null,
    selectedWallet: null,
    signer: null,
    status: 'pending',
    supportedTransactionVersions: null,
    supportsSignInWithOffchainMessage: false,
    wallet: null,
    wallets: Object.freeze([]),
  });
}

const noSubscription = () => () => {};

/** Owns Kit's browser wallet client: acquired after commit, disposed on unmount or configuration change. */
export function WalletProvider({
  children,
  chain,
  autoConnect,
  storage,
  storageKey,
  filter,
  onError,
}: WalletProviderProps) {
  const options = useMemo(
    () => ({autoConnect, chain, filter, storage, storageKey}),
    [chain, autoConnect, storage, storageKey, filter],
  );
  const errorRef = useRef(onError);
  errorRef.current = onError;
  const owner = useRef<WalletController | null>(null);
  const [operations] = useState(() => forwardedOperations(owner));
  const [pending] = useState(() =>
    pendingSnapshot(operations, autoConnect ?? true),
  );
  const [controller, setController] = useState<WalletController | null>(null);
  // A layout effect runs on the client only, never for a discarded render, and before children's effects.
  useLayoutEffect(() => {
    const controller = createWalletController({
      ...options,
      onError: (error, adapter) => errorRef.current?.(error, adapter),
    });
    owner.current = controller;
    setController(controller);
    return () => {
      owner.current = null;
      controller.dispose();
    };
  }, [options]);
  const live = useSyncExternalStore(
    controller?.subscribe ?? noSubscription,
    controller?.getSnapshot ?? (() => pending),
    () => pending,
  );
  const snapshot = useMemo(
    () =>
      live === pending ? pending : Object.freeze({...live, ...operations}),
    [live, pending, operations],
  );
  return (
    <WalletContext.Provider value={snapshot}>{children}</WalletContext.Provider>
  );
}
