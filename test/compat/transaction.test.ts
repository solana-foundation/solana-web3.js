import {expect} from 'chai';

import {
  SOLANA_ERROR__TRANSACTION__MESSAGE_SIGNATURES_MISMATCH,
  SolanaError,
} from '@solana/errors';
import {PublicKey, VersionedTransaction} from '../../src';

import {toKitTransaction} from '../../src/compat';

describe('toKitTransaction', () => {
  it('returns a transaction containing the serialized message bytes', () => {
    const messageBytes = new Uint8Array([1, 2, 3, 4]);
    const transaction = {
      message: {
        header: {
          numRequiredSignatures: 0,
        },
        serialize() {
          return messageBytes;
        },
        staticAccountKeys: [],
      },
      signatures: [],
    } as unknown as VersionedTransaction;

    const converted = toKitTransaction(transaction);
    expect(converted.messageBytes).to.deep.equal(messageBytes);
  });

  it('freezes the signature map', () => {
    const transaction = {
      message: {
        header: {
          numRequiredSignatures: 0,
        },
        serialize() {
          return new Uint8Array();
        },
        staticAccountKeys: [],
      },
      signatures: [],
    } as unknown as VersionedTransaction;

    const converted = toKitTransaction(transaction);
    expect(Object.isFrozen(converted.signatures)).to.be.true;
  });

  it('converts a transaction with a single signature', () => {
    const signature = new Uint8Array([1, 2, 3, 4]);
    const transaction = {
      message: {
        header: {
          numRequiredSignatures: 1,
        },
        serialize() {
          return new Uint8Array();
        },
        staticAccountKeys: [
          new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
        ],
      },
      signatures: [signature],
    } as unknown as VersionedTransaction;

    const converted = toKitTransaction(transaction);
    expect(converted.signatures).to.deep.equal({
      '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK': signature,
    });
  });

  it('converts an unsigned transaction with a single expected signer', () => {
    const nullSignature = new Uint8Array(64).fill(0);
    const transaction = {
      message: {
        header: {
          numRequiredSignatures: 1,
        },
        serialize() {
          return new Uint8Array();
        },
        staticAccountKeys: [
          new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
        ],
      },
      signatures: [nullSignature],
    } as unknown as VersionedTransaction;

    const converted = toKitTransaction(transaction);
    expect(converted.signatures).to.deep.equal({
      '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK': null,
    });
  });

  it('converts a transaction with multiple signatures', () => {
    const signature1 = new Uint8Array(64).fill(1);
    const signature2 = new Uint8Array(64).fill(2);
    const signature3 = new Uint8Array(64).fill(3);
    const transaction = {
      message: {
        header: {
          numRequiredSignatures: 3,
        },
        serialize() {
          return new Uint8Array();
        },
        staticAccountKeys: [
          new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          new PublicKey('9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw'),
          new PublicKey('F7Kzv7G6p1PvHXL1xXLPTm4myKWpLjnVphCV8ABZJfgT'),
        ],
      },
      signatures: [signature1, signature2, signature3],
    } as unknown as VersionedTransaction;

    const converted = toKitTransaction(transaction);
    expect(converted.signatures).to.deep.equal({
      '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK': signature1,
      '9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw': signature2,
      F7Kzv7G6p1PvHXL1xXLPTm4myKWpLjnVphCV8ABZJfgT: signature3,
    });
  });

  it('converts an unsigned transaction with multiple expected signers', () => {
    const nullSignature = new Uint8Array(64).fill(0);
    const transaction = {
      message: {
        header: {
          numRequiredSignatures: 3,
        },
        serialize() {
          return new Uint8Array();
        },
        staticAccountKeys: [
          new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          new PublicKey('9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw'),
          new PublicKey('F7Kzv7G6p1PvHXL1xXLPTm4myKWpLjnVphCV8ABZJfgT'),
        ],
      },
      signatures: [nullSignature, nullSignature, nullSignature],
    } as unknown as VersionedTransaction;

    const converted = toKitTransaction(transaction);
    expect(converted.signatures).to.deep.equal({
      '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK': null,
      '9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw': null,
      F7Kzv7G6p1PvHXL1xXLPTm4myKWpLjnVphCV8ABZJfgT: null,
    });
  });

  it('converts a partially signed transaction with multiple expected signers', () => {
    const nullSignature = new Uint8Array(64).fill(0);
    const signature1 = new Uint8Array(64).fill(1);
    const signature3 = new Uint8Array(64).fill(3);
    const transaction = {
      message: {
        header: {
          numRequiredSignatures: 3,
        },
        serialize() {
          return new Uint8Array();
        },
        staticAccountKeys: [
          new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          new PublicKey('9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw'),
          new PublicKey('F7Kzv7G6p1PvHXL1xXLPTm4myKWpLjnVphCV8ABZJfgT'),
        ],
      },
      signatures: [signature1, nullSignature, signature3],
    } as unknown as VersionedTransaction;

    const converted = toKitTransaction(transaction);
    expect(converted.signatures).to.deep.equal({
      '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK': signature1,
      '9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw': null,
      F7Kzv7G6p1PvHXL1xXLPTm4myKWpLjnVphCV8ABZJfgT: signature3,
    });
  });

  it('throws if the signatures are not the same length as the number of signers', () => {
    const messageBytes = new Uint8Array([1, 2, 3, 4]);
    const transaction = {
      message: {
        header: {
          numRequiredSignatures: 2,
        },
        serialize() {
          return messageBytes;
        },
        staticAccountKeys: [
          new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          new PublicKey('9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw'),
        ],
      },
      signatures: [new Uint8Array(64).fill(1)],
    } as unknown as VersionedTransaction;

    const expectedError = new SolanaError(
      SOLANA_ERROR__TRANSACTION__MESSAGE_SIGNATURES_MISMATCH,
      {
        numRequiredSignatures: 2,
        signaturesLength: 1,
        signerAddresses: [
          '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
          '9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw',
        ],
      },
    );

    expect(() => toKitTransaction(transaction)).to.throw(
      SolanaError,
      expectedError.message,
    );
  });
});
