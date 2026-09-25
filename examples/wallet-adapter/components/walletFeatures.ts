'use client';

import type {
  SolanaSignAndSendTransactionFeature,
  SolanaSignInFeature,
  SolanaSignTransactionFeature,
  SolanaTransactionVersion,
} from '@solana/wallet-standard-features';
import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignTransaction,
} from '@solana/wallet-standard-features';
import {getWallets} from '@wallet-standard/app';
import type {Wallet} from '@wallet-standard/base';
import {useSyncExternalStore} from 'react';

const wallets = getWallets();

function subscribe(onChange: () => void) {
  const offRegister = wallets.on('register', onChange);
  const offUnregister = wallets.on('unregister', onChange);
  return () => {
    offRegister();
    offUnregister();
  };
}

const getSnapshot = () => wallets.get();
const noWallets: readonly Wallet[] = [];
const getServerSnapshot = () => noWallets;

export function useStandardWallets(): readonly Wallet[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function isSolanaWallet(wallet: Wallet): boolean {
  return wallet.chains.some(chain => chain.startsWith('solana:'));
}

export function hasFeature(wallet: Wallet, feature: string): boolean {
  return feature in wallet.features;
}

type TransactionFeatures = Partial<
  SolanaSignAndSendTransactionFeature & SolanaSignTransactionFeature
>;

export function supportsTransactionVersion(
  wallet: Wallet,
  version: SolanaTransactionVersion,
): boolean {
  const features = wallet.features as TransactionFeatures;
  return [
    features[SolanaSignAndSendTransaction],
    features[SolanaSignTransaction],
  ].some(feature => feature?.supportedTransactionVersions.includes(version));
}

export function supportsSignInWithOffchainMessage(wallet: Wallet): boolean {
  const feature = (wallet.features as Partial<SolanaSignInFeature>)[
    SolanaSignIn
  ];
  return feature?.version === '1.1.0';
}
