import {
  createSignableMessage,
  generateKeyPairSigner,
  getBase58Encoder,
  getBase64Decoder,
  getCompiledTransactionMessageDecoder,
  getOffchainMessageV1Encoder,
  getTransactionCodec,
  type KeyPairSigner,
  type Address,
} from '@solana/kit';
import {createSignInMessageText} from '@solana/wallet-standard-util';

import {createApprovalQueue, type SigningMode} from './approvals.js';

export const AGENT_WALLET_FEATURES = [
  'standard:connect',
  'standard:disconnect',
  'standard:events',
  'solana:signMessage',
  'solana:signTransaction',
  'solana:signAndSendTransaction',
  'solana:signIn',
  'solana:signOffchainMessage',
] as const;

export type AgentWalletFeature = (typeof AGENT_WALLET_FEATURES)[number];

export interface AgentWalletOptions {
  accounts?: number;
  chains?: readonly `solana:${string}`[];
  /** Milliseconds every `auto` approval waits before signing. */
  delay?: number;
  features?: readonly AgentWalletFeature[];
  icon?: `data:image/${'gif' | 'png' | 'svg+xml' | 'webp'};base64,${string}`;
  /** `manual` holds every request until it is approved or rejected through `approvals`. */
  mode?: SigningMode;
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

/** What an approver sees of a transaction: its fee payer and the programs it invokes. */
function summarizeTransaction(wire: Uint8Array) {
  const {messageBytes} = getTransactionCodec().decode(wire);
  const message = getCompiledTransactionMessageDecoder().decode(messageBytes);
  const programIndices =
    message.version === 1
      ? message.instructionHeaders.map(header => header.programAccountIndex)
      : message.instructions.map(
          instruction => instruction.programAddressIndex,
        );
  const programs = [
    ...new Set(programIndices.map(index => message.staticAccounts[index]!)),
  ] as string[];
  return {
    feePayer: message.staticAccounts[0] as string,
    instructions: programIndices.length,
    programs,
    version: message.version,
  };
}

/**
 * A Wallet Standard wallet whose accounts sign for real with Kit keypairs, so
 * signatures verify and transactions land on a live validator. Every request
 * passes through `approvals`, which signs immediately in `auto` mode and waits
 * for an explicit decision in `manual` mode.
 */
export async function createAgentWallet(options: AgentWalletOptions = {}) {
  const {
    chains = ['solana:devnet'] as const,
    features = [
      'standard:connect',
      'standard:disconnect',
      'standard:events',
      'solana:signMessage',
      'solana:signTransaction',
    ] as readonly AgentWalletFeature[],
    icon = 'data:image/png;base64,',
    name = 'Test wallet',
    rpcUrl,
    supportedTransactionVersions = ['legacy', 0] as const,
  } = options;
  const approvals = createApprovalQueue({
    delay: options.delay,
    mode: options.mode,
  });
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
    if (!signer) throw new Error(`Unknown agent wallet account ${address}.`);
    return signer;
  }
  function accountFor(address: string) {
    const account = accounts.find(candidate => candidate.address === address);
    if (!account) throw new Error(`Unknown agent wallet account ${address}.`);
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
        'Pass `rpcUrl` to createAgentWallet to use solana:signAndSendTransaction.',
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
    'solana:signAndSendTransaction': {
      signAndSendTransaction: async (
        ...requests: readonly {
          account: {address: string};
          transaction: Uint8Array;
        }[]
      ) => {
        const inputs = requests.map(({account, transaction}) => ({
          account: account.address,
          transaction: transaction.slice(),
        }));
        await approvals.request(
          'solana:signAndSendTransaction',
          inputs.map(({account, transaction}) => ({
            account,
            ...summarizeTransaction(transaction),
          })),
        );
        return await Promise.all(
          inputs.map(async ({account, transaction}) => {
            const signed = await signWireTransaction(
              signerFor(account),
              transaction,
            );
            const signature = await sendSignedTransaction(signed);
            return {signature: new Uint8Array(base58.encode(signature))};
          }),
        );
      },
      supportedTransactionVersions,
      version: '1.0.0' as const,
    },
    'solana:signIn': {
      signIn: async (
        ...inputs: readonly {
          address?: string;
          domain?: string;
          useOffchainMessage?: {messageVersion: 1};
          [field: string]: unknown;
        }[]
      ) => {
        const requests = inputs.length
          ? inputs.map(input => ({...input}))
          : [{}];
        await approvals.request(
          'solana:signIn',
          requests.map(({address, domain, statement}) => ({
            account: address ?? accounts[0]!.address,
            domain: domain ?? window.location.host,
            statement,
          })),
        );
        return await Promise.all(
          requests.map(async ({useOffchainMessage, ...input}) => {
            const account = accountFor(input.address ?? accounts[0]!.address);
            const text = createSignInMessageText({
              ...input,
              address: account.address,
              domain: input.domain ?? window.location.host,
            });
            const signedMessage = useOffchainMessage
              ? new Uint8Array(
                  getOffchainMessageV1Encoder().encode({
                    content: text,
                    requiredSignatories: [
                      {address: account.address as Address},
                    ],
                    version: 1,
                  }),
                )
              : new TextEncoder().encode(text);
            return {
              account,
              signature: await signBytes(
                signerFor(account.address),
                signedMessage,
              ),
              signedMessage,
              ...(useOffchainMessage && {
                signedMessageFormat: {
                  kind: 'offchainMessage' as const,
                  messageVersion: 1 as const,
                },
              }),
            };
          }),
        );
      },
      version: '1.1.0' as const,
    },
    'solana:signMessage': {
      signMessage: async (
        ...requests: readonly {
          account: {address: string};
          message: Uint8Array;
        }[]
      ) => {
        const inputs = requests.map(({account, message}) => ({
          account: account.address,
          message: message.slice(),
        }));
        await approvals.request(
          'solana:signMessage',
          inputs.map(({account, message}) => ({
            account,
            message: new TextDecoder().decode(message),
          })),
        );
        return await Promise.all(
          inputs.map(async ({account, message}) => ({
            signature: await signBytes(signerFor(account), message),
            signedMessage: message,
          })),
        );
      },
      version: '1.0.0' as const,
    },
    'solana:signOffchainMessage': {
      signOffchainMessage: async (
        ...inputs: readonly {
          account: {address: string};
          message: string;
        }[]
      ) => {
        await approvals.request(
          'solana:signOffchainMessage',
          inputs.map(({account, message}) => ({
            account: account.address,
            message,
          })),
        );
        return await Promise.all(
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
        );
      },
      supportedMessageVersions: [1] as const,
      version: '1.0.0' as const,
    },
    'solana:signTransaction': {
      signTransaction: async (
        ...requests: readonly {
          account: {address: string};
          transaction: Uint8Array;
        }[]
      ) => {
        const inputs = requests.map(({account, transaction}) => ({
          account: account.address,
          transaction: transaction.slice(),
        }));
        await approvals.request(
          'solana:signTransaction',
          inputs.map(({account, transaction}) => ({
            account,
            ...summarizeTransaction(transaction),
          })),
        );
        return await Promise.all(
          inputs.map(async ({account, transaction}) => ({
            signedTransaction: await signWireTransaction(
              signerFor(account),
              transaction,
            ),
          })),
        );
      },
      supportedTransactionVersions,
      version: '1.0.0' as const,
    },
    'standard:connect': {
      connect: async ({silent}: {silent?: boolean} = {}) => {
        if (silent && approvals.mode === 'manual') {
          return {accounts: connectedAccounts};
        }
        if (!silent) await approvals.request('standard:connect', []);
        connectedAccounts = accounts;
        return {accounts: connectedAccounts};
      },
      version: '1.0.0' as const,
    },
    'standard:disconnect': {
      disconnect: () => {
        connectedAccounts = [];
        return Promise.resolve();
      },
      version: '1.0.0' as const,
    },
    'standard:events': {
      on: (_event: string, listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      version: '1.0.0' as const,
    },
  };
  const wallet = {
    get accounts() {
      return connectedAccounts;
    },
    chains,
    features: Object.fromEntries(
      features.map(feature => [feature, allFeatures[feature]]),
    ) as Partial<typeof allFeatures>,
    icon,
    name,
    version: '1.0.0' as const,
  };
  return {accounts, approvals, listeners, signers, wallet};
}
