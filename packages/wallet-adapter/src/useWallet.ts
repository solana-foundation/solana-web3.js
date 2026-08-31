import { getBase58Decoder, getTransactionCodec } from '@solana/kit';
import type {
    Connection,
    SendOptions,
    Signer,
    Transaction,
    TransactionSignature,
    VersionedTransaction,
} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { useCallback, useMemo } from 'react';

import {
    canSignTransactions,
    isVersionedTransaction,
    signKitTransactions,
    signTransactionsWithWalletSigner,
    toKitTransaction,
} from './transactions.js';
import type { UseWalletResult } from './types.js';
import { useKitWallet } from './useKitWallet.js';

export interface SendTransactionOptions extends SendOptions {
    /** Additional signers to apply before the wallet signs, e.g. a newly created account's keypair. */
    signers?: Signer[];
}

/** The value returned by the `@solana/web3.js`-flavored {@link useWallet}. */
export type WalletContextState = UseWalletResult & {
    /** The connected account's address as a web3.js `PublicKey`, or `null`. */
    publicKey: PublicKey | null;
    /** Connect to the discovered wallet with this name, or disconnect when passed `null`. */
    select(walletName: string | null): void;
    /** Sign and broadcast the transaction — through the wallet when it can, otherwise `connection`. */
    sendTransaction(
        transaction: Transaction | VersionedTransaction,
        connection: Connection,
        options?: SendTransactionOptions,
    ): Promise<TransactionSignature>;
    /** Sign transactions; `undefined` when disconnected or when the wallet can only sign-and-send. */
    signAllTransactions:
        (<T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>) | undefined;
    /** Like {@link WalletContextState.signAllTransactions}, for a single transaction. */
    signTransaction: (<T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>) | undefined;
};

const base58 = getBase58Decoder();
const transactionCodec = getTransactionCodec();

/** The connected wallet shaped like the classic `useWallet()`, in `@solana/web3.js` v3 types. */
export function useWallet(): WalletContextState {
    const kitWallet = useKitWallet();
    const { address, connect, disconnect, signer, wallets } = kitWallet;

    const publicKey = useMemo(() => (address ? new PublicKey(address) : null), [address]);

    const select = useCallback(
        (walletName: string | null) => {
            if (walletName === null) {
                disconnect();
                return;
            }
            const wallet = wallets.find(({ name }) => name === walletName);
            if (!wallet) {
                console.error(`No wallet named '${walletName}' has been discovered.`);
                return;
            }
            connect(wallet);
        },
        [connect, disconnect, wallets],
    );

    const signAllTransactions = useMemo(
        () =>
            canSignTransactions(signer)
                ? async <T extends Transaction | VersionedTransaction>(transactions: T[]) =>
                      await signTransactionsWithWalletSigner(signer, transactions)
                : undefined,
        [signer],
    );

    const signTransaction = useMemo(
        () =>
            signAllTransactions &&
            (async <T extends Transaction | VersionedTransaction>(transaction: T) => {
                const [signedTransaction] = await signAllTransactions([transaction]);
                if (!signedTransaction) {
                    throw new Error('The connected wallet did not return a signed transaction.');
                }
                return signedTransaction;
            }),
        [signAllTransactions],
    );

    const sendTransaction = useCallback(
        async (
            transaction: Transaction | VersionedTransaction,
            connection: Connection,
            options: SendTransactionOptions = {},
        ) => {
            if (!signer) throw new Error('Wallet not connected.');
            const { signers, ...sendOptions } = options;
            if (signers?.length) {
                if (isVersionedTransaction(transaction)) {
                    const messageSigners = signers.filter(
                        (extra): extra is Extract<Signer, { signMessages: unknown }> => 'signMessages' in extra,
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
            const kitTransaction = await toKitTransaction(transaction);
            if ('signAndSendTransactions' in signer) {
                const [signature] = await signer.signAndSendTransactions([kitTransaction]);
                if (!signature) throw new Error('The connected wallet did not return a transaction signature.');
                return base58.decode(signature);
            }
            const [signedTransaction] = await signKitTransactions(signer, [kitTransaction]);
            if (!signedTransaction) throw new Error('The connected wallet did not return a signed transaction.');
            return await connection.sendRawTransaction(
                transactionCodec.encode(signedTransaction) as Uint8Array,
                sendOptions,
            );
        },
        [signer],
    );

    return useMemo(
        () => ({
            ...kitWallet,
            publicKey,
            select,
            sendTransaction,
            signAllTransactions,
            signTransaction,
        }),
        [kitWallet, publicKey, select, sendTransaction, signAllTransactions, signTransaction],
    );
}
