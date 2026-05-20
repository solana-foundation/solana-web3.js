import {
  AccountRole,
  blockhash,
  type Instruction as KitInstruction,
} from '@solana/kit';
import {expect} from 'chai';

import {
  MessageAccountKeys,
  MessageAddressTableLookup,
  MessageV0,
} from '../../src/message';
import {TransactionInstruction} from '../../src/transaction';
import {Address} from '../../src/address';
import {AddressLookupTableAccount} from '../../src/programs';
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

describe('MessageV0', () => {
  it('numAccountKeysFromLookups', () => {
    const message = MessageV0.compile({
      payerKey: getUniqueAddress(),
      recentBlockhash: TEST_RECENT_BLOCKHASH,
      instructions: [],
    });
    expect(message.numAccountKeysFromLookups).to.eq(0);

    message.addressTableLookups = [
      {
        accountKey: getUniqueAddress(),
        writableIndexes: [0],
        readonlyIndexes: [1],
      },
      {
        accountKey: getUniqueAddress(),
        writableIndexes: [0, 2],
        readonlyIndexes: [],
      },
    ];
    expect(message.numAccountKeysFromLookups).to.eq(4);
  });

  it('getAccountKeys', () => {
    const staticAccountKeys = createTestKeys(3);
    const lookupTable = createTestLookupTable(createTestKeys(2));
    const message = new MessageV0({
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 0,
      },
      recentBlockhash: TEST_RECENT_BLOCKHASH,
      staticAccountKeys,
      compiledInstructions: [],
      addressTableLookups: [
        {
          accountKey: lookupTable.key,
          writableIndexes: [0],
          readonlyIndexes: [1],
        },
      ],
    });

    expect(() => message.getAccountKeys()).to.throw(
      'Failed to get account keys because address table lookups were not resolved',
    );
    expect(() =>
      message.getAccountKeys({
        accountKeysFromLookups: {
          writable: [getUniqueAddress()],
          readonly: [],
        },
      }),
    ).to.throw(
      'Failed to get account keys because of a mismatch in the number of account keys from lookups',
    );

    const accountKeysFromLookups = message.resolveAddressTableLookups([
      lookupTable,
    ]);
    const expectedAccountKeys = new MessageAccountKeys(
      staticAccountKeys,
      accountKeysFromLookups,
    );

    expect(
      message.getAccountKeys({
        accountKeysFromLookups,
      }),
    ).to.eql(expectedAccountKeys);

    expect(
      message.getAccountKeys({
        addressLookupTableAccounts: [lookupTable],
      }),
    ).to.eql(expectedAccountKeys);
  });

  it('resolveAddressTableLookups', () => {
    const keys = createTestKeys(7);
    const lookupTable = createTestLookupTable(keys);
    const createTestMessage = (
      addressTableLookups: MessageAddressTableLookup[],
    ): MessageV0 => {
      return new MessageV0({
        header: {
          numRequiredSignatures: 1,
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 0,
        },
        recentBlockhash: TEST_RECENT_BLOCKHASH,
        staticAccountKeys: [],
        compiledInstructions: [],
        addressTableLookups,
      });
    };

    expect(
      createTestMessage([]).resolveAddressTableLookups([lookupTable]),
    ).to.eql({
      writable: [],
      readonly: [],
    });

    expect(() =>
      createTestMessage([
        {
          accountKey: getUniqueAddress(),
          writableIndexes: [1, 3, 5],
          readonlyIndexes: [0, 2, 4],
        },
      ]).resolveAddressTableLookups([lookupTable]),
    ).to.throw('Failed to find address lookup table account for table key');

    expect(() =>
      createTestMessage([
        {
          accountKey: lookupTable.key,
          writableIndexes: [10],
          readonlyIndexes: [],
        },
      ]).resolveAddressTableLookups([lookupTable]),
    ).to.throw('Failed to find address for index');

    expect(
      createTestMessage([
        {
          accountKey: lookupTable.key,
          writableIndexes: [1, 3, 5],
          readonlyIndexes: [0, 2, 4],
        },
      ]).resolveAddressTableLookups([lookupTable]),
    ).to.eql({
      writable: [keys[1], keys[3], keys[5]],
      readonly: [keys[0], keys[2], keys[4]],
    });
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

    const lookupTable = createTestLookupTable(keys);
    const message = MessageV0.compile({
      payerKey,
      recentBlockhash,
      instructions,
      addressLookupTableAccounts: [lookupTable],
    });

    expect(message.staticAccountKeys).to.eql([
      payerKey, // payer is first
      keys[1], // other writable signer
      keys[2], // sole readonly signer
      keys[3], // sole writable non-signer
      keys[4], // sole readonly non-signer
    ]);
    expect(message.header).to.eql({
      numRequiredSignatures: 3,
      numReadonlySignedAccounts: 1,
      numReadonlyUnsignedAccounts: 1,
    });
    // only keys 5 and 6 are eligible to be referenced by a lookup table
    // because they are not invoked and are not signers
    expect(message.addressTableLookups).to.eql([
      {
        accountKey: lookupTable.key,
        writableIndexes: [5],
        readonlyIndexes: [6],
      },
    ]);
    expect(message.compiledInstructions).to.eql([
      {
        programIdIndex: 4,
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
        accountKeyIndexes: [5, 6],
        data: new Uint8Array(3),
      },
    ]);
    expect(message.recentBlockhash).to.eq(recentBlockhash);
  });

  it('compiles with Kit instructions', () => {
    const keys = createTestKeys(7);
    const payerKey = keys[0];
    const recentBlockhash = TEST_RECENT_BLOCKHASH;
    const lookupTable = createTestLookupTable(keys);
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

    const messageFromKitInstruction = MessageV0.compile({
      payerKey,
      recentBlockhash,
      instructions: [kitInstruction],
      addressLookupTableAccounts: [lookupTable],
    });
    const messageFromLegacyInstruction = MessageV0.compile({
      payerKey,
      recentBlockhash,
      instructions: [legacyInstruction],
      addressLookupTableAccounts: [lookupTable],
    });

    expect(messageFromKitInstruction.serialize()).to.deep.equal(
      messageFromLegacyInstruction.serialize(),
    );
  });

  it('serialize and deserialize', () => {
    const messageV0 = new MessageV0({
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 1,
      },
      staticAccountKeys: [new Address(1), new Address(2)],
      compiledInstructions: [
        {
          programIdIndex: 1,
          accountKeyIndexes: [2, 3],
          data: new Uint8Array(10),
        },
      ],
      recentBlockhash: blockhash(new Address(0).toString()),
      addressTableLookups: [
        {
          accountKey: new Address(3),
          writableIndexes: [1],
          readonlyIndexes: [],
        },
        {
          accountKey: new Address(4),
          writableIndexes: [],
          readonlyIndexes: [2],
        },
      ],
    });
    const serializedMessage = messageV0.serialize();
    const deserializedMessage = MessageV0.deserialize(serializedMessage);
    expect(JSON.stringify(messageV0)).to.eql(
      JSON.stringify(deserializedMessage),
    );
  });

  it('deserialize failures', () => {
    const bufferWithLegacyPrefix = new Uint8Array([1]);
    expect(() => {
      MessageV0.deserialize(bufferWithLegacyPrefix);
    }).to.throw('Expected versioned message but received legacy message');

    const bufferWithV1Prefix = new Uint8Array([(1 << 7) + 1]);
    expect(() => {
      MessageV0.deserialize(bufferWithV1Prefix);
    }).to.throw(
      'Expected versioned message with version 0 but found version 1',
    );
  });

  it('isAccountWritable', () => {
    const staticAccountKeys = [
      getUniqueAddress(),
      getUniqueAddress(),
      getUniqueAddress(),
      getUniqueAddress(),
    ];

    const recentBlockhash = TEST_RECENT_BLOCKHASH;
    const message = new MessageV0({
      header: {
        numRequiredSignatures: 2,
        numReadonlySignedAccounts: 1,
        numReadonlyUnsignedAccounts: 1,
      },
      recentBlockhash,
      staticAccountKeys,
      compiledInstructions: [],
      addressTableLookups: [
        {
          accountKey: getUniqueAddress(),
          writableIndexes: [0],
          readonlyIndexes: [1],
        },
        {
          accountKey: getUniqueAddress(),
          writableIndexes: [0],
          readonlyIndexes: [1],
        },
      ],
    });

    expect(message.isAccountWritable(0)).to.be.true;
    expect(message.isAccountWritable(1)).to.be.false;
    expect(message.isAccountWritable(2)).to.be.true;
    expect(message.isAccountWritable(3)).to.be.false;

    expect(message.isAccountWritable(4)).to.be.true;
    expect(message.isAccountWritable(5)).to.be.true;

    expect(message.isAccountWritable(6)).to.be.false;
    expect(message.isAccountWritable(7)).to.be.false;
  });

  it('isAccountSigner', () => {
    const staticAccountKeys = [
      getUniqueAddress(),
      getUniqueAddress(),
      getUniqueAddress(),
      getUniqueAddress(),
    ];

    const recentBlockhash = TEST_RECENT_BLOCKHASH;
    const message = new MessageV0({
      header: {
        numRequiredSignatures: 2,
        numReadonlySignedAccounts: 1,
        numReadonlyUnsignedAccounts: 1,
      },
      recentBlockhash,
      staticAccountKeys,
      compiledInstructions: [],
      addressTableLookups: [
        {
          accountKey: getUniqueAddress(),
          writableIndexes: [0],
          readonlyIndexes: [1],
        },
        {
          accountKey: getUniqueAddress(),
          writableIndexes: [0],
          readonlyIndexes: [1],
        },
      ],
    });

    expect(message.isAccountSigner(0)).to.be.true;
    expect(message.isAccountSigner(1)).to.be.true;
    for (let i = 2; i < 8; i++) {
      expect(message.isAccountSigner(i)).to.be.false;
    }
  });
});
