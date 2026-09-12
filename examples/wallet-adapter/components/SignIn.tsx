'use client';

import {getBase58Decoder} from '@solana/kit';
import type {SolanaSignInInput} from '@solana/wallet-adapter';
import {useWallet} from '@solana/wallet-adapter';
import {verifySignIn} from '@solana/wallet-standard-util';
import {ActionButton} from './ActionButton';
import {useNotify} from './Notifications';

export function SignIn() {
  const {address, connected, signIn} = useWallet();
  const notify = useNotify();

  const onClick = async () => {
    try {
      if (!signIn)
        throw new Error('Wallet does not support Sign In With Solana!');

      const input: SolanaSignInInput = {
        domain: window.location.host,
        address: address ?? undefined,
        statement: 'Please sign in.',
      };
      const output = await signIn(input);

      if (!verifySignIn(input, output))
        throw new Error('Sign In verification failed!');
      notify(
        'success',
        `Message signature: ${getBase58Decoder().decode(output.signature)}`,
      );
    } catch (error) {
      notify('error', `Sign In failed: ${(error as Error).message}`);
    }
  };

  return (
    <ActionButton
      onClick={onClick}
      disabled={!signIn}
      unsupported={connected && !signIn}
    >
      Sign In
    </ActionButton>
  );
}
