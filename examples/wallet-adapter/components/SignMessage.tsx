'use client';

import {getBase58Decoder} from '@solana/kit';
import {useWallet} from '@solana/wallet-adapter';
import {ActionButton} from './ActionButton';
import {useNotify} from './Notifications';

export function SignMessage() {
  const {publicKey, signMessage} = useWallet();
  const notify = useNotify();

  const onClick = async () => {
    try {
      if (!publicKey) throw new Error('Wallet not connected!');
      if (!signMessage)
        throw new Error('Wallet does not support message signing!');

      const message = new TextEncoder().encode(
        `${window.location.host} wants you to sign in with your Solana account:\n${publicKey.toBase58()}\n\nPlease sign in.`,
      );
      const signature = await signMessage(message);

      if (!(await publicKey.verifySignature(signature, message)))
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
      disabled={!publicKey}
      unsupported={!!publicKey && !signMessage}
    >
      Sign Message
    </ActionButton>
  );
}
