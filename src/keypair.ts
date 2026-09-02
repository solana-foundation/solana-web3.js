import {
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKeyBytes,
  type Address,
  type KeyPairSigner,
  type MessagePartialSigner,
  signBytes,
  signatureBytes,
  type TransactionPartialSigner,
  verifySignature,
} from '@solana/kit';

import {PublicKey} from './publickey';
import {toPackedUint8Array} from './utils/typed-array';

/**
 * Union of signer shapes accepted by web3.js transaction signing APIs.
 * Dispatch is documented on `signTransactionMessageBytes` in
 * `src/kit-adapters/signing.ts`.
 */
export type Signer = MessagePartialSigner | TransactionPartialSigner;

/**
 * An account keypair backed by WebCrypto.
 *
 * Implements Kit's `KeyPairSigner` (and therefore `MessagePartialSigner`
 * and `TransactionPartialSigner`), so instances can be passed directly to
 * Kit APIs and generated program clients that accept a `TransactionSigner`
 * or `KeyPairSigner`.
 */
export class Keypair implements KeyPairSigner {
  #signer: KeyPairSigner<Address>;
  #privateKeyBytes: Uint8Array;
  #publicKeyBytes: Uint8Array;

  private constructor(
    signer: KeyPairSigner<Address>,
    privateKeyBytes: Uint8Array,
    publicKeyBytes: Uint8Array,
  ) {
    this.#signer = signer;
    this.#privateKeyBytes = privateKeyBytes;
    this.#publicKeyBytes = publicKeyBytes;
  }

  /**
   * Generate a new random keypair.
   */
  static async generate(): Promise<Keypair> {
    const privateKeyBytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(privateKeyBytes);
    return this.fromSeed(privateKeyBytes);
  }

  /**
   * Create a keypair from a raw 64-byte secret key (32-byte private key
   * followed by 32-byte public key).
   */
  static async fromSecretKey(secretKey: Uint8Array): Promise<Keypair> {
    const packedSecretKey = Uint8Array.from(secretKey);
    const signer = await createKeyPairSignerFromBytes(packedSecretKey);
    const publicKeyBytes = new PublicKey(signer.address).toBytes();
    return new Keypair(signer, packedSecretKey.slice(0, 32), publicKeyBytes);
  }

  /**
   * Create a keypair from a 32-byte seed (private-key bytes).
   */
  static async fromSeed(seed: Uint8Array): Promise<Keypair> {
    const packedSeed = Uint8Array.from(seed);
    const signer = await createKeyPairSignerFromPrivateKeyBytes(packedSeed);
    const publicKeyBytes = new PublicKey(signer.address).toBytes();
    return new Keypair(signer, packedSeed, publicKeyBytes);
  }

  /**
   * Returns the base-58 address as a Kit-compatible branded `Address` string.
   *
   * This property is provided for structural compatibility with
   * `@solana/signers` / Kit (so `Keypair` can be used where a
   * `TransactionSigner` is expected).
   *
   *  Most users of this library should use {@link publicKey} instead.
   */
  get address(): Address {
    return this.#signer.address;
  }

  /**
   * The PublicKey for this keypair
   *
   * @returns {PublicKey} PublicKey
   */
  get publicKey(): PublicKey {
    return new PublicKey(this.#publicKeyBytes);
  }

  /**
   * The underlying WebCrypto `CryptoKeyPair`.
   */
  get keyPair(): CryptoKeyPair {
    return this.#signer.keyPair;
  }

  /**
   * Returns this keypair's 64-byte secret key bytes
   */
  get secretKey(): Uint8Array {
    const secretKey = new Uint8Array(64);
    secretKey.set(this.#privateKeyBytes);
    secretKey.set(this.#publicKeyBytes, 32);
    return secretKey;
  }

  /**
   * Sign one or more messages as a Kit `MessagePartialSigner`.
   *
   * Declared as an arrow-function field so callers can destructure
   * (`const {signMessages} = keypair`) without losing `this` binding.
   */
  signMessages: MessagePartialSigner<Address>['signMessages'] = (
    messages,
    config,
  ) => this.#signer.signMessages(messages, config);

  /**
   * Sign one or more transactions as a Kit `TransactionPartialSigner`.
   *
   * Declared as an arrow-function field so callers can destructure
   * (`const {signTransactions} = keypair`) without losing `this` binding.
   */
  signTransactions: TransactionPartialSigner<Address>['signTransactions'] = (
    transactions,
    config,
  ) => this.#signer.signTransactions(transactions, config);

  /**
   * Sign raw message bytes and return the 64-byte ed25519 signature.
   */
  async signBytes(message: Uint8Array): Promise<Uint8Array> {
    return signBytes(
      this.#signer.keyPair.privateKey,
      toPackedUint8Array(message),
    );
  }

  /**
   * Verify a signature against the provided message using this keypair's
   * public key.
   */
  async verifySignature(
    signature: Uint8Array,
    message: Uint8Array,
  ): Promise<boolean> {
    return verifySignature(
      this.#signer.keyPair.publicKey,
      signatureBytes(toPackedUint8Array(signature)),
      toPackedUint8Array(message),
    );
  }
}
