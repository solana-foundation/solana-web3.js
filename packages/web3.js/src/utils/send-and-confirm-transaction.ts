import type {TransactionPartialSigner} from '@solana/kit';
import {stringifyJsonWithBigInts} from '@solana/rpc-spec-types';

import {Connection, SignatureResult} from '../connection';
import {SystemInstruction} from '../programs/system';
import {Transaction} from '../transaction';
import type {ConfirmOptions} from '../connection';
import type {TransactionSignature} from '../transaction';
import {SendTransactionError} from '../errors';
import assert from './assert';

/**
 * Sign, send and confirm a transaction.
 *
 * If `commitment` option is not specified, defaults to 'finalized' commitment.
 *
 * @param {Connection} connection
 * @param {Transaction} transaction
 * @param {Array<TransactionPartialSigner>} signers
 * @param {ConfirmOptions} [options]
 * @returns {Promise<TransactionSignature>}
 */
export async function sendAndConfirmTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Array<TransactionPartialSigner>,
  options?: ConfirmOptions &
    Readonly<{
      // A signal that, when aborted, cancels any outstanding transaction confirmation operations
      abortSignal?: AbortSignal;
    }>,
): Promise<TransactionSignature> {
  const sendOptions = options && {
    skipPreflight: options.skipPreflight,
    preflightCommitment: options.preflightCommitment || options.commitment,
    maxRetries: options.maxRetries,
    minContextSlot: options.minContextSlot,
  };

  let nonceAccountPubkey;
  if (transaction.nonceInfo != null) {
    try {
      nonceAccountPubkey = SystemInstruction.decodeNonceAdvance(
        transaction.nonceInfo.nonceInstruction,
      ).noncePubkey;
    } catch {
      throw new Error(
        'Transaction nonceInfo must contain a valid advance nonce instruction',
      );
    }
  }

  const signature = await connection.sendTransaction(
    transaction,
    signers,
    sendOptions,
  );

  let status: SignatureResult;
  if (transaction.nonceInfo != null) {
    assert(nonceAccountPubkey != null);
    status = (
      await connection.confirmTransaction(
        {
          abortSignal: options?.abortSignal,
          minContextSlot: transaction.minNonceContextSlot,
          nonceAccountPubkey,
          nonceValue: transaction.nonceInfo.nonce,
          signature,
        },
        options && options.commitment,
      )
    ).value;
  } else if (
    transaction.recentBlockhash != null &&
    transaction.lastValidBlockHeight != null
  ) {
    status = (
      await connection.confirmTransaction(
        {
          abortSignal: options?.abortSignal,
          signature: signature,
          blockhash: transaction.recentBlockhash,
          lastValidBlockHeight: transaction.lastValidBlockHeight,
        },
        options && options.commitment,
      )
    ).value;
  } else {
    if (options?.abortSignal != null) {
      console.warn(
        'sendAndConfirmTransaction(): A transaction with a deprecated confirmation strategy was ' +
          'supplied along with an `abortSignal`. Only transactions having `lastValidBlockHeight` ' +
          'or `nonceInfo` are abortable.',
      );
    }
    status = (
      await connection.confirmTransaction(
        signature,
        options && options.commitment,
      )
    ).value;
  }

  if (status.err) {
    if (signature != null) {
      throw new SendTransactionError({
        action: 'send',
        signature: signature,
        transactionMessage: `Status: (${stringifyJsonWithBigInts(status)})`,
      });
    }
    throw new Error(
      `Transaction ${signature} failed (${stringifyJsonWithBigInts(status)})`,
    );
  }

  return signature;
}
