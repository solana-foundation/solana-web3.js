import {
  type Codec,
  fixCodecSize,
  getBytesCodec,
  getStructCodec,
  getU32Codec,
  getU64Codec,
  getU8Codec,
  transformCodec,
} from '@solana/kit';

import {RUST_STRING_CODEC} from '../codecs';
import {PublicKey} from '../publickey';
import {SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY} from '../sysvar';
import {Transaction, TransactionInstruction} from '../transaction';
import assert from '../utils/assert';
import {coerceNumericToBigInt} from '../utils/bigint';
import {toUint8ArrayView} from '../utils/typed-array';
import {SystemProgram} from './system';

/**
 * Vote account info
 */
export class VoteInit {
  nodePubkey: PublicKey;
  authorizedVoter: PublicKey;
  authorizedWithdrawer: PublicKey;
  /** Expected percentage commission value, in the inclusive range [0, 100]. */
  commission: number;

  constructor(
    nodePubkey: PublicKey,
    authorizedVoter: PublicKey,
    authorizedWithdrawer: PublicKey,
    commission: number,
  ) {
    this.nodePubkey = nodePubkey;
    this.authorizedVoter = authorizedVoter;
    this.authorizedWithdrawer = authorizedWithdrawer;
    this.commission = commission;
  }
}

/**
 * Create vote account transaction params
 */
export type CreateVoteAccountParams = {
  fromPubkey: PublicKey;
  votePubkey: PublicKey;
  voteInit: VoteInit;
  lamports: number;
};

/**
 * InitializeAccount instruction params
 */
export type InitializeAccountParams = {
  votePubkey: PublicKey;
  nodePubkey: PublicKey;
  voteInit: VoteInit;
};

/**
 * Authorize instruction params
 */
export type AuthorizeVoteParams = {
  votePubkey: PublicKey;
  /** Current vote or withdraw authority, depending on `voteAuthorizationType` */
  authorizedPubkey: PublicKey;
  newAuthorizedPubkey: PublicKey;
  voteAuthorizationType: VoteAuthorizationType;
};

/**
 * AuthorizeWithSeed instruction params
 */
export type AuthorizeVoteWithSeedParams = {
  currentAuthorityDerivedKeyBasePubkey: PublicKey;
  currentAuthorityDerivedKeyOwnerPubkey: PublicKey;
  currentAuthorityDerivedKeySeed: string;
  newAuthorizedPubkey: PublicKey;
  voteAuthorizationType: VoteAuthorizationType;
  votePubkey: PublicKey;
};

/**
 * AuthorizeChecked instruction params
 */
export type AuthorizeCheckedVoteParams = AuthorizeVoteParams;

/**
 * AuthorizeCheckedWithSeed instruction params
 */
export type AuthorizeCheckedVoteWithSeedParams = AuthorizeVoteWithSeedParams;

/**
 * Withdraw from vote account transaction params
 */
export type WithdrawFromVoteAccountParams = {
  votePubkey: PublicKey;
  authorizedWithdrawerPubkey: PublicKey;
  lamports: number | bigint;
  toPubkey: PublicKey;
};

export type DecodedWithdrawFromVoteAccountParams = Omit<
  WithdrawFromVoteAccountParams,
  'lamports'
> & {
  lamports: bigint;
};

/**
 * Update validator identity (node pubkey) vote account instruction params.
 */
export type UpdateValidatorIdentityParams = {
  votePubkey: PublicKey;
  authorizedWithdrawerPubkey: PublicKey;
  nodePubkey: PublicKey;
};

/**
 * UpdateCommission instruction params.
 */
export type UpdateCommissionVoteParams = {
  votePubkey: PublicKey;
  authorizedWithdrawerPubkey: PublicKey;
  commission: number;
};

/**
 * An enumeration of valid VoteInstructionType's
 */
export type VoteInstructionType =
  // FIXME
  // It would be preferable for this type to be derived from the internal instruction input map
  // but Typedoc does not transpile `keyof` expressions.
  // See https://github.com/TypeStrong/typedoc/issues/1894
  | 'Authorize'
  | 'AuthorizeChecked'
  | 'AuthorizeCheckedWithSeed'
  | 'AuthorizeWithSeed'
  | 'InitializeAccount'
  | 'UpdateCommission'
  | 'Withdraw'
  | 'UpdateValidatorIdentity';

/** @internal */
export type VoteAuthorizeWithSeedArgs = Readonly<{
  currentAuthorityDerivedKeyOwnerPubkey: Uint8Array;
  currentAuthorityDerivedKeySeed: string;
  newAuthorized: Uint8Array;
  voteAuthorizationType: number;
}>;

/** @internal */
export type VoteAuthorizeCheckedWithSeedArgs = Readonly<{
  currentAuthorityDerivedKeyOwnerPubkey: Uint8Array;
  currentAuthorityDerivedKeySeed: string;
  voteAuthorizationType: number;
}>;

type VoteInstructionData = Readonly<{
  instruction: number;
}>;

type InstructionCodecInput<TCodec> =
  TCodec extends Codec<infer TFrom, infer _TTo> ? TFrom : never;

type InstructionCodecOutput<TCodec> =
  TCodec extends Codec<infer _TFrom, infer TTo> ? TTo : never;

type StripInstruction<T> = T extends {instruction: unknown}
  ? Omit<T, 'instruction'>
  : T;

type VoteInstructionParams<TCodec> = StripInstruction<
  InstructionCodecInput<TCodec>
>;
type VoteInstructionDecoded<TCodec> = StripInstruction<
  InstructionCodecOutput<TCodec>
>;

const VOTE_PROGRAM_ID = new PublicKey(
  'Vote111111111111111111111111111111111111111',
);
const U32_CODEC = getU32Codec();
const U8_CODEC = getU8Codec();
const U64_BIGINT_CODEC = transformCodec(
  getU64Codec(),
  (value: number | bigint) => coerceU64ToBigInt(value, 'u64'),
  decoded => decoded,
);
const PUBLIC_KEY_BYTES_CODEC = fixCodecSize(getBytesCodec(), 32);

function coerceU64ToBigInt(value: number | bigint, valueName: string): bigint {
  const coerced = coerceNumericToBigInt(value, valueName);
  assert(
    coerced >= 0n,
    `${valueName ?? 'Value'} must be greater than or equal to 0`,
  );
  return coerced;
}

// We intentionally keep the upstream numeric tags for legacy vote-casting and
// validator-runtime synchronization instructions even though this client does
// not expose them. That lets decodeInstructionType distinguish “known but not
// supported here” from “unknown to this client” and produce a more useful
// error for developers inspecting raw instructions.
const INITIALIZE_ACCOUNT_INSTRUCTION_INDEX = 0;
const AUTHORIZE_INSTRUCTION_INDEX = 1;
const VOTE_INSTRUCTION_INDEX = 2;
const WITHDRAW_INSTRUCTION_INDEX = 3;
const UPDATE_VALIDATOR_IDENTITY_INSTRUCTION_INDEX = 4;
const UPDATE_COMMISSION_INSTRUCTION_INDEX = 5;
const VOTE_SWITCH_INSTRUCTION_INDEX = 6;
const AUTHORIZE_CHECKED_INSTRUCTION_INDEX = 7;
const UPDATE_VOTE_STATE_INSTRUCTION_INDEX = 8;
const UPDATE_VOTE_STATE_SWITCH_INSTRUCTION_INDEX = 9;
const AUTHORIZE_WITH_SEED_INSTRUCTION_INDEX = 10;
const AUTHORIZE_CHECKED_WITH_SEED_INSTRUCTION_INDEX = 11;
const COMPACT_UPDATE_VOTE_STATE_INSTRUCTION_INDEX = 12;
const COMPACT_UPDATE_VOTE_STATE_SWITCH_INSTRUCTION_INDEX = 13;
const TOWER_SYNC_INSTRUCTION_INDEX = 14;
const TOWER_SYNC_SWITCH_INSTRUCTION_INDEX = 15;
const VOTE_INIT_CODEC = getStructCodec([
  ['nodePubkey', PUBLIC_KEY_BYTES_CODEC],
  ['authorizedVoter', PUBLIC_KEY_BYTES_CODEC],
  ['authorizedWithdrawer', PUBLIC_KEY_BYTES_CODEC],
  ['commission', U8_CODEC],
]);
const VOTE_AUTHORIZE_WITH_SEED_CODEC = getStructCodec([
  ['voteAuthorizationType', U32_CODEC],
  ['currentAuthorityDerivedKeyOwnerPubkey', PUBLIC_KEY_BYTES_CODEC],
  ['currentAuthorityDerivedKeySeed', RUST_STRING_CODEC],
  ['newAuthorized', PUBLIC_KEY_BYTES_CODEC],
]);

const INITIALIZE_ACCOUNT_CODEC = getStructCodec([
  ['instruction', U32_CODEC],
  ['voteInit', VOTE_INIT_CODEC],
]);
const AUTHORIZE_CODEC = getStructCodec([
  ['instruction', U32_CODEC],
  ['newAuthorized', PUBLIC_KEY_BYTES_CODEC],
  ['voteAuthorizationType', U32_CODEC],
]);
const AUTHORIZE_CHECKED_CODEC = getStructCodec([
  ['instruction', U32_CODEC],
  ['voteAuthorizationType', U32_CODEC],
]);
const WITHDRAW_CODEC = getStructCodec([
  ['instruction', U32_CODEC],
  ['lamports', U64_BIGINT_CODEC],
]);
const UPDATE_VALIDATOR_IDENTITY_CODEC = getStructCodec([
  ['instruction', U32_CODEC],
]);
const UPDATE_COMMISSION_CODEC = getStructCodec([
  ['instruction', U32_CODEC],
  ['commission', U8_CODEC],
]);
const AUTHORIZE_WITH_SEED_CODEC = getStructCodec([
  ['instruction', U32_CODEC],
  ['voteAuthorizeWithSeedArgs', VOTE_AUTHORIZE_WITH_SEED_CODEC],
]);
const AUTHORIZE_CHECKED_WITH_SEED_CODEC = getStructCodec([
  ['instruction', U32_CODEC],
  ['voteAuthorizationType', U32_CODEC],
  ['currentAuthorityDerivedKeyOwnerPubkey', PUBLIC_KEY_BYTES_CODEC],
  ['currentAuthorityDerivedKeySeed', RUST_STRING_CODEC],
]);

function encodeVoteInstructionData<TCodec extends Codec<any, any>>(
  instruction: number,
  codec: TCodec,
  params?: VoteInstructionParams<TCodec>,
): Uint8Array {
  return toUint8ArrayView(
    codec.encode({
      instruction,
      ...(params ?? {}),
    } as InstructionCodecInput<TCodec>),
  );
}

function decodeVoteInstructionData<TCodec extends Codec<any, any>>(
  instruction: TransactionInstruction,
  expectedInstruction: number,
  codec: TCodec,
): VoteInstructionDecoded<TCodec> {
  let decoded: InstructionCodecOutput<TCodec> & VoteInstructionData;
  try {
    decoded = codec.decode(instruction.data) as InstructionCodecOutput<TCodec> &
      VoteInstructionData;
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.startsWith('invalid instruction;')
    ) {
      throw err;
    }
    throw new Error('invalid instruction; ' + err);
  }

  if (decoded.instruction !== expectedInstruction) {
    throw new Error(
      `invalid instruction; instruction index mismatch ${decoded.instruction} != ${expectedInstruction}`,
    );
  }

  const {instruction: _instruction, ...rest} = decoded;
  return rest as VoteInstructionDecoded<TCodec>;
}

function getVoteInstructionType(
  instruction: TransactionInstruction,
): VoteInstructionType {
  const instructionIndex = U32_CODEC.decode(instruction.data);
  switch (instructionIndex) {
    case INITIALIZE_ACCOUNT_INSTRUCTION_INDEX:
      return 'InitializeAccount';
    case AUTHORIZE_INSTRUCTION_INDEX:
      return 'Authorize';
    case WITHDRAW_INSTRUCTION_INDEX:
      return 'Withdraw';
    case UPDATE_VALIDATOR_IDENTITY_INSTRUCTION_INDEX:
      return 'UpdateValidatorIdentity';
    case UPDATE_COMMISSION_INSTRUCTION_INDEX:
      return 'UpdateCommission';
    case AUTHORIZE_CHECKED_INSTRUCTION_INDEX:
      return 'AuthorizeChecked';
    case AUTHORIZE_WITH_SEED_INSTRUCTION_INDEX:
      return 'AuthorizeWithSeed';
    case AUTHORIZE_CHECKED_WITH_SEED_INSTRUCTION_INDEX:
      return 'AuthorizeCheckedWithSeed';
    // These instructions are real upstream vote-program instructions, but they
    // are validator voting/runtime flows rather than the account-management
    // API this client intentionally exposes. If we ever add support for
    // decoding them, prefer a separate low-level inspection surface instead of
    // widening VoteInstruction's supported public contract.
    case VOTE_INSTRUCTION_INDEX:
    case VOTE_SWITCH_INSTRUCTION_INDEX:
    case UPDATE_VOTE_STATE_INSTRUCTION_INDEX:
    case UPDATE_VOTE_STATE_SWITCH_INSTRUCTION_INDEX:
    case COMPACT_UPDATE_VOTE_STATE_INSTRUCTION_INDEX:
    case COMPACT_UPDATE_VOTE_STATE_SWITCH_INSTRUCTION_INDEX:
    case TOWER_SYNC_INSTRUCTION_INDEX:
    case TOWER_SYNC_SWITCH_INSTRUCTION_INDEX:
      throw new Error(
        `invalid instruction; unsupported vote-program instruction index ${instructionIndex}`,
      );
    default:
      throw new Error(
        `invalid instruction; unknown instruction index ${instructionIndex}`,
      );
  }
}

/**
 * VoteAuthorize type
 */
export type VoteAuthorizationType = {
  /** The VoteAuthorize index (from solana-vote-program) */
  index: number;
};

/**
 * An enumeration of valid VoteAuthorization layouts.
 */
export const VoteAuthorizationLayout = Object.freeze({
  Voter: {
    index: 0,
  },
  Withdrawer: {
    index: 1,
  },
} as const);

/**
 * Vote Instruction class
 */
export class VoteInstruction {
  /**
   * Decode a vote instruction and retrieve the instruction type.
   */
  static decodeInstructionType(
    instruction: TransactionInstruction,
  ): VoteInstructionType {
    this.checkProgramId(instruction.programId);

    return getVoteInstructionType(instruction);
  }

  /**
   * Decode an initialize vote instruction and retrieve the instruction params.
   */
  static decodeInitializeAccount(
    instruction: TransactionInstruction,
  ): InitializeAccountParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 4);

    const {voteInit} = decodeVoteInstructionData(
      instruction,
      INITIALIZE_ACCOUNT_INSTRUCTION_INDEX,
      INITIALIZE_ACCOUNT_CODEC,
    );

    return {
      votePubkey: instruction.keys[0].pubkey,
      nodePubkey: instruction.keys[3].pubkey,
      voteInit: new VoteInit(
        new PublicKey(voteInit.nodePubkey),
        new PublicKey(voteInit.authorizedVoter),
        new PublicKey(voteInit.authorizedWithdrawer),
        voteInit.commission,
      ),
    };
  }

  /**
   * Decode an authorize instruction and retrieve the instruction params.
   */
  static decodeAuthorize(
    instruction: TransactionInstruction,
  ): AuthorizeVoteParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);

    const {newAuthorized, voteAuthorizationType} = decodeVoteInstructionData(
      instruction,
      AUTHORIZE_INSTRUCTION_INDEX,
      AUTHORIZE_CODEC,
    );

    return {
      votePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: instruction.keys[2].pubkey,
      newAuthorizedPubkey: new PublicKey(newAuthorized),
      voteAuthorizationType: {
        index: voteAuthorizationType,
      },
    };
  }

  /**
   * Decode an authorize-checked instruction and retrieve the instruction params.
   */
  static decodeAuthorizeChecked(
    instruction: TransactionInstruction,
  ): AuthorizeCheckedVoteParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 4);

    const {voteAuthorizationType} = decodeVoteInstructionData(
      instruction,
      AUTHORIZE_CHECKED_INSTRUCTION_INDEX,
      AUTHORIZE_CHECKED_CODEC,
    );

    return {
      votePubkey: instruction.keys[0].pubkey,
      authorizedPubkey: instruction.keys[2].pubkey,
      newAuthorizedPubkey: instruction.keys[3].pubkey,
      voteAuthorizationType: {
        index: voteAuthorizationType,
      },
    };
  }

  /**
   * Decode an authorize instruction and retrieve the instruction params.
   */
  static decodeAuthorizeWithSeed(
    instruction: TransactionInstruction,
  ): AuthorizeVoteWithSeedParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);

    const {
      voteAuthorizeWithSeedArgs: {
        currentAuthorityDerivedKeyOwnerPubkey,
        currentAuthorityDerivedKeySeed,
        newAuthorized,
        voteAuthorizationType,
      },
    } = decodeVoteInstructionData(
      instruction,
      AUTHORIZE_WITH_SEED_INSTRUCTION_INDEX,
      AUTHORIZE_WITH_SEED_CODEC,
    );

    return {
      currentAuthorityDerivedKeyBasePubkey: instruction.keys[2].pubkey,
      currentAuthorityDerivedKeyOwnerPubkey: new PublicKey(
        currentAuthorityDerivedKeyOwnerPubkey,
      ),
      currentAuthorityDerivedKeySeed: currentAuthorityDerivedKeySeed,
      newAuthorizedPubkey: new PublicKey(newAuthorized),
      voteAuthorizationType: {
        index: voteAuthorizationType,
      },
      votePubkey: instruction.keys[0].pubkey,
    };
  }

  /**
   * Decode an authorize-checked-with-seed instruction and retrieve the params.
   */
  static decodeAuthorizeCheckedWithSeed(
    instruction: TransactionInstruction,
  ): AuthorizeCheckedVoteWithSeedParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 4);

    const {
      currentAuthorityDerivedKeyOwnerPubkey,
      currentAuthorityDerivedKeySeed,
      voteAuthorizationType,
    } = decodeVoteInstructionData(
      instruction,
      AUTHORIZE_CHECKED_WITH_SEED_INSTRUCTION_INDEX,
      AUTHORIZE_CHECKED_WITH_SEED_CODEC,
    );

    return {
      currentAuthorityDerivedKeyBasePubkey: instruction.keys[2].pubkey,
      currentAuthorityDerivedKeyOwnerPubkey: new PublicKey(
        currentAuthorityDerivedKeyOwnerPubkey,
      ),
      currentAuthorityDerivedKeySeed,
      newAuthorizedPubkey: instruction.keys[3].pubkey,
      voteAuthorizationType: {
        index: voteAuthorizationType,
      },
      votePubkey: instruction.keys[0].pubkey,
    };
  }

  /**
   * Decode a withdraw instruction and retrieve the instruction params.
   */
  static decodeWithdraw(
    instruction: TransactionInstruction,
  ): DecodedWithdrawFromVoteAccountParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);

    const {lamports} = decodeVoteInstructionData(
      instruction,
      WITHDRAW_INSTRUCTION_INDEX,
      WITHDRAW_CODEC,
    );

    return {
      votePubkey: instruction.keys[0].pubkey,
      authorizedWithdrawerPubkey: instruction.keys[2].pubkey,
      lamports,
      toPubkey: instruction.keys[1].pubkey,
    };
  }

  /**
   * Decode an update-validator-identity instruction and retrieve the params.
   */
  static decodeUpdateValidatorIdentity(
    instruction: TransactionInstruction,
  ): UpdateValidatorIdentityParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);

    decodeVoteInstructionData(
      instruction,
      UPDATE_VALIDATOR_IDENTITY_INSTRUCTION_INDEX,
      UPDATE_VALIDATOR_IDENTITY_CODEC,
    );

    return {
      votePubkey: instruction.keys[0].pubkey,
      nodePubkey: instruction.keys[1].pubkey,
      authorizedWithdrawerPubkey: instruction.keys[2].pubkey,
    };
  }

  /**
   * Decode an update-commission instruction and retrieve the params.
   */
  static decodeUpdateCommission(
    instruction: TransactionInstruction,
  ): UpdateCommissionVoteParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);

    const {commission} = decodeVoteInstructionData(
      instruction,
      UPDATE_COMMISSION_INSTRUCTION_INDEX,
      UPDATE_COMMISSION_CODEC,
    );

    return {
      votePubkey: instruction.keys[0].pubkey,
      authorizedWithdrawerPubkey: instruction.keys[1].pubkey,
      commission,
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId: PublicKey) {
    if (!programId.equals(VoteProgram.programId)) {
      throw new Error('invalid instruction; programId is not VoteProgram');
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
 * Factory class for transactions to interact with the Vote program
 */
export class VoteProgram {
  /**
   * Public key that identifies the Vote program
   */
  static programId: PublicKey = VOTE_PROGRAM_ID;

  /**
   * Max Space for newly created vote accounts using the current Agave vote-state
   * layout targeted by this client.
   *
   * Vote Program v3.1.13 (https://docs.rs/solana-vote-program/3.1.13/solana_vote_program/) reports:
   * - `VoteStateV4::size_of() == 3762`
   * - `VoteStateV3::size_of() == 3762`
   * - `VoteState1_14_11::size_of() == 3731`
   *
   * The smaller legacy `VoteState1_14_11` size does not change this
   * constant: existing historical vote accounts may still use that older
   * layout, but new accounts should allocate enough space for the current
   * V3/V4 layout.
   *
   * Keep this in sync with Agave vote-program sizing in
   * https://github.com/anza-xyz/agave/blob/3134055b562e95902233be308453fffa1c4a8902/programs/vote/src/vote_state/mod.rs.
   */
  static space: number = 3762;

  /**
   * Generate an Initialize instruction.
   */
  static initializeAccount(
    params: InitializeAccountParams,
  ): TransactionInstruction {
    const {votePubkey, nodePubkey, voteInit} = params;
    return new TransactionInstruction({
      keys: [
        {pubkey: votePubkey, isSigner: false, isWritable: true},
        {pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
        {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
        {pubkey: nodePubkey, isSigner: true, isWritable: false},
      ],
      programId: this.programId,
      data: encodeVoteInstructionData(
        INITIALIZE_ACCOUNT_INSTRUCTION_INDEX,
        INITIALIZE_ACCOUNT_CODEC,
        {
          voteInit: {
            nodePubkey: voteInit.nodePubkey.toBytes(),
            authorizedVoter: voteInit.authorizedVoter.toBytes(),
            authorizedWithdrawer: voteInit.authorizedWithdrawer.toBytes(),
            commission: voteInit.commission,
          },
        },
      ),
    });
  }

  /**
   * Generate a transaction that creates a new Vote account.
   */
  static createAccount(params: CreateVoteAccountParams): Transaction {
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: params.fromPubkey,
        newAccountPubkey: params.votePubkey,
        lamports: params.lamports,
        space: this.space,
        programId: this.programId,
      }),
    );

    return transaction.add(
      this.initializeAccount({
        votePubkey: params.votePubkey,
        nodePubkey: params.voteInit.nodePubkey,
        voteInit: params.voteInit,
      }),
    );
  }

  /**
   * Generate a transaction that authorizes a new Voter or Withdrawer on the Vote account.
   */
  static authorize(params: AuthorizeVoteParams): Transaction {
    const {
      votePubkey,
      authorizedPubkey,
      newAuthorizedPubkey,
      voteAuthorizationType,
    } = params;

    const keys = [
      {pubkey: votePubkey, isSigner: false, isWritable: true},
      {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
      {pubkey: authorizedPubkey, isSigner: true, isWritable: false},
    ];

    return new Transaction().add(
      new TransactionInstruction({
        keys,
        programId: this.programId,
        data: encodeVoteInstructionData(
          AUTHORIZE_INSTRUCTION_INDEX,
          AUTHORIZE_CODEC,
          {
            newAuthorized: newAuthorizedPubkey.toBytes(),
            voteAuthorizationType: voteAuthorizationType.index,
          },
        ),
      }),
    );
  }

  /**
   * Generate a transaction that authorizes a new Voter or Withdrawer and requires the new
   * authority to sign.
   */
  static authorizeChecked(params: AuthorizeCheckedVoteParams): Transaction {
    const {
      votePubkey,
      authorizedPubkey,
      newAuthorizedPubkey,
      voteAuthorizationType,
    } = params;

    return new Transaction().add(
      new TransactionInstruction({
        keys: [
          {pubkey: votePubkey, isSigner: false, isWritable: true},
          {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
          {pubkey: authorizedPubkey, isSigner: true, isWritable: false},
          {pubkey: newAuthorizedPubkey, isSigner: true, isWritable: false},
        ],
        programId: this.programId,
        data: encodeVoteInstructionData(
          AUTHORIZE_CHECKED_INSTRUCTION_INDEX,
          AUTHORIZE_CHECKED_CODEC,
          {voteAuthorizationType: voteAuthorizationType.index},
        ),
      }),
    );
  }

  /**
   * Generate a transaction that authorizes a new Voter or Withdrawer on the Vote account
   * where the current Voter or Withdrawer authority is a derived key.
   */
  static authorizeWithSeed(params: AuthorizeVoteWithSeedParams): Transaction {
    const {
      currentAuthorityDerivedKeyBasePubkey,
      currentAuthorityDerivedKeyOwnerPubkey,
      currentAuthorityDerivedKeySeed,
      newAuthorizedPubkey,
      voteAuthorizationType,
      votePubkey,
    } = params;

    const keys = [
      {pubkey: votePubkey, isSigner: false, isWritable: true},
      {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
      {
        pubkey: currentAuthorityDerivedKeyBasePubkey,
        isSigner: true,
        isWritable: false,
      },
    ];

    return new Transaction().add(
      new TransactionInstruction({
        keys,
        programId: this.programId,
        data: encodeVoteInstructionData(
          AUTHORIZE_WITH_SEED_INSTRUCTION_INDEX,
          AUTHORIZE_WITH_SEED_CODEC,
          {
            voteAuthorizeWithSeedArgs: {
              currentAuthorityDerivedKeyOwnerPubkey:
                currentAuthorityDerivedKeyOwnerPubkey.toBytes(),
              currentAuthorityDerivedKeySeed: currentAuthorityDerivedKeySeed,
              newAuthorized: newAuthorizedPubkey.toBytes(),
              voteAuthorizationType: voteAuthorizationType.index,
            },
          },
        ),
      }),
    );
  }

  /**
   * Generate a transaction that authorizes a new Voter or Withdrawer from a derived key and
   * requires the new authority to sign.
   */
  static authorizeCheckedWithSeed(
    params: AuthorizeCheckedVoteWithSeedParams,
  ): Transaction {
    const {
      currentAuthorityDerivedKeyBasePubkey,
      currentAuthorityDerivedKeyOwnerPubkey,
      currentAuthorityDerivedKeySeed,
      newAuthorizedPubkey,
      voteAuthorizationType,
      votePubkey,
    } = params;

    return new Transaction().add(
      new TransactionInstruction({
        keys: [
          {pubkey: votePubkey, isSigner: false, isWritable: true},
          {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
          {
            pubkey: currentAuthorityDerivedKeyBasePubkey,
            isSigner: true,
            isWritable: false,
          },
          {pubkey: newAuthorizedPubkey, isSigner: true, isWritable: false},
        ],
        programId: this.programId,
        data: encodeVoteInstructionData(
          AUTHORIZE_CHECKED_WITH_SEED_INSTRUCTION_INDEX,
          AUTHORIZE_CHECKED_WITH_SEED_CODEC,
          {
            voteAuthorizationType: voteAuthorizationType.index,
            currentAuthorityDerivedKeyOwnerPubkey:
              currentAuthorityDerivedKeyOwnerPubkey.toBytes(),
            currentAuthorityDerivedKeySeed,
          },
        ),
      }),
    );
  }

  /**
   * Generate a transaction to withdraw from a Vote account.
   */
  static withdraw(params: WithdrawFromVoteAccountParams): Transaction {
    const {votePubkey, authorizedWithdrawerPubkey, lamports, toPubkey} = params;
    const keys = [
      {pubkey: votePubkey, isSigner: false, isWritable: true},
      {pubkey: toPubkey, isSigner: false, isWritable: true},
      {pubkey: authorizedWithdrawerPubkey, isSigner: true, isWritable: false},
    ];

    return new Transaction().add(
      new TransactionInstruction({
        keys,
        programId: this.programId,
        data: encodeVoteInstructionData(
          WITHDRAW_INSTRUCTION_INDEX,
          WITHDRAW_CODEC,
          {lamports},
        ),
      }),
    );
  }

  /**
   * Generate a transaction to withdraw safely from a Vote account.
   *
   * This function was created as a safeguard for vote accounts running validators, `safeWithdraw`
   * checks that the withdraw amount will not exceed the specified balance while leaving enough left
   * to cover rent. If you wish to close the vote account by withdrawing the full amount, call the
   * `withdraw` method directly.
   */
  static safeWithdraw(
    params: WithdrawFromVoteAccountParams,
    currentVoteAccountBalance: number | bigint,
    rentExemptMinimum: number | bigint,
  ): Transaction {
    const lamports = coerceU64ToBigInt(params.lamports, 'lamports');
    const currentBalance = coerceU64ToBigInt(
      currentVoteAccountBalance,
      'currentVoteAccountBalance',
    );
    const rentMinimum = coerceU64ToBigInt(
      rentExemptMinimum,
      'rentExemptMinimum',
    );

    if (lamports > currentBalance - rentMinimum) {
      throw new Error(
        'Withdraw will leave vote account with insufficient funds.',
      );
    }

    return VoteProgram.withdraw(params);
  }

  /**
   * Generate a transaction to update the commission on a Vote account.
   */
  static updateCommission(params: UpdateCommissionVoteParams): Transaction {
    const {votePubkey, authorizedWithdrawerPubkey, commission} = params;

    return new Transaction().add(
      new TransactionInstruction({
        keys: [
          {pubkey: votePubkey, isSigner: false, isWritable: true},
          {
            pubkey: authorizedWithdrawerPubkey,
            isSigner: true,
            isWritable: false,
          },
        ],
        programId: this.programId,
        data: encodeVoteInstructionData(
          UPDATE_COMMISSION_INSTRUCTION_INDEX,
          UPDATE_COMMISSION_CODEC,
          {commission},
        ),
      }),
    );
  }

  /**
   * Generate a transaction to update the validator identity (node pubkey) of a Vote account.
   */
  static updateValidatorIdentity(
    params: UpdateValidatorIdentityParams,
  ): Transaction {
    const {votePubkey, authorizedWithdrawerPubkey, nodePubkey} = params;
    const keys = [
      {pubkey: votePubkey, isSigner: false, isWritable: true},
      {pubkey: nodePubkey, isSigner: true, isWritable: false},
      {pubkey: authorizedWithdrawerPubkey, isSigner: true, isWritable: false},
    ];

    return new Transaction().add(
      new TransactionInstruction({
        keys,
        programId: this.programId,
        data: encodeVoteInstructionData(
          UPDATE_VALIDATOR_IDENTITY_INSTRUCTION_INDEX,
          UPDATE_VALIDATOR_IDENTITY_CODEC,
        ),
      }),
    );
  }
}
