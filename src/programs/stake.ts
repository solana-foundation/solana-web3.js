import {fixCodecSize, transformCodec} from '@solana/codecs-core';
import {getBytesCodec, getStructCodec} from '@solana/codecs-data-structures';
import {getI64Codec, getU32Codec} from '@solana/codecs-numbers';

import {RUST_STRING_CODEC} from '../codecs';
import {ProgramInstructions} from '../instruction';
import {Address} from '../address';
import {SystemProgram} from './system';
import {
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
} from '../sysvar';
import {Transaction, TransactionInstruction} from '../transaction';

/**
 * Address of the stake config account which configures the rate
 * of stake warmup and cooldown as well as the slashing penalty.
 */
export const STAKE_CONFIG_ID = new Address(
  'StakeConfig11111111111111111111111111111111',
);

const STAKE_PROGRAM_ID = new Address(
  'Stake11111111111111111111111111111111111111',
);

const U32_CODEC = getU32Codec();
const I64_NUMBER_CODEC = transformCodec(
  getI64Codec(),
  (value: number) => BigInt(value),
  (value: bigint) => Number(value),
);
const PUBLIC_KEY_BYTES_CODEC = transformCodec(
  fixCodecSize(getBytesCodec(), 32),
  (value: Uint8Array) => value,
  value => new Uint8Array(value),
);
const AUTHORIZED_CODEC = getStructCodec([
  ['staker', PUBLIC_KEY_BYTES_CODEC],
  ['withdrawer', PUBLIC_KEY_BYTES_CODEC],
]);
const LOCKUP_CODEC = getStructCodec([
  ['unixTimestamp', I64_NUMBER_CODEC],
  ['epoch', I64_NUMBER_CODEC],
  ['custodian', PUBLIC_KEY_BYTES_CODEC],
]);

/**
 * Stake account authority info
 */
export class Authorized {
  /** stake authority */
  staker: Address;
  /** withdraw authority */
  withdrawer: Address;

  /**
   * Create a new Authorized object
   * @param staker the stake authority
   * @param withdrawer the withdraw authority
   */
  constructor(staker: Address, withdrawer: Address) {
    this.staker = staker;
    this.withdrawer = withdrawer;
  }
}

/**
 * Stake account lockup info
 */
export class Lockup {
  /** Unix timestamp of lockup expiration */
  unixTimestamp: number;
  /** Epoch of lockup expiration */
  epoch: number;
  /** Lockup custodian authority */
  custodian: Address;

  /**
   * Create a new Lockup object
   */
  constructor(unixTimestamp: number, epoch: number, custodian: Address) {
    this.unixTimestamp = unixTimestamp;
    this.epoch = epoch;
    this.custodian = custodian;
  }

  /**
   * Default, inactive Lockup value
   */
  static default: Lockup = new Lockup(0, 0, Address.default);
}

/**
 * Create stake account transaction params
 */
export type CreateStakeAccountParams = {
  /** Address of the account which will fund creation */
  fromPubkey: Address;
  /** Address of the new stake account */
  stakePubkey: Address;
  /** Authorities of the new stake account */
  authorized: Authorized;
  /** Lockup of the new stake account */
  lockup?: Lockup;
  /** Funding amount */
  lamports: number;
};

/**
 * Create stake account with seed transaction params
 */
export type CreateStakeAccountWithSeedParams = {
  fromPubkey: Address;
  stakePubkey: Address;
  basePubkey: Address;
  seed: string;
  authorized: Authorized;
  lockup?: Lockup;
  lamports: number;
};

/**
 * Initialize stake instruction params
 */
export type InitializeStakeParams = {
  stakePubkey: Address;
  authorized: Authorized;
  lockup?: Lockup;
};

/**
 * Delegate stake instruction params
 */
export type DelegateStakeParams = {
  stakePubkey: Address;
  authorizedPubkey: Address;
  votePubkey: Address;
};

/**
 * Authorize stake instruction params
 */
export type AuthorizeStakeParams = {
  stakePubkey: Address;
  authorizedPubkey: Address;
  newAuthorizedPubkey: Address;
  stakeAuthorizationType: StakeAuthorizationType;
  custodianPubkey?: Address;
};

/**
 * Authorize stake instruction params using a derived key
 */
export type AuthorizeWithSeedStakeParams = {
  stakePubkey: Address;
  authorityBase: Address;
  authoritySeed: string;
  authorityOwner: Address;
  newAuthorizedPubkey: Address;
  stakeAuthorizationType: StakeAuthorizationType;
  custodianPubkey?: Address;
};

/**
 * Split stake instruction params
 */
export type SplitStakeParams = {
  stakePubkey: Address;
  authorizedPubkey: Address;
  splitStakePubkey: Address;
  lamports: number;
};

/**
 * Split with seed transaction params
 */
export type SplitStakeWithSeedParams = {
  stakePubkey: Address;
  authorizedPubkey: Address;
  splitStakePubkey: Address;
  basePubkey: Address;
  seed: string;
  lamports: number;
};

/**
 * Withdraw stake instruction params
 */
export type WithdrawStakeParams = {
  stakePubkey: Address;
  authorizedPubkey: Address;
  toPubkey: Address;
  lamports: number;
  custodianPubkey?: Address;
};

/**
 * Deactivate stake instruction params
 */
export type DeactivateStakeParams = {
  stakePubkey: Address;
  authorizedPubkey: Address;
};

/**
 * Merge stake instruction params
 */
export type MergeStakeParams = {
  stakePubkey: Address;
  sourceStakePubKey: Address;
  authorizedPubkey: Address;
};

/**
 * Stake Instruction class
 */
export class StakeInstruction {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Decode a stake instruction and retrieve the instruction type.
   */
  static decodeInstructionType(
    instruction: TransactionInstruction,
  ): StakeInstructionType {
    this.checkProgramId(instruction.programId);

    return INSTRUCTIONS.getInstructionType(instruction) as StakeInstructionType;
  }

  /**
   * Decode a initialize stake instruction and retrieve the instruction params.
   */
  static decodeInitialize(
    instruction: TransactionInstruction,
  ): InitializeStakeParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);

    const {authorized, lockup} = INSTRUCTIONS.Initialize.decode(instruction);

    return {
      stakePubkey: instruction.keys[0].pubkey,
      authorized: new Authorized(
        new Address(authorized.staker),
        new Address(authorized.withdrawer),
      ),
      lockup: new Lockup(
        lockup.unixTimestamp,
        lockup.epoch,
        new Address(lockup.custodian),
      ),
    };
  }

  /**
   * Decode a delegate stake instruction and retrieve the instruction params.
   */
  static decodeDelegate(
    instruction: TransactionInstruction,
  ): DelegateStakeParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 6);
    INSTRUCTIONS.Delegate.decode(instruction);

    return {
      stakePubkey: instruction.keys[0].pubkey,
      votePubkey: instruction.keys[1].pubkey,
      authorizedPubkey: instruction.keys[5].pubkey,
    };
  }

  /**
   * Decode an authorize stake instruction and retrieve the instruction params.
   */
  static decodeAuthorize(
    instruction: TransactionInstruction,
  ): AuthorizeStakeParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    const {newAuthorized, stakeAuthorizationType} =
      INSTRUCTIONS.Authorize.decode(instruction);

    const o: AuthorizeStakeParams = {
      stakePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: instruction.keys[2].pubkey,
      newAuthorizedPubkey: new Address(newAuthorized),
      stakeAuthorizationType: {
        index: stakeAuthorizationType,
      },
    };
    if (instruction.keys.length > 3) {
      o.custodianPubkey = instruction.keys[3].pubkey;
    }
    return o;
  }

  /**
   * Decode an authorize-with-seed stake instruction and retrieve the instruction params.
   */
  static decodeAuthorizeWithSeed(
    instruction: TransactionInstruction,
  ): AuthorizeWithSeedStakeParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);

    const {
      newAuthorized,
      stakeAuthorizationType,
      authoritySeed,
      authorityOwner,
    } = INSTRUCTIONS.AuthorizeWithSeed.decode(instruction);

    const o: AuthorizeWithSeedStakeParams = {
      stakePubkey: instruction.keys[0].pubkey,
      authorityBase: instruction.keys[1].pubkey,
      authoritySeed: authoritySeed,
      authorityOwner: new Address(authorityOwner),
      newAuthorizedPubkey: new Address(newAuthorized),
      stakeAuthorizationType: {
        index: stakeAuthorizationType,
      },
    };
    if (instruction.keys.length > 3) {
      o.custodianPubkey = instruction.keys[3].pubkey;
    }
    return o;
  }

  /**
   * Decode a split stake instruction and retrieve the instruction params.
   */
  static decodeSplit(instruction: TransactionInstruction): SplitStakeParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    const {lamports} = INSTRUCTIONS.Split.decode(instruction);

    return {
      stakePubkey: instruction.keys[0].pubkey,
      splitStakePubkey: instruction.keys[1].pubkey,
      authorizedPubkey: instruction.keys[2].pubkey,
      lamports,
    };
  }

  /**
   * Decode a merge stake instruction and retrieve the instruction params.
   */
  static decodeMerge(instruction: TransactionInstruction): MergeStakeParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    INSTRUCTIONS.Merge.decode(instruction);

    return {
      stakePubkey: instruction.keys[0].pubkey,
      sourceStakePubKey: instruction.keys[1].pubkey,
      authorizedPubkey: instruction.keys[4].pubkey,
    };
  }

  /**
   * Decode a withdraw stake instruction and retrieve the instruction params.
   */
  static decodeWithdraw(
    instruction: TransactionInstruction,
  ): WithdrawStakeParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 5);
    const {lamports} = INSTRUCTIONS.Withdraw.decode(instruction);

    const o: WithdrawStakeParams = {
      stakePubkey: instruction.keys[0].pubkey,
      toPubkey: instruction.keys[1].pubkey,
      authorizedPubkey: instruction.keys[4].pubkey,
      lamports,
    };
    if (instruction.keys.length > 5) {
      o.custodianPubkey = instruction.keys[5].pubkey;
    }
    return o;
  }

  /**
   * Decode a deactivate stake instruction and retrieve the instruction params.
   */
  static decodeDeactivate(
    instruction: TransactionInstruction,
  ): DeactivateStakeParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);
    INSTRUCTIONS.Deactivate.decode(instruction);

    return {
      stakePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: instruction.keys[2].pubkey,
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId: Address) {
    if (!programId.equals(StakeProgram.programId)) {
      throw new Error('invalid instruction; programId is not StakeProgram');
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
 * An enumeration of valid StakeInstructionType's
 */
export type StakeInstructionType =
  // FIXME
  // It would be preferable for this type to be derived from the internal instruction input map
  // but Typedoc does not transpile `keyof` expressions.
  // See https://github.com/TypeStrong/typedoc/issues/1894
  | 'Authorize'
  | 'AuthorizeWithSeed'
  | 'Deactivate'
  | 'Delegate'
  | 'Initialize'
  | 'Merge'
  | 'Split'
  | 'Withdraw';

/**
 * @internal
 */
export const STAKE_INSTRUCTIONS = ProgramInstructions.create({
  programId: STAKE_PROGRAM_ID,
  instructionIndexCodec: U32_CODEC,
  instructions: {
    Initialize: {
      index: 0,
      codec: getStructCodec([
        ['instruction', U32_CODEC],
        ['authorized', AUTHORIZED_CODEC],
        ['lockup', LOCKUP_CODEC],
      ]),
    },
    Authorize: {
      index: 1,
      codec: getStructCodec([
        ['instruction', U32_CODEC],
        ['newAuthorized', PUBLIC_KEY_BYTES_CODEC],
        ['stakeAuthorizationType', U32_CODEC],
      ]),
    },
    Delegate: {
      index: 2,
      codec: getStructCodec([['instruction', U32_CODEC]]),
    },
    Split: {
      index: 3,
      codec: getStructCodec([
        ['instruction', U32_CODEC],
        ['lamports', I64_NUMBER_CODEC],
      ]),
    },
    Withdraw: {
      index: 4,
      codec: getStructCodec([
        ['instruction', U32_CODEC],
        ['lamports', I64_NUMBER_CODEC],
      ]),
    },
    Deactivate: {
      index: 5,
      codec: getStructCodec([['instruction', U32_CODEC]]),
    },
    Merge: {
      index: 7,
      codec: getStructCodec([['instruction', U32_CODEC]]),
    },
    AuthorizeWithSeed: {
      index: 8,
      codec: getStructCodec([
        ['instruction', U32_CODEC],
        ['newAuthorized', PUBLIC_KEY_BYTES_CODEC],
        ['stakeAuthorizationType', U32_CODEC],
        ['authoritySeed', RUST_STRING_CODEC],
        ['authorityOwner', PUBLIC_KEY_BYTES_CODEC],
      ]),
    },
  },
});
const INSTRUCTIONS = STAKE_INSTRUCTIONS;

/**
 * Stake authorization type
 */
export type StakeAuthorizationType = {
  /** The Stake Authorization index (from solana-stake-program) */
  index: number;
};

/**
 * An enumeration of valid StakeAuthorizationLayout's
 */
export const StakeAuthorizationLayout = Object.freeze({
  Staker: {
    index: 0,
  },
  Withdrawer: {
    index: 1,
  },
});

/**
 * Factory class for transactions to interact with the Stake program
 */
export class StakeProgram {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the Stake program
   */
  static programId: Address = STAKE_PROGRAM_ID;

  /**
   * Max space of a Stake account
   *
   * This is generated from the solana-stake-program StakeState struct as
   * `StakeStateV2::size_of()`:
   * https://docs.rs/solana-stake-program/latest/solana_stake_program/stake_state/enum.StakeStateV2.html
   */
  static space: number = 200;

  /**
   * Generate an Initialize instruction to add to a Stake Create transaction
   */
  static initialize(params: InitializeStakeParams): TransactionInstruction {
    const {stakePubkey, authorized, lockup: maybeLockup} = params;
    const lockup: Lockup = maybeLockup || Lockup.default;
    return INSTRUCTIONS.Initialize.build(
      {
        authorized: {
          staker: authorized.staker.toBytes(),
          withdrawer: authorized.withdrawer.toBytes(),
        },
        lockup: {
          unixTimestamp: lockup.unixTimestamp,
          epoch: lockup.epoch,
          custodian: lockup.custodian.toBytes(),
        },
      },
      {
        keys: [
          {pubkey: stakePubkey, isSigner: false, isWritable: true},
          {pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
        ],
        programId: this.programId,
      },
    );
  }

  /**
   * Generate a Transaction that creates a new Stake account at
   *   an address generated with `from`, a seed, and the Stake programId
   */
  static createAccountWithSeed(
    params: CreateStakeAccountWithSeedParams,
  ): Transaction {
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.createAccountWithSeed({
        fromPubkey: params.fromPubkey,
        newAccountPubkey: params.stakePubkey,
        basePubkey: params.basePubkey,
        seed: params.seed,
        lamports: params.lamports,
        space: this.space,
        programId: this.programId,
      }),
    );

    const {stakePubkey, authorized, lockup} = params;
    return transaction.add(this.initialize({stakePubkey, authorized, lockup}));
  }

  /**
   * Generate a Transaction that creates a new Stake account
   */
  static createAccount(params: CreateStakeAccountParams): Transaction {
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: params.fromPubkey,
        newAccountPubkey: params.stakePubkey,
        lamports: params.lamports,
        space: this.space,
        programId: this.programId,
      }),
    );

    const {stakePubkey, authorized, lockup} = params;
    return transaction.add(this.initialize({stakePubkey, authorized, lockup}));
  }

  /**
   * Generate a Transaction that delegates Stake tokens to a validator
   * Vote Address. This transaction can also be used to redelegate Stake
   * to a new validator Vote Address.
   */
  static delegate(params: DelegateStakeParams): Transaction {
    const {stakePubkey, authorizedPubkey, votePubkey} = params;

    return new Transaction().add(
      INSTRUCTIONS.Delegate.build(undefined, {
        keys: [
          {pubkey: stakePubkey, isSigner: false, isWritable: true},
          {pubkey: votePubkey, isSigner: false, isWritable: false},
          {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
          {
            pubkey: SYSVAR_STAKE_HISTORY_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {pubkey: STAKE_CONFIG_ID, isSigner: false, isWritable: false},
          {pubkey: authorizedPubkey, isSigner: true, isWritable: false},
        ],
        programId: this.programId,
      }),
    );
  }

  /**
   * Generate a Transaction that authorizes a new Address as Staker
   * or Withdrawer on the Stake account.
   */
  static authorize(params: AuthorizeStakeParams): Transaction {
    const {
      stakePubkey,
      authorizedPubkey,
      newAuthorizedPubkey,
      stakeAuthorizationType,
      custodianPubkey,
    } = params;

    const keys = [
      {pubkey: stakePubkey, isSigner: false, isWritable: true},
      {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: true},
      {pubkey: authorizedPubkey, isSigner: true, isWritable: false},
    ];
    if (custodianPubkey) {
      keys.push({
        pubkey: custodianPubkey,
        isSigner: true,
        isWritable: false,
      });
    }
    return new Transaction().add(
      INSTRUCTIONS.Authorize.build(
        {
          newAuthorized: newAuthorizedPubkey.toBytes(),
          stakeAuthorizationType: stakeAuthorizationType.index,
        },
        {keys, programId: this.programId},
      ),
    );
  }

  /**
   * Generate a Transaction that authorizes a new Address as Staker
   * or Withdrawer on the Stake account.
   */
  static authorizeWithSeed(params: AuthorizeWithSeedStakeParams): Transaction {
    const {
      stakePubkey,
      authorityBase,
      authoritySeed,
      authorityOwner,
      newAuthorizedPubkey,
      stakeAuthorizationType,
      custodianPubkey,
    } = params;

    const keys = [
      {pubkey: stakePubkey, isSigner: false, isWritable: true},
      {pubkey: authorityBase, isSigner: true, isWritable: false},
      {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
    ];
    if (custodianPubkey) {
      keys.push({
        pubkey: custodianPubkey,
        isSigner: true,
        isWritable: false,
      });
    }
    return new Transaction().add(
      INSTRUCTIONS.AuthorizeWithSeed.build(
        {
          newAuthorized: newAuthorizedPubkey.toBytes(),
          stakeAuthorizationType: stakeAuthorizationType.index,
          authoritySeed: authoritySeed,
          authorityOwner: authorityOwner.toBytes(),
        },
        {keys, programId: this.programId},
      ),
    );
  }

  /**
   * @internal
   */
  static splitInstruction(params: SplitStakeParams): TransactionInstruction {
    const {stakePubkey, authorizedPubkey, splitStakePubkey, lamports} = params;
    return INSTRUCTIONS.Split.build(
      {lamports},
      {
        keys: [
          {pubkey: stakePubkey, isSigner: false, isWritable: true},
          {pubkey: splitStakePubkey, isSigner: false, isWritable: true},
          {pubkey: authorizedPubkey, isSigner: true, isWritable: false},
        ],
        programId: this.programId,
      },
    );
  }

  /**
   * Generate a Transaction that splits Stake tokens into another stake account
   */
  static split(
    params: SplitStakeParams,
    // Compute the cost of allocating the new stake account in lamports
    rentExemptReserve: number,
  ): Transaction {
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: params.authorizedPubkey,
        newAccountPubkey: params.splitStakePubkey,
        lamports: rentExemptReserve,
        space: this.space,
        programId: this.programId,
      }),
    );
    return transaction.add(this.splitInstruction(params));
  }

  /**
   * Generate a Transaction that splits Stake tokens into another account
   * derived from a base public key and seed
   */
  static splitWithSeed(
    params: SplitStakeWithSeedParams,
    // If this stake account is new, compute the cost of allocating it in lamports
    rentExemptReserve?: number,
  ): Transaction {
    const {
      stakePubkey,
      authorizedPubkey,
      splitStakePubkey,
      basePubkey,
      seed,
      lamports,
    } = params;
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.allocate({
        accountPubkey: splitStakePubkey,
        basePubkey,
        seed,
        space: this.space,
        programId: this.programId,
      }),
    );
    if (rentExemptReserve && rentExemptReserve > 0) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: params.authorizedPubkey,
          toPubkey: splitStakePubkey,
          lamports: rentExemptReserve,
        }),
      );
    }
    return transaction.add(
      this.splitInstruction({
        stakePubkey,
        authorizedPubkey,
        splitStakePubkey,
        lamports,
      }),
    );
  }

  /**
   * Generate a Transaction that merges Stake accounts.
   */
  static merge(params: MergeStakeParams): Transaction {
    const {stakePubkey, sourceStakePubKey, authorizedPubkey} = params;

    return new Transaction().add(
      INSTRUCTIONS.Merge.build(undefined, {
        keys: [
          {pubkey: stakePubkey, isSigner: false, isWritable: true},
          {pubkey: sourceStakePubKey, isSigner: false, isWritable: true},
          {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
          {
            pubkey: SYSVAR_STAKE_HISTORY_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {pubkey: authorizedPubkey, isSigner: true, isWritable: false},
        ],
        programId: this.programId,
      }),
    );
  }

  /**
   * Generate a Transaction that withdraws deactivated Stake tokens.
   */
  static withdraw(params: WithdrawStakeParams): Transaction {
    const {stakePubkey, authorizedPubkey, toPubkey, lamports, custodianPubkey} =
      params;
    const keys = [
      {pubkey: stakePubkey, isSigner: false, isWritable: true},
      {pubkey: toPubkey, isSigner: false, isWritable: true},
      {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
      {
        pubkey: SYSVAR_STAKE_HISTORY_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
      {pubkey: authorizedPubkey, isSigner: true, isWritable: false},
    ];
    if (custodianPubkey) {
      keys.push({
        pubkey: custodianPubkey,
        isSigner: true,
        isWritable: false,
      });
    }
    return new Transaction().add(
      INSTRUCTIONS.Withdraw.build(
        {lamports},
        {keys, programId: this.programId},
      ),
    );
  }

  /**
   * Generate a Transaction that deactivates Stake tokens.
   */
  static deactivate(params: DeactivateStakeParams): Transaction {
    const {stakePubkey, authorizedPubkey} = params;

    return new Transaction().add(
      INSTRUCTIONS.Deactivate.build(undefined, {
        keys: [
          {pubkey: stakePubkey, isSigner: false, isWritable: true},
          {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
          {pubkey: authorizedPubkey, isSigner: true, isWritable: false},
        ],
        programId: this.programId,
      }),
    );
  }
}
