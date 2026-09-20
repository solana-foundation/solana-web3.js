'use client';

import type {Address, OffchainMessageBytes, SignatureBytes} from '@solana/kit';
import {
  assertOffchainMessageV1Equal,
  getBase58Decoder,
  getOffchainMessageV1Decoder,
  verifyOffchainMessageEnvelope,
} from '@solana/kit';
import type {
  SolanaSignInInput,
  SolanaSignInOutput,
} from '@solana/wallet-adapter';
import {useWallet} from '@solana/wallet-adapter';
import {
  createSignInMessageText,
  verifySignIn,
} from '@solana/wallet-standard-util';
import {ActionButton} from './ActionButton';
import {useNotify} from './Notifications';

async function verifyOffchainSignIn(
  input: SolanaSignInInput,
  output: SolanaSignInOutput,
): Promise<void> {
  if (output.signedMessageFormat?.kind !== 'offchainMessage')
    throw new Error('Wallet did not sign an offchain message!');
  const address = (input.address ?? output.account.address) as Address;
  if (output.account.address !== address)
    throw new Error('Wallet signed in with a different account!');
  const content = output.signedMessage as unknown as OffchainMessageBytes;
  assertOffchainMessageV1Equal(getOffchainMessageV1Decoder().decode(content), {
    content: createSignInMessageText({
      ...input,
      address,
      domain: input.domain ?? window.location.host,
    }),
    requiredSignatories: [{address}],
    version: 1,
  });
  await verifyOffchainMessageEnvelope({
    content,
    signatures: {[address]: output.signature as SignatureBytes},
  });
}

export function SignIn({offchain = false}: {offchain?: boolean}) {
  const {address, connected, signIn} = useWallet();
  const notify = useNotify();
  const label = offchain ? 'Sign In (Offchain)' : 'Sign In';

  const onClick = async () => {
    try {
      if (!signIn)
        throw new Error('Wallet does not support Sign In With Solana!');

      const input: SolanaSignInInput = {
        domain: window.location.host,
        address: address ?? undefined,
        statement: 'Please sign in.',
        ...(offchain && {useOffchainMessage: {messageVersion: 1}}),
      };
      const output = await signIn(input);

      if (offchain) await verifyOffchainSignIn(input, output);
      else if (!verifySignIn(input, output))
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
      disabled={!signIn}
      unsupported={connected && !signIn}
    >
      {label}
    </ActionButton>
  );
}
