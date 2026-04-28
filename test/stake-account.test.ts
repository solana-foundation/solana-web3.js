import {expect} from 'chai';

import {
  getStakeStateAccountCodec,
  stakeStateV2,
  type StakeStateAccountArgs,
} from '../src/__generated__/program-clients/stake';
import {Address, StakeAccount} from '../src';
import {toKitAddress} from '../src/kit-adapters/address';

type InitializedStakeStateArgs = Extract<
  StakeStateAccountArgs['state'],
  {__kind: 'Initialized'}
>;

type DelegatedStakeStateArgs = Extract<
  StakeStateAccountArgs['state'],
  {__kind: 'Stake'}
>;

const buildAddress = (seed: number): Address => {
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = (seed + index) % 256;
  }
  return new Address(bytes);
};

describe('StakeAccount', () => {
  it('decodes initialized stake account state', () => {
    const staker = buildAddress(1);
    const withdrawer = buildAddress(2);
    const custodian = buildAddress(3);
    const state: InitializedStakeStateArgs = {
      __kind: 'Initialized',
      fields: [
        {
          rentExemptReserve: 123n,
          authorized: {
            staker: toKitAddress(staker),
            withdrawer: toKitAddress(withdrawer),
          },
          lockup: {
            unixTimestamp: -456n,
            epoch: 789n,
            custodian: toKitAddress(custodian),
          },
        },
      ],
    };

    const bytes = getStakeStateAccountCodec().encode({
      state,
    });

    const account = StakeAccount.fromAccountData(Uint8Array.from(bytes));

    expect(account.state.__kind).to.eq('Initialized');
    if (account.state.__kind !== 'Initialized') {
      throw new Error('Expected initialized stake account state');
    }

    expect(account.state.meta.rentExemptReserve).to.eq(123n);
    expect(account.state.meta.authorized.staker.equals(staker)).to.eq(true);
    expect(account.state.meta.authorized.withdrawer.equals(withdrawer)).to.eq(
      true,
    );
    expect(account.state.meta.lockup.unixTimestamp).to.eq(-456n);
    expect(account.state.meta.lockup.epoch).to.eq(789n);
    expect(account.state.meta.lockup.custodian.equals(custodian)).to.eq(true);
  });

  it('decodes delegated stake account state with bigint fields and flags', () => {
    const staker = buildAddress(10);
    const withdrawer = buildAddress(11);
    const custodian = buildAddress(12);
    const voterPubkey = buildAddress(13);
    const state: DelegatedStakeStateArgs = {
      __kind: 'Stake',
      fields: [
        {
          rentExemptReserve: 321n,
          authorized: {
            staker: toKitAddress(staker),
            withdrawer: toKitAddress(withdrawer),
          },
          lockup: {
            unixTimestamp: 654n,
            epoch: 987n,
            custodian: toKitAddress(custodian),
          },
        },
        {
          delegation: {
            voterPubkey: toKitAddress(voterPubkey),
            stake: 1_000_000n,
            activationEpoch: 44n,
            deactivationEpoch: 55n,
            warmupCooldownRate: 0.25,
          },
          creditsObserved: 88n,
        },
        {
          bits: 3,
        },
      ],
    };

    const bytes = getStakeStateAccountCodec().encode({
      state,
    });

    const paddedBytes = Uint8Array.from([255, ...Uint8Array.from(bytes), 254]);
    const account = StakeAccount.fromAccountData(
      paddedBytes.subarray(1, paddedBytes.length - 1),
    );

    expect(account.state.__kind).to.eq('Stake');
    if (account.state.__kind !== 'Stake') {
      throw new Error('Expected stake account state');
    }

    expect(account.state.meta.rentExemptReserve).to.eq(321n);
    expect(account.state.stake.delegation.voterPubkey.equals(voterPubkey)).to.eq(
      true,
    );
    expect(account.state.stake.delegation.stake).to.eq(1_000_000n);
    expect(account.state.stake.delegation.activationEpoch).to.eq(44n);
    expect(account.state.stake.delegation.deactivationEpoch).to.eq(55n);
    expect(account.state.stake.delegation.warmupCooldownRate).to.eq(0.25);
    expect(account.state.stake.creditsObserved).to.eq(88n);
    expect(account.state.stakeFlags.bits).to.eq(3);
  });

  it('decodes non-data stake account variants', () => {
    const uninitialized = StakeAccount.fromAccountData(
      Array.from(
        getStakeStateAccountCodec().encode({
          state: stakeStateV2('Uninitialized'),
        }),
      ),
    );
    const rewardsPool = StakeAccount.fromAccountData(
      Uint8Array.from(
        getStakeStateAccountCodec().encode({
        state: stakeStateV2('RewardsPool'),
        }),
      ),
    );

    expect(uninitialized.state).to.deep.eq({__kind: 'Uninitialized'});
    expect(rewardsPool.state).to.deep.eq({__kind: 'RewardsPool'});
  });
});