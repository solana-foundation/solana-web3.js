import {ed25519} from '@noble/curves/ed25519';

/**
 * A 64 byte secret key, the first 32 bytes of which is the
 * private scalar and the last 32 bytes is the public key.
 * Read more: https://blog.mozilla.org/warner/2011/11/29/ed25519-keys/
 */
type Ed25519SecretKey = Uint8Array;

/**
 * Ed25519 Keypair
 */
export interface Ed25519Keypair {
  publicKey: Uint8Array;
  secretKey: Ed25519SecretKey;
}

export const generatePrivateKey = ed25519.utils.randomPrivateKey;
export const generateKeypair = (): Ed25519Keypair => {
  const privateScalar = ed25519.utils.randomPrivateKey();
  const publicKey = getPublicKey(privateScalar);
  const secretKey = new Uint8Array(64);
  secretKey.set(privateScalar);
  secretKey.set(publicKey, 32);
  return {
    publicKey,
    secretKey,
  };
};
export const getPublicKey = ed25519.getPublicKey;
export function isOnCurve(publicKey: Uint8Array): boolean {
  try {
    ed25519.ExtendedPoint.fromHex(publicKey);
    return true;
  } catch {
    return false;
  }
}
export const sign = (
  message: Parameters<typeof ed25519.sign>[0],
  secretKey: Ed25519SecretKey,
) => ed25519.sign(message, secretKey.slice(0, 32));
// NOTE: `@noble/curves` may throw for malformed inputs (wrong lengths, etc.).
// web3.js is often used with partially-constructed / user-supplied transactions,
// so we treat malformed signatures / pubkeys as a failed verification instead of
// bubbling an exception (which can become an application-level DoS).
export function verify(
  signature: Parameters<typeof ed25519.verify>[0],
  message: Parameters<typeof ed25519.verify>[1],
  publicKey: Parameters<typeof ed25519.verify>[2],
): boolean {
  try {
    // Ed25519 expects 64-byte signatures and 32-byte public keys.
    // Returning `false` here keeps callers' logic intact (invalid signature),
    // while avoiding unexpected throws.
    if ((signature as Uint8Array).length !== 64) return false;
    if ((publicKey as Uint8Array).length !== 32) return false;
    return ed25519.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}
