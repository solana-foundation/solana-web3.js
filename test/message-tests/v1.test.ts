import {expect} from 'chai';

import {MessageV1} from '../../src/message';
import {PublicKey} from '../../src/publickey';

function createTestKeys(count: number): Array<PublicKey> {
  return new Array(count).fill(0).map(() => PublicKey.unique());
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
    expect(message.transactionConfig).to.be.null;
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
