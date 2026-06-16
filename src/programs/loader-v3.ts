import {createNoopSigner, type ReadonlyUint8Array} from '@solana/kit';
import {
  getCloseInstruction,
  getDeployWithMaxDataLenInstruction,
  getExtendProgramInstruction,
  getInitializeBufferInstruction,
  getSetAuthorityCheckedInstruction,
  getSetAuthorityInstruction,
  getUpgradeInstruction,
  getWriteInstruction,
  identifyLoaderV3Instruction,
  LOADER_V3_PROGRAM_ADDRESS,
  LoaderV3Instruction as GeneratedLoaderV3Instruction,
  parseLoaderV3Instruction,
  type ParsedLoaderV3Instruction,
} from '@solana-program/loader-v3';

import {Address} from '../address';
import {fromKitAddress, toKitAddress} from '../kit-adapters/address';
import {
  fromKitInstruction,
  toKitInstruction,
} from '../kit-adapters/instruction';
import {TransactionInstruction} from '../transaction';

const LOADER_V3_PROGRAM_ID = new Address(LOADER_V3_PROGRAM_ADDRESS);

/**
 * An enumeration of valid LoaderV3InstructionType's
 */
export type LoaderV3InstructionType =
  | 'InitializeBuffer'
  | 'Write'
  | 'DeployWithMaxDataLen'
  | 'Upgrade'
  | 'SetAuthority'
  | 'Close'
  | 'ExtendProgram'
  | 'SetAuthorityChecked';

export type InitializeBufferParams = {
  /** Source account to initialize. */
  sourceAccount: Address;
  /** Buffer authority. */
  bufferAuthority: Address;
};

export type WriteParams = {
  /** Buffer account. */
  bufferAccount: Address;
  /** Buffer authority. */
  bufferAuthority: Address;
  /** Offset into the buffer to write. */
  offset: number;
  /** Bytes to write. */
  bytes: ReadonlyUint8Array | Uint8Array;
};

export type DeployWithMaxDataLenParams = {
  /** Payer account that will pay to create the ProgramData account. */
  payerAccount: Address;
  /** ProgramData account (uninitialized). */
  programDataAccount: Address;
  /** Program account (uninitialized). */
  programAccount: Address;
  /** Buffer account where the program data has been written. */
  bufferAccount: Address;
  /** Authority. */
  authority: Address;
  /** Maximum program data length. */
  maxDataLen: bigint;
  /** Rent sysvar. */
  rentSysvar?: Address;
  /** Clock sysvar. */
  clockSysvar?: Address;
  /** System program. */
  systemProgram?: Address;
};

export type UpgradeParams = {
  /** ProgramData account. */
  programDataAccount: Address;
  /** Program account. */
  programAccount: Address;
  /** Buffer account where the new program data has been written. */
  bufferAccount: Address;
  /** Spill account. */
  spillAccount: Address;
  /** Authority. */
  authority: Address;
  /** Rent sysvar. */
  rentSysvar?: Address;
  /** Clock sysvar. */
  clockSysvar?: Address;
};

export type SetAuthorityParams = {
  /** Buffer or ProgramData account. */
  bufferOrProgramDataAccount: Address;
  /** Current authority. */
  currentAuthority: Address;
  /** New authority. */
  newAuthority?: Address;
};

export type SetAuthorityCheckedParams = {
  /** Buffer or ProgramData account to change the authority of. */
  bufferOrProgramDataAccount: Address;
  /** Current authority. */
  currentAuthority: Address;
  /** New authority. */
  newAuthority: Address;
};

export type CloseParams = {
  /** Buffer or ProgramData account to close. */
  bufferOrProgramDataAccount: Address;
  /** Destination account for reclaimed lamports. */
  destinationAccount: Address;
  /** Authority. */
  authority?: Address;
  /** Program account. */
  programAccount?: Address;
};

export type ExtendProgramParams = {
  /** ProgramData account. */
  programDataAccount: Address;
  /** Program account. */
  programAccount: Address;
  /** Additional bytes to allocate. */
  additionalBytes: number;
  /** System program. */
  systemProgram?: Address;
  /** Payer. */
  payer?: Address;
};

const GENERATED_TO_LEGACY_INSTRUCTION_TYPE = {
  [GeneratedLoaderV3Instruction.InitializeBuffer]: 'InitializeBuffer',
  [GeneratedLoaderV3Instruction.Write]: 'Write',
  [GeneratedLoaderV3Instruction.DeployWithMaxDataLen]: 'DeployWithMaxDataLen',
  [GeneratedLoaderV3Instruction.Upgrade]: 'Upgrade',
  [GeneratedLoaderV3Instruction.SetAuthority]: 'SetAuthority',
  [GeneratedLoaderV3Instruction.Close]: 'Close',
  [GeneratedLoaderV3Instruction.ExtendProgram]: 'ExtendProgram',
  [GeneratedLoaderV3Instruction.SetAuthorityChecked]: 'SetAuthorityChecked',
} as const satisfies Record<GeneratedLoaderV3Instruction, string>;

type ParsedAnyLoaderV3Instruction = ParsedLoaderV3Instruction<string>;

type ParsedInstructionOfType<
  TInstructionType extends GeneratedLoaderV3Instruction,
> = Extract<ParsedAnyLoaderV3Instruction, {instructionType: TInstructionType}>;

function getInstructionType(
  instruction: TransactionInstruction,
): LoaderV3InstructionType {
  checkProgramId(instruction.programId);
  return GENERATED_TO_LEGACY_INSTRUCTION_TYPE[
    identifyLoaderV3Instruction(instruction.data)
  ];
}

function parseLoaderV3InstructionOfType<
  TInstructionType extends GeneratedLoaderV3Instruction,
>(
  instruction: TransactionInstruction,
  expectedInstructionType: TInstructionType,
): ParsedInstructionOfType<TInstructionType> {
  checkProgramId(instruction.programId);
  const parsedInstruction = parseLoaderV3Instruction(
    toKitInstruction(instruction),
  );
  if (parsedInstruction.instructionType !== expectedInstructionType) {
    throw new Error('invalid instruction; instruction type mismatch');
  }
  return parsedInstruction as ParsedInstructionOfType<TInstructionType>;
}

function checkProgramId(programId: Address) {
  if (!programId.equals(LoaderV3Program.programId)) {
    throw new Error('invalid instruction; programId is not LoaderV3Program');
  }
}

/**
 * Loader V3 Instruction class
 */
export class LoaderV3Instruction {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Decode a loader v3 instruction and retrieve the instruction type.
   */
  static decodeInstructionType(
    instruction: TransactionInstruction,
  ): LoaderV3InstructionType {
    return getInstructionType(instruction);
  }

  /**
   * Decode an initialize buffer instruction and retrieve the instruction params.
   */
  static decodeInitializeBuffer(
    instruction: TransactionInstruction,
  ): InitializeBufferParams {
    const parsedInstruction = parseLoaderV3InstructionOfType(
      instruction,
      GeneratedLoaderV3Instruction.InitializeBuffer,
    );

    return {
      sourceAccount: fromKitAddress(
        parsedInstruction.accounts.sourceAccount.address,
      ),
      bufferAuthority: fromKitAddress(
        parsedInstruction.accounts.bufferAuthority.address,
      ),
    };
  }

  /**
   * Decode a write instruction and retrieve the instruction params.
   */
  static decodeWrite(instruction: TransactionInstruction): WriteParams {
    const parsedInstruction = parseLoaderV3InstructionOfType(
      instruction,
      GeneratedLoaderV3Instruction.Write,
    );

    return {
      bufferAccount: fromKitAddress(
        parsedInstruction.accounts.bufferAccount.address,
      ),
      bufferAuthority: fromKitAddress(
        parsedInstruction.accounts.bufferAuthority.address,
      ),
      offset: parsedInstruction.data.offset,
      bytes: Uint8Array.from(parsedInstruction.data.bytes),
    };
  }

  /**
   * Decode a deploy with max data len instruction and retrieve the instruction params.
   */
  static decodeDeployWithMaxDataLen(
    instruction: TransactionInstruction,
  ): DeployWithMaxDataLenParams {
    const parsedInstruction = parseLoaderV3InstructionOfType(
      instruction,
      GeneratedLoaderV3Instruction.DeployWithMaxDataLen,
    );

    return {
      payerAccount: fromKitAddress(
        parsedInstruction.accounts.payerAccount.address,
      ),
      programDataAccount: fromKitAddress(
        parsedInstruction.accounts.programDataAccount.address,
      ),
      programAccount: fromKitAddress(
        parsedInstruction.accounts.programAccount.address,
      ),
      bufferAccount: fromKitAddress(
        parsedInstruction.accounts.bufferAccount.address,
      ),
      authority: fromKitAddress(parsedInstruction.accounts.authority.address),
      maxDataLen: parsedInstruction.data.maxDataLen,
      rentSysvar: fromKitAddress(parsedInstruction.accounts.rentSysvar.address),
      clockSysvar: fromKitAddress(
        parsedInstruction.accounts.clockSysvar.address,
      ),
      systemProgram: fromKitAddress(
        parsedInstruction.accounts.systemProgram.address,
      ),
    };
  }

  /**
   * Decode an upgrade instruction and retrieve the instruction params.
   */
  static decodeUpgrade(instruction: TransactionInstruction): UpgradeParams {
    const parsedInstruction = parseLoaderV3InstructionOfType(
      instruction,
      GeneratedLoaderV3Instruction.Upgrade,
    );

    return {
      programDataAccount: fromKitAddress(
        parsedInstruction.accounts.programDataAccount.address,
      ),
      programAccount: fromKitAddress(
        parsedInstruction.accounts.programAccount.address,
      ),
      bufferAccount: fromKitAddress(
        parsedInstruction.accounts.bufferAccount.address,
      ),
      spillAccount: fromKitAddress(
        parsedInstruction.accounts.spillAccount.address,
      ),
      authority: fromKitAddress(parsedInstruction.accounts.authority.address),
      rentSysvar: fromKitAddress(parsedInstruction.accounts.rentSysvar.address),
      clockSysvar: fromKitAddress(
        parsedInstruction.accounts.clockSysvar.address,
      ),
    };
  }

  /**
   * Decode a set authority instruction and retrieve the instruction params.
   */
  static decodeSetAuthority(
    instruction: TransactionInstruction,
  ): SetAuthorityParams {
    const parsedInstruction = parseLoaderV3InstructionOfType(
      instruction,
      GeneratedLoaderV3Instruction.SetAuthority,
    );

    return {
      bufferOrProgramDataAccount: fromKitAddress(
        parsedInstruction.accounts.bufferOrProgramDataAccount.address,
      ),
      currentAuthority: fromKitAddress(
        parsedInstruction.accounts.currentAuthority.address,
      ),
      ...(parsedInstruction.accounts.newAuthority
        ? {
            newAuthority: fromKitAddress(
              parsedInstruction.accounts.newAuthority.address,
            ),
          }
        : {}),
    };
  }

  /**
   * Decode a set authority checked instruction and retrieve the instruction params.
   */
  static decodeSetAuthorityChecked(
    instruction: TransactionInstruction,
  ): SetAuthorityCheckedParams {
    const parsedInstruction = parseLoaderV3InstructionOfType(
      instruction,
      GeneratedLoaderV3Instruction.SetAuthorityChecked,
    );

    return {
      bufferOrProgramDataAccount: fromKitAddress(
        parsedInstruction.accounts.bufferOrProgramDataAccount.address,
      ),
      currentAuthority: fromKitAddress(
        parsedInstruction.accounts.currentAuthority.address,
      ),
      newAuthority: fromKitAddress(
        parsedInstruction.accounts.newAuthority.address,
      ),
    };
  }

  /**
   * Decode a close instruction and retrieve the instruction params.
   */
  static decodeClose(instruction: TransactionInstruction): CloseParams {
    const parsedInstruction = parseLoaderV3InstructionOfType(
      instruction,
      GeneratedLoaderV3Instruction.Close,
    );

    return {
      bufferOrProgramDataAccount: fromKitAddress(
        parsedInstruction.accounts.bufferOrProgramDataAccount.address,
      ),
      destinationAccount: fromKitAddress(
        parsedInstruction.accounts.destinationAccount.address,
      ),
      ...(parsedInstruction.accounts.authority
        ? {
            authority: fromKitAddress(
              parsedInstruction.accounts.authority.address,
            ),
          }
        : {}),
      ...(parsedInstruction.accounts.programAccount
        ? {
            programAccount: fromKitAddress(
              parsedInstruction.accounts.programAccount.address,
            ),
          }
        : {}),
    };
  }

  /**
   * Decode an extend program instruction and retrieve the instruction params.
   */
  static decodeExtendProgram(
    instruction: TransactionInstruction,
  ): ExtendProgramParams {
    const parsedInstruction = parseLoaderV3InstructionOfType(
      instruction,
      GeneratedLoaderV3Instruction.ExtendProgram,
    );

    return {
      programDataAccount: fromKitAddress(
        parsedInstruction.accounts.programDataAccount.address,
      ),
      programAccount: fromKitAddress(
        parsedInstruction.accounts.programAccount.address,
      ),
      additionalBytes: parsedInstruction.data.additionalBytes,
      ...(parsedInstruction.accounts.systemProgram
        ? {
            systemProgram: fromKitAddress(
              parsedInstruction.accounts.systemProgram.address,
            ),
          }
        : {}),
      ...(parsedInstruction.accounts.payer
        ? {
            payer: fromKitAddress(parsedInstruction.accounts.payer.address),
          }
        : {}),
    };
  }
}

/**
 * Factory class for transaction instructions to interact with the Loader V3 program
 */
export class LoaderV3Program {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the Loader V3 program
   */
  static programId: Address = LOADER_V3_PROGRAM_ID;

  static initializeBuffer(
    params: InitializeBufferParams,
  ): TransactionInstruction {
    return fromKitInstruction(
      getInitializeBufferInstruction({
        sourceAccount: toKitAddress(params.sourceAccount),
        bufferAuthority: toKitAddress(params.bufferAuthority),
      }),
    );
  }

  static write(params: WriteParams): TransactionInstruction {
    return fromKitInstruction(
      getWriteInstruction({
        bufferAccount: toKitAddress(params.bufferAccount),
        bufferAuthority: createNoopSigner(toKitAddress(params.bufferAuthority)),
        offset: params.offset,
        bytes: params.bytes,
      }),
    );
  }

  static deployWithMaxDataLen(
    params: DeployWithMaxDataLenParams,
  ): TransactionInstruction {
    return fromKitInstruction(
      getDeployWithMaxDataLenInstruction({
        payerAccount: createNoopSigner(toKitAddress(params.payerAccount)),
        programDataAccount: toKitAddress(params.programDataAccount),
        programAccount: toKitAddress(params.programAccount),
        bufferAccount: toKitAddress(params.bufferAccount),
        authority: createNoopSigner(toKitAddress(params.authority)),
        maxDataLen: params.maxDataLen,
        ...(params.rentSysvar
          ? {rentSysvar: toKitAddress(params.rentSysvar)}
          : {}),
        ...(params.clockSysvar
          ? {clockSysvar: toKitAddress(params.clockSysvar)}
          : {}),
        ...(params.systemProgram
          ? {systemProgram: toKitAddress(params.systemProgram)}
          : {}),
      }),
    );
  }

  static upgrade(params: UpgradeParams): TransactionInstruction {
    return fromKitInstruction(
      getUpgradeInstruction({
        programDataAccount: toKitAddress(params.programDataAccount),
        programAccount: toKitAddress(params.programAccount),
        bufferAccount: toKitAddress(params.bufferAccount),
        spillAccount: toKitAddress(params.spillAccount),
        authority: createNoopSigner(toKitAddress(params.authority)),
        ...(params.rentSysvar
          ? {rentSysvar: toKitAddress(params.rentSysvar)}
          : {}),
        ...(params.clockSysvar
          ? {clockSysvar: toKitAddress(params.clockSysvar)}
          : {}),
      }),
    );
  }

  static setAuthority(params: SetAuthorityParams): TransactionInstruction {
    return fromKitInstruction(
      getSetAuthorityInstruction({
        bufferOrProgramDataAccount: toKitAddress(
          params.bufferOrProgramDataAccount,
        ),
        currentAuthority: createNoopSigner(
          toKitAddress(params.currentAuthority),
        ),
        ...(params.newAuthority
          ? {newAuthority: toKitAddress(params.newAuthority)}
          : {}),
      }),
    );
  }

  static setAuthorityChecked(
    params: SetAuthorityCheckedParams,
  ): TransactionInstruction {
    return fromKitInstruction(
      getSetAuthorityCheckedInstruction({
        bufferOrProgramDataAccount: toKitAddress(
          params.bufferOrProgramDataAccount,
        ),
        currentAuthority: createNoopSigner(
          toKitAddress(params.currentAuthority),
        ),
        newAuthority: createNoopSigner(toKitAddress(params.newAuthority)),
      }),
    );
  }

  static close(params: CloseParams): TransactionInstruction {
    return fromKitInstruction(
      getCloseInstruction({
        bufferOrProgramDataAccount: toKitAddress(
          params.bufferOrProgramDataAccount,
        ),
        destinationAccount: toKitAddress(params.destinationAccount),
        ...(params.authority
          ? {authority: createNoopSigner(toKitAddress(params.authority))}
          : {}),
        ...(params.programAccount
          ? {programAccount: toKitAddress(params.programAccount)}
          : {}),
      }),
    );
  }

  static extendProgram(params: ExtendProgramParams): TransactionInstruction {
    return fromKitInstruction(
      getExtendProgramInstruction({
        programDataAccount: toKitAddress(params.programDataAccount),
        programAccount: toKitAddress(params.programAccount),
        additionalBytes: params.additionalBytes,
        ...(params.systemProgram
          ? {systemProgram: toKitAddress(params.systemProgram)}
          : {}),
        ...(params.payer
          ? {payer: createNoopSigner(toKitAddress(params.payer))}
          : {}),
      }),
    );
  }
}
