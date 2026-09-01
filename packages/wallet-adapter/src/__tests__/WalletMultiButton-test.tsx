import type { ClientWithWallet } from '@solana/kit-plugin-wallet';
import { ClientProvider } from '@solana/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WalletModalProvider } from '../ui/WalletModalProvider.js';
import { WalletMultiButton } from '../ui/WalletMultiButton.js';
import { makeClient, mockAccount, mockWallet } from './helpers.js';

function renderButton(client: ClientWithWallet) {
    return render(
        <ClientProvider client={client as never}>
            <WalletModalProvider>
                <WalletMultiButton />
            </WalletModalProvider>
        </ClientProvider>,
    );
}

describe('WalletMultiButton', () => {
    it('prompts to select a wallet and opens the modal listing discovered wallets', async () => {
        const wallet = mockWallet('Mock', [mockAccount('ABCDefgh00000000000000000000WXYZ')]);
        const { client, wallet: namespace } = makeClient({ wallets: [wallet] } as never);
        renderButton(client);

        const trigger = screen.getByRole('button', { name: /select wallet/i });
        fireEvent.click(trigger);

        expect(screen.getByText('Connect a wallet on Solana to continue')).toBeDefined();
        await act(() => {
            fireEvent.click(screen.getByRole('button', { name: /mock/i }));
            return Promise.resolve();
        });
        expect(namespace.connect).toHaveBeenCalledTimes(1);
    });

    it('shows the truncated address and disconnects from the dropdown when connected', async () => {
        const account = mockAccount('ABCDefgh00000000000000000000WXYZ');
        const wallet = mockWallet('Mock', [account]);
        const { client, wallet: namespace } = makeClient({
            connected: { account, signer: { address: account.address }, wallet },
            status: 'connected',
            wallets: [wallet],
        } as never);
        renderButton(client);

        fireEvent.click(screen.getByRole('button', { name: /ABCD\.\.WXYZ/ }));
        await act(() => {
            fireEvent.click(screen.getByRole('menuitem', { name: /disconnect/i }));
            return Promise.resolve();
        });
        expect(namespace.disconnect).toHaveBeenCalledTimes(1);
    });
});
