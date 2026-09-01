import { ed25519 } from '@noble/curves/ed25519';
import { createKeyPairFromBytes, signBytes, signatureBytes, verifySignature } from '@solana/kit';

import { toPackedUint8Array } from './typed-array';

type Ed25519SecretKey = Uint8Array;

export function isOnCurve(publicKey: Uint8Array): boolean {
    try {
        ed25519.ExtendedPoint.fromHex(publicKey);
        return true;
    } catch {
        return false;
    }
}

export async function sign(message: Uint8Array, secretKey: Ed25519SecretKey): Promise<Uint8Array> {
    const keyPair = await createKeyPairFromBytes(Uint8Array.from(secretKey));
    return await signBytes(keyPair.privateKey, toPackedUint8Array(message));
}

export async function verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    const cryptoKey = await globalThis.crypto.subtle.importKey(
        'raw',
        Uint8Array.from(publicKey),
        { name: 'Ed25519' },
        false,
        ['verify'],
    );
    return await verifySignature(cryptoKey, signatureBytes(toPackedUint8Array(signature)), toPackedUint8Array(message));
}
