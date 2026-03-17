import {Address} from '@solana/addresses';
import {PublicKey} from '../publickey';

/**
 * Converts a Web3.js [PublicKey](https://solana-foundation.github.io/solana-web3.js/classes/PublicKey.html)
 * object to a Kit {@link Address}.
 *
 * @example
 * ```ts
 * import { toKitAddress } from '@solana/web3.js/compat';
 *
 * const publicKey = new PublicKey('49XBVQsvSW44ULKL9qufS9YqQPbdcps1TQRijx4FQ9sH');
 * const address = toKitAddress(publicKey);
 * ```
 */
export function toKitAddress<TAddress extends string>(
  publicKey: PublicKey,
): Address<TAddress> {
  return publicKey.toBase58() as Address<TAddress>;
}
