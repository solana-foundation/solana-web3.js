import { appendTransactionMessageInstruction, TransactionMessage, MicroLamports } from '../../kit-shims/index';
import { getSetComputeUnitPriceInstruction } from './generated';
import { findSetComputeUnitPriceInstructionIndexAndMicroLamports } from './introspect';

/**
 * Sets the compute unit price of a transaction message in micro-Lamports.
 *
 * @example
 * ```ts
 * const transactionMessage = pipe(
 *   createTransactionMessage({ version: 0 }),
 *   (m) => setTransactionMessageComputeUnitPrice(10_000, m),
 *   // ...
 * );
 * ```
 */
export function setTransactionMessageComputeUnitPrice<TTransactionMessage extends TransactionMessage>(
    microLamports: number | bigint,
    transactionMessage: TTransactionMessage,
) {
    return appendTransactionMessageInstruction(
        getSetComputeUnitPriceInstruction({ microLamports }),
        transactionMessage,
    );
}

/**
 * Updates the first `SetComputeUnitPrice` instruction in a transaction message
 * with the given micro-Lamports, or appends a new instruction if none exists.
 * A function of the current value can be provided instead of a static value.
 *
 * @param microLamports - The new compute unit price, or a function that
 *                        takes the previous price and returns the new one.
 * @param transactionMessage - The transaction message to update.
 *
 * @example
 * ```ts
 * const updatedTransactionMessage = updateOrAppendSetComputeUnitPriceInstruction(
 *   // E.g. double the current price or set it to 10_000 if it isn't set.
 *   (currentPrice) => currentPrice === null ? 10_000 : currentPrice * 2,
 *   transactionMessage,
 * );
 * ```
 */
export function updateOrAppendSetComputeUnitPriceInstruction<TTransactionMessage extends TransactionMessage>(
    microLamports: MicroLamports | ((previousMicroLamports: MicroLamports | null) => MicroLamports),
    transactionMessage: TTransactionMessage,
): TTransactionMessage {
    const getMicroLamports = (previousMicroLamports: MicroLamports | null): MicroLamports =>
        typeof microLamports === 'function' ? microLamports(previousMicroLamports) : microLamports;
    const instructionDetails = findSetComputeUnitPriceInstructionIndexAndMicroLamports(transactionMessage);

    if (!instructionDetails) {
        return appendTransactionMessageInstruction(
            getSetComputeUnitPriceInstruction({
                microLamports: getMicroLamports(null),
            }),
            transactionMessage,
        ) as TTransactionMessage;
    }

    const { index, microLamports: previousMicroLamports } = instructionDetails;
    const newMicroLamports = getMicroLamports(previousMicroLamports);
    if (newMicroLamports === previousMicroLamports) {
        return transactionMessage;
    }

    const newInstruction = getSetComputeUnitPriceInstruction({
        microLamports: newMicroLamports,
    });
    const newInstructions = [...transactionMessage.instructions];
    newInstructions.splice(index, 1, newInstruction);
    return Object.freeze({
        ...transactionMessage,
        instructions: newInstructions,
    }) as TTransactionMessage;
}
