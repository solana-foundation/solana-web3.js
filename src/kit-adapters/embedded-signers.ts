import type {MessagePartialSigner} from '@solana/kit';

/**
 * Sidecar storage for the signers embedded in the kit instructions a message
 * or transaction message was built from.
 */
const EMBEDDED_SIGNERS = new WeakMap<
  object,
  ReadonlyArray<MessagePartialSigner>
>();

/** @internal */
export function setEmbeddedSigners(
  message: object,
  signers: ReadonlyArray<MessagePartialSigner>,
): void {
  if (signers.length > 0) {
    EMBEDDED_SIGNERS.set(message, signers);
  }
}

/** @internal */
export function getEmbeddedSigners(
  message: object,
): ReadonlyArray<MessagePartialSigner> {
  return EMBEDDED_SIGNERS.get(message) ?? [];
}
