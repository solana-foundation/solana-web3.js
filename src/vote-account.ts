import type {Codec} from '@solana/codecs-core';
import {fixCodecSize, transformCodec} from '@solana/codecs-core';
import {
  getArrayCodec,
  getBytesCodec,
  getEnumCodec,
  getStructCodec,
} from '@solana/codecs-data-structures';
import {getU32Codec, getU64Codec, getU8Codec} from '@solana/codecs-numbers';
import {
  SolanaError,
  SOLANA_ERROR__CODECS__ENUM_DISCRIMINATOR_OUT_OF_RANGE,
} from '@solana/errors';

import {Address} from './address';
import {toUint8ArrayView} from './utils/typed-array';

export const VOTE_PROGRAM_ID = new Address(
  'Vote111111111111111111111111111111111111111',
);

/**
 * Vote account state versions
 */
export enum VoteStateVersion {
  Uninitialized,
  V1_14_11,
}

type VoteStateVersionValue = Extract<
  (typeof VoteStateVersion)[keyof typeof VoteStateVersion],
  number
>;

type SupportedVoteStateVersion = Exclude<
  VoteStateVersionValue,
  VoteStateVersion.Uninitialized
>;

export type Lockout = {
  slot: number;
  confirmationCount: number;
};

/**
 * History of how many credits earned by the end of each epoch
 */
export type EpochCredits = Readonly<{
  epoch: number;
  credits: number;
  prevCredits: number;
}>;

export type AuthorizedVoter = Readonly<{
  epoch: number;
  authorizedVoter: Address;
}>;

type AuthorizedVoterRaw = Readonly<{
  authorizedVoter: Uint8Array;
  epoch: number;
}>;

type PriorVoters = Readonly<{
  buf: PriorVoterRaw[];
  idx: number;
  isEmpty: number;
}>;

export type PriorVoter = Readonly<{
  authorizedPubkey: Address;
  epochOfLastAuthorizedSwitch: number;
  targetEpoch: number;
}>;

type PriorVoterRaw = Readonly<{
  authorizedPubkey: Uint8Array;
  epochOfLastAuthorizedSwitch: number;
  targetEpoch: number;
}>;

export type BlockTimestamp = Readonly<{
  slot: number;
  timestamp: number;
}>;

export type VoteAccountData = Readonly<{
  authorizedVoters: AuthorizedVoterRaw[];
  authorizedWithdrawer: Uint8Array;
  commission: number;
  epochCredits: EpochCredits[];
  lastTimestamp: BlockTimestamp;
  nodePubkey: Uint8Array;
  priorVoters: PriorVoters;
  rootSlot: number;
  rootSlotValid: number;
  votes: Lockout[];
}>;

const U8_CODEC = getU8Codec();
const U32_CODEC = getU32Codec();
const U64_CODEC = getU64Codec();

const U64_NUMBER_CODEC = transformCodec(
  U64_CODEC,
  (value: number | bigint) => BigInt(value),
  (value: bigint) => Number(value),
);

const PUBLIC_KEY_CODEC = transformCodec(
  fixCodecSize(getBytesCodec(), 32),
  (value: Uint8Array) => value,
  value => new Uint8Array(value),
);

const ACCOUNT_VERSION_CODEC = getEnumCodec(VoteStateVersion, {
  size: U32_CODEC,
});

const LOCKOUT_CODEC = getStructCodec([
  ['slot', U64_NUMBER_CODEC],
  ['confirmationCount', U32_CODEC],
]);

const AUTHORIZED_VOTER_CODEC = getStructCodec([
  ['epoch', U64_NUMBER_CODEC],
  ['authorizedVoter', PUBLIC_KEY_CODEC],
]);

const PRIOR_VOTER_CODEC = getStructCodec([
  ['authorizedPubkey', PUBLIC_KEY_CODEC],
  ['epochOfLastAuthorizedSwitch', U64_NUMBER_CODEC],
  ['targetEpoch', U64_NUMBER_CODEC],
]);

const PRIOR_VOTERS_CODEC = getStructCodec([
  ['buf', getArrayCodec(PRIOR_VOTER_CODEC, {size: 32})],
  ['idx', U64_NUMBER_CODEC],
  ['isEmpty', U8_CODEC],
]);

const EPOCH_CREDITS_CODEC = getStructCodec([
  ['epoch', U64_NUMBER_CODEC],
  ['credits', U64_NUMBER_CODEC],
  ['prevCredits', U64_NUMBER_CODEC],
]);

const BLOCK_TIMESTAMP_CODEC = getStructCodec([
  ['slot', U64_NUMBER_CODEC],
  ['timestamp', U64_NUMBER_CODEC],
]);

const VOTE_ACCOUNT_V1_14_11_CODEC = getStructCodec([
  ['nodePubkey', PUBLIC_KEY_CODEC],
  ['authorizedWithdrawer', PUBLIC_KEY_CODEC],
  ['commission', U8_CODEC],
  ['votes', getArrayCodec(LOCKOUT_CODEC, {size: U64_NUMBER_CODEC})],
  ['rootSlotValid', U8_CODEC],
  ['rootSlot', U64_NUMBER_CODEC],
  [
    'authorizedVoters',
    getArrayCodec(AUTHORIZED_VOTER_CODEC, {size: U64_NUMBER_CODEC}),
  ],
  ['priorVoters', PRIOR_VOTERS_CODEC],
  [
    'epochCredits',
    getArrayCodec(EPOCH_CREDITS_CODEC, {size: U64_NUMBER_CODEC}),
  ],
  ['lastTimestamp', BLOCK_TIMESTAMP_CODEC],
]);

/**
 * @internal
 */
export const __TEST_ONLY__VOTE_ACCOUNT_V1_14_11_CODEC =
  VOTE_ACCOUNT_V1_14_11_CODEC;

const ACCOUNT_STATE_CODECS = {
  [VoteStateVersion.V1_14_11]: VOTE_ACCOUNT_V1_14_11_CODEC,
} satisfies Record<SupportedVoteStateVersion, Codec<VoteAccountData>>;

/**
 * See https://github.com/solana-labs/solana/blob/8a12ed029cfa38d4a45400916c2463fb82bbec8c/programs/vote_api/src/vote_state.rs#L68-L88
 *
 * @internal
 */
const decodeVoteAccountData = (bytes: Uint8Array): VoteAccountData => {
  try {
    const version = ACCOUNT_VERSION_CODEC.decode(bytes);

    if (version == VoteStateVersion.Uninitialized) {
      throw new Error('Vote account is uninitialized');
    }

    return ACCOUNT_STATE_CODECS[version].decode(
      bytes,
      ACCOUNT_VERSION_CODEC.fixedSize,
    );
  } catch (error) {
    if (
      error instanceof SolanaError &&
      error.context.__code ==
        SOLANA_ERROR__CODECS__ENUM_DISCRIMINATOR_OUT_OF_RANGE
    ) {
      throw new Error(
        `Unsupported vote account version: ${error.context.discriminator}. Supported versions: ${Array.from(error.context.validDiscriminators).join(', ')}.`,
      );
    }

    throw error;
  }
};

type VoteAccountArgs = {
  nodePubkey: Address;
  authorizedWithdrawer: Address;
  commission: number;
  rootSlot: number | null;
  votes: Lockout[];
  authorizedVoters: AuthorizedVoter[];
  priorVoters: PriorVoter[];
  epochCredits: EpochCredits[];
  lastTimestamp: BlockTimestamp;
};

/**
 * VoteAccount class
 */
export class VoteAccount {
  nodePubkey: Address;
  authorizedWithdrawer: Address;
  commission: number;
  rootSlot: number | null;
  votes: Lockout[];
  authorizedVoters: AuthorizedVoter[];
  priorVoters: PriorVoter[];
  epochCredits: EpochCredits[];
  lastTimestamp: BlockTimestamp;

  /**
   * @internal
   */
  constructor(args: VoteAccountArgs) {
    this.nodePubkey = args.nodePubkey;
    this.authorizedWithdrawer = args.authorizedWithdrawer;
    this.commission = args.commission;
    this.rootSlot = args.rootSlot;
    this.votes = args.votes;
    this.authorizedVoters = args.authorizedVoters;
    this.priorVoters = args.priorVoters;
    this.epochCredits = args.epochCredits;
    this.lastTimestamp = args.lastTimestamp;
  }

  /**
   * Deserialize VoteAccount from the account data.
   *
   * @param bufferLike account data
   * @return VoteAccount
   */
  static fromAccountData(bufferLike: Uint8Array | Array<number>): VoteAccount {
    const va = decodeVoteAccountData(toUint8ArrayView(bufferLike));

    let rootSlot: number | null = va.rootSlot;
    if (!va.rootSlotValid) {
      rootSlot = null;
    }

    return new VoteAccount({
      nodePubkey: new Address(va.nodePubkey),
      authorizedWithdrawer: new Address(va.authorizedWithdrawer),
      commission: va.commission,
      votes: va.votes,
      rootSlot,
      authorizedVoters: va.authorizedVoters.map(parseAuthorizedVoter),
      priorVoters: getPriorVoters(va.priorVoters),
      epochCredits: va.epochCredits,
      lastTimestamp: va.lastTimestamp,
    });
  }
}

function parseAuthorizedVoter({
  authorizedVoter,
  epoch,
}: AuthorizedVoterRaw): AuthorizedVoter {
  return {
    epoch,
    authorizedVoter: new Address(authorizedVoter),
  };
}

function parsePriorVoters({
  authorizedPubkey,
  epochOfLastAuthorizedSwitch,
  targetEpoch,
}: PriorVoterRaw): PriorVoter {
  return {
    authorizedPubkey: new Address(authorizedPubkey),
    epochOfLastAuthorizedSwitch,
    targetEpoch,
  };
}

function getPriorVoters({buf, idx, isEmpty}: PriorVoters): PriorVoter[] {
  if (isEmpty) {
    return [];
  }

  return [
    ...buf.slice(idx + 1).map(parsePriorVoters),
    ...buf.slice(0, idx).map(parsePriorVoters),
  ];
}
