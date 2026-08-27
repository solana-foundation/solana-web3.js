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

import {PublicKey} from '../publickey';
import {
  fromKitInstruction,
  toKitInstruction,
} from '../kit-adapters/instruction';
import {TransactionInstruction} from '../transaction';

const LOADER_V3_PROGRAM_ID = new PublicKey(LOADER_V3_PROGRAM_ADDRESS);

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
  sourceAccount: PublicKey;
  /** Buffer authority. */
  bufferAuthority: PublicKey;
};

export type WriteParams = {
  /** Buffer account. */
  bufferAccount: PublicKey;
  /** Buffer authority. */
  bufferAuthority: PublicKey;
  /** Offset into the buffer to write. */
  offset: number;
  /** Bytes to write. */
  bytes: ReadonlyUint8Array | Uint8Array;
};

export type DeployWithMaxDataLenParams = {
  /** Payer account that will pay to create the ProgramData account. */
  payerAccount: PublicKey;
  /** ProgramData account (uninitialized). */
  programDataAccount: PublicKey;
  /** Program account (uninitialized). */
  programAccount: PublicKey;
  /** Buffer account where the program data has been written. */
  bufferAccount: PublicKey;
  /** Authority. */
  authority: PublicKey;
  /** Maximum program data length. */
  maxDataLen: bigint;
  /** Rent sysvar. */
  rentSysvar?: PublicKey;
  /** Clock sysvar. */
  clockSysvar?: PublicKey;
  /** System program. */
  systemProgram?: PublicKey;
};

export type UpgradeParams = {
  /** ProgramData account. */
  programDataAccount: PublicKey;
  /** Program account. */
  programAccount: PublicKey;
  /** Buffer account where the new program data has been written. */
  bufferAccount: PublicKey;
  /** Spill account. */
  spillAccount: PublicKey;
  /** Authority. */
  authority: PublicKey;
  /** Rent sysvar. */
  rentSysvar?: PublicKey;
  /** Clock sysvar. */
  clockSysvar?: PublicKey;
};

export type SetAuthorityParams = {
  /** Buffer or ProgramData account. */
  bufferOrProgramDataAccount: PublicKey;
  /** Current authority. */
  currentAuthority: PublicKey;
  /** New authority. */
  newAuthority?: PublicKey;
};

export type SetAuthorityCheckedParams = {
  /** Buffer or ProgramData account to change the authority of. */
  bufferOrProgramDataAccount: PublicKey;
  /** Current authority. */
  currentAuthority: PublicKey;
  /** New authority. */
  newAuthority: PublicKey;
};

export type CloseParams = {
  /** Buffer or ProgramData account to close. */
  bufferOrProgramDataAccount: PublicKey;
  /** Destination account for reclaimed lamports. */
  destinationAccount: PublicKey;
  /** Authority. */
  authority?: PublicKey;
  /** Program account. */
  programAccount?: PublicKey;
};

export type ExtendProgramParams = {
  /** ProgramData account. */
  programDataAccount: PublicKey;
  /** Program account. */
  programAccount: PublicKey;
  /** Additional bytes to allocate. */
  additionalBytes: number;
  /** System program. */
  systemProgram?: PublicKey;
  /** Payer. */
  payer?: PublicKey;
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

function checkProgramId(programId: PublicKey) {
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
      sourceAccount: new PublicKey(
        parsedInstruction.accounts.sourceAccount.address,
      ),
      bufferAuthority: new PublicKey(
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
      bufferAccount: new PublicKey(
        parsedInstruction.accounts.bufferAccount.address,
      ),
      bufferAuthority: new PublicKey(
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
      payerAccount: new PublicKey(
        parsedInstruction.accounts.payerAccount.address,
      ),
      programDataAccount: new PublicKey(
        parsedInstruction.accounts.programDataAccount.address,
      ),
      programAccount: new PublicKey(
        parsedInstruction.accounts.programAccount.address,
      ),
      bufferAccount: new PublicKey(
        parsedInstruction.accounts.bufferAccount.address,
      ),
      authority: new PublicKey(parsedInstruction.accounts.authority.address),
      maxDataLen: parsedInstruction.data.maxDataLen,
      rentSysvar: new PublicKey(parsedInstruction.accounts.rentSysvar.address),
      clockSysvar: new PublicKey(
        parsedInstruction.accounts.clockSysvar.address,
      ),
      systemProgram: new PublicKey(
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
      programDataAccount: new PublicKey(
        parsedInstruction.accounts.programDataAccount.address,
      ),
      programAccount: new PublicKey(
        parsedInstruction.accounts.programAccount.address,
      ),
      bufferAccount: new PublicKey(
        parsedInstruction.accounts.bufferAccount.address,
      ),
      spillAccount: new PublicKey(
        parsedInstruction.accounts.spillAccount.address,
      ),
      authority: new PublicKey(parsedInstruction.accounts.authority.address),
      rentSysvar: new PublicKey(parsedInstruction.accounts.rentSysvar.address),
      clockSysvar: new PublicKey(
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
      bufferOrProgramDataAccount: new PublicKey(
        parsedInstruction.accounts.bufferOrProgramDataAccount.address,
      ),
      currentAuthority: new PublicKey(
        parsedInstruction.accounts.currentAuthority.address,
      ),
      ...(parsedInstruction.accounts.newAuthority
        ? {
            newAuthority: new PublicKey(
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
      bufferOrProgramDataAccount: new PublicKey(
        parsedInstruction.accounts.bufferOrProgramDataAccount.address,
      ),
      currentAuthority: new PublicKey(
        parsedInstruction.accounts.currentAuthority.address,
      ),
      newAuthority: new PublicKey(
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
      bufferOrProgramDataAccount: new PublicKey(
        parsedInstruction.accounts.bufferOrProgramDataAccount.address,
      ),
      destinationAccount: new PublicKey(
        parsedInstruction.accounts.destinationAccount.address,
      ),
      ...(parsedInstruction.accounts.authority
        ? {
            authority: new PublicKey(
              parsedInstruction.accounts.authority.address,
            ),
          }
        : {}),
      ...(parsedInstruction.accounts.programAccount
        ? {
            programAccount: new PublicKey(
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
      programDataAccount: new PublicKey(
        parsedInstruction.accounts.programDataAccount.address,
      ),
      programAccount: new PublicKey(
        parsedInstruction.accounts.programAccount.address,
      ),
      additionalBytes: parsedInstruction.data.additionalBytes,
      ...(parsedInstruction.accounts.systemProgram
        ? {
            systemProgram: new PublicKey(
              parsedInstruction.accounts.systemProgram.address,
            ),
          }
        : {}),
      ...(parsedInstruction.accounts.payer
        ? {
            payer: new PublicKey(parsedInstruction.accounts.payer.address),
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
  static programId: PublicKey = LOADER_V3_PROGRAM_ID;

  static initializeBuffer(
    params: InitializeBufferParams,
  ): TransactionInstruction {
    return fromKitInstruction(
      getInitializeBufferInstruction({
        sourceAccount: params.sourceAccount.toAddress(),
        bufferAuthority: params.bufferAuthority.toAddress(),
      }),
    );
  }

  static write(params: WriteParams): TransactionInstruction {
    return fromKitInstruction(
      getWriteInstruction({
        bufferAccount: params.bufferAccount.toAddress(),
        bufferAuthority: createNoopSigner(params.bufferAuthority.toAddress()),
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
        payerAccount: createNoopSigner(params.payerAccount.toAddress()),
        programDataAccount: params.programDataAccount.toAddress(),
        programAccount: params.programAccount.toAddress(),
        bufferAccount: params.bufferAccount.toAddress(),
        authority: createNoopSigner(params.authority.toAddress()),
        maxDataLen: params.maxDataLen,
        ...(params.rentSysvar
          ? {rentSysvar: params.rentSysvar.toAddress()}
          : {}),
        ...(params.clockSysvar
          ? {clockSysvar: params.clockSysvar.toAddress()}
          : {}),
        ...(params.systemProgram
          ? {systemProgram: params.systemProgram.toAddress()}
          : {}),
      }),
    );
  }

  static upgrade(params: UpgradeParams): TransactionInstruction {
    return fromKitInstruction(
      getUpgradeInstruction({
        programDataAccount: params.programDataAccount.toAddress(),
        programAccount: params.programAccount.toAddress(),
        bufferAccount: params.bufferAccount.toAddress(),
        spillAccount: params.spillAccount.toAddress(),
        authority: createNoopSigner(params.authority.toAddress()),
        ...(params.rentSysvar
          ? {rentSysvar: params.rentSysvar.toAddress()}
          : {}),
        ...(params.clockSysvar
          ? {clockSysvar: params.clockSysvar.toAddress()}
          : {}),
      }),
    );
  }

  static setAuthority(params: SetAuthorityParams): TransactionInstruction {
    return fromKitInstruction(
      getSetAuthorityInstruction({
        bufferOrProgramDataAccount:
          params.bufferOrProgramDataAccount.toAddress(),
        currentAuthority: createNoopSigner(params.currentAuthority.toAddress()),
        ...(params.newAuthority
          ? {newAuthority: params.newAuthority.toAddress()}
          : {}),
      }),
    );
  }

  static setAuthorityChecked(
    params: SetAuthorityCheckedParams,
  ): TransactionInstruction {
    return fromKitInstruction(
      getSetAuthorityCheckedInstruction({
        bufferOrProgramDataAccount:
          params.bufferOrProgramDataAccount.toAddress(),
        currentAuthority: createNoopSigner(params.currentAuthority.toAddress()),
        newAuthority: createNoopSigner(params.newAuthority.toAddress()),
      }),
    );
  }

  static close(params: CloseParams): TransactionInstruction {
    return fromKitInstruction(
      getCloseInstruction({
        bufferOrProgramDataAccount:
          params.bufferOrProgramDataAccount.toAddress(),
        destinationAccount: params.destinationAccount.toAddress(),
        ...(params.authority
          ? {authority: createNoopSigner(params.authority.toAddress())}
          : {}),
        ...(params.programAccount
          ? {programAccount: params.programAccount.toAddress()}
          : {}),
      }),
    );
  }

  static extendProgram(params: ExtendProgramParams): TransactionInstruction {
    return fromKitInstruction(
      getExtendProgramInstruction({
        programDataAccount: params.programDataAccount.toAddress(),
        programAccount: params.programAccount.toAddress(),
        additionalBytes: params.additionalBytes,
        ...(params.systemProgram
          ? {systemProgram: params.systemProgram.toAddress()}
          : {}),
        ...(params.payer
          ? {payer: createNoopSigner(params.payer.toAddress())}
          : {}),
      }),
    );
  }
}
