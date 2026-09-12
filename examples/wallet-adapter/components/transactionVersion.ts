import type {SupportedTransactionVersions} from '@solana/wallet-adapter';

export type TransactionVersion = 'legacy' | 0 | 1;

/**
 * `SolanaTransactionVersion` in `@solana/wallet-standard-features` is still
 * `'legacy' | 0`, so a wallet advertising `1` is outside the published type
 * and the set has to be read structurally.
 */
export function supportsTransactionVersion(
  versions: SupportedTransactionVersions | null,
  version: TransactionVersion,
): boolean {
  return (versions as ReadonlySet<unknown> | null)?.has(version) ?? false;
}
