import { stringifyJsonWithBigInts } from '@solana/rpc-spec-types';

import { Connection, SignatureResult } from '../connection';
import type { ConfirmOptions } from '../connection';
import { SendTransactionError } from '../errors';
import type { Signer } from '../keypair';
import { Transaction } from '../transaction';
import type { TransactionSignature } from '../transaction';

/**
 * Sign, send and confirm a transaction.
 *
 * If `commitment` option is not specified, defaults to 'finalized' commitment.
 *
 * @param {Connection} connection
 * @param {Transaction} transaction
 * @param {Array<Signer>} signers
 * @param {ConfirmOptions} [options]
 * @returns {Promise<TransactionSignature>}
 */
export async function sendAndConfirmTransaction(
    connection: Connection,
    transaction: Transaction,
    signers: Array<Signer>,
    options?: ConfirmOptions &
        Readonly<{
            // A signal that, when aborted, cancels any outstanding transaction confirmation operations
            abortSignal?: AbortSignal;
        }>,
): Promise<TransactionSignature> {
    const sendOptions = options && {
        skipPreflight: options.skipPreflight,
        preflightCommitment: options.preflightCommitment || options.commitment,
        maxRetries: options.maxRetries,
        minContextSlot: options.minContextSlot,
    };

    const signature = await connection.sendTransaction(transaction, signers, sendOptions);

    let status: SignatureResult;
    if (transaction.recentBlockhash != null && transaction.lastValidBlockHeight != null) {
        status = (
            await connection.confirmTransaction(
                {
                    abortSignal: options?.abortSignal,
                    signature: signature,
                    blockhash: transaction.recentBlockhash,
                    lastValidBlockHeight: transaction.lastValidBlockHeight,
                },
                options && options.commitment,
            )
        ).value;
    } else if (transaction.minNonceContextSlot != null && transaction.nonceInfo != null) {
        const { nonceInstruction } = transaction.nonceInfo;
        const nonceAccountPubkey = nonceInstruction.keys[0].pubkey;
        status = (
            await connection.confirmTransaction(
                {
                    abortSignal: options?.abortSignal,
                    minContextSlot: transaction.minNonceContextSlot,
                    nonceAccountPubkey,
                    nonceValue: transaction.nonceInfo.nonce,
                    signature,
                },
                options && options.commitment,
            )
        ).value;
    } else {
        if (options?.abortSignal != null) {
            console.warn(
                'sendAndConfirmTransaction(): A transaction with a deprecated confirmation strategy was ' +
                    'supplied along with an `abortSignal`. Only transactions having `lastValidBlockHeight` ' +
                    'or a combination of `nonceInfo` and `minNonceContextSlot` are abortable.',
            );
        }
        status = (await connection.confirmTransaction(signature, options && options.commitment)).value;
    }

    if (status.err) {
        if (signature != null) {
            throw new SendTransactionError({
                action: 'send',
                signature: signature,
                transactionMessage: `Status: (${stringifyJsonWithBigInts(status)})`,
            });
        }
        throw new Error(`Transaction ${signature} failed (${stringifyJsonWithBigInts(status)})`);
    }

    return signature;
}
