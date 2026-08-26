import {
  AccountRole,
  blockhash,
  getCompiledTransactionMessageDecoder,
  sequentialInstructionPlan,
  type Instruction as KitInstruction,
} from '@solana/kit';
import {expect} from 'chai';

import {
  Message,
  MessageAccountKeys,
  MessageV0,
  MessageV1,
} from '../../src/message';
import {TransactionInstruction} from '../../src/transaction';
import {Address} from '../../src/address';
import {getUniqueAddress} from '../utils/address';

// Base58-encoded SHA-256 digest of "test".
const TEST_RECENT_BLOCKHASH = blockhash(
  'Bjj4AWTNrjQVHqgWbP2XaxXz4DYH1WZMyERHxsad7b2w',
);

function createTestKeys(count: number): Array<Address> {
  return new Array(count).fill(0).map(() => getUniqueAddress());
}

describe('MessageV1', () => {
  it('getAccountKeys', () => {
    const staticAccountKeys = createTestKeys(3);
    const message = new MessageV1({
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 0,
      },
      recentBlockhash: TEST_RECENT_BLOCKHASH,
      staticAccountKeys,
      compiledInstructions: [],
    });

    expect(message.getAccountKeys()).to.eql(
      new MessageAccountKeys(staticAccountKeys),
    );
  });

  it('compile', () => {
    const keys = createTestKeys(7);
    const recentBlockhash = TEST_RECENT_BLOCKHASH;
    const payerKey = keys[0];
    const instructions = [
      new TransactionInstruction({
        programId: keys[4],
        keys: [
          {pubkey: keys[1], isSigner: true, isWritable: true},
          {pubkey: keys[2], isSigner: false, isWritable: false},
          {pubkey: keys[3], isSigner: false, isWritable: false},
        ],
        data: new Uint8Array(1),
      }),
      new TransactionInstruction({
        programId: keys[1],
        keys: [
          {pubkey: keys[2], isSigner: true, isWritable: false},
          {pubkey: keys[3], isSigner: false, isWritable: true},
        ],
        data: new Uint8Array(2),
      }),
      new TransactionInstruction({
        programId: keys[3],
        keys: [
          {pubkey: keys[5], isSigner: false, isWritable: true},
          {pubkey: keys[6], isSigner: false, isWritable: false},
        ],
        data: new Uint8Array(3),
      }),
    ];

    const message = MessageV1.compile({
      payerKey,
      recentBlockhash,
      instructions,
      transactionConfig: {computeUnitLimit: 400_000},
    });

    expect(message.staticAccountKeys).to.eql([
      payerKey, // payer is first
      keys[1], // other writable signer
      keys[2], // sole readonly signer
      keys[3], // sole writable non-signer
      keys[5], // other writable non-signer
      keys[4], // readonly non-signer
      keys[6], // readonly non-signer
    ]);
    expect(message.header).to.eql({
      numRequiredSignatures: 3,
      numReadonlySignedAccounts: 1,
      numReadonlyUnsignedAccounts: 2,
    });
    expect(message.compiledInstructions).to.eql([
      {
        programIdIndex: 5,
        accountKeyIndexes: [1, 2, 3],
        data: new Uint8Array(1),
      },
      {
        programIdIndex: 1,
        accountKeyIndexes: [2, 3],
        data: new Uint8Array(2),
      },
      {
        programIdIndex: 3,
        accountKeyIndexes: [4, 6],
        data: new Uint8Array(3),
      },
    ]);
    expect(message.recentBlockhash).to.eq(recentBlockhash);
    expect(message.transactionConfig).to.eql({computeUnitLimit: 400_000});
  });

  it('compiles with Kit instructions', () => {
    const keys = createTestKeys(7);
    const payerKey = keys[0];
    const recentBlockhash = TEST_RECENT_BLOCKHASH;
    const kitInstruction = {
      programAddress: keys[3].toBase58(),
      accounts: [
        {
          address: keys[1].toBase58(),
          role: AccountRole.WRITABLE_SIGNER,
        },
        {address: keys[5].toBase58(), role: AccountRole.WRITABLE},
        {address: keys[6].toBase58(), role: AccountRole.READONLY},
      ],
      data: new Uint8Array(3),
    } satisfies KitInstruction;
    const legacyInstruction = new TransactionInstruction({
      programId: keys[3],
      keys: [
        {pubkey: keys[1], isSigner: true, isWritable: true},
        {pubkey: keys[5], isSigner: false, isWritable: true},
        {pubkey: keys[6], isSigner: false, isWritable: false},
      ],
      data: new Uint8Array(3),
    });

    const messageFromKitInstruction = MessageV1.compile({
      payerKey,
      recentBlockhash,
      instructions: [kitInstruction],
    });
    const messageFromLegacyInstruction = MessageV1.compile({
      payerKey,
      recentBlockhash,
      instructions: [legacyInstruction],
    });

    expect(messageFromKitInstruction.serialize()).to.deep.equal(
      messageFromLegacyInstruction.serialize(),
    );
  });

  it('compiles with an InstructionPlan input', () => {
    const keys = createTestKeys(7);
    const payerKey = keys[0];
    const kitIx = (data: number): KitInstruction => ({
      accounts: [
        {address: keys[1].toBase58(), role: AccountRole.WRITABLE_SIGNER},
        {address: keys[5].toBase58(), role: AccountRole.WRITABLE},
      ],
      data: new Uint8Array([data]),
      programAddress: keys[3].toBase58(),
    });

    const fromPlan = MessageV1.compile({
      instructions: [sequentialInstructionPlan([kitIx(1), kitIx(2)])],
      payerKey,
      recentBlockhash: TEST_RECENT_BLOCKHASH,
    });
    const fromFlat = MessageV1.compile({
      instructions: [kitIx(1), kitIx(2)],
      payerKey,
      recentBlockhash: TEST_RECENT_BLOCKHASH,
    });

    expect(fromPlan.serialize()).to.deep.equal(fromFlat.serialize());
  });

  it('serializes with the version 1 prefix byte', () => {
    const message = MessageV1.compile({
      payerKey: getUniqueAddress(),
      recentBlockhash: TEST_RECENT_BLOCKHASH,
      instructions: [],
    });
    const serialized = message.serialize();
    expect(serialized[0]).to.eq(0x81);
  });

  it('serialize and deserialize', () => {
    const messageV1 = new MessageV1({
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 1,
      },
      staticAccountKeys: [
        new Address(1),
        new Address(2),
        new Address(3),
        new Address(4),
      ],
      compiledInstructions: [
        {
          programIdIndex: 1,
          accountKeyIndexes: [2, 3],
          data: new Uint8Array(10),
        },
      ],
      recentBlockhash: blockhash(new Address(0).toString()),
      transactionConfig: {
        computeUnitLimit: 300_000,
        heapSize: 65_536,
        loadedAccountsDataSizeLimit: 1_000_000,
        priorityFeeLamports: 5_000n,
      },
    });
    const serializedMessage = messageV1.serialize();
    const deserializedMessage = MessageV1.deserialize(serializedMessage);
    expect(deserializedMessage.header).to.eql(messageV1.header);
    expect(deserializedMessage.staticAccountKeys).to.eql(
      messageV1.staticAccountKeys,
    );
    expect(deserializedMessage.recentBlockhash).to.eq(
      messageV1.recentBlockhash,
    );
    expect(deserializedMessage.compiledInstructions).to.eql(
      messageV1.compiledInstructions,
    );
    expect(deserializedMessage.transactionConfig).to.eql({
      computeUnitLimit: 300_000,
      heapSize: 65_536,
      loadedAccountsDataSizeLimit: 1_000_000,
      priorityFeeLamports: 5_000n,
    });
  });

  it('round trips an empty transaction config as undefined', () => {
    const message = MessageV1.compile({
      payerKey: getUniqueAddress(),
      recentBlockhash: TEST_RECENT_BLOCKHASH,
      instructions: [],
    });
    expect(message.transactionConfig).to.be.undefined;
    const deserialized = MessageV1.deserialize(message.serialize());
    expect(deserialized.transactionConfig).to.be.undefined;
  });

  it('serialized bytes decode with the kit message decoder', () => {
    const message = MessageV1.compile({
      payerKey: getUniqueAddress(),
      recentBlockhash: TEST_RECENT_BLOCKHASH,
      instructions: [],
      transactionConfig: {
        computeUnitLimit: 200_000,
        priorityFeeLamports: 1_234n,
      },
    });
    const decoded = getCompiledTransactionMessageDecoder().decode(
      message.serialize(),
    );
    expect(decoded.version).to.eq(1);
    if (decoded.version !== 1) {
      throw new Error('unreachable');
    }
    expect(decoded.configMask).to.eq(0b111);
    expect(decoded.configValues).to.eql([
      {kind: 'u64', value: 1_234n},
      {kind: 'u32', value: 200_000},
    ]);
  });

  it('deserialize failures', () => {
    const compileArgs = {
      instructions: [],
      payerKey: getUniqueAddress(),
      recentBlockhash: TEST_RECENT_BLOCKHASH,
    };

    expect(() => {
      MessageV1.deserialize(Message.compile(compileArgs).serialize());
    }).to.throw('Expected versioned message but received legacy message');

    expect(() => {
      MessageV1.deserialize(MessageV0.compile(compileArgs).serialize());
    }).to.throw(
      'Expected versioned message with version 1 but found version 0',
    );
  });

  it('isAccountWritable', () => {
    const staticAccountKeys = [
      getUniqueAddress(),
      getUniqueAddress(),
      getUniqueAddress(),
      getUniqueAddress(),
    ];

    const message = new MessageV1({
      header: {
        numRequiredSignatures: 2,
        numReadonlySignedAccounts: 1,
        numReadonlyUnsignedAccounts: 1,
      },
      recentBlockhash: TEST_RECENT_BLOCKHASH,
      staticAccountKeys,
      compiledInstructions: [],
    });

    expect(message.isAccountWritable(0)).to.be.true;
    expect(message.isAccountWritable(1)).to.be.false;
    expect(message.isAccountWritable(2)).to.be.true;
    expect(message.isAccountWritable(3)).to.be.false;
    expect(message.isAccountWritable(4)).to.be.false;
  });

  it('isAccountSigner', () => {
    const staticAccountKeys = [
      getUniqueAddress(),
      getUniqueAddress(),
      getUniqueAddress(),
      getUniqueAddress(),
    ];

    const message = new MessageV1({
      header: {
        numRequiredSignatures: 2,
        numReadonlySignedAccounts: 1,
        numReadonlyUnsignedAccounts: 1,
      },
      recentBlockhash: TEST_RECENT_BLOCKHASH,
      staticAccountKeys,
      compiledInstructions: [],
    });

    expect(message.isAccountSigner(0)).to.be.true;
    expect(message.isAccountSigner(1)).to.be.true;
    for (let i = 2; i < 4; i++) {
      expect(message.isAccountSigner(i)).to.be.false;
    }
  });
});
