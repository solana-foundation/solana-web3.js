import {createNoopSigner, getU64Encoder} from '@solana/kit';
import {
  ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS,
  AddressLookupTableInstruction as GeneratedAddressLookupTableInstruction,
  getCloseLookupTableInstruction,
  getCreateLookupTableInstruction,
  getDeactivateLookupTableInstruction,
  getExtendLookupTableInstruction,
  getExtendLookupTableInstructionDataDecoder,
  getExtendLookupTableInstructionDataEncoder,
  getFreezeLookupTableInstruction,
  identifyAddressLookupTableInstruction,
  parseAddressLookupTableInstruction,
  type ParsedAddressLookupTableInstruction,
} from '@solana-program/address-lookup-table';

import {PublicKey} from '../../publickey';
import {
  fromKitInstruction,
  toKitInstruction,
} from '../../kit-adapters/instruction';
import {TransactionInstruction} from '../../transaction';

export * from './state';

export type CreateLookupTableParams = {
  /** Account used to derive and control the new address lookup table. */
  authority: PublicKey;
  /** Account that will fund the new address lookup table. */
  payer: PublicKey;
  /** A recent slot must be used in the derivation path for each initialized table. */
  recentSlot: bigint | number;
};

export type FreezeLookupTableParams = {
  /** PublicKey lookup table account to freeze. */
  lookupTable: PublicKey;
  /** Account which is the current authority. */
  authority: PublicKey;
};

export type ExtendLookupTableParams = {
  /** PublicKey lookup table account to extend. */
  lookupTable: PublicKey;
  /** Account which is the current authority. */
  authority: PublicKey;
  /** Account that will fund the table reallocation.
   * Not required if the reallocation has already been funded. */
  payer?: PublicKey;
  /** List of Public Keys to be added to the lookup table. */
  addresses: Array<PublicKey>;
};

export type DeactivateLookupTableParams = {
  /** PublicKey lookup table account to deactivate. */
  lookupTable: PublicKey;
  /** Account which is the current authority. */
  authority: PublicKey;
};

export type CloseLookupTableParams = {
  /** PublicKey lookup table account to close. */
  lookupTable: PublicKey;
  /** Account which is the current authority. */
  authority: PublicKey;
  /** Recipient of closed account lamports. */
  recipient: PublicKey;
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

const ADDRESS_LOOKUP_TABLE_PROGRAM_ID = new PublicKey(
  ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS,
);

export class AddressLookupTableInstruction {
  /**
   * @internal
   */
  constructor() {}

  static decodeInstructionType(
    instruction: TransactionInstruction,
  ): LookupTableInstructionType {
    this.checkProgramId(instruction.programId);
    return GENERATED_TO_LEGACY_INSTRUCTION_TYPE[
      identifyAddressLookupTableInstruction(instruction.data)
    ];
  }

  static decodeCreateLookupTable(
    instruction: TransactionInstruction,
  ): CreateLookupTableParams {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseAddressLookupTableInstructionOfType(
      instruction,
      GeneratedAddressLookupTableInstruction.CreateLookupTable,
    );

    return {
      authority: new PublicKey(parsedInstruction.accounts.authority.address),
      payer: new PublicKey(parsedInstruction.accounts.payer.address),
      recentSlot: Number(parsedInstruction.data.recentSlot),
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

    const {addresses} = getExtendLookupTableInstructionDataDecoder().decode(
      instruction.data,
    );
    return {
      lookupTable: instruction.keys[0].pubkey,
      authority: instruction.keys[1].pubkey,
      payer:
        instruction.keys.length > 2 ? instruction.keys[2].pubkey : undefined,
      addresses: addresses.map(address => new PublicKey(address)),
    };
  }

  static decodeCloseLookupTable(
    instruction: TransactionInstruction,
  ): CloseLookupTableParams {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseAddressLookupTableInstructionOfType(
      instruction,
      GeneratedAddressLookupTableInstruction.CloseLookupTable,
    );

    return {
      lookupTable: new PublicKey(parsedInstruction.accounts.address.address),
      authority: new PublicKey(parsedInstruction.accounts.authority.address),
      recipient: new PublicKey(parsedInstruction.accounts.recipient.address),
    };
  }

  static decodeFreezeLookupTable(
    instruction: TransactionInstruction,
  ): FreezeLookupTableParams {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseAddressLookupTableInstructionOfType(
      instruction,
      GeneratedAddressLookupTableInstruction.FreezeLookupTable,
    );

    return {
      lookupTable: new PublicKey(parsedInstruction.accounts.address.address),
      authority: new PublicKey(parsedInstruction.accounts.authority.address),
    };
  }

  static decodeDeactivateLookupTable(
    instruction: TransactionInstruction,
  ): DeactivateLookupTableParams {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseAddressLookupTableInstructionOfType(
      instruction,
      GeneratedAddressLookupTableInstruction.DeactivateLookupTable,
    );

    return {
      lookupTable: new PublicKey(parsedInstruction.accounts.address.address),
      authority: new PublicKey(parsedInstruction.accounts.authority.address),
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId: PublicKey) {
    if (!programId.equals(AddressLookupTableProgram.programId)) {
      throw new Error(
        'invalid instruction; programId is not AddressLookupTable Program',
      );
    }
  }
}

const GENERATED_TO_LEGACY_INSTRUCTION_TYPE = {
  [GeneratedAddressLookupTableInstruction.CreateLookupTable]:
    'CreateLookupTable',
  [GeneratedAddressLookupTableInstruction.FreezeLookupTable]:
    'FreezeLookupTable',
  [GeneratedAddressLookupTableInstruction.ExtendLookupTable]:
    'ExtendLookupTable',
  [GeneratedAddressLookupTableInstruction.DeactivateLookupTable]:
    'DeactivateLookupTable',
  [GeneratedAddressLookupTableInstruction.CloseLookupTable]: 'CloseLookupTable',
} as const satisfies Record<GeneratedAddressLookupTableInstruction, string>;

type ParsedAnyAddressLookupTableInstruction =
  ParsedAddressLookupTableInstruction<string>;

type ParsedInstructionOfType<
  TInstructionType extends GeneratedAddressLookupTableInstruction,
> = Extract<
  ParsedAnyAddressLookupTableInstruction,
  {instructionType: TInstructionType}
>;

function parseAddressLookupTableInstructionOfType<
  TInstructionType extends GeneratedAddressLookupTableInstruction,
>(
  instruction: TransactionInstruction,
  expectedInstructionType: TInstructionType,
): ParsedInstructionOfType<TInstructionType> {
  const parsedInstruction = parseAddressLookupTableInstruction(
    toKitInstruction(instruction),
  );
  if (parsedInstruction.instructionType !== expectedInstructionType) {
    throw new Error('invalid instruction; instruction type mismatch');
  }
  return parsedInstruction as ParsedInstructionOfType<TInstructionType>;
}

function buildExtendLookupTableInstructionWithoutPayer(
  params: ExtendLookupTableParams,
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
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
    ],
    programId: ADDRESS_LOOKUP_TABLE_PROGRAM_ID,
    data: Uint8Array.from(
      getExtendLookupTableInstructionDataEncoder().encode({
        addresses: params.addresses.map(address => address.toAddress()),
      }),
    ),
  });
}

export class AddressLookupTableProgram {
  /**
   * @internal
   */
  constructor() {}

  static programId: PublicKey = ADDRESS_LOOKUP_TABLE_PROGRAM_ID;

  static async createLookupTable(params: CreateLookupTableParams) {
    const [lookupTableAddress, bumpSeed] = await PublicKey.findProgramAddress(
      [
        params.authority.toBytes(),
        getU64Encoder().encode(params.recentSlot) as Uint8Array,
      ],
      this.programId,
    );

    const instruction = fromKitInstruction(
      getCreateLookupTableInstruction({
        address: [
          lookupTableAddress.toAddress(),
          bumpSeed,
        ] as unknown as Parameters<
          typeof getCreateLookupTableInstruction
        >[0]['address'],
        authority: params.authority.toAddress(),
        payer: createNoopSigner(params.payer.toAddress()),
        recentSlot: params.recentSlot,
      }),
    );

    return [instruction, lookupTableAddress] as [
      TransactionInstruction,
      PublicKey,
    ];
  }

  static freezeLookupTable(params: FreezeLookupTableParams) {
    return fromKitInstruction(
      getFreezeLookupTableInstruction({
        address: params.lookupTable.toAddress(),
        authority: createNoopSigner(params.authority.toAddress()),
      }),
    );
  }

  static extendLookupTable(params: ExtendLookupTableParams) {
    if (!params.payer) {
      return buildExtendLookupTableInstructionWithoutPayer(params);
    }

    return fromKitInstruction(
      getExtendLookupTableInstruction({
        address: params.lookupTable.toAddress(),
        authority: createNoopSigner(params.authority.toAddress()),
        payer: createNoopSigner(params.payer.toAddress()),
        addresses: params.addresses.map(address => address.toAddress()),
      }),
    );
  }

  static deactivateLookupTable(params: DeactivateLookupTableParams) {
    return fromKitInstruction(
      getDeactivateLookupTableInstruction({
        address: params.lookupTable.toAddress(),
        authority: createNoopSigner(params.authority.toAddress()),
      }),
    );
  }

  static closeLookupTable(params: CloseLookupTableParams) {
    return fromKitInstruction(
      getCloseLookupTableInstruction({
        address: params.lookupTable.toAddress(),
        authority: createNoopSigner(params.authority.toAddress()),
        recipient: params.recipient.toAddress(),
      }),
    );
  }
}
