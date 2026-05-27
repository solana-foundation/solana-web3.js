import {
  AccountRole,
  blockhash,
  getMessagePackerInstructionPlanFromInstructions,
  sequentialInstructionPlan,
  type Instruction as KitInstruction,
} from '@solana/kit';
import {expect} from 'chai';

import {
  Transaction,
  TransactionInstruction,
  TransactionMessage,
} from '../../src/transaction';
import {Address} from '../../src/address';
import {AddressLookupTableAccount} from '../../src/programs';
import {Message, MessageV0} from '../../src/message';
import {getUniqueAddress} from '../utils/address';

// Base58-encoded SHA-256 digest of "test".
const TEST_RECENT_BLOCKHASH = blockhash(
  'Bjj4AWTNrjQVHqgWbP2XaxXz4DYH1WZMyERHxsad7b2w',
);

function createTestKeys(count: number): Array<Address> {
  return new Array(count).fill(0).map(() => getUniqueAddress());
}

function createTestLookupTable(
  addresses: Array<Address>,
): AddressLookupTableAccount {
  const U64_MAX = BigInt('0xffffffffffffffff');
  return new AddressLookupTableAccount({
    key: getUniqueAddress(),
    state: {
      lastExtendedSlot: 0n,
      lastExtendedSlotStartIndex: 0,
      deactivationSlot: U64_MAX,
      authority: getUniqueAddress(),
      addresses,
    },
  });
}

describe('TransactionMessage', () => {
  it('decompiles a legacy message', () => {
    const keys = createTestKeys(7);
    const recentBlockhash = TEST_RECENT_BLOCKHASH;
    const payerKey = keys[0];
    const instructions = [
      new TransactionInstruction({
        programId: keys[5],
        keys: [
          {pubkey: keys[0], isSigner: true, isWritable: true},
          {pubkey: keys[6], isSigner: false, isWritable: false},
          {pubkey: keys[1], isSigner: false, isWritable: true},
          {pubkey: keys[3], isSigner: false, isWritable: false},
          {pubkey: keys[4], isSigner: false, isWritable: false},
          {pubkey: keys[2], isSigner: false, isWritable: false},
        ],
        data: new Uint8Array(1),
      }),
    ];

    const message = Message.compile({
      instructions,
      payerKey,
      recentBlockhash,
    });

    expect(() => TransactionMessage.decompile(message)).not.to.throw(
      'Failed to get account keys because address table lookups were not resolved',
    );

    const decompiledMessage = TransactionMessage.decompile(message);
    const firstInstruction = decompiledMessage.instructions[0];
    if (!firstInstruction) {
      throw new Error('Expected one decompiled instruction');
    }

    expect(decompiledMessage.payerKey).to.eql(payerKey);
    expect(decompiledMessage.recentBlockhash).to.eq(recentBlockhash);
    expect(firstInstruction.data.constructor).to.equal(Uint8Array);
    expect(decompiledMessage.instructions).to.eql(instructions);
  });

  // Regression test for https://github.com/solana-labs/solana/issues/28900
  it('decompiles a legacy message the same way as the old API', () => {
    const accountKeys = createTestKeys(7);
    const legacyMessage = new Message({
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 5,
      },
      recentBlockhash: TEST_RECENT_BLOCKHASH,
      accountKeys,
      instructions: [
        {
          accounts: [0, 6, 1, 3, 4, 2],
          data: '',
          programIdIndex: 5,
        },
      ],
    });

    const transactionFromLegacyAPI = Transaction.populate(legacyMessage);
    const transactionMessage = TransactionMessage.decompile(legacyMessage);

    expect(transactionMessage.payerKey).to.eql(
      transactionFromLegacyAPI.feePayer,
    );
    expect(transactionMessage.instructions).to.eql(
      transactionFromLegacyAPI.instructions,
    );
    expect(transactionMessage.recentBlockhash).to.eql(
      transactionFromLegacyAPI.recentBlockhash,
    );
  });

  it('decompiles a V0 message', () => {
    const keys = createTestKeys(7);
    const recentBlockhash = TEST_RECENT_BLOCKHASH;
    const payerKey = keys[0];
    const instructions = [
      new TransactionInstruction({
        programId: keys[4],
        keys: [
          {pubkey: keys[1], isSigner: true, isWritable: true},
          {pubkey: keys[2], isSigner: true, isWritable: false},
          {pubkey: keys[3], isSigner: false, isWritable: true},
          {pubkey: keys[5], isSigner: false, isWritable: true},
          {pubkey: keys[6], isSigner: false, isWritable: false},
        ],
        data: new Uint8Array(1),
      }),
      new TransactionInstruction({
        programId: keys[1],
        keys: [],
        data: new Uint8Array(2),
      }),
      new TransactionInstruction({
        programId: keys[3],
        keys: [],
        data: new Uint8Array(3),
      }),
    ];

    const addressLookupTableAccounts = [createTestLookupTable(keys)];
    const message = MessageV0.compile({
      payerKey,
      recentBlockhash,
      instructions,
      addressLookupTableAccounts,
    });

    expect(() => TransactionMessage.decompile(message)).to.throw(
      'Failed to get account keys because address table lookups were not resolved',
    );

    const accountKeys = message.getAccountKeys({addressLookupTableAccounts});
    const decompiledMessage = TransactionMessage.decompile(message, {
      addressLookupTableAccounts,
    });
    const firstInstruction = decompiledMessage.instructions[0];
    if (!firstInstruction) {
      throw new Error('Expected one decompiled instruction');
    }

    expect(decompiledMessage.payerKey).to.eql(payerKey);
    expect(decompiledMessage.recentBlockhash).to.eq(recentBlockhash);
    expect(firstInstruction.data.constructor).to.equal(Uint8Array);
    expect(decompiledMessage.instructions).to.eql(instructions);

    expect(decompiledMessage).to.eql(
      TransactionMessage.decompile(message, {
        accountKeysFromLookups: accountKeys.accountKeysFromLookups!,
      }),
    );
  });

  it('compiles legacy and v0 messages from mixed legacy and Kit instructions', () => {
    const keys = createTestKeys(7);
    const payerKey = keys[0];
    const recentBlockhash = TEST_RECENT_BLOCKHASH;
    const addressLookupTableAccounts = [createTestLookupTable(keys)];
    const legacyInstruction = new TransactionInstruction({
      programId: keys[4],
      keys: [{pubkey: keys[1], isSigner: true, isWritable: true}],
      data: new Uint8Array([1]),
    });
    const kitInstruction = {
      programAddress: keys[3].toBase58(),
      accounts: [
        {address: keys[5].toBase58(), role: AccountRole.WRITABLE},
        {address: keys[6].toBase58(), role: AccountRole.READONLY},
      ],
      data: new Uint8Array([2, 3]),
    } satisfies KitInstruction;
    const equivalentLegacyInstruction = new TransactionInstruction({
      programId: keys[3],
      keys: [
        {pubkey: keys[5], isSigner: false, isWritable: true},
        {pubkey: keys[6], isSigner: false, isWritable: false},
      ],
      data: new Uint8Array([2, 3]),
    });

    const transactionMessage = new TransactionMessage({
      payerKey,
      recentBlockhash,
      instructions: [legacyInstruction, kitInstruction],
    });
    const equivalentInstructions = [
      legacyInstruction,
      equivalentLegacyInstruction,
    ];

    expect(
      transactionMessage.compileToLegacyMessage().serialize(),
    ).to.deep.equal(
      Message.compile({
        payerKey,
        recentBlockhash,
        instructions: equivalentInstructions,
      }).serialize(),
    );

    expect(
      transactionMessage
        .compileToV0Message(addressLookupTableAccounts)
        .serialize(),
    ).to.deep.equal(
      MessageV0.compile({
        payerKey,
        recentBlockhash,
        instructions: equivalentInstructions,
        addressLookupTableAccounts,
      }).serialize(),
    );
  });

  it('accepts an InstructionPlan in the constructor', () => {
    const keys = createTestKeys(5);
    const payerKey = keys[0];
    const kitIx = (data: number): KitInstruction => ({
      accounts: [
        {address: keys[1].toBase58(), role: AccountRole.WRITABLE_SIGNER},
      ],
      data: new Uint8Array([data]),
      programAddress: keys[4].toBase58(),
    });

    const fromPlan = new TransactionMessage({
      instructions: [sequentialInstructionPlan([kitIx(1), kitIx(2)])],
      payerKey,
      recentBlockhash: TEST_RECENT_BLOCKHASH,
    });
    const fromFlat = new TransactionMessage({
      instructions: [kitIx(1), kitIx(2)],
      payerKey,
      recentBlockhash: TEST_RECENT_BLOCKHASH,
    });

    expect(fromPlan.compileToLegacyMessage().serialize()).to.deep.equal(
      fromFlat.compileToLegacyMessage().serialize(),
    );
  });

  it('throws when constructed with a MessagePackerInstructionPlan input', () => {
    const keys = createTestKeys(5);
    const payerKey = keys[0];
    const packer = getMessagePackerInstructionPlanFromInstructions([
      {
        accounts: [],
        data: new Uint8Array([0]),
        programAddress: keys[4].toBase58(),
      },
    ]);

    expect(
      () =>
        new TransactionMessage({
          instructions: [packer],
          payerKey,
          recentBlockhash: TEST_RECENT_BLOCKHASH,
        }),
    ).to.throw(/Unsupported InstructionPlan leaf kind/);
  });
});
