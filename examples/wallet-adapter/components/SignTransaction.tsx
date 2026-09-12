'use client';

import {getBase58Decoder} from '@solana/kit';
import {useConnection, useWallet} from '@solana/wallet-adapter';
import {Transaction} from '@solana/web3.js';
import {ActionButton} from './ActionButton';
import {memoInstruction} from './memo';
import {useNotify} from './Notifications';

export function SignTransaction() {
  const {connection} = useConnection();
  const {publicKey, signTransaction} = useWallet();
  const notify = useNotify();

  const onClick = async () => {
    try {
      if (!publicKey) throw new Error('Wallet not connected!');
      if (!signTransaction)
        throw new Error('Wallet does not support transaction signing!');

      const {blockhash} = await connection.getLatestBlockhash();
      const transaction = await signTransaction(
        new Transaction({feePayer: publicKey, recentBlockhash: blockhash}).add(
          memoInstruction(),
        ),
      );
      if (!transaction.signature) throw new Error('Transaction not signed!');

      const signature = getBase58Decoder().decode(transaction.signature);
      notify('info', `Transaction signed: ${signature}`);
      if (!(await transaction.verifySignatures()))
        throw new Error(`Transaction signature invalid! ${signature}`);
      notify('success', `Transaction signature valid! ${signature}`);
    } catch (error) {
      notify(
        'error',
        `Transaction signing failed! ${(error as Error).message}`,
      );
    }
  };

  return (
    <ActionButton
      onClick={onClick}
      disabled={!publicKey}
      unsupported={!!publicKey && !signTransaction}
    >
      Sign Transaction
    </ActionButton>
  );
}
