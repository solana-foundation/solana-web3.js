import {expect} from 'chai';

import {address} from '@solana/addresses';
import {AccountRole} from '@solana/instructions';
import {PublicKey, TransactionInstruction} from '../../src';
import {decodeData, encodeData} from '../../src/instruction';
import {SYSTEM_INSTRUCTION_LAYOUTS} from '../../src/programs/system';

import {toKitAddress} from '../../src/compat';
import {toKitInstruction} from '../../src/compat';

function toLegacyByteArrayAppropriateForPlatform(data: Uint8Array) {
  return typeof Buffer !== 'undefined'
    ? Buffer.from(data)
    : (new Uint8Array(data) as Buffer);
}

describe('toKitInstruction', () => {
  it('decodeData accepts Uint8Array inputs', () => {
    const encoded = encodeData(SYSTEM_INSTRUCTION_LAYOUTS.Transfer, {
      lamports: 1n,
    });

    expect(
      decodeData(
        SYSTEM_INSTRUCTION_LAYOUTS.Transfer,
        Uint8Array.from(encoded),
      ),
    ).to.deep.equal(decodeData(SYSTEM_INSTRUCTION_LAYOUTS.Transfer, encoded));
  });

  it('converts a basic TransactionInstruction', () => {
    const programId = new Uint8Array([1, 2, 3, 4]);
    const keys = [
      {
        isSigner: false,
        isWritable: true,
        pubkey: new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
      },
    ];
    const data = new Uint8Array([10, 20, 30]);

    const instruction = new TransactionInstruction({
      data: toLegacyByteArrayAppropriateForPlatform(data),
      keys,
      programId: new PublicKey(programId),
    });

    const converted = toKitInstruction(instruction);

    expect(converted).to.deep.equal({
      accounts: [
        {
          address: address('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          role: AccountRole.WRITABLE,
        },
      ],
      data,
      programAddress: toKitAddress(new PublicKey(programId)),
    });
  });

  it('freezes the accounts array', () => {
    const programId = new Uint8Array([1, 2, 3, 4]);
    const keys = [
      {
        isSigner: false,
        isWritable: true,
        pubkey: new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
      },
    ];
    const data = new Uint8Array([10, 20, 30]);

    const instruction = new TransactionInstruction({
      data: toLegacyByteArrayAppropriateForPlatform(data),
      keys,
      programId: new PublicKey(programId),
    });

    const converted = toKitInstruction(instruction);

    expect(Object.isFrozen(converted.accounts)).to.be.true;
  });

  it('freezes each account', () => {
    const programId = new Uint8Array([1, 2, 3, 4]);
    const keys = [
      {
        isSigner: false,
        isWritable: true,
        pubkey: new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
      },
    ];
    const data = new Uint8Array([10, 20, 30]);

    const instruction = new TransactionInstruction({
      data: toLegacyByteArrayAppropriateForPlatform(data),
      keys,
      programId: new PublicKey(programId),
    });

    const converted = toKitInstruction(instruction);

    expect(Object.isFrozen(converted.accounts?.[0])).to.be.true;
  });

  it('freezes the instruction', () => {
    const programId = new Uint8Array([1, 2, 3, 4]);
    const keys = [
      {
        isSigner: false,
        isWritable: true,
        pubkey: new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
      },
    ];
    const data = new Uint8Array([10, 20, 30]);

    const instruction = new TransactionInstruction({
      data: toLegacyByteArrayAppropriateForPlatform(data),
      keys,
      programId: new PublicKey(programId),
    });

    const converted = toKitInstruction(instruction);

    expect(Object.isFrozen(converted)).to.be.true;
  });

  it('applies no accounts given an instruction with no keys', () => {
    const programId = new Uint8Array([5, 6, 7, 8]);
    const data = new Uint8Array([40, 50, 60]);

    const instruction = new TransactionInstruction({
      data: toLegacyByteArrayAppropriateForPlatform(data),
      keys: [],
      programId: new PublicKey(programId),
    });

    const converted = toKitInstruction(instruction);

    expect(converted).to.deep.equal({
      data,
      programAddress: toKitAddress(new PublicKey(programId)),
    });
  });

  it('handles an instruction with multiple keys', () => {
    const programId = new Uint8Array([9, 10, 11, 12]);
    const keys = [
      {
        isSigner: true,
        isWritable: true,
        pubkey: new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
      },
      {
        isSigner: false,
        isWritable: false,
        pubkey: new PublicKey('9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw'),
      },
    ];
    const data = new Uint8Array([70, 80, 90]);

    const instruction = new TransactionInstruction({
      data: toLegacyByteArrayAppropriateForPlatform(data),
      keys,
      programId: new PublicKey(programId),
    });

    const converted = toKitInstruction(instruction);

    expect(converted).to.deep.equal({
      accounts: [
        {
          address: address('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          role: AccountRole.WRITABLE_SIGNER,
        },
        {
          address: address('9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw'),
          role: AccountRole.READONLY,
        },
      ],
      data,
      programAddress: toKitAddress(new PublicKey(programId)),
    });
  });

  it('applies no data field if the data is zero-length', () => {
    const programId = new Uint8Array([13, 14, 15, 16]);
    const keys = [
      {
        isSigner: true,
        isWritable: false,
        pubkey: new PublicKey('F7Kzv7G6p1PvHXL1xXLPTm4myKWpLjnVphCV8ABZJfgT'),
      },
    ];

    const instruction = new TransactionInstruction({
      data: toLegacyByteArrayAppropriateForPlatform(new Uint8Array()),
      keys,
      programId: new PublicKey(programId),
    });

    const converted = toKitInstruction(instruction);

    expect(converted).to.deep.equal({
      accounts: [
        {
          address: address('F7Kzv7G6p1PvHXL1xXLPTm4myKWpLjnVphCV8ABZJfgT'),
          role: AccountRole.READONLY_SIGNER,
        },
      ],
      programAddress: toKitAddress(new PublicKey(programId)),
    });
  });

  it('applies no data field if the data is missing', () => {
    const programId = new Uint8Array([13, 14, 15, 16]);
    const keys = [
      {
        isSigner: true,
        isWritable: false,
        pubkey: new PublicKey('F7Kzv7G6p1PvHXL1xXLPTm4myKWpLjnVphCV8ABZJfgT'),
      },
    ];

    const instruction = new TransactionInstruction({
      keys,
      programId: new PublicKey(programId),
    });

    const converted = toKitInstruction(instruction);

    expect(converted).to.deep.equal({
      accounts: [
        {
          address: address('F7Kzv7G6p1PvHXL1xXLPTm4myKWpLjnVphCV8ABZJfgT'),
          role: AccountRole.READONLY_SIGNER,
        },
      ],
      programAddress: toKitAddress(new PublicKey(programId)),
    });
  });

  const keyConversionCases = [
    {isSigner: false, isWritable: false, expected: AccountRole.READONLY},
    {isSigner: false, isWritable: true, expected: AccountRole.WRITABLE},
    {isSigner: true, isWritable: false, expected: AccountRole.READONLY_SIGNER},
    {isSigner: true, isWritable: true, expected: AccountRole.WRITABLE_SIGNER},
  ];

  keyConversionCases.forEach(({isSigner, isWritable, expected}) => {
    it(`converts keys with isSigner: ${isSigner}, isWritable: ${isWritable} to ${expected}`, () => {
      const converted = toKitInstruction(
        new TransactionInstruction({
          keys: [{isSigner, isWritable, pubkey: PublicKey.default}],
          programId: PublicKey.default,
        }),
      );

      expect(converted.accounts?.some(account => account.role === expected)).to
        .be.true;
    });
  });
});
