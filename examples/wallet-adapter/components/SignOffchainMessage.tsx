'use client';

import type {SignatureBytes} from '@solana/kit';
import {
  address as toAddress,
  getBase58Decoder,
  getPublicKeyFromAddress,
  verifySignature,
} from '@solana/kit';
import {useWallet} from '@solana/wallet-adapter';
import {ActionButton} from './ActionButton';
import {useNotify} from './Notifications';

export function SignOffchainMessage() {
  const {address, signOffchainMessage} = useWallet();
  const notify = useNotify();

  const onClick = async () => {
    try {
      if (!address) throw new Error('Wallet not connected!');
      if (!signOffchainMessage)
        throw new Error('Wallet does not support offchain message signing!');

      notify('info', 'Waiting for the wallet to sign the offchain message…');
      const {signature, signedOffchainMessage} = await signOffchainMessage(
        `${window.location.host} wants you to sign an offchain message.`,
      );

      const publicKey = await getPublicKeyFromAddress(toAddress(address));
      if (
        !(await verifySignature(
          publicKey,
          signature as SignatureBytes,
          signedOffchainMessage,
        ))
      )
        throw new Error('Offchain message signature invalid!');
      notify(
        'success',
        `Offchain message signature: ${getBase58Decoder().decode(signature)}`,
      );
    } catch (error) {
      notify(
        'error',
        `Sign Offchain Message failed: ${(error as Error).message}`,
      );
    }
  };

  return (
    <ActionButton
      onClick={onClick}
      disabled={!address}
      unsupported={!!address && !signOffchainMessage}
    >
      Sign Offchain Message
    </ActionButton>
  );
}
