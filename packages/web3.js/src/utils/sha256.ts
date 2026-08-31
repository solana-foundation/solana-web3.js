import {toArrayBuffer} from '@solana/kit';
import {assertDigestCapabilityIsAvailable} from '@solana/assertions';

import {toPackedUint8Array} from './typed-array';

/**
 * Calculate the SHA-256 hash of the input data using the Web Crypto API.
 *
 * @param data The input data to hash.
 * @returns A promise that resolves to the SHA-256 hash of the input data.
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  assertDigestCapabilityIsAvailable();
  const normalizedData = toPackedUint8Array(data);
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    toArrayBuffer(normalizedData),
  );
  return new Uint8Array(digest);
}
