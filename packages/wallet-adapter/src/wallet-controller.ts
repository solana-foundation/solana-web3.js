import {
  createClient,
  getBase58Decoder,
  isSolanaError,
  signatureBytes,
  SOLANA_ERROR__WALLET__NOT_CONNECTED,
} from '@solana/kit';
import {walletSigner, type WalletPluginConfig} from '@solana/kit-plugin-wallet';
import type {
  SolanaSignAndSendTransactionFeature,
  SolanaSignInInput,
  SolanaSignOffchainMessageFeature,
  SolanaSignTransactionFeature,
} from '@solana/wallet-standard-features';
import {getWalletAccountFeature} from '@wallet-standard/ui';
import {getWalletAccountForUiWalletAccount} from '@wallet-standard/ui-registry';
import {
  PublicKey,
  type Connection,
  type Signer,
  type Transaction,
  type VersionedTransaction,
} from '@solana/web3.js';
import {
  isVersionedTransaction,
  serializeTransaction,
  signTransactionsWithKit,
} from './transactions.js';
import {
  WalletConfigError,
  WalletError,
  WalletConnectionError,
  WalletDisconnectionError,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletNotSelectedError,
  WalletSendTransactionError,
  WalletSignInError,
  WalletSignMessageError,
  WalletSignOffchainMessageError,
  WalletSignTransactionError,
} from './errors.js';
import {
  WalletReadyState,
  type SendTransactionOptions,
  type SignOffchainMessageOptions,
  type SignOffchainMessageOutput,
  type UiWallet,
  type UiWalletAccount,
  type Wallet,
  type WalletContextState,
  type WalletOperations,
} from './types.js';

/** A cluster the RPC endpoint URL unambiguously names, or `undefined` for custom hosts. */
function chainForEndpoint(
  endpoint: string,
): WalletPluginConfig['chain'] | undefined {
  let host: string;
  try {
    host = new URL(endpoint).hostname;
  } catch {
    return undefined;
  }
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]')
    return 'solana:localnet';
  if (host === 'api.devnet.solana.com' || /(^|[.-])devnet([.-]|$)/.test(host))
    return 'solana:devnet';
  if (host === 'api.testnet.solana.com' || /(^|[.-])testnet([.-]|$)/.test(host))
    return 'solana:testnet';
  if (
    host === 'api.mainnet-beta.solana.com' ||
    /(^|[.-])mainnet([.-]|$)/.test(host)
  )
    return 'solana:mainnet';
  return undefined;
}

/** Refuse to submit through an endpoint that plainly names a different cluster than the wallet chain. */
function assertEndpointMatchesChain(
  connection: Connection,
  chain: WalletPluginConfig['chain'],
) {
  const endpoint = connection?.rpcEndpoint;
  if (typeof endpoint !== 'string') return;
  const inferred = chainForEndpoint(endpoint);
  if (inferred !== undefined && inferred !== chain) {
    throw new WalletConfigError(
      `The connection endpoint ${endpoint} targets ${inferred} but the wallet is configured for ${chain}.`,
    );
  }
}

export interface WalletController
  extends Pick<
    WalletOperations,
    'select' | 'connect' | 'disconnect' | 'sendTransaction'
  > {
  getSnapshot(): WalletContextState;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export interface WalletControllerOptions extends WalletPluginConfig {
  onError?: (error: WalletError, adapter?: Wallet['adapter']) => void;
}

const base58 = getBase58Decoder();

/** v1 passed its own errors through unchanged and wrapped everything else. */
function wrap<T extends WalletError>(
  error: unknown,
  Wrapper: new (message: string, cause: unknown) => T,
  message: string,
): WalletError {
  if (error instanceof WalletError) return error;
  // Kit reports a wallet that vanished or came back without accounts as not connected; v1 apps test that class.
  const Wallet = isSolanaError(error, SOLANA_ERROR__WALLET__NOT_CONNECTED)
    ? WalletNotConnectedError
    : Wrapper;
  return new Wallet(
    error instanceof Error && error.message ? error.message : message,
    error,
  );
}

/** Kit rejects a request superseded by a newer connect or sign-in; nothing failed. */
function superseded(error: unknown): boolean {
  // Kit's only signal is this DOMException; a wallet's own AbortError is a failure and is reported.
  return (
    error instanceof DOMException &&
    error.name === 'AbortError' &&
    error.message.includes('superseded')
  );
}

/** v1 refused transaction versions the wallet does not advertise instead of letting the wallet fail. */
function assertSupportedVersions(
  account: UiWalletAccount,
  featureName: 'solana:signTransaction' | 'solana:signAndSendTransaction',
  transactions: readonly (Transaction | VersionedTransaction)[],
) {
  const feature = getWalletAccountFeature(account, featureName) as
    | SolanaSignTransactionFeature['solana:signTransaction']
    | SolanaSignAndSendTransactionFeature['solana:signAndSendTransaction'];
  for (const transaction of transactions) {
    const version = isVersionedTransaction(transaction)
      ? transaction.version
      : 'legacy';
    if (
      !feature.supportedTransactionVersions.some(
        supported => supported === version,
      )
    ) {
      throw new Error(
        `The wallet does not support transaction version ${version}.`,
      );
    }
  }
}

/** The familiar wallet-adapter operations over Kit's wallet plugin: one client, one connection, one signer. */
export function createWalletController({
  onError,
  ...config
}: WalletControllerOptions): WalletController {
  const client = createClient().use(walletSigner(config));
  const namespace = client.wallet;
  // `undefined` follows the active (or restored) connection; `null` is an explicit deselection, as in v1.
  let selectedName: string | null | undefined;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const views = new WeakMap<UiWallet, Wallet>();
  function view(ui: UiWallet): Wallet {
    let wallet = views.get(ui);
    if (!wallet) {
      wallet = Object.freeze({
        adapter: Object.freeze({
          name: ui.name,
          icon: ui.icon,
          url: '',
          readyState: WalletReadyState.Installed,
        }),
        readyState: WalletReadyState.Installed,
      });
      views.set(ui, wallet);
    }
    return wallet;
  }
  function report<T extends WalletError>(error: T, wallet?: UiWallet): T {
    try {
      onError?.(error, wallet && view(wallet).adapter);
    } catch {
      /* A throwing handler must not replace the wallet's failure. */
    }
    return error;
  }
  const unsubscribe = namespace.subscribe(notify);
  const active = () => namespace.getState().connected;
  /** The wallet a selection currently resolves to; unknown names resolve to nothing. */
  function resolve(name = selectedName): UiWallet | undefined {
    const state = namespace.getState();
    if (name === undefined) {
      const account = state.connected?.account ?? state.reconnectingTo;
      return account
        ? state.wallets.find(wallet => wallet.accounts.includes(account))
        : undefined;
    }
    return state.wallets.find(wallet => wallet.name === name);
  }
  /** Wallets are selected by name, so a name registered more than once is listed once: the first registration wins. */
  function uniqueByName(wallets: readonly UiWallet[]): UiWallet[] {
    const seen = new Set<string>();
    return wallets.filter(
      wallet => !seen.has(wallet.name) && Boolean(seen.add(wallet.name)),
    );
  }
  function select(name: string | null): void {
    if (selectedName === name) return;
    selectedName = name;
    notify();
  }
  function selectedWallet(): UiWallet {
    const wallet = resolve();
    if (wallet) return wallet;
    if (selectedName)
      throw new WalletNotReadyError(`Wallet '${selectedName}' is unavailable.`);
    throw new WalletNotSelectedError('Select a wallet before connecting.');
  }
  async function connect(): Promise<void> {
    let target: UiWallet | undefined;
    try {
      if (selectedName === undefined && !active()) {
        // v1 let an automatic reconnect finish instead of prompting again.
        await namespace.whenReady();
        if (active()) return;
      }
      target = selectedWallet();
      await namespace.connect(target);
    } catch (error) {
      if (superseded(error)) throw error;
      throw report(
        wrap(error, WalletConnectionError, 'Wallet connection failed.'),
        target,
      );
    }
  }
  async function disconnect(): Promise<void> {
    const target = active()?.wallet;
    select(null);
    try {
      await namespace.disconnect();
    } catch (error) {
      throw report(
        wrap(error, WalletDisconnectionError, 'Wallet disconnection failed.'),
        target,
      );
    }
  }
  async function signIn(input?: SolanaSignInInput) {
    let target: UiWallet | undefined;
    try {
      target = selectedWallet();
      return await namespace.signIn(target, input ?? {});
    } catch (error) {
      if (superseded(error)) throw error;
      throw report(
        wrap(error, WalletSignInError, 'Wallet sign-in failed.'),
        target,
      );
    }
  }
  const modifyingSigner = () => {
    const signer = active()?.signer;
    return signer && 'modifyAndSignTransactions' in signer ? signer : undefined;
  };
  const canSignMessages = () =>
    active()?.account.features.includes('solana:signMessage') ?? false;
  async function signMessage(message: Uint8Array): Promise<Uint8Array> {
    const connected = active();
    try {
      if (!connected || !canSignMessages()) {
        throw new WalletNotReadyError(
          'The connected wallet cannot sign messages.',
        );
      }
      return await namespace.signMessage(message);
    } catch (error) {
      throw report(
        wrap(error, WalletSignMessageError, 'Wallet message signing failed.'),
        connected?.wallet,
      );
    }
  }
  const canSignOffchainMessages = () =>
    active()?.account.features.includes('solana:signOffchainMessage') ?? false;
  async function signOffchainMessage(
    message: string,
    options: SignOffchainMessageOptions = {},
  ): Promise<SignOffchainMessageOutput> {
    const connected = active();
    try {
      if (!connected || !canSignOffchainMessages()) {
        throw new WalletNotReadyError(
          'The connected wallet cannot sign offchain messages.',
        );
      }
      // Wallets compare the account by identity, so pass their own account object, not Kit's UI handle.
      const feature = getWalletAccountFeature(
        connected.account,
        'solana:signOffchainMessage',
      ) as SolanaSignOffchainMessageFeature['solana:signOffchainMessage'];
      if (!feature.supportedMessageVersions.includes(1)) {
        throw new WalletNotReadyError(
          'The wallet does not support version 1 offchain messages.',
        );
      }
      const account = getWalletAccountForUiWalletAccount(connected.account);
      const [output] = await feature.signOffchainMessage({
        account,
        message,
        messageVersion: 1,
        requiredSigners: options.requiredSigners ?? [account.publicKey],
      });
      if (!output)
        throw new Error('The wallet returned no offchain message signature.');
      return output;
    } catch (error) {
      throw report(
        wrap(
          error,
          WalletSignOffchainMessageError,
          'Wallet offchain message signing failed.',
        ),
        connected?.wallet,
      );
    }
  }
  async function signAllTransactions<
    T extends Transaction | VersionedTransaction,
  >(transactions: T[]): Promise<T[]> {
    const connected = active();
    try {
      const signer = modifyingSigner();
      if (!connected || !signer) {
        throw new WalletNotReadyError(
          'The connected wallet cannot return signed transactions.',
        );
      }
      assertSupportedVersions(
        connected.account,
        'solana:signTransaction',
        transactions,
      );
      return await signTransactionsWithKit(
        batch => signer.modifyAndSignTransactions(batch),
        transactions,
      );
    } catch (error) {
      throw report(
        wrap(
          error,
          WalletSignTransactionError,
          'Wallet transaction signing failed.',
        ),
        connected?.wallet,
      );
    }
  }
  async function signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
  ): Promise<T> {
    return (await signAllTransactions([transaction]))[0]!;
  }
  async function sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options: SendTransactionOptions = {},
  ) {
    const connected = active();
    try {
      if (!connected)
        throw new WalletNotConnectedError('Wallet not connected.');
      assertEndpointMatchesChain(connection, config.chain);
      const signer = connected.signer;
      if (!signer)
        throw new WalletNotReadyError(
          'The connected wallet account cannot sign transactions.',
        );
      const sending = 'signAndSendTransactions' in signer;
      assertSupportedVersions(
        connected.account,
        sending ? 'solana:signAndSendTransaction' : 'solana:signTransaction',
        [transaction],
      );
      const {signers, ...sendOptions} = options;
      if (!isVersionedTransaction(transaction)) {
        // v1 completed legacy transactions before signing.
        transaction.feePayer ??= new PublicKey(connected.account.address);
        if (!transaction.recentBlockhash && !transaction.nonceInfo) {
          const {blockhash, lastValidBlockHeight} =
            await connection.getLatestBlockhash({
              commitment: sendOptions.preflightCommitment,
              minContextSlot: sendOptions.minContextSlot,
            });
          transaction.recentBlockhash = blockhash;
          transaction.lastValidBlockHeight = lastValidBlockHeight;
        }
      }
      if (signers?.length) {
        if (isVersionedTransaction(transaction)) {
          const messageSigners = signers.filter(
            (extra): extra is Extract<Signer, {signMessages: unknown}> =>
              'signMessages' in extra,
          );
          if (messageSigners.length !== signers.length) {
            throw new Error(
              'Every additional signer for a versioned transaction must implement signMessages.',
            );
          }
          await transaction.sign(messageSigners);
        } else {
          await transaction.partialSign(...signers);
        }
      }
      if (sending) {
        // Kit's sending signer forwards only minContextSlot; v1 forwarded every send option, so call the feature.
        const {maxRetries, minContextSlot, ...standardOptions} = sendOptions;
        for (const value of [maxRetries, minContextSlot]) {
          if (value != null && !Number.isSafeInteger(Number(value))) {
            throw new RangeError(
              'Wallet Standard send options must be safe integers.',
            );
          }
        }
        const feature = getWalletAccountFeature(
          connected.account,
          'solana:signAndSendTransaction',
        ) as SolanaSignAndSendTransactionFeature['solana:signAndSendTransaction'];
        const [result] = await feature.signAndSendTransaction({
          account: getWalletAccountForUiWalletAccount(connected.account),
          chain: config.chain,
          transaction: await serializeTransaction(transaction),
          options: {
            ...standardOptions,
            ...(maxRetries === undefined
              ? {}
              : {maxRetries: Number(maxRetries)}),
            ...(minContextSlot === undefined
              ? {}
              : {minContextSlot: Number(minContextSlot)}),
          },
        });
        if (!result)
          throw new Error('The wallet returned no submission signature.');
        return base58.decode(signatureBytes(result.signature));
      }
      if (!('modifyAndSignTransactions' in signer)) {
        throw new WalletNotReadyError(
          'The connected wallet cannot return signed transactions.',
        );
      }
      const [signed] = await signTransactionsWithKit(
        batch => signer.modifyAndSignTransactions(batch),
        [transaction],
      );
      // The RPC verifies signatures; only their presence is checked here.
      const bytes = isVersionedTransaction(signed!)
        ? signed.serialize()
        : await signed!.serialize({verifySignatures: false});
      return await connection.sendRawTransaction(bytes, sendOptions);
    } catch (error) {
      throw report(
        wrap(
          error,
          WalletSendTransactionError,
          'Wallet transaction submission failed.',
        ),
        connected?.wallet,
      );
    }
  }
  let state = namespace.getState();
  let snapshot: WalletContextState | undefined;
  let snapshotSelection: string | null | undefined;
  function getSnapshot(): WalletContextState {
    const next = namespace.getState();
    if (!snapshot || state !== next || snapshotSelection !== selectedName) {
      const connected = next.connected;
      const selected = resolve();
      const publicKey =
        connected === null
          ? null
          : snapshot?.publicKey?.toBase58() === connected.account.address
            ? snapshot.publicKey
            : new PublicKey(connected.account.address);
      snapshot = Object.freeze({
        select,
        connect,
        disconnect,
        sendTransaction,
        signTransaction: modifyingSigner() && signTransaction,
        signAllTransactions: modifyingSigner() && signAllTransactions,
        signMessage: canSignMessages() ? signMessage : undefined,
        signOffchainMessage: canSignOffchainMessages()
          ? signOffchainMessage
          : undefined,
        signIn: selected?.features.includes('solana:signIn')
          ? signIn
          : undefined,
        autoConnect: config.autoConnect ?? true,
        account: connected?.account ?? null,
        address: connected?.account.address ?? null,
        publicKey,
        signer: connected?.signer ?? null,
        supportedTransactionVersions:
          connected?.supportedTransactionVersions ?? null,
        connected: connected !== null,
        connecting:
          next.status === 'connecting' || next.status === 'reconnecting',
        disconnecting: next.status === 'disconnecting',
        status: next.status,
        wallet: connected
          ? view(connected.wallet)
          : selected
            ? view(selected)
            : null,
        selectedWallet: selected ? view(selected) : null,
        wallets:
          snapshot && state.wallets === next.wallets
            ? snapshot.wallets
            : Object.freeze(uniqueByName(next.wallets).map(view)),
      });
      state = next;
      snapshotSelection = selectedName;
    }
    return snapshot;
  }
  return {
    select,
    connect,
    disconnect,
    sendTransaction,
    getSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      unsubscribe();
      listeners.clear();
      client[Symbol.dispose]();
    },
  };
}
