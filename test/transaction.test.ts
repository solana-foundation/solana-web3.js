import {
  AccountRole,
  blockhash,
  getBase58Decoder,
  getBlockhashDecoder,
  getMessagePackerInstructionPlanFromInstructions,
  sequentialInstructionPlan,
  singleInstructionPlan,
  type Blockhash,
  type Instruction as KitInstruction,
} from '@solana/kit';
import {
  createNoopSigner,
  generateKeyPairSigner,
  type MessagePartialSigner,
  type TransactionPartialSigner,
} from '@solana/signers';
import {expect} from 'chai';

import {Connection} from '../src/connection';
import {Keypair, type Signer} from '../src/keypair';
import {Address} from '../src/address';
import {
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '../src/transaction';
import {StakeProgram, SystemProgram} from '../src/programs';
import {Message} from '../src/message';
import invariant from '../src/utils/assert';
import {helpers} from './mocks/rpc-http';
import {getUniqueAddress} from './utils/address';
import {url} from './url';
import {sign} from '../src/utils/ed25519';

const BASE58_DECODER = getBase58Decoder();
const BLOCKHASH_DECODER = getBlockhashDecoder();

const generateKeypair = async (): Promise<Keypair> => {
  return Keypair.generate();
};

const generateBlockhash = async (): Promise<Blockhash> => {
  return blockhash((await generateKeypair()).address);
};

const expectPromiseToReject = async (
  promise: Promise<unknown>,
  expectedMessage?: string,
) => {
  try {
    await promise;
    expect.fail('Expected promise to reject');
  } catch (error) {
    if (expectedMessage !== undefined) {
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.eq(expectedMessage);
    }
  }
};

describe('Transaction', () => {
  describe('compileMessage', () => {
    it('accountKeys are ordered', async function () {
      // These pubkeys are chosen specially to be in sort order.
      const payer = new Address('3qMLYYyNvaxNZP7nW8u5abHMoJthYqQehRLbFVPNNcvQ');
      const accountWritableSigner2 = new Address(
        '3XLtLo5Z4DG8b6PteJidF6kFPNDfxWjxv4vTLrjaHTvd',
      );
      const accountWritableSigner3 = new Address(
        '4rvqGPb4sXgyUKQcvmPxnWEZTTiTqNUZ2jjnw7atKVxa',
      );
      const accountSigner4 = new Address(
        '5oGjWjyoKDoXGpboGBfqm9a5ZscyAjRi3xuGYYu1ayQg',
      );
      const accountSigner5 = new Address(
        '65Rkc3VmDEV6zTRGtgdwkTcQUxDJnJszj2s4WoXazYpC',
      );
      const accountWritable6 = new Address(
        '72BxBZ9eD9Ue6zoJ9bzfit7MuaDAnq1qhirgAoFUXz9q',
      );
      const accountWritable7 = new Address(
        'BtYrPUeVphVgRHJkf2bKz8DLRxJdQmZyANrTM12xFqZL',
      );
      const accountRegular8 = new Address(
        'Di1MbqFwpodKzNrkjGaUHhXC4TJ1SHUAxo9agPZphNH1',
      );
      const accountRegular9 = new Address(
        'DYzzsfHTgaNhCgn7wMaciAYuwYsGqtVNg9PeFZhH93Pc',
      );
      const programId = new Address(
        'Fx9svCTdxnACvmEmx672v2kP1or4G1zC73tH7XsXbKkP',
      );

      const recentBlockhash = await generateBlockhash();
      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      }).add({
        keys: [
          // Regular accounts
          {pubkey: accountRegular9, isSigner: false, isWritable: false},
          {pubkey: accountRegular8, isSigner: false, isWritable: false},
          // Writable accounts
          {pubkey: accountWritable7, isSigner: false, isWritable: true},
          {pubkey: accountWritable6, isSigner: false, isWritable: true},
          // Signers
          {pubkey: accountSigner5, isSigner: true, isWritable: false},
          {pubkey: accountSigner4, isSigner: true, isWritable: false},
          // Writable Signers
          {pubkey: accountWritableSigner3, isSigner: true, isWritable: true},
          {pubkey: accountWritableSigner2, isSigner: true, isWritable: true},
          // Payer.
          {pubkey: payer, isSigner: true, isWritable: true},
        ],
        programId,
      });

      transaction.feePayer = payer;

      const message = transaction.compileMessage();
      // Payer comes first.
      expect(message.accountKeys[0].equals(payer)).to.be.true;
      // Writable signers come next, in pubkey order.
      expect(message.accountKeys[1].equals(accountWritableSigner2)).to.be.true;
      expect(message.accountKeys[2].equals(accountWritableSigner3)).to.be.true;
      // Signers come next, in pubkey order.
      expect(message.accountKeys[3].equals(accountSigner4)).to.be.true;
      expect(message.accountKeys[4].equals(accountSigner5)).to.be.true;
      // Writable accounts come next, in pubkey order.
      expect(message.accountKeys[5].equals(accountWritable6)).to.be.true;
      expect(message.accountKeys[6].equals(accountWritable7)).to.be.true;
      // Everything else afterward, in pubkey order.
      expect(message.accountKeys[7].equals(accountRegular8)).to.be.true;
      expect(message.accountKeys[8].equals(accountRegular9)).to.be.true;
      expect(message.accountKeys[9].equals(programId)).to.be.true;
    });

    it('accountKeys collapses signedness and writability of duplicate accounts', async function () {
      // These pubkeys are chosen specially to be in sort order.
      const payer = new Address('2eBgaMN8dCnCjx8B8Wrwk974v5WHwA6Vvj4N2mW9KDyt');
      const account2 = new Address(
        'DL8FErokCN7rerLdmJ7tQvsL1FsqDu1sTKLLooWmChiW',
      );
      const account3 = new Address(
        'EdPiTYbXFxNrn1vqD7ZdDyauRKG4hMR6wY54RU1YFP2e',
      );
      const account4 = new Address(
        'FThXbyKK4kYJBngSSuvo9e6kc7mwPHEgw4V8qdmz1h3k',
      );
      const programId = new Address(
        'Gcatgv533efD1z2knsH9UKtkrjRWCZGi12f8MjNaDzmN',
      );
      const account5 = new Address(
        'rBtwG4bx85Exjr9cgoupvP1c7VTe7u5B36rzCg1HYgi',
      );

      const recentBlockhash = await generateBlockhash();
      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      }).add({
        keys: [
          // Should sort last.
          {pubkey: account5, isSigner: false, isWritable: false},
          {pubkey: account5, isSigner: false, isWritable: false},
          // Should be considered writeable.
          {pubkey: account4, isSigner: false, isWritable: false},
          {pubkey: account4, isSigner: false, isWritable: true},
          // Should be considered a signer.
          {pubkey: account3, isSigner: false, isWritable: false},
          {pubkey: account3, isSigner: true, isWritable: false},
          // Should be considered a writable signer.
          {pubkey: account2, isSigner: false, isWritable: true},
          {pubkey: account2, isSigner: true, isWritable: false},
          // Payer.
          {pubkey: payer, isSigner: true, isWritable: true},
        ],
        programId,
      });

      transaction.feePayer = payer;

      const message = transaction.compileMessage();
      // Payer comes first.
      expect(message.accountKeys[0].equals(payer)).to.be.true;
      // Writable signer comes first.
      expect(message.accountKeys[1].equals(account2)).to.be.true;
      // Signer comes next.
      expect(message.accountKeys[2].equals(account3)).to.be.true;
      // Writable account comes next.
      expect(message.accountKeys[3].equals(account4)).to.be.true;
      // Regular accounts come last.
      expect(message.accountKeys[4].equals(programId)).to.be.true;
      expect(message.accountKeys[5].equals(account5)).to.be.true;
    });

    it('payer is first account meta', async function () {
      const payer = await generateKeypair();
      const other = await generateKeypair();
      const recentBlockhash = await generateBlockhash();
      const programId = (await generateKeypair()).publicKey;
      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      }).add({
        keys: [
          {pubkey: other.publicKey, isSigner: true, isWritable: true},
          {pubkey: payer.publicKey, isSigner: true, isWritable: true},
        ],
        programId,
      });

      await transaction.sign(payer, other);
      const message = transaction.compileMessage();
      expect(message.accountKeys[0]).to.eql(payer.publicKey);
      expect(message.accountKeys[1]).to.eql(other.publicKey);
      expect(message.header.numRequiredSignatures).to.eq(2);
      expect(message.header.numReadonlySignedAccounts).to.eq(0);
      expect(message.header.numReadonlyUnsignedAccounts).to.eq(1);
    });

    it('validation', async function () {
      const payer = await generateKeypair();
      const recentBlockhash = await generateBlockhash();

      const transaction = new Transaction();
      expect(() => {
        transaction.compileMessage();
      }).to.throw('Transaction recentBlockhash required');

      transaction.recentBlockhash = recentBlockhash;

      expect(() => {
        transaction.compileMessage();
      }).to.throw('Transaction fee payer required');

      const unknownSigner = await generateKeypair();
      transaction.setSigners(payer.publicKey, unknownSigner.publicKey);

      expect(() => {
        transaction.compileMessage();
      }).to.throw('unknown signer');

      // Expect compile to succeed with implicit fee payer from signers
      transaction.setSigners(payer.publicKey);
      transaction.compileMessage();

      // Expect compile to succeed with fee payer and no signers
      transaction.signatures = [];
      transaction.feePayer = payer.publicKey;
      transaction.compileMessage();
    });

    it('payer is writable', async function () {
      const payer = await generateKeypair();
      const recentBlockhash = await generateBlockhash();
      const programId = (await generateKeypair()).publicKey;
      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      }).add({
        keys: [{pubkey: payer.publicKey, isSigner: true, isWritable: false}],
        programId,
      });

      await transaction.sign(payer);
      const message = transaction.compileMessage();
      expect(message.accountKeys[0]).to.eql(payer.publicKey);
      expect(message.header.numRequiredSignatures).to.eq(1);
      expect(message.header.numReadonlySignedAccounts).to.eq(0);
      expect(message.header.numReadonlyUnsignedAccounts).to.eq(1);
    });

    it('uses the nonce as the recent blockhash when compiling nonce-based transactions', () => {
      const nonce = new Address(1);
      const nonceAuthority = new Address(2);
      const nonceInfo = {
        nonce: blockhash(nonce.toBase58()),
        nonceInstruction: SystemProgram.nonceAdvance({
          noncePubkey: nonce,
          authorizedPubkey: nonceAuthority,
        }),
      };
      const transaction = new Transaction({
        feePayer: nonceAuthority,
        nonceInfo,
      });
      const message = transaction.compileMessage();
      expect(message.recentBlockhash).to.equal(nonce.toBase58());
    });

    it('prepends the nonce advance instruction when compiling nonce-based transactions', () => {
      const nonce = new Address(1);
      const nonceAuthority = new Address(2);
      const nonceInfo = {
        nonce: blockhash(nonce.toBase58()),
        nonceInstruction: SystemProgram.nonceAdvance({
          noncePubkey: nonce,
          authorizedPubkey: nonceAuthority,
        }),
      };
      const transaction = new Transaction({
        feePayer: nonceAuthority,
        nonceInfo,
      }).add(
        SystemProgram.transfer({
          fromPubkey: nonceAuthority,
          lamports: 1,
          toPubkey: new Address(3),
        }),
      );
      const message = transaction.compileMessage();
      expect(message.instructions).to.have.length(2);
      const expectedNonceAdvanceCompiledInstruction = {
        accounts: [1, 4, 0],
        data: BASE58_DECODER.decode(Uint8Array.from([4, 0, 0, 0])),
        programIdIndex: (() => {
          let foundIndex = -1;
          message.accountKeys.find((publicKey, ii) => {
            if (publicKey.equals(SystemProgram.programId)) {
              foundIndex = ii;
              return true;
            }
            return;
          });
          return foundIndex;
        })(),
      };
      expect(message.instructions[0]).to.deep.equal(
        expectedNonceAdvanceCompiledInstruction,
      );
    });

    it('does not prepend the nonce advance instruction when compiling nonce-based transactions if it is already there', () => {
      const nonce = new Address(1);
      const nonceAuthority = new Address(2);
      const nonceInfo = {
        nonce: blockhash(nonce.toBase58()),
        nonceInstruction: SystemProgram.nonceAdvance({
          noncePubkey: nonce,
          authorizedPubkey: nonceAuthority,
        }),
      };
      const transaction = new Transaction({
        feePayer: nonceAuthority,
        nonceInfo,
      })
        .add(nonceInfo.nonceInstruction)
        .add(
          SystemProgram.transfer({
            fromPubkey: nonceAuthority,
            lamports: 1,
            toPubkey: new Address(3),
          }),
        );
      const message = transaction.compileMessage();
      expect(message.instructions).to.have.length(2);
      const expectedNonceAdvanceCompiledInstruction = {
        accounts: [1, 4, 0],
        data: BASE58_DECODER.decode(Uint8Array.from([4, 0, 0, 0])),
        programIdIndex: (() => {
          let foundIndex = -1;
          message.accountKeys.find((publicKey, ii) => {
            if (publicKey.equals(SystemProgram.programId)) {
              foundIndex = ii;
              return true;
            }
            return;
          });
          return foundIndex;
        })(),
      };
      expect(message.instructions[0]).to.deep.equal(
        expectedNonceAdvanceCompiledInstruction,
      );
    });
  });

  if (process.env.TEST_LIVE) {
    it('getEstimatedFee', async function () {
      const connection = new Connection(url);
      const accountFrom = await generateKeypair();
      const accountTo = await generateKeypair();

      const latestBlockhash = await helpers.latestBlockhash({connection});

      const transaction = new Transaction({
        feePayer: accountFrom.publicKey,
        ...latestBlockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: accountFrom.publicKey,
          toPubkey: accountTo.publicKey,
          lamports: 10,
        }),
      );

      const fee = await transaction.getEstimatedFee(connection);
      expect(fee).to.eq(5000n);
    });
  }

  it('partialSign', async function () {
    const account1 = await generateKeypair();
    const account2 = await generateKeypair();
    const recentBlockhash = blockhash(account1.publicKey.toBase58()); // Fake recentBlockhash
    const transfer = SystemProgram.transfer({
      fromPubkey: account1.publicKey,
      toPubkey: account2.publicKey,
      lamports: 123,
    });

    const transaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(transfer);
    await transaction.sign(account1, account2);

    const partialTransaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(transfer);
    partialTransaction.setSigners(account1.publicKey, account2.publicKey);
    expect(partialTransaction.signatures[0].signature).to.be.null;
    expect(partialTransaction.signatures[1].signature).to.be.null;

    await partialTransaction.partialSign(account1);
    expect(partialTransaction.signatures[0].signature).not.to.be.null;
    expect(partialTransaction.signatures[1].signature).to.be.null;

    await expectPromiseToReject(partialTransaction.serialize());
    await partialTransaction.serialize({requireAllSignatures: false});

    await partialTransaction.partialSign(account2);

    expect(partialTransaction.signatures[0].signature).not.to.be.null;
    expect(partialTransaction.signatures[1].signature).not.to.be.null;

    await partialTransaction.serialize();

    expect(partialTransaction).to.eql(transaction);

    invariant(partialTransaction.signatures[0].signature);
    partialTransaction.signatures[0].signature.fill(1);
    await expectPromiseToReject(
      partialTransaction.serialize({requireAllSignatures: false}),
    );
    await partialTransaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });
  });

  it('signs with async signer without secretKey', async function () {
    const signer = await generateKeypair();
    const recipient = await generateKeypair();
    const recentBlockhash = blockhash(signer.publicKey.toBase58());
    const transfer = SystemProgram.transfer({
      fromPubkey: signer.publicKey,
      toPubkey: recipient.publicKey,
      lamports: 123,
    });

    const transaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(transfer);

    await transaction.sign(signer);
    expect(transaction.signatures[0].signature).not.to.be.null;
  });

  it('signs with a raw Kit key pair signer', async function () {
    const signer = await generateKeyPairSigner();
    const signerPublicKey = new Address(signer.address);
    const recipient = await generateKeypair();
    const recentBlockhash = blockhash(signer.address);
    const transfer = SystemProgram.transfer({
      fromPubkey: signerPublicKey,
      toPubkey: recipient.publicKey,
      lamports: 123,
    });

    const transaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(transfer);

    await transaction.sign(signer);
    expect(transaction.signatures[0].signature).not.to.be.null;
    expect(await transaction.verifySignatures()).to.be.true;
  });

  it('passes blockhash lifetime to Kit transaction partial signers', async function () {
    const keyPairSigner = await generateKeyPairSigner();
    const signerPublicKey = new Address(keyPairSigner.address);
    const recipient = await generateKeypair();
    const recentBlockhash = blockhash(keyPairSigner.address);
    let lifetimeConstraint: unknown;
    const transactionOnlySigner = {
      address: keyPairSigner.address,
      signTransactions: async transactions => {
        lifetimeConstraint = transactions[0].lifetimeConstraint;
        return keyPairSigner.signTransactions(transactions);
      },
    } satisfies TransactionPartialSigner;
    const transfer = SystemProgram.transfer({
      fromPubkey: signerPublicKey,
      toPubkey: recipient.publicKey,
      lamports: 123,
    });

    const transaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(transfer);

    await transaction.sign(transactionOnlySigner);
    expect(lifetimeConstraint).to.deep.equal({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999n,
    });
    expect(transaction.signatures[0].signature).not.to.be.null;
    expect(await transaction.verifySignatures()).to.be.true;
  });

  it('passes nonce lifetime to Kit transaction partial signers', async function () {
    const keyPairSigner = await generateKeyPairSigner();
    const signerPublicKey = new Address(keyPairSigner.address);
    const recipient = await generateKeypair();
    const nonceAccount = await generateKeypair();
    const nonce = blockhash(recipient.publicKey.toBase58());
    const nonceInfo = {
      nonce,
      nonceInstruction: SystemProgram.nonceAdvance({
        noncePubkey: nonceAccount.publicKey,
        authorizedPubkey: signerPublicKey,
      }),
    };
    let lifetimeConstraint: unknown;
    const transactionOnlySigner = {
      address: keyPairSigner.address,
      signTransactions: async transactions => {
        lifetimeConstraint = transactions[0].lifetimeConstraint;
        return keyPairSigner.signTransactions(transactions);
      },
    } satisfies TransactionPartialSigner;
    const transfer = SystemProgram.transfer({
      fromPubkey: signerPublicKey,
      toPubkey: recipient.publicKey,
      lamports: 123,
    });

    const transaction = new Transaction({nonceInfo}).add(transfer);

    await transaction.sign(transactionOnlySigner);
    expect(lifetimeConstraint).to.deep.equal({
      nonce,
      nonceAccountAddress: nonceAccount.address,
    });
    expect(transaction.signatures[0].signature).not.to.be.null;
    expect(await transaction.verifySignatures()).to.be.true;
  });

  it('rejects transaction-only Kit signers when transaction lifetime is unavailable', async function () {
    const keyPairSigner = await generateKeyPairSigner();
    const signerPublicKey = new Address(keyPairSigner.address);
    const recipient = await generateKeypair();
    const recentBlockhash = blockhash(keyPairSigner.address);
    const transactionOnlySigner = {
      address: keyPairSigner.address,
      signTransactions: keyPairSigner.signTransactions,
    } satisfies TransactionPartialSigner;
    const transfer = SystemProgram.transfer({
      fromPubkey: signerPublicKey,
      toPubkey: recipient.publicKey,
      lamports: 123,
    });

    const transaction = new Transaction({recentBlockhash}).add(transfer);

    await expectPromiseToReject(
      transaction.sign(transactionOnlySigner),
      'TransactionPartialSigner support requires transaction lifetime information. Use a MessagePartialSigner-compatible signer or provide a transaction with a blockhash lifetime or nonce lifetime.',
    );
  });

  it('allows noop Kit partial signers to leave signatures empty', async function () {
    const signer = await generateKeypair();
    const recipient = await generateKeypair();
    const recentBlockhash = blockhash(signer.address);
    const transfer = SystemProgram.transfer({
      fromPubkey: signer.publicKey,
      toPubkey: recipient.publicKey,
      lamports: 123,
    });

    const transaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(transfer);

    await transaction.sign(createNoopSigner(signer.address));
    expect(transaction.signatures).to.have.length(1);
    expect(transaction.signatures[0].publicKey.equals(signer.publicKey)).to.be
      .true;
    expect(transaction.signatures[0].signature).to.be.null;
  });

  it('signs with a Keychain-style Kit partial signer', async function () {
    const keyPairSigner = await generateKeyPairSigner();
    const signerPublicKey = new Address(keyPairSigner.address);
    const recipient = await generateKeypair();
    const recentBlockhash = blockhash(keyPairSigner.address);
    const keychainSigner = {
      address: keyPairSigner.address,
      isAvailable: () => Promise.resolve(true),
      signMessages: keyPairSigner.signMessages,
      signTransactions: keyPairSigner.signTransactions,
    } satisfies MessagePartialSigner &
      TransactionPartialSigner & {
        isAvailable(): Promise<boolean>;
      };
    const signerInput: Signer = keychainSigner;
    const transfer = SystemProgram.transfer({
      fromPubkey: signerPublicKey,
      toPubkey: recipient.publicKey,
      lamports: 123,
    });

    const transaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(transfer);

    await transaction.sign(signerInput);
    expect(transaction.signatures[0].signature).not.to.be.null;
    expect(await transaction.verifySignatures()).to.be.true;
  });

  describe('dedupe', () => {
    let payer: Keypair;
    let duplicate1: Keypair;
    let duplicate2: Keypair;
    let recentBlockhash: Blockhash;
    let programId: Address;

    beforeEach(async function () {
      payer = await generateKeypair();
      duplicate1 = payer;
      duplicate2 = payer;
      recentBlockhash = await generateBlockhash();
      programId = (await generateKeypair()).publicKey;
    });

    it('setSigners', () => {
      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      }).add({
        keys: [
          {pubkey: duplicate1.publicKey, isSigner: true, isWritable: true},
          {pubkey: payer.publicKey, isSigner: false, isWritable: true},
          {pubkey: duplicate2.publicKey, isSigner: true, isWritable: false},
        ],
        programId,
      });

      transaction.setSigners(
        payer.publicKey,
        duplicate1.publicKey,
        duplicate2.publicKey,
      );

      expect(transaction.signatures).to.have.length(1);
      expect(transaction.signatures[0].publicKey).to.eql(payer.publicKey);

      const message = transaction.compileMessage();
      expect(message.accountKeys[0]).to.eql(payer.publicKey);
      expect(message.header.numRequiredSignatures).to.eq(1);
      expect(message.header.numReadonlySignedAccounts).to.eq(0);
      expect(message.header.numReadonlyUnsignedAccounts).to.eq(1);

      transaction.signatures;
    });

    it('sign', async () => {
      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      }).add({
        keys: [
          {pubkey: duplicate1.publicKey, isSigner: true, isWritable: true},
          {pubkey: payer.publicKey, isSigner: false, isWritable: true},
          {pubkey: duplicate2.publicKey, isSigner: true, isWritable: false},
        ],
        programId,
      });

      await transaction.sign(payer, duplicate1, duplicate2);

      expect(transaction.signatures).to.have.length(1);
      expect(transaction.signatures[0].publicKey).to.eql(payer.publicKey);

      const message = transaction.compileMessage();
      expect(message.accountKeys[0]).to.eql(payer.publicKey);
      expect(message.header.numRequiredSignatures).to.eq(1);
      expect(message.header.numReadonlySignedAccounts).to.eq(0);
      expect(message.header.numReadonlyUnsignedAccounts).to.eq(1);

      transaction.signatures;
    });
  });

  it('transfer signatures', async function () {
    const account1 = await generateKeypair();
    const account2 = await generateKeypair();
    const recentBlockhash = blockhash(account1.publicKey.toBase58()); // Fake recentBlockhash
    const transfer1 = SystemProgram.transfer({
      fromPubkey: account1.publicKey,
      toPubkey: account2.publicKey,
      lamports: 123,
    });
    const transfer2 = SystemProgram.transfer({
      fromPubkey: account2.publicKey,
      toPubkey: account1.publicKey,
      lamports: 123,
    });

    const latestBlockhash = {
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    };

    const orgTransaction = new Transaction({
      ...latestBlockhash,
    }).add(transfer1, transfer2);
    await orgTransaction.sign(account1, account2);

    const newTransaction = new Transaction({
      ...latestBlockhash,
      signatures: orgTransaction.signatures,
    }).add(transfer1, transfer2);

    expect(newTransaction).to.eql(orgTransaction);
  });

  it('dedup signatures', async function () {
    const account1 = await generateKeypair();
    const account2 = await generateKeypair();
    const recentBlockhash = blockhash(account1.publicKey.toBase58()); // Fake recentBlockhash
    const transfer1 = SystemProgram.transfer({
      fromPubkey: account1.publicKey,
      toPubkey: account2.publicKey,
      lamports: 123,
    });
    const transfer2 = SystemProgram.transfer({
      fromPubkey: account1.publicKey,
      toPubkey: account2.publicKey,
      lamports: 123,
    });

    const orgTransaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(transfer1, transfer2);
    await orgTransaction.sign(account1);
  });

  it('use nonce', async function () {
    const account1 = await generateKeypair();
    const account2 = await generateKeypair();
    const nonceAccount = await generateKeypair();
    const nonce = blockhash(account2.publicKey.toBase58()); // Fake Nonce hash

    const nonceInfo = {
      nonce,
      nonceInstruction: SystemProgram.nonceAdvance({
        noncePubkey: nonceAccount.publicKey,
        authorizedPubkey: account1.publicKey,
      }),
    };

    const transferTransaction = new Transaction({nonceInfo}).add(
      SystemProgram.transfer({
        fromPubkey: account1.publicKey,
        toPubkey: account2.publicKey,
        lamports: 123,
      }),
    );
    await transferTransaction.sign(account1);

    expect(transferTransaction.instructions).to.have.length(1);
    expect(transferTransaction.recentBlockhash).to.be.undefined;

    const stakeAccount = await generateKeypair();
    const voteAccount = await generateKeypair();
    const stakeTransaction = new Transaction({nonceInfo}).add(
      StakeProgram.delegate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: account1.publicKey,
        votePubkey: voteAccount.publicKey,
      }),
    );
    await stakeTransaction.sign(account1);

    expect(stakeTransaction.instructions).to.have.length(1);
    expect(stakeTransaction.recentBlockhash).to.be.undefined;
  });

  it('parse wire format and serialize', async () => {
    const sender = await Keypair.fromSeed(Uint8Array.from(Array(32).fill(8))); // Arbitrary known account
    const recentBlockhash = blockhash(
      'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k',
    ); // Arbitrary known recentBlockhash
    const recipient = new Address(
      'J3dxNj7nDRRqRRXuEMynDG57DkZK4jYRuv3Garmb1i99',
    ); // Arbitrary known public key
    const transfer = SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient,
      lamports: 49,
    });
    const expectedTransaction = new Transaction({
      blockhash: recentBlockhash,
      feePayer: sender.publicKey,
      lastValidBlockHeight: 9999,
    }).add(transfer);
    await expectedTransaction.sign(sender);

    const serializedTransaction = Buffer.from(
      'AVuErQHaXv0SG0/PchunfxHKt8wMRfMZzqV0tkC5qO6owYxWU2v871AoWywGoFQr4z+q/7mE8lIufNl/kxj+nQ0BAAEDE5j2LG0aRXxRumpLXz29L2n8qTIWIY3ImX5Ba9F9k8r9Q5/Mtmcn8onFxt47xKj+XdXXd3C8j/FcPu7csUrz/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxJrndgN4IFTxep3s6kO0ROug7bEsbx0xxuDkqEvwUusBAgIAAQwCAAAAMQAAAAAAAAA=',
      'base64',
    );
    const deserializedTransaction = Transaction.from(serializedTransaction);

    expect(await expectedTransaction.serialize()).to.eql(serializedTransaction);
    expect(await deserializedTransaction.serialize()).to.eql(
      serializedTransaction,
    );
  });

  it('populate transaction', () => {
    const recentBlockhash = blockhash(new Address(1).toString());
    const message = {
      accountKeys: [
        new Address(1).toString(),
        new Address(2).toString(),
        new Address(3).toString(),
        new Address(4).toString(),
        new Address(5).toString(),
      ],
      header: {
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 3,
        numRequiredSignatures: 2,
      },
      instructions: [
        {
          accounts: [1, 2, 3],
          data: BASE58_DECODER.decode(new Uint8Array(5).fill(9)),
          programIdIndex: 4,
        },
      ],
      recentBlockhash,
    };

    const signatures = [
      BASE58_DECODER.decode(new Uint8Array(64).fill(1)),
      BASE58_DECODER.decode(new Uint8Array(64).fill(2)),
    ];

    const transaction = Transaction.populate(new Message(message), signatures);
    expect(transaction.instructions).to.have.length(1);
    expect(transaction.signatures).to.have.length(2);
    expect(transaction.recentBlockhash).to.eq(recentBlockhash);
  });

  it('populate then compile transaction', () => {
    const recentBlockhash = blockhash(new Address(1).toString());
    const message = new Message({
      accountKeys: [
        new Address(1).toString(),
        new Address(2).toString(),
        new Address(3).toString(),
        new Address(4).toString(),
        new Address(5).toString(),
      ],
      header: {
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 3,
        numRequiredSignatures: 2,
      },
      instructions: [
        {
          accounts: [1, 2, 3],
          data: BASE58_DECODER.decode(new Uint8Array(5).fill(9)),
          programIdIndex: 2,
        },
      ],
      recentBlockhash,
    });

    const signatures = [
      BASE58_DECODER.decode(new Uint8Array(64).fill(1)),
      BASE58_DECODER.decode(new Uint8Array(64).fill(2)),
    ];

    const transaction = Transaction.populate(message, signatures);
    const compiledMessage = transaction.compileMessage();
    expect(compiledMessage).to.eql(message);

    // show that without caching the message, the populated message
    // might not be the same when re-compiled
    transaction._message = undefined;
    const compiledMessage2 = transaction.compileMessage();
    expect(compiledMessage2).not.to.eql(message);

    // show that even if message is cached, transaction may still
    // be modified
    transaction._message = message;
    transaction.recentBlockhash = blockhash(new Address(100).toString());
    const compiledMessage3 = transaction.compileMessage();
    expect(compiledMessage3).not.to.eql(message);
  });

  it('constructs a transaction with nonce info', () => {
    const nonce = new Address(1);
    const nonceAuthority = new Address(2);
    const nonceInfo = {
      nonce: blockhash(nonce.toBase58()),
      nonceInstruction: SystemProgram.nonceAdvance({
        noncePubkey: nonce,
        authorizedPubkey: nonceAuthority,
      }),
    };
    const transaction = new Transaction({nonceInfo});
    expect(transaction.recentBlockhash).to.be.undefined;
    expect(transaction.lastValidBlockHeight).to.be.undefined;
    expect(transaction.nonceInfo).to.equal(nonceInfo);
  });

  it('constructs a transaction with last valid block height', () => {
    const parsedBlockhash = blockhash(
      'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k',
    );
    const lastValidBlockHeight = 1234n;
    const transaction = new Transaction({
      blockhash: parsedBlockhash,
      lastValidBlockHeight,
    });
    expect(transaction.recentBlockhash).to.eq(parsedBlockhash);
    expect(transaction.lastValidBlockHeight).to.eq(lastValidBlockHeight);
  });

  it('constructs a transaction with nonce information', () => {
    const nonceAuthority = new Address(1);
    const nonceAccountPubkey = new Address(2);
    const nonceValue = blockhash(
      'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k',
    );
    const nonceInfo = {
      nonce: nonceValue,
      nonceInstruction: SystemProgram.nonceAdvance({
        noncePubkey: nonceAccountPubkey,
        authorizedPubkey: nonceAuthority,
      }),
    };
    const minContextSlot = 1234;
    const transaction = new Transaction({
      nonceInfo,
      minContextSlot,
    });
    expect(transaction.recentBlockhash).to.be.undefined;
    expect(transaction.lastValidBlockHeight).to.be.undefined;
    expect(transaction.minNonceContextSlot).to.eq(minContextSlot);
    expect(transaction.nonceInfo).to.eq(nonceInfo);
  });

  it('constructs a transaction with only a recent blockhash', () => {
    const recentBlockhash = blockhash(
      'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k',
    );
    const transaction = new Transaction({
      recentBlockhash,
    });
    expect(transaction.recentBlockhash).to.eq(recentBlockhash);
    expect(transaction.lastValidBlockHeight).to.be.undefined;
  });

  it('serialize unsigned transaction', async () => {
    const sender = await Keypair.fromSeed(Uint8Array.from(Array(32).fill(8))); // Arbitrary known account
    const recentBlockhash = blockhash(
      'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k',
    ); // Arbitrary known recentBlockhash
    const recipient = new Address(
      'J3dxNj7nDRRqRRXuEMynDG57DkZK4jYRuv3Garmb1i99',
    ); // Arbitrary known public key
    const transfer = SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient,
      lamports: 49,
    });
    const expectedTransaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(transfer);

    // Empty signature array fails.
    expect(expectedTransaction.signatures).to.have.length(0);
    await expectPromiseToReject(
      expectedTransaction.serialize(),
      'Transaction fee payer required',
    );
    await expectPromiseToReject(
      expectedTransaction.serialize({verifySignatures: false}),
      'Transaction fee payer required',
    );
    expect(() => {
      expectedTransaction.serializeMessage();
    }).to.throw('Transaction fee payer required');

    expectedTransaction.feePayer = sender.publicKey;

    // Serializing without signatures is allowed if sigverify disabled.
    await expectedTransaction.serialize({verifySignatures: false});

    // Serializing the message is allowed when signature array has null signatures
    const serializedMessage = expectedTransaction.serializeMessage();
    expect(serializedMessage.constructor).to.equal(Uint8Array);

    const expectedSerializationWithNoSignatures = Buffer.from(
      'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
        'AAAAAAAAAAAAAAAAAAABAAEDE5j2LG0aRXxRumpLXz29L2n8qTIWIY3ImX5Ba9F9k8r9' +
        'Q5/Mtmcn8onFxt47xKj+XdXXd3C8j/FcPu7csUrz/AAAAAAAAAAAAAAAAAAAAAAAAAAA' +
        'AAAAAAAAAAAAAAAAxJrndgN4IFTxep3s6kO0ROug7bEsbx0xxuDkqEvwUusBAgIAAQwC' +
        'AAAAMQAAAAAAAAA=',
      'base64',
    );
    const serializedTransaction = await expectedTransaction.serialize({
      requireAllSignatures: false,
    });
    expect(serializedTransaction.constructor).to.equal(Uint8Array);
    expect(Buffer.from(serializedTransaction)).to.eql(
      expectedSerializationWithNoSignatures,
    );

    // Properly signed transaction succeeds
    await expectedTransaction.partialSign(sender);
    expect(expectedTransaction.signatures).to.have.length(1);
    const expectedSerialization = Buffer.from(
      'AVuErQHaXv0SG0/PchunfxHKt8wMRfMZzqV0tkC5qO6owYxWU2v871AoWywGoFQr4z+q/7mE8lIufNl/' +
        'kxj+nQ0BAAEDE5j2LG0aRXxRumpLXz29L2n8qTIWIY3ImX5Ba9F9k8r9Q5/Mtmcn8onFxt47xKj+XdXX' +
        'd3C8j/FcPu7csUrz/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxJrndgN4IFTxep3s6kO0' +
        'ROug7bEsbx0xxuDkqEvwUusBAgIAAQwCAAAAMQAAAAAAAAA=',
      'base64',
    );
    expect(Buffer.from(await expectedTransaction.serialize())).to.eql(
      expectedSerialization,
    );
    expect(expectedTransaction.signatures).to.have.length(1);
  });

  it('throws for invalid signatures', async function () {
    const sender = await Keypair.fromSeed(Uint8Array.from(Array(32).fill(8))); // Arbitrary known account
    const recentBlockhash = blockhash(
      'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k',
    ); // Arbitrary known recentBlockhash
    const recipient = new Address(
      'J3dxNj7nDRRqRRXuEMynDG57DkZK4jYRuv3Garmb1i99',
    ); // Arbitrary known public key
    const transfer = SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient,
      lamports: 49,
    });
    const sampleTransaction = new Transaction({
      blockhash: recentBlockhash,
      lastValidBlockHeight: 9999,
    }).add(transfer);
    sampleTransaction.feePayer = sender.publicKey;

    // Transactions with missing signatures will fail sigverify.
    await expectPromiseToReject(
      sampleTransaction.serialize(),
      `Signature verification failed.\nMissing signature for public key [\`${sender.publicKey.toBase58()}\`].`,
    );

    // Serializing without signatures is allowed if sigverify disabled.
    await sampleTransaction.serialize({verifySignatures: false});

    // Serializing the message is allowed when signature array has null signatures
    sampleTransaction.serializeMessage();

    sampleTransaction.feePayer = undefined;
    sampleTransaction.setSigners(sender.publicKey);
    expect(sampleTransaction.signatures).to.have.length(1);
    sampleTransaction.signatures[0].signature = new Uint8Array(64).fill(0);

    // Transactions with invalid signature will fail sigverify.
    await expectPromiseToReject(
      sampleTransaction.serialize(),
      `Signature verification failed.\nInvalid signature for public key [\`${sender.publicKey.toBase58()}\`].`,
    );

    const tempKey = await generateKeypair();
    sampleTransaction.feePayer = tempKey.publicKey;
    sampleTransaction.signatures[0] = {
      signature: null,
      publicKey: tempKey.publicKey,
    };
    sampleTransaction.signatures[1] = {
      signature: Buffer.allocUnsafe(64).fill(42),
      publicKey: sender.publicKey,
    };

    // Transactions with invalid signature and missing signature will fail sigverify and throw both.
    await expectPromiseToReject(
      sampleTransaction.serialize(),
      `Signature verification failed.\nInvalid signature for public key [\`${sender.publicKey.toBase58()}\`].\nMissing signature for public key [\`${tempKey.publicKey.toBase58()}\`].`,
    );
  });

  describe('partially signed transaction signature verification tests', () => {
    let sender: Keypair;
    let feePayer: Keypair;
    let fakeKey: Keypair;
    const recentBlockhash = blockhash(
      'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k',
    ); // Arbitrary known recentBlockhash
    let transfer: TransactionInstruction;

    before(async () => {
      sender = await Keypair.fromSeed(Uint8Array.from(Array(32).fill(8)));
      feePayer = await Keypair.fromSeed(Uint8Array.from(Array(32).fill(9)));
      fakeKey = await Keypair.fromSeed(Uint8Array.from(Array(32).fill(10)));
      const recipient = new Address(
        'J3dxNj7nDRRqRRXuEMynDG57DkZK4jYRuv3Garmb1i99',
      ); // Arbitrary known public key
      transfer = SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: recipient,
        lamports: 49,
      });
    });

    let expectedTransaction: Transaction;
    beforeEach(() => {
      expectedTransaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      }).add(transfer);
      // To have 2 required signers we add a feepayer
      expectedTransaction.feePayer = feePayer.publicKey;
    });

    it('verifies for no sigs', async () => {
      expect(expectedTransaction.signatures).to.have.length(0);

      // No extra param should require all sigs, should be false for no sigs
      expect(await expectedTransaction.verifySignatures()).to.be.false;

      // True should require all sigs, should be false for no sigs
      expect(await expectedTransaction.verifySignatures(true)).to.be.false;

      // False should verify only the available sigs, should be true for no sigs
      expect(await expectedTransaction.verifySignatures(false)).to.be.true;
    });

    it('verifies for one sig', async () => {
      // Add one required sig
      await expectedTransaction.partialSign(sender);

      expect(
        expectedTransaction.signatures.filter(sig => sig.signature !== null),
      ).to.have.length(1);

      // No extra param should require all sigs, should be false for one missing sig
      expect(await expectedTransaction.verifySignatures()).to.be.false;

      // True should require all sigs, should be false one missing sigs
      expect(await expectedTransaction.verifySignatures(true)).to.be.false;

      // False should verify only the available sigs, should be true one valid sig
      expect(await expectedTransaction.verifySignatures(false)).to.be.true;
    });

    it('verifies for all sigs', async () => {
      // Add all required sigs
      await expectedTransaction.partialSign(sender);
      await expectedTransaction.partialSign(feePayer);

      expect(
        expectedTransaction.signatures.filter(sig => sig.signature !== null),
      ).to.have.length(2);

      // No extra param should require all sigs, should be true for no missing sig
      expect(await expectedTransaction.verifySignatures()).to.be.true;

      // True should require all sigs, should be true for no missing sig
      expect(await expectedTransaction.verifySignatures(true)).to.be.true;

      // False should verify only the available sigs, should be true for no missing sig
      expect(await expectedTransaction.verifySignatures(false)).to.be.true;
    });

    it('throws for wrong sig with only one sig present', async () => {
      // Add one required sigs
      await expectedTransaction.partialSign(feePayer);

      // Add a wrong signature
      expectedTransaction.signatures[0].publicKey = fakeKey.publicKey;

      // No extra param should require all sigs, should throw for wrong sig
      await expectPromiseToReject(
        expectedTransaction.verifySignatures(),
        'unknown signer: ' + fakeKey.publicKey.toBase58(),
      );

      // True should require all sigs, should throw for wrong sig
      await expectPromiseToReject(
        expectedTransaction.verifySignatures(true),
        'unknown signer: ' + fakeKey.publicKey.toBase58(),
      );

      // False should verify only the available sigs, should throw for wrong sig
      await expectPromiseToReject(
        expectedTransaction.verifySignatures(false),
        'unknown signer: ' + fakeKey.publicKey.toBase58(),
      );
    });

    it('throws for wrong sig with all sigs present', async () => {
      // Add all required sigs
      await expectedTransaction.partialSign(sender);
      await expectedTransaction.partialSign(feePayer);

      // Add a wrong signature
      expectedTransaction.signatures[0].publicKey = fakeKey.publicKey;

      // No extra param should require all sigs, should throw for wrong sig
      await expectPromiseToReject(
        expectedTransaction.verifySignatures(),
        'unknown signer: ' + fakeKey.publicKey.toBase58(),
      );

      // True should require all sigs, should throw for wrong sig
      await expectPromiseToReject(
        expectedTransaction.verifySignatures(true),
        'unknown signer: ' + fakeKey.publicKey.toBase58(),
      );

      // False should verify only the available sigs, should throw for wrong sig
      await expectPromiseToReject(
        expectedTransaction.verifySignatures(false),
        'unknown signer: ' + fakeKey.publicKey.toBase58(),
      );
    });
  });

  it('deprecated - externally signed stake delegate', async () => {
    const authority = await Keypair.fromSeed(
      Uint8Array.from(Array(32).fill(1)),
    );
    const stake = new Address(2);
    const recentBlockhash = new Address(3).toBytes();
    const vote = new Address(4);
    const tx = StakeProgram.delegate({
      stakePubkey: stake,
      authorizedPubkey: authority.publicKey,
      votePubkey: vote,
    });
    const from = authority;
    tx.recentBlockhash = BLOCKHASH_DECODER.decode(recentBlockhash);
    tx.setSigners(from.publicKey);
    const tx_bytes = tx.serializeMessage();
    const signature = await sign(tx_bytes, from.secretKey);
    tx.addSignature(from.publicKey, signature);
    expect(await tx.verifySignatures()).to.be.true;
  });

  it('externally signed stake delegate', async () => {
    const authority = await Keypair.fromSeed(
      Uint8Array.from(Array(32).fill(1)),
    );
    const stake = new Address(2);
    const recentBlockhash = new Address(3).toBytes();
    const vote = new Address(4);
    const tx = StakeProgram.delegate({
      stakePubkey: stake,
      authorizedPubkey: authority.publicKey,
      votePubkey: vote,
    });
    const from = authority;
    tx.recentBlockhash = BLOCKHASH_DECODER.decode(recentBlockhash);
    tx.feePayer = from.publicKey;
    const tx_bytes = tx.serializeMessage();
    const signature = await sign(tx_bytes, from.secretKey);
    tx.addSignature(from.publicKey, signature);
    expect(tx.signature?.constructor).to.equal(Uint8Array);
    expect(tx.signature).to.eql(signature);
    expect(tx.signature).to.not.equal(signature);
    expect(await tx.verifySignatures()).to.be.true;
  });

  it('preserves Uint8Array instruction data added from plain objects', async () => {
    const payer = await generateKeypair();
    const programId = (await generateKeypair()).publicKey;
    const recentBlockhash = await generateBlockhash();
    const data = new Uint8Array([1, 2, 3]);

    const transaction = new Transaction({
      blockhash: recentBlockhash,
      feePayer: payer.publicKey,
      lastValidBlockHeight: 9999,
    }).add({
      keys: [{pubkey: payer.publicKey, isSigner: true, isWritable: true}],
      programId,
      data,
    });

    expect(transaction.instructions[0].data).to.equal(data);
    expect(transaction.compileMessage().instructions[0].data).to.eql(
      BASE58_DECODER.decode(data),
    );
  });

  it('normalizes Uint8Array assigned to TransactionInstruction.data', () => {
    const instruction = new TransactionInstruction({
      keys: [],
      programId: getUniqueAddress(),
    });
    const data = new Uint8Array([1, 2, 3]);

    instruction.data = data;

    expect(instruction.data.constructor).to.equal(Uint8Array);
    expect(instruction.data).to.equal(data);
  });

  it('normalizes Buffer assigned to TransactionInstruction.data to Uint8Array storage', () => {
    const instruction = new TransactionInstruction({
      keys: [],
      programId: getUniqueAddress(),
    });
    const data = Buffer.from([1, 2, 3]);

    instruction.data = data;

    expect(instruction.data.constructor).to.equal(Uint8Array);
    expect(instruction.data).to.eql(data);
    expect(instruction.data).to.not.equal(data);
  });

  it('normalizes externally added Uint8Array signatures to Uint8Array storage', async () => {
    const authority = await Keypair.fromSeed(
      Uint8Array.from(Array(32).fill(1)),
    );
    const stake = new Address(2);
    const recentBlockhash = new Address(3).toBytes();
    const vote = new Address(4);
    const tx = StakeProgram.delegate({
      stakePubkey: stake,
      authorizedPubkey: authority.publicKey,
      votePubkey: vote,
    });

    tx.recentBlockhash = BLOCKHASH_DECODER.decode(recentBlockhash);
    tx.feePayer = authority.publicKey;

    const signature = new Uint8Array(
      await sign(tx.serializeMessage(), authority.secretKey),
    );

    tx.addSignature(authority.publicKey, signature);

    expect(tx.signature?.constructor).to.equal(Uint8Array);
    expect(tx.signature).to.eql(signature);
    expect(tx.signature).to.not.equal(signature);
    expect(await tx.verifySignatures()).to.be.true;
  });

  it('normalizes Uint8Array signatures provided via constructor fields', async () => {
    const signer = await generateKeypair();
    const signature = new Uint8Array(64).fill(7);
    const transaction = new Transaction({
      recentBlockhash: await generateBlockhash(),
      signatures: [{publicKey: signer.publicKey, signature}],
    });

    expect(transaction.signatures[0].signature?.constructor).to.equal(
      Uint8Array,
    );
    expect(transaction.signatures[0].signature).to.eql(signature);
    expect(transaction.signatures[0].signature).to.not.equal(signature);
  });

  it('normalizes Buffer signatures provided via constructor fields', async () => {
    const signer = await generateKeypair();
    const signature = Buffer.alloc(64, 7);
    const transaction = new Transaction({
      recentBlockhash: await generateBlockhash(),
      signatures: [{publicKey: signer.publicKey, signature}],
    });

    expect(transaction.signatures[0].signature?.constructor).to.equal(
      Uint8Array,
    );
    expect(transaction.signatures[0].signature).to.eql(signature);
    expect(transaction.signatures[0].signature).to.not.equal(signature);
  });

  it('can serialize, deserialize, and reserialize with a partial signer', async function () {
    const signer = await generateKeypair();
    const acc0Writable = await generateKeypair();
    const acc1Writable = await generateKeypair();
    const acc2Writable = await generateKeypair();
    const t0 = new Transaction({
      blockhash: blockhash('HZaTsZuhN1aaz9WuuimCFMyH7wJ5xiyMUHFCnZSMyguH'),
      feePayer: signer.publicKey,
      lastValidBlockHeight: 9999,
    });
    const programId1 = (await generateKeypair()).publicKey;
    const programId2 = (await generateKeypair()).publicKey;
    const programId3 = (await generateKeypair()).publicKey;
    const programId4 = (await generateKeypair()).publicKey;
    t0.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: signer.publicKey,
            isWritable: true,
            isSigner: true,
          },
          {
            pubkey: acc0Writable.publicKey,
            isWritable: true,
            isSigner: false,
          },
        ],
        programId: programId1,
      }),
    );
    t0.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: acc1Writable.publicKey,
            isWritable: false,
            isSigner: false,
          },
        ],
        programId: programId2,
      }),
    );
    t0.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: acc2Writable.publicKey,
            isWritable: true,
            isSigner: false,
          },
        ],
        programId: programId3,
      }),
    );
    t0.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: signer.publicKey,
            isWritable: true,
            isSigner: true,
          },
          {
            pubkey: acc0Writable.publicKey,
            isWritable: false,
            isSigner: false,
          },
          {
            pubkey: acc2Writable.publicKey,
            isWritable: false,
            isSigner: false,
          },
          {
            pubkey: acc1Writable.publicKey,
            isWritable: true,
            isSigner: false,
          },
        ],
        programId: programId4,
      }),
    );
    const t1 = Transaction.from(
      await t0.serialize({requireAllSignatures: false}),
    );
    await t1.partialSign(signer);
    await t1.serialize();
  });

  it('deserializes from Buffer, sliced Uint8Array, and Array<number> inputs', async function () {
    const sender = await Keypair.fromSeed(Uint8Array.from(Array(32).fill(8)));
    const recentBlockhash = blockhash(
      'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k',
    );
    const recipient = new Address(
      'J3dxNj7nDRRqRRXuEMynDG57DkZK4jYRuv3Garmb1i99',
    );
    const transaction = new Transaction({
      blockhash: recentBlockhash,
      feePayer: sender.publicKey,
      lastValidBlockHeight: 9999,
    }).add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: recipient,
        lamports: 49,
      }),
    );
    await transaction.sign(sender);

    const serialized = await transaction.serialize();
    const slicedBytes = new Uint8Array(serialized.length + 6);
    slicedBytes.set(serialized, 3);
    const slicedView = slicedBytes.subarray(3, 3 + serialized.length);

    const deserialized = Transaction.from(serialized);
    expect(deserialized.instructions[0].data.constructor).to.equal(Uint8Array);
    expect(deserialized.data.constructor).to.equal(Uint8Array);
    expect(Buffer.from(deserialized.instructions[0].data)).to.eql(
      Buffer.from(transaction.instructions[0].data),
    );

    expect(await deserialized.serialize()).to.eql(serialized);
    expect(await Transaction.from(slicedView).serialize()).to.eql(serialized);
    expect(await Transaction.from(Array.from(serialized)).serialize()).to.eql(
      serialized,
    );
  });
});

describe('VersionedTransaction', () => {
  it('deserializes versioned transactions', () => {
    const serializedVersionedTx = Buffer.from(
      'AdTIDASR42TgVuXKkd7mJKk373J3LPVp85eyKMVcrboo9KTY8/vm6N/Cv0NiHqk2I8iYw6VX5ZaBKG8z' +
        '9l1XjwiAAQACA+6qNbqfjaIENwt9GzEK/ENiB/ijGwluzBUmQ9xlTAMcCaS0ctnyxTcXXlJr7u2qtnaM' +
        'gIAO2/c7RBD0ipHWUcEDBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAAJbI7VNs6MzREUlnzRaJ' +
        'pBKP8QQoDn2dWQvD0KIgHFDiAwIACQAgoQcAAAAAAAIABQEAAAQAATYPBwAKBDIBAyQWIw0oCxIdCA4i' +
        'JzQRKwUZHxceHCohMBUJJiwpMxAaGC0TLhQxGyAMBiU2NS8VDgAAAADuAgAAAAAAAAIAAAAAAAAAAdGCT' +
        'Qiq5yw3+3m1sPoRNj0GtUNNs0FIMocxzt3zuoSZHQABAwQFBwgLDA8RFBcYGhwdHh8iIyUnKiwtLi8yF' +
        'wIGCQoNDhASExUWGRsgISQmKCkrMDEz',
      'base64',
    );

    expect(() => Transaction.from(serializedVersionedTx)).to.throw(
      'Versioned messages must be deserialized with VersionedMessage.deserialize()',
    );

    const versionedTx = VersionedTransaction.deserialize(serializedVersionedTx);
    expect(versionedTx.message.version).to.eq(0);
  });

  it('signs with async signer without secretKey', async function () {
    const payer = await generateKeypair();
    const recentBlockhash = await generateBlockhash();
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash,
      instructions: [],
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(message);
    await versionedTx.sign([payer]);
    expect(Buffer.from(versionedTx.signatures[0])).to.not.eql(Buffer.alloc(64));
  });

  it('signs with a raw Kit key pair signer', async function () {
    const payer = await generateKeyPairSigner();
    const recentBlockhash = await generateBlockhash();
    const message = new TransactionMessage({
      payerKey: new Address(payer.address),
      recentBlockhash,
      instructions: [],
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(message);
    await versionedTx.sign([payer]);
    expect(Buffer.from(versionedTx.signatures[0])).to.not.eql(Buffer.alloc(64));
  });

  describe('addSignature', () => {
    let signer1: Keypair;
    let signer2: Keypair;
    let signer3: Keypair;

    const recentBlockhash = new Address(3).toBytes();
    let transaction: VersionedTransaction;

    before(async () => {
      signer1 = await Keypair.generate();
      signer2 = await Keypair.generate();
      signer3 = await Keypair.generate();
    });

    beforeEach(() => {
      const message = new TransactionMessage({
        payerKey: signer1.publicKey,
        instructions: [
          new TransactionInstruction({
            data: new TextEncoder().encode('Hello!'),
            keys: [
              {
                pubkey: signer1.publicKey,
                isSigner: true,
                isWritable: true,
              },
              {
                pubkey: signer2.publicKey,
                isSigner: true,
                isWritable: true,
              },
              {
                pubkey: signer3.publicKey,
                isSigner: false,
                isWritable: false,
              },
            ],
            programId: new Address(
              'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
            ),
          }),
        ],
        recentBlockhash: BLOCKHASH_DECODER.decode(recentBlockhash),
      });
      transaction = new VersionedTransaction(message.compileToV0Message());
    });

    it('appends externally generated signatures at correct indexes', async () => {
      const signature1 = await sign(
        transaction.message.serialize(),
        signer1.secretKey,
      );
      const signature2 = await sign(
        transaction.message.serialize(),
        signer2.secretKey,
      );

      transaction.addSignature(signer2.publicKey, signature2);
      transaction.addSignature(signer1.publicKey, signature1);

      expect(transaction.signatures).to.have.length(2);
      expect(transaction.signatures[0]).to.eq(signature1);
      expect(transaction.signatures[1]).to.eq(signature2);
    });

    it('fatals when the signature is the wrong length', () => {
      expect(() => {
        transaction.addSignature(signer1.publicKey, new Uint8Array(32));
      }).to.throw('Signature must be 64 bytes long');
    });

    it('fatals when adding a signature for a public key that has not been marked as a signer', () => {
      expect(() => {
        transaction.addSignature(signer3.publicKey, new Uint8Array(64));
      }).to.throw(
        `Can not add signature; \`${signer3.publicKey.toBase58()}\` is not required to sign this transaction`,
      );
    });
  });

  describe('add(InstructionPlan)', () => {
    const makeKitIx = (
      programAddress: Address,
      payload: number,
    ): KitInstruction => ({
      accounts: [],
      data: new Uint8Array([payload]),
      programAddress: programAddress.toBase58(),
    });

    it('flattens a SingleInstructionPlan into one instruction', () => {
      const programId = getUniqueAddress();
      const tx = new Transaction().add(
        singleInstructionPlan(makeKitIx(programId, 7)),
      );

      expect(tx.instructions).to.have.length(1);
      expect(tx.instructions[0].programId.toBase58()).to.eq(
        programId.toBase58(),
      );
      expect(tx.instructions[0].data).to.eql(new Uint8Array([7]));
    });

    it('flattens a SequentialInstructionPlan preserving order', () => {
      const programA = getUniqueAddress();
      const programB = getUniqueAddress();
      const tx = new Transaction().add(
        sequentialInstructionPlan([
          makeKitIx(programA, 1),
          makeKitIx(programB, 2),
        ]),
      );

      expect(tx.instructions).to.have.length(2);
      expect(tx.instructions[0].programId.toBase58()).to.eq(
        programA.toBase58(),
      );
      expect(tx.instructions[0].data).to.eql(new Uint8Array([1]));
      expect(tx.instructions[1].programId.toBase58()).to.eq(
        programB.toBase58(),
      );
      expect(tx.instructions[1].data).to.eql(new Uint8Array([2]));
    });

    it('flattens nested sequential plans', () => {
      const [a, b, c] = [
        getUniqueAddress(),
        getUniqueAddress(),
        getUniqueAddress(),
      ];
      const tx = new Transaction().add(
        sequentialInstructionPlan([
          makeKitIx(a, 1),
          sequentialInstructionPlan([makeKitIx(b, 2), makeKitIx(c, 3)]),
        ]),
      );
      expect(tx.instructions.map(ix => ix.programId.toBase58())).to.eql([
        a.toBase58(),
        b.toBase58(),
        c.toBase58(),
      ]);
      expect(tx.instructions.map(ix => ix.data[0])).to.eql([1, 2, 3]);
    });

    it('maps Kit AccountRole onto legacy isSigner/isWritable', () => {
      const programId = getUniqueAddress();
      const writableSigner = getUniqueAddress();
      const readonlySigner = getUniqueAddress();
      const writable = getUniqueAddress();
      const readonly = getUniqueAddress();
      const ix: KitInstruction = {
        accounts: [
          {
            address: writableSigner.toBase58(),
            role: AccountRole.WRITABLE_SIGNER,
          },
          {
            address: readonlySigner.toBase58(),
            role: AccountRole.READONLY_SIGNER,
          },
          {address: writable.toBase58(), role: AccountRole.WRITABLE},
          {address: readonly.toBase58(), role: AccountRole.READONLY},
        ],
        data: new Uint8Array([0]),
        programAddress: programId.toBase58(),
      };

      const tx = new Transaction().add(singleInstructionPlan(ix));

      const [k0, k1, k2, k3] = tx.instructions[0].keys;
      expect(k0).to.deep.include({isSigner: true, isWritable: true});
      expect(k1).to.deep.include({isSigner: true, isWritable: false});
      expect(k2).to.deep.include({isSigner: false, isWritable: true});
      expect(k3).to.deep.include({isSigner: false, isWritable: false});
    });

    it('mixes InstructionPlan inputs with other accepted inputs in a single call', () => {
      const programId = getUniqueAddress();
      const legacyIx = new TransactionInstruction({
        keys: [],
        programId,
        data: Buffer.from([9]),
      });

      const tx = new Transaction().add(
        legacyIx,
        sequentialInstructionPlan([makeKitIx(programId, 1)]),
        makeKitIx(programId, 2),
      );

      expect(tx.instructions.map(ix => ix.data[0])).to.eql([9, 1, 2]);
    });

    it('flattens a real codama-client plan (getCreateMintInstructionPlan)', async () => {
      const {TOKEN_PROGRAM_ADDRESS, getCreateMintInstructionPlan} =
        await import('@solana-program/token');

      const payer = await generateKeypair();
      const newMint = await generateKeypair();

      const mintPlan = await getCreateMintInstructionPlan(new Connection(url), {
        decimals: 6,
        mintAccountLamports: 1461600,
        mintAuthority: payer.address,
        newMint,
        payer,
      });

      const tx = new Transaction().add(mintPlan);

      expect(tx.instructions).to.have.length(2);

      const [createAccount, initMint] = tx.instructions;
      expect(createAccount.programId.toBase58()).to.eq(
        SystemProgram.programId.toBase58(),
      );
      expect(createAccount.keys.map(k => k.pubkey.toBase58())).to.eql([
        payer.address.toString(),
        newMint.address.toString(),
      ]);
      // Both accounts are WRITABLE_SIGNER in createAccount.
      expect(createAccount.keys.every(k => k.isSigner && k.isWritable)).to.be
        .true;

      expect(initMint.programId.toBase58()).to.eq(TOKEN_PROGRAM_ADDRESS);
      expect(initMint.keys).to.have.length(1);
      expect(initMint.keys[0].pubkey.toBase58()).to.eq(
        newMint.address.toString(),
      );
      expect(initMint.keys[0]).to.deep.include({
        isSigner: false,
        isWritable: true,
      });
    });

    it('throws "No instructions" when every input is an empty plan', () => {
      expect(() =>
        new Transaction().add(sequentialInstructionPlan([])),
      ).to.throw('No instructions');
    });

    it('throws when the plan resolves to a MessagePackerInstructionPlan leaf', () => {
      const programId = getUniqueAddress();
      const packer = getMessagePackerInstructionPlanFromInstructions([
        makeKitIx(programId, 1),
        makeKitIx(programId, 2),
      ]);

      expect(() => new Transaction().add(packer)).to.throw(
        /Unsupported InstructionPlan leaf kind/,
      );
    });
  });
});
