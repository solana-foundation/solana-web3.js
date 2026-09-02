import {
  fixDecoderSize,
  fixEncoderSize,
  getArrayDecoder,
  getArrayEncoder,
  getBytesDecoder,
  getBytesEncoder,
  getShortU16Decoder,
  getShortU16Encoder,
  getStructDecoder,
  getStructEncoder,
  type MessagePartialSigner,
  type TransactionVersion,
} from '@solana/kit';

import {getEmbeddedSigners} from '../kit-adapters/embedded-signers';
import {
  getSignerPublicKey,
  signTransactionMessageBytes,
} from '../kit-adapters/signing';
import assert from '../utils/assert';
import type {PublicKey} from '../publickey';
import {VersionedMessage} from '../message/versioned';
import {
  SIGNATURE_LENGTH_IN_BYTES,
  V1_MESSAGE_PREFIX,
  VERSION_PREFIX_MASK,
} from './constants';

const SIGNATURE_ENCODER = fixEncoderSize(
  getBytesEncoder(),
  SIGNATURE_LENGTH_IN_BYTES,
);
const SIGNATURE_DECODER = fixDecoderSize(
  getBytesDecoder(),
  SIGNATURE_LENGTH_IN_BYTES,
);
const VERSIONED_TRANSACTION_ENCODER = getStructEncoder([
  [
    'signatures',
    getArrayEncoder(SIGNATURE_ENCODER, {size: getShortU16Encoder()}),
  ],
  ['serializedMessage', getBytesEncoder()],
]);
const VERSIONED_TRANSACTION_DECODER = getStructDecoder([
  [
    'signatures',
    getArrayDecoder(SIGNATURE_DECODER, {size: getShortU16Decoder()}),
  ],
  ['serializedMessage', getBytesDecoder()],
]);

export type {TransactionVersion};

/**
 * Versioned transaction class
 */
export class VersionedTransaction {
  signatures: Array<Uint8Array>;
  message: VersionedMessage;

  get version(): TransactionVersion {
    return this.message.version;
  }

  constructor(message: VersionedMessage, signatures?: Array<Uint8Array>) {
    if (signatures !== undefined) {
      assert(
        signatures.length === message.header.numRequiredSignatures,
        'Expected signatures length to be equal to the number of required signatures',
      );
      this.signatures = signatures;
    } else {
      const defaultSignatures = [];
      for (let i = 0; i < message.header.numRequiredSignatures; i++) {
        defaultSignatures.push(new Uint8Array(SIGNATURE_LENGTH_IN_BYTES));
      }
      this.signatures = defaultSignatures;
    }
    this.message = message;
  }

  serialize(): Uint8Array {
    const serializedMessage = this.message.serialize();

    for (const signature of this.signatures) {
      assert(
        signature.byteLength === SIGNATURE_LENGTH_IN_BYTES,
        'Signature must be 64 bytes long',
      );
    }

    // Version 1 transactions use a message-first envelope: the serialized
    // message is followed by `numRequiredSignatures` 64-byte signatures, with
    // no signature count prefix.
    if (this.message.version === 1) {
      const serializedTransaction = new Uint8Array(
        serializedMessage.length +
          this.signatures.length * SIGNATURE_LENGTH_IN_BYTES,
      );
      serializedTransaction.set(serializedMessage, 0);
      this.signatures.forEach((signature, index) => {
        serializedTransaction.set(
          signature,
          serializedMessage.length + index * SIGNATURE_LENGTH_IN_BYTES,
        );
      });
      return serializedTransaction;
    }

    return Uint8Array.from(
      VERSIONED_TRANSACTION_ENCODER.encode({
        signatures: this.signatures,
        serializedMessage,
      }),
    );
  }

  static deserialize(serializedTransaction: Uint8Array): VersionedTransaction {
    // The first byte discriminates the two wire envelopes. Legacy and v0
    // transactions are serialized signatures first, so their first byte is a
    // shortU16 signature count whose high bit is never set for a transaction
    // that fits in a packet. A v1 transaction is serialized message first, so
    // its first byte is the v1 message version byte.
    const prefix = serializedTransaction[0];
    if ((prefix & ~VERSION_PREFIX_MASK) !== 0) {
      if (prefix !== V1_MESSAGE_PREFIX) {
        if ((prefix & VERSION_PREFIX_MASK) === 0) {
          throw new Error(
            'Version 0 transactions must be serialized signatures first',
          );
        }
        throw new Error(`Invalid transaction discriminator ${prefix}`);
      }
      const numSignatures = serializedTransaction[1];
      const messageLength =
        serializedTransaction.length -
        numSignatures * SIGNATURE_LENGTH_IN_BYTES;
      assert(
        messageLength > 0,
        'Transaction is too short for the number of signatures it requires',
      );
      const message = VersionedMessage.deserialize(
        serializedTransaction.subarray(0, messageLength),
      );
      const signatures = [];
      for (let i = 0; i < numSignatures; i++) {
        const offset = messageLength + i * SIGNATURE_LENGTH_IN_BYTES;
        signatures.push(
          Uint8Array.from(
            serializedTransaction.subarray(
              offset,
              offset + SIGNATURE_LENGTH_IN_BYTES,
            ),
          ),
        );
      }
      return new VersionedTransaction(message, signatures);
    }

    const {serializedMessage, signatures} =
      VERSIONED_TRANSACTION_DECODER.decode(serializedTransaction);
    const message = VersionedMessage.deserialize(
      Uint8Array.from(serializedMessage),
    );
    assert(
      message.version !== 1,
      'Invalid message version for a signatures-first transaction',
    );
    return new VersionedTransaction(
      message,
      signatures.map(signature => Uint8Array.from(signature)),
    );
  }

  /**
   * Sign the transaction with the given signers, plus any required signers embedded in
   * the kit instructions the message was compiled from. 
   * Calling `sign()` with no arguments signs
   * with the embedded signers alone.
   */
  async sign(signers: Array<MessagePartialSigner> = []) {
    const messageData = this.message.serialize();
    const signerPubkeys = this.message.staticAccountKeys.slice(
      0,
      this.message.header.numRequiredSignatures,
    );
    const requiredSignerAddresses = new Set(
      signerPubkeys.map(pubkey => pubkey.toBase58()),
    );
    const signersByAddress = new Map<string, MessagePartialSigner>();
    for (const signer of getEmbeddedSigners(this.message)) {
      if (requiredSignerAddresses.has(signer.address)) {
        signersByAddress.set(signer.address, signer);
      }
    }
    for (const signer of signers) {
      signersByAddress.set(signer.address, signer);
    }
    for (const signer of signersByAddress.values()) {
      const signerPublicKey = getSignerPublicKey(signer);
      const signerIndex = signerPubkeys.findIndex(pubkey =>
        pubkey.equals(signerPublicKey),
      );
      assert(
        signerIndex >= 0,
        `Cannot sign with non signer key ${signerPublicKey.toBase58()}`,
      );

      // `MessagePartialSigner` cannot supply transaction lifetime info,
      // so the optional `signatures` and `lifetimeConstraint` parameters of
      // `signTransactionMessageBytes` are unused on this path.
      const signature = await signTransactionMessageBytes(
        signer,
        messageData,
        signerPubkeys,
      );

      if (signature === undefined) {
        continue;
      }
      assert(
        signature.byteLength === SIGNATURE_LENGTH_IN_BYTES,
        'Signature must be 64 bytes long',
      );
      this.signatures[signerIndex] = signature;
    }
  }

  addSignature(publicKey: PublicKey, signature: Uint8Array) {
    assert(signature.byteLength === 64, 'Signature must be 64 bytes long');
    const signerPubkeys = this.message.staticAccountKeys.slice(
      0,
      this.message.header.numRequiredSignatures,
    );
    const signerIndex = signerPubkeys.findIndex(pubkey =>
      pubkey.equals(publicKey),
    );
    assert(
      signerIndex >= 0,
      `Can not add signature; \`${publicKey.toBase58()}\` is not required to sign this transaction`,
    );
    this.signatures[signerIndex] = signature;
  }
}
