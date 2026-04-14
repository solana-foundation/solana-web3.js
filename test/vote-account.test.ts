import {expect} from 'chai';
import {readFileSync} from 'fs';

import {Address} from '../src/address';
import {
  VoteAccount,
  VoteStateVersion,
  type VoteAccountData,
  __TEST_ONLY__VOTE_ACCOUNT_V1_14_11_CODEC,
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
    votes: [{slot: 10, confirmationCount: 2}],
    rootSlotValid: 1,
    rootSlot: 42,
    authorizedVoters: [{epoch: 7, authorizedVoter}],
    priorVoters: {
      buf: Array.from({length: 32}, (_, index) => ({
        authorizedPubkey: priorVoterBase,
        epochOfLastAuthorizedSwitch: index,
        targetEpoch: index + 100,
      })),
      idx: 1,
      isEmpty: 0,
    },
    epochCredits: [{epoch: 1, credits: 2, prevCredits: 0}],
    lastTimestamp: {slot: 55, timestamp: 1234},
  };
};

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

    expect(account.nodePubkey.equals(new Address(buildKeyBytes(1)))).to.eq(
      true,
    );
    expect(
      account.authorizedWithdrawer.equals(new Address(buildKeyBytes(101))),
    ).to.eq(true);
    expect(account.commission).to.eq(12);
    expect(account.votes).to.deep.eq([
      {slot: 42, confirmationCount: 2},
      {slot: 43, confirmationCount: 1},
    ]);
    expect(account.rootSlot).to.eq(999);
    expect(account.authorizedVoters).to.have.length(2);
    expect(account.authorizedVoters[0].epoch).to.eq(7);
    expect(
      account.authorizedVoters[0].authorizedVoter.equals(
        new Address(buildKeyBytes(201)),
      ),
    ).to.eq(true);
    expect(account.authorizedVoters[1].epoch).to.eq(9);
    expect(
      account.authorizedVoters[1].authorizedVoter.equals(
        new Address(buildKeyBytes(202)),
      ),
    ).to.eq(true);

    expect(account.priorVoters).to.have.length(31);
    const firstPriorVoter = account.priorVoters[0];
    const lastPriorVoter = account.priorVoters[account.priorVoters.length - 1];
    expect(firstPriorVoter.epochOfLastAuthorizedSwitch).to.eq(6);
    expect(firstPriorVoter.targetEpoch).to.eq(1006);
    expect(
      firstPriorVoter.authorizedPubkey.equals(new Address(buildKeyBytes(56))),
    ).to.eq(true);
    expect(lastPriorVoter.epochOfLastAuthorizedSwitch).to.eq(4);
    expect(lastPriorVoter.targetEpoch).to.eq(1004);
    expect(
      lastPriorVoter.authorizedPubkey.equals(new Address(buildKeyBytes(54))),
    ).to.eq(true);

    expect(account.epochCredits).to.deep.eq([
      {epoch: 1, credits: 10, prevCredits: 5},
      {epoch: 2, credits: 20, prevCredits: 15},
    ]);
    expect(account.lastTimestamp).to.deep.eq({slot: 1234, timestamp: 5678});
  });

  it('decodes vote account data with variable-length fields', () => {
    const data = buildSampleVoteAccountData();
    const buffer = buildVoteAccountBytes(data);
    const account = VoteAccount.fromAccountData(buffer);

    expect(account.nodePubkey.equals(new Address(data.nodePubkey))).to.eq(
      true,
    );
    expect(
      account.authorizedWithdrawer.equals(
        new Address(data.authorizedWithdrawer),
      ),
    ).to.eq(true);
    expect(account.commission).to.eq(5);
    expect(account.votes).to.have.length(1);
    expect(account.votes[0]).to.deep.eq({slot: 10, confirmationCount: 2});
    expect(account.rootSlot).to.eq(42);
    expect(account.authorizedVoters).to.have.length(1);
    expect(
      account.authorizedVoters[0].authorizedVoter.equals(
        new Address(data.authorizedVoters[0].authorizedVoter),
      ),
    ).to.eq(true);
    expect(account.priorVoters).to.have.length(31);
    expect(account.priorVoters[0].epochOfLastAuthorizedSwitch).to.eq(2);
    expect(account.epochCredits).to.deep.eq([
      {epoch: 1, credits: 2, prevCredits: 0},
    ]);
    expect(account.lastTimestamp).to.deep.eq({slot: 55, timestamp: 1234});
  });

  it('returns null rootSlot when rootSlotValid is false', () => {
    const data: VoteAccountData = {
      nodePubkey: buildKeyBytes(10),
      authorizedWithdrawer: buildKeyBytes(11),
      commission: 0,
      votes: [],
      rootSlotValid: 0,
      rootSlot: 999,
      authorizedVoters: [],
      priorVoters: {
        buf: Array.from({length: 32}, () => ({
          authorizedPubkey: buildKeyBytes(12),
          epochOfLastAuthorizedSwitch: 0,
          targetEpoch: 0,
        })),
        idx: 0,
        isEmpty: 1,
      },
      epochCredits: [],
      lastTimestamp: {slot: 0, timestamp: 0},
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

    expect(account.nodePubkey.equals(new Address(data.nodePubkey))).to.eq(
      true,
    );
    expect(
      account.authorizedWithdrawer.equals(
        new Address(data.authorizedWithdrawer),
      ),
    ).to.eq(true);
    expect(account.rootSlot).to.eq(42);
  });

  it('decodes from Array<number>', () => {
    const data = buildSampleVoteAccountData();
    const buffer = buildVoteAccountBytes(data);
    const account = VoteAccount.fromAccountData(Array.from(buffer));

    expect(account.nodePubkey.equals(new Address(data.nodePubkey))).to.eq(
      true,
    );
    expect(
      account.authorizedWithdrawer.equals(
        new Address(data.authorizedWithdrawer),
      ),
    ).to.eq(true);
    expect(account.rootSlot).to.eq(42);
  });

  it('decodes from a sliced Uint8Array view', () => {
    const data = buildSampleVoteAccountData();
    const buffer = buildVoteAccountBytes(data);
    const padded = Uint8Array.from([99, ...buffer, 77]);
    const account = VoteAccount.fromAccountData(
      padded.subarray(1, buffer.length + 1),
    );

    expect(account.nodePubkey.equals(new Address(data.nodePubkey))).to.eq(
      true,
    );
    expect(account.rootSlot).to.eq(42);
  });
});
