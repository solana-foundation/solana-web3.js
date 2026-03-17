import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  Keypair,
  AddressLookupTableProgram,
  Transaction,
  AddressLookupTableInstruction,
  Connection,
  sendAndConfirmTransaction,
} from '../../src';
import {sleep} from '../../src/utils/sleep';
import {helpers} from '../mocks/rpc-http';
import {url} from '../url';

use(chaiAsPromised);

describe('AddressLookupTableProgram', function () {
  it('createAddressLookupTable', async () => {
    const recentSlot = 0;
    const authorityPubkey = (await Keypair.generate()).publicKey;
    const payerPubkey = (await Keypair.generate()).publicKey;
    const [instruction] = AddressLookupTableProgram.createLookupTable({
      authority: authorityPubkey,
      payer: payerPubkey,
      recentSlot,
    });

    const transaction = new Transaction().add(instruction);
    const createLutParams = {
      authority: authorityPubkey,
      payer: payerPubkey,
      recentSlot,
    };
    expect(transaction.instructions).to.have.length(1);
    expect(createLutParams).to.eql(
      AddressLookupTableInstruction.decodeCreateLookupTable(instruction),
    );
  });

  it('extendLookupTableWithPayer', async () => {
    const lutAddress = (await Keypair.generate()).publicKey;
    const authorityPubkey = (await Keypair.generate()).publicKey;
    const payerPubkey = (await Keypair.generate()).publicKey;

    const addressesToAdd = await Promise.all(
      [...Array(4)].map(async () => (await Keypair.generate()).publicKey),
    );

    const instruction = AddressLookupTableProgram.extendLookupTable({
      lookupTable: lutAddress,
      authority: authorityPubkey,
      payer: payerPubkey,
      addresses: addressesToAdd,
    });
    const transaction = new Transaction().add(instruction);
    const extendLutParams = {
      lookupTable: lutAddress,
      authority: authorityPubkey,
      payer: payerPubkey,
      addresses: addressesToAdd,
    };
    expect(transaction.instructions).to.have.length(1);
    expect(extendLutParams).to.eql(
      AddressLookupTableInstruction.decodeExtendLookupTable(instruction),
    );
  });

  it('extendLookupTableWithoutPayer', async () => {
    const lutAddress = (await Keypair.generate()).publicKey;
    const authorityPubkey = (await Keypair.generate()).publicKey;

    const addressesToAdd = await Promise.all(
      [...Array(4)].map(async () => (await Keypair.generate()).publicKey),
    );

    const instruction = AddressLookupTableProgram.extendLookupTable({
      lookupTable: lutAddress,
      authority: authorityPubkey,
      addresses: addressesToAdd,
    });
    const transaction = new Transaction().add(instruction);
    const extendLutParams = {
      lookupTable: lutAddress,
      authority: authorityPubkey,
      payer: undefined,
      addresses: addressesToAdd,
    };
    expect(transaction.instructions).to.have.length(1);
    expect(extendLutParams).to.eql(
      AddressLookupTableInstruction.decodeExtendLookupTable(instruction),
    );
  });

  it('closeLookupTable', async () => {
    const lutAddress = (await Keypair.generate()).publicKey;
    const authorityPubkey = (await Keypair.generate()).publicKey;
    const recipientPubkey = (await Keypair.generate()).publicKey;

    const instruction = AddressLookupTableProgram.closeLookupTable({
      lookupTable: lutAddress,
      authority: authorityPubkey,
      recipient: recipientPubkey,
    });
    const transaction = new Transaction().add(instruction);
    const closeLutParams = {
      lookupTable: lutAddress,
      authority: authorityPubkey,
      recipient: recipientPubkey,
    };
    expect(transaction.instructions).to.have.length(1);
    expect(closeLutParams).to.eql(
      AddressLookupTableInstruction.decodeCloseLookupTable(instruction),
    );
  });

  it('freezeLookupTable', async () => {
    const lutAddress = (await Keypair.generate()).publicKey;
    const authorityPubkey = (await Keypair.generate()).publicKey;

    const instruction = AddressLookupTableProgram.freezeLookupTable({
      lookupTable: lutAddress,
      authority: authorityPubkey,
    });
    const transaction = new Transaction().add(instruction);
    const freezeLutParams = {
      lookupTable: lutAddress,
      authority: authorityPubkey,
    };
    expect(transaction.instructions).to.have.length(1);
    expect(freezeLutParams).to.eql(
      AddressLookupTableInstruction.decodeFreezeLookupTable(instruction),
    );
  });

  it('deactivateLookupTable', async () => {
    const lutAddress = (await Keypair.generate()).publicKey;
    const authorityPubkey = (await Keypair.generate()).publicKey;

    const instruction = AddressLookupTableProgram.deactivateLookupTable({
      lookupTable: lutAddress,
      authority: authorityPubkey,
    });

    const transaction = new Transaction().add(instruction);
    const deactivateLutParams = {
      lookupTable: lutAddress,
      authority: authorityPubkey,
    };
    expect(transaction.instructions).to.have.length(1);
    expect(deactivateLutParams).to.eql(
      AddressLookupTableInstruction.decodeDeactivateLookupTable(instruction),
    );
  });

  if (process.env.TEST_LIVE) {
    it('live address lookup table actions', async () => {
      const connection = new Connection(url, 'confirmed');
      const authority = await Keypair.generate();
      const payer = await Keypair.generate();

      const [payerMinBalance, slot] = await Promise.all([
        connection.getMinimumBalanceForRentExemption(44 * 10),
        connection.getSlot('confirmed'),
      ]);

      const [createInstruction, lutAddress] =
        AddressLookupTableProgram.createLookupTable({
          authority: authority.publicKey,
          payer: payer.publicKey,
          recentSlot: slot,
        });

      await Promise.all([
        helpers.airdrop({
          connection,
          address: payer.publicKey,
          amount: payerMinBalance,
        }),
        helpers.airdrop({
          connection,
          address: authority.publicKey,
          amount: payerMinBalance,
        }),
      ]);

      // Creating a new lut
      const createLutTransaction = new Transaction();
      createLutTransaction.add(createInstruction);
      createLutTransaction.feePayer = payer.publicKey;

      await sendAndConfirmTransaction(
        connection,
        createLutTransaction,
        [authority, payer],
        {preflightCommitment: 'confirmed'},
      );

      await sleep(500);

      // Extending a lut without a payer
      await helpers.airdrop({
        connection,
        address: lutAddress,
        amount: payerMinBalance,
      });

      const extendWithoutPayerInstruction =
        AddressLookupTableProgram.extendLookupTable({
          lookupTable: lutAddress,
          authority: authority.publicKey,
          addresses: await Promise.all(
            [...Array(10)].map(
              async () => (await Keypair.generate()).publicKey,
            ),
          ),
        });
      const extendLutWithoutPayerTransaction = new Transaction();
      extendLutWithoutPayerTransaction.add(extendWithoutPayerInstruction);

      await sendAndConfirmTransaction(
        connection,
        extendLutWithoutPayerTransaction,
        [authority],
        {preflightCommitment: 'confirmed'},
      );

      // Extending an lut with a payer
      const extendWithPayerInstruction =
        AddressLookupTableProgram.extendLookupTable({
          lookupTable: lutAddress,
          authority: authority.publicKey,
          payer: payer.publicKey,
          addresses: await Promise.all(
            [...Array(10)].map(
              async () => (await Keypair.generate()).publicKey,
            ),
          ),
        });

      const extendLutWithPayerTransaction = new Transaction();
      extendLutWithPayerTransaction.add(extendWithPayerInstruction);

      await sendAndConfirmTransaction(
        connection,
        extendLutWithPayerTransaction,
        [authority, payer],
        {preflightCommitment: 'confirmed'},
      );

      //deactivating the lut
      const deactivateInstruction =
        AddressLookupTableProgram.deactivateLookupTable({
          lookupTable: lutAddress,
          authority: authority.publicKey,
        });

      const deactivateLutTransaction = new Transaction();
      deactivateLutTransaction.add(deactivateInstruction);
      await sendAndConfirmTransaction(
        connection,
        deactivateLutTransaction,
        [authority],
        {preflightCommitment: 'confirmed'},
      );

      // After deactivation, LUTs can be closed *only* after a short perioid of time
    }).timeout(10 * 1000);
  }
});
