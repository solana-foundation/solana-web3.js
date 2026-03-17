const MINIMUM_SLOT_PER_EPOCH = 32n;

// Returns the number of trailing zeros in the binary representation of self.
function trailingZeros(n: bigint) {
  let trailingZeros = 0n;
  while (n > 1n) {
    n /= 2n;
    trailingZeros++;
  }
  return trailingZeros;
}

// Returns the smallest power of two greater than or equal to n.
function nextPowerOfTwo(n: bigint) {
  if (n === 0n) return 1n;
  n--;
  n |= n >> 1n;
  n |= n >> 2n;
  n |= n >> 4n;
  n |= n >> 8n;
  n |= n >> 16n;
  n |= n >> 32n;
  return n + 1n;
}

/**
 * Epoch schedule
 * (see https://docs.solana.com/terminology#epoch)
 * Can be retrieved with the {@link Connection.getEpochSchedule} method
 */
export class EpochSchedule {
  /** The maximum number of slots in each epoch */
  public slotsPerEpoch: bigint;
  /** The number of slots before beginning of an epoch to calculate a leader schedule for that epoch */
  public leaderScheduleSlotOffset: bigint;
  /** Indicates whether epochs start short and grow */
  public warmup: boolean;
  /** The first epoch with `slotsPerEpoch` slots */
  public firstNormalEpoch: bigint;
  /** The first slot of `firstNormalEpoch` */
  public firstNormalSlot: bigint;

  constructor(
    slotsPerEpoch: bigint,
    leaderScheduleSlotOffset: bigint,
    warmup: boolean,
    firstNormalEpoch: bigint,
    firstNormalSlot: bigint,
  ) {
    this.slotsPerEpoch = slotsPerEpoch;
    this.leaderScheduleSlotOffset = leaderScheduleSlotOffset;
    this.warmup = warmup;
    this.firstNormalEpoch = firstNormalEpoch;
    this.firstNormalSlot = firstNormalSlot;
  }

  getEpoch(slot: bigint): bigint {
    return this.getEpochAndSlotIndex(slot)[0];
  }

  getEpochAndSlotIndex(slot: bigint): [bigint, bigint] {
    if (slot < this.firstNormalSlot) {
      const epoch =
        trailingZeros(nextPowerOfTwo(slot + MINIMUM_SLOT_PER_EPOCH + 1n)) -
        trailingZeros(MINIMUM_SLOT_PER_EPOCH) -
        1n;

      const epochLen = this.getSlotsInEpoch(epoch);
      const slotIndex = slot - (epochLen - MINIMUM_SLOT_PER_EPOCH);
      return [epoch, slotIndex];
    } else {
      const normalSlotIndex = slot - this.firstNormalSlot;
      const normalEpochIndex = normalSlotIndex / this.slotsPerEpoch;
      const epoch = this.firstNormalEpoch + normalEpochIndex;
      const slotIndex = normalSlotIndex % this.slotsPerEpoch;
      return [epoch, slotIndex];
    }
  }

  getFirstSlotInEpoch(epoch: bigint): bigint {
    if (epoch <= this.firstNormalEpoch) {
      return (2n ** epoch - 1n) * MINIMUM_SLOT_PER_EPOCH;
    } else {
      return (
        (epoch - this.firstNormalEpoch) * this.slotsPerEpoch +
        this.firstNormalSlot
      );
    }
  }

  getLastSlotInEpoch(epoch: bigint): bigint {
    return this.getFirstSlotInEpoch(epoch) + this.getSlotsInEpoch(epoch) - 1n;
  }

  getSlotsInEpoch(epoch: bigint): bigint {
    if (epoch < this.firstNormalEpoch) {
      return 2n ** (epoch + trailingZeros(MINIMUM_SLOT_PER_EPOCH));
    } else {
      return this.slotsPerEpoch;
    }
  }
}
