import {createNoopSigner} from '@solana/kit';
import {
  STAKE_PROGRAM_ADDRESS,
  getStakeStateAccountDecoder,
  getAuthorizeCheckedInstruction,
  getAuthorizeCheckedWithSeedInstruction,
  getAuthorizeInstruction,
  getAuthorizeWithSeedInstruction,
  getDeactivateDelinquentInstruction,
  getDeactivateInstruction,
  getDelegateStakeInstruction,
  getGetMinimumDelegationInstruction,
  getInitializeCheckedInstruction,
  getInitializeInstruction,
  getMergeInstruction,
  getMoveLamportsInstruction,
  getMoveStakeInstruction,
  getSetLockupCheckedInstruction,
  getSetLockupInstruction,
  getSplitInstruction,
  getWithdrawInstruction,
  identifyStakeInstruction,
  parseStakeInstruction,
  type Authorized as GeneratedAuthorized,
  type AuthorizedArgs as GeneratedAuthorizedArgs,
  type Delegation as GeneratedDelegation,
  type Lockup as GeneratedLockup,
  type LockupArgs as GeneratedLockupArgs,
  type Meta as GeneratedMeta,
  type ParsedStakeInstruction,
  type Stake as GeneratedStake,
  type StakeAuthorize as GeneratedStakeAuthorize,
  type StakeFlags as GeneratedStakeFlags,
  StakeInstruction as GeneratedStakeInstruction,
  type StakeStateV2 as GeneratedStakeState,
} from '@solana-program/stake';

import {PublicKey} from '../publickey';
import {fromKitAddress, toKitAddress} from '../kit-adapters/address';
import {
  fromKitInstruction,
  toKitInstruction,
} from '../kit-adapters/instruction';
import {SystemProgram} from './system';
import {
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
} from '../sysvar';
import {Transaction, TransactionInstruction} from '../transaction';
import {toUint8ArrayView} from '../utils/typed-array';

/**
 * PublicKey of the stake config account which configures the rate
 * of stake warmup and cooldown as well as the slashing penalty.
 */
export const STAKE_CONFIG_ID = new PublicKey(
  'StakeConfig11111111111111111111111111111111',
);

const STAKE_PROGRAM_ID = new PublicKey(STAKE_PROGRAM_ADDRESS);

/**
 * Stake account authority info
 */
export class Authorized {
  /** stake authority */
  staker: PublicKey;
  /** withdraw authority */
  withdrawer: PublicKey;

  /**
   * Create a new Authorized object
   * @param staker the stake authority
   * @param withdrawer the withdraw authority
   */
  constructor(staker: PublicKey, withdrawer: PublicKey) {
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
  custodian: PublicKey;

  /**
   * Create a new Lockup object
   */
  constructor(unixTimestamp: number, epoch: number, custodian: PublicKey) {
    this.unixTimestamp = unixTimestamp;
    this.epoch = epoch;
    this.custodian = custodian;
  }

  /**
   * Default, inactive Lockup value
   */
  static default: Lockup = new Lockup(0, 0, PublicKey.default);
}

export type StakeAccountAuthorized = Readonly<{
  staker: PublicKey;
  withdrawer: PublicKey;
}>;

export type StakeAccountLockup = Readonly<{
  unixTimestamp: bigint;
  epoch: bigint;
  custodian: PublicKey;
}>;

export type StakeAccountDelegation = Readonly<{
  voterPubkey: PublicKey;
  stake: bigint;
  activationEpoch: bigint;
  deactivationEpoch: bigint;
  reserved: number[];
}>;

export type StakeAccountMeta = Readonly<{
  rentExemptReserve: bigint;
  authorized: StakeAccountAuthorized;
  lockup: StakeAccountLockup;
}>;

export type StakeAccountStake = Readonly<{
  delegation: StakeAccountDelegation;
  creditsObserved: bigint;
}>;

export type StakeAccountFlags = Readonly<{
  bits: number;
}>;

export type StakeAccountState =
  | Readonly<{
      __kind: 'Uninitialized';
    }>
  | Readonly<{
      __kind: 'Initialized';
      meta: StakeAccountMeta;
    }>
  | Readonly<{
      __kind: 'Stake';
      meta: StakeAccountMeta;
      stake: StakeAccountStake;
      stakeFlags: StakeAccountFlags;
    }>
  | Readonly<{
      __kind: 'RewardsPool';
    }>;

type StakeAccountArgs = Readonly<{
  state: StakeAccountState;
}>;

/**
 * StakeAccount class
 */
export class StakeAccount {
  state: StakeAccountState;

  /**
   * @internal
   */
  constructor(args: StakeAccountArgs) {
    this.state = args.state;
  }

  /**
   * Deserialize StakeAccount from the account data.
   *
   * @param bufferLike account data
   * @return StakeAccount
   */
  static fromAccountData(bufferLike: Uint8Array | Array<number>): StakeAccount {
    const decoded = getStakeStateAccountDecoder().decode(
      toUint8ArrayView(bufferLike),
    );

    return new StakeAccount({state: parseStakeAccountState(decoded.state)});
  }
}

/**
 * Create stake account transaction params
 */
export type CreateStakeAccountParams = {
  /** PublicKey of the account which will fund creation */
  fromPubkey: PublicKey;
  /** PublicKey of the new stake account */
  stakePubkey: PublicKey;
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
  fromPubkey: PublicKey;
  stakePubkey: PublicKey;
  basePubkey: PublicKey;
  seed: string;
  authorized: Authorized;
  lockup?: Lockup;
  lamports: number;
};

/**
 * Initialize stake instruction params
 */
export type InitializeStakeParams = {
  stakePubkey: PublicKey;
  authorized: Authorized;
  lockup?: Lockup;
};

/**
 * Delegate stake instruction params
 */
export type DelegateStakeParams = {
  stakePubkey: PublicKey;
  authorizedPubkey: PublicKey;
  votePubkey: PublicKey;
};

/**
 * Authorize stake instruction params
 */
export type AuthorizeStakeParams = {
  stakePubkey: PublicKey;
  authorizedPubkey: PublicKey;
  newAuthorizedPubkey: PublicKey;
  stakeAuthorizationType: StakeAuthorizationType;
  custodianPubkey?: PublicKey;
};

/**
 * Authorize stake instruction params using a derived key
 */
export type AuthorizeWithSeedStakeParams = {
  stakePubkey: PublicKey;
  authorityBase: PublicKey;
  authoritySeed: string;
  authorityOwner: PublicKey;
  newAuthorizedPubkey: PublicKey;
  stakeAuthorizationType: StakeAuthorizationType;
  custodianPubkey?: PublicKey;
};

/**
 * Split stake instruction params
 */
export type SplitStakeParams = {
  stakePubkey: PublicKey;
  authorizedPubkey: PublicKey;
  splitStakePubkey: PublicKey;
  lamports: number;
};

/**
 * Split with seed transaction params
 */
export type SplitStakeWithSeedParams = {
  stakePubkey: PublicKey;
  authorizedPubkey: PublicKey;
  splitStakePubkey: PublicKey;
  basePubkey: PublicKey;
  seed: string;
  lamports: number;
};

/**
 * Withdraw stake instruction params
 */
export type WithdrawStakeParams = {
  stakePubkey: PublicKey;
  authorizedPubkey: PublicKey;
  toPubkey: PublicKey;
  lamports: number;
  custodianPubkey?: PublicKey;
};

/**
 * Deactivate stake instruction params
 */
export type DeactivateStakeParams = {
  stakePubkey: PublicKey;
  authorizedPubkey: PublicKey;
};

/**
 * Merge stake instruction params
 */
export type MergeStakeParams = {
  stakePubkey: PublicKey;
  sourceStakePubKey: PublicKey;
  authorizedPubkey: PublicKey;
};

/**
 * Initialize checked stake instruction params
 */
export type InitializeCheckedStakeParams = {
  stakePubkey: PublicKey;
  authorized: Authorized;
};

/**
 * Authorize checked stake instruction params
 */
export type AuthorizeCheckedStakeParams = AuthorizeStakeParams;

/**
 * Authorize checked stake instruction params using a derived key
 */
export type AuthorizeCheckedWithSeedStakeParams = AuthorizeWithSeedStakeParams;

/**
 * Set lockup stake instruction params
 */
export type SetLockupStakeParams = {
  stakePubkey: PublicKey;
  authorizedPubkey: PublicKey;
  unixTimestamp?: number | bigint | null;
  epoch?: number | bigint | null;
  custodian?: PublicKey | null;
};

/**
 * Set lockup checked stake instruction params
 */
export type SetLockupCheckedStakeParams = {
  stakePubkey: PublicKey;
  authorizedPubkey: PublicKey;
  newAuthorizedPubkey?: PublicKey;
  unixTimestamp?: number | bigint | null;
  epoch?: number | bigint | null;
};

/**
 * Get minimum delegation instruction params
 */
export type GetMinimumDelegationStakeParams = Record<string, never>;

/**
 * Deactivate delinquent stake instruction params
 */
export type DeactivateDelinquentStakeParams = {
  stakePubkey: PublicKey;
  delinquentVotePubkey: PublicKey;
  referenceVotePubkey: PublicKey;
};

/**
 * Move stake instruction params
 */
export type MoveStakeParams = {
  sourceStakePubkey: PublicKey;
  destinationStakePubkey: PublicKey;
  authorizedPubkey: PublicKey;
  lamports: number | bigint;
};

/**
 * Move lamports instruction params
 */
export type MoveLamportsParams = {
  sourceStakePubkey: PublicKey;
  destinationStakePubkey: PublicKey;
  authorizedPubkey: PublicKey;
  lamports: number | bigint;
};

type ValueOf<TRecord> =
  TRecord extends Record<PropertyKey, infer TValue> ? TValue : never;

const GENERATED_TO_LEGACY_INSTRUCTION_TYPE = {
  [GeneratedStakeInstruction.Authorize]: 'Authorize',
  [GeneratedStakeInstruction.AuthorizeChecked]: 'AuthorizeChecked',
  [GeneratedStakeInstruction.AuthorizeCheckedWithSeed]:
    'AuthorizeCheckedWithSeed',
  [GeneratedStakeInstruction.AuthorizeWithSeed]: 'AuthorizeWithSeed',
  [GeneratedStakeInstruction.DeactivateDelinquent]: 'DeactivateDelinquent',
  [GeneratedStakeInstruction.Deactivate]: 'Deactivate',
  [GeneratedStakeInstruction.DelegateStake]: 'Delegate',
  [GeneratedStakeInstruction.GetMinimumDelegation]: 'GetMinimumDelegation',
  [GeneratedStakeInstruction.InitializeChecked]: 'InitializeChecked',
  [GeneratedStakeInstruction.Initialize]: 'Initialize',
  [GeneratedStakeInstruction.Merge]: 'Merge',
  [GeneratedStakeInstruction.MoveLamports]: 'MoveLamports',
  [GeneratedStakeInstruction.MoveStake]: 'MoveStake',
  [GeneratedStakeInstruction.SetLockup]: 'SetLockup',
  [GeneratedStakeInstruction.SetLockupChecked]: 'SetLockupChecked',
  [GeneratedStakeInstruction.Split]: 'Split',
  [GeneratedStakeInstruction.Withdraw]: 'Withdraw',
} as const satisfies Partial<Record<GeneratedStakeInstruction, string>>;

type ParsedAnyStakeInstruction = ParsedStakeInstruction<string>;

type ParsedInstructionOfType<
  TInstructionType extends GeneratedStakeInstruction,
> = Extract<ParsedAnyStakeInstruction, {instructionType: TInstructionType}>;

function toGeneratedAuthorized(
  authorized: Authorized,
): GeneratedAuthorizedArgs {
  return {
    staker: toKitAddress(authorized.staker),
    withdrawer: toKitAddress(authorized.withdrawer),
  };
}

function fromGeneratedAuthorized(authorized: GeneratedAuthorized): Authorized {
  return new Authorized(
    fromKitAddress(authorized.staker),
    fromKitAddress(authorized.withdrawer),
  );
}

function parseStakeAccountAuthorized(
  authorized: GeneratedAuthorized,
): StakeAccountAuthorized {
  return {
    staker: fromKitAddress(authorized.staker),
    withdrawer: fromKitAddress(authorized.withdrawer),
  };
}

function toGeneratedLockup(lockup: Lockup): GeneratedLockupArgs {
  return {
    unixTimestamp: lockup.unixTimestamp,
    epoch: lockup.epoch,
    custodian: toKitAddress(lockup.custodian),
  };
}

function fromGeneratedLockup(lockup: GeneratedLockup): Lockup {
  return new Lockup(
    Number(lockup.unixTimestamp),
    Number(lockup.epoch),
    fromKitAddress(lockup.custodian),
  );
}

function parseStakeAccountLockup(lockup: GeneratedLockup): StakeAccountLockup {
  return {
    unixTimestamp: lockup.unixTimestamp,
    epoch: lockup.epoch,
    custodian: fromKitAddress(lockup.custodian),
  };
}

function parseStakeAccountDelegation(
  delegation: GeneratedDelegation,
): StakeAccountDelegation {
  return {
    voterPubkey: fromKitAddress(delegation.voterPubkey),
    stake: delegation.stake,
    activationEpoch: delegation.activationEpoch,
    deactivationEpoch: delegation.deactivationEpoch,
    reserved: delegation.reserved,
  };
}

function parseStakeAccountMeta(meta: GeneratedMeta): StakeAccountMeta {
  return {
    rentExemptReserve: meta.rentExemptReserve,
    authorized: parseStakeAccountAuthorized(meta.authorized),
    lockup: parseStakeAccountLockup(meta.lockup),
  };
}

function parseStakeAccountStake(stake: GeneratedStake): StakeAccountStake {
  return {
    delegation: parseStakeAccountDelegation(stake.delegation),
    creditsObserved: stake.creditsObserved,
  };
}

function parseStakeAccountFlags(
  stakeFlags: GeneratedStakeFlags,
): StakeAccountFlags {
  return {bits: stakeFlags.bits};
}

function parseStakeAccountState(state: GeneratedStakeState): StakeAccountState {
  switch (state.__kind) {
    case 'Uninitialized':
      return {__kind: 'Uninitialized'};
    case 'Initialized': {
      const [meta] = state.fields;
      return {
        __kind: 'Initialized',
        meta: parseStakeAccountMeta(meta),
      };
    }
    case 'Stake': {
      const [meta, stake, stakeFlags] = state.fields;
      return {
        __kind: 'Stake',
        meta: parseStakeAccountMeta(meta),
        stake: parseStakeAccountStake(stake),
        stakeFlags: parseStakeAccountFlags(stakeFlags),
      };
    }
    case 'RewardsPool':
      return {__kind: 'RewardsPool'};
    default:
      state satisfies never;
      throw new Error('Unsupported stake account state');
  }
}

function toGeneratedStakeAuthorize(
  stakeAuthorizationType: StakeAuthorizationType,
): GeneratedStakeAuthorize {
  return stakeAuthorizationType.index as GeneratedStakeAuthorize;
}

function fromGeneratedStakeAuthorize(
  stakeAuthorize: GeneratedStakeAuthorize,
): StakeAuthorizationType {
  return {index: stakeAuthorize};
}

type GeneratedOption<T> =
  | Readonly<{__option: 'None'}>
  | Readonly<{__option: 'Some'; value: T}>;

function unwrapGeneratedOption<T>(value: GeneratedOption<T>): T | undefined {
  return value.__option === 'Some' ? value.value : undefined;
}

function checkProgramId(programId: PublicKey) {
  if (!programId.equals(StakeProgram.programId)) {
    throw new Error('invalid instruction; programId is not StakeProgram');
  }
}

function getInstructionType(
  instruction: TransactionInstruction,
): StakeInstructionType {
  checkProgramId(instruction.programId);
  const generatedInstructionType = identifyStakeInstruction(instruction.data);

  const instructionType =
    generatedInstructionType in GENERATED_TO_LEGACY_INSTRUCTION_TYPE
      ? GENERATED_TO_LEGACY_INSTRUCTION_TYPE[
          generatedInstructionType as keyof typeof GENERATED_TO_LEGACY_INSTRUCTION_TYPE
        ]
      : undefined;

  if (!instructionType) {
    throw new Error('Instruction type incorrect; not a StakeInstruction');
  }

  return instructionType;
}

function parseStakeInstructionOfType<
  TInstructionType extends GeneratedStakeInstruction,
>(
  instruction: TransactionInstruction,
  expectedInstructionType: TInstructionType,
): ParsedInstructionOfType<TInstructionType> {
  checkProgramId(instruction.programId);
  const parsedInstruction = parseStakeInstruction(
    toKitInstruction(instruction),
  );
  if (parsedInstruction.instructionType !== expectedInstructionType) {
    throw new Error('invalid instruction; instruction type mismatch');
  }
  return parsedInstruction as ParsedInstructionOfType<TInstructionType>;
}

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
    return getInstructionType(instruction);
  }

  /**
   * Decode a initialize stake instruction and retrieve the instruction params.
   */
  static decodeInitialize(
    instruction: TransactionInstruction,
  ): InitializeStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.Initialize,
    );

    return {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      authorized: fromGeneratedAuthorized(parsedInstruction.data.arg0),
      lockup: fromGeneratedLockup(parsedInstruction.data.arg1),
    };
  }

  /**
   * Decode an initialize-checked stake instruction and retrieve the instruction params.
   */
  static decodeInitializeChecked(
    instruction: TransactionInstruction,
  ): InitializeCheckedStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.InitializeChecked,
    );

    return {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      authorized: new Authorized(
        fromKitAddress(parsedInstruction.accounts.stakeAuthority.address),
        fromKitAddress(parsedInstruction.accounts.withdrawAuthority.address),
      ),
    };
  }

  /**
   * Decode a delegate stake instruction and retrieve the instruction params.
   */
  static decodeDelegate(
    instruction: TransactionInstruction,
  ): DelegateStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.DelegateStake,
    );

    return {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      votePubkey: fromKitAddress(parsedInstruction.accounts.vote.address),
      authorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.stakeAuthority.address,
      ),
    };
  }

  /**
   * Decode an authorize stake instruction and retrieve the instruction params.
   */
  static decodeAuthorize(
    instruction: TransactionInstruction,
  ): AuthorizeStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.Authorize,
    );

    const o: AuthorizeStakeParams = {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      authorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.authority.address,
      ),
      newAuthorizedPubkey: fromKitAddress(parsedInstruction.data.arg0),
      stakeAuthorizationType: fromGeneratedStakeAuthorize(
        parsedInstruction.data.arg1,
      ),
    };
    if (parsedInstruction.accounts.lockupAuthority) {
      o.custodianPubkey = fromKitAddress(
        parsedInstruction.accounts.lockupAuthority.address,
      );
    }
    return o;
  }

  /**
   * Decode an authorize-checked stake instruction and retrieve the instruction params.
   */
  static decodeAuthorizeChecked(
    instruction: TransactionInstruction,
  ): AuthorizeCheckedStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.AuthorizeChecked,
    );

    const o: AuthorizeCheckedStakeParams = {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      authorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.authority.address,
      ),
      newAuthorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.newAuthority.address,
      ),
      stakeAuthorizationType: fromGeneratedStakeAuthorize(
        parsedInstruction.data.stakeAuthorize,
      ),
    };
    if (parsedInstruction.accounts.lockupAuthority) {
      o.custodianPubkey = fromKitAddress(
        parsedInstruction.accounts.lockupAuthority.address,
      );
    }
    return o;
  }

  /**
   * Decode an authorize-with-seed stake instruction and retrieve the instruction params.
   */
  static decodeAuthorizeWithSeed(
    instruction: TransactionInstruction,
  ): AuthorizeWithSeedStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.AuthorizeWithSeed,
    );

    const o: AuthorizeWithSeedStakeParams = {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      authorityBase: fromKitAddress(parsedInstruction.accounts.base.address),
      authoritySeed: parsedInstruction.data.authoritySeed,
      authorityOwner: fromKitAddress(parsedInstruction.data.authorityOwner),
      newAuthorizedPubkey: fromKitAddress(
        parsedInstruction.data.newAuthorizedPubkey,
      ),
      stakeAuthorizationType: fromGeneratedStakeAuthorize(
        parsedInstruction.data.stakeAuthorize,
      ),
    };
    if (parsedInstruction.accounts.lockupAuthority) {
      o.custodianPubkey = fromKitAddress(
        parsedInstruction.accounts.lockupAuthority.address,
      );
    }
    return o;
  }

  /**
   * Decode an authorize-checked-with-seed stake instruction and retrieve the instruction params.
   */
  static decodeAuthorizeCheckedWithSeed(
    instruction: TransactionInstruction,
  ): AuthorizeCheckedWithSeedStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.AuthorizeCheckedWithSeed,
    );

    const o: AuthorizeCheckedWithSeedStakeParams = {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      authorityBase: fromKitAddress(parsedInstruction.accounts.base.address),
      authoritySeed: parsedInstruction.data.authoritySeed,
      authorityOwner: fromKitAddress(parsedInstruction.data.authorityOwner),
      newAuthorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.newAuthority.address,
      ),
      stakeAuthorizationType: fromGeneratedStakeAuthorize(
        parsedInstruction.data.stakeAuthorize,
      ),
    };
    if (parsedInstruction.accounts.lockupAuthority) {
      o.custodianPubkey = fromKitAddress(
        parsedInstruction.accounts.lockupAuthority.address,
      );
    }
    return o;
  }

  /**
   * Decode a set-lockup stake instruction and retrieve the instruction params.
   */
  static decodeSetLockup(
    instruction: TransactionInstruction,
  ): SetLockupStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.SetLockup,
    );

    const o: SetLockupStakeParams = {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      authorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.authority.address,
      ),
    };
    const unixTimestamp = unwrapGeneratedOption(
      parsedInstruction.data.unixTimestamp,
    );
    const epoch = unwrapGeneratedOption(parsedInstruction.data.epoch);
    const custodian = unwrapGeneratedOption(parsedInstruction.data.custodian);
    if (unixTimestamp !== undefined) {
      o.unixTimestamp = unixTimestamp;
    }
    if (epoch !== undefined) {
      o.epoch = epoch;
    }
    if (custodian !== undefined) {
      o.custodian = fromKitAddress(custodian);
    }
    return o;
  }

  /**
   * Decode a set-lockup-checked stake instruction and retrieve the instruction params.
   */
  static decodeSetLockupChecked(
    instruction: TransactionInstruction,
  ): SetLockupCheckedStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.SetLockupChecked,
    );

    const o: SetLockupCheckedStakeParams = {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      authorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.authority.address,
      ),
    };
    if (parsedInstruction.accounts.newAuthority) {
      o.newAuthorizedPubkey = fromKitAddress(
        parsedInstruction.accounts.newAuthority.address,
      );
    }
    const unixTimestamp = unwrapGeneratedOption(
      parsedInstruction.data.unixTimestamp,
    );
    const epoch = unwrapGeneratedOption(parsedInstruction.data.epoch);
    if (unixTimestamp !== undefined) {
      o.unixTimestamp = unixTimestamp;
    }
    if (epoch !== undefined) {
      o.epoch = epoch;
    }
    return o;
  }

  /**
   * Decode a split stake instruction and retrieve the instruction params.
   */
  static decodeSplit(instruction: TransactionInstruction): SplitStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.Split,
    );

    return {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      splitStakePubkey: fromKitAddress(
        parsedInstruction.accounts.splitStake.address,
      ),
      authorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.stakeAuthority.address,
      ),
      lamports: Number(parsedInstruction.data.args),
    };
  }

  /**
   * Decode a get-minimum-delegation stake instruction and retrieve the instruction params.
   */
  static decodeGetMinimumDelegation(
    instruction: TransactionInstruction,
  ): GetMinimumDelegationStakeParams {
    parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.GetMinimumDelegation,
    );

    return {};
  }

  /**
   * Decode a merge stake instruction and retrieve the instruction params.
   */
  static decodeMerge(instruction: TransactionInstruction): MergeStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.Merge,
    );

    return {
      stakePubkey: fromKitAddress(
        parsedInstruction.accounts.destinationStake.address,
      ),
      sourceStakePubKey: fromKitAddress(
        parsedInstruction.accounts.sourceStake.address,
      ),
      authorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.stakeAuthority.address,
      ),
    };
  }

  /**
   * Decode a withdraw stake instruction and retrieve the instruction params.
   */
  static decodeWithdraw(
    instruction: TransactionInstruction,
  ): WithdrawStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.Withdraw,
    );

    const o: WithdrawStakeParams = {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      toPubkey: fromKitAddress(parsedInstruction.accounts.recipient.address),
      authorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.withdrawAuthority.address,
      ),
      lamports: Number(parsedInstruction.data.args),
    };
    if (parsedInstruction.accounts.lockupAuthority) {
      o.custodianPubkey = fromKitAddress(
        parsedInstruction.accounts.lockupAuthority.address,
      );
    }
    return o;
  }

  /**
   * Decode a deactivate stake instruction and retrieve the instruction params.
   */
  static decodeDeactivate(
    instruction: TransactionInstruction,
  ): DeactivateStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.Deactivate,
    );

    return {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      authorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.stakeAuthority.address,
      ),
    };
  }

  /**
   * Decode a deactivate-delinquent stake instruction and retrieve the instruction params.
   */
  static decodeDeactivateDelinquent(
    instruction: TransactionInstruction,
  ): DeactivateDelinquentStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.DeactivateDelinquent,
    );

    return {
      stakePubkey: fromKitAddress(parsedInstruction.accounts.stake.address),
      delinquentVotePubkey: fromKitAddress(
        parsedInstruction.accounts.delinquentVote.address,
      ),
      referenceVotePubkey: fromKitAddress(
        parsedInstruction.accounts.referenceVote.address,
      ),
    };
  }

  /**
   * Decode a move-stake instruction and retrieve the instruction params.
   */
  static decodeMoveStake(instruction: TransactionInstruction): MoveStakeParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.MoveStake,
    );

    return {
      sourceStakePubkey: fromKitAddress(
        parsedInstruction.accounts.sourceStake.address,
      ),
      destinationStakePubkey: fromKitAddress(
        parsedInstruction.accounts.destinationStake.address,
      ),
      authorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.stakeAuthority.address,
      ),
      lamports: parsedInstruction.data.args,
    };
  }

  /**
   * Decode a move-lamports instruction and retrieve the instruction params.
   */
  static decodeMoveLamports(
    instruction: TransactionInstruction,
  ): MoveLamportsParams {
    const parsedInstruction = parseStakeInstructionOfType(
      instruction,
      GeneratedStakeInstruction.MoveLamports,
    );

    return {
      sourceStakePubkey: fromKitAddress(
        parsedInstruction.accounts.sourceStake.address,
      ),
      destinationStakePubkey: fromKitAddress(
        parsedInstruction.accounts.destinationStake.address,
      ),
      authorizedPubkey: fromKitAddress(
        parsedInstruction.accounts.stakeAuthority.address,
      ),
      lamports: parsedInstruction.data.args,
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId: PublicKey) {
    checkProgramId(programId);
  }
}

/**
 * An enumeration of valid StakeInstructionType's
 */
export type StakeInstructionType = ValueOf<
  typeof GENERATED_TO_LEGACY_INSTRUCTION_TYPE
>;

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
  static programId: PublicKey = STAKE_PROGRAM_ID;

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
    return fromKitInstruction(
      getInitializeInstruction({
        stake: toKitAddress(stakePubkey),
        rentSysvar: toKitAddress(SYSVAR_RENT_PUBKEY),
        arg0: toGeneratedAuthorized(authorized),
        arg1: toGeneratedLockup(lockup),
      }),
    );
  }

  /**
   * Generate an InitializeChecked instruction.
   */
  static initializeChecked(
    params: InitializeCheckedStakeParams,
  ): TransactionInstruction {
    const {stakePubkey, authorized} = params;
    return fromKitInstruction(
      getInitializeCheckedInstruction({
        stake: toKitAddress(stakePubkey),
        rentSysvar: toKitAddress(SYSVAR_RENT_PUBKEY),
        stakeAuthority: toKitAddress(authorized.staker),
        withdrawAuthority: createNoopSigner(
          toKitAddress(authorized.withdrawer),
        ),
      }),
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
   * Vote PublicKey. This transaction can also be used to redelegate Stake
   * to a new validator Vote PublicKey.
   */
  static delegate(params: DelegateStakeParams): Transaction {
    const {stakePubkey, authorizedPubkey, votePubkey} = params;

    return new Transaction().add(
      fromKitInstruction(
        getDelegateStakeInstruction({
          stake: toKitAddress(stakePubkey),
          vote: toKitAddress(votePubkey),
          clockSysvar: toKitAddress(SYSVAR_CLOCK_PUBKEY),
          stakeHistory: toKitAddress(SYSVAR_STAKE_HISTORY_PUBKEY),
          unused: toKitAddress(STAKE_CONFIG_ID),
          stakeAuthority: createNoopSigner(toKitAddress(authorizedPubkey)),
        }),
      ),
    );
  }

  /**
   * Generate a Transaction that authorizes a new PublicKey as Staker
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

    return new Transaction().add(
      fromKitInstruction(
        getAuthorizeInstruction({
          stake: toKitAddress(stakePubkey),
          clockSysvar: toKitAddress(SYSVAR_CLOCK_PUBKEY),
          authority: createNoopSigner(toKitAddress(authorizedPubkey)),
          ...(custodianPubkey
            ? {lockupAuthority: createNoopSigner(toKitAddress(custodianPubkey))}
            : {}),
          arg0: toKitAddress(newAuthorizedPubkey),
          arg1: toGeneratedStakeAuthorize(stakeAuthorizationType),
        }),
      ),
    );
  }

  /**
   * Generate a Transaction that authorizes a new signer as Staker or Withdrawer on the Stake account.
   */
  static authorizeChecked(params: AuthorizeCheckedStakeParams): Transaction {
    const {
      stakePubkey,
      authorizedPubkey,
      newAuthorizedPubkey,
      stakeAuthorizationType,
      custodianPubkey,
    } = params;

    return new Transaction().add(
      fromKitInstruction(
        getAuthorizeCheckedInstruction({
          stake: toKitAddress(stakePubkey),
          clockSysvar: toKitAddress(SYSVAR_CLOCK_PUBKEY),
          authority: createNoopSigner(toKitAddress(authorizedPubkey)),
          newAuthority: createNoopSigner(toKitAddress(newAuthorizedPubkey)),
          ...(custodianPubkey
            ? {lockupAuthority: createNoopSigner(toKitAddress(custodianPubkey))}
            : {}),
          stakeAuthorize: toGeneratedStakeAuthorize(stakeAuthorizationType),
        }),
      ),
    );
  }

  /**
   * Generate a Transaction that authorizes a new PublicKey as Staker
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

    return new Transaction().add(
      fromKitInstruction(
        getAuthorizeWithSeedInstruction({
          stake: toKitAddress(stakePubkey),
          base: createNoopSigner(toKitAddress(authorityBase)),
          clockSysvar: toKitAddress(SYSVAR_CLOCK_PUBKEY),
          ...(custodianPubkey
            ? {lockupAuthority: createNoopSigner(toKitAddress(custodianPubkey))}
            : {}),
          newAuthorizedPubkey: toKitAddress(newAuthorizedPubkey),
          stakeAuthorize: toGeneratedStakeAuthorize(stakeAuthorizationType),
          authoritySeed,
          authorityOwner: toKitAddress(authorityOwner),
        }),
      ),
    );
  }

  /**
   * Generate a Transaction that authorizes a new signer as Staker or Withdrawer on the Stake account using a derived key.
   */
  static authorizeCheckedWithSeed(
    params: AuthorizeCheckedWithSeedStakeParams,
  ): Transaction {
    const {
      stakePubkey,
      authorityBase,
      authoritySeed,
      authorityOwner,
      newAuthorizedPubkey,
      stakeAuthorizationType,
      custodianPubkey,
    } = params;

    return new Transaction().add(
      fromKitInstruction(
        getAuthorizeCheckedWithSeedInstruction({
          stake: toKitAddress(stakePubkey),
          base: createNoopSigner(toKitAddress(authorityBase)),
          clockSysvar: toKitAddress(SYSVAR_CLOCK_PUBKEY),
          newAuthority: createNoopSigner(toKitAddress(newAuthorizedPubkey)),
          ...(custodianPubkey
            ? {lockupAuthority: createNoopSigner(toKitAddress(custodianPubkey))}
            : {}),
          stakeAuthorize: toGeneratedStakeAuthorize(stakeAuthorizationType),
          authoritySeed,
          authorityOwner: toKitAddress(authorityOwner),
        }),
      ),
    );
  }

  /**
   * Generate a Transaction that updates a stake account lockup.
   */
  static setLockup(params: SetLockupStakeParams): Transaction {
    const {stakePubkey, authorizedPubkey, unixTimestamp, epoch, custodian} =
      params;

    return new Transaction().add(
      fromKitInstruction(
        getSetLockupInstruction({
          stake: toKitAddress(stakePubkey),
          authority: createNoopSigner(toKitAddress(authorizedPubkey)),
          unixTimestamp: unixTimestamp ?? null,
          epoch: epoch ?? null,
          custodian: custodian ? toKitAddress(custodian) : null,
        }),
      ),
    );
  }

  /**
   * Generate a Transaction that updates a stake account lockup using checked authorities.
   */
  static setLockupChecked(params: SetLockupCheckedStakeParams): Transaction {
    const {
      stakePubkey,
      authorizedPubkey,
      newAuthorizedPubkey,
      unixTimestamp,
      epoch,
    } = params;

    return new Transaction().add(
      fromKitInstruction(
        getSetLockupCheckedInstruction({
          stake: toKitAddress(stakePubkey),
          authority: createNoopSigner(toKitAddress(authorizedPubkey)),
          ...(newAuthorizedPubkey
            ? {
                newAuthority: createNoopSigner(
                  toKitAddress(newAuthorizedPubkey),
                ),
              }
            : {}),
          unixTimestamp: unixTimestamp ?? null,
          epoch: epoch ?? null,
        }),
      ),
    );
  }

  /**
   * @internal
   */
  static splitInstruction(params: SplitStakeParams): TransactionInstruction {
    const {stakePubkey, authorizedPubkey, splitStakePubkey, lamports} = params;
    return fromKitInstruction(
      getSplitInstruction({
        stake: toKitAddress(stakePubkey),
        splitStake: toKitAddress(splitStakePubkey),
        stakeAuthority: createNoopSigner(toKitAddress(authorizedPubkey)),
        args: lamports,
      }),
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
      fromKitInstruction(
        getMergeInstruction({
          destinationStake: toKitAddress(stakePubkey),
          sourceStake: toKitAddress(sourceStakePubKey),
          clockSysvar: toKitAddress(SYSVAR_CLOCK_PUBKEY),
          stakeHistory: toKitAddress(SYSVAR_STAKE_HISTORY_PUBKEY),
          stakeAuthority: createNoopSigner(toKitAddress(authorizedPubkey)),
        }),
      ),
    );
  }

  /**
   * Generate a get-minimum-delegation instruction.
   */
  static getMinimumDelegation(): TransactionInstruction {
    return fromKitInstruction(getGetMinimumDelegationInstruction());
  }

  /**
   * Generate a Transaction that withdraws deactivated Stake tokens.
   */
  static withdraw(params: WithdrawStakeParams): Transaction {
    const {stakePubkey, authorizedPubkey, toPubkey, lamports, custodianPubkey} =
      params;
    return new Transaction().add(
      fromKitInstruction(
        getWithdrawInstruction({
          stake: toKitAddress(stakePubkey),
          recipient: toKitAddress(toPubkey),
          clockSysvar: toKitAddress(SYSVAR_CLOCK_PUBKEY),
          stakeHistory: toKitAddress(SYSVAR_STAKE_HISTORY_PUBKEY),
          withdrawAuthority: createNoopSigner(toKitAddress(authorizedPubkey)),
          ...(custodianPubkey
            ? {lockupAuthority: createNoopSigner(toKitAddress(custodianPubkey))}
            : {}),
          args: lamports,
        }),
      ),
    );
  }

  /**
   * Generate a Transaction that deactivates Stake tokens.
   */
  static deactivate(params: DeactivateStakeParams): Transaction {
    const {stakePubkey, authorizedPubkey} = params;

    return new Transaction().add(
      fromKitInstruction(
        getDeactivateInstruction({
          stake: toKitAddress(stakePubkey),
          clockSysvar: toKitAddress(SYSVAR_CLOCK_PUBKEY),
          stakeAuthority: createNoopSigner(toKitAddress(authorizedPubkey)),
        }),
      ),
    );
  }

  /**
   * Generate a Transaction that deactivates stake delegated to a delinquent vote account.
   */
  static deactivateDelinquent(
    params: DeactivateDelinquentStakeParams,
  ): Transaction {
    const {stakePubkey, delinquentVotePubkey, referenceVotePubkey} = params;

    return new Transaction().add(
      fromKitInstruction(
        getDeactivateDelinquentInstruction({
          stake: toKitAddress(stakePubkey),
          delinquentVote: toKitAddress(delinquentVotePubkey),
          referenceVote: toKitAddress(referenceVotePubkey),
        }),
      ),
    );
  }

  /**
   * Generate a Transaction that moves active stake between stake accounts.
   */
  static moveStake(params: MoveStakeParams): Transaction {
    const {
      sourceStakePubkey,
      destinationStakePubkey,
      authorizedPubkey,
      lamports,
    } = params;

    return new Transaction().add(
      fromKitInstruction(
        getMoveStakeInstruction({
          sourceStake: toKitAddress(sourceStakePubkey),
          destinationStake: toKitAddress(destinationStakePubkey),
          stakeAuthority: createNoopSigner(toKitAddress(authorizedPubkey)),
          args: lamports,
        }),
      ),
    );
  }

  /**
   * Generate a Transaction that moves lamports between compatible stake accounts.
   */
  static moveLamports(params: MoveLamportsParams): Transaction {
    const {
      sourceStakePubkey,
      destinationStakePubkey,
      authorizedPubkey,
      lamports,
    } = params;

    return new Transaction().add(
      fromKitInstruction(
        getMoveLamportsInstruction({
          sourceStake: toKitAddress(sourceStakePubkey),
          destinationStake: toKitAddress(destinationStakePubkey),
          stakeAuthority: createNoopSigner(toKitAddress(authorizedPubkey)),
          args: lamports,
        }),
      ),
    );
  }
}
