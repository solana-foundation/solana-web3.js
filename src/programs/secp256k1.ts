import {fixEncoderSize} from '@solana/codecs-core';
import {
  getBytesEncoder,
  getStructEncoder,
} from '@solana/codecs-data-structures';
import {getU16Encoder, getU8Encoder} from '@solana/codecs-numbers';
import {Buffer} from 'buffer';
import {keccak_256} from '@noble/hashes/sha3';

import {Address} from '../address';
import {TransactionInstruction} from '../transaction';
import assert from '../utils/assert';
import {publicKeyCreate, ecdsaSign} from '../utils/secp256k1';
import {toBuffer} from '../utils/to-buffer';

const PRIVATE_KEY_BYTES = 32;
const ETHEREUM_ADDRESS_BYTES = 20;
const PUBLIC_KEY_BYTES = 64;
const SIGNATURE_BYTES = 64;
const SIGNATURE_OFFSETS_SERIALIZED_SIZE = 11;

/**
 * Params for creating an secp256k1 instruction using a public key
 */
export type CreateSecp256k1InstructionWithPublicKeyParams = {
  publicKey: Buffer | Uint8Array | Array<number>;
  message: Buffer | Uint8Array | Array<number>;
  signature: Buffer | Uint8Array | Array<number>;
  recoveryId: number;
  instructionIndex?: number;
};

/**
 * Params for creating an secp256k1 instruction using an Ethereum address
 */
export type CreateSecp256k1InstructionWithEthAddressParams = {
  ethAddress: Buffer | Uint8Array | Array<number> | string;
  message: Buffer | Uint8Array | Array<number>;
  signature: Buffer | Uint8Array | Array<number>;
  recoveryId: number;
  instructionIndex?: number;
};

/**
 * Params for creating an secp256k1 instruction using a private key
 */
export type CreateSecp256k1InstructionWithPrivateKeyParams = {
  privateKey: Buffer | Uint8Array | Array<number>;
  message: Buffer | Uint8Array | Array<number>;
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
   * @param {Buffer | Uint8Array | Array<number>} publicKey a 64 byte
   * secp256k1 public key
   */
  static publicKeyToEthAddress(
    publicKey: Buffer | Uint8Array | Array<number>,
  ): Buffer {
    assert(
      publicKey.length === PUBLIC_KEY_BYTES,
      `Public key must be ${PUBLIC_KEY_BYTES} bytes but received ${publicKey.length} bytes`,
    );

    try {
      return Buffer.from(keccak_256(toBuffer(publicKey))).slice(
        -ETHEREUM_ADDRESS_BYTES,
      );
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

    let ethAddress;
    if (typeof rawAddress === 'string') {
      if (rawAddress.startsWith('0x')) {
        ethAddress = Buffer.from(rawAddress.substr(2), 'hex');
      } else {
        ethAddress = Buffer.from(rawAddress, 'hex');
      }
    } else {
      ethAddress = rawAddress;
    }

    assert(
      ethAddress.length === ETHEREUM_ADDRESS_BYTES,
      `Address must be ${ETHEREUM_ADDRESS_BYTES} bytes but received ${ethAddress.length} bytes`,
    );
    assert(
      signature.length === SIGNATURE_BYTES,
      `Signature must be ${SIGNATURE_BYTES} bytes but received ${signature.length} bytes`,
    );

    const dataStart = 1 + SIGNATURE_OFFSETS_SERIALIZED_SIZE;
    const ethAddressOffset = dataStart;
    const signatureOffset = dataStart + ethAddress.length;
    const messageDataOffset = signatureOffset + SIGNATURE_BYTES + 1;
    const numSignatures = 1;

    const instructionData = Buffer.alloc(
      SECP256K1_INSTRUCTION_DATA_ENCODER.fixedSize + message.length,
    );

    SECP256K1_INSTRUCTION_DATA_ENCODER.write(
      {
        numSignatures,
        signatureOffset,
        signatureInstructionIndex: instructionIndex,
        ethAddressOffset,
        ethAddressInstructionIndex: instructionIndex,
        messageDataOffset,
        messageDataSize: message.length,
        messageInstructionIndex: instructionIndex,
        signature: toBuffer(signature),
        ethAddress: toBuffer(ethAddress),
        recoveryId,
      },
      instructionData,
      0,
    );

    instructionData.fill(
      toBuffer(message),
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

    assert(
      pkey.length === PRIVATE_KEY_BYTES,
      `Private key must be ${PRIVATE_KEY_BYTES} bytes but received ${pkey.length} bytes`,
    );

    try {
      const privateKey = toBuffer(pkey);
      const publicKey = publicKeyCreate(
        privateKey,
        false /* isCompressed */,
      ).slice(1); // throw away leading byte
      const messageHash = Buffer.from(keccak_256(toBuffer(message)));
      const [signature, recoveryId] = ecdsaSign(messageHash, privateKey);

      return this.createInstructionWithPublicKey({
        publicKey,
        message,
        signature,
        recoveryId,
        instructionIndex,
      });
    } catch (error) {
      throw new Error(`Error creating instruction; ${error}`);
    }
  }
}
