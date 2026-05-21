import {
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKeyBytes,
  type Address as KitAddress,
  type KeyPairSigner,
  type MessagePartialSigner,
  type MessagePartialSignerConfig,
  type SignableMessage,
  signBytes,
  signatureBytes,
  type SignatureDictionary,
  type TransactionPartialSigner,
  type TransactionPartialSignerConfig,
  verifySignature,
} from '@solana/kit';

import {Address} from './address';
import {toPackedUint8Array} from './utils/typed-array';

/**
 * Legacy web3.js v1 signer shape: a `publicKey` paired with the 64-byte
 * `secretKey` bytes. Accepted by transaction signing APIs as a fallback
 * ed25519 signing path.
 */
export interface Web3Signer {
  publicKey: Address;
  secretKey: Uint8Array;
}

/**
 * Union of signer shapes accepted by web3.js transaction signing APIs.
 *
 * Includes the legacy {@link Web3Signer} shape as well as Kit
 * `MessagePartialSigner` and `TransactionPartialSigner` values. Dispatch
 * precedence is documented on `signTransactionMessageBytes` in
 * `src/kit-adapters/signing.ts`.
 */
export type Signer =
  | Web3Signer
  | MessagePartialSigner
  | TransactionPartialSigner;

/**
 * Subset of {@link Signer} accepted where transaction lifetime information
 * is unavailable (e.g. `VersionedTransaction.sign`). Excludes
 * `TransactionPartialSigner` because Kit transaction signing requires a
 * lifetime constraint that `VersionedTransaction` does not carry.
 */
export type MessageSigner = Web3Signer | MessagePartialSigner;

type SignableTransaction = Parameters<
  TransactionPartialSigner['signTransactions']
>[0][number];

/**
 * An account keypair backed by WebCrypto.
 */
export class Keypair implements Web3Signer, KeyPairSigner<KitAddress> {
  // Required so that this class can be passed directly to Kit's
  // `isKeyPairSigner` / `isMessagePartialSigner` / `isTransactionPartialSigner`
  // type guards, which expect a `{[key: string]: unknown; address: Address}`
  // shape.
  //
  // Side effect: any non-declared property access on a `Keypair` resolves to
  // `unknown` instead of erroring. Accepted trade-off for Kit interop.
  readonly [key: string]: unknown;

  #signer: KeyPairSigner<KitAddress>;
  #privateKeyBytes: Uint8Array;
  #publicKeyBytes: Uint8Array;

  private constructor(
    signer: KeyPairSigner<KitAddress>,
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
    return new Keypair(
      signer,
      packedSecretKey.slice(0, 32),
      packedSecretKey.slice(32),
    );
  }

  /**
   * Create a keypair from a 32-byte seed (private-key bytes).
   */
  static async fromSeed(seed: Uint8Array): Promise<Keypair> {
    const packedSeed = Uint8Array.from(seed);
    const signer = await createKeyPairSignerFromPrivateKeyBytes(packedSeed);
    const publicKeyBytes = new Address(signer.address).toBytes();
    return new Keypair(signer, packedSeed, publicKeyBytes);
  }

  /**
   * The base-58 address for this keypair as a Kit-branded address string.
   * Use {@link publicKey} when you need the web3.js `Address` class methods.
   */
  get address(): KitAddress {
    return this.#signer.address;
  }

  /**
   * The public key for this keypair as a web3.js `Address` object, which
   * supports `.toBytes()`, `.equals(...)`, `.toBase58()`, and
   * `.verifySignature(...)`.
   */
  get publicKey(): Address {
    return new Address(this.#publicKeyBytes);
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
  signMessages = (
    messages: readonly SignableMessage[],
    config?: MessagePartialSignerConfig,
  ): Promise<readonly SignatureDictionary[]> => {
    return this.#signer.signMessages(messages, config);
  };

  /**
   * Sign one or more transactions as a Kit `TransactionPartialSigner`.
   *
   * Declared as an arrow-function field so callers can destructure
   * (`const {signTransactions} = keypair`) without losing `this` binding.
   */
  signTransactions = (
    transactions: readonly SignableTransaction[],
    config?: TransactionPartialSignerConfig,
  ): Promise<readonly SignatureDictionary[]> => {
    return this.#signer.signTransactions(transactions, config);
  };

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
