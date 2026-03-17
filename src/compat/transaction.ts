import {ReadonlyUint8Array} from '@solana/codecs-core';
import {
  SOLANA_ERROR__TRANSACTION__MESSAGE_SIGNATURES_MISMATCH,
  SolanaError,
} from '@solana/errors';
import type {SignatureBytes} from '@solana/keys';
import {
  type SignaturesMap,
  Transaction,
  TransactionMessageBytes,
} from '@solana/transactions';
import type {PublicKey} from '../publickey';
import type {VersionedTransaction} from '../transaction';

function convertSignatures(
  transaction: VersionedTransaction,
  staticAccountKeys: PublicKey[],
): SignaturesMap {
  return Object.fromEntries(
    transaction.signatures.map((sig, index) => {
      const address = staticAccountKeys[index];
      if (sig.every(b => b === 0)) {
        // all-0 signatures are stored as null
        return [address, null];
      } else {
        return [address, sig as ReadonlyUint8Array as SignatureBytes];
      }
    }),
  );
}

/**
 * This can be used to convert a Web3.js [VersionedTransaction](https://solana-foundation.github.io/solana-web3.js/classes/VersionedTransaction.html)
 * object to a Kit {@link Transaction}.
 *
 * @example
 * ```ts
 * import { toKitTransaction } from '@solana/web3.js/compat';
 *
 * // Imagine a function that returns a Web3.js `VersionedTransaction`
 * const web3jsVersionedTransaction = getMyWeb3jsVersionedTransaction();
 * const transaction = toKitTransaction(web3jsVersionedTransaction);
 * ```
 */
export function toKitTransaction(
  transaction: VersionedTransaction,
): Transaction {
  const {message} = transaction;
  const staticAccountKeys = message.staticAccountKeys;

  const {numRequiredSignatures} = message.header;
  if (numRequiredSignatures !== transaction.signatures.length) {
    throw new SolanaError(
      SOLANA_ERROR__TRANSACTION__MESSAGE_SIGNATURES_MISMATCH,
      {
        numRequiredSignatures: transaction.message.header.numRequiredSignatures,
        signaturesLength: transaction.signatures.length,
        signerAddresses: staticAccountKeys
          .slice(0, numRequiredSignatures)
          .map(p => p.toBase58()),
      },
    );
  }

  const messageBytes =
    message.serialize() as ReadonlyUint8Array as TransactionMessageBytes;
  const signatures = convertSignatures(transaction, staticAccountKeys);

  return {
    messageBytes,
    signatures: Object.freeze(signatures),
  };
}
