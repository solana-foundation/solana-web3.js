import {
  assertIsBlockhash,
  type Blockhash,
  type Nonce,
  type ReadonlyUint8Array,
  type TransactionMessageBytes,
} from '@solana/kit';

/**
 * Validates a base58 blockhash string and brands it as a Kit `Blockhash`.
 * The public API accepts blockhashes as plain strings; validation happens
 * here, where the value crosses into Kit.
 * @internal
 */
export function asKitBlockhash(blockhash: string): Blockhash {
  assertIsBlockhash(blockhash);
  return blockhash;
}

/**
 * `Blockhash` and `Nonce` are distinct base58-string brands in Kit, but a
 * durable nonce IS a blockhash-shaped value. The public API accepts nonces
 * as plain strings; they are validated here, where the value crosses into
 * Kit.
 * @internal
 */
export function blockhashAsNonce(blockhash: string): Nonce {
  assertIsBlockhash(blockhash);
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
