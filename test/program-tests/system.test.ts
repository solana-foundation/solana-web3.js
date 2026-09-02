import {expect} from 'chai';

import {
  Keypair,
  Connection,
  PublicKey,
  StakeProgram,
  SystemInstruction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '../../src';
import {NONCE_ACCOUNT_LENGTH} from '../../src/nonce-account';
import {sleep} from '../../src/utils/sleep';
import {helpers} from '../mocks/rpc-http';
import {url} from '../url';

describe('SystemProgram', function () {
  it('createAccount', async () => {
    const params = {
      fromPubkey: (await Keypair.generate()).publicKey,
      newAccountPubkey: (await Keypair.generate()).publicKey,
      lamports: 123,
      space: 0,
      programId: SystemProgram.programId,
    };
    const transaction = new Transaction().add(
      SystemProgram.createAccount(params),
    );
    expect(transaction.instructions).to.have.length(1);
    const [systemInstruction] = transaction.instructions;
    const decodedParams = {
      ...params,
      lamports: BigInt(params.lamports),
      space: BigInt(params.space),
    };
    expect(decodedParams).to.eql(
      SystemInstruction.decodeCreateAccount(systemInstruction),
    );
  });

  it('transfer', async () => {
    const params = {
      fromPubkey: (await Keypair.generate()).publicKey,
      toPubkey: (await Keypair.generate()).publicKey,
      lamports: 123,
    };
    const transaction = new Transaction().add(SystemProgram.transfer(params));
    expect(transaction.instructions).to.have.length(1);
    const [systemInstruction] = transaction.instructions;
    const decodedParams = {
      ...params,
      lamports: BigInt(params.lamports),
    };
    expect(decodedParams).to.eql(
      SystemInstruction.decodeTransfer(systemInstruction),
    );
  });

  it('transferWithSeed', async () => {
    const params = {
      fromPubkey: (await Keypair.generate()).publicKey,
      basePubkey: (await Keypair.generate()).publicKey,
      toPubkey: (await Keypair.generate()).publicKey,
      lamports: 123,
      seed: '你好',
      programId: (await Keypair.generate()).publicKey,
    };
    const transaction = new Transaction().add(SystemProgram.transfer(params));
    expect(transaction.instructions).to.have.length(1);
    const [systemInstruction] = transaction.instructions;
    const decodedParams = {
      ...params,
      lamports: BigInt(params.lamports),
    };
    expect(decodedParams).to.eql(
      SystemInstruction.decodeTransferWithSeed(systemInstruction),
    );
  });

  it('allocate', async () => {
    const params = {
      accountPubkey: (await Keypair.generate()).publicKey,
      space: 42,
    };
    const transaction = new Transaction().add(SystemProgram.allocate(params));
    expect(transaction.instructions).to.have.length(1);
    const [systemInstruction] = transaction.instructions;
    const decodedParams = {
      ...params,
      space: BigInt(params.space),
    };
    expect(decodedParams).to.eql(
      SystemInstruction.decodeAllocate(systemInstruction),
    );
  });

  it('allocateWithSeed', async () => {
    const params = {
      accountPubkey: (await Keypair.generate()).publicKey,
      basePubkey: (await Keypair.generate()).publicKey,
      seed: '你好',
      space: 42,
      programId: (await Keypair.generate()).publicKey,
    };
    const transaction = new Transaction().add(SystemProgram.allocate(params));
    expect(transaction.instructions).to.have.length(1);
    const [systemInstruction] = transaction.instructions;
    const decodedParams = {
      ...params,
      space: BigInt(params.space),
    };
    expect(decodedParams).to.eql(
      SystemInstruction.decodeAllocateWithSeed(systemInstruction),
    );
  });

  it('assign', async () => {
    const params = {
      accountPubkey: (await Keypair.generate()).publicKey,
      programId: (await Keypair.generate()).publicKey,
    };
    const transaction = new Transaction().add(SystemProgram.assign(params));
    expect(transaction.instructions).to.have.length(1);
    const [systemInstruction] = transaction.instructions;
    expect(params).to.eql(SystemInstruction.decodeAssign(systemInstruction));
  });

  it('assignWithSeed', async () => {
    const params = {
      accountPubkey: (await Keypair.generate()).publicKey,
      basePubkey: (await Keypair.generate()).publicKey,
      seed: '你好',
      programId: (await Keypair.generate()).publicKey,
    };
    const transaction = new Transaction().add(SystemProgram.assign(params));
    expect(transaction.instructions).to.have.length(1);
    const [systemInstruction] = transaction.instructions;
    expect(params).to.eql(
      SystemInstruction.decodeAssignWithSeed(systemInstruction),
    );
  });

  it('createAccountWithSeed', async () => {
    const fromPubkey = (await Keypair.generate()).publicKey;
    const params = {
      fromPubkey,
      newAccountPubkey: (await Keypair.generate()).publicKey,
      basePubkey: fromPubkey,
      seed: 'hi there',
      lamports: 123,
      space: 0,
      programId: SystemProgram.programId,
    };
    const transaction = new Transaction().add(
      SystemProgram.createAccountWithSeed(params),
    );
    expect(transaction.instructions).to.have.length(1);
    const [systemInstruction] = transaction.instructions;
    const decodedParams = {
      ...params,
      lamports: BigInt(params.lamports),
      space: BigInt(params.space),
    };
    expect(decodedParams).to.eql(
      SystemInstruction.decodeCreateWithSeed(systemInstruction),
    );
  });

  it('createNonceAccount', async () => {
    const fromPubkey = (await Keypair.generate()).publicKey;
    const params = {
      fromPubkey,
      noncePubkey: (await Keypair.generate()).publicKey,
      authorizedPubkey: fromPubkey,
      lamports: 123,
    };

    const transaction = new Transaction().add(
      SystemProgram.createNonceAccount(params),
    );
    expect(transaction.instructions).to.have.length(2);
    const [createInstruction, initInstruction] = transaction.instructions;

    const createParams = {
      fromPubkey: params.fromPubkey,
      newAccountPubkey: params.noncePubkey,
      lamports: BigInt(params.lamports),
      space: BigInt(NONCE_ACCOUNT_LENGTH),
      programId: SystemProgram.programId,
    };
    expect(createParams).to.eql(
      SystemInstruction.decodeCreateAccount(createInstruction),
    );

    const initParams = {
      noncePubkey: params.noncePubkey,
      authorizedPubkey: fromPubkey,
    };
    expect(initParams).to.eql(
      SystemInstruction.decodeNonceInitialize(initInstruction),
    );
  });

  it('createNonceAccount with seed', async () => {
    const fromPubkey = (await Keypair.generate()).publicKey;
    const params = {
      fromPubkey,
      noncePubkey: (await Keypair.generate()).publicKey,
      authorizedPubkey: fromPubkey,
      basePubkey: fromPubkey,
      seed: 'hi there',
      lamports: 123,
    };

    const transaction = new Transaction().add(
      SystemProgram.createNonceAccount(params),
    );
    expect(transaction.instructions).to.have.length(2);
    const [createInstruction, initInstruction] = transaction.instructions;

    const createParams = {
      fromPubkey: params.fromPubkey,
      newAccountPubkey: params.noncePubkey,
      basePubkey: fromPubkey,
      seed: 'hi there',
      lamports: BigInt(params.lamports),
      space: BigInt(NONCE_ACCOUNT_LENGTH),
      programId: SystemProgram.programId,
    };
    expect(createParams).to.eql(
      SystemInstruction.decodeCreateWithSeed(createInstruction),
    );

    const initParams = {
      noncePubkey: params.noncePubkey,
      authorizedPubkey: fromPubkey,
    };
    expect(initParams).to.eql(
      SystemInstruction.decodeNonceInitialize(initInstruction),
    );
  });

  it('nonceAdvance', async () => {
    const params = {
      noncePubkey: (await Keypair.generate()).publicKey,
      authorizedPubkey: (await Keypair.generate()).publicKey,
    };
    const instruction = SystemProgram.nonceAdvance(params);
    expect(params).to.eql(SystemInstruction.decodeNonceAdvance(instruction));
  });

  it('nonceWithdraw', async () => {
    const params = {
      noncePubkey: (await Keypair.generate()).publicKey,
      authorizedPubkey: (await Keypair.generate()).publicKey,
      toPubkey: (await Keypair.generate()).publicKey,
      lamports: 123,
    };
    const transaction = new Transaction().add(
      SystemProgram.nonceWithdraw(params),
    );
    expect(transaction.instructions).to.have.length(1);
    const [instruction] = transaction.instructions;
    const decodedParams = {
      ...params,
      lamports: BigInt(params.lamports),
    };
    expect(decodedParams).to.eql(
      SystemInstruction.decodeNonceWithdraw(instruction),
    );
  });

  it('nonceAuthorize', async () => {
    const params = {
      noncePubkey: (await Keypair.generate()).publicKey,
      authorizedPubkey: (await Keypair.generate()).publicKey,
      newAuthorizedPubkey: (await Keypair.generate()).publicKey,
    };

    const transaction = new Transaction().add(
      SystemProgram.nonceAuthorize(params),
    );
    expect(transaction.instructions).to.have.length(1);
    const [instruction] = transaction.instructions;
    expect(params).to.eql(SystemInstruction.decodeNonceAuthorize(instruction));
  });

  it('non-SystemInstruction error', async () => {
    const from = await Keypair.generate();
    const to = await Keypair.generate();

    const badProgramId = {
      keys: [
        {pubkey: from.publicKey, isSigner: true, isWritable: true},
        {pubkey: to.publicKey, isSigner: false, isWritable: true},
      ],
      programId: StakeProgram.programId,
      data: Uint8Array.from([2, 0, 0, 0]),
    };
    expect(() => {
      SystemInstruction.decodeInstructionType(
        new TransactionInstruction(badProgramId),
      );
    }).to.throw();

    const stakePubkey = (await Keypair.generate()).publicKey;
    const authorizedPubkey = (await Keypair.generate()).publicKey;
    const params = {stakePubkey, authorizedPubkey};
    const transaction = StakeProgram.deactivate(params);

    expect(() => {
      SystemInstruction.decodeInstructionType(transaction.instructions[1]);
    }).to.throw();

    transaction.instructions[0].data[0] = 11;
    expect(() => {
      SystemInstruction.decodeInstructionType(transaction.instructions[0]);
    }).to.throw();
  });

  if (process.env.TEST_LIVE) {
    it('live Nonce actions', async () => {
      const connection = new Connection(url, 'confirmed');
      const nonceAccount = await Keypair.generate();
      const from = await Keypair.generate();
      await helpers.airdrop({
        connection,
        address: from.publicKey,
        amount: 2 * LAMPORTS_PER_SOL,
      });

      const to = await Keypair.generate();
      const newAuthority = await Keypair.generate();
      await helpers.airdrop({
        connection,
        address: newAuthority.publicKey,
        amount: LAMPORTS_PER_SOL,
      });

      const minimumAmount =
        await connection.getMinimumBalanceForRentExemption(
          NONCE_ACCOUNT_LENGTH,
        );

      const createNonceAccount = new Transaction().add(
        SystemProgram.createNonceAccount({
          fromPubkey: from.publicKey,
          noncePubkey: nonceAccount.publicKey,
          authorizedPubkey: from.publicKey,
          lamports: Number(minimumAmount),
        }),
      );
      await sendAndConfirmTransaction(
        connection,
        createNonceAccount,
        [from, nonceAccount],
        {preflightCommitment: 'confirmed'},
      );
      const nonceBalance = await connection.getBalance(nonceAccount.publicKey);
      expect(nonceBalance).to.eq(minimumAmount);

      const nonceQuery1 = await connection.getNonce(nonceAccount.publicKey);
      if (nonceQuery1 === null) {
        expect(nonceQuery1).not.to.be.null;
        return;
      }

      const nonceQuery2 = await connection.getNonce(nonceAccount.publicKey);
      if (nonceQuery2 === null) {
        expect(nonceQuery2).not.to.be.null;
        return;
      }

      expect(nonceQuery1.nonce).to.eq(nonceQuery2.nonce);

      // Wait for blockhash to advance
      await sleep(500);

      const advanceNonce = new Transaction().add(
        SystemProgram.nonceAdvance({
          noncePubkey: nonceAccount.publicKey,
          authorizedPubkey: from.publicKey,
        }),
      );
      await sendAndConfirmTransaction(connection, advanceNonce, [from], {
        preflightCommitment: 'confirmed',
      });
      const nonceQuery3 = await connection.getNonce(nonceAccount.publicKey);
      if (nonceQuery3 === null) {
        expect(nonceQuery3).not.to.be.null;
        return;
      }
      expect(nonceQuery1.nonce).not.to.eq(nonceQuery3.nonce);
      const nonce = nonceQuery3.nonce;

      // Wait for blockhash to advance
      await sleep(500);

      const authorizeNonce = new Transaction().add(
        SystemProgram.nonceAuthorize({
          noncePubkey: nonceAccount.publicKey,
          authorizedPubkey: from.publicKey,
          newAuthorizedPubkey: newAuthority.publicKey,
        }),
      );
      await sendAndConfirmTransaction(connection, authorizeNonce, [from], {
        preflightCommitment: 'confirmed',
      });

      const transfer = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to.publicKey,
          lamports: minimumAmount,
        }),
      );
      transfer.nonceInfo = {
        nonce,
        nonceInstruction: SystemProgram.nonceAdvance({
          noncePubkey: nonceAccount.publicKey,
          authorizedPubkey: newAuthority.publicKey,
        }),
      };

      await sendAndConfirmTransaction(
        connection,
        transfer,
        [from, newAuthority],
        {
          preflightCommitment: 'confirmed',
        },
      );
      const toBalance = await connection.getBalance(to.publicKey);
      expect(toBalance).to.eq(minimumAmount);

      // Wait for blockhash to advance
      await sleep(500);

      const withdrawAccount = await Keypair.generate();
      const withdrawNonce = new Transaction().add(
        SystemProgram.nonceWithdraw({
          noncePubkey: nonceAccount.publicKey,
          authorizedPubkey: newAuthority.publicKey,
          lamports: Number(minimumAmount),
          toPubkey: withdrawAccount.publicKey,
        }),
      );
      await sendAndConfirmTransaction(
        connection,
        withdrawNonce,
        [newAuthority],
        {
          preflightCommitment: 'confirmed',
        },
      );
      expect(await connection.getBalance(nonceAccount.publicKey)).to.eq(0n);
      const withdrawBalance = await connection.getBalance(
        withdrawAccount.publicKey,
      );
      expect(withdrawBalance).to.eq(minimumAmount);
    }).timeout(10 * 1000);

    it('live withSeed actions', async () => {
      const connection = new Connection(url, 'confirmed');
      const baseAccount = await Keypair.generate();
      await helpers.airdrop({
        connection,
        address: baseAccount.publicKey,
        amount: 2 * LAMPORTS_PER_SOL,
      });
      const basePubkey = baseAccount.publicKey;
      const seed = 'hi there';
      const programId = (await Keypair.generate()).publicKey;
      const createAccountWithSeedAddress = await PublicKey.createWithSeed(
        basePubkey,
        seed,
        programId,
      );
      const space = 0;

      const minimumAmount =
        await connection.getMinimumBalanceForRentExemption(space);

      // Test CreateAccountWithSeed
      const createAccountWithSeedParams = {
        fromPubkey: basePubkey,
        newAccountPubkey: createAccountWithSeedAddress,
        basePubkey,
        seed,
        lamports: Number(minimumAmount),
        space,
        programId,
      };
      const createAccountWithSeedTransaction = new Transaction().add(
        SystemProgram.createAccountWithSeed(createAccountWithSeedParams),
      );
      await sendAndConfirmTransaction(
        connection,
        createAccountWithSeedTransaction,
        [baseAccount],
        {preflightCommitment: 'confirmed'},
      );
      const createAccountWithSeedBalance = await connection.getBalance(
        createAccountWithSeedAddress,
      );
      expect(createAccountWithSeedBalance).to.eq(minimumAmount);

      // Test CreateAccountWithSeed where fromPubkey != basePubkey
      const uniqueFromAccount = await Keypair.generate();
      const newBaseAccount = await Keypair.generate();
      const createAccountWithSeedAddress2 = await PublicKey.createWithSeed(
        newBaseAccount.publicKey,
        seed,
        programId,
      );
      await helpers.airdrop({
        connection,
        address: uniqueFromAccount.publicKey,
        amount: 2 * LAMPORTS_PER_SOL,
      });
      const createAccountWithSeedParams2 = {
        fromPubkey: uniqueFromAccount.publicKey,
        newAccountPubkey: createAccountWithSeedAddress2,
        basePubkey: newBaseAccount.publicKey,
        seed,
        lamports: Number(minimumAmount),
        space,
        programId,
      };
      const createAccountWithSeedTransaction2 = new Transaction().add(
        SystemProgram.createAccountWithSeed(createAccountWithSeedParams2),
      );
      await sendAndConfirmTransaction(
        connection,
        createAccountWithSeedTransaction2,
        [uniqueFromAccount, newBaseAccount],
        {preflightCommitment: 'confirmed'},
      );
      const createAccountWithSeedBalance2 = await connection.getBalance(
        createAccountWithSeedAddress2,
      );
      expect(createAccountWithSeedBalance2).to.eq(minimumAmount);

      // Transfer to a derived address to prep for TransferWithSeed
      const programId2 = (await Keypair.generate()).publicKey;
      const transferWithSeedAddress = await PublicKey.createWithSeed(
        basePubkey,
        seed,
        programId2,
      );
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: baseAccount.publicKey,
            toPubkey: transferWithSeedAddress,
            lamports: Number(3n * minimumAmount),
          }),
        ),
        [baseAccount],
        {preflightCommitment: 'confirmed'},
      );
      let transferWithSeedAddressBalance = await connection.getBalance(
        transferWithSeedAddress,
      );
      expect(transferWithSeedAddressBalance).to.eq(3n * minimumAmount);

      // Test TransferWithSeed
      const programId3 = await Keypair.generate();
      const toPubkey = await PublicKey.createWithSeed(
        basePubkey,
        seed,
        programId3.publicKey,
      );
      const transferWithSeedParams = {
        fromPubkey: transferWithSeedAddress,
        basePubkey,
        toPubkey,
        lamports: Number(2n * minimumAmount),
        seed,
        programId: programId2,
      };
      const transferWithSeedTransaction = new Transaction().add(
        SystemProgram.transfer(transferWithSeedParams),
      );
      await sendAndConfirmTransaction(
        connection,
        transferWithSeedTransaction,
        [baseAccount],
        {preflightCommitment: 'confirmed'},
      );
      const toBalance = await connection.getBalance(toPubkey);
      expect(toBalance).to.eq(2n * minimumAmount);
      transferWithSeedAddressBalance = await connection.getBalance(
        createAccountWithSeedAddress,
      );
      expect(transferWithSeedAddressBalance).to.eq(minimumAmount);

      // Test AllocateWithSeed
      const allocateWithSeedParams = {
        accountPubkey: toPubkey,
        basePubkey,
        seed,
        space: 10,
        programId: programId3.publicKey,
      };
      const allocateWithSeedTransaction = new Transaction().add(
        SystemProgram.allocate(allocateWithSeedParams),
      );
      await sendAndConfirmTransaction(
        connection,
        allocateWithSeedTransaction,
        [baseAccount],
        {preflightCommitment: 'confirmed'},
      );
      let account = await connection.getAccountInfo(toPubkey);
      if (account === null) {
        expect(account).not.to.be.null;
        return;
      }
      expect(account.data).to.have.length(10);

      // Test AssignWithSeed
      const assignWithSeedParams = {
        accountPubkey: toPubkey,
        basePubkey,
        seed,
        programId: programId3.publicKey,
      };
      const assignWithSeedTransaction = new Transaction().add(
        SystemProgram.assign(assignWithSeedParams),
      );
      await sendAndConfirmTransaction(
        connection,
        assignWithSeedTransaction,
        [baseAccount],
        {preflightCommitment: 'confirmed'},
      );
      account = await connection.getAccountInfo(toPubkey);
      if (account === null) {
        expect(account).not.to.be.null;
        return;
      }
      expect(account.owner).to.eql(programId3.publicKey);
    }).timeout(10 * 1000);
  }
});
