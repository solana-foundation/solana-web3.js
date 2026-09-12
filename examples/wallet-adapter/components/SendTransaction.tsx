'use client';

import {useConnection, useWallet} from '@solana/wallet-adapter';
import type {TransactionSignature} from '@solana/web3.js';
import {Transaction} from '@solana/web3.js';
import {ActionButton} from './ActionButton';
import {memoInstruction} from './memo';
import {useNotify} from './Notifications';
import {supportsTransactionVersion} from './transactionVersion';

export function SendTransaction() {
  const {connection} = useConnection();
  const {publicKey, sendTransaction, supportedTransactionVersions} =
    useWallet();
  const notify = useNotify();
  const supported = supportsTransactionVersion(
    supportedTransactionVersions,
    'legacy',
  );

  const onClick = async () => {
    let signature: TransactionSignature | undefined;
    try {
      if (!publicKey) throw new Error('Wallet not connected!');
      if (!supported)
        throw new Error("Wallet doesn't support legacy transactions!");

      const {
        context: {slot: minContextSlot},
        value: {blockhash, lastValidBlockHeight},
      } = await connection.getLatestBlockhashAndContext();

      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(memoInstruction());

      signature = await sendTransaction(transaction, connection, {
        minContextSlot,
      });
      notify('info', 'Transaction sent:', signature);

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
      Send Transaction
    </ActionButton>
  );
}
