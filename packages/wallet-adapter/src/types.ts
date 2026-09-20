import type {
  Connection,
  PublicKey,
  SendOptions,
  Signer,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from '@solana/web3.js';
import type {SignatureBytes} from '@solana/kit';
import type {
  WalletSigner,
  WalletState,
  WalletStatus,
} from '@solana/kit-plugin-wallet';
import type {
  SolanaSignInInput,
  SolanaSignInOutput,
  SolanaSignOffchainMessageInput,
  SolanaSignOffchainMessageOutput,
} from '@solana/wallet-standard-features';
import type {UiWallet, UiWalletAccount} from '@wallet-standard/ui';

export type {SolanaSignInInput, SolanaSignInOutput, UiWallet, UiWalletAccount};

/**
 * Transaction versions the connected account accepts on every signing path it exposes.
 * transactions. Check for the version you intend to send rather than assuming a ceiling.
 */
export type SupportedTransactionVersions = NonNullable<
  WalletState['connected']
>['supportedTransactionVersions'];

export interface SignOffchainMessageOptions {
  /** Required signer public keys, 32 bytes each; defaults to the connected account's public key. */
  requiredSigners?: SolanaSignOffchainMessageInput['requiredSigners'];
}

/** Output of signing an offchain message: the full signed bytes and the signature over them. */
export type SignOffchainMessageOutput = Omit<
  SolanaSignOffchainMessageOutput,
  'signature'
> & {readonly signature: SignatureBytes};

export interface SendTransactionOptions extends SendOptions {
  /** Additional local signers applied before the wallet signs. */
  signers?: Signer[];
}

/** Discovered wallets are always installed; the other states exist for v1 source compatibility. */
export enum WalletReadyState {
  Installed = 'Installed',
  NotDetected = 'NotDetected',
  Loadable = 'Loadable',
  Unsupported = 'Unsupported',
}

export enum WalletAdapterNetwork {
  Mainnet = 'mainnet-beta',
  Testnet = 'testnet',
  Devnet = 'devnet',
}

/** The v1 `Wallet` shape used by pickers: identity only, since Wallet Standard wallets share one implementation. */
export interface Wallet {
  readonly adapter: {
    readonly name: string;
    readonly icon: UiWallet['icon'];
    /** Always empty: Wallet Standard defines no download URL. */
    readonly url: string;
    readonly readyState: WalletReadyState;
  };
  readonly readyState: WalletReadyState;
}

/** Operations shared by neutral consumers and React hooks. */
export interface WalletOperations {
  select(name: string | null): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendTransactionOptions,
  ): Promise<TransactionSignature>;
  signTransaction?: <T extends Transaction | VersionedTransaction>(
    transaction: T,
  ) => Promise<T>;
  signAllTransactions?: <T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ) => Promise<T[]>;
  signMessage?: (message: Uint8Array) => Promise<SignatureBytes>;
  signOffchainMessage?: (
    message: string,
    options?: SignOffchainMessageOptions,
  ) => Promise<SignOffchainMessageOutput>;
  signIn?: (input?: SolanaSignInInput) => Promise<SolanaSignInOutput>;
}

/** Immutable view of the wallet client, as returned by `useWallet()` and `controller.getSnapshot()`. */
export interface WalletContextState extends WalletOperations {
  readonly wallets: readonly Wallet[];
  readonly selectedWallet: Wallet | null;
  readonly wallet: Wallet | null;
  readonly publicKey: PublicKey | null;
  readonly account: UiWalletAccount | null;
  readonly address: UiWalletAccount['address'] | null;
  readonly signer: WalletSigner | null;
  readonly supportedTransactionVersions: SupportedTransactionVersions | null;
  readonly supportsOffchainSignIn: boolean;
  readonly connected: boolean;
  readonly connecting: boolean;
  readonly disconnecting: boolean;
  readonly autoConnect: boolean;
  readonly status: WalletStatus;
}
