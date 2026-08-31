import {createNoopSigner} from '@solana/kit';
import {
  getAdvanceNonceAccountInstruction,
  getAllocateInstruction,
  getAllocateWithSeedInstruction,
  getAssignInstruction,
  getAssignWithSeedInstruction,
  getAuthorizeNonceAccountInstruction,
  getCreateAccountInstruction,
  getCreateAccountWithSeedInstruction,
  getInitializeNonceAccountInstruction,
  parseSystemInstruction,
  type ParsedSystemInstruction,
  getTransferSolInstruction,
  getTransferSolWithSeedInstruction,
  getWithdrawNonceAccountInstruction,
  identifySystemInstruction,
  SYSTEM_PROGRAM_ADDRESS,
  SystemInstruction as GeneratedSystemInstruction,
} from '@solana-program/system';

import {
  fromKitInstruction,
  toKitInstruction,
} from '../kit-adapters/instruction';
import {NONCE_ACCOUNT_LENGTH} from '../nonce-account';
import {PublicKey} from '../publickey';
import {SYSVAR_RECENT_BLOCKHASHES_PUBKEY, SYSVAR_RENT_PUBKEY} from '../sysvar';
import {Transaction, TransactionInstruction} from '../transaction';

const SYSTEM_PROGRAM_ID = new PublicKey(SYSTEM_PROGRAM_ADDRESS);

/**
 * Create account system transaction params
 */
type CreateAccountFields = {
  /** The account that will transfer lamports to the created account */
  fromPubkey: PublicKey;
  /** Public key of the created account */
  newAccountPubkey: PublicKey;
  /** Amount of lamports to transfer to the created account */
  lamports: bigint;
  /** Amount of space in bytes to allocate to the created account */
  space: bigint;
  /** Public key of the program to assign as the owner of the created account */
  programId: PublicKey;
};

export type CreateAccountParams = Omit<
  CreateAccountFields,
  'lamports' | 'space'
> & {
  lamports: number | bigint;
  space: number | bigint;
};

/**
 * Transfer system transaction params
 */
type TransferFields = {
  /** Account that will transfer lamports */
  fromPubkey: PublicKey;
  /** Account that will receive transferred lamports */
  toPubkey: PublicKey;
  /** Amount of lamports to transfer */
  lamports: bigint;
};

export type TransferParams = Omit<TransferFields, 'lamports'> & {
  lamports: number | bigint;
};

/**
 * Assign system transaction params
 */
export type AssignParams = {
  /** Public key of the account which will be assigned a new owner */
  accountPubkey: PublicKey;
  /** Public key of the program to assign as the owner */
  programId: PublicKey;
};

/**
 * Create account with seed system transaction params
 */
type CreateAccountWithSeedFields = {
  /** The account that will transfer lamports to the created account */
  fromPubkey: PublicKey;
  /** Public key of the created account. Must be pre-calculated with PublicKey.createWithSeed() */
  newAccountPubkey: PublicKey;
  /** Base public key to use to derive the address of the created account. Must be the same as the base key used to create `newAccountPubkey` */
  basePubkey: PublicKey;
  /** Seed to use to derive the address of the created account. Must be the same as the seed used to create `newAccountPubkey` */
  seed: string;
  /** Amount of lamports to transfer to the created account */
  lamports: bigint;
  /** Amount of space in bytes to allocate to the created account */
  space: bigint;
  /** Public key of the program to assign as the owner of the created account */
  programId: PublicKey;
};

export type CreateAccountWithSeedParams = Omit<
  CreateAccountWithSeedFields,
  'lamports' | 'space'
> & {
  lamports: number | bigint;
  space: number | bigint;
};

/**
 * Create nonce account system transaction params
 */
type CreateNonceAccountFields = {
  /** The account that will transfer lamports to the created nonce account */
  fromPubkey: PublicKey;
  /** Public key of the created nonce account */
  noncePubkey: PublicKey;
  /** Public key to set as authority of the created nonce account */
  authorizedPubkey: PublicKey;
  /** Amount of lamports to transfer to the created nonce account */
  lamports: bigint;
};

export type CreateNonceAccountParams = Omit<
  CreateNonceAccountFields,
  'lamports'
> & {
  lamports: number | bigint;
};

/**
 * Create nonce account with seed system transaction params
 */
type CreateNonceAccountWithSeedFields = {
  /** The account that will transfer lamports to the created nonce account */
  fromPubkey: PublicKey;
  /** Public key of the created nonce account */
  noncePubkey: PublicKey;
  /** Public key to set as authority of the created nonce account */
  authorizedPubkey: PublicKey;
  /** Amount of lamports to transfer to the created nonce account */
  lamports: bigint;
  /** Base public key to use to derive the address of the nonce account */
  basePubkey: PublicKey;
  /** Seed to use to derive the address of the nonce account */
  seed: string;
};

export type CreateNonceAccountWithSeedParams = Omit<
  CreateNonceAccountWithSeedFields,
  'lamports'
> & {
  lamports: number | bigint;
};

/**
 * Initialize nonce account system instruction params
 */
export type InitializeNonceParams = {
  /** Nonce account which will be initialized */
  noncePubkey: PublicKey;
  /** Public key to set as authority of the initialized nonce account */
  authorizedPubkey: PublicKey;
};

/**
 * Advance nonce account system instruction params
 */
export type AdvanceNonceParams = {
  /** Nonce account */
  noncePubkey: PublicKey;
  /** Public key of the nonce authority */
  authorizedPubkey: PublicKey;
};

/**
 * Withdraw nonce account system transaction params
 */
type WithdrawNonceFields = {
  /** Nonce account */
  noncePubkey: PublicKey;
  /** Public key of the nonce authority */
  authorizedPubkey: PublicKey;
  /** Public key of the account which will receive the withdrawn nonce account balance */
  toPubkey: PublicKey;
  /** Amount of lamports to withdraw from the nonce account */
  lamports: bigint;
};

export type WithdrawNonceParams = Omit<WithdrawNonceFields, 'lamports'> & {
  lamports: number | bigint;
};

/**
 * Authorize nonce account system transaction params
 */
export type AuthorizeNonceParams = {
  /** Nonce account */
  noncePubkey: PublicKey;
  /** Public key of the current nonce authority */
  authorizedPubkey: PublicKey;
  /** Public key to set as the new nonce authority */
  newAuthorizedPubkey: PublicKey;
};

/**
 * Allocate account system transaction params
 */
type AllocateFields = {
  /** Account to allocate */
  accountPubkey: PublicKey;
  /** Amount of space in bytes to allocate */
  space: bigint;
};

export type AllocateParams = Omit<AllocateFields, 'space'> & {
  space: number | bigint;
};

/**
 * Allocate account with seed system transaction params
 */
type AllocateWithSeedFields = {
  /** Account to allocate */
  accountPubkey: PublicKey;
  /** Base public key to use to derive the address of the allocated account */
  basePubkey: PublicKey;
  /** Seed to use to derive the address of the allocated account */
  seed: string;
  /** Amount of space in bytes to allocate */
  space: bigint;
  /** Public key of the program to assign as the owner of the allocated account */
  programId: PublicKey;
};

export type AllocateWithSeedParams = Omit<AllocateWithSeedFields, 'space'> & {
  space: number | bigint;
};

/**
 * Assign account with seed system transaction params
 */
export type AssignWithSeedParams = {
  /** Public key of the account which will be assigned a new owner */
  accountPubkey: PublicKey;
  /** Base public key to use to derive the address of the assigned account */
  basePubkey: PublicKey;
  /** Seed to use to derive the address of the assigned account */
  seed: string;
  /** Public key of the program to assign as the owner */
  programId: PublicKey;
};

/**
 * Transfer with seed system transaction params
 */
type TransferWithSeedFields = {
  /** Account that will transfer lamports */
  fromPubkey: PublicKey;
  /** Base public key to use to derive the funding account address */
  basePubkey: PublicKey;
  /** Account that will receive transferred lamports */
  toPubkey: PublicKey;
  /** Amount of lamports to transfer */
  lamports: bigint;
  /** Seed to use to derive the funding account address */
  seed: string;
  /** Program id to use to derive the funding account address */
  programId: PublicKey;
};

export type TransferWithSeedParams = Omit<
  TransferWithSeedFields,
  'lamports'
> & {
  lamports: number | bigint;
};

/** Decoded create account system instruction */
export type DecodedCreateAccountInstruction = CreateAccountFields;

/** Decoded allocate system instruction */
export type DecodedAllocateInstruction = AllocateFields;

/** Decoded allocate with seed system instruction */
export type DecodedAllocateWithSeedInstruction = AllocateWithSeedFields;

/** Decoded create account with seed system instruction */
export type DecodedCreateAccountWithSeedInstruction =
  CreateAccountWithSeedFields;

/** Decoded transfer system transaction instruction */
export type DecodedTransferInstruction = TransferFields;

/** Decoded transferWithSeed system transaction instruction */
export type DecodedTransferWithSeedInstruction = TransferWithSeedFields;

/** Decoded withdraw nonce system transaction instruction */
export type DecodedWithdrawNonceInstruction = WithdrawNonceFields;

/**
 * System Instruction class
 */
export class SystemInstruction {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Decode a system instruction and retrieve the instruction type.
   */
  static decodeInstructionType(
    instruction: TransactionInstruction,
  ): SystemInstructionType {
    this.checkProgramId(instruction.programId);

    return GENERATED_TO_LEGACY_INSTRUCTION_TYPE[
      identifySystemInstruction(instruction.data)
    ];
  }

  /**
   * Decode a create account system instruction and retrieve the instruction params.
   */
  static decodeCreateAccount(
    instruction: TransactionInstruction,
  ): DecodedCreateAccountInstruction {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.CreateAccount,
    );

    return {
      fromPubkey: new PublicKey(parsedInstruction.accounts.payer.address),
      newAccountPubkey: new PublicKey(
        parsedInstruction.accounts.newAccount.address,
      ),
      lamports: parsedInstruction.data.lamports,
      space: parsedInstruction.data.space,
      programId: new PublicKey(parsedInstruction.data.programAddress),
    };
  }

  /**
   * Decode a transfer system instruction and retrieve the instruction params.
   */
  static decodeTransfer(
    instruction: TransactionInstruction,
  ): DecodedTransferInstruction {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.TransferSol,
    );

    return {
      fromPubkey: new PublicKey(parsedInstruction.accounts.source.address),
      toPubkey: new PublicKey(parsedInstruction.accounts.destination.address),
      lamports: parsedInstruction.data.amount,
    };
  }

  /**
   * Decode a transfer with seed system instruction and retrieve the instruction params.
   */
  static decodeTransferWithSeed(
    instruction: TransactionInstruction,
  ): DecodedTransferWithSeedInstruction {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.TransferSolWithSeed,
    );

    return {
      fromPubkey: new PublicKey(parsedInstruction.accounts.source.address),
      basePubkey: new PublicKey(parsedInstruction.accounts.baseAccount.address),
      toPubkey: new PublicKey(parsedInstruction.accounts.destination.address),
      lamports: parsedInstruction.data.amount,
      seed: parsedInstruction.data.fromSeed,
      programId: new PublicKey(parsedInstruction.data.fromOwner),
    };
  }

  /**
   * Decode an allocate system instruction and retrieve the instruction params.
   */
  static decodeAllocate(
    instruction: TransactionInstruction,
  ): DecodedAllocateInstruction {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.Allocate,
    );

    return {
      accountPubkey: new PublicKey(
        parsedInstruction.accounts.newAccount.address,
      ),
      space: parsedInstruction.data.space,
    };
  }

  /**
   * Decode an allocate with seed system instruction and retrieve the instruction params.
   */
  static decodeAllocateWithSeed(
    instruction: TransactionInstruction,
  ): DecodedAllocateWithSeedInstruction {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.AllocateWithSeed,
    );

    return {
      accountPubkey: new PublicKey(
        parsedInstruction.accounts.newAccount.address,
      ),
      basePubkey: new PublicKey(parsedInstruction.data.base),
      seed: parsedInstruction.data.seed,
      space: parsedInstruction.data.space,
      programId: new PublicKey(parsedInstruction.data.programAddress),
    };
  }

  /**
   * Decode an assign system instruction and retrieve the instruction params.
   */
  static decodeAssign(instruction: TransactionInstruction): AssignParams {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.Assign,
    );

    return {
      accountPubkey: new PublicKey(parsedInstruction.accounts.account.address),
      programId: new PublicKey(parsedInstruction.data.programAddress),
    };
  }

  /**
   * Decode an assign with seed system instruction and retrieve the instruction params.
   */
  static decodeAssignWithSeed(
    instruction: TransactionInstruction,
  ): AssignWithSeedParams {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.AssignWithSeed,
    );

    return {
      accountPubkey: new PublicKey(parsedInstruction.accounts.account.address),
      basePubkey: new PublicKey(parsedInstruction.data.base),
      seed: parsedInstruction.data.seed,
      programId: new PublicKey(parsedInstruction.data.programAddress),
    };
  }

  /**
   * Decode a create account with seed system instruction and retrieve the instruction params.
   */
  static decodeCreateWithSeed(
    instruction: TransactionInstruction,
  ): DecodedCreateAccountWithSeedInstruction {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.CreateAccountWithSeed,
    );

    return {
      fromPubkey: new PublicKey(parsedInstruction.accounts.payer.address),
      newAccountPubkey: new PublicKey(
        parsedInstruction.accounts.newAccount.address,
      ),
      basePubkey: new PublicKey(parsedInstruction.data.base),
      seed: parsedInstruction.data.seed,
      lamports: parsedInstruction.data.amount,
      space: parsedInstruction.data.space,
      programId: new PublicKey(parsedInstruction.data.programAddress),
    };
  }

  /**
   * Decode a nonce initialize system instruction and retrieve the instruction params.
   */
  static decodeNonceInitialize(
    instruction: TransactionInstruction,
  ): InitializeNonceParams {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.InitializeNonceAccount,
    );

    return {
      noncePubkey: new PublicKey(
        parsedInstruction.accounts.nonceAccount.address,
      ),
      authorizedPubkey: new PublicKey(parsedInstruction.data.nonceAuthority),
    };
  }

  /**
   * Decode a nonce advance system instruction and retrieve the instruction params.
   */
  static decodeNonceAdvance(
    instruction: TransactionInstruction,
  ): AdvanceNonceParams {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.AdvanceNonceAccount,
    );

    return {
      noncePubkey: new PublicKey(
        parsedInstruction.accounts.nonceAccount.address,
      ),
      authorizedPubkey: new PublicKey(
        parsedInstruction.accounts.nonceAuthority.address,
      ),
    };
  }

  /**
   * Decode a nonce withdraw system instruction and retrieve the instruction params.
   */
  static decodeNonceWithdraw(
    instruction: TransactionInstruction,
  ): DecodedWithdrawNonceInstruction {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.WithdrawNonceAccount,
    );

    return {
      noncePubkey: new PublicKey(
        parsedInstruction.accounts.nonceAccount.address,
      ),
      toPubkey: new PublicKey(
        parsedInstruction.accounts.recipientAccount.address,
      ),
      authorizedPubkey: new PublicKey(
        parsedInstruction.accounts.nonceAuthority.address,
      ),
      lamports: parsedInstruction.data.withdrawAmount,
    };
  }

  /**
   * Decode a nonce authorize system instruction and retrieve the instruction params.
   */
  static decodeNonceAuthorize(
    instruction: TransactionInstruction,
  ): AuthorizeNonceParams {
    this.checkProgramId(instruction.programId);
    const parsedInstruction = parseSystemInstructionOfType(
      instruction,
      GeneratedSystemInstruction.AuthorizeNonceAccount,
    );

    return {
      noncePubkey: new PublicKey(
        parsedInstruction.accounts.nonceAccount.address,
      ),
      authorizedPubkey: new PublicKey(
        parsedInstruction.accounts.nonceAuthority.address,
      ),
      newAuthorizedPubkey: new PublicKey(
        parsedInstruction.data.newNonceAuthority,
      ),
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId: PublicKey) {
    if (!programId.equals(SystemProgram.programId)) {
      throw new Error('invalid instruction; programId is not SystemProgram');
    }
  }
}

type ValueOf<TRecord> =
  TRecord extends Record<PropertyKey, infer TValue> ? TValue : never;

const GENERATED_TO_LEGACY_INSTRUCTION_TYPE = {
  [GeneratedSystemInstruction.AdvanceNonceAccount]: 'AdvanceNonceAccount',
  [GeneratedSystemInstruction.Allocate]: 'Allocate',
  [GeneratedSystemInstruction.AllocateWithSeed]: 'AllocateWithSeed',
  [GeneratedSystemInstruction.Assign]: 'Assign',
  [GeneratedSystemInstruction.AssignWithSeed]: 'AssignWithSeed',
  [GeneratedSystemInstruction.AuthorizeNonceAccount]: 'AuthorizeNonceAccount',
  [GeneratedSystemInstruction.CreateAccount]: 'Create',
  [GeneratedSystemInstruction.CreateAccountAllowPrefund]: 'CreateAllowPrefund',
  [GeneratedSystemInstruction.CreateAccountWithSeed]: 'CreateWithSeed',
  [GeneratedSystemInstruction.InitializeNonceAccount]: 'InitializeNonceAccount',
  [GeneratedSystemInstruction.TransferSol]: 'Transfer',
  [GeneratedSystemInstruction.TransferSolWithSeed]: 'TransferWithSeed',
  [GeneratedSystemInstruction.UpgradeNonceAccount]: 'UpgradeNonceAccount',
  [GeneratedSystemInstruction.WithdrawNonceAccount]: 'WithdrawNonceAccount',
} as const satisfies Record<GeneratedSystemInstruction, string>;

/**
 * An enumeration of valid SystemInstructionType's
 */
export type SystemInstructionType = ValueOf<
  typeof GENERATED_TO_LEGACY_INSTRUCTION_TYPE
>;

type ParsedAnySystemInstruction = ParsedSystemInstruction<string>;

type ParsedInstructionOfType<
  TInstructionType extends GeneratedSystemInstruction,
> = Extract<ParsedAnySystemInstruction, {instructionType: TInstructionType}>;

function parseSystemInstructionOfType<
  TInstructionType extends GeneratedSystemInstruction,
>(
  instruction: TransactionInstruction,
  expectedInstructionType: TInstructionType,
): ParsedInstructionOfType<TInstructionType> {
  const parsedInstruction = parseSystemInstruction(
    toKitInstruction(instruction),
  );
  if (parsedInstruction.instructionType !== expectedInstructionType) {
    throw new Error('invalid instruction; instruction type mismatch');
  }
  return parsedInstruction as ParsedInstructionOfType<TInstructionType>;
}

/**
 * Factory class for transactions to interact with the System program
 */
export class SystemProgram {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the System program
   */
  static programId: PublicKey = SYSTEM_PROGRAM_ID;

  /**
   * Generate a transaction instruction that creates a new account
   */
  static createAccount(params: CreateAccountParams): TransactionInstruction {
    return fromKitInstruction(
      getCreateAccountInstruction({
        payer: createNoopSigner(params.fromPubkey.toAddress()),
        newAccount: createNoopSigner(params.newAccountPubkey.toAddress()),
        lamports: params.lamports,
        space: params.space,
        programAddress: params.programId.toAddress(),
      }),
    );
  }

  /**
   * Generate a transaction instruction that transfers lamports from one account to another
   */
  static transfer(
    params: TransferParams | TransferWithSeedParams,
  ): TransactionInstruction {
    if ('basePubkey' in params) {
      return fromKitInstruction(
        getTransferSolWithSeedInstruction({
          source: params.fromPubkey.toAddress(),
          baseAccount: createNoopSigner(params.basePubkey.toAddress()),
          destination: params.toPubkey.toAddress(),
          amount: BigInt(params.lamports),
          fromSeed: params.seed,
          fromOwner: params.programId.toAddress(),
        }),
      );
    } else {
      return fromKitInstruction(
        getTransferSolInstruction({
          source: createNoopSigner(params.fromPubkey.toAddress()),
          destination: params.toPubkey.toAddress(),
          amount: BigInt(params.lamports),
        }),
      );
    }
  }

  /**
   * Generate a transaction instruction that assigns an account to a program
   */
  static assign(
    params: AssignParams | AssignWithSeedParams,
  ): TransactionInstruction {
    if ('basePubkey' in params) {
      return fromKitInstruction(
        getAssignWithSeedInstruction({
          account: params.accountPubkey.toAddress(),
          baseAccount: createNoopSigner(params.basePubkey.toAddress()),
          base: params.basePubkey.toAddress(),
          seed: params.seed,
          programAddress: params.programId.toAddress(),
        }),
      );
    } else {
      return fromKitInstruction(
        getAssignInstruction({
          account: createNoopSigner(params.accountPubkey.toAddress()),
          programAddress: params.programId.toAddress(),
        }),
      );
    }
  }

  /**
   * Generate a transaction instruction that creates a new account at
   *   an address generated with `from`, a seed, and programId
   */
  static createAccountWithSeed(
    params: CreateAccountWithSeedParams,
  ): TransactionInstruction {
    return fromKitInstruction(
      getCreateAccountWithSeedInstruction({
        payer: createNoopSigner(params.fromPubkey.toAddress()),
        newAccount: params.newAccountPubkey.toAddress(),
        ...(params.basePubkey.equals(params.fromPubkey)
          ? {}
          : {baseAccount: createNoopSigner(params.basePubkey.toAddress())}),
        base: params.basePubkey.toAddress(),
        seed: params.seed,
        amount: params.lamports,
        space: params.space,
        programAddress: params.programId.toAddress(),
      }),
    );
  }

  /**
   * Generate a transaction that creates a new Nonce account
   */
  static createNonceAccount(
    params: CreateNonceAccountParams | CreateNonceAccountWithSeedParams,
  ): Transaction {
    const transaction = new Transaction();
    if ('basePubkey' in params && 'seed' in params) {
      transaction.add(
        SystemProgram.createAccountWithSeed({
          fromPubkey: params.fromPubkey,
          newAccountPubkey: params.noncePubkey,
          basePubkey: params.basePubkey,
          seed: params.seed,
          lamports: params.lamports,
          space: NONCE_ACCOUNT_LENGTH,
          programId: this.programId,
        }),
      );
    } else {
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: params.fromPubkey,
          newAccountPubkey: params.noncePubkey,
          lamports: params.lamports,
          space: NONCE_ACCOUNT_LENGTH,
          programId: this.programId,
        }),
      );
    }

    const initParams = {
      noncePubkey: params.noncePubkey,
      authorizedPubkey: params.authorizedPubkey,
    };

    transaction.add(this.nonceInitialize(initParams));
    return transaction;
  }

  /**
   * Generate an instruction to initialize a Nonce account
   */
  static nonceInitialize(
    params: InitializeNonceParams,
  ): TransactionInstruction {
    return fromKitInstruction(
      getInitializeNonceAccountInstruction({
        nonceAccount: params.noncePubkey.toAddress(),
        recentBlockhashesSysvar: SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toAddress(),
        rentSysvar: SYSVAR_RENT_PUBKEY.toAddress(),
        nonceAuthority: params.authorizedPubkey.toAddress(),
      }),
    );
  }

  /**
   * Generate an instruction to advance the nonce in a Nonce account
   */
  static nonceAdvance(params: AdvanceNonceParams): TransactionInstruction {
    return fromKitInstruction(
      getAdvanceNonceAccountInstruction({
        nonceAccount: params.noncePubkey.toAddress(),
        recentBlockhashesSysvar: SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toAddress(),
        nonceAuthority: createNoopSigner(params.authorizedPubkey.toAddress()),
      }),
    );
  }

  /**
   * Generate a transaction instruction that withdraws lamports from a Nonce account
   */
  static nonceWithdraw(params: WithdrawNonceParams): TransactionInstruction {
    return fromKitInstruction(
      getWithdrawNonceAccountInstruction({
        nonceAccount: params.noncePubkey.toAddress(),
        recipientAccount: params.toPubkey.toAddress(),
        recentBlockhashesSysvar: SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toAddress(),
        rentSysvar: SYSVAR_RENT_PUBKEY.toAddress(),
        nonceAuthority: createNoopSigner(params.authorizedPubkey.toAddress()),
        withdrawAmount: params.lamports,
      }),
    );
  }

  /**
   * Generate a transaction instruction that authorizes a new PublicKey as the authority
   * on a Nonce account.
   */
  static nonceAuthorize(params: AuthorizeNonceParams): TransactionInstruction {
    return fromKitInstruction(
      getAuthorizeNonceAccountInstruction({
        nonceAccount: params.noncePubkey.toAddress(),
        nonceAuthority: createNoopSigner(params.authorizedPubkey.toAddress()),
        newNonceAuthority: params.newAuthorizedPubkey.toAddress(),
      }),
    );
  }

  /**
   * Generate a transaction instruction that allocates space in an account without funding
   */
  static allocate(
    params: AllocateParams | AllocateWithSeedParams,
  ): TransactionInstruction {
    if ('basePubkey' in params) {
      return fromKitInstruction(
        getAllocateWithSeedInstruction({
          newAccount: params.accountPubkey.toAddress(),
          baseAccount: createNoopSigner(params.basePubkey.toAddress()),
          base: params.basePubkey.toAddress(),
          seed: params.seed,
          space: params.space,
          programAddress: params.programId.toAddress(),
        }),
      );
    } else {
      return fromKitInstruction(
        getAllocateInstruction({
          newAccount: createNoopSigner(params.accountPubkey.toAddress()),
          space: params.space,
        }),
      );
    }
  }
}
