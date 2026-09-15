import {
  createSignableMessage,
  generateKeyPairSigner,
  getBase58Encoder,
  getBase64Decoder,
  getTransactionCodec,
  type KeyPairSigner,
} from '@solana/kit';
import {createSignInMessage} from '@solana/wallet-standard-util';

const STANDARD_FEATURES = [
  'standard:connect',
  'standard:disconnect',
  'standard:events',
  'solana:signMessage',
  'solana:signTransaction',
  'solana:signAndSendTransaction',
  'solana:signIn',
  'solana:signOffchainMessage',
] as const;

export type TestWalletFeature = (typeof STANDARD_FEATURES)[number];

export interface TestWalletOptions {
  accounts?: number;
  chains?: readonly `solana:${string}`[];
  features?: readonly TestWalletFeature[];
  icon?: `data:image/png;base64,${string}`;
  name?: string;
  /** JSON-RPC endpoint used by `solana:signAndSendTransaction` to submit. */
  rpcUrl?: string;
  signers?: readonly KeyPairSigner[];
  supportedTransactionVersions?: readonly ('legacy' | 0 | 1)[];
}

async function signWireTransaction(
  signer: KeyPairSigner,
  wire: Uint8Array,
): Promise<Uint8Array> {
  const codec = getTransactionCodec();
  const transaction = codec.decode(wire) as Parameters<
    KeyPairSigner['signTransactions']
  >[0][number];
  const [signatures] = await signer.signTransactions([transaction]);
  return new Uint8Array(
    codec.encode({
      ...transaction,
      signatures: {...transaction.signatures, ...signatures},
    }),
  );
}

/**
 * A Wallet Standard wallet whose accounts sign for real with Kit keypairs, so
 * signatures verify and transactions land on a live validator. A
 * generalization of `standardWallet` in `../helpers.tsx` for end-to-end tests.
 */
export async function createTestWallet(options: TestWalletOptions = {}) {
  const {
    chains = ['solana:devnet'] as const,
    features = [
      'standard:connect',
      'standard:disconnect',
      'standard:events',
      'solana:signMessage',
      'solana:signTransaction',
    ] as readonly TestWalletFeature[],
    icon = 'data:image/png;base64,',
    name = 'Test wallet',
    rpcUrl,
    supportedTransactionVersions = ['legacy', 0] as const,
  } = options;
  const signers =
    options.signers ??
    (await Promise.all(
      Array.from({length: options.accounts ?? 1}, generateKeyPairSigner),
    ));
  const base58 = getBase58Encoder();
  const accountFeatures = features.filter(feature =>
    feature.startsWith('solana:'),
  );
  const accounts = signers.map(signer => ({
    address: signer.address as string,
    chains,
    features: accountFeatures,
    publicKey: new Uint8Array(base58.encode(signer.address)),
  }));
  function signerFor(address: string): KeyPairSigner {
    const signer = signers.find(candidate => candidate.address === address);
    if (!signer) throw new Error(`Unknown test wallet account ${address}.`);
    return signer;
  }
  function accountFor(address: string) {
    const account = accounts.find(candidate => candidate.address === address);
    if (!account) throw new Error(`Unknown test wallet account ${address}.`);
    return account;
  }
  async function signBytes(
    signer: KeyPairSigner,
    bytes: Uint8Array,
  ): Promise<Uint8Array> {
    const [signatures] = await signer.signMessages([
      createSignableMessage(bytes),
    ]);
    return new Uint8Array(signatures![signer.address]!);
  }
  // Real wallets expose no accounts until the user approves a connection.
  let connectedAccounts: typeof accounts = [];
  const listeners = new Set<() => void>();
  async function sendSignedTransaction(signed: Uint8Array): Promise<string> {
    if (!rpcUrl) {
      throw new Error(
        'Pass `rpcUrl` to createTestWallet to use solana:signAndSendTransaction.',
      );
    }
    const response = await fetch(rpcUrl, {
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'sendTransaction',
        params: [
          getBase64Decoder().decode(signed),
          {encoding: 'base64', preflightCommitment: 'confirmed'},
        ],
      }),
      headers: {'content-type': 'application/json'},
      method: 'POST',
    });
    const {result, error} = (await response.json()) as {
      error?: {message: string};
      result?: string;
    };
    if (!result) throw new Error(error?.message ?? 'sendTransaction failed.');
    return result;
  }
  const allFeatures = {
    'standard:connect': {
      version: '1.0.0' as const,
      connect: async () => {
        connectedAccounts = accounts;
        return {accounts: connectedAccounts};
      },
    },
    'standard:disconnect': {
      version: '1.0.0' as const,
      disconnect: async () => {
        connectedAccounts = [];
      },
    },
    'standard:events': {
      version: '1.0.0' as const,
      on: (_event: string, listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    'solana:signMessage': {
      version: '1.0.0' as const,
      signMessage: async (
        ...inputs: readonly {
          account: {address: string};
          message: Uint8Array;
        }[]
      ) =>
        Promise.all(
          inputs.map(async ({account, message}) => ({
            signature: await signBytes(signerFor(account.address), message),
            signedMessage: message,
          })),
        ),
    },
    'solana:signIn': {
      version: '1.0.0' as const,
      signIn: async (
        ...inputs: readonly {
          address?: string;
          domain?: string;
          [field: string]: unknown;
        }[]
      ) =>
        Promise.all(
          (inputs.length ? inputs : [{}]).map(async input => {
            const account = accountFor(input.address ?? accounts[0]!.address);
            const signedMessage = createSignInMessage({
              ...input,
              address: account.address,
              domain: input.domain ?? window.location.host,
            });
            return {
              account,
              signature: await signBytes(
                signerFor(account.address),
                signedMessage,
              ),
              signedMessage,
            };
          }),
        ),
    },
    'solana:signOffchainMessage': {
      version: '1.0.0' as const,
      supportedMessageVersions: [1] as const,
      signOffchainMessage: async (
        ...inputs: readonly {
          account: {address: string};
          message: string;
        }[]
      ) =>
        Promise.all(
          inputs.map(async ({account, message}) => {
            const signedOffchainMessage = new TextEncoder().encode(message);
            return {
              signature: await signBytes(
                signerFor(account.address),
                signedOffchainMessage,
              ),
              signedOffchainMessage,
            };
          }),
        ),
    },
    'solana:signTransaction': {
      version: '1.0.0' as const,
      supportedTransactionVersions,
      signTransaction: async (
        ...inputs: readonly {
          account: {address: string};
          transaction: Uint8Array;
        }[]
      ) =>
        Promise.all(
          inputs.map(async ({account, transaction}) => ({
            signedTransaction: await signWireTransaction(
              signerFor(account.address),
              transaction,
            ),
          })),
        ),
    },
    'solana:signAndSendTransaction': {
      version: '1.0.0' as const,
      supportedTransactionVersions,
      signAndSendTransaction: async (
        ...inputs: readonly {
          account: {address: string};
          transaction: Uint8Array;
        }[]
      ) =>
        Promise.all(
          inputs.map(async ({account, transaction}) => {
            const signed = await signWireTransaction(
              signerFor(account.address),
              transaction,
            );
            const signature = await sendSignedTransaction(signed);
            return {signature: new Uint8Array(base58.encode(signature))};
          }),
        ),
    },
  };
  const wallet = {
    version: '1.0.0' as const,
    name,
    icon,
    chains,
    get accounts() {
      return connectedAccounts;
    },
    features: Object.fromEntries(
      features.map(feature => [feature, allFeatures[feature]]),
    ),
  };
  return {accounts, listeners, signers, wallet};
}
