import { getBase58Decoder, getTransactionCodec, type SignatureBytes } from '@solana/kit';
import { Transaction, SystemProgram, type Blockhash } from '@solana/web3.js';
import { getWallets, type Wallets } from '@wallet-standard/app';
import { vi, onTestFinished } from 'vitest';

import { createWalletController, type WalletControllerOptions } from '../wallet-controller.js';

export function standardWallet(
    name = 'Lifecycle wallet',
    byte = 0,
    chain: WalletControllerOptions['chain'] = 'solana:devnet',
) {
    const listeners = new Set<() => void>();
    const accounts = [
        {
            address: getBase58Decoder().decode(new Uint8Array(32).fill(byte)),
            publicKey: new Uint8Array(32).fill(byte),
            chains: [chain] as const,
            features: [] as readonly `${string}:${string}`[],
        },
    ];
    return {
        listeners,
        wallet: {
            version: '1.0.0' as const,
            name,
            icon: 'data:image/png;base64,' as const,
            chains: [chain] as const,
            accounts,
            features: {
                'standard:connect': {
                    version: '1.0.0',
                    connect: vi.fn(async () => ({ accounts })),
                },
                'standard:disconnect': {
                    version: '1.0.0',
                    disconnect: vi.fn(async () => {}),
                },
                'standard:events': {
                    version: '1.0.0',
                    on: (_event: string, listener: () => void) => {
                        listeners.add(listener);
                        return () => listeners.delete(listener);
                    },
                },
            },
        },
    };
}

export const SIGNATURE = new Uint8Array(64).fill(7) as SignatureBytes;

export function registerWallets(...wallets: Parameters<Wallets['register']>) {
    const unregister = getWallets().register(...wallets);
    onTestFinished(unregister);
    return unregister;
}

export function testController(
    wallet: ReturnType<Wallets['get']>[number] = standardWallet().wallet,
    options: Partial<WalletControllerOptions> & {
        wallets?: ReturnType<Wallets['get']>;
    } = {},
) {
    const { wallets = [wallet], ...config } = options;
    registerWallets(...wallets);
    const owner = createWalletController({
        chain: 'solana:devnet',
        storage: null,
        ...config,
    });
    onTestFinished(owner.dispose);
    return owner;
}

export async function signingWallet(config: Partial<WalletControllerOptions> = {}) {
    const base = standardWallet('Signing wallet', 0, config.chain);
    const codec = getTransactionCodec();
    const signTransaction = vi.fn(async (...inputs: { account: { address: string }; transaction: Uint8Array }[]) =>
        inputs.map(input => {
            const transaction = codec.decode(input.transaction);
            return {
                signedTransaction: codec.encode({
                    ...transaction,
                    signatures: {
                        ...transaction.signatures,
                        [input.account.address]: SIGNATURE,
                    },
                }),
            };
        }),
    );
    const wallet = {
        ...base.wallet,
        accounts: base.wallet.accounts.map(account => ({
            ...account,
            features: ['solana:signTransaction'] as const,
        })),
        features: {
            ...base.wallet.features,
            'solana:signTransaction': {
                version: '1.0.0',
                supportedTransactionVersions: ['legacy', 0],
                signTransaction,
            },
        },
    };
    const onError = vi.fn();
    const owner = testController(wallet, { onError, ...config });
    owner.select(wallet.name);
    expect(owner.getSnapshot().supportedTransactionVersions).toBeNull();
    await owner.connect();
    expect(owner.getSnapshot().supportedTransactionVersions).toEqual(new Set(['legacy', 0]));
    const payer = owner.getSnapshot().publicKey!;
    const transaction = new Transaction();
    transaction.feePayer = payer;
    transaction.recentBlockhash = getBase58Decoder().decode(new Uint8Array(32).fill(1)) as Blockhash;
    transaction.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: payer, lamports: 1n }));
    return {
        wallet,
        owner,
        transaction,
        signTransaction,
        onError,
    };
}
