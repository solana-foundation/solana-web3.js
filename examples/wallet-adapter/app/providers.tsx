'use client';

import type {WalletError} from '@solana/wallet-adapter';
import {
  ConnectionProvider,
  WalletModalProvider,
  WalletProvider,
} from '@solana/wallet-adapter';
import {clusterApiUrl} from '@solana/web3.js';
import type {ReactNode} from 'react';
import {useCallback} from 'react';
import {NotificationProvider, useNotify} from '../components/Notifications';
import {SettingsProvider, useSettings} from '../components/Settings';

const CHAINS = {
  devnet: 'solana:devnet',
  testnet: 'solana:testnet',
  'mainnet-beta': 'solana:mainnet',
} as const;

function WalletContextProvider({children}: {children: ReactNode}) {
  const {autoConnect, network} = useSettings();
  const notify = useNotify();
  const onError = useCallback(
    (error: WalletError) => {
      notify(
        'error',
        error.message ? `${error.name}: ${error.message}` : error.name,
      );
      console.error(error);
    },
    [notify],
  );
  return (
    <ConnectionProvider endpoint={clusterApiUrl(network)}>
      <WalletProvider
        chain={CHAINS[network]}
        autoConnect={autoConnect}
        onError={onError}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function Providers({children}: {children: ReactNode}) {
  return (
    <SettingsProvider>
      <NotificationProvider>
        <WalletContextProvider>{children}</WalletContextProvider>
      </NotificationProvider>
    </SettingsProvider>
  );
}
