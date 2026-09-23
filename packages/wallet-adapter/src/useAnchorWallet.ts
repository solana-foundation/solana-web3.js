import type { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { useMemo } from 'react';

import { useWallet } from './WalletProvider.js';

export interface AnchorWallet {
    publicKey: PublicKey;
    signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
    signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
}

/**
 * The connected wallet shaped like Anchor's `Wallet` interface, or `undefined` when it cannot sign.
 *
 * @deprecated Published Anchor (1.x, and `anchor-next` 2.0.0-rc.1) depends on `@solana/web3.js` v1: its
 * `Wallet` type uses v1 classes and `AnchorProvider` calls `serialize()` synchronously, so this value does
 * not type-check against `AnchorProvider` and would hand it a Promise at runtime. Until Anchor ships a
 * release built for web3.js v3, adapt manually: convert between the two `Transaction` classes at the
 * boundary yourself. For Anchor's Kit-based line, pass `useWallet().signer` once its provider accepts a Kit
 * signer. This hook will be un-deprecated when a compatible Anchor exists.
 */
export function useAnchorWallet(): AnchorWallet | undefined {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    return useMemo(
        () =>
            publicKey && signTransaction && signAllTransactions
                ? { publicKey, signAllTransactions, signTransaction }
                : undefined,
        [publicKey, signTransaction, signAllTransactions],
    );
}
