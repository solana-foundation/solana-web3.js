import {
    estimateComputeUnitLimit,
    EstimateComputeUnitLimitFactoryConfig,
    EstimateComputeUnitLimitFactoryFunction,
} from './estimateComputeLimitInternal';

/**
 * Use this utility to estimate the actual compute unit cost of a given transaction message.
 *
 * Correctly budgeting a compute unit limit for your transaction message can increase the
 * probability that your transaction will be accepted for processing. If you don't declare a compute
 * unit limit on your transaction, validators will assume an upper limit of 200K compute units (CU)
 * per instruction.
 *
 * Since validators have an incentive to pack as many transactions into each block as possible, they
 * may choose to include transactions that they know will fit into the remaining compute budget for
 * the current block over transactions that might not. For this reason, you should set a compute
 * unit limit on each of your transaction messages, whenever possible.
 *
 * > [!WARNING]
 * > The compute unit estimate is just that -- an estimate. The compute unit consumption of the
 * > actual transaction might be higher or lower than what was observed in simulation. Unless you
 * > are confident that your particular transaction message will consume the same or fewer compute
 * > units as was estimated, you might like to augment the estimate by either a fixed number of CUs
 * > or a multiplier.
 *
 * > [!NOTE]
 * > If you are preparing an _unsigned_ transaction, destined to be signed and submitted to the
 * > network by a wallet, you might like to leave it up to the wallet to determine the compute unit
 * > limit. Consider that the wallet might have a more global view of how many compute units certain
 * > types of transactions consume, and might be able to make better estimates of an appropriate
 * > compute unit budget.
 *
 * > [!INFO]
 * > In the event that a transaction message does not already have a `SetComputeUnitLimit`
 * > instruction, this function will add one before simulation. This ensures that the compute unit
 * > consumption of the `SetComputeUnitLimit` instruction itself is included in the estimate.
 *
 * @param config
 *
 * @example
 * ```ts
 * import { getSetComputeUnitLimitInstruction } from '@solana-program/compute-budget';
 * import { createSolanaRpc, estimateComputeUnitLimitFactory, pipe } from '../../kit-shims/index';
 *
 * // Create an estimator function.
 * const rpc = createSolanaRpc('http://127.0.0.1:8899');
 * const estimateComputeUnitLimit = estimateComputeUnitLimitFactory({ rpc });
 *
 * // Create your transaction message.
 * const transactionMessage = pipe(
 *     createTransactionMessage({ version: 'legacy' }),
 *     /* ... *\/
 * );
 *
 * // Request an estimate of the actual compute units this message will consume. This is done by
 * // simulating the transaction and grabbing the estimated compute units from the result.
 * const estimatedUnits = await estimateComputeUnitLimit(transactionMessage);
 *
 * // Set the transaction message's compute unit budget.
 * const transactionMessageWithComputeUnitLimit = prependTransactionMessageInstruction(
 *     getSetComputeUnitLimitInstruction({ units: estimatedUnits }),
 *     transactionMessage,
 * );
 * ```
 */
export function estimateComputeUnitLimitFactory({
    rpc,
}: EstimateComputeUnitLimitFactoryConfig): EstimateComputeUnitLimitFactoryFunction {
    return async function estimateComputeUnitLimitFactoryFunction(transactionMessage, config) {
        return await estimateComputeUnitLimit({
            ...config,
            rpc,
            transactionMessage,
        });
    };
}
