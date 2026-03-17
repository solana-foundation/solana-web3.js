import * as BufferLayout from '@solana/buffer-layout';

import type {FixedSizeCodec} from '@solana/codecs-core';
import {getStructCodec} from '@solana/codecs-data-structures';
import {getU32Codec, getU64Codec, getU8Codec} from '@solana/codecs-numbers';

import {
  IInstructionInputData,
  InstructionType,
  ProgramInstructions,
} from '../instruction';
import {PublicKey} from '../publickey';
import {TransactionInstruction} from '../transaction';
import {u64} from '../utils/bigint';

const COMPUTE_BUDGET_PROGRAM_ID = new PublicKey(
  'ComputeBudget111111111111111111111111111111',
);

const U8_CODEC: FixedSizeCodec<number> = getU8Codec();
const U32_CODEC: FixedSizeCodec<number> = getU32Codec();
const U64_CODEC = getU64Codec();

/**
 * An enumeration of valid ComputeBudgetInstructionType's
 */
export type ComputeBudgetInstructionType =
  // FIXME
  // It would be preferable for this type to be `keyof ComputeBudgetInstructionInputData`
  // but Typedoc does not transpile `keyof` expressions.
  // See https://github.com/TypeStrong/typedoc/issues/1894
  | 'RequestUnits'
  | 'RequestHeapFrame'
  | 'SetComputeUnitLimit'
  | 'SetComputeUnitPrice';

type ComputeBudgetInstructionInputData = {
  RequestUnits: IInstructionInputData & Readonly<RequestUnitsParams>;
  RequestHeapFrame: IInstructionInputData & Readonly<RequestHeapFrameParams>;
  SetComputeUnitLimit: IInstructionInputData &
    Readonly<SetComputeUnitLimitParams>;
  SetComputeUnitPrice: IInstructionInputData &
    Readonly<SetComputeUnitPriceParams>;
};

/**
 * Request units instruction params
 */
export interface RequestUnitsParams {
  /** Units to request for transaction-wide compute */
  units: number;
  /** Prioritization fee lamports */
  additionalFee: number;
}

/**
 * Request heap frame instruction params
 */
export type RequestHeapFrameParams = {
  /** Requested transaction-wide program heap size in bytes. Must be multiple of 1024. Applies to each program, including CPIs. */
  bytes: number;
};

/**
 * Set compute unit limit instruction params
 */
export interface SetComputeUnitLimitParams {
  /** Transaction-wide compute unit limit */
  units: number;
}

/**
 * Set compute unit price instruction params
 */
export interface SetComputeUnitPriceParams {
  /** Transaction compute unit price used for prioritization fees */
  microLamports: number | bigint;
}

const INSTRUCTION_DEFS = {
  RequestUnits: {
    index: 0,
    codec: getStructCodec([
      ['instruction', U8_CODEC],
      ['units', U32_CODEC],
      ['additionalFee', U32_CODEC],
    ]),
  },
  RequestHeapFrame: {
    index: 1,
    codec: getStructCodec([
      ['instruction', U8_CODEC],
      ['bytes', U32_CODEC],
    ]),
  },
  SetComputeUnitLimit: {
    index: 2,
    codec: getStructCodec([
      ['instruction', U8_CODEC],
      ['units', U32_CODEC],
    ]),
  },
  SetComputeUnitPrice: {
    index: 3,
    codec: getStructCodec([
      ['instruction', U8_CODEC],
      ['microLamports', U64_CODEC],
    ]),
  },
};

/**
 * @internal
 */
export const COMPUTE_BUDGET_INSTRUCTIONS = ProgramInstructions.create({
  programId: COMPUTE_BUDGET_PROGRAM_ID,
  instructionIndexCodec: U8_CODEC,
  instructions: INSTRUCTION_DEFS,
});
const INSTRUCTIONS = COMPUTE_BUDGET_INSTRUCTIONS;

/**
 * An enumeration of valid ComputeBudget InstructionType's
 * @deprecated Use compute budget instruction codecs instead. To be removed in v3
 * @internal
 */
export const COMPUTE_BUDGET_INSTRUCTION_LAYOUTS = Object.freeze<{
  [Instruction in ComputeBudgetInstructionType]: InstructionType<
    ComputeBudgetInstructionInputData[Instruction]
  >;
}>({
  RequestUnits: {
    index: 0,
    layout: BufferLayout.struct<
      ComputeBudgetInstructionInputData['RequestUnits']
    >([
      BufferLayout.u8('instruction'),
      BufferLayout.u32('units'),
      BufferLayout.u32('additionalFee'),
    ]),
  },
  RequestHeapFrame: {
    index: 1,
    layout: BufferLayout.struct<
      ComputeBudgetInstructionInputData['RequestHeapFrame']
    >([BufferLayout.u8('instruction'), BufferLayout.u32('bytes')]),
  },
  SetComputeUnitLimit: {
    index: 2,
    layout: BufferLayout.struct<
      ComputeBudgetInstructionInputData['SetComputeUnitLimit']
    >([BufferLayout.u8('instruction'), BufferLayout.u32('units')]),
  },
  SetComputeUnitPrice: {
    index: 3,
    layout: BufferLayout.struct<
      ComputeBudgetInstructionInputData['SetComputeUnitPrice']
    >([BufferLayout.u8('instruction'), u64('microLamports')]),
  },
});

/**
 * Factory class for transaction instructions to interact with the Compute Budget program
 */
export class ComputeBudgetProgram {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the Compute Budget program
   */
  static programId: PublicKey = COMPUTE_BUDGET_PROGRAM_ID;

  /**
   * @deprecated Instead, call {@link setComputeUnitLimit} and/or {@link setComputeUnitPrice}
   */
  static requestUnits(params: RequestUnitsParams): TransactionInstruction {
    return INSTRUCTIONS.RequestUnits.build(params);
  }

  static requestHeapFrame(
    params: RequestHeapFrameParams,
  ): TransactionInstruction {
    return INSTRUCTIONS.RequestHeapFrame.build(params);
  }

  static setComputeUnitLimit(
    params: SetComputeUnitLimitParams,
  ): TransactionInstruction {
    return INSTRUCTIONS.SetComputeUnitLimit.build(params);
  }

  static setComputeUnitPrice(
    params: SetComputeUnitPriceParams,
  ): TransactionInstruction {
    return INSTRUCTIONS.SetComputeUnitPrice.build(params);
  }
}
