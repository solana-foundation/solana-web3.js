import {
  fixCodecSize,
  getArrayCodec,
  getBytesCodec,
  getI64Codec,
  getOptionCodec,
  getStructCodec,
  getU16Codec,
  getU32Codec,
  getU64Codec,
  getU8Codec,
  transformCodec,
  unwrapOption,
} from '@solana/kit';

import {Address} from './address';
import {
  coerceNullableNumericToBigInt,
  coerceNumericToBigInt,
} from './utils/bigint';
import {toUint8ArrayView} from './utils/typed-array';

export const VOTE_PROGRAM_ID = new Address(
  'Vote111111111111111111111111111111111111111',
);

/**
 * Vote account state versions
 */
export const VoteStateVersion = {
  V1_14_11: 1,
  V3: 2,
  V4: 3,
} as const;

export type VoteStateVersion =
  (typeof VoteStateVersion)[keyof typeof VoteStateVersion];

export type Lockout = {
  slot: bigint;
  confirmationCount: number;
};

/**
 * History of how many credits earned by the end of each epoch
 */
export type EpochCredits = Readonly<{
  epoch: bigint;
  credits: bigint;
  prevCredits: bigint;
}>;

export type AuthorizedVoter = Readonly<{
  epoch: bigint;
  authorizedVoter: Address;
}>;

type AuthorizedVoterRaw = Readonly<{
  authorizedVoter: Uint8Array;
  epoch: bigint;
}>;

type PriorVoters = Readonly<{
  buf: PriorVoterRaw[];
  idx: bigint;
  isEmpty: number;
}>;

export type PriorVoter = Readonly<{
  authorizedPubkey: Address;
  epochOfLastAuthorizedSwitch: bigint;
  targetEpoch: bigint;
}>;

type PriorVoterRaw = Readonly<{
  authorizedPubkey: Uint8Array;
  epochOfLastAuthorizedSwitch: bigint;
  targetEpoch: bigint;
}>;

export type BlockTimestamp = Readonly<{
  slot: bigint;
  timestamp: bigint;
}>;

export type VoteAccountData = Readonly<{
  authorizedVoters: AuthorizedVoterRaw[];
  authorizedWithdrawer: Uint8Array;
  commission: number;
  epochCredits: EpochCredits[];
  lastTimestamp: BlockTimestamp;
  nodePubkey: Uint8Array;
  priorVoters: PriorVoters;
  rootSlot: bigint;
  rootSlotValid: number;
  votes: Lockout[];
}>;

type DecodedVoteAccountData = Readonly<{
  authorizedVoters: AuthorizedVoterRaw[];
  authorizedWithdrawer: Uint8Array;
  blsPubkeyCompressed: Uint8Array | null;
  blockRevenueCollector: Uint8Array | null;
  blockRevenueCommissionBps: number | null;
  commission: number;
  epochCredits: EpochCredits[];
  inflationRewardsCollector: Uint8Array | null;
  inflationRewardsCommissionBps: number | null;
  lastTimestamp: BlockTimestamp;
  nodePubkey: Uint8Array;
  pendingDelegatorRewards: bigint | null;
  priorVoters: PriorVoterRaw[];
  rootSlot: bigint | null;
  votes: Lockout[];
}>;

type LandedVote = Readonly<{
  latency: number;
  lockout: Lockout;
}>;

type VoteAccountV1_14_11CodecValue = Readonly<{
  authorizedVoters: AuthorizedVoterRaw[];
  authorizedWithdrawer: Uint8Array;
  commission: number;
  epochCredits: EpochCredits[];
  lastTimestamp: BlockTimestamp;
  nodePubkey: Uint8Array;
  priorVoters: PriorVoters;
  rootSlot: bigint | null;
  votes: Lockout[];
}>;

type VoteAccountV3CodecValue = Readonly<{
  authorizedVoters: AuthorizedVoterRaw[];
  authorizedWithdrawer: Uint8Array;
  commission: number;
  epochCredits: EpochCredits[];
  lastTimestamp: BlockTimestamp;
  nodePubkey: Uint8Array;
  priorVoters: PriorVoters;
  rootSlot: bigint | null;
  votes: LandedVote[];
}>;

type VoteAccountV4CodecValue = Readonly<{
  authorizedVoters: AuthorizedVoterRaw[];
  authorizedWithdrawer: Uint8Array;
  blsPubkeyCompressed: Uint8Array | null;
  blockRevenueCollector: Uint8Array;
  blockRevenueCommissionBps: number;
  epochCredits: EpochCredits[];
  inflationRewardsCollector: Uint8Array;
  inflationRewardsCommissionBps: number;
  lastTimestamp: BlockTimestamp;
  nodePubkey: Uint8Array;
  pendingDelegatorRewards: bigint;
  rootSlot: bigint | null;
  votes: LandedVote[];
}>;

const PRIOR_VOTERS_COUNT = 32;
const BLS_PUBLIC_KEY_COMPRESSED_SIZE = 48;
const U8_CODEC = getU8Codec();
const U16_CODEC = getU16Codec();
const U32_CODEC = getU32Codec();
const U64_CODEC = getU64Codec();

const U64_BIGINT_CODEC = transformCodec(
  U64_CODEC,
  (value: number | bigint) => coerceNumericToBigInt(value, 'u64'),
  value => value,
);

const I64_BIGINT_CODEC = transformCodec(
  getI64Codec(),
  (value: number | bigint) => coerceNumericToBigInt(value, 'i64'),
  value => value,
);

const PUBLIC_KEY_CODEC = transformCodec(
  fixCodecSize(getBytesCodec(), 32),
  (value: Uint8Array) => value,
  value => new Uint8Array(value),
);

const NULLABLE_U64_BIGINT_CODEC = transformCodec(
  getOptionCodec(U64_CODEC),
  (value: number | bigint | null) =>
    coerceNullableNumericToBigInt(value, 'u64'),
  value => {
    const unwrapped = unwrapOption(value);
    return unwrapped == null ? null : unwrapped;
  },
);

const NULLABLE_BLS_PUBLIC_KEY_COMPRESSED_CODEC = transformCodec(
  getOptionCodec(fixCodecSize(getBytesCodec(), BLS_PUBLIC_KEY_COMPRESSED_SIZE)),
  (value: Uint8Array | null) => value,
  value => {
    const unwrapped = unwrapOption(value);
    return unwrapped == null ? null : new Uint8Array(unwrapped);
  },
);

const LOCKOUT_CODEC = getStructCodec([
  ['slot', U64_BIGINT_CODEC],
  ['confirmationCount', U32_CODEC],
]);

const LANDED_VOTE_CODEC = transformCodec(
  getStructCodec([
    ['latency', U8_CODEC],
    ['slot', U64_BIGINT_CODEC],
    ['confirmationCount', U32_CODEC],
  ]),
  (value: LandedVote) => ({
    latency: value.latency,
    slot: value.lockout.slot,
    confirmationCount: value.lockout.confirmationCount,
  }),
  value => ({
    latency: value.latency,
    lockout: {
      slot: value.slot,
      confirmationCount: value.confirmationCount,
    },
  }),
);

const AUTHORIZED_VOTER_CODEC = getStructCodec([
  ['epoch', U64_BIGINT_CODEC],
  ['authorizedVoter', PUBLIC_KEY_CODEC],
]);

const PRIOR_VOTER_CODEC = getStructCodec([
  ['authorizedPubkey', PUBLIC_KEY_CODEC],
  ['epochOfLastAuthorizedSwitch', U64_BIGINT_CODEC],
  ['targetEpoch', U64_BIGINT_CODEC],
]);

const PRIOR_VOTERS_CODEC = getStructCodec([
  ['buf', getArrayCodec(PRIOR_VOTER_CODEC, {size: PRIOR_VOTERS_COUNT})],
  ['idx', U64_BIGINT_CODEC],
  ['isEmpty', U8_CODEC],
]);

const EPOCH_CREDITS_CODEC = getStructCodec([
  ['epoch', U64_BIGINT_CODEC],
  ['credits', U64_BIGINT_CODEC],
  ['prevCredits', U64_BIGINT_CODEC],
]);

const BLOCK_TIMESTAMP_CODEC = getStructCodec([
  ['slot', U64_BIGINT_CODEC],
  ['timestamp', I64_BIGINT_CODEC],
]);

const VOTE_ACCOUNT_V1_14_11_CODEC = getStructCodec([
  ['nodePubkey', PUBLIC_KEY_CODEC],
  ['authorizedWithdrawer', PUBLIC_KEY_CODEC],
  ['commission', U8_CODEC],
  ['votes', getArrayCodec(LOCKOUT_CODEC, {size: U64_BIGINT_CODEC})],
  ['rootSlot', NULLABLE_U64_BIGINT_CODEC],
  [
    'authorizedVoters',
    getArrayCodec(AUTHORIZED_VOTER_CODEC, {size: U64_BIGINT_CODEC}),
  ],
  ['priorVoters', PRIOR_VOTERS_CODEC],
  [
    'epochCredits',
    getArrayCodec(EPOCH_CREDITS_CODEC, {size: U64_BIGINT_CODEC}),
  ],
  ['lastTimestamp', BLOCK_TIMESTAMP_CODEC],
]);

const VOTE_ACCOUNT_V3_CODEC = getStructCodec([
  ['nodePubkey', PUBLIC_KEY_CODEC],
  ['authorizedWithdrawer', PUBLIC_KEY_CODEC],
  ['commission', U8_CODEC],
  ['votes', getArrayCodec(LANDED_VOTE_CODEC, {size: U64_BIGINT_CODEC})],
  ['rootSlot', NULLABLE_U64_BIGINT_CODEC],
  [
    'authorizedVoters',
    getArrayCodec(AUTHORIZED_VOTER_CODEC, {size: U64_BIGINT_CODEC}),
  ],
  ['priorVoters', PRIOR_VOTERS_CODEC],
  [
    'epochCredits',
    getArrayCodec(EPOCH_CREDITS_CODEC, {size: U64_BIGINT_CODEC}),
  ],
  ['lastTimestamp', BLOCK_TIMESTAMP_CODEC],
]);

const VOTE_ACCOUNT_V4_CODEC = getStructCodec([
  ['nodePubkey', PUBLIC_KEY_CODEC],
  ['authorizedWithdrawer', PUBLIC_KEY_CODEC],
  ['inflationRewardsCollector', PUBLIC_KEY_CODEC],
  ['blockRevenueCollector', PUBLIC_KEY_CODEC],
  ['inflationRewardsCommissionBps', U16_CODEC],
  ['blockRevenueCommissionBps', U16_CODEC],
  ['pendingDelegatorRewards', U64_BIGINT_CODEC],
  ['blsPubkeyCompressed', NULLABLE_BLS_PUBLIC_KEY_COMPRESSED_CODEC],
  ['votes', getArrayCodec(LANDED_VOTE_CODEC, {size: U64_BIGINT_CODEC})],
  ['rootSlot', NULLABLE_U64_BIGINT_CODEC],
  [
    'authorizedVoters',
    getArrayCodec(AUTHORIZED_VOTER_CODEC, {size: U64_BIGINT_CODEC}),
  ],
  [
    'epochCredits',
    getArrayCodec(EPOCH_CREDITS_CODEC, {size: U64_BIGINT_CODEC}),
  ],
  ['lastTimestamp', BLOCK_TIMESTAMP_CODEC],
]);

function normalizePriorVoters({
  buf,
  idx,
  isEmpty,
}: PriorVoters): PriorVoterRaw[] {
  if (idx < 0n || idx >= BigInt(PRIOR_VOTERS_COUNT)) {
    throw new Error(
      'Invalid vote account data: prior voters index out of range',
    );
  }

  if (isEmpty) {
    return [];
  }

  const normalizedIndex = Number(idx);

  return [
    ...buf.slice(normalizedIndex + 1),
    ...buf.slice(0, normalizedIndex + 1),
  ];
}

function commissionPercentFromBps(commissionBps: number): number {
  return Math.min(Math.floor(commissionBps / 100), 0xff);
}

function decodeVoteAccountDataV1_14_11(
  decoded: VoteAccountV1_14_11CodecValue,
): DecodedVoteAccountData {
  return {
    nodePubkey: decoded.nodePubkey,
    authorizedWithdrawer: decoded.authorizedWithdrawer,
    commission: decoded.commission,
    votes: decoded.votes,
    rootSlot: decoded.rootSlot,
    authorizedVoters: decoded.authorizedVoters,
    priorVoters: normalizePriorVoters(decoded.priorVoters),
    epochCredits: decoded.epochCredits,
    lastTimestamp: decoded.lastTimestamp,
    inflationRewardsCollector: null,
    blockRevenueCollector: null,
    inflationRewardsCommissionBps: null,
    blockRevenueCommissionBps: null,
    pendingDelegatorRewards: null,
    blsPubkeyCompressed: null,
  };
}

function decodeVoteAccountDataV3(
  decoded: VoteAccountV3CodecValue,
): DecodedVoteAccountData {
  return {
    nodePubkey: decoded.nodePubkey,
    authorizedWithdrawer: decoded.authorizedWithdrawer,
    commission: decoded.commission,
    votes: decoded.votes.map(vote => vote.lockout),
    rootSlot: decoded.rootSlot,
    authorizedVoters: decoded.authorizedVoters,
    priorVoters: normalizePriorVoters(decoded.priorVoters),
    epochCredits: decoded.epochCredits,
    lastTimestamp: decoded.lastTimestamp,
    inflationRewardsCollector: null,
    blockRevenueCollector: null,
    inflationRewardsCommissionBps: null,
    blockRevenueCommissionBps: null,
    pendingDelegatorRewards: null,
    blsPubkeyCompressed: null,
  };
}

function decodeVoteAccountDataV4(
  decoded: VoteAccountV4CodecValue,
): DecodedVoteAccountData {
  return {
    nodePubkey: decoded.nodePubkey,
    authorizedWithdrawer: decoded.authorizedWithdrawer,
    inflationRewardsCollector: decoded.inflationRewardsCollector,
    blockRevenueCollector: decoded.blockRevenueCollector,
    inflationRewardsCommissionBps: decoded.inflationRewardsCommissionBps,
    blockRevenueCommissionBps: decoded.blockRevenueCommissionBps,
    pendingDelegatorRewards: decoded.pendingDelegatorRewards,
    blsPubkeyCompressed: decoded.blsPubkeyCompressed,
    commission: commissionPercentFromBps(decoded.inflationRewardsCommissionBps),
    votes: decoded.votes.map(vote => vote.lockout),
    rootSlot: decoded.rootSlot,
    authorizedVoters: decoded.authorizedVoters,
    priorVoters: [],
    epochCredits: decoded.epochCredits,
    lastTimestamp: decoded.lastTimestamp,
  };
}

/**
 * @internal
 */
export const __TEST_ONLY__VOTE_ACCOUNT_V1_14_11_CODEC = transformCodec(
  VOTE_ACCOUNT_V1_14_11_CODEC,
  (value: VoteAccountData): VoteAccountV1_14_11CodecValue => ({
    ...value,
    rootSlot: value.rootSlotValid ? value.rootSlot : null,
  }),
  value => ({
    ...value,
    rootSlotValid: value.rootSlot == null ? 0 : 1,
    rootSlot: value.rootSlot ?? 0n,
  }),
);

/** @internal */
export const __TEST_ONLY__VOTE_ACCOUNT_V3_CODEC = VOTE_ACCOUNT_V3_CODEC;

/** @internal */
export const __TEST_ONLY__VOTE_ACCOUNT_V4_CODEC = VOTE_ACCOUNT_V4_CODEC;

/**
 * See https://github.com/solana-labs/solana/blob/8a12ed029cfa38d4a45400916c2463fb82bbec8c/programs/vote_api/src/vote_state.rs#L68-L88
 *
 * @internal
 */
const decodeVoteAccountData = (bytes: Uint8Array): DecodedVoteAccountData => {
  const version = U32_CODEC.decode(bytes);

  switch (version) {
    case VoteStateVersion.V1_14_11:
      return decodeVoteAccountDataV1_14_11(
        VOTE_ACCOUNT_V1_14_11_CODEC.decode(bytes, U32_CODEC.fixedSize),
      );
    case VoteStateVersion.V3:
      return decodeVoteAccountDataV3(
        VOTE_ACCOUNT_V3_CODEC.decode(bytes, U32_CODEC.fixedSize),
      );
    case VoteStateVersion.V4:
      return decodeVoteAccountDataV4(
        VOTE_ACCOUNT_V4_CODEC.decode(bytes, U32_CODEC.fixedSize),
      );
    case 0:
      throw new Error('Old vote account version is not supported');
    default:
      throw new Error(
        `Unsupported vote account version: ${version}. Supported versions: ${VoteStateVersion.V1_14_11}, ${VoteStateVersion.V3}, ${VoteStateVersion.V4}.`,
      );
  }
};

type VoteAccountArgs = {
  nodePubkey: Address;
  authorizedWithdrawer: Address;
  blsPubkeyCompressed: Uint8Array | null;
  blockRevenueCollector: Address | null;
  blockRevenueCommissionBps: number | null;
  commission: number;
  rootSlot: bigint | null;
  votes: Lockout[];
  authorizedVoters: AuthorizedVoter[];
  inflationRewardsCollector: Address | null;
  inflationRewardsCommissionBps: number | null;
  priorVoters: PriorVoter[];
  epochCredits: EpochCredits[];
  lastTimestamp: BlockTimestamp;
  pendingDelegatorRewards: bigint | null;
};

/**
 * VoteAccount class
 */
export class VoteAccount {
  nodePubkey: Address;
  authorizedWithdrawer: Address;
  blsPubkeyCompressed: Uint8Array | null;
  blockRevenueCollector: Address | null;
  blockRevenueCommissionBps: number | null;
  commission: number;
  rootSlot: bigint | null;
  votes: Lockout[];
  authorizedVoters: AuthorizedVoter[];
  inflationRewardsCollector: Address | null;
  inflationRewardsCommissionBps: number | null;
  priorVoters: PriorVoter[];
  epochCredits: EpochCredits[];
  lastTimestamp: BlockTimestamp;
  pendingDelegatorRewards: bigint | null;

  /**
   * @internal
   */
  constructor(args: VoteAccountArgs) {
    this.nodePubkey = args.nodePubkey;
    this.authorizedWithdrawer = args.authorizedWithdrawer;
    this.blsPubkeyCompressed = args.blsPubkeyCompressed;
    this.blockRevenueCollector = args.blockRevenueCollector;
    this.blockRevenueCommissionBps = args.blockRevenueCommissionBps;
    this.commission = args.commission;
    this.rootSlot = args.rootSlot;
    this.votes = args.votes;
    this.authorizedVoters = args.authorizedVoters;
    this.inflationRewardsCollector = args.inflationRewardsCollector;
    this.inflationRewardsCommissionBps = args.inflationRewardsCommissionBps;
    this.priorVoters = args.priorVoters;
    this.epochCredits = args.epochCredits;
    this.lastTimestamp = args.lastTimestamp;
    this.pendingDelegatorRewards = args.pendingDelegatorRewards;
  }

  /**
   * Deserialize VoteAccount from the account data.
   *
   * @param bufferLike account data
   * @return VoteAccount
   */
  static fromAccountData(bufferLike: Uint8Array | Array<number>): VoteAccount {
    const va = decodeVoteAccountData(toUint8ArrayView(bufferLike));

    return new VoteAccount({
      nodePubkey: new Address(va.nodePubkey),
      authorizedWithdrawer: new Address(va.authorizedWithdrawer),
      blsPubkeyCompressed: va.blsPubkeyCompressed,
      blockRevenueCollector: va.blockRevenueCollector
        ? new Address(va.blockRevenueCollector)
        : null,
      blockRevenueCommissionBps: va.blockRevenueCommissionBps,
      commission: va.commission,
      votes: va.votes,
      rootSlot: va.rootSlot,
      authorizedVoters: va.authorizedVoters.map(parseAuthorizedVoter),
      inflationRewardsCollector: va.inflationRewardsCollector
        ? new Address(va.inflationRewardsCollector)
        : null,
      inflationRewardsCommissionBps: va.inflationRewardsCommissionBps,
      priorVoters: va.priorVoters.map(parsePriorVoters),
      epochCredits: va.epochCredits,
      lastTimestamp: va.lastTimestamp,
      pendingDelegatorRewards: va.pendingDelegatorRewards,
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
