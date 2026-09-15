'use client';

import {useConnection, useWallet} from '@solana/wallet-adapter';
import type {TransactionSignature} from '@solana/web3.js';
import {TransactionMessage, VersionedTransaction} from '@solana/web3.js';
import {ActionButton} from './ActionButton';
import {selfTransferInstruction} from './selfTransfer';
import {useNotify} from './Notifications';
import {supportsTransactionVersion} from './transactionVersion';

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
        instructions: [selfTransferInstruction(publicKey)],
      });
      // v1 carries the compute budget in the message. Unset limits resolve to
      // zero, not to the legacy/v0 defaults, so both the compute unit limit
      // and the loaded accounts data size limit must be set explicitly. These
      // are generous static values; real applications should size them by
      // simulation (see `estimateResourceLimitsFactory` in @solana/kit).
      const transaction = new VersionedTransaction(
        message.compileToV1Message({
          computeUnitLimit: 50_000,
          loadedAccountsDataSizeLimit: 1024 * 1024,
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
