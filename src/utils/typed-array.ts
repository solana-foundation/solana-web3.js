import type {ReadonlyUint8Array} from '@solana/codecs-core';

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
  arr: Uint8Array | ReadonlyUint8Array | Array<number>,
): Uint8Array => {
  return Array.isArray(arr)
    ? new Uint8Array(arr)
    : new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
};

/**
 * Ensure byte-like input is tightly packed and only includes the intended bytes.
 *
 * This copies when the input is a view into a larger backing store so callers
 * like signing/verifying cannot observe unrelated bytes.
 */
export const toPackedUint8Array = (
  arr: Uint8Array | ReadonlyUint8Array | Array<number>,
): Uint8Array => {
  if (Array.isArray(arr)) {
    return new Uint8Array(arr);
  }

  if (arr.byteOffset === 0 && arr.byteLength === arr.buffer.byteLength) {
    return arr instanceof Uint8Array
      ? arr
      : new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  return Uint8Array.from(arr);
};

/**
 * Concatenate byte sequences into a newly allocated Uint8Array.
 */
export const concatUint8Arrays = (
  arrays: ReadonlyArray<Uint8Array | ReadonlyUint8Array>,
): Uint8Array => {
  const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }

  return result;
};
