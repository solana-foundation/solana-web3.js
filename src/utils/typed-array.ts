import type {ReadonlyUint8Array} from '@solana/codecs-core';
import type {Buffer} from 'buffer';

/**
 * Convert common byte containers into a Uint8Array view when possible.
 *
 * Note: For sliced views, this preserves the original backing buffer and
 * byte offsets. For `Array<number>`, this creates a copy because arrays do
 * not have an `ArrayBuffer` backing store.
 *
 * Use `toPackedUint8Array` when a tightly packed buffer is required.
 */
export const toUint8ArrayView = (
  arr: Buffer | Uint8Array | ReadonlyUint8Array | Array<number>,
): Uint8Array => {
  return Array.isArray(arr)
    ? new Uint8Array(arr)
    : new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
};

/**
 * Ensure a Uint8Array is tightly packed and only includes the intended bytes.
 *
 * This copies when the input is a view into a larger backing store so callers
 * like signing/verifying cannot observe unrelated bytes.
 */
export const toPackedUint8Array = (arr: Uint8Array): Uint8Array => {
  if (arr.byteOffset === 0 && arr.byteLength === arr.buffer.byteLength) {
    return arr;
  }
  return Uint8Array.from(arr);
};
