'use client';

import {useConnection, useWallet} from '@solana/wallet-adapter';
import type {TransactionSignature} from '@solana/web3.js';
import {
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {ActionButton} from './ActionButton';
import {MEMO_PROGRAM_ID, MEMO_TEXT} from './memo';
import {useNotify} from './Notifications';
import {supportsTransactionVersion} from './transactionVersion';

// Wide enough that the serialized transaction exceeds the 1,232-byte limit of
// legacy and v0 transactions, so only a v1 transaction can carry it.
const LARGE_MEMO = Array.from({length: 30}, () => MEMO_TEXT).join(' ');

export function SendV1Transaction() {
  const {connection} = useConnection();
  const {publicKey, sendTransaction, supportedTransactionVersions} =
    useWallet();
  const notify = useNotify();
  const supported = supportsTransactionVersion(supportedTransactionVersions, 1);

  const onClick = async () => {
    let signature: TransactionSignature | undefined;
    try {
      if (!publicKey) throw new Error('Wallet not connected!');
      if (!supported)
        throw new Error("Wallet doesn't support v1 transactions!");

      const {
        context: {slot: minContextSlot},
        value: {blockhash, lastValidBlockHeight},
      } = await connection.getLatestBlockhashAndContext();

      const message = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [
          new TransactionInstruction({
            data: new TextEncoder().encode(LARGE_MEMO),
            keys: [],
            programId: MEMO_PROGRAM_ID,
          }),
        ],
      });
      // v1 carries the compute budget in the message; an unset limit is zero.
      const transaction = new VersionedTransaction(
        message.compileToV1Message({
          computeUnitLimit: 50_000,
          priorityFeeLamports: 1_000n,
        }),
      );

      signature = await sendTransaction(transaction, connection, {
        minContextSlot,
      });
      notify(
        'info',
        `V1 transaction sent (${transaction.serialize().length} bytes):`,
        signature,
      );

      const {value: status} = await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });
      if (status.err) throw new Error(JSON.stringify(status.err));
      notify('success', 'Transaction successful!', signature);
    } catch (error) {
      notify(
        'error',
        `Transaction failed! ${(error as Error).message}`,
        signature,
      );
    }
  };

  return (
    <ActionButton
      onClick={onClick}
      disabled={!publicKey}
      unsupported={!!publicKey && !supported}
    >
      Send V1 Transaction
    </ActionButton>
  );
}
