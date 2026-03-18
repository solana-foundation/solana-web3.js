import {Buffer} from 'buffer';
import type {Layout as BufferLayout} from '@solana/buffer-layout';
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

import {getAlloc} from './layout';

export interface IInstructionInputData {
  readonly instruction: number;
}

/**
 * @internal
 * @deprecated Use ProgramInstructions instead. Target for removal in v3.
 */
export type InstructionType<TInputData extends IInstructionInputData> = {
  /** The Instruction index (from solana upstream program) */
  index: number;
  /** The BufferLayout to use to build data */
  layout: BufferLayout<TInputData>;
};

/**
 * Populate a buffer of instruction data using an InstructionType
 * @internal
 * @deprecated Use ProgramInstructions instead. Target for removal in v3.
 */
export function encodeData<TInputData extends IInstructionInputData>(
  type: InstructionType<TInputData>,
  fields?: any,
): Buffer {
  const space =
    type.layout.span >= 0 ? type.layout.span : getAlloc(type, fields);
  const data = Buffer.alloc(space);
  const layoutFields = Object.assign({instruction: type.index}, fields);

  type.layout.encode(layoutFields, data);

  return data;
}

/**
 * Decode instruction data buffer using an InstructionType
 * @internal
 * @deprecated Use decode in ProgramInstructions instead. Target for removal in v3.
 */
export function decodeData<TInputData extends IInstructionInputData>(
  type: InstructionType<TInputData>,
  buffer: Buffer | Uint8Array,
): TInputData {
  let data: TInputData;
  try {
    data = type.layout.decode(buffer);
  } catch (err) {
    throw new Error('invalid instruction; ' + err);
  }

  if (data.instruction !== type.index) {
    throw new Error(
      `invalid instruction; instruction index mismatch ${data.instruction} != ${type.index}`,
    );
  }

  return data;
}

/**
 * Program instruction definition.
 * @internal
 */
type InstructionCodecInput<TCodec> =
  TCodec extends Codec<infer TFrom, any> ? TFrom : never;

type InstructionCodecOutput<TCodec> =
  TCodec extends Codec<any, infer TTo> ? TTo : never;

type StripInstruction<T> =
  T extends Record<string, unknown> ? Omit<T, 'instruction'> : T;

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
  encode: (data?: TParams) => Buffer;
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
      const data = {
        instruction: definition.index,
        ...((params ?? {}) as Record<string, unknown>),
      };
      return Buffer.from(definition.codec.encode(data as any));
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
      return rest as Record<string, unknown>;
    };

    const build = (
      params: any,
      options: Partial<TransactionInstructionCtorFields> = {},
    ): TransactionInstruction => {
      const data =
        options.data ?? encode(params as Record<string, unknown> | undefined);

      return new TransactionInstruction({
        programId: options.programId ?? config.programId,
        keys:
          options.keys ??
          (definition.accounts ? definition.accounts(params) : []),
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
