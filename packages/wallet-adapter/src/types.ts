import type { ReadonlyUint8Array, SignatureBytes } from '@solana/kit';
import type { WalletNamespace, WalletSigner, WalletState, WalletStatus } from '@solana/kit-plugin-wallet';
import type { ActionResult } from '@solana/react';

/** A wallet discovered through the wallet standard. */
export type UiWallet = WalletState['wallets'][number];

/** An account belonging to a {@link UiWallet}. */
export type UiWalletAccount = NonNullable<WalletState['connected']>['account'];

/** Input accepted by Sign In With Solana. */
export type SignInInput = Parameters<WalletNamespace['signIn']>[1];

/** Output returned by Sign In With Solana. */
export type SignInOutput = Awaited<ReturnType<WalletNamespace['signIn']>>;

export type ConnectAction = ActionResult<[wallet: UiWallet], readonly UiWalletAccount[]>;
export type DisconnectAction = ActionResult<[wallet?: UiWallet], void>;
export type SignMessageAction = ActionResult<[message: ReadonlyUint8Array], SignatureBytes>;
export type SignInAction = ActionResult<[wallet: UiWallet, input: SignInInput], SignInOutput>;

/** The Kit-native view of the connected wallet. */
export type UseWalletResult = {
    /** The connected account, or `null` when disconnected. */
    account: UiWalletAccount | null;
    /** The connected account's address, or `null` when disconnected. */
    address: UiWalletAccount['address'] | null;
    /** Connect to a discovered wallet (fire-and-forget). */
    connect: ConnectAction['dispatch'];
    /** Connect to a discovered wallet, resolving with its accounts. */
    connectAsync: ConnectAction['dispatchAsync'];
    /** `true` when a wallet is connected. */
    connected: boolean;
    /** `true` while connecting or silently reconnecting. */
    connecting: boolean;
    /** Disconnect the active wallet (fire-and-forget). */
    disconnect: DisconnectAction['dispatch'];
    /** Disconnect the active wallet, resolving when done. */
    disconnectAsync: DisconnectAction['dispatchAsync'];
    /** `true` while disconnecting. */
    disconnecting: boolean;
    /** Sign In With Solana, resolving with the sign-in output. */
    signIn: SignInAction['dispatchAsync'];
    /** Sign an arbitrary message, resolving with the signature. */
    signMessage: SignMessageAction['dispatchAsync'];
    /** The connected account's Kit signer, or `null` when disconnected or read-only. */
    signer: WalletSigner | null;
    /** The current connection status. */
    status: WalletStatus;
    /** The connected wallet, or `null` when disconnected. */
    wallet: UiWallet | null;
    /** All discovered wallets matching the provider's chain and filter. */
    wallets: readonly UiWallet[];
};
