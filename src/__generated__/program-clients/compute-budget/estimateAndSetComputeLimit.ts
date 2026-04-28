import { TransactionMessage, TransactionMessageWithFeePayer } from '../../kit-shims/index';
import { MAX_COMPUTE_UNIT_LIMIT, PROVISORY_COMPUTE_UNIT_LIMIT } from './constants';
import {
    EstimateComputeUnitLimitFactoryFunction,
    EstimateComputeUnitLimitFactoryFunctionConfig,
} from './estimateComputeLimitInternal';
import { findSetComputeUnitLimitInstructionIndexAndUnits } from './introspect';
import { updateOrAppendSetComputeUnitLimitInstruction } from './setComputeLimit';

type EstimateAndUpdateProvisoryComputeUnitLimitFactoryFunction = <
    TTransactionMessage extends TransactionMessage & TransactionMessageWithFeePayer,
>(
    transactionMessage: TTransactionMessage,
    config?: EstimateComputeUnitLimitFactoryFunctionConfig,
) => Promise<TTransactionMessage>;

/**
 * Given a transaction message, if it does not have an explicit compute unit limit,
 * estimates the compute unit limit and updates the transaction message with
 * the estimated limit. Otherwise, returns the transaction message unchanged.
 *
 * It requires a function that estimates the compute unit limit.
 *
 * @example
 * ```ts
 * const estimateAndUpdateCUs = estimateAndUpdateProvisoryComputeUnitLimitFactory(
 *     estimateComputeUnitLimitFactory({ rpc })
 * );
 *
 * const transactionMessageWithCUs = await estimateAndUpdateCUs(transactionMessage);
 * ```
 *
 * @see {@link estimateAndUpdateProvisoryComputeUnitLimitFactory}
 */
export function estimateAndUpdateProvisoryComputeUnitLimitFactory(
    estimateComputeUnitLimit: EstimateComputeUnitLimitFactoryFunction,
): EstimateAndUpdateProvisoryComputeUnitLimitFactoryFunction {
    return async function fn(transactionMessage, config) {
        const instructionDetails = findSetComputeUnitLimitInstructionIndexAndUnits(transactionMessage);

        // If the transaction message already has a compute unit limit instruction
        // which is set to a specific value — i.e. not 0 or the maximum limit —
        // we don't need to estimate the compute unit limit.
        if (
            instructionDetails &&
            instructionDetails.units !== PROVISORY_COMPUTE_UNIT_LIMIT &&
            instructionDetails.units !== MAX_COMPUTE_UNIT_LIMIT
        ) {
            return transactionMessage;
        }

        return updateOrAppendSetComputeUnitLimitInstruction(
            await estimateComputeUnitLimit(transactionMessage, config),
            transactionMessage,
        );
    };
}
