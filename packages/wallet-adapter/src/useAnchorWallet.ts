import type { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { useMemo } from 'react';

import { useWallet } from './useWallet.js';

export interface AnchorWallet {
    publicKey: PublicKey;
    signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
    signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
}

/** The connected wallet as Anchor's `Wallet` interface, or `undefined` when it cannot sign. */
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
