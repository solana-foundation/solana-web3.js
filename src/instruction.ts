import type {
  Codec,
  FixedSizeCodec,
  ReadonlyUint8Array,
} from '@solana/codecs-core';
import type {
  AccountMeta,
  TransactionInstructionCtorFields,
} from './transaction';
import {TransactionInstruction} from './transaction';
import type {Address} from './address';
import {toUint8ArrayView} from './utils/typed-array';

export interface IInstructionInputData {
  readonly instruction: number;
}

/**
 * Program instruction definition.
 * @internal
 */
type InstructionCodecInput<TCodec> =
  TCodec extends Codec<infer TFrom, infer _TTo> ? TFrom : never;

type InstructionCodecOutput<TCodec> =
  TCodec extends Codec<infer _TFrom, infer TTo> ? TTo : never;

type StripInstruction<T> =
  T extends {instruction: unknown} ? Omit<T, 'instruction'> : T;

type InstructionParams<TCodec> = StripInstruction<
  InstructionCodecInput<TCodec>
>;

type InstructionDecoded<TCodec> = StripInstruction<
  InstructionCodecOutput<TCodec>
>;

type BuildInstruction<TParams> = [keyof TParams] extends [never]
  ? (
      params?: TParams,
      options?: Partial<TransactionInstructionCtorFields>,
    ) => TransactionInstruction
  : (
      params: TParams,
      options?: Partial<TransactionInstructionCtorFields>,
    ) => TransactionInstruction;

type ProgramInstructionDefinition<
  TCodec extends Codec<any, any> = Codec<any, any>,
> = Readonly<{
  index: number;
  codec: TCodec;
  accounts?: (params: InstructionParams<TCodec>) => Array<AccountMeta>;
}>;

type ProgramInstructionEntry<
  TParams = Record<string, unknown>,
  TDecoded = Record<string, unknown>,
> = Readonly<{
  /**
   * Encode instruction params into data bytes (prepends the instruction index).
   */
  encode: (data?: TParams) => Uint8Array;
  /**
   * Decode instruction params from data bytes or a `TransactionInstruction`.
   * Returns an empty object for parameterless instructions.
   */
  decode: (
    data: ReadonlyUint8Array | Uint8Array | TransactionInstruction,
  ) => TDecoded;
  /**
   * Build a `TransactionInstruction` for this program instruction.
   *
   * Options override the defaults for `programId`, `keys`, and `data`.
   */
  build: BuildInstruction<TParams>;
}>;

type ProgramInstructionEntries = Readonly<
  Record<string, ProgramInstructionEntry>
>;

type ProgramInstructionEntriesFor<
  TInstructions extends {
    [K in keyof TInstructions]: ProgramInstructionDefinition;
  },
> = {
  [K in keyof TInstructions]: ProgramInstructionEntry<
    InstructionParams<TInstructions[K]['codec']>,
    InstructionDecoded<TInstructions[K]['codec']>
  >;
};

type ProgramInstructionsTyped<
  TInstructions extends {
    [K in keyof TInstructions]: ProgramInstructionDefinition;
  },
> = ProgramInstructions &
  ProgramInstructionEntriesFor<TInstructions> & {
    instructions: ProgramInstructionEntriesFor<TInstructions>;
    getInstructionType: (
      data: ReadonlyUint8Array | Uint8Array | TransactionInstruction,
    ) => keyof ProgramInstructionEntriesFor<TInstructions>;
  };

const assertInstructionIndex = (
  data: Record<string, unknown>,
  index: number,
) => {
  const instructionIndex = (data as unknown as IInstructionInputData)
    .instruction;
  if (instructionIndex !== index) {
    throw new Error(
      `invalid instruction; instruction index mismatch ${instructionIndex} != ${index}`,
    );
  }
};

/**
 * Factory class for building program instruction data codec and transaction builder
 * @experimental target for stabilization in v3
 */
export class ProgramInstructions {
  readonly programId: Address;
  readonly instructions: ProgramInstructionEntries;
  private readonly instructionIndexCodec: FixedSizeCodec<number>;
  private readonly byIndex: Map<number, string>;

  static create<
    const TInstructions extends {
      [K in keyof TInstructions]: ProgramInstructionDefinition;
    },
  >(
    config: Readonly<{
      programId: Address;
      instructionIndexCodec: FixedSizeCodec<number>;
      instructions: TInstructions;
    }>,
  ): ProgramInstructionsTyped<TInstructions> {
    return new ProgramInstructions(
      config,
    ) as ProgramInstructionsTyped<TInstructions>;
  }

  constructor(
    config: Readonly<{
      programId: Address;
      instructionIndexCodec: FixedSizeCodec<number>;
      instructions: Record<string, ProgramInstructionDefinition>;
    }>,
  ) {
    this.programId = config.programId;
    this.instructionIndexCodec = config.instructionIndexCodec;

    const {entries, byIndex} = buildProgramInstructionEntries({
      programId: config.programId,
      instructions: config.instructions,
    });

    this.byIndex = byIndex;

    // Make instructions available as both a property and under `instructions`
    this.instructions = entries;
    Object.assign(this, entries);

    Object.freeze(this);
  }

  getInstructionType(
    data: ReadonlyUint8Array | Uint8Array | TransactionInstruction,
  ): string {
    const bytes = data instanceof TransactionInstruction ? data.data : data;
    const index = this.instructionIndexCodec.decode(bytes);
    const type = this.byIndex.get(index);
    if (!type) {
      throw new Error(
        `invalid instruction; unknown instruction index ${index}`,
      );
    }
    return type;
  }
}

function encodeProgramInstructionData<
  TCodec extends Codec<any, any>,
>(
  definition: ProgramInstructionDefinition<TCodec>,
  params?: InstructionParams<TCodec>,
): Uint8Array {
  const data: InstructionCodecInput<TCodec> = {
    instruction: definition.index,
    ...(params ?? {}),
  } as InstructionCodecInput<TCodec>;

  return toUint8ArrayView(definition.codec.encode(data));
}

function buildProgramInstructionEntries(
  config: Readonly<{
    programId: Address;
    instructions: Record<string, ProgramInstructionDefinition>;
  }>,
): Readonly<{
  entries: ProgramInstructionEntries;
  byIndex: Map<number, string>;
}> {
  const byIndex = new Map<number, string>();
  const entries: Record<string, ProgramInstructionEntry> = {};

  for (const [instructionName, definition] of Object.entries(
    config.instructions,
  )) {
    if (byIndex.has(definition.index)) {
      throw new Error(`Duplicate instruction index ${definition.index}`);
    }
    byIndex.set(definition.index, instructionName);

    const encode = (params?: Record<string, unknown>) => {
      return encodeProgramInstructionData(definition, params);
    };

    const decode = (
      data: ReadonlyUint8Array | Uint8Array | TransactionInstruction,
    ) => {
      const bytes = data instanceof TransactionInstruction ? data.data : data;
      let decoded: Record<string, unknown>;
      try {
        decoded = definition.codec.decode(bytes) as Record<string, unknown>;
      } catch (err) {
        throw new Error('invalid instruction; ' + err);
      }
      assertInstructionIndex(decoded, definition.index);
      const {instruction: _instruction, ...rest} = decoded;
      return rest;
    };

    const build = (
      params?: Record<string, unknown>,
      options: Partial<TransactionInstructionCtorFields> = {},
    ): TransactionInstruction => {
      const data =
        options.data ?? encodeProgramInstructionData(definition, params);

      return new TransactionInstruction({
        programId: options.programId ?? config.programId,
        keys:
          options.keys ??
          (definition.accounts ? definition.accounts(params ?? {}) : []),
        data,
      });
    };

    entries[instructionName] = Object.freeze({
      encode,
      decode,
      build,
    });
  }

  return {
    entries: Object.freeze(entries),
    byIndex,
  };
}
