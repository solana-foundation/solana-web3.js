import {
  fixDecoderSize,
  getBytesDecoder,
  getStructDecoder,
  getU32Decoder,
  getU64Decoder,
} from '@solana/kit';

import assert from './utils/assert';
import {Address} from './address';
import {toUint8ArrayView} from './utils/typed-array';

const U32_DECODER = getU32Decoder();
const U64_DECODER = getU64Decoder();
const BYTES_DECODER = getBytesDecoder();

/**
 * See https://github.com/anza-xyz/solana-sdk/blob/e7db3b9d9f61efcb8fa2547f7371a4be2b6942d7/nonce/src/state.rs
 *
 * @internal
 */
const NONCE_ACCOUNT_DECODER = getStructDecoder([
  ['version', U32_DECODER],
  ['state', U32_DECODER],
  ['authorizedPubkey', fixDecoderSize(BYTES_DECODER, 32)],
  ['nonce', fixDecoderSize(BYTES_DECODER, 32)],
  ['lamportsPerSignature', U64_DECODER],
]);

export const NONCE_ACCOUNT_LENGTH = 80;

/**
 * A durable nonce is a 32 byte value encoded as a base58 string.
 */
export type DurableNonce = string;

type NonceAccountArgs = {
  authorizedPubkey: Address;
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
  authorizedPubkey: Address;
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
      authorizedPubkey: new Address(nonceAccount.authorizedPubkey),
      nonce: new Address(toUint8ArrayView(nonceAccount.nonce)).toString(),
      feeCalculator: {
        lamportsPerSignature: Number(nonceAccount.lamportsPerSignature),
      },
    });
  }
}
