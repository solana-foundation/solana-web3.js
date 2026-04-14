import {fixCodecSize, transformCodec} from '@solana/codecs-core';
import {
  getArrayCodec,
  getBytesCodec,
  getStructCodec,
} from '@solana/codecs-data-structures';
import {
  getU64Codec,
  getU64Encoder,
  getU32Codec,
  getU8Codec,
} from '@solana/codecs-numbers';

import {Address} from '../../address';
import {SystemProgram} from '../system';
import {TransactionInstruction} from '../../transaction';
import {IInstructionInputData, ProgramInstructions} from '../../instruction';

export * from './state';

export type CreateLookupTableParams = {
  /** Account used to derive and control the new address lookup table. */
  authority: Address;
  /** Account that will fund the new address lookup table. */
  payer: Address;
  /** A recent slot must be used in the derivation path for each initialized table. */
  recentSlot: bigint | number;
};

export type FreezeLookupTableParams = {
  /** Address lookup table account to freeze. */
  lookupTable: Address;
  /** Account which is the current authority. */
  authority: Address;
};

export type ExtendLookupTableParams = {
  /** Address lookup table account to extend. */
  lookupTable: Address;
  /** Account which is the current authority. */
  authority: Address;
  /** Account that will fund the table reallocation.
   * Not required if the reallocation has already been funded. */
  payer?: Address;
  /** List of Public Keys to be added to the lookup table. */
  addresses: Array<Address>;
};

export type DeactivateLookupTableParams = {
  /** Address lookup table account to deactivate. */
  lookupTable: Address;
  /** Account which is the current authority. */
  authority: Address;
};

export type CloseLookupTableParams = {
  /** Address lookup table account to close. */
  lookupTable: Address;
  /** Account which is the current authority. */
  authority: Address;
  /** Recipient of closed account lamports. */
  recipient: Address;
};

/**
 * An enumeration of valid LookupTableInstructionType's
 */
export type LookupTableInstructionType =
  | 'CreateLookupTable'
  | 'ExtendLookupTable'
  | 'CloseLookupTable'
  | 'FreezeLookupTable'
  | 'DeactivateLookupTable';

type LookupTableInstructionInputData = {
  CreateLookupTable: IInstructionInputData &
    Readonly<{
      recentSlot: bigint;
      bumpSeed: number;
    }>;
  FreezeLookupTable: IInstructionInputData;
  ExtendLookupTable: IInstructionInputData &
    Readonly<{
      numberOfAddresses: bigint;
      addresses: Array<Uint8Array>;
    }>;
  DeactivateLookupTable: IInstructionInputData;
  CloseLookupTable: IInstructionInputData;
};

const ADDRESS_LOOKUP_TABLE_PROGRAM_ID = new Address(
  'AddressLookupTab1e1111111111111111111111111',
);

const U8_CODEC = getU8Codec();
const U32_CODEC = getU32Codec();
const U64_CODEC = getU64Codec();
const PUBLIC_KEY_BYTES_CODEC = fixCodecSize(getBytesCodec(), 32);
const PUBLIC_KEY_CODEC = transformCodec(
  PUBLIC_KEY_BYTES_CODEC,
  (value: Address) => value.toBytes(),
  bytes => new Address(bytes),
);
const PUBLIC_KEY_ARRAY_CODEC = getArrayCodec(PUBLIC_KEY_CODEC, {
  size: U64_CODEC,
});

const INSTRUCTION_DEFS = {
  CreateLookupTable: {
    index: 0,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['recentSlot', U64_CODEC],
      ['bumpSeed', U8_CODEC],
    ]),
  },
  FreezeLookupTable: {
    index: 1,
    codec: getStructCodec([['instruction', U32_CODEC]]),
  },
  ExtendLookupTable: {
    index: 2,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['addresses', PUBLIC_KEY_ARRAY_CODEC],
    ]),
  },
  DeactivateLookupTable: {
    index: 3,
    codec: getStructCodec([['instruction', U32_CODEC]]),
  },
  CloseLookupTable: {
    index: 4,
    codec: getStructCodec([['instruction', U32_CODEC]]),
  },
};

/**
 * @internal
 */
export const LOOKUP_TABLE_INSTRUCTIONS = ProgramInstructions.create({
  programId: ADDRESS_LOOKUP_TABLE_PROGRAM_ID,
  instructionIndexCodec: U32_CODEC,
  instructions: INSTRUCTION_DEFS,
});
const INSTRUCTIONS = LOOKUP_TABLE_INSTRUCTIONS;

export class AddressLookupTableInstruction {
  /**
   * @internal
   */
  constructor() {}

  static decodeInstructionType(
    instruction: TransactionInstruction,
  ): LookupTableInstructionType {
    this.checkProgramId(instruction.programId);
    return INSTRUCTIONS.getInstructionType(
      instruction,
    ) as LookupTableInstructionType;
  }

  static decodeCreateLookupTable(
    instruction: TransactionInstruction,
  ): CreateLookupTableParams {
    this.checkProgramId(instruction.programId);
    this.checkKeysLength(instruction.keys, 4);

    const {recentSlot} = INSTRUCTIONS.CreateLookupTable.decode(instruction);

    return {
      authority: instruction.keys[1].pubkey,
      payer: instruction.keys[2].pubkey,
      recentSlot: Number(recentSlot),
    };
  }

  static decodeExtendLookupTable(
    instruction: TransactionInstruction,
  ): ExtendLookupTableParams {
    this.checkProgramId(instruction.programId);
    if (instruction.keys.length < 2) {
      throw new Error(
        `invalid instruction; found ${instruction.keys.length} keys, expected at least 2`,
      );
    }

    const {addresses} = INSTRUCTIONS.ExtendLookupTable.decode(instruction);
    return {
      lookupTable: instruction.keys[0].pubkey,
      authority: instruction.keys[1].pubkey,
      payer:
        instruction.keys.length > 2 ? instruction.keys[2].pubkey : undefined,
      addresses,
    };
  }

  static decodeCloseLookupTable(
    instruction: TransactionInstruction,
  ): CloseLookupTableParams {
    this.checkProgramId(instruction.programId);
    this.checkKeysLength(instruction.keys, 3);

    return {
      lookupTable: instruction.keys[0].pubkey,
      authority: instruction.keys[1].pubkey,
      recipient: instruction.keys[2].pubkey,
    };
  }

  static decodeFreezeLookupTable(
    instruction: TransactionInstruction,
  ): FreezeLookupTableParams {
    this.checkProgramId(instruction.programId);
    this.checkKeysLength(instruction.keys, 2);

    return {
      lookupTable: instruction.keys[0].pubkey,
      authority: instruction.keys[1].pubkey,
    };
  }

  static decodeDeactivateLookupTable(
    instruction: TransactionInstruction,
  ): DeactivateLookupTableParams {
    this.checkProgramId(instruction.programId);
    this.checkKeysLength(instruction.keys, 2);

    return {
      lookupTable: instruction.keys[0].pubkey,
      authority: instruction.keys[1].pubkey,
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId: Address) {
    if (!programId.equals(AddressLookupTableProgram.programId)) {
      throw new Error(
        'invalid instruction; programId is not AddressLookupTable Program',
      );
    }
  }
  /**
   * @internal
   */
  static checkKeysLength(keys: Array<any>, expectedLength: number) {
    if (keys.length < expectedLength) {
      throw new Error(
        `invalid instruction; found ${keys.length} keys, expected at least ${expectedLength}`,
      );
    }
  }
}

export class AddressLookupTableProgram {
  /**
   * @internal
   */
  constructor() {}

  static programId: Address = ADDRESS_LOOKUP_TABLE_PROGRAM_ID;

  static createLookupTable(params: CreateLookupTableParams) {
    const [lookupTableAddress, bumpSeed] = Address.findProgramAddressSync(
      [
        params.authority.toBytes(),
        getU64Encoder().encode(params.recentSlot) as Uint8Array,
      ],
      this.programId,
    );

    const keys = [
      {
        pubkey: lookupTableAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: params.authority,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: params.payer,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ];

    const instruction = INSTRUCTIONS.CreateLookupTable.build(
      {
        recentSlot: BigInt(params.recentSlot),
        bumpSeed: bumpSeed,
      },
      {keys},
    );

    return [instruction, lookupTableAddress] as [
      TransactionInstruction,
      Address,
    ];
  }

  static freezeLookupTable(params: FreezeLookupTableParams) {
    const keys = [
      {
        pubkey: params.lookupTable,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: params.authority,
        isSigner: true,
        isWritable: false,
      },
    ];

    return INSTRUCTIONS.FreezeLookupTable.build(params, {keys});
  }

  static extendLookupTable(params: ExtendLookupTableParams) {
    const keys = [
      {
        pubkey: params.lookupTable,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: params.authority,
        isSigner: true,
        isWritable: false,
      },
    ];

    if (params.payer) {
      keys.push(
        {
          pubkey: params.payer,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      );
    }

    return INSTRUCTIONS.ExtendLookupTable.build(params, {keys});
  }

  static deactivateLookupTable(params: DeactivateLookupTableParams) {
    const keys = [
      {
        pubkey: params.lookupTable,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: params.authority,
        isSigner: true,
        isWritable: false,
      },
    ];

    return INSTRUCTIONS.DeactivateLookupTable.build(params, {keys});
  }

  static closeLookupTable(params: CloseLookupTableParams) {
    const keys = [
      {
        pubkey: params.lookupTable,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: params.authority,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: params.recipient,
        isSigner: false,
        isWritable: true,
      },
    ];

    return INSTRUCTIONS.CloseLookupTable.build(params, {keys});
  }
}
