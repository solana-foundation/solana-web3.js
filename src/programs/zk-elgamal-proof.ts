import {createNoopSigner, type ReadonlyUint8Array} from '@solana/kit';
import {
  getCloseContextStateInstruction,
  getVerifyProofInstruction,
  getVerifyProofInstructionDataDecoder,
  ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
  ZkElGamalProofInstruction as GeneratedZkElGamalProofInstruction,
} from '@solana-program/zk-elgamal-proof';

import {Address} from '../address';
import {toKitAddress} from '../kit-adapters/address';
import {fromKitInstruction} from '../kit-adapters/instruction';
import {TransactionInstruction} from '../transaction';

const ZK_ELGAMAL_PROOF_PROGRAM_ID = new Address(
  ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
);

/**
 * An enumeration of valid ZkElGamalProofInstructionType's
 */
export type ZkElGamalProofInstructionType =
  | 'CloseContextState'
  | 'VerifyZeroCiphertext'
  | 'VerifyCiphertextCiphertextEquality'
  | 'VerifyCiphertextCommitmentEquality'
  | 'VerifyPubkeyValidity'
  | 'VerifyPercentageWithCap'
  | 'VerifyBatchedRangeProofU64'
  | 'VerifyBatchedRangeProofU128'
  | 'VerifyBatchedRangeProofU256'
  | 'VerifyGroupedCiphertext2HandlesValidity'
  | 'VerifyBatchedGroupedCiphertext2HandlesValidity'
  | 'VerifyGroupedCiphertext3HandlesValidity'
  | 'VerifyBatchedGroupedCiphertext3HandlesValidity';

export type ProofDataParams =
  | {
      /** Proof bytes encoded directly in the instruction data. */
      proofData: ReadonlyUint8Array | Uint8Array;
      proofAccount?: never;
      offset?: never;
    }
  | {
      /** Account containing the proof data. */
      proofAccount: Address;
      /** Byte offset in the proof account data. Defaults to zero. */
      offset?: number;
      proofData?: never;
    };

export type ContextStateParams =
  | {
      /** Optional proof context account. */
      contextState: Address;
      /** Authority recorded in the proof context account. */
      contextStateAuthority: Address;
    }
  | {
      contextState?: never;
      contextStateAuthority?: never;
    };

export type VerifyProofParams = ProofDataParams & ContextStateParams;

export type CloseContextStateParams = {
  /** Proof context account to close. */
  contextState: Address;
  /** Destination account for reclaimed lamports. */
  destination: Address;
  /** Proof context authority. */
  authority: Address;
};

export type ZeroCiphertextProofParams = VerifyProofParams;
export type CiphertextCiphertextEqualityProofParams = VerifyProofParams;
export type CiphertextCommitmentEqualityProofParams = VerifyProofParams;
export type PubkeyValidityProofParams = VerifyProofParams;
export type PercentageWithCapProofParams = VerifyProofParams;
export type BatchedRangeProofU64Params = VerifyProofParams;
export type BatchedRangeProofU128Params = VerifyProofParams;
export type BatchedRangeProofU256Params = VerifyProofParams;
export type GroupedCiphertext2HandlesValidityProofParams = VerifyProofParams;
export type BatchedGroupedCiphertext2HandlesValidityProofParams =
  VerifyProofParams;
export type GroupedCiphertext3HandlesValidityProofParams = VerifyProofParams;
export type BatchedGroupedCiphertext3HandlesValidityProofParams =
  VerifyProofParams;

export type DecodedVerifyProofParams = {
  /** Proof bytes encoded directly in the instruction data. */
  proofData?: Uint8Array;
  /** Account containing the proof data. */
  proofAccount?: Address;
  /** Byte offset in the proof account data. */
  offset?: number;
  /** Optional proof context account. */
  contextState?: Address;
  /** Authority recorded in the proof context account. */
  contextStateAuthority?: Address;
};

const GENERATED_TO_LEGACY_INSTRUCTION_TYPE = {
  [GeneratedZkElGamalProofInstruction.CloseContextState]: 'CloseContextState',
  [GeneratedZkElGamalProofInstruction.VerifyZeroCiphertext]:
    'VerifyZeroCiphertext',
  [GeneratedZkElGamalProofInstruction.VerifyCiphertextCiphertextEquality]:
    'VerifyCiphertextCiphertextEquality',
  [GeneratedZkElGamalProofInstruction.VerifyCiphertextCommitmentEquality]:
    'VerifyCiphertextCommitmentEquality',
  [GeneratedZkElGamalProofInstruction.VerifyPubkeyValidity]:
    'VerifyPubkeyValidity',
  [GeneratedZkElGamalProofInstruction.VerifyPercentageWithCap]:
    'VerifyPercentageWithCap',
  [GeneratedZkElGamalProofInstruction.VerifyBatchedRangeProofU64]:
    'VerifyBatchedRangeProofU64',
  [GeneratedZkElGamalProofInstruction.VerifyBatchedRangeProofU128]:
    'VerifyBatchedRangeProofU128',
  [GeneratedZkElGamalProofInstruction.VerifyBatchedRangeProofU256]:
    'VerifyBatchedRangeProofU256',
  [GeneratedZkElGamalProofInstruction.VerifyGroupedCiphertext2HandlesValidity]:
    'VerifyGroupedCiphertext2HandlesValidity',
  [GeneratedZkElGamalProofInstruction.VerifyBatchedGroupedCiphertext2HandlesValidity]:
    'VerifyBatchedGroupedCiphertext2HandlesValidity',
  [GeneratedZkElGamalProofInstruction.VerifyGroupedCiphertext3HandlesValidity]:
    'VerifyGroupedCiphertext3HandlesValidity',
  [GeneratedZkElGamalProofInstruction.VerifyBatchedGroupedCiphertext3HandlesValidity]:
    'VerifyBatchedGroupedCiphertext3HandlesValidity',
} as const satisfies Record<GeneratedZkElGamalProofInstruction, string>;

function getInstructionType(
  instruction: TransactionInstruction,
): ZkElGamalProofInstructionType {
  checkProgramId(instruction.programId);
  const discriminator = instruction.data[0];
  const instructionType =
    GENERATED_TO_LEGACY_INSTRUCTION_TYPE[
      discriminator as GeneratedZkElGamalProofInstruction
    ];

  if (!instructionType) {
    throw new Error(
      'Instruction type incorrect; not a ZkElGamalProofInstruction',
    );
  }

  return instructionType;
}

function checkProgramId(programId: Address) {
  if (!programId.equals(ZkElGamalProofProgram.programId)) {
    throw new Error(
      'invalid instruction; programId is not ZkElGamalProofProgram',
    );
  }
}

function decodeVerifyProof(
  instruction: TransactionInstruction,
  expectedInstructionType: GeneratedZkElGamalProofInstruction,
): DecodedVerifyProofParams {
  checkProgramId(instruction.programId);
  const data = getVerifyProofInstructionDataDecoder().decode(instruction.data);
  if (data.discriminator !== expectedInstructionType) {
    throw new Error('invalid instruction; instruction type mismatch');
  }

  const keys = instruction.keys;
  const hasProofAccount = data.offset !== undefined;
  const proofAccountOffset = hasProofAccount ? 1 : 0;
  const contextState = keys[proofAccountOffset]?.pubkey;
  const contextStateAuthority = keys[proofAccountOffset + 1]?.pubkey;

  return {
    ...(data.proofData
      ? {proofData: Uint8Array.from(data.proofData)}
      : {
          proofAccount: keys[0] ? keys[0].pubkey : undefined,
          offset: data.offset,
        }),
    ...(contextState && contextStateAuthority
      ? {contextState, contextStateAuthority}
      : {}),
  };
}

function createVerifyProofInstruction(
  instructionType: GeneratedZkElGamalProofInstruction,
  params: VerifyProofParams,
): TransactionInstruction {
  return fromKitInstruction(
    getVerifyProofInstruction({
      discriminator: instructionType,
      ...(params.proofData
        ? {proofData: params.proofData}
        : {
            proofAccount: toKitAddress(params.proofAccount),
            offset: params.offset ?? 0,
          }),
      ...(params.contextState
        ? {contextState: toKitAddress(params.contextState)}
        : {}),
      ...(params.contextStateAuthority
        ? {contextStateAuthority: toKitAddress(params.contextStateAuthority)}
        : {}),
    }),
  );
}

/**
 * ZK ElGamal Proof Instruction class
 */
export class ZkElGamalProofInstruction {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Decode a ZK ElGamal proof instruction and retrieve the instruction type.
   */
  static decodeInstructionType(
    instruction: TransactionInstruction,
  ): ZkElGamalProofInstructionType {
    return getInstructionType(instruction);
  }

  /**
   * Decode a verify zero ciphertext instruction and retrieve the instruction params.
   */
  static decodeVerifyZeroCiphertext(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyZeroCiphertext,
    );
  }

  /**
   * Decode a verify ciphertext-ciphertext equality instruction and retrieve the instruction params.
   */
  static decodeVerifyCiphertextCiphertextEquality(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyCiphertextCiphertextEquality,
    );
  }

  /**
   * Decode a verify ciphertext-commitment equality instruction and retrieve the instruction params.
   */
  static decodeVerifyCiphertextCommitmentEquality(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyCiphertextCommitmentEquality,
    );
  }

  /**
   * Decode a verify public key validity instruction and retrieve the instruction params.
   */
  static decodeVerifyPubkeyValidity(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyPubkeyValidity,
    );
  }

  /**
   * Decode a verify percentage with cap instruction and retrieve the instruction params.
   */
  static decodeVerifyPercentageWithCap(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyPercentageWithCap,
    );
  }

  /**
   * Decode a verify 64-bit batched range proof instruction and retrieve the instruction params.
   */
  static decodeVerifyBatchedRangeProofU64(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyBatchedRangeProofU64,
    );
  }

  /**
   * Decode a verify 128-bit batched range proof instruction and retrieve the instruction params.
   */
  static decodeVerifyBatchedRangeProofU128(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyBatchedRangeProofU128,
    );
  }

  /**
   * Decode a verify 256-bit batched range proof instruction and retrieve the instruction params.
   */
  static decodeVerifyBatchedRangeProofU256(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyBatchedRangeProofU256,
    );
  }

  /**
   * Decode a verify grouped ciphertext with 2 handles validity instruction and retrieve the instruction params.
   */
  static decodeVerifyGroupedCiphertext2HandlesValidity(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyGroupedCiphertext2HandlesValidity,
    );
  }

  /**
   * Decode a verify batched grouped ciphertext with 2 handles validity instruction and retrieve the instruction params.
   */
  static decodeVerifyBatchedGroupedCiphertext2HandlesValidity(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyBatchedGroupedCiphertext2HandlesValidity,
    );
  }

  /**
   * Decode a verify grouped ciphertext with 3 handles validity instruction and retrieve the instruction params.
   */
  static decodeVerifyGroupedCiphertext3HandlesValidity(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyGroupedCiphertext3HandlesValidity,
    );
  }

  /**
   * Decode a verify batched grouped ciphertext with 3 handles validity instruction and retrieve the instruction params.
   */
  static decodeVerifyBatchedGroupedCiphertext3HandlesValidity(
    instruction: TransactionInstruction,
  ): DecodedVerifyProofParams {
    return decodeVerifyProof(
      instruction,
      GeneratedZkElGamalProofInstruction.VerifyBatchedGroupedCiphertext3HandlesValidity,
    );
  }

  /**
   * Decode a close context state instruction and retrieve the instruction params.
   */
  static decodeCloseContextState(
    instruction: TransactionInstruction,
  ): CloseContextStateParams {
    checkProgramId(instruction.programId);
    if (
      getInstructionType(instruction) !==
      GENERATED_TO_LEGACY_INSTRUCTION_TYPE[
        GeneratedZkElGamalProofInstruction.CloseContextState
      ]
    ) {
      throw new Error('invalid instruction; instruction type mismatch');
    }
    if (instruction.keys.length < 3) {
      throw new Error('Not enough accounts');
    }
    return {
      contextState: instruction.keys[0].pubkey,
      destination: instruction.keys[1].pubkey,
      authority: instruction.keys[2].pubkey,
    };
  }
}

/**
 * Factory class for transaction instructions to interact with the ZK ElGamal Proof program.
 */
export class ZkElGamalProofProgram {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the ZK ElGamal Proof program
   */
  static programId: Address = ZK_ELGAMAL_PROOF_PROGRAM_ID;

  static verifyProof(
    instructionType: Exclude<
      GeneratedZkElGamalProofInstruction,
      GeneratedZkElGamalProofInstruction.CloseContextState
    >,
    params: VerifyProofParams,
  ): TransactionInstruction {
    return createVerifyProofInstruction(instructionType, params);
  }

  static verifyZeroCiphertext(
    params: ZeroCiphertextProofParams,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyZeroCiphertext,
      params,
    );
  }

  static verifyCiphertextCiphertextEquality(
    params: CiphertextCiphertextEqualityProofParams,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyCiphertextCiphertextEquality,
      params,
    );
  }

  static verifyCiphertextCommitmentEquality(
    params: CiphertextCommitmentEqualityProofParams,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyCiphertextCommitmentEquality,
      params,
    );
  }

  static verifyPubkeyValidity(
    params: PubkeyValidityProofParams,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyPubkeyValidity,
      params,
    );
  }

  static verifyPercentageWithCap(
    params: PercentageWithCapProofParams,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyPercentageWithCap,
      params,
    );
  }

  static verifyBatchedRangeProofU64(
    params: BatchedRangeProofU64Params,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyBatchedRangeProofU64,
      params,
    );
  }

  static verifyBatchedRangeProofU128(
    params: BatchedRangeProofU128Params,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyBatchedRangeProofU128,
      params,
    );
  }

  static verifyBatchedRangeProofU256(
    params: BatchedRangeProofU256Params,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyBatchedRangeProofU256,
      params,
    );
  }

  static verifyGroupedCiphertext2HandlesValidity(
    params: GroupedCiphertext2HandlesValidityProofParams,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyGroupedCiphertext2HandlesValidity,
      params,
    );
  }

  static verifyBatchedGroupedCiphertext2HandlesValidity(
    params: BatchedGroupedCiphertext2HandlesValidityProofParams,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyBatchedGroupedCiphertext2HandlesValidity,
      params,
    );
  }

  static verifyGroupedCiphertext3HandlesValidity(
    params: GroupedCiphertext3HandlesValidityProofParams,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyGroupedCiphertext3HandlesValidity,
      params,
    );
  }

  static verifyBatchedGroupedCiphertext3HandlesValidity(
    params: BatchedGroupedCiphertext3HandlesValidityProofParams,
  ): TransactionInstruction {
    return createVerifyProofInstruction(
      GeneratedZkElGamalProofInstruction.VerifyBatchedGroupedCiphertext3HandlesValidity,
      params,
    );
  }

  static closeContextState(
    params: CloseContextStateParams,
  ): TransactionInstruction {
    return fromKitInstruction(
      getCloseContextStateInstruction({
        contextState: toKitAddress(params.contextState),
        destination: toKitAddress(params.destination),
        authority: createNoopSigner(toKitAddress(params.authority)),
      }),
    );
  }
}
