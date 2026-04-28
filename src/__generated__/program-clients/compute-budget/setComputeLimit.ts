import { appendTransactionMessageInstruction, TransactionMessage } from '../../kit-shims/index';
import { PROVISORY_COMPUTE_UNIT_LIMIT } from './constants';
import { getSetComputeUnitLimitInstruction } from './generated';
import { findSetComputeUnitLimitInstructionIndexAndUnits } from './introspect';

/**
 * Appends a `SetComputeUnitLimit` instruction with a provisory
 * compute unit limit to a given transaction message
 * if and only if it does not already have one.
 *
 * @example
 * ```ts
 * const transactionMessage = pipe(
 *   createTransactionMessage({ version: 0 }),
 *   fillProvisorySetComputeUnitLimitInstruction,
 *   // ...
 * );
 * ```
 */
export function fillProvisorySetComputeUnitLimitInstruction<TTransactionMessage extends TransactionMessage>(
    transactionMessage: TTransactionMessage,
) {
    return updateOrAppendSetComputeUnitLimitInstruction(
        previousUnits => (previousUnits === null ? PROVISORY_COMPUTE_UNIT_LIMIT : previousUnits),
        transactionMessage,
    );
}

/**
 * Updates the first `SetComputeUnitLimit` instruction in a transaction message
 * with the given units, or appends a new instruction if none exists.
 * A function of the current value can be provided instead of a static value.
 *
 * @param units - The new compute unit limit, or a function that takes the previous
 *                compute unit limit and returns the new limit.
 * @param transactionMessage - The transaction message to update.
 *
 * @example
 * ```ts
 * const updatedTransactionMessage = updateOrAppendSetComputeUnitLimitInstruction(
 *   // E.g. Keep the current limit if it is set, otherwise set it to the maximum.
 *   (currentUnits) => currentUnits === null ? MAX_COMPUTE_UNIT_LIMIT : currentUnits,
 *   transactionMessage,
 * );
 * ```
 */
export function updateOrAppendSetComputeUnitLimitInstruction<TTransactionMessage extends TransactionMessage>(
    units: number | ((previousUnits: number | null) => number),
    transactionMessage: TTransactionMessage,
): TTransactionMessage {
    const getUnits = (previousUnits: number | null): number =>
        typeof units === 'function' ? units(previousUnits) : units;
    const instructionDetails = findSetComputeUnitLimitInstructionIndexAndUnits(transactionMessage);

    if (!instructionDetails) {
        return appendTransactionMessageInstruction(
            getSetComputeUnitLimitInstruction({ units: getUnits(null) }),
            transactionMessage,
        ) as TTransactionMessage;
    }

    const { index, units: previousUnits } = instructionDetails;
    const newUnits = getUnits(previousUnits);
    if (newUnits === previousUnits) {
        return transactionMessage;
    }

    const newInstruction = getSetComputeUnitLimitInstruction({ units: newUnits });
    const newInstructions = [...transactionMessage.instructions];
    newInstructions.splice(index, 1, newInstruction);
    return Object.freeze({
        ...transactionMessage,
        instructions: newInstructions,
    }) as TTransactionMessage;
}
