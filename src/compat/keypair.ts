import {createKeyPairFromBytes} from '@solana/keys';
import {Keypair} from '../keypair';

/**
 * Converts a Web3.js [Keypair](https://solana-foundation.github.io/solana-web3.js/classes/Keypair.html)
 * object to a native Ed25519 {@link CryptoKeyPair} object.
 *
 * @example
 * ```ts
 * import { toKitKeypair } from '@solana/web3.js/compat';
 *
 * const web3jsKeypair = await Keypair.fromSeed(new Uint8Array(32));
 * const { privateKey, publicKey } = await toKitKeypair(web3jsKeypair);
 * ```
 */
export async function toKitKeypair(
  keypair: Keypair,
  extractable?: boolean,
): Promise<CryptoKeyPair> {
  const secretKey = keypair.secretKey;
  const bytes = new Uint8Array(64);
  bytes.set(secretKey);
  bytes.set(keypair.publicKey.toBytes(), 32);
  return await createKeyPairFromBytes(bytes, extractable);
}
