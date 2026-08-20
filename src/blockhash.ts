/**
 * A base-58 encoded blockhash string.
 *
 * Values are accepted as plain strings and validated when they cross into
 * RPC calls or transaction serialization.
 */
export type Blockhash = string;
