import type { ReadonlyUint8Array, TransactionMessageBytes } from '@solana/kit';

/**
 * `TransactionMessageBytes` is a branded `ReadonlyUint8Array<ArrayBuffer>`.
 * We produce raw bytes from our legacy `Message` serializer and need to brand
 * them for Kit consumption. Centralized here so the brand bypass is auditable.
 * @internal
 */
export function asTransactionMessageBytes(bytes: Uint8Array): TransactionMessageBytes {
    return bytes as ReadonlyUint8Array<ArrayBuffer> as TransactionMessageBytes;
}
