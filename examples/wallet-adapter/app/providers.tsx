'use client';

import type { WalletError } from '@solana/wallet-adapter';
import { ConnectionProvider, WalletModalProvider, WalletProvider } from '@solana/wallet-adapter';
import type { Cluster } from '@solana/web3.js';
import { clusterApiUrl } from '@solana/web3.js';
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';

import { NotificationProvider, useNotify } from '../components/Notifications';
import { SettingsProvider, useSettings } from '../components/Settings';

const CHAINS = {
    devnet: 'solana:devnet',
    testnet: 'solana:testnet',
    'mainnet-beta': 'solana:mainnet',
} as const;

function rpcEndpoint(network: Cluster): string {
    if (process.env.NEXT_PUBLIC_RPC_URL) return process.env.NEXT_PUBLIC_RPC_URL;
    return network === 'mainnet-beta'
        ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL || clusterApiUrl(network)
        : clusterApiUrl(network);
}

function WalletContextProvider({
    children,
    endpoint,
    wsEndpoint,
}: {
    children: ReactNode;
    endpoint?: string;
    wsEndpoint?: string;
}) {
    const { autoConnect, network } = useSettings();
    const notify = useNotify();
    const config = useMemo(() => ({ commitment: 'confirmed' as const, wsEndpoint }), [wsEndpoint]);
    const onError = useCallback(
        (error: WalletError) => {
            notify('error', error.message ? `${error.name}: ${error.message}` : error.name);
            console.error(error);
        },
        [notify],
    );
    return (
        <ConnectionProvider endpoint={endpoint ?? rpcEndpoint(network)} config={config}>
            <WalletProvider chain={CHAINS[network]} autoConnect={autoConnect} onError={onError}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

export function Providers({
    children,
    endpoint,
    wsEndpoint,
}: {
    children: ReactNode;
    endpoint?: string;
    wsEndpoint?: string;
}) {
    return (
        <SettingsProvider>
            <NotificationProvider>
                <WalletContextProvider endpoint={endpoint} wsEndpoint={wsEndpoint}>
                    {children}
                </WalletContextProvider>
            </NotificationProvider>
        </SettingsProvider>
    );
}
