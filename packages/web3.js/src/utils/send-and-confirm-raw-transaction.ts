import { stringifyJsonWithBigInts } from '@solana/rpc-spec-types';

import {
    BlockheightBasedTransactionConfirmationStrategy,
    Connection,
    DurableNonceTransactionConfirmationStrategy,
    TransactionConfirmationStrategy,
} from '../connection';
import type { ConfirmOptions } from '../connection';
import { SendTransactionError } from '../errors';
import type { TransactionSignature } from '../transaction';

/**
 * Send and confirm a raw transaction
 *
 * If `commitment` option is not specified, defaults to 'finalized' commitment.
 *
 * @param {Connection} connection
 * @param {Uint8Array | Array<number>} rawTransaction
 * @param {TransactionConfirmationStrategy} confirmationStrategy
 * @param {ConfirmOptions} [options]
 * @returns {Promise<TransactionSignature>}
 */
export async function sendAndConfirmRawTransaction(
    connection: Connection,
    rawTransaction: Uint8Array | Array<number>,
    confirmationStrategy: TransactionConfirmationStrategy,
    options?: ConfirmOptions,
): Promise<TransactionSignature>;

/**
 * @deprecated Calling `sendAndConfirmRawTransaction()` without a `confirmationStrategy`
 * is no longer supported and will be removed in a future version.
 */

export async function sendAndConfirmRawTransaction(
    connection: Connection,
    rawTransaction: Uint8Array | Array<number>,
    options?: ConfirmOptions,
): Promise<TransactionSignature>;

export async function sendAndConfirmRawTransaction(
    connection: Connection,
    rawTransaction: Uint8Array | Array<number>,
    confirmationStrategyOrConfirmOptions: TransactionConfirmationStrategy | ConfirmOptions | undefined,
    maybeConfirmOptions?: ConfirmOptions,
): Promise<TransactionSignature> {
    let confirmationStrategy: TransactionConfirmationStrategy | undefined;
    let options: ConfirmOptions | undefined;
    if (
        confirmationStrategyOrConfirmOptions &&
        Object.prototype.hasOwnProperty.call(confirmationStrategyOrConfirmOptions, 'lastValidBlockHeight')
    ) {
        confirmationStrategy = confirmationStrategyOrConfirmOptions as BlockheightBasedTransactionConfirmationStrategy;
        options = maybeConfirmOptions;
    } else if (
        confirmationStrategyOrConfirmOptions &&
        Object.prototype.hasOwnProperty.call(confirmationStrategyOrConfirmOptions, 'nonceValue')
    ) {
        confirmationStrategy = confirmationStrategyOrConfirmOptions as DurableNonceTransactionConfirmationStrategy;
        options = maybeConfirmOptions;
    } else {
        options = confirmationStrategyOrConfirmOptions as ConfirmOptions | undefined;
    }
    const sendOptions = options && {
        skipPreflight: options.skipPreflight,
        preflightCommitment: options.preflightCommitment || options.commitment,
        minContextSlot: options.minContextSlot,
    };

    const signature = await connection.sendRawTransaction(rawTransaction, sendOptions);

    const commitment = options && options.commitment;
    const confirmationPromise = confirmationStrategy
        ? connection.confirmTransaction(confirmationStrategy, commitment)
        : connection.confirmTransaction(signature, commitment);
    const status = (await confirmationPromise).value;

    if (status.err) {
        if (signature != null) {
            throw new SendTransactionError({
                action: sendOptions?.skipPreflight ? 'send' : 'simulate',
                signature: signature,
                transactionMessage: `Status: (${stringifyJsonWithBigInts(status)})`,
            });
        }
        throw new Error(`Raw transaction ${signature} failed (${stringifyJsonWithBigInts(status)})`);
    }

    return signature;
}
