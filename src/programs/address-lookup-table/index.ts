import {getU64Encoder} from '@solana/codecs-numbers';
import {
  ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS,
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
  AddressLookupTableInstruction as GeneratedAddressLookupTableInstruction,
} from '../../__generated__/program-clients/address-lookup-table';
import {createNoopSigner} from '@solana/signers';

import {Address} from '../../address';
import {fromKitAddress, toKitAddress} from '../../kit-adapters/address';
import {
  fromKitInstruction,
  toKitInstruction,
} from '../../kit-adapters/instruction';
import {TransactionInstruction} from '../../transaction';

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

const ADDRESS_LOOKUP_TABLE_PROGRAM_ID = new Address(
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
      authority: fromKitAddress(parsedInstruction.accounts.authority.address),
      payer: fromKitAddress(parsedInstruction.accounts.payer.address),
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
      payer: instruction.keys.length > 2 ? instruction.keys[2].pubkey : undefined,
      addresses: addresses.map(fromKitAddress),
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
      lookupTable: fromKitAddress(parsedInstruction.accounts.address.address),
      authority: fromKitAddress(parsedInstruction.accounts.authority.address),
      recipient: fromKitAddress(parsedInstruction.accounts.recipient.address),
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
      lookupTable: fromKitAddress(parsedInstruction.accounts.address.address),
      authority: fromKitAddress(parsedInstruction.accounts.authority.address),
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
      lookupTable: fromKitAddress(parsedInstruction.accounts.address.address),
      authority: fromKitAddress(parsedInstruction.accounts.authority.address),
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
}

type ValueOf<TRecord> =
  TRecord extends Record<PropertyKey, infer TValue> ? TValue : never;

const GENERATED_TO_LEGACY_INSTRUCTION_TYPE = {
  [GeneratedAddressLookupTableInstruction.CreateLookupTable]:
    'CreateLookupTable',
  [GeneratedAddressLookupTableInstruction.FreezeLookupTable]:
    'FreezeLookupTable',
  [GeneratedAddressLookupTableInstruction.ExtendLookupTable]:
    'ExtendLookupTable',
  [GeneratedAddressLookupTableInstruction.DeactivateLookupTable]:
    'DeactivateLookupTable',
  [GeneratedAddressLookupTableInstruction.CloseLookupTable]:
    'CloseLookupTable',
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
        addresses: params.addresses.map(toKitAddress),
      }),
    ),
  });
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

    const instruction = fromKitInstruction(
      getCreateLookupTableInstruction({
        address: [
          toKitAddress(lookupTableAddress),
          bumpSeed,
        ] as unknown as Parameters<
          typeof getCreateLookupTableInstruction
        >[0]['address'],
        authority: toKitAddress(params.authority),
        payer: createNoopSigner(toKitAddress(params.payer)),
        recentSlot: params.recentSlot,
      }),
    );

    return [instruction, lookupTableAddress] as [
      TransactionInstruction,
      Address,
    ];
  }

  static freezeLookupTable(params: FreezeLookupTableParams) {
    return fromKitInstruction(
      getFreezeLookupTableInstruction({
        address: toKitAddress(params.lookupTable),
        authority: createNoopSigner(toKitAddress(params.authority)),
      }),
    );
  }

  static extendLookupTable(params: ExtendLookupTableParams) {
    if (!params.payer) {
      return buildExtendLookupTableInstructionWithoutPayer(params);
    }

    return fromKitInstruction(
      getExtendLookupTableInstruction({
        address: toKitAddress(params.lookupTable),
        authority: createNoopSigner(toKitAddress(params.authority)),
        payer: createNoopSigner(toKitAddress(params.payer)),
        addresses: params.addresses.map(toKitAddress),
      }),
    );
  }

  static deactivateLookupTable(params: DeactivateLookupTableParams) {
    return fromKitInstruction(
      getDeactivateLookupTableInstruction({
        address: toKitAddress(params.lookupTable),
        authority: createNoopSigner(toKitAddress(params.authority)),
      }),
    );
  }

  static closeLookupTable(params: CloseLookupTableParams) {
    return fromKitInstruction(
      getCloseLookupTableInstruction({
        address: toKitAddress(params.lookupTable),
        authority: createNoopSigner(toKitAddress(params.authority)),
        recipient: toKitAddress(params.recipient),
      }),
    );
  }
}
