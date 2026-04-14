import {
  fixCodecSize,
  transformCodec,
} from '@solana/codecs-core';
import {getBytesCodec, getStructCodec} from '@solana/codecs-data-structures';
import {getI64Codec, getU32Codec, getU64Codec} from '@solana/codecs-numbers';

import {RUST_STRING_CODEC} from '../codecs';
import {ProgramInstructions} from '../instruction';
import {NONCE_ACCOUNT_LENGTH} from '../nonce-account';
import {Address} from '../address';
import {SYSVAR_RECENT_BLOCKHASHES_PUBKEY, SYSVAR_RENT_PUBKEY} from '../sysvar';
import {Transaction, TransactionInstruction} from '../transaction';

const SYSTEM_PROGRAM_ID = new Address('11111111111111111111111111111111');

const U32_CODEC = getU32Codec();
const U64_CODEC = getU64Codec();
const I64_NUMBER_CODEC = transformCodec(
  getI64Codec(),
  (value: number) => BigInt(value),
  (value: bigint) => Number(value),
);

const PUBLIC_KEY_BYTES_CODEC = fixCodecSize(getBytesCodec(), 32);

/**
 * Create account system transaction params
 */
export type CreateAccountParams = {
  /** The account that will transfer lamports to the created account */
  fromPubkey: Address;
  /** Public key of the created account */
  newAccountPubkey: Address;
  /** Amount of lamports to transfer to the created account */
  lamports: number;
  /** Amount of space in bytes to allocate to the created account */
  space: number;
  /** Public key of the program to assign as the owner of the created account */
  programId: Address;
};

/**
 * Transfer system transaction params
 */
export type TransferParams = {
  /** Account that will transfer lamports */
  fromPubkey: Address;
  /** Account that will receive transferred lamports */
  toPubkey: Address;
  /** Amount of lamports to transfer */
  lamports: number | bigint;
};

/**
 * Assign system transaction params
 */
export type AssignParams = {
  /** Public key of the account which will be assigned a new owner */
  accountPubkey: Address;
  /** Public key of the program to assign as the owner */
  programId: Address;
};

/**
 * Create account with seed system transaction params
 */
export type CreateAccountWithSeedParams = {
  /** The account that will transfer lamports to the created account */
  fromPubkey: Address;
  /** Public key of the created account. Must be pre-calculated with Address.createWithSeed() */
  newAccountPubkey: Address;
  /** Base public key to use to derive the address of the created account. Must be the same as the base key used to create `newAccountPubkey` */
  basePubkey: Address;
  /** Seed to use to derive the address of the created account. Must be the same as the seed used to create `newAccountPubkey` */
  seed: string;
  /** Amount of lamports to transfer to the created account */
  lamports: number;
  /** Amount of space in bytes to allocate to the created account */
  space: number;
  /** Public key of the program to assign as the owner of the created account */
  programId: Address;
};

/**
 * Create nonce account system transaction params
 */
export type CreateNonceAccountParams = {
  /** The account that will transfer lamports to the created nonce account */
  fromPubkey: Address;
  /** Public key of the created nonce account */
  noncePubkey: Address;
  /** Public key to set as authority of the created nonce account */
  authorizedPubkey: Address;
  /** Amount of lamports to transfer to the created nonce account */
  lamports: number;
};

/**
 * Create nonce account with seed system transaction params
 */
export type CreateNonceAccountWithSeedParams = {
  /** The account that will transfer lamports to the created nonce account */
  fromPubkey: Address;
  /** Public key of the created nonce account */
  noncePubkey: Address;
  /** Public key to set as authority of the created nonce account */
  authorizedPubkey: Address;
  /** Amount of lamports to transfer to the created nonce account */
  lamports: number;
  /** Base public key to use to derive the address of the nonce account */
  basePubkey: Address;
  /** Seed to use to derive the address of the nonce account */
  seed: string;
};

/**
 * Initialize nonce account system instruction params
 */
export type InitializeNonceParams = {
  /** Nonce account which will be initialized */
  noncePubkey: Address;
  /** Public key to set as authority of the initialized nonce account */
  authorizedPubkey: Address;
};

/**
 * Advance nonce account system instruction params
 */
export type AdvanceNonceParams = {
  /** Nonce account */
  noncePubkey: Address;
  /** Public key of the nonce authority */
  authorizedPubkey: Address;
};

/**
 * Withdraw nonce account system transaction params
 */
export type WithdrawNonceParams = {
  /** Nonce account */
  noncePubkey: Address;
  /** Public key of the nonce authority */
  authorizedPubkey: Address;
  /** Public key of the account which will receive the withdrawn nonce account balance */
  toPubkey: Address;
  /** Amount of lamports to withdraw from the nonce account */
  lamports: number;
};

/**
 * Authorize nonce account system transaction params
 */
export type AuthorizeNonceParams = {
  /** Nonce account */
  noncePubkey: Address;
  /** Public key of the current nonce authority */
  authorizedPubkey: Address;
  /** Public key to set as the new nonce authority */
  newAuthorizedPubkey: Address;
};

/**
 * Allocate account system transaction params
 */
export type AllocateParams = {
  /** Account to allocate */
  accountPubkey: Address;
  /** Amount of space in bytes to allocate */
  space: number;
};

/**
 * Allocate account with seed system transaction params
 */
export type AllocateWithSeedParams = {
  /** Account to allocate */
  accountPubkey: Address;
  /** Base public key to use to derive the address of the allocated account */
  basePubkey: Address;
  /** Seed to use to derive the address of the allocated account */
  seed: string;
  /** Amount of space in bytes to allocate */
  space: number;
  /** Public key of the program to assign as the owner of the allocated account */
  programId: Address;
};

/**
 * Assign account with seed system transaction params
 */
export type AssignWithSeedParams = {
  /** Public key of the account which will be assigned a new owner */
  accountPubkey: Address;
  /** Base public key to use to derive the address of the assigned account */
  basePubkey: Address;
  /** Seed to use to derive the address of the assigned account */
  seed: string;
  /** Public key of the program to assign as the owner */
  programId: Address;
};

/**
 * Transfer with seed system transaction params
 */
export type TransferWithSeedParams = {
  /** Account that will transfer lamports */
  fromPubkey: Address;
  /** Base public key to use to derive the funding account address */
  basePubkey: Address;
  /** Account that will receive transferred lamports */
  toPubkey: Address;
  /** Amount of lamports to transfer */
  lamports: number | bigint;
  /** Seed to use to derive the funding account address */
  seed: string;
  /** Program id to use to derive the funding account address */
  programId: Address;
};

/** Decoded transfer system transaction instruction */
export type DecodedTransferInstruction = {
  /** Account that will transfer lamports */
  fromPubkey: Address;
  /** Account that will receive transferred lamports */
  toPubkey: Address;
  /** Amount of lamports to transfer */
  lamports: bigint;
};

/** Decoded transferWithSeed system transaction instruction */
export type DecodedTransferWithSeedInstruction = {
  /** Account that will transfer lamports */
  fromPubkey: Address;
  /** Base public key to use to derive the funding account address */
  basePubkey: Address;
  /** Account that will receive transferred lamports */
  toPubkey: Address;
  /** Amount of lamports to transfer */
  lamports: bigint;
  /** Seed to use to derive the funding account address */
  seed: string;
  /** Program id to use to derive the funding account address */
  programId: Address;
};

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

    return INSTRUCTIONS.getInstructionType(
      instruction,
    ) as SystemInstructionType;
  }

  /**
   * Decode a create account system instruction and retrieve the instruction params.
   */
  static decodeCreateAccount(
    instruction: TransactionInstruction,
  ): CreateAccountParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);

    const {lamports, space, programId} =
      INSTRUCTIONS.Create.decode(instruction);

    return {
      fromPubkey: instruction.keys[0].pubkey,
      newAccountPubkey: instruction.keys[1].pubkey,
      lamports,
      space,
      programId: new Address(programId),
    };
  }

  /**
   * Decode a transfer system instruction and retrieve the instruction params.
   */
  static decodeTransfer(
    instruction: TransactionInstruction,
  ): DecodedTransferInstruction {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);

    const {lamports} = INSTRUCTIONS.Transfer.decode(instruction);

    return {
      fromPubkey: instruction.keys[0].pubkey,
      toPubkey: instruction.keys[1].pubkey,
      lamports,
    };
  }

  /**
   * Decode a transfer with seed system instruction and retrieve the instruction params.
   */
  static decodeTransferWithSeed(
    instruction: TransactionInstruction,
  ): DecodedTransferWithSeedInstruction {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);

    const {lamports, seed, programId} =
      INSTRUCTIONS.TransferWithSeed.decode(instruction);

    return {
      fromPubkey: instruction.keys[0].pubkey,
      basePubkey: instruction.keys[1].pubkey,
      toPubkey: instruction.keys[2].pubkey,
      lamports,
      seed,
      programId: new Address(programId),
    };
  }

  /**
   * Decode an allocate system instruction and retrieve the instruction params.
   */
  static decodeAllocate(instruction: TransactionInstruction): AllocateParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);

    const {space} = INSTRUCTIONS.Allocate.decode(instruction);

    return {
      accountPubkey: instruction.keys[0].pubkey,
      space,
    };
  }

  /**
   * Decode an allocate with seed system instruction and retrieve the instruction params.
   */
  static decodeAllocateWithSeed(
    instruction: TransactionInstruction,
  ): AllocateWithSeedParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);

    const {base, seed, space, programId} =
      INSTRUCTIONS.AllocateWithSeed.decode(instruction);

    return {
      accountPubkey: instruction.keys[0].pubkey,
      basePubkey: new Address(base),
      seed,
      space,
      programId: new Address(programId),
    };
  }

  /**
   * Decode an assign system instruction and retrieve the instruction params.
   */
  static decodeAssign(instruction: TransactionInstruction): AssignParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);

    const {programId} = INSTRUCTIONS.Assign.decode(instruction);

    return {
      accountPubkey: instruction.keys[0].pubkey,
      programId: new Address(programId),
    };
  }

  /**
   * Decode an assign with seed system instruction and retrieve the instruction params.
   */
  static decodeAssignWithSeed(
    instruction: TransactionInstruction,
  ): AssignWithSeedParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);

    const {base, seed, programId} =
      INSTRUCTIONS.AssignWithSeed.decode(instruction);

    return {
      accountPubkey: instruction.keys[0].pubkey,
      basePubkey: new Address(base),
      seed,
      programId: new Address(programId),
    };
  }

  /**
   * Decode a create account with seed system instruction and retrieve the instruction params.
   */
  static decodeCreateWithSeed(
    instruction: TransactionInstruction,
  ): CreateAccountWithSeedParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);

    const {base, seed, lamports, space, programId} =
      INSTRUCTIONS.CreateWithSeed.decode(instruction);

    return {
      fromPubkey: instruction.keys[0].pubkey,
      newAccountPubkey: instruction.keys[1].pubkey,
      basePubkey: new Address(base),
      seed,
      lamports,
      space,
      programId: new Address(programId),
    };
  }

  /**
   * Decode a nonce initialize system instruction and retrieve the instruction params.
   */
  static decodeNonceInitialize(
    instruction: TransactionInstruction,
  ): InitializeNonceParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);

    const {authorized} =
      INSTRUCTIONS.InitializeNonceAccount.decode(instruction);

    return {
      noncePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: new Address(authorized),
    };
  }

  /**
   * Decode a nonce advance system instruction and retrieve the instruction params.
   */
  static decodeNonceAdvance(
    instruction: TransactionInstruction,
  ): AdvanceNonceParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);

    INSTRUCTIONS.AdvanceNonceAccount.decode(instruction);

    return {
      noncePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: instruction.keys[2].pubkey,
    };
  }

  /**
   * Decode a nonce withdraw system instruction and retrieve the instruction params.
   */
  static decodeNonceWithdraw(
    instruction: TransactionInstruction,
  ): WithdrawNonceParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 5);

    const {lamports} = INSTRUCTIONS.WithdrawNonceAccount.decode(instruction);

    return {
      noncePubkey: instruction.keys[0].pubkey,
      toPubkey: instruction.keys[1].pubkey,
      authorizedPubkey: instruction.keys[4].pubkey,
      lamports,
    };
  }

  /**
   * Decode a nonce authorize system instruction and retrieve the instruction params.
   */
  static decodeNonceAuthorize(
    instruction: TransactionInstruction,
  ): AuthorizeNonceParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);

    const {authorized} = INSTRUCTIONS.AuthorizeNonceAccount.decode(instruction);

    return {
      noncePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: instruction.keys[1].pubkey,
      newAuthorizedPubkey: new Address(authorized),
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId: Address) {
    if (!programId.equals(SystemProgram.programId)) {
      throw new Error('invalid instruction; programId is not SystemProgram');
    }
  }

  /**
   * @internal
   */
  static checkKeyLength(keys: Array<any>, expectedLength: number) {
    if (keys.length < expectedLength) {
      throw new Error(
        `invalid instruction; found ${keys.length} keys, expected at least ${expectedLength}`,
      );
    }
  }
}

/**
 * An enumeration of valid SystemInstructionType's
 */
export type SystemInstructionType =
  // FIXME
  // It would be preferable for this type to be derived from the internal instruction input map
  // but Typedoc does not transpile `keyof` expressions.
  // See https://github.com/TypeStrong/typedoc/issues/1894
  | 'AdvanceNonceAccount'
  | 'Allocate'
  | 'AllocateWithSeed'
  | 'Assign'
  | 'AssignWithSeed'
  | 'AuthorizeNonceAccount'
  | 'Create'
  | 'CreateWithSeed'
  | 'InitializeNonceAccount'
  | 'Transfer'
  | 'TransferWithSeed'
  | 'WithdrawNonceAccount'
  | 'UpgradeNonceAccount';

const INSTRUCTION_DEFS = {
  Create: {
    index: 0,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['lamports', I64_NUMBER_CODEC],
      ['space', I64_NUMBER_CODEC],
      ['programId', PUBLIC_KEY_BYTES_CODEC],
    ]),
  },
  Assign: {
    index: 1,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['programId', PUBLIC_KEY_BYTES_CODEC],
    ]),
  },
  Transfer: {
    index: 2,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['lamports', U64_CODEC],
    ]),
  },
  CreateWithSeed: {
    index: 3,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['base', PUBLIC_KEY_BYTES_CODEC],
      ['seed', RUST_STRING_CODEC],
      ['lamports', I64_NUMBER_CODEC],
      ['space', I64_NUMBER_CODEC],
      ['programId', PUBLIC_KEY_BYTES_CODEC],
    ]),
  },
  AdvanceNonceAccount: {
    index: 4,
    codec: getStructCodec([['instruction', U32_CODEC]]),
  },
  WithdrawNonceAccount: {
    index: 5,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['lamports', I64_NUMBER_CODEC],
    ]),
  },
  InitializeNonceAccount: {
    index: 6,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['authorized', PUBLIC_KEY_BYTES_CODEC],
    ]),
  },
  AuthorizeNonceAccount: {
    index: 7,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['authorized', PUBLIC_KEY_BYTES_CODEC],
    ]),
  },
  Allocate: {
    index: 8,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['space', I64_NUMBER_CODEC],
    ]),
  },
  AllocateWithSeed: {
    index: 9,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['base', PUBLIC_KEY_BYTES_CODEC],
      ['seed', RUST_STRING_CODEC],
      ['space', I64_NUMBER_CODEC],
      ['programId', PUBLIC_KEY_BYTES_CODEC],
    ]),
  },
  AssignWithSeed: {
    index: 10,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['base', PUBLIC_KEY_BYTES_CODEC],
      ['seed', RUST_STRING_CODEC],
      ['programId', PUBLIC_KEY_BYTES_CODEC],
    ]),
  },
  TransferWithSeed: {
    index: 11,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['lamports', U64_CODEC],
      ['seed', RUST_STRING_CODEC],
      ['programId', PUBLIC_KEY_BYTES_CODEC],
    ]),
  },
  UpgradeNonceAccount: {
    index: 12,
    codec: getStructCodec([['instruction', U32_CODEC]]),
  },
};

/**
 * @internal
 */
export const SYSTEM_INSTRUCTIONS = ProgramInstructions.create({
  programId: SYSTEM_PROGRAM_ID,
  instructionIndexCodec: U32_CODEC,
  instructions: INSTRUCTION_DEFS,
});
const INSTRUCTIONS = SYSTEM_INSTRUCTIONS;

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
  static programId: Address = SYSTEM_PROGRAM_ID;

  /**
   * Generate a transaction instruction that creates a new account
   */
  static createAccount(params: CreateAccountParams): TransactionInstruction {
    return INSTRUCTIONS.Create.build(
      {
        lamports: params.lamports,
        space: params.space,
        programId: params.programId.toBytes(),
      },
      {
        keys: [
          {pubkey: params.fromPubkey, isSigner: true, isWritable: true},
          {pubkey: params.newAccountPubkey, isSigner: true, isWritable: true},
        ],
        programId: this.programId,
      },
    );
  }

  /**
   * Generate a transaction instruction that transfers lamports from one account to another
   */
  static transfer(
    params: TransferParams | TransferWithSeedParams,
  ): TransactionInstruction {
    let keys;
    if ('basePubkey' in params) {
      keys = [
        {pubkey: params.fromPubkey, isSigner: false, isWritable: true},
        {pubkey: params.basePubkey, isSigner: true, isWritable: false},
        {pubkey: params.toPubkey, isSigner: false, isWritable: true},
      ];
      return INSTRUCTIONS.TransferWithSeed.build(
        {
          lamports: BigInt(params.lamports),
          seed: params.seed,
          programId: params.programId.toBytes(),
        },
        {keys, programId: this.programId},
      );
    } else {
      keys = [
        {pubkey: params.fromPubkey, isSigner: true, isWritable: true},
        {pubkey: params.toPubkey, isSigner: false, isWritable: true},
      ];
      return INSTRUCTIONS.Transfer.build(
        {lamports: BigInt(params.lamports)},
        {keys, programId: this.programId},
      );
    }
  }

  /**
   * Generate a transaction instruction that assigns an account to a program
   */
  static assign(
    params: AssignParams | AssignWithSeedParams,
  ): TransactionInstruction {
    let keys;
    if ('basePubkey' in params) {
      keys = [
        {pubkey: params.accountPubkey, isSigner: false, isWritable: true},
        {pubkey: params.basePubkey, isSigner: true, isWritable: false},
      ];
      return INSTRUCTIONS.AssignWithSeed.build(
        {
          base: params.basePubkey.toBytes(),
          seed: params.seed,
          programId: params.programId.toBytes(),
        },
        {keys, programId: this.programId},
      );
    } else {
      keys = [{pubkey: params.accountPubkey, isSigner: true, isWritable: true}];
      return INSTRUCTIONS.Assign.build(
        {
          programId: params.programId.toBytes(),
        },
        {keys, programId: this.programId},
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
    const keys = [
      {pubkey: params.fromPubkey, isSigner: true, isWritable: true},
      {pubkey: params.newAccountPubkey, isSigner: false, isWritable: true},
    ];
    if (!params.basePubkey.equals(params.fromPubkey)) {
      keys.push({
        pubkey: params.basePubkey,
        isSigner: true,
        isWritable: false,
      });
    }

    return INSTRUCTIONS.CreateWithSeed.build(
      {
        base: params.basePubkey.toBytes(),
        seed: params.seed,
        lamports: params.lamports,
        space: params.space,
        programId: params.programId.toBytes(),
      },
      {keys, programId: this.programId},
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
    return INSTRUCTIONS.InitializeNonceAccount.build(
      {
        authorized: params.authorizedPubkey.toBytes(),
      },
      {
        keys: [
          {pubkey: params.noncePubkey, isSigner: false, isWritable: true},
          {
            pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
        ],
        programId: this.programId,
      },
    );
  }

  /**
   * Generate an instruction to advance the nonce in a Nonce account
   */
  static nonceAdvance(params: AdvanceNonceParams): TransactionInstruction {
    return INSTRUCTIONS.AdvanceNonceAccount.build(undefined, {
      keys: [
        {pubkey: params.noncePubkey, isSigner: false, isWritable: true},
        {
          pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
          isSigner: false,
          isWritable: false,
        },
        {pubkey: params.authorizedPubkey, isSigner: true, isWritable: false},
      ],
      programId: this.programId,
    });
  }

  /**
   * Generate a transaction instruction that withdraws lamports from a Nonce account
   */
  static nonceWithdraw(params: WithdrawNonceParams): TransactionInstruction {
    return INSTRUCTIONS.WithdrawNonceAccount.build(
      {lamports: params.lamports},
      {
        keys: [
          {pubkey: params.noncePubkey, isSigner: false, isWritable: true},
          {pubkey: params.toPubkey, isSigner: false, isWritable: true},
          {
            pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {pubkey: params.authorizedPubkey, isSigner: true, isWritable: false},
        ],
        programId: this.programId,
      },
    );
  }

  /**
   * Generate a transaction instruction that authorizes a new Address as the authority
   * on a Nonce account.
   */
  static nonceAuthorize(params: AuthorizeNonceParams): TransactionInstruction {
    return INSTRUCTIONS.AuthorizeNonceAccount.build(
      {
        authorized: params.newAuthorizedPubkey.toBytes(),
      },
      {
        keys: [
          {pubkey: params.noncePubkey, isSigner: false, isWritable: true},
          {pubkey: params.authorizedPubkey, isSigner: true, isWritable: false},
        ],
        programId: this.programId,
      },
    );
  }

  /**
   * Generate a transaction instruction that allocates space in an account without funding
   */
  static allocate(
    params: AllocateParams | AllocateWithSeedParams,
  ): TransactionInstruction {
    let keys;
    if ('basePubkey' in params) {
      keys = [
        {pubkey: params.accountPubkey, isSigner: false, isWritable: true},
        {pubkey: params.basePubkey, isSigner: true, isWritable: false},
      ];
      return INSTRUCTIONS.AllocateWithSeed.build(
        {
          base: params.basePubkey.toBytes(),
          seed: params.seed,
          space: params.space,
          programId: params.programId.toBytes(),
        },
        {keys, programId: this.programId},
      );
    } else {
      keys = [{pubkey: params.accountPubkey, isSigner: true, isWritable: true}];
      return INSTRUCTIONS.Allocate.build(
        {space: params.space},
        {keys, programId: this.programId},
      );
    }
  }
}
