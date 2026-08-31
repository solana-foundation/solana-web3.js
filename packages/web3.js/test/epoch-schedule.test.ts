import {expect} from 'chai';

import {EpochSchedule} from '../src';

describe('EpochSchedule', () => {
  it('slot methods work', () => {
    const firstNormalEpoch = 14n;
    const firstNormalSlot = 524_256n;
    const leaderScheduleSlotOffset = 432_000n;
    const slotsPerEpoch = 432_000n;
    const warmup = true;

    const epochSchedule = new EpochSchedule(
      slotsPerEpoch,
      leaderScheduleSlotOffset,
      warmup,
      firstNormalEpoch,
      firstNormalSlot,
    );

    expect(epochSchedule.firstNormalEpoch).to.be.equal(14n);
    expect(epochSchedule.firstNormalSlot).to.be.equal(524_256n);
    expect(epochSchedule.leaderScheduleSlotOffset).to.be.equal(432_000n);
    expect(epochSchedule.slotsPerEpoch).to.be.equal(432_000n);

    expect(epochSchedule.getEpoch(35n)).to.be.equal(1n);
    expect(epochSchedule.getEpochAndSlotIndex(35n)).to.be.eql([1n, 3n]);

    expect(
      epochSchedule.getEpoch(firstNormalSlot + 3n * slotsPerEpoch + 12345n),
    ).to.be.equal(17n);
    expect(
      epochSchedule.getEpochAndSlotIndex(
        firstNormalSlot + 3n * slotsPerEpoch + 12345n,
      ),
    ).to.be.eql([17n, 12_345n]);

    expect(epochSchedule.getSlotsInEpoch(4n)).to.be.equal(512n);
    expect(epochSchedule.getSlotsInEpoch(100n)).to.be.equal(slotsPerEpoch);

    expect(epochSchedule.getFirstSlotInEpoch(2n)).to.be.equal(96n);
    expect(epochSchedule.getLastSlotInEpoch(2n)).to.be.equal(223n);

    expect(epochSchedule.getFirstSlotInEpoch(16n)).to.be.equal(
      firstNormalSlot + 2n * slotsPerEpoch,
    );
    expect(epochSchedule.getLastSlotInEpoch(16n)).to.be.equal(
      firstNormalSlot + 3n * slotsPerEpoch - 1n,
    );
  });
});
