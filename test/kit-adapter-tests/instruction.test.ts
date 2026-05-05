import {address} from '@solana/addresses';
import {AccountRole} from '@solana/instructions';
import {createNoopSigner} from '@solana/signers';
import {getTransferSolInstruction} from '@solana-program/system';
import {expect} from 'chai';

import {Address, Keypair, SystemInstruction} from '../../src';
import {toKitAddress} from '../../src/kit-adapters/address';
import {
  fromKitInstruction,
  isKitInstruction,
  toKitInstruction,
} from '../../src/kit-adapters/instruction';
import {Transaction, TransactionInstruction} from '../../src/transaction';

function toWeb3JsByteArrayAppropriateForPlatform(data: Uint8Array) {
  return typeof Buffer !== 'undefined'
    ? Buffer.from(data)
    : (new Uint8Array(data) as Buffer);
}

describe('toKitInstruction', () => {
  it('converts a basic TransactionInstruction', () => {
    const programId = new Address('11111111111111111111111111111111');
    const data = new Uint8Array([10, 20, 30]);
    const instruction = new TransactionInstruction({
      data: toWeb3JsByteArrayAppropriateForPlatform(data),
      keys: [
        {
          isSigner: false,
          isWritable: true,
          pubkey: new Address('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
        },
      ],
      programId,
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
      programAddress: toKitAddress(programId),
    });
    expect(converted.data).to.not.equal(instruction.data);
  });

  it('freezes the accounts array, each account, and the instruction', () => {
    const converted = toKitInstruction(
      new TransactionInstruction({
        data: new Uint8Array([10, 20, 30]),
        keys: [
          {
            isSigner: false,
            isWritable: true,
            pubkey: new Address('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          },
        ],
        programId: new Address('11111111111111111111111111111111'),
      }),
    );

    expect(Object.isFrozen(converted.accounts)).to.be.true;
    expect(Object.isFrozen(converted.accounts[0])).to.be.true;
    expect(Object.isFrozen(converted)).to.be.true;
  });

  it('materializes empty accounts and empty data when keys and data are omitted', () => {
    const programId = new Address('11111111111111111111111111111111');

    const converted = toKitInstruction(
      new TransactionInstruction({
        keys: [],
        programId,
      }),
    );

    expect(converted).to.deep.equal({
      accounts: [],
      data: new Uint8Array(0),
      programAddress: toKitAddress(programId),
    });
  });

  it('handles an instruction with multiple keys', () => {
    const programId = new Address('11111111111111111111111111111111');
    const data = new Uint8Array([70, 80, 90]);

    const converted = toKitInstruction(
      new TransactionInstruction({
        data,
        keys: [
          {
            isSigner: true,
            isWritable: true,
            pubkey: new Address('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          },
          {
            isSigner: false,
            isWritable: false,
            pubkey: new Address('9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw'),
          },
        ],
        programId,
      }),
    );

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
      programAddress: toKitAddress(programId),
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
          keys: [{isSigner, isWritable, pubkey: Address.default}],
          programId: Address.default,
        }),
      );

      expect(converted.accounts.some(account => account.role === expected)).to
        .be.true;
    });
  });
});

describe('fromKitInstruction', () => {
  it('converts a Kit instruction to a TransactionInstruction', () => {
    const converted = fromKitInstruction({
      programAddress: address('11111111111111111111111111111111'),
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
      data: new Uint8Array([10, 20, 30]),
    });

    expect(converted).to.be.instanceOf(TransactionInstruction);
    expect(converted.programId.toBase58()).to.eq(
      '11111111111111111111111111111111',
    );
    expect(converted.keys).to.have.length(2);
    expect(converted.keys[0].isSigner).to.be.true;
    expect(converted.keys[0].isWritable).to.be.true;
    expect(converted.keys[0].pubkey.toBase58()).to.eq(
      '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
    );
    expect(converted.keys[1].isSigner).to.be.false;
    expect(converted.keys[1].isWritable).to.be.false;
    expect(converted.data).to.deep.equal(new Uint8Array([10, 20, 30]));
  });

  it('materializes empty keys and empty data when accounts and data are omitted', () => {
    const converted = fromKitInstruction({
      programAddress: address('11111111111111111111111111111111'),
    });

    expect(converted.keys).to.have.length(0);
    expect(converted.data).to.deep.equal(new Uint8Array(0));
  });

  it('roundtrips with toKitInstruction', () => {
    const original = new TransactionInstruction({
      keys: [
        {
          isSigner: true,
          isWritable: true,
          pubkey: new Address('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: new Address('9A87Qt8sxxLMe7hcrjC4cPnho1CwWKRpk84ZTRPyvWNw'),
        },
      ],
      programId: new Address('11111111111111111111111111111111'),
      data: new Uint8Array([42, 43, 44]),
    });

    const roundtripped = fromKitInstruction(toKitInstruction(original));

    expect(roundtripped.programId.equals(original.programId)).to.be.true;
    expect(roundtripped.keys).to.have.length(original.keys.length);
    for (let index = 0; index < original.keys.length; index += 1) {
      expect(
        roundtripped.keys[index].pubkey.equals(original.keys[index].pubkey),
      ).to.be.true;
      expect(roundtripped.keys[index].isSigner).to.eq(
        original.keys[index].isSigner,
      );
      expect(roundtripped.keys[index].isWritable).to.eq(
        original.keys[index].isWritable,
      );
    }
    expect(roundtripped.data).to.deep.equal(original.data);
  });

  it('preserves signer and writable roles from Codama client with noopSigner', async () => {
    const from = (await Keypair.generate()).publicKey;
    const to = (await Keypair.generate()).publicKey;

    const kitInstruction = getTransferSolInstruction({
      source: createNoopSigner(toKitAddress(from)),
      destination: toKitAddress(to),
      amount: 42,
    });
    const instruction = fromKitInstruction(kitInstruction);

    expect(instruction.keys[0].pubkey.toBase58()).to.equal(from.toBase58());
    expect(instruction.keys[0].isSigner).to.equal(true);
    expect(instruction.keys[0].isWritable).to.equal(true);

    expect(instruction.keys[1].pubkey.toBase58()).to.equal(to.toBase58());
    expect(instruction.keys[1].isSigner).to.equal(false);
    expect(instruction.keys[1].isWritable).to.equal(true);

    expect(instruction.programId.toBase58()).to.equal(
      '11111111111111111111111111111111',
    );

    const decoded = SystemInstruction.decodeTransfer(instruction);
    expect(decoded.lamports).to.equal(42n);
  });
});

describe('isKitInstruction', () => {
  [
    AccountRole.READONLY,
    AccountRole.WRITABLE,
    AccountRole.READONLY_SIGNER,
    AccountRole.WRITABLE_SIGNER,
  ].forEach(role => {
    it(`accepts account role ${role}`, () => {
      expect(
        isKitInstruction({
          programAddress: address('11111111111111111111111111111111'),
          accounts: [
            {
              address: address('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
              role,
            },
          ],
        }),
      ).to.be.true;
    });
  });

  it('returns true for a minimal Kit instruction', () => {
    expect(
      isKitInstruction({
        programAddress: address('11111111111111111111111111111111'),
      }),
    ).to.be.true;
  });

  it('returns false when programAddress is not a valid address', () => {
    expect(
      isKitInstruction({
        programAddress: 'not-an-address',
      }),
    ).to.be.false;
  });

  it('allows extra properties while matching the Kit Instruction shape', () => {
    expect(
      isKitInstruction({
        programAddress: address('11111111111111111111111111111111'),
        programId: Address.default,
        keys: [],
      }),
    ).to.be.true;
  });

  it('returns false when accounts is present but not an array', () => {
    expect(
      isKitInstruction({
        programAddress: address('11111111111111111111111111111111'),
        accounts: 'not-an-array',
      }),
    ).to.be.false;
  });

  it('returns false when account entries do not have Kit account shape', () => {
    expect(
      isKitInstruction({
        programAddress: address('11111111111111111111111111111111'),
        accounts: [{address: 123, role: AccountRole.WRITABLE}],
      }),
    ).to.be.false;
  });

  it('returns false when account address is not a valid address', () => {
    expect(
      isKitInstruction({
        programAddress: address('11111111111111111111111111111111'),
        accounts: [{address: 'not-an-address', role: AccountRole.WRITABLE}],
      }),
    ).to.be.false;
  });

  [-1, 1.5, 4].forEach(role => {
    it(`returns false when account role ${role} is not a valid AccountRole`, () => {
      expect(
        isKitInstruction({
          programAddress: address('11111111111111111111111111111111'),
          accounts: [
            {
              address: address('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
              role,
            },
          ],
        }),
      ).to.be.false;
    });
  });

  it('returns false when data is present but not a Uint8Array', () => {
    expect(
      isKitInstruction({
        programAddress: address('11111111111111111111111111111111'),
        data: [1, 2, 3],
      }),
    ).to.be.false;
  });
});

describe('Transaction.add() with Kit instructions', () => {
  it('accepts a raw Kit instruction via add()', () => {
    const kitInstruction = {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [
        {
          address: address('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          role: AccountRole.WRITABLE_SIGNER,
        },
      ],
      data: new Uint8Array([1, 2, 3]),
    };

    const transaction = new Transaction();
    transaction.add(kitInstruction);

    expect(transaction.instructions).to.have.length(1);
    expect(transaction.instructions[0]).to.be.instanceOf(
      TransactionInstruction,
    );
    expect(transaction.instructions[0].programId.toBase58()).to.eq(
      '11111111111111111111111111111111',
    );
    expect(transaction.instructions[0].keys[0].pubkey.toBase58()).to.eq(
      '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
    );
    expect(transaction.instructions[0].keys[0].isSigner).to.be.true;
    expect(transaction.instructions[0].keys[0].isWritable).to.be.true;
    expect(transaction.instructions[0].data).to.deep.equal(
      new Uint8Array([1, 2, 3]),
    );
  });

  it('mixes converted Kit and Web3.js instructions in a single add()', () => {
    const kitInstruction = {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array([10]),
    };
    const web3JsInstruction = new TransactionInstruction({
      keys: [],
      programId: Address.default,
      data: new Uint8Array([20]),
    });

    const transaction = new Transaction();
    transaction.add(fromKitInstruction(kitInstruction), web3JsInstruction);

    expect(transaction.instructions).to.have.length(2);
    expect(transaction.instructions[0].data).to.deep.equal(
      new Uint8Array([10]),
    );
    expect(transaction.instructions[1].data).to.deep.equal(
      new Uint8Array([20]),
    );
  });
});
