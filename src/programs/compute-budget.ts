import {
  COMPUTE_BUDGET_PROGRAM_ADDRESS,
  getRequestHeapFrameInstruction,
  getRequestUnitsInstruction,
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction,
  identifyComputeBudgetInstruction,
  parseComputeBudgetInstruction,
  type ParsedComputeBudgetInstruction,
  ComputeBudgetInstruction as GeneratedComputeBudgetInstruction,
} from '../__generated__/program-clients/compute-budget';
import {Address} from '../address';
import {
  fromKitInstruction,
  toKitInstruction,
} from '../kit-adapters/instruction';
import {TransactionInstruction} from '../transaction';

const COMPUTE_BUDGET_PROGRAM_ID = new Address(COMPUTE_BUDGET_PROGRAM_ADDRESS);

/**
 * An enumeration of valid ComputeBudgetInstructionType's
 */
export type ComputeBudgetInstructionType =
  // FIXME
  // It would be preferable for this type to be derived from the internal instruction input map
  // but Typedoc does not transpile `keyof` expressions.
  // See https://github.com/TypeStrong/typedoc/issues/1894
  | 'RequestUnits'
  | 'RequestHeapFrame'
  | 'SetComputeUnitLimit'
  | 'SetComputeUnitPrice';

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

const GENERATED_TO_LEGACY_INSTRUCTION_TYPE = {
  [GeneratedComputeBudgetInstruction.RequestUnits]: 'RequestUnits',
  [GeneratedComputeBudgetInstruction.RequestHeapFrame]: 'RequestHeapFrame',
  [GeneratedComputeBudgetInstruction.SetComputeUnitLimit]:
    'SetComputeUnitLimit',
  [GeneratedComputeBudgetInstruction.SetComputeUnitPrice]:
    'SetComputeUnitPrice',
} as const satisfies Partial<Record<GeneratedComputeBudgetInstruction, string>>;

type ParsedAnyComputeBudgetInstruction = ParsedComputeBudgetInstruction<string>;

type ParsedInstructionOfType<
  TInstructionType extends GeneratedComputeBudgetInstruction,
> = Extract<
  ParsedAnyComputeBudgetInstruction,
  {instructionType: TInstructionType}
>;

function getInstructionType(
  instruction: TransactionInstruction,
): ComputeBudgetInstructionType {
  checkProgramId(instruction.programId);
  const generatedInstructionType = identifyComputeBudgetInstruction(
    instruction.data,
  );

  const instructionType =
    generatedInstructionType in GENERATED_TO_LEGACY_INSTRUCTION_TYPE
      ? GENERATED_TO_LEGACY_INSTRUCTION_TYPE[
          generatedInstructionType as keyof typeof GENERATED_TO_LEGACY_INSTRUCTION_TYPE
        ]
      : undefined;

  if (!instructionType) {
    throw new Error(
      'Instruction type incorrect; not a ComputeBudgetInstruction',
    );
  }

  return instructionType;
}

function parseComputeBudgetInstructionOfType<
  TInstructionType extends GeneratedComputeBudgetInstruction,
>(
  instruction: TransactionInstruction,
  expectedInstructionType: TInstructionType,
): ParsedInstructionOfType<TInstructionType> {
  checkProgramId(instruction.programId);
  const parsedInstruction = parseComputeBudgetInstruction(
    toKitInstruction(instruction),
  );
  if (parsedInstruction.instructionType !== expectedInstructionType) {
    throw new Error('invalid instruction; instruction type mismatch');
  }
  return parsedInstruction as ParsedInstructionOfType<TInstructionType>;
}

function checkProgramId(programId: Address) {
  if (!programId.equals(ComputeBudgetProgram.programId)) {
    throw new Error(
      'invalid instruction; programId is not ComputeBudgetProgram',
    );
  }
}

/**
 * Compute Budget Instruction class
 */
export class ComputeBudgetInstruction {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Decode a compute budget instruction and retrieve the instruction type.
   */
  static decodeInstructionType(
    instruction: TransactionInstruction,
  ): ComputeBudgetInstructionType {
    return getInstructionType(instruction);
  }

  /**
   * Decode request units compute budget instruction and retrieve the instruction params.
   */
  static decodeRequestUnits(
    instruction: TransactionInstruction,
  ): RequestUnitsParams {
    const parsedInstruction = parseComputeBudgetInstructionOfType(
      instruction,
      GeneratedComputeBudgetInstruction.RequestUnits,
    );

    return {
      units: parsedInstruction.data.units,
      additionalFee: parsedInstruction.data.additionalFee,
    };
  }

  /**
   * Decode request heap frame compute budget instruction and retrieve the instruction params.
   */
  static decodeRequestHeapFrame(
    instruction: TransactionInstruction,
  ): RequestHeapFrameParams {
    const parsedInstruction = parseComputeBudgetInstructionOfType(
      instruction,
      GeneratedComputeBudgetInstruction.RequestHeapFrame,
    );

    return {
      bytes: parsedInstruction.data.bytes,
    };
  }

  /**
   * Decode set compute unit limit compute budget instruction and retrieve the instruction params.
   */
  static decodeSetComputeUnitLimit(
    instruction: TransactionInstruction,
  ): SetComputeUnitLimitParams {
    const parsedInstruction = parseComputeBudgetInstructionOfType(
      instruction,
      GeneratedComputeBudgetInstruction.SetComputeUnitLimit,
    );

    return {
      units: parsedInstruction.data.units,
    };
  }

  /**
   * Decode set compute unit price compute budget instruction and retrieve the instruction params.
   */
  static decodeSetComputeUnitPrice(
    instruction: TransactionInstruction,
  ): SetComputeUnitPriceParams {
    const parsedInstruction = parseComputeBudgetInstructionOfType(
      instruction,
      GeneratedComputeBudgetInstruction.SetComputeUnitPrice,
    );

    return {
      microLamports: parsedInstruction.data.microLamports,
    };
  }
}

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
  static programId: Address = COMPUTE_BUDGET_PROGRAM_ID;

  /**
   * @deprecated Instead, call {@link setComputeUnitLimit} and/or {@link setComputeUnitPrice}
   */
  static requestUnits(params: RequestUnitsParams): TransactionInstruction {
    return fromKitInstruction(getRequestUnitsInstruction(params));
  }

  static requestHeapFrame(
    params: RequestHeapFrameParams,
  ): TransactionInstruction {
    return fromKitInstruction(getRequestHeapFrameInstruction(params));
  }

  static setComputeUnitLimit(
    params: SetComputeUnitLimitParams,
  ): TransactionInstruction {
    return fromKitInstruction(getSetComputeUnitLimitInstruction(params));
  }

  static setComputeUnitPrice(
    params: SetComputeUnitPriceParams,
  ): TransactionInstruction {
    return fromKitInstruction(getSetComputeUnitPriceInstruction(params));
  }
}
