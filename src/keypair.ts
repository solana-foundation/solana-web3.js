import {assertKeyExporterIsAvailable} from '@solana/assertions';
import {
  createKeyPairFromPrivateKeyBytes,
  createKeyPairFromBytes,
  signBytes,
  signatureBytes,
  verifySignature,
} from '@solana/keys';

import {Address} from './address';
import {toPackedUint8Array} from './utils/typed-array';

/**
 * Keypair signer interface
 */
export interface Signer {
  publicKey: Address;
  secretKey?: Uint8Array;
  signBytes(message: Uint8Array): Promise<Uint8Array>;
}

/**
 * An account keypair backed by WebCrypto.
 */
export class Keypair implements Signer {
  #keypair: CryptoKeyPair;
  #privateKeyBytes: Uint8Array;
  #publicKeyBytes: Uint8Array;

  private constructor(
    keypair: CryptoKeyPair,
    privateKeyBytes: Uint8Array,
    publicKeyBytes: Uint8Array,
  ) {
    this.#keypair = keypair;
    this.#privateKeyBytes = privateKeyBytes;
    this.#publicKeyBytes = publicKeyBytes;
  }

  /**
   * Generate a new random keypair
   *
   * @returns {Promise<Keypair>} Keypair
   */
  static async generate(): Promise<Keypair> {
    const privateKeyBytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(privateKeyBytes);
    return this.fromSeed(privateKeyBytes);
  }

  /**
   * Create a keypair from a raw 64-byte secret key byte array.
   */
  static async fromSecretKey(secretKey: Uint8Array): Promise<Keypair> {
    const packedSecretKey = Uint8Array.from(secretKey);
    const keypair = await createKeyPairFromBytes(packedSecretKey);
    const publicKeyBytes = await exportCryptoKeyBytes(keypair.publicKey);
    return new Keypair(keypair, packedSecretKey.slice(0, 32), publicKeyBytes);
  }

  /**
   * Create a keypair from a 32-byte seed.
   */
  static async fromSeed(seed: Uint8Array): Promise<Keypair> {
    const packedSeed = Uint8Array.from(seed);
    const keypair = await createKeyPairFromPrivateKeyBytes(packedSeed);
    const publicKeyBytes = await exportCryptoKeyBytes(keypair.publicKey);
    return new Keypair(keypair, packedSeed, publicKeyBytes);
  }

  /**
   * The public key for this keypair
   *
   * @returns {Address} Address
   */
  get publicKey(): Address {
    return new Address(this.#publicKeyBytes);
  }

  /**
   * Returns this keypair's secret key bytes.
   */
  get secretKey(): Uint8Array {
    const secretKey = new Uint8Array(64);
    secretKey.set(this.#privateKeyBytes);
    secretKey.set(this.#publicKeyBytes, 32);
    return secretKey;
  }

  /**
   * Sign a message using this keypair.
   */
  async signBytes(message: Uint8Array): Promise<Uint8Array> {
    const privateKey = this.#keypair.privateKey;
    const signMessage = toPackedUint8Array(message);
    return signBytes(privateKey, signMessage);
  }

  /**
   * Verify a signature using this keypair's public key.
   */
  async verifySignature(
    signature: Uint8Array,
    message: Uint8Array,
  ): Promise<boolean> {
    const publicKey = this.#keypair.publicKey;
    const verifySignatureBytes = signatureBytes(toPackedUint8Array(signature));
    const verifyMessage = toPackedUint8Array(message);
    return verifySignature(publicKey, verifySignatureBytes, verifyMessage);
  }
}

async function exportCryptoKeyBytes(key: CryptoKey): Promise<Uint8Array> {
  assertKeyExporterIsAvailable();
  const rawKey = await globalThis.crypto.subtle.exportKey('raw', key);
  return new Uint8Array(rawKey);
}
