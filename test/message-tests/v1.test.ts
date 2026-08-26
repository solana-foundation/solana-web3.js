import {expect} from 'chai';

import {MessageV1} from '../../src/message';
import {PublicKey} from '../../src/publickey';

function createTestKeys(count: number): Array<PublicKey> {
  return new Array(count).fill(0).map(() => PublicKey.unique());
}

const TEST_BLOCKHASH_BYTES = new Array(32).fill(10);
const TEST_BLOCKHASH = 'gBxS1f6uyyGPuW5MzGBukidSb71jdsCb5fZaoSzULE5';
const TEST_KEY_1_BYTES = new Array(32).fill(11);
const TEST_KEY_1 = new PublicKey('k7FaK87WHGVXzkaoHb7CdVPgkKDQhZ29VLDeBVbDfYn');
const TEST_KEY_2_BYTES = new Array(32).fill(12);
const TEST_KEY_2 = new PublicKey('p2Yicb86aZig616Eav2VWG9vuXR5mEqhtzshZYBxzsV');
const TEST_KEY_3_BYTES = new Array(32).fill(13);
const TEST_KEY_3 = new PublicKey('swqrv48gsrwpBFbftEwnP2vB4jckpvfGJfXkwaniLCC');

function serializeConfigTestMessage(
  configMask: number,
  configValueBytes: Array<number>,
): Uint8Array {
  return new Uint8Array([
    0x81,
    ...[1, 0, 0],
    ...[configMask, 0, 0, 0],
    ...TEST_BLOCKHASH_BYTES,
    0,
    1,
    ...TEST_KEY_1_BYTES,
    ...configValueBytes,
  ]);
}

describe('MessageV1', () => {
  it('version', () => {
    const message = new MessageV1({
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 0,
      },
      recentBlockhash: 'test',
      staticAccountKeys: createTestKeys(1),
      compiledInstructions: [],
    });
    expect(message.version).to.eq(1);
    expect(message.addressTableLookups).to.eql([]);
    expect(message.transactionConfig).to.eql({
      computeUnitLimit: null,
      heapSize: null,
      loadedAccountsDataSizeLimit: null,
      priorityFee: null,
    });
  });

  it('getAccountKeys', () => {
    const staticAccountKeys = createTestKeys(3);
    const message = new MessageV1({
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 1,
      },
      recentBlockhash: 'test',
      staticAccountKeys,
      compiledInstructions: [],
    });
    expect(message.getAccountKeys().staticAccountKeys).to.eql(
      staticAccountKeys,
    );
  });

  it('isAccountSigner', () => {
    const message = new MessageV1({
      header: {
        numRequiredSignatures: 2,
        numReadonlySignedAccounts: 1,
        numReadonlyUnsignedAccounts: 1,
      },
      recentBlockhash: 'test',
      staticAccountKeys: createTestKeys(4),
      compiledInstructions: [],
    });
    expect(message.isAccountSigner(0)).to.be.true;
    expect(message.isAccountSigner(1)).to.be.true;
    expect(message.isAccountSigner(2)).to.be.false;
    expect(message.isAccountSigner(3)).to.be.false;
  });

  it('isAccountWritable', () => {
    const message = new MessageV1({
      header: {
        numRequiredSignatures: 2,
        numReadonlySignedAccounts: 1,
        numReadonlyUnsignedAccounts: 1,
      },
      recentBlockhash: 'test',
      staticAccountKeys: createTestKeys(4),
      compiledInstructions: [],
    });
    expect(message.isAccountWritable(0)).to.be.true;
    expect(message.isAccountWritable(1)).to.be.false;
    expect(message.isAccountWritable(2)).to.be.true;
    expect(message.isAccountWritable(3)).to.be.false;
    expect(message.isAccountWritable(4)).to.be.false;
  });

  it('transactionConfig', () => {
    const message = new MessageV1({
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 0,
      },
      recentBlockhash: 'test',
      staticAccountKeys: createTestKeys(1),
      compiledInstructions: [],
      transactionConfig: {
        computeUnitLimit: 30000,
        heapSize: null,
        loadedAccountsDataSizeLimit: 200000,
        priorityFee: 5000,
      },
    });
    expect(message.transactionConfig).to.eql({
      computeUnitLimit: 30000,
      heapSize: null,
      loadedAccountsDataSizeLimit: 200000,
      priorityFee: 5000,
    });
  });

  it('deserialize (no config values)', () => {
    const serializedMessage = new Uint8Array([
      0x81,
      ...[2, 1, 1],
      ...[0, 0, 0, 0],
      ...TEST_BLOCKHASH_BYTES,
      1,
      2,
      ...TEST_KEY_1_BYTES,
      ...TEST_KEY_2_BYTES,
      ...[1, 1, 3, 0],
      ...[0, 1, 2, 3],
    ]);
    const message = MessageV1.deserialize(serializedMessage);
    expect(message.version).to.eq(1);
    expect(message.header).to.eql({
      numRequiredSignatures: 2,
      numReadonlySignedAccounts: 1,
      numReadonlyUnsignedAccounts: 1,
    });
    expect(message.recentBlockhash).to.eq(TEST_BLOCKHASH);
    expect(message.staticAccountKeys).to.eql([TEST_KEY_1, TEST_KEY_2]);
    expect(message.compiledInstructions).to.eql([
      {
        programIdIndex: 1,
        accountKeyIndexes: [0],
        data: new Uint8Array([1, 2, 3]),
      },
    ]);
    expect(message.transactionConfig).to.eql({
      computeUnitLimit: null,
      heapSize: null,
      loadedAccountsDataSizeLimit: null,
      priorityFee: null,
    });
  });

  it('deserialize (multiple instructions)', () => {
    const serializedMessage = new Uint8Array([
      0x81,
      ...[1, 0, 2],
      ...[0, 0, 0, 0],
      ...TEST_BLOCKHASH_BYTES,
      2,
      3,
      ...TEST_KEY_1_BYTES,
      ...TEST_KEY_2_BYTES,
      ...TEST_KEY_3_BYTES,
      ...[1, 2, 3, 0],
      ...[2, 1, 0, 0],
      ...[0, 2, 10, 20, 30],
      ...[0],
    ]);
    const message = MessageV1.deserialize(serializedMessage);
    expect(message.staticAccountKeys).to.eql([
      TEST_KEY_1,
      TEST_KEY_2,
      TEST_KEY_3,
    ]);
    expect(message.compiledInstructions).to.eql([
      {
        programIdIndex: 1,
        accountKeyIndexes: [0, 2],
        data: new Uint8Array([10, 20, 30]),
      },
      {
        programIdIndex: 2,
        accountKeyIndexes: [0],
        data: new Uint8Array([]),
      },
    ]);
  });

  it('deserialize transactionConfig (priority fee only)', () => {
    const message = MessageV1.deserialize(
      serializeConfigTestMessage(0b00011, [136, 19, 0, 0, 0, 0, 0, 0]),
    );
    expect(message.transactionConfig).to.eql({
      computeUnitLimit: null,
      heapSize: null,
      loadedAccountsDataSizeLimit: null,
      priorityFee: 5000,
    });
  });

  it('deserialize transactionConfig (large priority fee)', () => {
    const message = MessageV1.deserialize(
      serializeConfigTestMessage(
        0b00011,
        [255, 255, 255, 255, 255, 255, 31, 0],
      ),
    );
    expect(message.transactionConfig?.priorityFee).to.eq(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it('deserialize transactionConfig (priority fee above the safe integer range)', () => {
    expect(() =>
      MessageV1.deserialize(
        serializeConfigTestMessage(0b00011, [0, 0, 0, 0, 0, 0, 32, 0]),
      ),
    ).to.throw('Expected u64 value to be within the safe integer range');
  });

  it('deserialize transactionConfig (compute unit limit only)', () => {
    const message = MessageV1.deserialize(
      serializeConfigTestMessage(0b00100, [64, 13, 3, 0]),
    );
    expect(message.transactionConfig).to.eql({
      computeUnitLimit: 200000,
      heapSize: null,
      loadedAccountsDataSizeLimit: null,
      priorityFee: null,
    });
  });

  it('deserialize transactionConfig (loaded accounts data size limit only)', () => {
    const message = MessageV1.deserialize(
      serializeConfigTestMessage(0b01000, [0, 250, 0, 0]),
    );
    expect(message.transactionConfig).to.eql({
      computeUnitLimit: null,
      heapSize: null,
      loadedAccountsDataSizeLimit: 64000,
      priorityFee: null,
    });
  });

  it('deserialize transactionConfig (heap size only)', () => {
    const message = MessageV1.deserialize(
      serializeConfigTestMessage(0b10000, [0, 232, 3, 0]),
    );
    expect(message.transactionConfig).to.eql({
      computeUnitLimit: null,
      heapSize: 256000,
      loadedAccountsDataSizeLimit: null,
      priorityFee: null,
    });
  });

  it('deserialize transactionConfig (multiple values)', () => {
    const message = MessageV1.deserialize(
      serializeConfigTestMessage(
        0b01011,
        [136, 19, 0, 0, 0, 0, 0, 0, 0, 250, 0, 0],
      ),
    );
    expect(message.transactionConfig).to.eql({
      computeUnitLimit: null,
      heapSize: null,
      loadedAccountsDataSizeLimit: 64000,
      priorityFee: 5000,
    });
  });

  it('deserialize transactionConfig (all values)', () => {
    const message = MessageV1.deserialize(
      serializeConfigTestMessage(
        0b11111,
        [136, 19, 0, 0, 0, 0, 0, 0, 64, 13, 3, 0, 0, 250, 0, 0, 0, 232, 3, 0],
      ),
    );
    expect(message.transactionConfig).to.eql({
      computeUnitLimit: 200000,
      heapSize: 256000,
      loadedAccountsDataSizeLimit: 64000,
      priorityFee: 5000,
    });
  });

  it('deserialize failure (missing config value bytes)', () => {
    expect(() =>
      MessageV1.deserialize(serializeConfigTestMessage(0b00100, [64, 13])),
    ).to.throw('Reached end of buffer unexpectedly');
  });

  it('deserialize failure (trailing bytes)', () => {
    expect(() =>
      MessageV1.deserialize(serializeConfigTestMessage(0, [0])),
    ).to.throw(
      'Expected no bytes to remain after deserializing a version 1 message',
    );
  });

  it('deserialize failure (invalid priority fee bits)', () => {
    const serializedMessage = new Uint8Array([
      0x81,
      ...[1, 0, 0],
      ...[0b00001, 0, 0, 0],
      ...new Array(32).fill(0),
      0,
      0,
    ]);
    expect(() => MessageV1.deserialize(serializedMessage)).to.throw(
      'Expected both or neither of the priority fee bits to be set in the transaction config mask',
    );
  });

  it('deserialize failure (other invalid priority fee bit)', () => {
    const serializedMessage = new Uint8Array([
      0x81,
      ...[1, 0, 0],
      ...[0b00010, 0, 0, 0],
      ...new Array(32).fill(0),
      0,
      0,
    ]);
    expect(() => MessageV1.deserialize(serializedMessage)).to.throw(
      'Expected both or neither of the priority fee bits to be set in the transaction config mask',
    );
  });

  it('deserialize failure (unknown config mask bits)', () => {
    const serializedMessage = new Uint8Array([
      0x81,
      ...[1, 0, 0],
      ...[0b100000, 0, 0, 0],
      ...new Array(32).fill(0),
      0,
      0,
    ]);
    expect(() => MessageV1.deserialize(serializedMessage)).to.throw(
      'Unexpected bits set in the transaction config mask',
    );
  });

  it('serialize failure', () => {
    const message = new MessageV1({
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 0,
      },
      recentBlockhash: 'test',
      staticAccountKeys: createTestKeys(1),
      compiledInstructions: [],
    });
    expect(() => message.serialize()).to.throw(
      'Serialization of version 1 transaction messages is not supported',
    );
  });
});
