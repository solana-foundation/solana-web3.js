/**
 * A provisory compute unit limit is used to indicate that the transaction
 * should be estimated for compute units before being sent to the network.
 *
 * Setting it to zero ensures the transaction fails unless it is properly estimated.
 */
export const PROVISORY_COMPUTE_UNIT_LIMIT = 0;

/**
 * The maximum compute unit limit that can be set for a transaction.
 */
export const MAX_COMPUTE_UNIT_LIMIT = 1_400_000;
