import type { Client, ClientPlugin } from '@solana/kit';
import { createClient } from '@solana/kit';
import { solanaRpc } from '@solana/kit-plugin-rpc';
import type { WalletPluginConfig } from '@solana/kit-plugin-wallet';
import { walletSigner } from '@solana/kit-plugin-wallet';
import { ClientProvider } from '@solana/react';
import type { ReactNode } from 'react';
import { useMemo, useRef } from 'react';

export type WalletProviderProps = {
    children: ReactNode;
    /** The chain this app targets, e.g. `'solana:mainnet'`. One provider targets one chain. */
    chain: WalletPluginConfig['chain'];
    /** HTTP RPC endpoint. When set, an RPC is attached to the client so `useClient()` can send transactions. */
    endpoint?: string;
    /** WebSocket RPC subscriptions endpoint. Defaults to `endpoint` with `http` swapped for `ws`. */
    rpcSubscriptionsUrl?: string;
    /** Silently reconnect to the persisted wallet on startup. @default true */
    autoConnect?: boolean;
    /** Storage for the selected account; `null` disables persistence. Must be a stable reference. */
    storage?: WalletPluginConfig['storage'];
    /** Storage key used for persistence. @default 'kit-wallet' */
    storageKey?: string;
    /** Restrict which discovered wallets are offered. May be defined inline; changes apply without rebuilding the client. */
    filter?: WalletPluginConfig['filter'];
};

/** Builds a Kit client with the wallet plugin (and an optional RPC) and publishes it to the subtree. */
export function WalletProvider({
    children,
    chain,
    endpoint,
    rpcSubscriptionsUrl,
    autoConnect,
    storage,
    storageKey,
    filter,
}: WalletProviderProps) {
    const filterRef = useRef(filter);
    filterRef.current = filter;

    const client = useMemo<Client<object>>(() => {
        const filterWallets: NonNullable<WalletPluginConfig['filter']> = wallet =>
            filterRef.current ? filterRef.current(wallet) : true;
        const withWallet = createClient().use(
            walletSigner({ autoConnect, chain, filter: filterWallets, storage, storageKey }),
        );
        if (!endpoint) return withWallet;
        // `solanaRpc`'s return type is too deep for `.use()` to infer, so widen it to keep the client resolvable.
        const rpcPlugin = solanaRpc({ rpcSubscriptionsUrl, rpcUrl: endpoint }) as ClientPlugin<object, object>;
        return withWallet.use(rpcPlugin);
    }, [chain, endpoint, rpcSubscriptionsUrl, autoConnect, storage, storageKey]);

    return <ClientProvider client={client}>{children}</ClientProvider>;
}
