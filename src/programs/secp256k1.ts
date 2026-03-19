import {fixEncoderSize} from '@solana/codecs-core';
import {
  getBytesEncoder,
  getStructEncoder,
} from '@solana/codecs-data-structures';
import {getU16Encoder, getU8Encoder} from '@solana/codecs-numbers';
import {getBase16Encoder} from '@solana/codecs-strings';
import {keccak_256} from '@noble/hashes/sha3';

import {Address} from '../address';
import {TransactionInstruction} from '../transaction';
import assert from '../utils/assert';
import {publicKeyCreate, ecdsaSign} from '../utils/secp256k1';
import {toPackedUint8Array, toUint8ArrayView} from '../utils/typed-array';

const PRIVATE_KEY_BYTES = 32;
const ETHEREUM_ADDRESS_BYTES = 20;
const PUBLIC_KEY_BYTES = 64;
const SIGNATURE_BYTES = 64;
const SIGNATURE_OFFSETS_SERIALIZED_SIZE = 11;
const BASE16_ENCODER = getBase16Encoder();
const ETHEREUM_ADDRESS_STRING_PATTERN = /^(?:0x)?([0-9a-fA-F]{40})$/;

/**
 * Params for creating an secp256k1 instruction using a public key
 */
export type CreateSecp256k1InstructionWithPublicKeyParams = {
  publicKey: Uint8Array | Array<number>;
  message: Uint8Array | Array<number>;
  signature: Uint8Array | Array<number>;
  recoveryId: number;
  instructionIndex?: number;
};

/**
 * Params for creating an secp256k1 instruction using an Ethereum address
 */
export type CreateSecp256k1InstructionWithEthAddressParams = {
  ethAddress: Uint8Array | Array<number> | string;
  message: Uint8Array | Array<number>;
  signature: Uint8Array | Array<number>;
  recoveryId: number;
  instructionIndex?: number;
};

/**
 * Params for creating an secp256k1 instruction using a private key
 */
export type CreateSecp256k1InstructionWithPrivateKeyParams = {
  privateKey: Uint8Array | Array<number>;
  message: Uint8Array | Array<number>;
  instructionIndex?: number;
};

const SECP256K1_INSTRUCTION_DATA_ENCODER = getStructEncoder([
  ['numSignatures', getU8Encoder()],
  ['signatureOffset', getU16Encoder()],
  ['signatureInstructionIndex', getU8Encoder()],
  ['ethAddressOffset', getU16Encoder()],
  ['ethAddressInstructionIndex', getU8Encoder()],
  ['messageDataOffset', getU16Encoder()],
  ['messageDataSize', getU16Encoder()],
  ['messageInstructionIndex', getU8Encoder()],
  ['ethAddress', fixEncoderSize(getBytesEncoder(), ETHEREUM_ADDRESS_BYTES)],
  ['signature', fixEncoderSize(getBytesEncoder(), SIGNATURE_BYTES)],
  ['recoveryId', getU8Encoder()],
]);

export class Secp256k1Program {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the secp256k1 program
   */
  static programId: Address = new Address(
    'KeccakSecp256k11111111111111111111111111111',
  );

  /**
   * Construct an Ethereum address from a secp256k1 public key.
   * @param {Uint8Array | Array<number>} publicKey a 64 byte
   * secp256k1 public key
   */
  static publicKeyToEthAddress(
    publicKey: Uint8Array | Array<number>,
  ): Uint8Array {
    const publicKeyBytes = toPackedUint8Array(publicKey);

    assert(
      publicKeyBytes.length === PUBLIC_KEY_BYTES,
      `Public key must be ${PUBLIC_KEY_BYTES} bytes but received ${publicKeyBytes.length} bytes`,
    );

    try {
      return keccak_256(publicKeyBytes).slice(-ETHEREUM_ADDRESS_BYTES);
    } catch (error) {
      throw new Error(`Error constructing Ethereum address: ${error}`);
    }
  }

  /**
   * Create an secp256k1 instruction with a public key. The public key
   * must be 64 bytes long.
   */
  static createInstructionWithPublicKey(
    params: CreateSecp256k1InstructionWithPublicKeyParams,
  ): TransactionInstruction {
    const {publicKey, message, signature, recoveryId, instructionIndex} =
      params;
    return Secp256k1Program.createInstructionWithEthAddress({
      ethAddress: Secp256k1Program.publicKeyToEthAddress(publicKey),
      message,
      signature,
      recoveryId,
      instructionIndex,
    });
  }

  /**
   * Create an secp256k1 instruction with an Ethereum address. The address
   * must be a hex string or 20 raw bytes.
   */
  static createInstructionWithEthAddress(
    params: CreateSecp256k1InstructionWithEthAddressParams,
  ): TransactionInstruction {
    const {
      ethAddress: rawAddress,
      message,
      signature,
      recoveryId,
      instructionIndex = 0,
    } = params;

    const messageBytes = toUint8ArrayView(message);
    const signatureBytes = toUint8ArrayView(signature);

    let ethAddressBytes: Uint8Array;
    if (typeof rawAddress === 'string') {
      const addressMatch = ETHEREUM_ADDRESS_STRING_PATTERN.exec(rawAddress);
      assert(
        addressMatch,
        `Address must be a ${ETHEREUM_ADDRESS_BYTES * 2}-character hex string with an optional 0x prefix`,
      );
      ethAddressBytes = new Uint8Array(BASE16_ENCODER.encode(addressMatch[1]));
    } else {
      ethAddressBytes = toUint8ArrayView(rawAddress);
    }

    assert(
      ethAddressBytes.length === ETHEREUM_ADDRESS_BYTES,
      `Address must be ${ETHEREUM_ADDRESS_BYTES} bytes but received ${ethAddressBytes.length} bytes`,
    );
    assert(
      signatureBytes.length === SIGNATURE_BYTES,
      `Signature must be ${SIGNATURE_BYTES} bytes but received ${signatureBytes.length} bytes`,
    );

    const dataStart = 1 + SIGNATURE_OFFSETS_SERIALIZED_SIZE;
    const ethAddressOffset = dataStart;
    const signatureOffset = dataStart + ethAddressBytes.length;
    const messageDataOffset = signatureOffset + SIGNATURE_BYTES + 1;
    const numSignatures = 1;

    const instructionData = new Uint8Array(
      SECP256K1_INSTRUCTION_DATA_ENCODER.fixedSize + messageBytes.length,
    );

    SECP256K1_INSTRUCTION_DATA_ENCODER.write(
      {
        numSignatures,
        signatureOffset,
        signatureInstructionIndex: instructionIndex,
        ethAddressOffset,
        ethAddressInstructionIndex: instructionIndex,
        messageDataOffset,
        messageDataSize: messageBytes.length,
        messageInstructionIndex: instructionIndex,
        signature: signatureBytes,
        ethAddress: ethAddressBytes,
        recoveryId,
      },
      instructionData,
      0,
    );

    instructionData.set(
      messageBytes,
      SECP256K1_INSTRUCTION_DATA_ENCODER.fixedSize,
    );

    return new TransactionInstruction({
      keys: [],
      programId: Secp256k1Program.programId,
      data: instructionData,
    });
  }

  /**
   * Create an secp256k1 instruction with a private key. The private key
   * must be 32 bytes long.
   */
  static createInstructionWithPrivateKey(
    params: CreateSecp256k1InstructionWithPrivateKeyParams,
  ): TransactionInstruction {
    const {privateKey: pkey, message, instructionIndex} = params;
    const privateKey = toPackedUint8Array(pkey);
    const messageBytes = toPackedUint8Array(message);

    assert(
      privateKey.length === PRIVATE_KEY_BYTES,
      `Private key must be ${PRIVATE_KEY_BYTES} bytes but received ${privateKey.length} bytes`,
    );

    try {
      const publicKey = publicKeyCreate(
        privateKey,
        false /* isCompressed */,
      ).slice(1); // throw away leading byte
      const messageHash = keccak_256(messageBytes);
      const [signature, recoveryId] = ecdsaSign(messageHash, privateKey);

      return this.createInstructionWithPublicKey({
        publicKey,
        message: messageBytes,
        signature,
        recoveryId,
        instructionIndex,
      });
    } catch (error) {
      throw new Error(`Error creating instruction; ${error}`);
    }
  }
}
