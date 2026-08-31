import {expect} from 'chai';
import {readFileSync} from 'fs';

import {PublicKey} from '../src/publickey';
import {
  VoteAccount,
  VoteStateVersion,
  type VoteAccountData,
  __TEST_ONLY__VOTE_ACCOUNT_V1_14_11_CODEC,
  __TEST_ONLY__VOTE_ACCOUNT_V3_CODEC,
  __TEST_ONLY__VOTE_ACCOUNT_V4_CODEC,
} from '../src/vote-account';

type VoteAccountFixture = {
  encoding: 'base64';
  length: number;
  data: string[];
  annotations: Array<{
    label: string;
    offset: number;
    length: number;
    hex: string;
  }>;
};

const loadVoteAccountFixture = (): {
  fixture: VoteAccountFixture;
  bytes: Buffer;
} => {
  const fixtureUrl = new URL(
    './fixtures/vote-account-v1_14_11.json',
    import.meta.url,
  );
  const fixture = JSON.parse(
    readFileSync(fixtureUrl, 'utf8'),
  ) as VoteAccountFixture;
  const bytes = Buffer.from(fixture.data.join(''), 'base64');

  return {fixture, bytes};
};

const toHex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');

// ========== Fixture and test helpers ==========

const encodeVoteAccountDataWithCodec = (data: VoteAccountData): Uint8Array =>
  Uint8Array.from(__TEST_ONLY__VOTE_ACCOUNT_V1_14_11_CODEC.encode(data));

const prependVoteStateVersion = (encoded: Uint8Array): Uint8Array => {
  const bytes = new Uint8Array(4 + encoded.length);
  new DataView(bytes.buffer, bytes.byteOffset, 4).setUint32(
    0,
    VoteStateVersion.V1_14_11,
    true,
  );
  bytes.set(encoded, 4);
  return bytes;
};

const buildVoteAccountBytes = (data: VoteAccountData): Uint8Array =>
  prependVoteStateVersion(encodeVoteAccountDataWithCodec(data));

const prependVoteStateVersionFor = (
  version: VoteStateVersion,
  encoded: Uint8Array,
): Uint8Array => {
  const bytes = new Uint8Array(4 + encoded.length);
  new DataView(bytes.buffer, bytes.byteOffset, 4).setUint32(0, version, true);
  bytes.set(encoded, 4);
  return bytes;
};

const buildVoteAccountV3Bytes = (): Uint8Array => {
  const nodePubkey = buildKeyBytes(20);
  const authorizedWithdrawer = buildKeyBytes(21);
  const authorizedVoter = buildKeyBytes(22);
  const priorVoterBase = buildKeyBytes(23);

  const bytes = Uint8Array.from(
    __TEST_ONLY__VOTE_ACCOUNT_V3_CODEC.encode({
      nodePubkey,
      authorizedWithdrawer,
      commission: 7,
      votes: [
        {latency: 9, lockout: {slot: 50n, confirmationCount: 3}},
        {latency: 1, lockout: {slot: 55n, confirmationCount: 2}},
      ],
      rootSlot: 44n,
      authorizedVoters: [{epoch: 8n, authorizedVoter}],
      priorVoters: {
        buf: Array.from({length: 32}, (_, index) => ({
          authorizedPubkey: priorVoterBase,
          epochOfLastAuthorizedSwitch: BigInt(index),
          targetEpoch: BigInt(100 + index),
        })),
        idx: 3n,
        isEmpty: 0,
      },
      epochCredits: [{epoch: 2n, credits: 9n, prevCredits: 4n}],
      lastTimestamp: {slot: 77n, timestamp: -123n},
    }),
  );

  return prependVoteStateVersionFor(VoteStateVersion.V3, bytes);
};

const buildVoteAccountV4Bytes = (): Uint8Array => {
  const nodePubkey = buildKeyBytes(30);
  const authorizedWithdrawer = buildKeyBytes(31);
  const inflationRewardsCollector = buildKeyBytes(32);
  const blockRevenueCollector = buildKeyBytes(33);
  const authorizedVoter = buildKeyBytes(34);
  const blsPubkeyCompressed = Uint8Array.from({length: 48}, (_, i) => 100 + i);

  const bytes = Uint8Array.from(
    __TEST_ONLY__VOTE_ACCOUNT_V4_CODEC.encode({
      nodePubkey,
      authorizedWithdrawer,
      inflationRewardsCollector,
      blockRevenueCollector,
      inflationRewardsCommissionBps: 1_234,
      blockRevenueCommissionBps: 5_678,
      pendingDelegatorRewards: 99n,
      blsPubkeyCompressed,
      votes: [
        {latency: 7, lockout: {slot: 70n, confirmationCount: 4}},
        {latency: 8, lockout: {slot: 71n, confirmationCount: 3}},
      ],
      rootSlot: 66n,
      authorizedVoters: [{epoch: 12n, authorizedVoter}],
      epochCredits: [{epoch: 3n, credits: 11n, prevCredits: 6n}],
      lastTimestamp: {slot: 88n, timestamp: -456n},
    }),
  );

  return prependVoteStateVersionFor(VoteStateVersion.V4, bytes);
};

const buildKeyBytes = (seed: number): Uint8Array => {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = (seed + i) % 256;
  }
  return bytes;
};

const buildSampleVoteAccountData = (): VoteAccountData => {
  const nodePubkey = buildKeyBytes(1);
  const authorizedWithdrawer = buildKeyBytes(2);
  const authorizedVoter = buildKeyBytes(3);
  const priorVoterBase = buildKeyBytes(4);

  return {
    nodePubkey,
    authorizedWithdrawer,
    commission: 5,
    votes: [{slot: 10n, confirmationCount: 2}],
    rootSlotValid: 1,
    rootSlot: 42n,
    authorizedVoters: [{epoch: 7n, authorizedVoter}],
    priorVoters: {
      buf: Array.from({length: 32}, (_, index) => ({
        authorizedPubkey: priorVoterBase,
        epochOfLastAuthorizedSwitch: BigInt(index),
        targetEpoch: BigInt(index + 100),
      })),
      idx: 1n,
      isEmpty: 0,
    },
    epochCredits: [{epoch: 1n, credits: 2n, prevCredits: 0n}],
    lastTimestamp: {slot: 55n, timestamp: 1234n},
  };
};

const buildVoteAccountDataWithPriorVoterIndex = (
  idx: bigint,
  isEmpty = 0,
): VoteAccountData => {
  const data = buildSampleVoteAccountData();

  return {
    ...data,
    priorVoters: {
      ...data.priorVoters,
      idx,
      isEmpty,
    },
  };
};

const getPriorVoterSwitchEpochs = (account: VoteAccount): bigint[] =>
  account.priorVoters.map(voter => voter.epochOfLastAuthorizedSwitch);

// ========== Tests ==========

describe('VoteAccount', () => {
  it('decodes vote account data from a byte fixture (V1_14_11)', () => {
    const {fixture, bytes} = loadVoteAccountFixture();

    expect(fixture.encoding).to.eq('base64');
    expect(bytes.length).to.eq(fixture.length);
    for (const annotation of fixture.annotations) {
      const slice = bytes.subarray(
        annotation.offset,
        annotation.offset + annotation.length,
      );
      expect(toHex(slice)).to.eq(annotation.hex);
    }

    const account = VoteAccount.fromAccountData(bytes);

    expect(account.nodePubkey.equals(new PublicKey(buildKeyBytes(1)))).to.eq(
      true,
    );
    expect(
      account.authorizedWithdrawer.equals(new PublicKey(buildKeyBytes(101))),
    ).to.eq(true);
    expect(account.commission).to.eq(12);
    expect(account.votes).to.deep.eq([
      {slot: 42n, confirmationCount: 2},
      {slot: 43n, confirmationCount: 1},
    ]);
    expect(account.rootSlot).to.eq(999n);
    expect(account.authorizedVoters).to.have.length(2);
    expect(account.authorizedVoters[0].epoch).to.eq(7n);
    expect(
      account.authorizedVoters[0].authorizedVoter.equals(
        new PublicKey(buildKeyBytes(201)),
      ),
    ).to.eq(true);
    expect(account.authorizedVoters[1].epoch).to.eq(9n);
    expect(
      account.authorizedVoters[1].authorizedVoter.equals(
        new PublicKey(buildKeyBytes(202)),
      ),
    ).to.eq(true);

    expect(account.priorVoters).to.have.length(32);
    const firstPriorVoter = account.priorVoters[0];
    const lastPriorVoter = account.priorVoters[account.priorVoters.length - 1];
    expect(firstPriorVoter.epochOfLastAuthorizedSwitch).to.eq(6n);
    expect(firstPriorVoter.targetEpoch).to.eq(1006n);
    expect(
      firstPriorVoter.authorizedPubkey.equals(new PublicKey(buildKeyBytes(56))),
    ).to.eq(true);
    expect(lastPriorVoter.epochOfLastAuthorizedSwitch).to.eq(5n);
    expect(lastPriorVoter.targetEpoch).to.eq(1005n);
    expect(
      lastPriorVoter.authorizedPubkey.equals(new PublicKey(buildKeyBytes(55))),
    ).to.eq(true);

    expect(account.epochCredits).to.deep.eq([
      {epoch: 1n, credits: 10n, prevCredits: 5n},
      {epoch: 2n, credits: 20n, prevCredits: 15n},
    ]);
    expect(account.lastTimestamp).to.deep.eq({slot: 1234n, timestamp: 5678n});
  });

  it('decodes vote account data with variable-length fields', () => {
    const data = buildSampleVoteAccountData();
    const buffer = buildVoteAccountBytes(data);
    const account = VoteAccount.fromAccountData(buffer);

    expect(account.nodePubkey.equals(new PublicKey(data.nodePubkey))).to.eq(
      true,
    );
    expect(
      account.authorizedWithdrawer.equals(
        new PublicKey(data.authorizedWithdrawer),
      ),
    ).to.eq(true);
    expect(account.commission).to.eq(5);
    expect(account.votes).to.have.length(1);
    expect(account.votes[0]).to.deep.eq({slot: 10n, confirmationCount: 2});
    expect(account.rootSlot).to.eq(42n);
    expect(account.authorizedVoters).to.have.length(1);
    expect(
      account.authorizedVoters[0].authorizedVoter.equals(
        new PublicKey(data.authorizedVoters[0].authorizedVoter),
      ),
    ).to.eq(true);
    expect(account.priorVoters).to.have.length(32);
    expect(account.priorVoters[0].epochOfLastAuthorizedSwitch).to.eq(2n);
    expect(
      account.priorVoters[account.priorVoters.length - 1]
        .epochOfLastAuthorizedSwitch,
    ).to.eq(1n);
    expect(account.epochCredits).to.deep.eq([
      {epoch: 1n, credits: 2n, prevCredits: 0n},
    ]);
    expect(account.lastTimestamp).to.deep.eq({slot: 55n, timestamp: 1234n});
  });

  it('returns null rootSlot when rootSlotValid is false', () => {
    const data: VoteAccountData = {
      nodePubkey: buildKeyBytes(10),
      authorizedWithdrawer: buildKeyBytes(11),
      commission: 0,
      votes: [],
      rootSlotValid: 0,
      rootSlot: 999n,
      authorizedVoters: [],
      priorVoters: {
        buf: Array.from({length: 32}, () => ({
          authorizedPubkey: buildKeyBytes(12),
          epochOfLastAuthorizedSwitch: 0n,
          targetEpoch: 0n,
        })),
        idx: 0n,
        isEmpty: 1,
      },
      epochCredits: [],
      lastTimestamp: {slot: 0n, timestamp: 0n},
    };

    const buffer = buildVoteAccountBytes(data);
    const account = VoteAccount.fromAccountData(buffer);

    expect(account.rootSlot).to.eq(null);
    expect(account.votes).to.deep.eq([]);
    expect(account.authorizedVoters).to.deep.eq([]);
    expect(account.epochCredits).to.deep.eq([]);
  });

  it('decodes from Uint8Array', () => {
    const data = buildSampleVoteAccountData();
    const buffer = buildVoteAccountBytes(data);
    const account = VoteAccount.fromAccountData(buffer.subarray(0));

    expect(account.nodePubkey.equals(new PublicKey(data.nodePubkey))).to.eq(
      true,
    );
    expect(
      account.authorizedWithdrawer.equals(
        new PublicKey(data.authorizedWithdrawer),
      ),
    ).to.eq(true);
    expect(account.rootSlot).to.eq(42n);
  });

  it('decodes from Array<number>', () => {
    const data = buildSampleVoteAccountData();
    const buffer = buildVoteAccountBytes(data);
    const account = VoteAccount.fromAccountData(Array.from(buffer));

    expect(account.nodePubkey.equals(new PublicKey(data.nodePubkey))).to.eq(
      true,
    );
    expect(
      account.authorizedWithdrawer.equals(
        new PublicKey(data.authorizedWithdrawer),
      ),
    ).to.eq(true);
    expect(account.rootSlot).to.eq(42n);
  });

  it('decodes from a sliced Uint8Array view', () => {
    const data = buildSampleVoteAccountData();
    const buffer = buildVoteAccountBytes(data);
    const padded = Uint8Array.from([99, ...buffer, 77]);
    const account = VoteAccount.fromAccountData(
      padded.subarray(1, buffer.length + 1),
    );

    expect(account.nodePubkey.equals(new PublicKey(data.nodePubkey))).to.eq(
      true,
    );
    expect(account.rootSlot).to.eq(42n);
  });

  it('normalizes prior voters by wrapping entries after idx to the front', () => {
    const account = VoteAccount.fromAccountData(
      buildVoteAccountBytes(buildVoteAccountDataWithPriorVoterIndex(5n)),
    );

    expect(getPriorVoterSwitchEpochs(account)).to.deep.eq([
      6n,
      7n,
      8n,
      9n,
      10n,
      11n,
      12n,
      13n,
      14n,
      15n,
      16n,
      17n,
      18n,
      19n,
      20n,
      21n,
      22n,
      23n,
      24n,
      25n,
      26n,
      27n,
      28n,
      29n,
      30n,
      31n,
      0n,
      1n,
      2n,
      3n,
      4n,
      5n,
    ]);
  });

  it('normalizes prior voters correctly when idx is 0', () => {
    const account = VoteAccount.fromAccountData(
      buildVoteAccountBytes(buildVoteAccountDataWithPriorVoterIndex(0n)),
    );

    expect(getPriorVoterSwitchEpochs(account)).to.deep.eq([
      1n,
      2n,
      3n,
      4n,
      5n,
      6n,
      7n,
      8n,
      9n,
      10n,
      11n,
      12n,
      13n,
      14n,
      15n,
      16n,
      17n,
      18n,
      19n,
      20n,
      21n,
      22n,
      23n,
      24n,
      25n,
      26n,
      27n,
      28n,
      29n,
      30n,
      31n,
      0n,
    ]);
  });

  it('normalizes prior voters correctly when idx is the last slot', () => {
    const account = VoteAccount.fromAccountData(
      buildVoteAccountBytes(buildVoteAccountDataWithPriorVoterIndex(31n)),
    );

    expect(getPriorVoterSwitchEpochs(account)).to.deep.eq([
      0n,
      1n,
      2n,
      3n,
      4n,
      5n,
      6n,
      7n,
      8n,
      9n,
      10n,
      11n,
      12n,
      13n,
      14n,
      15n,
      16n,
      17n,
      18n,
      19n,
      20n,
      21n,
      22n,
      23n,
      24n,
      25n,
      26n,
      27n,
      28n,
      29n,
      30n,
      31n,
    ]);
  });

  it('returns no prior voters when the circular buffer is marked empty', () => {
    const account = VoteAccount.fromAccountData(
      buildVoteAccountBytes(buildVoteAccountDataWithPriorVoterIndex(5n, 1)),
    );

    expect(account.priorVoters).to.deep.eq([]);
  });

  it('rejects prior voters idx values outside the circular buffer range', () => {
    expect(() =>
      VoteAccount.fromAccountData(
        buildVoteAccountBytes(buildVoteAccountDataWithPriorVoterIndex(32n)),
      ),
    ).to.throw('Invalid vote account data: prior voters index out of range');
  });

  it('decodes V3 vote account data', () => {
    const buffer = buildVoteAccountV3Bytes();
    const account = VoteAccount.fromAccountData(buffer);

    expect(account.nodePubkey.equals(new PublicKey(buildKeyBytes(20)))).to.eq(
      true,
    );
    expect(
      account.authorizedWithdrawer.equals(new PublicKey(buildKeyBytes(21))),
    ).to.eq(true);
    expect(account.commission).to.eq(7);
    expect(account.votes).to.deep.eq([
      {slot: 50n, confirmationCount: 3},
      {slot: 55n, confirmationCount: 2},
    ]);
    expect(account.rootSlot).to.eq(44n);
    expect(account.authorizedVoters).to.deep.eq([
      {
        epoch: 8n,
        authorizedVoter: new PublicKey(buildKeyBytes(22)),
      },
    ]);
    expect(account.priorVoters).to.have.length(32);
    expect(account.priorVoters[0].epochOfLastAuthorizedSwitch).to.eq(4n);
    expect(
      account.priorVoters[account.priorVoters.length - 1]
        .epochOfLastAuthorizedSwitch,
    ).to.eq(3n);
    expect(account.epochCredits).to.deep.eq([
      {epoch: 2n, credits: 9n, prevCredits: 4n},
    ]);
    expect(account.lastTimestamp).to.deep.eq({slot: 77n, timestamp: -123n});
    expect(account.inflationRewardsCollector).to.eq(null);
    expect(account.blockRevenueCollector).to.eq(null);
    expect(account.inflationRewardsCommissionBps).to.eq(null);
    expect(account.blockRevenueCommissionBps).to.eq(null);
    expect(account.pendingDelegatorRewards).to.eq(null);
    expect(account.blsPubkeyCompressed).to.eq(null);
  });

  it('decodes V4 vote account data', () => {
    const buffer = buildVoteAccountV4Bytes();
    const account = VoteAccount.fromAccountData(buffer);

    expect(account.nodePubkey.equals(new PublicKey(buildKeyBytes(30)))).to.eq(
      true,
    );
    expect(
      account.authorizedWithdrawer.equals(new PublicKey(buildKeyBytes(31))),
    ).to.eq(true);
    expect(
      account.inflationRewardsCollector?.equals(
        new PublicKey(buildKeyBytes(32)),
      ),
    ).to.eq(true);
    expect(
      account.blockRevenueCollector?.equals(new PublicKey(buildKeyBytes(33))),
    ).to.eq(true);
    expect(account.commission).to.eq(12);
    expect(account.inflationRewardsCommissionBps).to.eq(1_234);
    expect(account.blockRevenueCommissionBps).to.eq(5_678);
    expect(account.pendingDelegatorRewards).to.eq(99n);
    expect(account.blsPubkeyCompressed).to.deep.eq(
      Uint8Array.from({length: 48}, (_, i) => 100 + i),
    );
    expect(account.votes).to.deep.eq([
      {slot: 70n, confirmationCount: 4},
      {slot: 71n, confirmationCount: 3},
    ]);
    expect(account.rootSlot).to.eq(66n);
    expect(account.authorizedVoters).to.deep.eq([
      {
        epoch: 12n,
        authorizedVoter: new PublicKey(buildKeyBytes(34)),
      },
    ]);
    expect(account.priorVoters).to.deep.eq([]);
    expect(account.epochCredits).to.deep.eq([
      {epoch: 3n, credits: 11n, prevCredits: 6n},
    ]);
    expect(account.lastTimestamp).to.deep.eq({slot: 88n, timestamp: -456n});
  });
});
