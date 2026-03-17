import {Buffer} from 'buffer';
import {assertIsAddress, createAddressWithSeed, type Address, getAddressCodec} from '@solana/addresses';
import {assertVerificationCapabilityIsAvailable} from '@solana/assertions';
import type {ReadonlyUint8Array} from '@solana/codecs-core';
import {
  signatureBytes,
  verifySignature as verifySignatureAsync,
} from '@solana/keys';
import {sha256, sha256Sync} from './utils/sha256';

import {isOnCurve, verify as verifySync} from './utils/ed25519';
import assert from './utils/assert';
import {toBuffer} from './utils/to-buffer';

/**
 * Maximum length of derived pubkey seed
 */
export const MAX_SEED_LENGTH = 32;

/**
 * Maximum number of seeds used to derive a program address.
 */
const MAX_SEEDS = 16;

/**
 * Size of public key in bytes
 */
export const PUBLIC_KEY_LENGTH = 32;

/**
 * Value to be converted into public key
 */
export type PublicKeyInitData =
  | number
  | bigint
  | string
  | Uint8Array
  | ReadonlyUint8Array
  | Array<number>
  | PublicKey
  | Address;

const ERROR__INVALID_PUBLIC_KEY_INPUT = 'Invalid public key input';
const ERROR__INVALID_SEEDS_POINT_ON_CURVE =
  'Invalid seeds, address must fall off the curve';
const ERROR__FAILED_TO_FIND_VIABLE_PROGRAM_ADDRESS_NONCE =
  'Unable to find a viable program address nonce';
const ADDRESS_CODEC = getAddressCodec();
const PROGRAM_DERIVED_ADDRESS_MARKER = 'ProgramDerivedAddress';
const PROGRAM_DERIVED_ADDRESS_MARKER_BUFFER = Buffer.from(
  PROGRAM_DERIVED_ADDRESS_MARKER,
);

// local counter used by PublicKey.unique()
let uniquePublicKeyCounter = 1;

/**
 * A public key
 */
export class PublicKey {
  private readonly _publicKeyBytes: Uint8Array;

  /**
   * Create a new PublicKey object
   * @param value ed25519 public key as buffer or base-58 encoded string
   */
  constructor(value: PublicKeyInitData) {
    if (typeof value === 'string') {
      this._publicKeyBytes = bytesFromAddressString(value);
    } else if (isUint8ArrayLike(value)) {
      this._publicKeyBytes = bytesFromUint8Array(new Uint8Array(value));
    } else if (Array.isArray(value)) {
      this._publicKeyBytes = bytesFromNumberArray(value);
    } else if (value instanceof PublicKey) {
      this._publicKeyBytes = value.toBytes();
    } else if (typeof value === 'number') {
      this._publicKeyBytes = bytesFromNumber(value);
    } else if (typeof value === 'bigint') {
      this._publicKeyBytes = bytesFromBigInt(value);
    } else {
      assertUnreachablePublicKeyInput(value);
    }
  }

  /**
   * Returns a unique PublicKey for tests and benchmarks using a counter
   * @deprecated To be removed in v3, and replaced with test-specific utilities for generating unique public keys.
   */
  static unique(): PublicKey {
    const key = new PublicKey(uniquePublicKeyCounter);
    uniquePublicKeyCounter += 1;
    return new PublicKey(key.toBuffer());
  }

  /**
   * Default public key value. The base58-encoded string representation is all ones (as seen below)
   * The underlying number is 32 bytes that are all zeros
   */
  static default: PublicKey = new PublicKey('11111111111111111111111111111111');

  /**
   * Checks if two publicKeys are equal
   */
  equals(publicKey: PublicKey): boolean {
    if (this === publicKey) {
      return true;
    }

    const left = this._publicKeyBytes;
    const right = publicKey._publicKeyBytes;
    for (let index = 0; index < PUBLIC_KEY_LENGTH; index += 1) {
      if (left[index] !== right[index]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Return the base-58 representation of the public key
   */
  toBase58(): string {
    return ADDRESS_CODEC.decode(this._publicKeyBytes);
  }

  toJSON(): string {
    return this.toBase58();
  }

  /**
   * Return the byte array representation of the public key in big endian
   */
  toBytes(): Uint8Array {
    return new Uint8Array(this._publicKeyBytes);
  }

  /**
   * Verify a signature for the provided message with this public key.
   * @since 2.0.0
   */
  async verifySignature(
    signature: Uint8Array,
    message: Uint8Array,
  ): Promise<boolean> {
    assertVerificationCapabilityIsAvailable();
    const publicKeyBytes = Uint8Array.from(this._publicKeyBytes);
    const publicKeyCryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      {name: 'Ed25519'},
      false,
      ['verify'],
    );
    return verifySignatureAsync(
      publicKeyCryptoKey,
      signatureBytes(signature),
      message,
    );
  }

  /**
   * Verify a signature for the provided message with this public key.
   * @deprecated Deprecated: scheduled for removal in v3. Use {@link verifySignature} instead.
   */
  verifySignatureSync(signature: Uint8Array, message: Uint8Array): boolean {
    return verifySync(signature, message, this.toBytes());
  }

  /**
   * Return the Buffer representation of the public key in big endian
   */
  toBuffer(): Buffer {
    return Buffer.from(this._publicKeyBytes);
  }

  /**
   * Borsh-compatible encoding (little-endian)
   */
  encode(): Buffer {
    return Buffer.from(this._publicKeyBytes).reverse();
  }

  /**
   * Borsh-compatible decoding (little-endian)
   */
  static decode(data: Buffer | Uint8Array | Array<number>): PublicKey {
    const encoded = toBuffer(data);
    assert(
      encoded.length === PUBLIC_KEY_LENGTH,
      ERROR__INVALID_PUBLIC_KEY_INPUT,
    );
    return new PublicKey(Uint8Array.from(encoded).reverse());
  }

  /**
   * Borsh-compatible unchecked decoding (little-endian)
   */
  static decodeUnchecked(data: Buffer | Uint8Array | Array<number>): PublicKey {
    const encoded = toBuffer(data);
    assert(
      encoded.length >= PUBLIC_KEY_LENGTH,
      ERROR__INVALID_PUBLIC_KEY_INPUT,
    );
    const firstField = encoded.subarray(0, PUBLIC_KEY_LENGTH);
    return new PublicKey(Uint8Array.from(firstField).reverse());
  }

  get [Symbol.toStringTag](): string {
    return `PublicKey(${this.toString()})`;
  }

  /**
   * Return the base-58 representation of the public key
   */
  toString(): string {
    return this.toBase58();
  }

  /**
   * Derive a public key from another key, a seed, and a program ID.
   * The program ID will also serve as the owner of the public key, giving
   * it permission to write data to the account.
   */
  static async createWithSeed(
    fromPublicKey: PublicKey,
    seed: string,
    programId: PublicKey,
  ): Promise<PublicKey> {
    const baseAddress = fromPublicKey.toBase58();
    assertIsAddress(baseAddress);
    const programAddress = programId.toBase58();
    assertIsAddress(programAddress);

    const derivedAddress = await createAddressWithSeed({
      baseAddress,
      programAddress,
      seed,
    });
    return new PublicKey(derivedAddress);
  }

  /**
   * Sync version of createProgramAddress
   * For backwards compatibility
   *
   * @deprecated Use {@link createProgramAddress} instead
   */
  static createProgramAddressSync(
    seeds: Array<Buffer | Uint8Array>,
    programId: PublicKey,
  ): PublicKey {
    const buffer = buildProgramDerivedAddressInputBuffer(seeds, programId);
    const publicKeyBytes = sha256Sync(buffer);
    if (isOnCurve(publicKeyBytes)) {
      throw new Error(ERROR__INVALID_SEEDS_POINT_ON_CURVE);
    }
    return new PublicKey(publicKeyBytes);
  }

  /**
   * Derive a program address from seeds and a program ID.
   */
  static async createProgramAddress(
    seeds: Array<Buffer | Uint8Array>,
    programId: PublicKey,
  ): Promise<PublicKey> {
    const buffer = buildProgramDerivedAddressInputBuffer(seeds, programId);
    const publicKeyBytes = await sha256(buffer);
    if (isOnCurve(publicKeyBytes)) {
      throw new Error(ERROR__INVALID_SEEDS_POINT_ON_CURVE);
    }
    return new PublicKey(publicKeyBytes);
  }

  /**
   * Find a valid program address
   *
   * Valid program addresses must fall off the ed25519 curve.  This function
   * iterates a nonce until it finds one that when combined with the seeds
   * results in a valid program address.
   */
  static findProgramAddressSync(
    seeds: Array<Buffer | Uint8Array>,
    programId: PublicKey,
  ): [PublicKey, number] {
    for (const [nonce, seedsWithNonce] of programAddressNonceCandidates(seeds)) {
      try {
        const derivedAddress = this.createProgramAddressSync(
          seedsWithNonce,
          programId,
        );
        return [derivedAddress, nonce];
      } catch (err) {
        if (isInvalidSeedsPointOnCurveError(err)) {
          continue;
        }
        throw err;
      }
    }
    throw new Error(ERROR__FAILED_TO_FIND_VIABLE_PROGRAM_ADDRESS_NONCE);
  }

  /**
   * Async version of findProgramAddressSync
   * For backwards compatibility
   *
   * @deprecated Use {@link findProgramAddressSync} instead
   */
  static async findProgramAddress(
    seeds: Array<Buffer | Uint8Array>,
    programId: PublicKey,
  ): Promise<[PublicKey, number]> {
    for (const [nonce, seedsWithNonce] of programAddressNonceCandidates(seeds)) {
      try {
        const derivedAddress = await this.createProgramAddress(
          seedsWithNonce,
          programId,
        );
        return [derivedAddress, nonce];
      } catch (err) {
        if (isInvalidSeedsPointOnCurveError(err)) {
          continue;
        }
        throw err;
      }
    }
    throw new Error(ERROR__FAILED_TO_FIND_VIABLE_PROGRAM_ADDRESS_NONCE);
  }

  /**
   * Check that a pubkey is on the ed25519 curve.
   */
  static isOnCurve(pubkeyData: PublicKeyInitData): boolean {
    const pubkey = new PublicKey(pubkeyData);
    return isOnCurve(pubkey.toBytes());
  }
}

function isUint8ArrayLike(
  value: PublicKeyInitData,
): value is Uint8Array | ReadonlyUint8Array {
  return value instanceof Uint8Array;
}

function assertUnreachablePublicKeyInput(value: never): never {
  throw new Error(ERROR__INVALID_PUBLIC_KEY_INPUT);
}

function isInvalidSeedsPointOnCurveError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message === ERROR__INVALID_SEEDS_POINT_ON_CURVE
  );
}

function* programAddressNonceCandidates(
  seeds: Array<Buffer | Uint8Array>,
): Generator<[number, Array<Buffer | Uint8Array>], void, void> {
  let nonce = 255;
  while (nonce != 0) {
    yield [nonce, seeds.concat(Buffer.from([nonce]))];
    nonce--;
  }
}

function buildProgramDerivedAddressInputBuffer(
  seeds: Array<Buffer | Uint8Array>,
  programId: PublicKey,
): Buffer {
  if (seeds.length > MAX_SEEDS) {
    throw new TypeError(`Max seed count exceeded`);
  }

  const parts: Buffer[] = [];
  for (const seed of seeds) {
    if (seed.length > MAX_SEED_LENGTH) {
      throw new TypeError(`Max seed length exceeded`);
    }
    parts.push(toBuffer(seed));
  }

  parts.push(programId.toBuffer());
  parts.push(PROGRAM_DERIVED_ADDRESS_MARKER_BUFFER);
  return Buffer.concat(parts);
}

/**
 * Normalize constructor Uint8Array input into a canonical 32-byte public key byte array.
 * @internal
 */
function bytesFromUint8Array(bytes: Uint8Array): Uint8Array {
  assert(bytes.length <= PUBLIC_KEY_LENGTH, ERROR__INVALID_PUBLIC_KEY_INPUT);
  if (bytes.length === PUBLIC_KEY_LENGTH) {
    return new Uint8Array(bytes);
  }

  const padded = new Uint8Array(PUBLIC_KEY_LENGTH);
  padded.set(bytes, PUBLIC_KEY_LENGTH - bytes.length);
  return padded;
}

/**
 * Convert constructor number input into a canonical 32-byte public key byte array.
 * @internal
 */
function bytesFromNumber(value: number): Uint8Array {
  const isValidNumber = Number.isSafeInteger(value) && value >= 0;
  assert(isValidNumber, ERROR__INVALID_PUBLIC_KEY_INPUT);
  return bytesFromBigInt(BigInt(value));
}

/**
 * Convert constructor bigint input into a canonical 32-byte public key byte array.
 * @internal
 */
function bytesFromBigInt(value: bigint): Uint8Array {
  assert(
    value >= 0n && value <= 0xffffffffffffffff_ffffffffffffffff_ffffffffffffffff_ffffffffffffffffn,
    ERROR__INVALID_PUBLIC_KEY_INPUT,
  );

  const out = new Uint8Array(PUBLIC_KEY_LENGTH);
  let remainder = value;
  for (
    let index = PUBLIC_KEY_LENGTH - 1;
    index >= 0 && remainder > 0n;
    index -= 1
  ) {
    out[index] = Number(remainder & 0xffn);
    remainder >>= 8n;
  }
  return out;
}

/**
 * Convert constructor address-string input into a public key byte array.
 * @internal
 */
function bytesFromAddressString(value: string): Uint8Array {
  assertIsAddress(value);

  const encoded = ADDRESS_CODEC.encode(value);
  return new Uint8Array(encoded);
}

/**
 * Convert constructor number-array input into a canonical 32-byte public key byte array.
 * @internal
 */
function bytesFromNumberArray(value: Array<number>): Uint8Array {
  const parsed = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    const byteValue = value[index];
    const isValidByte =
      Number.isInteger(byteValue) && byteValue >= 0 && byteValue <= 0xff;
    assert(isValidByte, ERROR__INVALID_PUBLIC_KEY_INPUT);
    parsed[index] = byteValue;
  }
  return bytesFromUint8Array(parsed);
}
