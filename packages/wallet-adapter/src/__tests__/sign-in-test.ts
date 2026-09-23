import {
  createSignableMessage,
  generateKeyPairSigner,
  getAddressEncoder,
  getOffchainMessageV1Encoder,
  type Address,
  type KeyPairSigner,
} from '@solana/kit';
import {createSignInMessageText} from '@solana/wallet-standard-util';
import {beforeAll, describe, expect, it} from 'vitest';
import {verifySignIn} from '../sign-in.js';

let signer: KeyPairSigner;
let other: KeyPairSigner;
const input = {
  domain: 'example.com',
  nonce: 'abc123',
  statement: 'Please sign in.',
};

beforeAll(async () => {
  [signer, other] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);
});

async function signBytes(who: KeyPairSigner, bytes: Uint8Array) {
  const [signatures] = await who.signMessages([createSignableMessage(bytes)]);
  return new Uint8Array(signatures![who.address]!);
}

function account(who: KeyPairSigner) {
  return {
    address: who.address,
    chains: ['solana:devnet' as const],
    features: ['solana:signIn' as const],
    publicKey: new Uint8Array(getAddressEncoder().encode(who.address)),
  };
}

async function offchainOutput({
  by = signer,
  signedBy = by,
  text = createSignInMessageText({...input, address: by.address}),
  signatories = [by.address],
}: {
  by?: KeyPairSigner;
  signedBy?: KeyPairSigner;
  text?: string;
  signatories?: Address[];
} = {}) {
  const signedMessage = new Uint8Array(
    getOffchainMessageV1Encoder().encode({
      content: text,
      requiredSignatories: signatories.map(address => ({address})),
      version: 1,
    }),
  );
  return {
    account: account(by),
    signature: await signBytes(signedBy, signedMessage),
    signedMessage,
    signedMessageFormat: {
      kind: 'offchainMessage' as const,
      messageVersion: 1 as const,
    },
  };
}

describe('verifySignIn', () => {
  it('accepts a valid offchain sign-in', async () => {
    expect(await verifySignIn(input, await offchainOutput())).toBe(true);
  });

  it('accepts an offchain sign-in for the requested address', async () => {
    const output = await offchainOutput();
    expect(
      await verifySignIn({...input, address: signer.address}, output),
    ).toBe(true);
  });

  it('rejects an offchain sign-in from an account other than the requested one', async () => {
    const output = await offchainOutput();
    expect(await verifySignIn({...input, address: other.address}, output)).toBe(
      false,
    );
  });

  it('rejects an offchain sign-in whose text names a different account', async () => {
    const output = await offchainOutput({
      text: createSignInMessageText({...input, address: other.address}),
    });
    expect(await verifySignIn(input, output)).toBe(false);
  });

  it('rejects an offchain sign-in whose text differs from the input', async () => {
    const output = await offchainOutput({
      text: createSignInMessageText({
        ...input,
        address: signer.address,
        statement: 'Something else.',
      }),
    });
    expect(await verifySignIn(input, output)).toBe(false);
  });

  it('rejects an offchain sign-in that requires a different signatory', async () => {
    const output = await offchainOutput({signatories: [other.address]});
    expect(await verifySignIn(input, output)).toBe(false);
  });

  it('rejects an offchain sign-in signed by another key', async () => {
    const output = await offchainOutput({signedBy: other});
    expect(await verifySignIn(input, output)).toBe(false);
  });

  it('rejects an offchain sign-in whose bytes are not an offchain message', async () => {
    const output = await offchainOutput();
    expect(
      await verifySignIn(input, {
        ...output,
        signedMessage: new TextEncoder().encode('not an offchain message'),
      }),
    ).toBe(false);
  });

  it('verifies a plain sign-in through wallet-standard-util', async () => {
    const signedMessage = new TextEncoder().encode(
      createSignInMessageText({...input, address: signer.address}),
    );
    const output = {
      account: account(signer),
      signature: await signBytes(signer, signedMessage),
      signedMessage,
    };
    expect(await verifySignIn(input, output)).toBe(true);
    expect(await verifySignIn({...input, statement: 'Nope.'}, output)).toBe(
      false,
    );
  });
});
