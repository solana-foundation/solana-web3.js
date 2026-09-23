'use client';

import {getBase58Decoder} from '@solana/kit';
import type {SolanaSignInInput} from '@solana/wallet-adapter';
import {useWallet, verifySignIn} from '@solana/wallet-adapter';
import {ActionButton} from './ActionButton';
import {useNotify} from './Notifications';

export function SignIn({offchain = false}: {offchain?: boolean}) {
  const {address, connected, signIn, supportsSignInWithOffchainMessage} =
    useWallet();
  const supported = offchain ? supportsSignInWithOffchainMessage : !!signIn;
  const notify = useNotify();
  const label = offchain ? 'Sign In (Offchain)' : 'Sign In';

  const onClick = async () => {
    try {
      if (!signIn)
        throw new Error('Wallet does not support Sign In With Solana!');

      const input: SolanaSignInInput = {
        address: address ?? undefined,
        domain: window.location.host,
        statement: 'Please sign in.',
        ...(offchain && {useOffchainMessage: {messageVersion: 1}}),
      };
      const output = await signIn(input);

      if (!(await verifySignIn(input, output)))
        throw new Error('Sign In verification failed!');
      notify(
        'success',
        `Message signature: ${getBase58Decoder().decode(output.signature)}`,
      );
    } catch (error) {
      notify('error', `${label} failed: ${(error as Error).message}`);
    }
  };

  return (
    <ActionButton
      onClick={onClick}
      disabled={!supported}
      unsupported={connected && !supported}
    >
      {label}
    </ActionButton>
  );
}
