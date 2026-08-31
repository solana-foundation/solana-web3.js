import {getNonceDecoder, getNonceSize} from '@solana-program/system';

import type {Blockhash} from './blockhash';
import assert from './utils/assert';
import {PublicKey} from './publickey';
import {toUint8ArrayView} from './utils/typed-array';

const NONCE_ACCOUNT_DECODER = getNonceDecoder();

export const NONCE_ACCOUNT_LENGTH = getNonceSize();

/**
 * A durable nonce is a 32 byte value encoded as a base58 string.
 */
export type DurableNonce = Blockhash;

type NonceAccountArgs = {
  authorizedPubkey: PublicKey;
  nonce: DurableNonce;

  /**
   * @deprecated Since Solana v1.8.0.
   */
  feeCalculator: {
    lamportsPerSignature: number;
  };
};

/**
 * NonceAccount class
 */
export class NonceAccount {
  authorizedPubkey: PublicKey;
  nonce: DurableNonce;
  feeCalculator: {
    lamportsPerSignature: number;
  };

  /**
   * @internal
   */
  constructor(args: NonceAccountArgs) {
    this.authorizedPubkey = args.authorizedPubkey;
    this.nonce = args.nonce;
    this.feeCalculator = args.feeCalculator;
  }

  /**
   * Deserialize NonceAccount from the account data.
   *
   * @param buffer account data
   * @return NonceAccount
   */
  static fromAccountData(buffer: Uint8Array | Array<number>): NonceAccount {
    const nonceAccount = NONCE_ACCOUNT_DECODER.decode(toUint8ArrayView(buffer));

    assert(
      nonceAccount.lamportsPerSignature <= BigInt(Number.MAX_SAFE_INTEGER),
      'lamportsPerSignature exceeds safe integer range',
    );

    return new NonceAccount({
      authorizedPubkey: new PublicKey(nonceAccount.authority),
      nonce: new PublicKey(nonceAccount.blockhash).toBase58(),
      feeCalculator: {
        lamportsPerSignature: Number(nonceAccount.lamportsPerSignature),
      },
    });
  }
}
