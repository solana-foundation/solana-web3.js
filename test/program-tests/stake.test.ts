import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  Keypair,
  Authorized,
  Connection,
  Lockup,
  Address,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  StakeAuthorizationLayout,
  StakeInstruction,
  StakeProgram,
  SystemInstruction,
  Transaction,
} from '../../src';
import {sleep} from '../../src/utils/sleep';
import {helpers} from '../mocks/rpc-http';
import {url} from '../url';

use(chaiAsPromised);

describe('StakeProgram', function () {
  it('createAccountWithSeed', async () => {
    const fromPubkey = (await Keypair.generate()).publicKey;
    const seed = 'test string';
    const newAccountPubkey = await Address.createWithSeed(
      fromPubkey,
      seed,
      StakeProgram.programId,
    );
    const authorizedPubkey = (await Keypair.generate()).publicKey;
    const authorized = new Authorized(authorizedPubkey, authorizedPubkey);
    const lockup = new Lockup(0, 0, fromPubkey);
    const lamports = 123;
    const transaction = StakeProgram.createAccountWithSeed({
      fromPubkey,
      stakePubkey: newAccountPubkey,
      basePubkey: fromPubkey,
      seed,
      authorized,
      lockup,
      lamports,
    });
    expect(transaction.instructions).to.have.length(2);
    const [systemInstruction, stakeInstruction] = transaction.instructions;
    const systemParams = {
      fromPubkey,
      newAccountPubkey,
      basePubkey: fromPubkey,
      seed,
      lamports,
      space: StakeProgram.space,
      programId: StakeProgram.programId,
    };
    expect(systemParams).to.eql(
      SystemInstruction.decodeCreateWithSeed(systemInstruction),
    );
    const initParams = {stakePubkey: newAccountPubkey, authorized, lockup};
    expect(initParams).to.eql(
      StakeInstruction.decodeInitialize(stakeInstruction),
    );
  });

  it('createAccount', async () => {
    const fromPubkey = (await Keypair.generate()).publicKey;
    const newAccountPubkey = (await Keypair.generate()).publicKey;
    const authorizedPubkey = (await Keypair.generate()).publicKey;
    const authorized = new Authorized(authorizedPubkey, authorizedPubkey);
    const lockup = new Lockup(0, 0, fromPubkey);
    const lamports = 123;
    const transaction = StakeProgram.createAccount({
      fromPubkey,
      stakePubkey: newAccountPubkey,
      authorized,
      lockup,
      lamports,
    });
    expect(transaction.instructions).to.have.length(2);
    const [systemInstruction, stakeInstruction] = transaction.instructions;
    const systemParams = {
      fromPubkey,
      newAccountPubkey,
      lamports,
      space: StakeProgram.space,
      programId: StakeProgram.programId,
    };
    expect(systemParams).to.eql(
      SystemInstruction.decodeCreateAccount(systemInstruction),
    );

    const initParams = {stakePubkey: newAccountPubkey, authorized, lockup};
    expect(initParams).to.eql(
      StakeInstruction.decodeInitialize(stakeInstruction),
    );
  });

  it('delegate', async () => {
    const stakePubkey = (await Keypair.generate()).publicKey;
    const authorizedPubkey = (await Keypair.generate()).publicKey;
    const votePubkey = (await Keypair.generate()).publicKey;
    const params = {
      stakePubkey,
      authorizedPubkey,
      votePubkey,
    };
    const transaction = StakeProgram.delegate(params);
    expect(transaction.instructions).to.have.length(1);
    const [stakeInstruction] = transaction.instructions;
    expect(params).to.eql(StakeInstruction.decodeDelegate(stakeInstruction));
  });

  it('authorize', async () => {
    const stakePubkey = (await Keypair.generate()).publicKey;
    const authorizedPubkey = (await Keypair.generate()).publicKey;
    const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
    const stakeAuthorizationType = StakeAuthorizationLayout.Staker;
    const params = {
      stakePubkey,
      authorizedPubkey,
      newAuthorizedPubkey,
      stakeAuthorizationType,
    };
    const transaction = StakeProgram.authorize(params);
    expect(transaction.instructions).to.have.length(1);
    const [stakeInstruction] = transaction.instructions;
    expect(params).to.eql(StakeInstruction.decodeAuthorize(stakeInstruction));
  });

  it('authorize with custodian', async () => {
    const stakePubkey = (await Keypair.generate()).publicKey;
    const authorizedPubkey = (await Keypair.generate()).publicKey;
    const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
    const stakeAuthorizationType = StakeAuthorizationLayout.Withdrawer;
    const custodianPubkey = (await Keypair.generate()).publicKey;
    const params = {
      stakePubkey,
      authorizedPubkey,
      newAuthorizedPubkey,
      stakeAuthorizationType,
      custodianPubkey,
    };
    const transaction = StakeProgram.authorize(params);
    expect(transaction.instructions).to.have.length(1);
    const [stakeInstruction] = transaction.instructions;
    expect(params).to.eql(StakeInstruction.decodeAuthorize(stakeInstruction));
  });

  it('authorizeWithSeed', async () => {
    const stakePubkey = (await Keypair.generate()).publicKey;
    const authorityBase = (await Keypair.generate()).publicKey;
    const authoritySeed = 'test string';
    const authorityOwner = (await Keypair.generate()).publicKey;
    const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
    const stakeAuthorizationType = StakeAuthorizationLayout.Staker;
    const params = {
      stakePubkey,
      authorityBase,
      authoritySeed,
      authorityOwner,
      newAuthorizedPubkey,
      stakeAuthorizationType,
    };
    const transaction = StakeProgram.authorizeWithSeed(params);
    expect(transaction.instructions).to.have.length(1);
    const [stakeInstruction] = transaction.instructions;
    expect(params).to.eql(
      StakeInstruction.decodeAuthorizeWithSeed(stakeInstruction),
    );
  });

  it('authorizeWithSeed with custodian', async () => {
    const stakePubkey = (await Keypair.generate()).publicKey;
    const authorityBase = (await Keypair.generate()).publicKey;
    const authoritySeed = 'test string';
    const authorityOwner = (await Keypair.generate()).publicKey;
    const newAuthorizedPubkey = (await Keypair.generate()).publicKey;
    const stakeAuthorizationType = StakeAuthorizationLayout.Staker;
    const custodianPubkey = (await Keypair.generate()).publicKey;
    const params = {
      stakePubkey,
      authorityBase,
      authoritySeed,
      authorityOwner,
      newAuthorizedPubkey,
      stakeAuthorizationType,
      custodianPubkey,
    };
    const transaction = StakeProgram.authorizeWithSeed(params);
    expect(transaction.instructions).to.have.length(1);
    const [stakeInstruction] = transaction.instructions;
    expect(params).to.eql(
      StakeInstruction.decodeAuthorizeWithSeed(stakeInstruction),
    );
  });

  it('split', async () => {
    const stakePubkey = (await Keypair.generate()).publicKey;
    const authorizedPubkey = (await Keypair.generate()).publicKey;
    const splitStakePubkey = (await Keypair.generate()).publicKey;
    const params = {
      stakePubkey,
      authorizedPubkey,
      splitStakePubkey,
      lamports: 123,
    };
    const transaction = StakeProgram.split(params, 123 /* rentExemptReserve */);
    expect(transaction.instructions).to.have.length(2);
    const [systemInstruction, stakeInstruction] = transaction.instructions;
    const systemParams = {
      fromPubkey: authorizedPubkey,
      newAccountPubkey: splitStakePubkey,
      lamports: 123,
      space: StakeProgram.space,
      programId: StakeProgram.programId,
    };
    expect(systemParams).to.eql(
      SystemInstruction.decodeCreateAccount(systemInstruction),
    );
    expect(params).to.eql(StakeInstruction.decodeSplit(stakeInstruction));
  });

  [0, undefined, 456].forEach(rentExemptReserve => {
    it(`splitWithSeed (rent reserve: ${rentExemptReserve})`, async () => {
      const stakePubkey = (await Keypair.generate()).publicKey;
      const authorizedPubkey = (await Keypair.generate()).publicKey;
      const lamports = 123;
      const seed = 'test string';
      const basePubkey = (await Keypair.generate()).publicKey;
      const splitStakePubkey = await Address.createWithSeed(
        basePubkey,
        seed,
        StakeProgram.programId,
      );
      const transaction = StakeProgram.splitWithSeed(
        {
          stakePubkey,
          authorizedPubkey,
          lamports,
          splitStakePubkey,
          basePubkey,
          seed,
        },
        rentExemptReserve,
      );
      const hasRentReserve = rentExemptReserve && rentExemptReserve > 0;
      expect(transaction.instructions).to.have.length(hasRentReserve ? 3 : 2);
      const allocateInstruction = transaction.instructions[0];
      const splitInstruction = transaction.instructions[hasRentReserve ? 2 : 1];
      const transferInstruction = hasRentReserve
        ? transaction.instructions[1]
        : undefined;
      const allocateParams = {
        accountPubkey: splitStakePubkey,
        basePubkey,
        seed,
        space: StakeProgram.space,
        programId: StakeProgram.programId,
      };
      expect(allocateParams).to.eql(
        SystemInstruction.decodeAllocateWithSeed(allocateInstruction),
      );
      if (hasRentReserve) {
        const transferParams = {
          fromPubkey: authorizedPubkey,
          toPubkey: splitStakePubkey,
          lamports: 456n,
        };
        expect(transferParams).to.eql(
          SystemInstruction.decodeTransfer(transferInstruction!),
        );
      }
      const splitParams = {
        stakePubkey,
        authorizedPubkey,
        splitStakePubkey,
        lamports,
      };
      expect(splitParams).to.eql(
        StakeInstruction.decodeSplit(splitInstruction),
      );
    });
  });

  it('merge', async () => {
    const stakePubkey = (await Keypair.generate()).publicKey;
    const sourceStakePubKey = (await Keypair.generate()).publicKey;
    const authorizedPubkey = (await Keypair.generate()).publicKey;
    const params = {
      stakePubkey,
      sourceStakePubKey,
      authorizedPubkey,
    };
    const transaction = StakeProgram.merge(params);
    expect(transaction.instructions).to.have.length(1);
    const [stakeInstruction] = transaction.instructions;
    expect(params).to.eql(StakeInstruction.decodeMerge(stakeInstruction));
  });

  it('withdraw', async () => {
    const stakePubkey = (await Keypair.generate()).publicKey;
    const authorizedPubkey = (await Keypair.generate()).publicKey;
    const toPubkey = (await Keypair.generate()).publicKey;
    const params = {
      stakePubkey,
      authorizedPubkey,
      toPubkey,
      lamports: 123,
    };
    const transaction = StakeProgram.withdraw(params);
    expect(transaction.instructions).to.have.length(1);
    const [stakeInstruction] = transaction.instructions;
    expect(params).to.eql(StakeInstruction.decodeWithdraw(stakeInstruction));
  });

  it('withdraw with custodian', async () => {
    const stakePubkey = (await Keypair.generate()).publicKey;
    const authorizedPubkey = (await Keypair.generate()).publicKey;
    const toPubkey = (await Keypair.generate()).publicKey;
    const custodianPubkey = (await Keypair.generate()).publicKey;
    const params = {
      stakePubkey,
      authorizedPubkey,
      toPubkey,
      lamports: 123,
      custodianPubkey,
    };
    const transaction = StakeProgram.withdraw(params);
    expect(transaction.instructions).to.have.length(1);
    const [stakeInstruction] = transaction.instructions;
    expect(params).to.eql(StakeInstruction.decodeWithdraw(stakeInstruction));
  });

  it('deactivate', async () => {
    const stakePubkey = (await Keypair.generate()).publicKey;
    const authorizedPubkey = (await Keypair.generate()).publicKey;
    const params = {stakePubkey, authorizedPubkey};
    const transaction = StakeProgram.deactivate(params);
    expect(transaction.instructions).to.have.length(1);
    const [stakeInstruction] = transaction.instructions;
    expect(params).to.eql(StakeInstruction.decodeDeactivate(stakeInstruction));
  });

  it('StakeInstructions', async () => {
    const from = await Keypair.generate();
    const seed = 'test string';
    const newAccountPubkey = await Address.createWithSeed(
      from.publicKey,
      seed,
      StakeProgram.programId,
    );
    const authorized = await Keypair.generate();
    const amount = 123;
    const recentBlockhash = 'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k'; // Arbitrary known recentBlockhash
    const createWithSeed = StakeProgram.createAccountWithSeed({
      fromPubkey: from.publicKey,
      stakePubkey: newAccountPubkey,
      basePubkey: from.publicKey,
      seed,
      authorized: new Authorized(authorized.publicKey, authorized.publicKey),
      lockup: new Lockup(0, 0, from.publicKey),
      lamports: amount,
    });
    const createWithSeedTransaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(createWithSeed);

    expect(createWithSeedTransaction.instructions).to.have.length(2);
    const systemInstructionType = SystemInstruction.decodeInstructionType(
      createWithSeedTransaction.instructions[0],
    );
    expect(systemInstructionType).to.eq('CreateWithSeed');

    const stakeInstructionType = StakeInstruction.decodeInstructionType(
      createWithSeedTransaction.instructions[1],
    );
    expect(stakeInstructionType).to.eq('Initialize');

    expect(() => {
      StakeInstruction.decodeInstructionType(
        createWithSeedTransaction.instructions[0],
      );
    }).to.throw();

    const stake = await Keypair.generate();
    const vote = await Keypair.generate();
    const delegate = StakeProgram.delegate({
      stakePubkey: stake.publicKey,
      authorizedPubkey: authorized.publicKey,
      votePubkey: vote.publicKey,
    });

    const delegateTransaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(delegate);
    const anotherStakeInstructionType = StakeInstruction.decodeInstructionType(
      delegateTransaction.instructions[0],
    );
    expect(anotherStakeInstructionType).to.eq('Delegate');
  });

  if (process.env.TEST_LIVE) {
    it('live staking actions', async () => {
      const connection = new Connection(url, 'confirmed');
      const [
        SYSTEM_ACCOUNT_MIN_BALANCE,
        STAKE_ACCOUNT_MIN_BALANCE,
        {value: minimumStakeDelegation},
      ] = await Promise.all([
        connection.getMinimumBalanceForRentExemption(0),
        connection.getMinimumBalanceForRentExemption(StakeProgram.space),
        connection.getStakeMinimumDelegation(),
      ]);
      const MIN_STAKE_DELEGATION = Number(minimumStakeDelegation);
      const minimumStakeDelegationBigInt = BigInt(MIN_STAKE_DELEGATION);

      const voteAccounts = await connection.getVoteAccounts();
      const voteAccount = voteAccounts.current.concat(
        voteAccounts.delinquent,
      )[0];
      const votePubkey = new Address(voteAccount.votePubkey);

      const payer = await Keypair.generate();
      await helpers.airdrop({
        connection,
        address: payer.publicKey,
        amount: 10 * LAMPORTS_PER_SOL,
      });

      const authorized = await Keypair.generate();
      await helpers.airdrop({
        connection,
        address: authorized.publicKey,
        amount: 2 * LAMPORTS_PER_SOL,
      });

      const recipient = await Keypair.generate();
      await helpers.airdrop({
        connection,
        address: recipient.publicKey,
        amount: SYSTEM_ACCOUNT_MIN_BALANCE,
      });

      {
        // Create Stake account without seed
        const newStakeAccount = await Keypair.generate();
        let createAndInitialize = StakeProgram.createAccount({
          fromPubkey: payer.publicKey,
          stakePubkey: newStakeAccount.publicKey,
          authorized: new Authorized(
            authorized.publicKey,
            authorized.publicKey,
          ),
          lamports: Number(
            STAKE_ACCOUNT_MIN_BALANCE + minimumStakeDelegationBigInt,
          ),
        });

        await sendAndConfirmTransaction(
          connection,
          createAndInitialize,
          [payer, newStakeAccount],
          {preflightCommitment: 'confirmed'},
        );
        expect(await connection.getBalance(newStakeAccount.publicKey)).to.eq(
          STAKE_ACCOUNT_MIN_BALANCE + minimumStakeDelegationBigInt,
        );

        const delegation = StakeProgram.delegate({
          stakePubkey: newStakeAccount.publicKey,
          authorizedPubkey: authorized.publicKey,
          votePubkey,
        });
        await sendAndConfirmTransaction(connection, delegation, [authorized], {
          commitment: 'confirmed',
        });
      }

      // Create Stake account with seed
      const seed = 'test string';
      const newAccountPubkey = await Address.createWithSeed(
        payer.publicKey,
        seed,
        StakeProgram.programId,
      );

      const WITHDRAW_AMOUNT = 1;
      const INITIAL_STAKE_DELEGATION = 5 * LAMPORTS_PER_SOL;
      const withdrawAmountBigInt = BigInt(WITHDRAW_AMOUNT);
      let createAndInitializeWithSeed = StakeProgram.createAccountWithSeed({
        fromPubkey: payer.publicKey,
        stakePubkey: newAccountPubkey,
        basePubkey: payer.publicKey,
        seed,
        authorized: new Authorized(authorized.publicKey, authorized.publicKey),
        lockup: new Lockup(0, 0, new Address(0)),
        lamports: Number(
          STAKE_ACCOUNT_MIN_BALANCE + BigInt(INITIAL_STAKE_DELEGATION),
        ),
      });

      await sendAndConfirmTransaction(
        connection,
        createAndInitializeWithSeed,
        [payer],
        {preflightCommitment: 'confirmed'},
      );
      let originalStakeBalance = await connection.getBalance(newAccountPubkey);
      expect(originalStakeBalance).to.eq(
        STAKE_ACCOUNT_MIN_BALANCE + BigInt(INITIAL_STAKE_DELEGATION),
      );

      let delegation = StakeProgram.delegate({
        stakePubkey: newAccountPubkey,
        authorizedPubkey: authorized.publicKey,
        votePubkey,
      });
      await sendAndConfirmTransaction(connection, delegation, [authorized], {
        preflightCommitment: 'confirmed',
      });

      // Test that withdraw fails before deactivation
      let withdraw = StakeProgram.withdraw({
        stakePubkey: newAccountPubkey,
        authorizedPubkey: authorized.publicKey,
        toPubkey: recipient.publicKey,
        lamports: WITHDRAW_AMOUNT,
      });
      await expect(
        sendAndConfirmTransaction(connection, withdraw, [authorized], {
          preflightCommitment: 'confirmed',
        }),
      ).to.be.rejected;

      // Deactivate stake
      let deactivate = StakeProgram.deactivate({
        stakePubkey: newAccountPubkey,
        authorizedPubkey: authorized.publicKey,
      });
      await sendAndConfirmTransaction(connection, deactivate, [authorized], {
        preflightCommitment: 'confirmed',
      });

      // Test that withdraw succeeds after deactivation
      // Deactivation can take time, so retry withdrawal until it lands.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        withdraw = StakeProgram.withdraw({
          stakePubkey: newAccountPubkey,
          authorizedPubkey: authorized.publicKey,
          toPubkey: recipient.publicKey,
          lamports: WITHDRAW_AMOUNT,
        });

        try {
          await sendAndConfirmTransaction(connection, withdraw, [authorized], {
            preflightCommitment: 'confirmed',
          });
          break;
        } catch (_error) {
          await sleep(400);
        }
      }

      const recipientBalance = await connection.getBalance(recipient.publicKey);
      expect(recipientBalance).to.eq(
        SYSTEM_ACCOUNT_MIN_BALANCE + withdrawAmountBigInt,
      );

      // Split stake
      const newStake = await Keypair.generate();
      let split = StakeProgram.split(
        {
          stakePubkey: newAccountPubkey,
          authorizedPubkey: authorized.publicKey,
          splitStakePubkey: newStake.publicKey,
          lamports: MIN_STAKE_DELEGATION,
        },
        Number(STAKE_ACCOUNT_MIN_BALANCE),
      );
      await sendAndConfirmTransaction(
        connection,
        split,
        [authorized, newStake],
        {
          preflightCommitment: 'confirmed',
        },
      );
      const balance = await connection.getBalance(newStake.publicKey);
      expect(balance).to.eq(
        STAKE_ACCOUNT_MIN_BALANCE + minimumStakeDelegationBigInt,
      );

      // Split stake with seed
      const seed2 = 'test string 2';
      const newStake2 = await Address.createWithSeed(
        payer.publicKey,
        seed2,
        StakeProgram.programId,
      );
      let splitWithSeed = StakeProgram.splitWithSeed(
        {
          stakePubkey: newAccountPubkey,
          authorizedPubkey: authorized.publicKey,
          lamports: MIN_STAKE_DELEGATION,
          splitStakePubkey: newStake2,
          basePubkey: payer.publicKey,
          seed: seed2,
        },
        Number(STAKE_ACCOUNT_MIN_BALANCE),
      );
      await sendAndConfirmTransaction(
        connection,
        splitWithSeed,
        [payer, authorized],
        {
          preflightCommitment: 'confirmed',
        },
      );
      expect(await connection.getBalance(newStake2)).to.eq(
        STAKE_ACCOUNT_MIN_BALANCE + minimumStakeDelegationBigInt,
      );

      // Merge stake
      const preMergeBalance = await connection.getBalance(newAccountPubkey);
      let merge = StakeProgram.merge({
        stakePubkey: newAccountPubkey,
        sourceStakePubKey: newStake.publicKey,
        authorizedPubkey: authorized.publicKey,
      });
      await sendAndConfirmTransaction(connection, merge, [authorized], {
        preflightCommitment: 'confirmed',
      });
      const postMergeBalance = await connection.getBalance(newAccountPubkey);
      expect(postMergeBalance - preMergeBalance).to.eq(
        STAKE_ACCOUNT_MIN_BALANCE + minimumStakeDelegationBigInt,
      );

      // Resplit
      split = StakeProgram.split(
        {
          stakePubkey: newAccountPubkey,
          authorizedPubkey: authorized.publicKey,
          splitStakePubkey: newStake.publicKey,
          // use a different amount than the first split so that this
          // transaction is different and won't require a fresh blockhash
          lamports: MIN_STAKE_DELEGATION,
        },
        Number(STAKE_ACCOUNT_MIN_BALANCE),
      );
      await sendAndConfirmTransaction(
        connection,
        split,
        [authorized, newStake],
        {
          preflightCommitment: 'confirmed',
        },
      );

      // Authorize to new account
      const newAuthorized = await Keypair.generate();
      await connection.requestAirdrop(
        newAuthorized.publicKey,
        LAMPORTS_PER_SOL,
      );

      let authorize = StakeProgram.authorize({
        stakePubkey: newAccountPubkey,
        authorizedPubkey: authorized.publicKey,
        newAuthorizedPubkey: newAuthorized.publicKey,
        stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
      });
      await sendAndConfirmTransaction(connection, authorize, [authorized], {
        preflightCommitment: 'confirmed',
      });
      authorize = StakeProgram.authorize({
        stakePubkey: newAccountPubkey,
        authorizedPubkey: authorized.publicKey,
        newAuthorizedPubkey: newAuthorized.publicKey,
        stakeAuthorizationType: StakeAuthorizationLayout.Staker,
      });
      await sendAndConfirmTransaction(connection, authorize, [authorized], {
        preflightCommitment: 'confirmed',
      });

      // Test old authorized can't delegate
      let delegateNotAuthorized = StakeProgram.delegate({
        stakePubkey: newAccountPubkey,
        authorizedPubkey: authorized.publicKey,
        votePubkey,
      });
      await expect(
        sendAndConfirmTransaction(
          connection,
          delegateNotAuthorized,
          [authorized],
          {
            preflightCommitment: 'confirmed',
          },
        ),
      ).to.be.rejected;

      // Test accounts with different authorities can't be merged
      let mergeNotAuthorized = StakeProgram.merge({
        stakePubkey: newStake.publicKey,
        sourceStakePubKey: newAccountPubkey,
        authorizedPubkey: authorized.publicKey,
      });
      await expect(
        sendAndConfirmTransaction(
          connection,
          mergeNotAuthorized,
          [authorized],
          {
            preflightCommitment: 'confirmed',
          },
        ),
      ).to.be.rejected;

      // Authorize a derived address
      authorize = StakeProgram.authorize({
        stakePubkey: newAccountPubkey,
        authorizedPubkey: newAuthorized.publicKey,
        newAuthorizedPubkey: newAccountPubkey,
        stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
      });
      await sendAndConfirmTransaction(connection, authorize, [newAuthorized], {
        preflightCommitment: 'confirmed',
      });

      // Restore the previous authority using a derived address
      authorize = StakeProgram.authorizeWithSeed({
        stakePubkey: newAccountPubkey,
        authorityBase: payer.publicKey,
        authoritySeed: seed,
        authorityOwner: StakeProgram.programId,
        newAuthorizedPubkey: newAuthorized.publicKey,
        stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
      });
      await sendAndConfirmTransaction(connection, authorize, [payer], {
        preflightCommitment: 'confirmed',
      });
    }).timeout(10 * 1000);
  }
});
