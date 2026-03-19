import {Buffer} from 'buffer';
import {randomBytes} from 'crypto';
import {keccak_256} from '@noble/hashes/sha3';
import {expect} from 'chai';

import {
  ecdsaSign,
  isValidPrivateKey,
  publicKeyCreate,
} from '../../src/utils/secp256k1';
import {
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  Transaction,
  Secp256k1Program,
} from '../../src';
import {url} from '../url';

const randomPrivateKey = () => {
  let privateKey;
  do {
    privateKey = randomBytes(32);
  } while (!isValidPrivateKey(privateKey));
  return privateKey;
};

describe('secp256k1 byte inputs', () => {
  it('accepts Uint8Array and Array<number> public keys', () => {
    const privateKey = randomPrivateKey();
    const publicKey = publicKeyCreate(
      privateKey,
      false /* isCompressed */,
    ).slice(1);
    const expected = Secp256k1Program.publicKeyToEthAddress(publicKey);
    const fromUint8Array = Secp256k1Program.publicKeyToEthAddress(
      Uint8Array.from(publicKey),
    );
    const fromNumberArray = Secp256k1Program.publicKeyToEthAddress(
      Array.from(publicKey),
    );

    expect(fromUint8Array).to.eql(expected);
    expect(fromNumberArray).to.eql(expected);
  });

  it('accepts Uint8Array and Array<number> when building instructions', () => {
    const privateKey = randomPrivateKey();
    const publicKey = publicKeyCreate(
      privateKey,
      false /* isCompressed */,
    ).slice(1);
    const message = Buffer.from('instruction bytes');
    const messageHash = Buffer.from(keccak_256(message));
    const [signature, recoveryId] = ecdsaSign(messageHash, privateKey);
    const ethAddress = Secp256k1Program.publicKeyToEthAddress(publicKey);

    const withBuffers = Secp256k1Program.createInstructionWithEthAddress({
      ethAddress,
      message,
      signature,
      recoveryId,
    });
    const withUint8Array = Secp256k1Program.createInstructionWithEthAddress({
      ethAddress: Uint8Array.from(ethAddress),
      message: Uint8Array.from(message),
      signature: Uint8Array.from(signature),
      recoveryId,
    });
    const withNumberArrays = Secp256k1Program.createInstructionWithPrivateKey({
      privateKey: Array.from(privateKey),
      message: Array.from(message),
    });
    const withUint8PrivateKey = Secp256k1Program.createInstructionWithPrivateKey(
      {
        privateKey: Uint8Array.from(privateKey),
        message: Uint8Array.from(message),
      },
    );

    expect(Buffer.isBuffer(withUint8Array.data)).to.be.true;
    expect(Buffer.isBuffer(withNumberArrays.data)).to.be.true;
    expect(Buffer.isBuffer(withUint8PrivateKey.data)).to.be.true;
    expect(Buffer.from(withUint8Array.data)).to.eql(Buffer.from(withBuffers.data));
    expect(Buffer.from(withUint8PrivateKey.data)).to.eql(
      Buffer.from(
        Secp256k1Program.createInstructionWithPrivateKey({
          privateKey,
          message,
        }).data,
      ),
    );
    expect(Buffer.from(withNumberArrays.data)).to.eql(
      Buffer.from(withUint8PrivateKey.data),
    );
  });

  it('accepts sliced Uint8Array views when deriving an Ethereum address', () => {
    const privateKey = randomPrivateKey();
    const publicKey = publicKeyCreate(
      privateKey,
      false /* isCompressed */,
    ).slice(1);
    const paddedPublicKey = new Uint8Array(2 + publicKey.length + 3);
    paddedPublicKey.set(publicKey, 2);
    const publicKeyView = paddedPublicKey.subarray(
      2,
      2 + publicKey.length,
    );

    expect(Secp256k1Program.publicKeyToEthAddress(publicKeyView)).to.eql(
      Secp256k1Program.publicKeyToEthAddress(publicKey),
    );
  });

  it('accepts sliced Uint8Array views when building instructions', () => {
    const privateKey = randomPrivateKey();
    const publicKey = publicKeyCreate(
      privateKey,
      false /* isCompressed */,
    ).slice(1);
    const message = Buffer.from('sliced instruction bytes');
    const messageHash = Buffer.from(keccak_256(message));
    const [signature, recoveryId] = ecdsaSign(messageHash, privateKey);
    const ethAddress = Secp256k1Program.publicKeyToEthAddress(publicKey);

    const paddedMessage = new Uint8Array(2 + message.length + 3);
    paddedMessage.set(message, 2);
    const messageView = paddedMessage.subarray(2, 2 + message.length);

    const paddedSignature = new Uint8Array(1 + signature.length + 2);
    paddedSignature.set(signature, 1);
    const signatureView = paddedSignature.subarray(1, 1 + signature.length);

    const paddedAddress = new Uint8Array(3 + ethAddress.length + 1);
    paddedAddress.set(ethAddress, 3);
    const addressView = paddedAddress.subarray(3, 3 + ethAddress.length);

    const paddedPrivateKey = new Uint8Array(4 + privateKey.length + 2);
    paddedPrivateKey.set(privateKey, 4);
    const privateKeyView = paddedPrivateKey.subarray(4, 4 + privateKey.length);

    const withViews = Secp256k1Program.createInstructionWithEthAddress({
      ethAddress: addressView,
      message: messageView,
      signature: signatureView,
      recoveryId,
    });
    const withPrivateKeyView = Secp256k1Program.createInstructionWithPrivateKey(
      {
        privateKey: privateKeyView,
        message: messageView,
      },
    );
    const expectedWithAddress = Secp256k1Program.createInstructionWithEthAddress(
      {
        ethAddress,
        message,
        signature,
        recoveryId,
      },
    );
    const expectedWithPrivateKey =
      Secp256k1Program.createInstructionWithPrivateKey({
        privateKey,
        message,
      });

    expect(Buffer.isBuffer(withViews.data)).to.be.true;
    expect(Buffer.isBuffer(withPrivateKeyView.data)).to.be.true;
    expect(Buffer.from(withViews.data)).to.eql(
      Buffer.from(expectedWithAddress.data),
    );
    expect(Buffer.from(withPrivateKeyView.data)).to.eql(
      Buffer.from(expectedWithPrivateKey.data),
    );
  });
});

if (process.env.TEST_LIVE) {
  describe('secp256k1', () => {
    const privateKey = randomPrivateKey();
    const publicKey = publicKeyCreate(
      privateKey,
      false /* isCompressed */,
    ).slice(1);
    const ethAddress = Secp256k1Program.publicKeyToEthAddress(publicKey);
    let from: Keypair;
    const connection = new Connection(url, 'confirmed');

    before(async function () {
      from = await Keypair.generate();
      await connection.confirmTransaction(
        await connection.requestAirdrop(from.publicKey, 10 * LAMPORTS_PER_SOL),
      );
    });

    it('create secp256k1 instruction with string address', async () => {
      const message = Buffer.from('string address');
      const messageHash = Buffer.from(keccak_256(message));
      const [signature, recoveryId] = ecdsaSign(messageHash, privateKey);
      const transaction = new Transaction().add(
        Secp256k1Program.createInstructionWithEthAddress({
          ethAddress: ethAddress.toString('hex'),
          message,
          signature,
          recoveryId,
        }),
      );

      await sendAndConfirmTransaction(connection, transaction, [from]);
    });

    it('create secp256k1 instruction with 0x prefix string address', async () => {
      const message = Buffer.from('0x string address');
      const messageHash = Buffer.from(keccak_256(message));
      const [signature, recoveryId] = ecdsaSign(messageHash, privateKey);
      const transaction = new Transaction().add(
        Secp256k1Program.createInstructionWithEthAddress({
          ethAddress: '0x' + ethAddress.toString('hex'),
          message,
          signature,
          recoveryId,
        }),
      );

      await sendAndConfirmTransaction(connection, transaction, [from]);
    });

    it('create secp256k1 instruction with buffer address', async () => {
      const message = Buffer.from('buffer address');
      const messageHash = Buffer.from(keccak_256(message));
      const [signature, recoveryId] = ecdsaSign(messageHash, privateKey);
      const transaction = new Transaction().add(
        Secp256k1Program.createInstructionWithEthAddress({
          ethAddress,
          message,
          signature,
          recoveryId,
        }),
      );

      await sendAndConfirmTransaction(connection, transaction, [from]);
    });

    it('create secp256k1 instruction with public key', async () => {
      const message = Buffer.from('public key');
      const messageHash = Buffer.from(keccak_256(message));
      const [signature, recoveryId] = ecdsaSign(messageHash, privateKey);
      const transaction = new Transaction().add(
        Secp256k1Program.createInstructionWithPublicKey({
          publicKey,
          message,
          signature,
          recoveryId,
        }),
      );

      await sendAndConfirmTransaction(connection, transaction, [from]);
    });

    it('create secp256k1 instruction with private key', async () => {
      const message = Buffer.from('private key');
      const transaction = new Transaction().add(
        Secp256k1Program.createInstructionWithPrivateKey({
          privateKey,
          message,
        }),
      );

      await sendAndConfirmTransaction(connection, transaction, [from]);
    });
  });
}
