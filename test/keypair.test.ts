import {expect} from 'chai';
import {
  createSignableMessage,
  type MessagePartialSigner,
  type TransactionPartialSigner,
} from '@solana/signers';

import {Keypair} from '../src';

describe('Keypair', function () {
  it('generate new keypair', async () => {
    const keypair = await Keypair.generate();
    expect(keypair.secretKey).to.have.length(64);
    expect(keypair.publicKey.toBytes()).to.have.length(32);
  });

  it('checks key generation availability before creating a keypair', async () => {
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'crypto',
    );
    if (!cryptoDescriptor) {
      throw new Error('globalThis.crypto descriptor is unavailable');
    }

    const originalCrypto = globalThis.crypto;
    const cryptoWithoutGenerateKey = {
      getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
      subtle: {},
    } as Crypto;

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      enumerable: cryptoDescriptor.enumerable,
      value: cryptoWithoutGenerateKey,
      writable: true,
    });

    let thrown = false;
    try {
      await Keypair.generate();
    } catch {
      thrown = true;
    } finally {
      Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
    }

    expect(thrown).to.be.true;
  });

  it('publicKey getter returns stable bytes across calls', async () => {
    const keypair = await Keypair.generate();
    const first = Buffer.from(keypair.publicKey.toBytes());
    const second = Buffer.from(keypair.publicKey.toBytes());

    expect(first).to.eql(second);
  });

  it('address getter matches publicKey and returns a stable base58 string', async () => {
    const keypair = await Keypair.generate();
    const first = keypair.address;
    const second = keypair.address;

    expect(first).to.eql(second);
    expect(first).to.eql(keypair.publicKey.toBase58());
  });

  it('satisfies the Kit partial signer shapes', async () => {
    const keypair = await Keypair.generate();
    const messageSigner: MessagePartialSigner = keypair;
    const transactionSigner: TransactionPartialSigner = keypair;

    const message = Buffer.from('kit signer message');
    const [signatureDictionary] = await messageSigner.signMessages([
      createSignableMessage(message),
    ]);
    const signature = signatureDictionary[keypair.address];

    expect(transactionSigner.address).to.eq(keypair.address);
    expect(signature).not.to.be.undefined;
    expect(await keypair.publicKey.verifySignature(signature!, message)).to.be
      .true;
  });

  it('two generated keypairs differ', async () => {
    const keypairA = await Keypair.generate();
    const keypairB = await Keypair.generate();

    expect(keypairA.publicKey.toBase58()).to.not.equal(
      keypairB.publicKey.toBase58(),
    );
  });

  it('create keypair from secret key', async () => {
    const secretKey = Buffer.from(
      'mdqVWeFekT7pqy5T49+tV12jO0m+ESW7ki4zSU9JiCgbL0kJbj5dvQ/PqcDAzZLZqzshVEs01d1KZdmLh4uZIg==',
      'base64',
    );
    const keypair = await Keypair.fromSecretKey(secretKey);
    expect(keypair.publicKey.toBase58()).to.eq(
      '2q7pyhPwAwZ3QMfZrnAbDhnh9mDUqycszcpf86VgQxhF',
    );
    expect(Buffer.from(keypair.secretKey)).to.eql(secretKey);
  });

  it('creating keypair from invalid secret key throws error', async () => {
    const secretKey = Buffer.from(
      'mdqVWeFekT7pqy5T49+tV12jO0m+ESW7ki4zSU9JiCgbL0kJbj5dvQ/PqcDAzZLZqzshVEs01d1KZdmLh4uZIG==',
      'base64',
    );
    let thrown = false;
    try {
      await Keypair.fromSecretKey(secretKey);
    } catch {
      thrown = true;
    }
    expect(thrown).to.be.true;
  });

  it('generate keypair from random seed', async () => {
    const keypair = await Keypair.fromSeed(Uint8Array.from(Array(32).fill(8)));
    expect(keypair.publicKey.toBase58()).to.eq(
      '2KW2XRd9kwqet15Aha2oK3tYvd3nWbTFH1MBiRAv1BE1',
    );
  });

  it('fromSeed defensively copies mutable input', async () => {
    const seed = Uint8Array.from(Array(32).fill(8));
    const keypairPromise = Keypair.fromSeed(seed);
    seed.fill(7);

    const keypair = await keypairPromise;
    const message = Buffer.from('fromSeed defensive copy');
    const signature = await keypair.signBytes(message);

    expect(await keypair.verifySignature(signature, message)).to.be.true;
    expect(await keypair.publicKey.verifySignature(signature, message)).to.be
      .true;
  });

  it('fromSecretKey defensively copies mutable input', async () => {
    const originalKeypair = await Keypair.generate();
    const secretKey = originalKeypair.secretKey;
    const keypairPromise = Keypair.fromSecretKey(secretKey);
    for (let ii = 0; ii < 32; ii++) {
      secretKey[ii] ^= 0xff;
    }

    const keypair = await keypairPromise;
    const message = Buffer.from('fromSecretKey defensive copy');
    const signature = await keypair.signBytes(message);

    expect(await keypair.verifySignature(signature, message)).to.be.true;
    expect(await keypair.publicKey.verifySignature(signature, message)).to.be
      .true;
  });

  it('signBytes returns 64 bytes for Uint8Array and Buffer', async () => {
    const keypair = await Keypair.generate();
    const bufferMessage = Buffer.from('buffer message');
    const uint8Message = Uint8Array.from([1, 2, 3, 4, 5, 6]);

    const bufferSignature = await keypair.signBytes(bufferMessage);
    const uint8Signature = await keypair.signBytes(uint8Message);

    expect(bufferSignature).to.have.length(64);
    expect(uint8Signature).to.have.length(64);
  });

  it('signs and verifies messages', async () => {
    const keypair = await Keypair.generate();
    const message = Buffer.from('keypair message');

    const signature = await keypair.signBytes(message);
    expect(signature).to.have.length(64);
    expect(await keypair.verifySignature(signature, message)).to.be.true;
    expect(await keypair.publicKey.verifySignature(signature, message)).to.be
      .true;
  });

  it('signing is deterministic for the same message', async () => {
    const keypair = await Keypair.generate();
    const message = Buffer.from('repeatable message');

    const signature1 = await keypair.signBytes(message);
    const signature2 = await keypair.signBytes(message);

    expect(Buffer.from(signature1)).to.eql(Buffer.from(signature2));
  });

  it('fails verification for the wrong message', async () => {
    const keypair = await Keypair.generate();
    const message = Buffer.from('keypair message');
    const signature = await keypair.signBytes(message);

    expect(
      await keypair.verifySignature(signature, Buffer.from('other message')),
    ).to.be.false;
  });

  it('fails verification for the wrong signature', async () => {
    const keypair = await Keypair.generate();
    const message = Buffer.from('keypair message');
    const signature = await keypair.signBytes(message);
    const wrongSignature = Uint8Array.from(signature);

    wrongSignature[0] ^= 0xff;

    expect(await keypair.verifySignature(wrongSignature, message)).to.be.false;
  });

  it('fails verification for a different public key', async () => {
    const keypair = await Keypair.generate();
    const otherKeypair = await Keypair.generate();
    const message = Buffer.from('keypair message');
    const signature = await keypair.signBytes(message);

    expect(await otherKeypair.publicKey.verifySignature(signature, message)).to
      .be.false;
    expect(await otherKeypair.verifySignature(signature, message)).to.be.false;
  });

  it('signs and verifies sliced buffers', async () => {
    const keypair = await Keypair.generate();
    const message = Buffer.from('sliced keypair message');
    const slice = message.subarray(1, message.length - 1);
    const signature = await keypair.signBytes(slice);

    expect(await keypair.verifySignature(signature, slice)).to.be.true;
    expect(await keypair.verifySignature(signature, message)).to.be.false;
  });
});
