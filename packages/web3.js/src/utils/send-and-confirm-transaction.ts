import type { TransactionPartialSigner } from '@solana/kit';
import { stringifyJsonWithBigInts } from '@solana/rpc-spec-types';

import { Connection, SignatureResult } from '../connection';
import type { ConfirmOptions } from '../connection';
import { SendTransactionError } from '../errors';
import { SystemInstruction } from '../programs/system';
import { Transaction } from '../transaction';
import type { TransactionSignature } from '../transaction';
import assert from './assert';

/**
 * Sign, send and confirm a transaction.
 *
 * If `commitment` option is not specified, falls back to the connection's
 * commitment, then to 'finalized'.
 *
 * @param {Connection} connection
 * @param {Transaction} transaction
 * @param {Array<TransactionPartialSigner>} signers
 * @param {ConfirmOptions} [options]
 * @returns {Promise<TransactionSignature>}
 */
export async function sendAndConfirmTransaction(
    connection: Connection,
    transaction: Transaction,
    signers: Array<TransactionPartialSigner>,
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
    const commitment = options?.commitment ?? connection.commitment ?? 'finalized';
    const abortSignal = options?.abortSignal;

    let nonceAccountPubkey;
    if (transaction.nonceInfo != null) {
        try {
            nonceAccountPubkey = SystemInstruction.decodeNonceAdvance(
                transaction.nonceInfo.nonceInstruction,
            ).noncePubkey;
        } catch {
            throw new Error('Transaction nonceInfo must contain a valid advance nonce instruction');
        }
    }

    const signature = await connection.sendTransaction(transaction, signers, sendOptions);

    let status: SignatureResult;
    if (transaction.nonceInfo != null) {
        assert(nonceAccountPubkey != null);
        status = (
            await connection.confirmTransaction(
                {
                    abortSignal,
                    minContextSlot: transaction.minNonceContextSlot,
                    nonceAccountPubkey,
                    nonceValue: transaction.nonceInfo.nonce,
                    signature,
                },
                commitment,
            )
        ).value;
    } else if (transaction.recentBlockhash != null && transaction.lastValidBlockHeight != null) {
        status = (
            await connection.confirmTransaction(
                {
                    abortSignal,
                    signature: signature,
                    blockhash: transaction.recentBlockhash,
                    lastValidBlockHeight: transaction.lastValidBlockHeight,
                },
                commitment,
            )
        ).value;
    } else {
        if (abortSignal != null) {
            console.warn(
                'sendAndConfirmTransaction(): A transaction with a deprecated confirmation strategy was ' +
                    'supplied along with an `abortSignal`. Only transactions having `lastValidBlockHeight` ' +
                    'or `nonceInfo` are abortable.',
            );
        }
        status = (await connection.confirmTransaction(signature, commitment)).value;
    }

    if (status.err) {
        throw new SendTransactionError({
            action: 'send',
            signature: signature,
            transactionMessage: `Status: (${stringifyJsonWithBigInts(status)})`,
        });
    }

    return signature;
}
