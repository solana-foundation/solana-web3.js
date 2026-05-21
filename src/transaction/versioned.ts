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
  type TransactionVersion,
} from '@solana/kit';

import {
  getSignerPublicKey,
  signTransactionMessageBytes,
} from '../kit-adapters/signing';
import type {MessageSigner} from '../keypair';
import assert from '../utils/assert';
import type {Address} from '../address';
import {VersionedMessage} from '../message/versioned';
import {SIGNATURE_LENGTH_IN_BYTES} from './constants';

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

    return Uint8Array.from(
      VERSIONED_TRANSACTION_ENCODER.encode({
        signatures: this.signatures,
        serializedMessage,
      }),
    );
  }

  static deserialize(serializedTransaction: Uint8Array): VersionedTransaction {
    const {serializedMessage, signatures} =
      VERSIONED_TRANSACTION_DECODER.decode(serializedTransaction);
    const message = VersionedMessage.deserialize(
      Uint8Array.from(serializedMessage),
    );
    return new VersionedTransaction(
      message,
      signatures.map(signature => Uint8Array.from(signature)),
    );
  }

  async sign(signers: Array<MessageSigner>) {
    const messageData = this.message.serialize();
    const signerPubkeys = this.message.staticAccountKeys.slice(
      0,
      this.message.header.numRequiredSignatures,
    );
    for (const signer of signers) {
      const signerPublicKey = getSignerPublicKey(signer);
      const signerIndex = signerPubkeys.findIndex(pubkey =>
        pubkey.equals(signerPublicKey),
      );
      assert(
        signerIndex >= 0,
        `Cannot sign with non signer key ${signerPublicKey.toBase58()}`,
      );

      // `MessageSigner` excludes transaction-only Kit signers (those
      // without `signMessages`), so the optional `signatures` and
      // `lifetimeConstraint` parameters of `signTransactionMessageBytes`
      // are unused on this path and we pass the defaults.
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

  addSignature(publicKey: Address, signature: Uint8Array) {
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
