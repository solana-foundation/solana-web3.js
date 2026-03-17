import * as BufferLayout from '@solana/buffer-layout';

import {
  addCodecSizePrefix,
  fixCodecSize,
  transformCodec,
} from '@solana/codecs-core';
import {getBytesCodec, getStructCodec} from '@solana/codecs-data-structures';
import {
  getI64Codec,
  getU32Codec,
  getU64Codec,
  getU8Codec,
} from '@solana/codecs-numbers';
import {getUtf8Codec} from '@solana/codecs-strings';

import {
  InstructionType,
  IInstructionInputData,
  ProgramInstructions,
} from '../instruction';
import * as Layout from '../layout';
import {Address} from '../address';
import {SystemProgram} from './system';
import {SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY} from '../sysvar';
import {Transaction, TransactionInstruction} from '../transaction';
import {toBuffer} from '../utils/to-buffer';

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

    return INSTRUCTIONS.getInstructionType(instruction) as VoteInstructionType;
  }

  /**
   * Decode an initialize vote instruction and retrieve the instruction params.
   */
  static decodeInitializeAccount(
    instruction: TransactionInstruction,
  ): InitializeAccountParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 4);

    const {voteInit} = INSTRUCTIONS.InitializeAccount.decode(instruction);

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

    const {newAuthorized, voteAuthorizationType} =
      INSTRUCTIONS.Authorize.decode(instruction);

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
    } = INSTRUCTIONS.AuthorizeWithSeed.decode(instruction);

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

    const {lamports} = INSTRUCTIONS.Withdraw.decode(instruction);

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
 * An enumeration of valid VoteInstructionType's
 */
export type VoteInstructionType =
  // FIXME
  // It would be preferable for this type to be `keyof VoteInstructionInputData`
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

const VOTE_PROGRAM_ID = new Address(
  'Vote111111111111111111111111111111111111111',
);

const U32_CODEC = getU32Codec();
const U8_CODEC = getU8Codec();
const U64_CODEC = getU64Codec();
const I64_NUMBER_CODEC = transformCodec(
  getI64Codec(),
  (value: number) => BigInt(value),
  (value: bigint) => Number(value),
);
const PUBLIC_KEY_BYTES_CODEC = fixCodecSize(getBytesCodec(), 32);

const getRustStringCodec = () => addCodecSizePrefix(getUtf8Codec(), U64_CODEC);

const RUST_STRING_CODEC = getRustStringCodec();
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
type VoteInstructionInputData = {
  Authorize: IInstructionInputData & {
    newAuthorized: Uint8Array;
    voteAuthorizationType: number;
  };
  AuthorizeWithSeed: IInstructionInputData & {
    voteAuthorizeWithSeedArgs: VoteAuthorizeWithSeedArgs;
  };
  InitializeAccount: IInstructionInputData & {
    voteInit: Readonly<{
      authorizedVoter: Uint8Array;
      authorizedWithdrawer: Uint8Array;
      commission: number;
      nodePubkey: Uint8Array;
    }>;
  };
  Withdraw: IInstructionInputData & {
    lamports: number;
  };
  UpdateValidatorIdentity: IInstructionInputData;
};

const INSTRUCTION_DEFS = {
  InitializeAccount: {
    index: 0,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['voteInit', VOTE_INIT_CODEC],
    ]),
  },
  Authorize: {
    index: 1,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['newAuthorized', PUBLIC_KEY_BYTES_CODEC],
      ['voteAuthorizationType', U32_CODEC],
    ]),
  },
  Withdraw: {
    index: 3,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['lamports', I64_NUMBER_CODEC],
    ]),
  },
  UpdateValidatorIdentity: {
    index: 4,
    codec: getStructCodec([['instruction', U32_CODEC]]),
  },
  AuthorizeWithSeed: {
    index: 10,
    codec: getStructCodec([
      ['instruction', U32_CODEC],
      ['voteAuthorizeWithSeedArgs', VOTE_AUTHORIZE_WITH_SEED_CODEC],
    ]),
  },
};

/**
 * @internal
 */
export const VOTE_INSTRUCTIONS = ProgramInstructions.create({
  programId: VOTE_PROGRAM_ID,
  instructionIndexCodec: U32_CODEC,
  instructions: INSTRUCTION_DEFS,
});
const INSTRUCTIONS = VOTE_INSTRUCTIONS;

const VOTE_INSTRUCTION_LAYOUTS = Object.freeze<{
  [Instruction in VoteInstructionType]: InstructionType<
    VoteInstructionInputData[Instruction]
  >;
}>({
  InitializeAccount: {
    index: 0,
    layout: BufferLayout.struct<VoteInstructionInputData['InitializeAccount']>([
      BufferLayout.u32('instruction'),
      Layout.voteInit(),
    ]),
  },
  Authorize: {
    index: 1,
    layout: BufferLayout.struct<VoteInstructionInputData['Authorize']>([
      BufferLayout.u32('instruction'),
      Layout.publicKey('newAuthorized'),
      BufferLayout.u32('voteAuthorizationType'),
    ]),
  },
  Withdraw: {
    index: 3,
    layout: BufferLayout.struct<VoteInstructionInputData['Withdraw']>([
      BufferLayout.u32('instruction'),
      BufferLayout.ns64('lamports'),
    ]),
  },
  UpdateValidatorIdentity: {
    index: 4,
    layout: BufferLayout.struct<
      VoteInstructionInputData['UpdateValidatorIdentity']
    >([BufferLayout.u32('instruction')]),
  },
  AuthorizeWithSeed: {
    index: 10,
    layout: BufferLayout.struct<VoteInstructionInputData['AuthorizeWithSeed']>([
      BufferLayout.u32('instruction'),
      Layout.voteAuthorizeWithSeedArgs(),
    ]),
  },
});

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
    return INSTRUCTIONS.InitializeAccount.build(
      {
        voteInit: {
          nodePubkey: toBuffer(voteInit.nodePubkey.toBuffer()),
          authorizedVoter: toBuffer(voteInit.authorizedVoter.toBuffer()),
          authorizedWithdrawer: toBuffer(
            voteInit.authorizedWithdrawer.toBuffer(),
          ),
          commission: voteInit.commission,
        },
      },
      {
        keys: [
          {pubkey: votePubkey, isSigner: false, isWritable: true},
          {pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
          {pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false},
          {pubkey: nodePubkey, isSigner: true, isWritable: false},
        ],
        programId: this.programId,
      },
    );
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
      INSTRUCTIONS.Authorize.build(
        {
          newAuthorized: toBuffer(newAuthorizedPubkey.toBuffer()),
          voteAuthorizationType: voteAuthorizationType.index,
        },
        {keys, programId: this.programId},
      ),
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
      INSTRUCTIONS.AuthorizeWithSeed.build(
        {
          voteAuthorizeWithSeedArgs: {
            currentAuthorityDerivedKeyOwnerPubkey: toBuffer(
              currentAuthorityDerivedKeyOwnerPubkey.toBuffer(),
            ),
            currentAuthorityDerivedKeySeed: currentAuthorityDerivedKeySeed,
            newAuthorized: toBuffer(newAuthorizedPubkey.toBuffer()),
            voteAuthorizationType: voteAuthorizationType.index,
          },
        },
        {keys, programId: this.programId},
      ),
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
      INSTRUCTIONS.Withdraw.build(
        {lamports},
        {keys, programId: this.programId},
      ),
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
      INSTRUCTIONS.UpdateValidatorIdentity.build(undefined, {
        keys,
        programId: this.programId,
      }),
    );
  }
}
