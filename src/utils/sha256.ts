import {assertDigestCapabilityIsAvailable} from '@solana/assertions';
import {toArrayBuffer} from '@solana/codecs-core';
import {sha256 as nobleSha256} from '@noble/hashes/sha256';

/**
 * Calculate the SHA-256 hash of the input data using the Web Crypto API.
 *
 * @param data The input data to hash.
 * @returns A promise that resolves to the SHA-256 hash of the input data.
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  assertDigestCapabilityIsAvailable();
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    toArrayBuffer(data),
  );
  return new Uint8Array(digest);
}

/**
 * Calculate the SHA-256 hash of the input data.
 *
 * @param data The input data to hash.
 * @returns The SHA-256 hash of the input data.
 * @deprecated Use `sha256` instead, which uses the Web Crypto API and reduces attack surface in modern environments.
 */
export const sha256Sync = (data: Uint8Array) => nobleSha256(data);
