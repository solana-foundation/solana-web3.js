import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  Transaction,
  Ed25519Program,
} from '../../src';
import {sign} from '../../src/utils/ed25519';
import {url} from '../url';

use(chaiAsPromised);

const textEncoder = new TextEncoder();

const ED25519_INSTRUCTION_HEADER_SIZE = 16;
const PUBLIC_KEY_BYTES = 32;
const SIGNATURE_BYTES = 64;

const readEd25519InstructionHeader = (data: Buffer) => {
  const view = new DataView(
    data.buffer,
    data.byteOffset,
    ED25519_INSTRUCTION_HEADER_SIZE,
  );

  return {
    numSignatures: view.getUint8(0),
    padding: view.getUint8(1),
    signatureOffset: view.getUint16(2, true),
    signatureInstructionIndex: view.getUint16(4, true),
    publicKeyOffset: view.getUint16(6, true),
    publicKeyInstructionIndex: view.getUint16(8, true),
    messageDataOffset: view.getUint16(10, true),
    messageDataSize: view.getUint16(12, true),
    messageInstructionIndex: view.getUint16(14, true),
  };
};

describe('ed25519 header encoding', () => {
  it('encodes default instruction indexes and offsets', async () => {
    const keypair = await Keypair.generate();
    const publicKey = keypair.publicKey.toBytes();
    const message = textEncoder.encode('header test');
    const signature = await sign(message, keypair.secretKey);

    const instruction = Ed25519Program.createInstructionWithPublicKey({
      publicKey,
      message,
      signature,
    });

    const data = Buffer.from(instruction.data);
    const header = readEd25519InstructionHeader(data);
    const publicKeyOffset = ED25519_INSTRUCTION_HEADER_SIZE;
    const signatureOffset = publicKeyOffset + PUBLIC_KEY_BYTES;
    const messageDataOffset = signatureOffset + SIGNATURE_BYTES;

    expect(header).to.eql({
      numSignatures: 1,
      padding: 0,
      signatureOffset,
      signatureInstructionIndex: 0xffff,
      publicKeyOffset,
      publicKeyInstructionIndex: 0xffff,
      messageDataOffset,
      messageDataSize: message.length,
      messageInstructionIndex: 0xffff,
    });
    expect(data.length).to.eq(messageDataOffset + message.length);
    expect(
      data.subarray(publicKeyOffset, publicKeyOffset + PUBLIC_KEY_BYTES),
    ).to.eql(Buffer.from(publicKey));
    expect(
      data.subarray(signatureOffset, signatureOffset + SIGNATURE_BYTES),
    ).to.eql(Buffer.from(signature));
    expect(data.subarray(messageDataOffset)).to.eql(message);
  });

  it('encodes explicit instruction index', async () => {
    const keypair = await Keypair.generate();
    const publicKey = keypair.publicKey.toBytes();
    const message = textEncoder.encode('header index');
    const signature = await sign(message, keypair.secretKey);
    const instructionIndex = 7;

    const instruction = Ed25519Program.createInstructionWithPublicKey({
      publicKey,
      message,
      signature,
      instructionIndex,
    });

    const data = Buffer.from(instruction.data);
    const header = readEd25519InstructionHeader(data);

    expect(header.signatureInstructionIndex).to.eq(instructionIndex);
    expect(header.publicKeyInstructionIndex).to.eq(instructionIndex);
    expect(header.messageInstructionIndex).to.eq(instructionIndex);
  });

  it('encodes zero-length message', async () => {
    const keypair = await Keypair.generate();
    const publicKey = keypair.publicKey.toBytes();
    const message = new Uint8Array(0);
    const signature = await sign(message, keypair.secretKey);

    const instruction = Ed25519Program.createInstructionWithPublicKey({
      publicKey,
      message,
      signature,
    });

    const data = Buffer.from(instruction.data);
    const header = readEd25519InstructionHeader(data);
    const publicKeyOffset = ED25519_INSTRUCTION_HEADER_SIZE;
    const signatureOffset = publicKeyOffset + PUBLIC_KEY_BYTES;
    const messageDataOffset = signatureOffset + SIGNATURE_BYTES;

    expect(header.messageDataSize).to.eq(0);
    expect(header.messageDataOffset).to.eq(messageDataOffset);
    expect(data.length).to.eq(messageDataOffset);
  });
});

describe('ed25519 instruction validation', () => {
  const message = textEncoder.encode('validation');

  it('rejects invalid public key length', () => {
    const publicKey = new Uint8Array(PUBLIC_KEY_BYTES - 1);
    const signature = new Uint8Array(SIGNATURE_BYTES);

    expect(() =>
      Ed25519Program.createInstructionWithPublicKey({
        publicKey,
        message,
        signature,
      }),
    ).to.throw('Public Key must be 32 bytes');
  });

  it('rejects invalid signature length', async () => {
    const keypair = await Keypair.generate();
    const publicKey = keypair.publicKey.toBytes();
    const signature = new Uint8Array(SIGNATURE_BYTES - 1);

    expect(() =>
      Ed25519Program.createInstructionWithPublicKey({
        publicKey,
        message,
        signature,
      }),
    ).to.throw('Signature must be 64 bytes');
  });

  it('rejects invalid private key length', async () => {
    const privateKey = new Uint8Array(63);

    await expect(
      Ed25519Program.createInstructionWithPrivateKey({
        privateKey,
        message,
      }),
    ).to.be.rejectedWith('Private key must be 64 bytes');
  });

  it('rejects out-of-range instruction index', async () => {
    const keypair = await Keypair.generate();
    const publicKey = keypair.publicKey.toBytes();
    const signature = await sign(message, keypair.secretKey);

    expect(() =>
      Ed25519Program.createInstructionWithPublicKey({
        publicKey,
        message,
        signature,
        instructionIndex: 0x1_0000,
      }),
    ).to.throw();
  });

  it('matches instruction data built from private key', async () => {
    const keypair = await Keypair.generate();
    const publicKey = keypair.publicKey.toBytes();
    const signature = await sign(message, keypair.secretKey);

    const withPublicKey = Ed25519Program.createInstructionWithPublicKey({
      publicKey,
      message,
      signature,
    });
    const withPrivateKey = await Ed25519Program.createInstructionWithPrivateKey(
      {
        privateKey: keypair.secretKey,
        message,
      },
    );

    expect(Buffer.from(withPrivateKey.data)).to.eql(
      Buffer.from(withPublicKey.data),
    );
  });

  it('accepts Uint8Array inputs when building from a private key', async () => {
    const keypair = await Keypair.generate();
    const messageBytes = textEncoder.encode('uint8 private key');

    const withBuffer = await Ed25519Program.createInstructionWithPrivateKey({
      privateKey: Buffer.from(keypair.secretKey),
      message: Buffer.from(messageBytes),
    });
    const withUint8Array = await Ed25519Program.createInstructionWithPrivateKey(
      {
        privateKey: Uint8Array.from(keypair.secretKey),
        message: messageBytes,
      },
    );

    expect(withUint8Array.data.constructor).to.equal(Uint8Array);
    expect(Buffer.from(withUint8Array.data)).to.eql(
      Buffer.from(withBuffer.data),
    );
  });
});

if (process.env.TEST_LIVE) {
  describe('ed25519', () => {
    let privateKey: Uint8Array;
    let publicKey: Uint8Array;
    let from: Keypair;
    const connection = new Connection(url, 'confirmed');

    before(async function () {
      const keypair = await Keypair.generate();
      privateKey = keypair.secretKey;
      publicKey = keypair.publicKey.toBytes();
      from = await Keypair.generate();
      await connection.confirmTransaction(
        await connection.requestAirdrop(from.publicKey, 10 * LAMPORTS_PER_SOL),
      );
    });

    it('create ed25519 instruction', async () => {
      const message = textEncoder.encode('string address');
      const signature = await sign(message, privateKey);
      const transaction = new Transaction().add(
        Ed25519Program.createInstructionWithPublicKey({
          publicKey,
          message,
          signature,
        }),
      );

      await sendAndConfirmTransaction(connection, transaction, [from]);
    });

    it('create ed25519 instruction with private key', async () => {
      const message = textEncoder.encode('private key');
      const instruction = await Ed25519Program.createInstructionWithPrivateKey({
        privateKey,
        message,
      });
      const transaction = new Transaction().add(instruction);

      await sendAndConfirmTransaction(connection, transaction, [from]);
    });
  });
}
