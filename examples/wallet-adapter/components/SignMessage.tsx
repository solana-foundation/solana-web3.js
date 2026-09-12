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

export function SignMessage() {
  const {address, signMessage} = useWallet();
  const notify = useNotify();

  const onClick = async () => {
    try {
      if (!address) throw new Error('Wallet not connected!');
      if (!signMessage)
        throw new Error('Wallet does not support message signing!');

      const message = new TextEncoder().encode(
        `${window.location.host} wants you to sign in with your Solana account:\n${address}\n\nPlease sign in.`,
      );
      const signature = await signMessage(message);

      const publicKey = await getPublicKeyFromAddress(toAddress(address));
      if (
        !(await verifySignature(
          publicKey,
          signature as SignatureBytes,
          message,
        ))
      )
        throw new Error('Message signature invalid!');
      notify(
        'success',
        `Message signature: ${getBase58Decoder().decode(signature)}`,
      );
    } catch (error) {
      notify('error', `Sign Message failed: ${(error as Error).message}`);
    }
  };

  return (
    <ActionButton
      onClick={onClick}
      disabled={!address}
      unsupported={!!address && !signMessage}
    >
      Sign Message
    </ActionButton>
  );
}
