import type {
  Blockhash,
  Nonce,
  ReadonlyUint8Array,
  TransactionMessageBytes,
} from '@solana/kit';

/**
 * `Blockhash` and `Nonce` are distinct base58-string brands in Kit, but a
 * durable nonce IS a blockhash-shaped value. TypeScript rejects the direct
 * cross-brand cast, so the bypass is centralized here.
 * @internal
 */
export function blockhashAsNonce(blockhash: Blockhash): Nonce {
  return blockhash as unknown as Nonce;
}

/**
 * `TransactionMessageBytes` is a branded `ReadonlyUint8Array<ArrayBuffer>`.
 * We produce raw bytes from our legacy `Message` serializer and need to brand
 * them for Kit consumption. Centralized here so the brand bypass is auditable.
 * @internal
 */
export function asTransactionMessageBytes(
  bytes: Uint8Array,
): TransactionMessageBytes {
  return bytes as ReadonlyUint8Array<ArrayBuffer> as TransactionMessageBytes;
}
