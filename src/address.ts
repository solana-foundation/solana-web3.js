import {
  assertIsAddress,
  createAddressWithSeed,
  getProgramDerivedAddress,
  type Address as KitAddress,
  getAddressCodec,
} from '@solana/addresses';
import {assertVerificationCapabilityIsAvailable} from '@solana/assertions';
import type {ReadonlyUint8Array} from '@solana/codecs-core';
import {
  SOLANA_ERROR__ADDRESSES__INVALID_SEEDS_POINT_ON_CURVE,
  SOLANA_ERROR__ADDRESSES__MAX_NUMBER_OF_PDA_SEEDS_EXCEEDED,
  SOLANA_ERROR__ADDRESSES__MAX_PDA_SEED_LENGTH_EXCEEDED,
  SolanaError,
} from '@solana/errors';
import {
  signatureBytes,
  verifySignature as verifySignatureAsync,
} from '@solana/keys';

import {sha256} from './utils/sha256';
import {isOnCurve} from './utils/ed25519';
import assert from './utils/assert';
import {concatUint8Arrays, toUint8ArrayView} from './utils/typed-array';

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
export type AddressInitData =
  | number
  | bigint
  | string
  | Uint8Array
  | ReadonlyUint8Array
  | Array<number>
  | Address
  | KitAddress;

const ERROR__INVALID_PUBLIC_KEY_INPUT = 'Invalid public key input';
const ADDRESS_CODEC = getAddressCodec();
const PDA_MARKER_BYTES = new TextEncoder().encode('ProgramDerivedAddress');

/**
 * A Solana address
 */
export class Address {
  private readonly _publicKeyBytes: Uint8Array;

  /**
   * Create a new Address object
   * @param value ed25519 public key as bytes or base-58 encoded string
   */
  constructor(value: AddressInitData) {
    if (typeof value === 'string') {
      this._publicKeyBytes = bytesFromAddressString(value);
    } else if (isUint8ArrayLike(value)) {
      this._publicKeyBytes = bytesFromUint8Array(new Uint8Array(value));
    } else if (Array.isArray(value)) {
      this._publicKeyBytes = bytesFromNumberArray(value);
    } else if (value instanceof Address) {
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
   * Default public key value. The base58-encoded string representation is all ones (as seen below)
   * The underlying number is 32 bytes that are all zeros
   */
  static default: Address = new Address('11111111111111111111111111111111');

  /**
   * Checks if two publicKeys are equal
   */
  equals(address: Address): boolean {
    if (this === address) {
      return true;
    }

    const left = this._publicKeyBytes;
    const right = address._publicKeyBytes;
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
   * Borsh-compatible encoding (little-endian)
   */
  encode(): Uint8Array {
    return Uint8Array.from(this._publicKeyBytes).reverse();
  }

  /**
   * Borsh-compatible decoding (little-endian)
   */
  static decode(data: Uint8Array | Array<number>): Address {
    const encoded = toUint8ArrayView(data);
    assert(
      encoded.length === PUBLIC_KEY_LENGTH,
      ERROR__INVALID_PUBLIC_KEY_INPUT,
    );
    return new Address(reverseCopyLittleEndianPublicKeyBytes(encoded));
  }

  /**
   * Borsh-compatible unchecked decoding (little-endian)
   */
  static decodeUnchecked(data: Uint8Array | Array<number>): Address {
    const encoded = toUint8ArrayView(data);
    assert(
      encoded.length >= PUBLIC_KEY_LENGTH,
      ERROR__INVALID_PUBLIC_KEY_INPUT,
    );
    const firstField = encoded.subarray(0, PUBLIC_KEY_LENGTH);
    return new Address(reverseCopyLittleEndianPublicKeyBytes(firstField));
  }

  get [Symbol.toStringTag](): string {
    return `Address(${this.toString()})`;
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
   *
   * @throws {@link SolanaError} with
   * `SOLANA_ERROR__ADDRESSES__MAX_PDA_SEED_LENGTH_EXCEEDED` from
   * `@solana/errors` if the seed exceeds 32 bytes.
   * @throws {@link SolanaError} with
   * `SOLANA_ERROR__ADDRESSES__PDA_ENDS_WITH_PDA_MARKER` from
   * `@solana/errors` if the program address ends with the PDA marker bytes.
   */
  static async createWithSeed(
    fromAddress: Address,
    seed: string,
    programId: Address,
  ): Promise<Address> {
    const derivedAddress = await createAddressWithSeed({
      baseAddress: fromAddress.toBase58() as KitAddress,
      programAddress: programId.toBase58() as KitAddress,
      seed,
    });
    return new Address(derivedAddress);
  }

  /**
   * Derive a program address from seeds and a program ID.
   *
   * @throws {@link SolanaError} with
   * `SOLANA_ERROR__SUBTLE_CRYPTO__DIGEST_UNIMPLEMENTED` from
   * `@solana/errors` if `crypto.subtle.digest()` is unavailable.
   * @throws {@link SolanaError} with
   * `SOLANA_ERROR__ADDRESSES__MAX_NUMBER_OF_PDA_SEEDS_EXCEEDED` from
   * `@solana/errors` if the supplied seeds exceed the PDA count limit.
   * @throws {@link SolanaError} with
   * `SOLANA_ERROR__ADDRESSES__MAX_PDA_SEED_LENGTH_EXCEEDED` from
   * `@solana/errors` if any supplied seed exceeds the PDA seed-length limit.
   * @throws {@link SolanaError} with
   * `SOLANA_ERROR__ADDRESSES__INVALID_SEEDS_POINT_ON_CURVE` from
   * `@solana/errors` if the derived address falls on the Ed25519 curve.
   */
  static async createProgramAddress(
    seeds: Array<Uint8Array | ReadonlyUint8Array>,
    programId: Address,
  ): Promise<Address> {
    if (seeds.length > MAX_SEEDS) {
      throw new SolanaError(
        SOLANA_ERROR__ADDRESSES__MAX_NUMBER_OF_PDA_SEEDS_EXCEEDED,
        {
          actual: seeds.length,
          maxSeeds: MAX_SEEDS,
        },
      );
    }

    for (const [index, seed] of seeds.entries()) {
      if (seed.length > MAX_SEED_LENGTH) {
        throw new SolanaError(
          SOLANA_ERROR__ADDRESSES__MAX_PDA_SEED_LENGTH_EXCEEDED,
          {
            actual: seed.length,
            index,
            maxSeedLength: MAX_SEED_LENGTH,
          },
        );
      }
    }

    const bytes = concatUint8Arrays([
      ...seeds,
      programId.toBytes(),
      PDA_MARKER_BYTES,
    ]);
    const publicKeyBytes = await sha256(bytes);
    if (isOnCurve(publicKeyBytes)) {
      throw new SolanaError(
        SOLANA_ERROR__ADDRESSES__INVALID_SEEDS_POINT_ON_CURVE,
      );
    }
    return new Address(publicKeyBytes);
  }

  /**
   * Find a valid program address
   *
   * Valid program addresses must fall off the ed25519 curve.  This function
   * iterates a nonce until it finds one that when combined with the seeds
   * results in a valid program address.
   *
   * @throws {@link SolanaError} with
   * `SOLANA_ERROR__ADDRESSES__MAX_NUMBER_OF_PDA_SEEDS_EXCEEDED` from
   * `@solana/errors` if the supplied seeds exceed the PDA count limit.
   * @throws {@link SolanaError} with
   * `SOLANA_ERROR__ADDRESSES__MAX_PDA_SEED_LENGTH_EXCEEDED` from
   * `@solana/errors` if any supplied seed exceeds the PDA seed-length limit.
   * @throws {@link SolanaError} with
   * `SOLANA_ERROR__ADDRESSES__FAILED_TO_FIND_VIABLE_PDA_BUMP_SEED` from
   * `@solana/errors` if no viable bump seed exists.
   */
  static async findProgramAddress(
    seeds: Array<Uint8Array | ReadonlyUint8Array>,
    programId: Address,
  ): Promise<[Address, number]> {
    const [derivedAddress, nonce] = await getProgramDerivedAddress({
      programAddress: programId.toBase58() as KitAddress,
      seeds,
    });
    return [new Address(derivedAddress), nonce];
  }

  /**
   * Check that a pubkey is on the ed25519 curve.
   */
  static isOnCurve(addressData: AddressInitData): boolean {
    const address = new Address(addressData);
    return isOnCurve(address.toBytes());
  }
}

function isUint8ArrayLike(
  value: AddressInitData,
): value is Uint8Array | ReadonlyUint8Array {
  return value instanceof Uint8Array;
}

function assertUnreachablePublicKeyInput(_value: never): never {
  throw new Error(ERROR__INVALID_PUBLIC_KEY_INPUT);
}

function reverseCopyLittleEndianPublicKeyBytes(bytes: Uint8Array): Uint8Array {
  const reversedBytes = new Uint8Array(PUBLIC_KEY_LENGTH);
  for (let index = 0; index < PUBLIC_KEY_LENGTH; index++) {
    reversedBytes[index] = bytes[PUBLIC_KEY_LENGTH - 1 - index];
  }
  return reversedBytes;
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
    value >= 0n &&
      value <=
        0xffffffffffffffff_ffffffffffffffff_ffffffffffffffff_ffffffffffffffffn,
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
  return new Uint8Array(ADDRESS_CODEC.encode(value));
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
