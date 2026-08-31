import type { Transaction as KitTransaction, TransactionModifyingSigner, TransactionPartialSigner } from '@solana/kit';
import {
    assertIsTransactionWithinSizeLimit,
    getCompiledTransactionMessageDecoder,
    getTransactionCodec,
    getTransactionLifetimeConstraintFromCompiledTransactionMessage,
} from '@solana/kit';
import type { WalletSigner } from '@solana/kit-plugin-wallet';
import { Transaction, VersionedTransaction } from '@solana/web3.js';

const transactionCodec = getTransactionCodec();

/** `true` when the transaction is a `VersionedTransaction` rather than a legacy `Transaction`. */
export function isVersionedTransaction(
    transaction: Transaction | VersionedTransaction,
): transaction is VersionedTransaction {
    return 'version' in transaction;
}

/** Convert a `@solana/web3.js` transaction, signed or not, into a Kit `Transaction` via its wire bytes. */
export async function toKitTransaction(transaction: Transaction | VersionedTransaction): Promise<KitTransaction> {
    const wireBytes = isVersionedTransaction(transaction)
        ? transaction.serialize()
        : await transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
    return transactionCodec.decode(wireBytes);
}

/** Convert a Kit transaction into a `@solana/web3.js` `VersionedTransaction` via its wire bytes. */
export function toVersionedTransaction(transaction: KitTransaction): VersionedTransaction {
    return VersionedTransaction.deserialize(transactionCodec.encode(transaction) as Uint8Array);
}

/** Convert a Kit transaction into a legacy `@solana/web3.js` `Transaction` via its wire bytes. */
export function toLegacyTransaction(transaction: KitTransaction): Transaction {
    return Transaction.from(transactionCodec.encode(transaction) as Uint8Array);
}

/** `true` when the signer can return a signed transaction rather than only signing and sending. */
export function canSignTransactions(
    signer: WalletSigner | null,
): signer is WalletSigner & (TransactionModifyingSigner | TransactionPartialSigner) {
    return signer != null && ('modifyAndSignTransactions' in signer || 'signTransactions' in signer);
}

/** Sign Kit transactions with a wallet signer; throws when the wallet can only sign-and-send. */
export async function signKitTransactions(
    signer: WalletSigner,
    transactions: readonly KitTransaction[],
): Promise<readonly KitTransaction[]> {
    if ('modifyAndSignTransactions' in signer) {
        return await signer.modifyAndSignTransactions(transactions);
    }
    if ('signTransactions' in signer) {
        // Partial signers need a lifetime constraint, which wire bytes omit; derive it from the message.
        const signableTransactions = await Promise.all(
            transactions.map(async transaction => {
                assertIsTransactionWithinSizeLimit(transaction);
                const lifetimeConstraint = await getTransactionLifetimeConstraintFromCompiledTransactionMessage(
                    getCompiledTransactionMessageDecoder().decode(transaction.messageBytes),
                );
                return { ...transaction, lifetimeConstraint };
            }),
        );
        const signatureDictionaries = await signer.signTransactions(signableTransactions);
        return transactions.map((transaction, i) =>
            Object.freeze({
                ...transaction,
                signatures: Object.freeze({ ...transaction.signatures, ...signatureDictionaries[i] }),
            }),
        );
    }
    throw new Error(
        'The connected wallet can only sign and send transactions in a single step, so it cannot ' +
            'return a signed transaction. Use sendTransaction instead.',
    );
}

/** Sign `@solana/web3.js` transactions, returning new transactions of the same class as the inputs. */
export async function signTransactionsWithWalletSigner<T extends Transaction | VersionedTransaction>(
    signer: WalletSigner,
    transactions: readonly T[],
): Promise<T[]> {
    const kitTransactions = await Promise.all(transactions.map(toKitTransaction));
    const signedTransactions = await signKitTransactions(signer, kitTransactions);
    return transactions.map((transaction, i) => {
        const signedTransaction = signedTransactions[i];
        if (!signedTransaction) {
            throw new Error('The connected wallet returned fewer signed transactions than it was given.');
        }
        return (
            isVersionedTransaction(transaction)
                ? toVersionedTransaction(signedTransaction)
                : toLegacyTransaction(signedTransaction)
        ) as T;
    });
}
