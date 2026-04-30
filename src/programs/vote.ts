import type {Codec} from '@solana/codecs-core';
import {fixCodecSize, transformCodec} from '@solana/codecs-core';
import {getBytesCodec, getStructCodec} from '@solana/codecs-data-structures';
import {getI64Codec, getU32Codec, getU8Codec} from '@solana/codecs-numbers';

import {RUST_STRING_CODEC} from '../codecs';
import {Address} from '../address';
import {SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY} from '../sysvar';
import {Transaction, TransactionInstruction} from '../transaction';
import {toUint8ArrayView} from '../utils/typed-array';
import {SystemProgram} from './system';

/**
 * Vote account info
 */
export class VoteInit {
  nodePubkey: Address;
  authorizedVoter: Address;
  authorizedWithdrawer: Address;
  commission: number; /** [0, 100] */

  constructor(
    nodePubkey: Address,
    authorizedVoter: Address,
    authorizedWithdrawer: Address,
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
  fromPubkey: Address;
  votePubkey: Address;
  voteInit: VoteInit;
  lamports: number;
};

/**
 * InitializeAccount instruction params
 */
export type InitializeAccountParams = {
  votePubkey: Address;
  nodePubkey: Address;
  voteInit: VoteInit;
};

/**
 * Authorize instruction params
 */
export type AuthorizeVoteParams = {
  votePubkey: Address;
  /** Current vote or withdraw authority, depending on `voteAuthorizationType` */
  authorizedPubkey: Address;
  newAuthorizedPubkey: Address;
  voteAuthorizationType: VoteAuthorizationType;
};

/**
 * AuthorizeWithSeed instruction params
 */
export type AuthorizeVoteWithSeedParams = {
  currentAuthorityDerivedKeyBasePubkey: Address;
  currentAuthorityDerivedKeyOwnerPubkey: Address;
  currentAuthorityDerivedKeySeed: string;
  newAuthorizedPubkey: Address;
  voteAuthorizationType: VoteAuthorizationType;
  votePubkey: Address;
};

/**
 * Withdraw from vote account transaction params
 */
export type WithdrawFromVoteAccountParams = {
  votePubkey: Address;
  authorizedWithdrawerPubkey: Address;
  lamports: number;
  toPubkey: Address;
};

/**
 * Update validator identity (node pubkey) vote account instruction params.
 */
export type UpdateValidatorIdentityParams = {
  votePubkey: Address;
  authorizedWithdrawerPubkey: Address;
  nodePubkey: Address;
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
  | 'AuthorizeWithSeed'
  | 'InitializeAccount'
  | 'Withdraw'
  | 'UpdateValidatorIdentity';

/** @internal */
export type VoteAuthorizeWithSeedArgs = Readonly<{
  currentAuthorityDerivedKeyOwnerPubkey: Uint8Array;
  currentAuthorityDerivedKeySeed: string;
  newAuthorized: Uint8Array;
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

const VOTE_PROGRAM_ID = new Address(
  'Vote111111111111111111111111111111111111111',
);

const U32_CODEC = getU32Codec();
const U8_CODEC = getU8Codec();
const I64_NUMBER_CODEC = transformCodec(
  getI64Codec(),
  (value: number) => BigInt(value),
  (value: bigint) => Number(value),
);
const PUBLIC_KEY_BYTES_CODEC = fixCodecSize(getBytesCodec(), 32);
const INITIALIZE_ACCOUNT_INSTRUCTION_INDEX = 0;
const AUTHORIZE_INSTRUCTION_INDEX = 1;
const WITHDRAW_INSTRUCTION_INDEX = 3;
const UPDATE_VALIDATOR_IDENTITY_INSTRUCTION_INDEX = 4;
const AUTHORIZE_WITH_SEED_INSTRUCTION_INDEX = 10;
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
const WITHDRAW_CODEC = getStructCodec([
  ['instruction', U32_CODEC],
  ['lamports', I64_NUMBER_CODEC],
]);
const UPDATE_VALIDATOR_IDENTITY_CODEC = getStructCodec([
  ['instruction', U32_CODEC],
]);
const AUTHORIZE_WITH_SEED_CODEC = getStructCodec([
  ['instruction', U32_CODEC],
  ['voteAuthorizeWithSeedArgs', VOTE_AUTHORIZE_WITH_SEED_CODEC],
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
    case AUTHORIZE_WITH_SEED_INSTRUCTION_INDEX:
      return 'AuthorizeWithSeed';
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
});

/**
 * Vote Instruction class
 */
export class VoteInstruction {
  /**
   * @internal
   */
  constructor() {}

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
        new Address(voteInit.nodePubkey),
        new Address(voteInit.authorizedVoter),
        new Address(voteInit.authorizedWithdrawer),
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
      newAuthorizedPubkey: new Address(newAuthorized),
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
      currentAuthorityDerivedKeyOwnerPubkey: new Address(
        currentAuthorityDerivedKeyOwnerPubkey,
      ),
      currentAuthorityDerivedKeySeed: currentAuthorityDerivedKeySeed,
      newAuthorizedPubkey: new Address(newAuthorized),
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
  ): WithdrawFromVoteAccountParams {
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
   * @internal
   */
  static checkProgramId(programId: Address) {
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
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the Vote program
   */
  static programId: Address = VOTE_PROGRAM_ID;

  /**
   * Max space of a Vote account
   *
   * This is generated from the solana-vote-program VoteState struct as
   * `VoteState::size_of()`:
   * https://docs.rs/solana-vote-program/1.9.5/solana_vote_program/vote_state/struct.VoteState.html#method.size_of
   *
   * KEEP IN SYNC WITH `VoteState::size_of()` in https://github.com/solana-labs/solana/blob/a474cb24b9238f5edcc982f65c0b37d4a1046f7e/sdk/program/src/vote/state/mod.rs#L340-L342
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
    currentVoteAccountBalance: number,
    rentExemptMinimum: number,
  ): Transaction {
    if (params.lamports > currentVoteAccountBalance - rentExemptMinimum) {
      throw new Error(
        'Withdraw will leave vote account with insufficient funds.',
      );
    }
    return VoteProgram.withdraw(params);
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