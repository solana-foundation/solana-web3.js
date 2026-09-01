import type { ClientWithWallet, WalletState } from '@solana/kit-plugin-wallet';
import { ClientProvider } from '@solana/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

type MockAccount = { address: string; publicKey: Uint8Array };
type MockWallet = { name: string; icon: string; accounts: MockAccount[] };

export function mockAccount(address: string): MockAccount {
    return { address, publicKey: new Uint8Array(32) };
}

export function mockWallet(name: string, accounts: MockAccount[] = []): MockWallet {
    return { accounts, icon: `data:image/svg+xml;base64,${name}`, name };
}

/** Builds a fake wallet-enabled client with static state and spied actions, needing no browser wallet. */
export function makeClient(state: Partial<WalletState> = {}) {
    const fullState = {
        connected: null,
        status: 'disconnected',
        wallets: [],
        ...state,
    } as unknown as WalletState;

    const wallet = {
        connect: vi.fn((_wallet: unknown) => Promise.resolve(fullState.wallets)),
        disconnect: vi.fn((_wallet?: unknown) => Promise.resolve(undefined)),
        getState: () => fullState,
        selectAccount: vi.fn(),
        signIn: vi.fn(() => Promise.resolve({} as never)),
        signMessage: vi.fn(() => Promise.resolve(new Uint8Array(64) as never)),
        subscribe: () => () => undefined,
        whenReady: () => Promise.resolve(undefined),
    };

    const client = { wallet } as unknown as ClientWithWallet;
    return { client, wallet };
}

export function makeWrapper(client: ClientWithWallet) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <ClientProvider client={client as never}>{children}</ClientProvider>;
    };
}
