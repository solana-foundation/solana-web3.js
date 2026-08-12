import {Buffer} from 'buffer';
import {expect} from 'chai';

import {PublicKey} from '../src/publickey';
import {VoteAccount} from '../src/vote-account';

// Encode a little-endian u64. Test values are all < 256, so writing the low
// byte is sufficient and avoids BigInt/polyfill concerns.
function u64(n: number): Buffer {
  const b = Buffer.alloc(8, 0);
  b[0] = n & 0xff;
  return b;
}

describe('VoteAccount', function () {
  it('fromAccountData keeps the most recent prior voter (buf[idx])', () => {
    const MAX_ITEMS = 32;
    const ENTRY_SIZE = 48; // authorizedPubkey(32) + epochOfLastAuthorizedSwitch(8) + targetEpoch(8)

    // Prior-voters CircBuf with three written entries at buf[0..2] and idx = 2.
    // `idx` points at the newest entry, so buf[2] (all-0x03 pubkey) must appear.
    const priorVotersBuf = Buffer.alloc(MAX_ITEMS * ENTRY_SIZE, 0);
    for (let i = 0; i < 3; i++) {
      Buffer.alloc(32, i + 1).copy(priorVotersBuf, i * ENTRY_SIZE);
    }

    const data = Buffer.concat([
      Buffer.alloc(4, 0), // version prefix (fromAccountData uses versionOffset = 4)
      Buffer.alloc(32, 0), // nodePubkey
      Buffer.alloc(32, 0), // authorizedWithdrawer
      Buffer.from([0]), // commission
      u64(0), // votes.length
      Buffer.from([0]), // rootSlotValid
      u64(0), // rootSlot
      u64(0), // authorizedVoters.length
      priorVotersBuf, // priorVoters.buf
      u64(2), // priorVoters.idx
      Buffer.from([0]), // priorVoters.isEmpty
      u64(0), // epochCredits.length
      u64(0), // lastTimestamp.slot
      u64(0), // lastTimestamp.timestamp
    ]);

    const voteAccount = VoteAccount.fromAccountData(data);
    const addresses = voteAccount.priorVoters.map(v =>
      v.authorizedPubkey.toBase58(),
    );

    const newest = new PublicKey(Buffer.alloc(32, 3)).toBase58();
    expect(addresses).to.include(newest);
  });
});
