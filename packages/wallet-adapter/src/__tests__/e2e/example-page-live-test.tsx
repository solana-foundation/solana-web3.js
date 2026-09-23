import { createKeyPairSignerFromBytes, type KeyPairSigner } from '@solana/kit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getWallets } from '@wallet-standard/app';
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from 'vitest';

import Page from '../../../../../examples/wallet-adapter/app/page';
import { Providers } from '../../../../../examples/wallet-adapter/app/providers';
import { createTestWallet } from './test-wallet.js';

const ACTION_TIMEOUT = 20_000;

describe('example page on a live surfnet', () => {
    let payer: KeyPairSigner;
    const rpcUrl = inject('surfnetRpcUrl');
    const wsUrl = inject('surfnetWsUrl');
    const unregisters: (() => void)[] = [];

    beforeAll(async () => {
        payer = await createKeyPairSignerFromBytes(new Uint8Array(inject('surfnetPayerSecretKey')));
        const fullWallet = await createTestWallet({
            chains: ['solana:devnet', 'solana:testnet', 'solana:mainnet'],
            features: [
                'standard:connect',
                'standard:disconnect',
                'standard:events',
                'solana:signMessage',
                'solana:signTransaction',
                'solana:signAndSendTransaction',
                'solana:signIn',
                'solana:signOffchainMessage',
            ],
            name: 'Full wallet',
            rpcUrl,
            signers: [payer],
            supportedTransactionVersions: ['legacy', 0, 1],
        });
        const legacyOnlyWallet = await createTestWallet({
            features: ['standard:connect', 'standard:disconnect', 'standard:events', 'solana:signTransaction'],
            name: 'Legacy-only wallet',
            supportedTransactionVersions: ['legacy'],
        });
        for (const { wallet } of [fullWallet, legacyOnlyWallet]) {
            unregisters.push(getWallets().register(wallet));
        }
    }, 60_000);
    afterAll(() => {
        for (const unregister of unregisters) unregister();
    });
    afterEach(() => {
        localStorage.clear();
    });

    function renderPage() {
        return render(
            <Providers endpoint={rpcUrl} wsEndpoint={wsUrl}>
                <Page />
            </Providers>,
        );
    }
    function button(name: string | RegExp): HTMLButtonElement {
        return screen.getByRole('button', { name }) as HTMLButtonElement;
    }
    // The connect button's accessible name starts with the wallet icon's alt
    // text, and the multi button shares that name, so take the first match.
    function connectButton(): HTMLButtonElement {
        return screen.getAllByRole('button', {
            name: /Connect(ed|ing \.\.\.)?$/,
        })[0] as HTMLButtonElement;
    }
    async function waitForConnectButton(text: string) {
        await waitFor(() => expect(connectButton().textContent).toBe(text), {
            timeout: ACTION_TIMEOUT,
        });
    }
    async function connectTo(name: string) {
        await screen.findByRole('option', { name });
        fireEvent.change(screen.getByLabelText('Wallet'), {
            target: { value: name },
        });
        await waitFor(() => expect(['Connect', 'Connected']).toContain(connectButton().textContent), {
            timeout: ACTION_TIMEOUT,
        });
        if (connectButton().textContent === 'Connect') {
            fireEvent.click(connectButton());
        }
        await waitForConnectButton('Connected');
    }
    function dismissNotifications() {
        for (const dismiss of screen.queryAllByRole('button', {
            name: 'Dismiss',
        })) {
            fireEvent.click(dismiss);
        }
    }
    function readOutcome(status: HTMLElement) {
        const element = status.querySelector<HTMLElement>('[data-variant="success"], [data-variant="error"]');
        if (!element) return undefined;
        return {
            text: element.textContent ?? '',
            variant: element.dataset.variant,
        };
    }

    async function expectSuccess(action: string, message: RegExp) {
        dismissNotifications();
        fireEvent.click(button(action));
        const status = screen.getByRole('status');
        let outcome: ReturnType<typeof readOutcome>;
        await waitFor(
            () => {
                outcome ||= readOutcome(status);
                expect(outcome, `${action} produced no outcome`).not.toBeUndefined();
            },
            { timeout: ACTION_TIMEOUT },
        );
        const { text, variant } = outcome!;
        expect(variant === 'error' ? text : null, `${action} failed`).toBeNull();
        expect(text).toMatch(message);
    }

    it('signs and sends with every action button', async () => {
        renderPage();
        await connectTo('Full wallet');

        await expectSuccess('Sign Message', /^Message signature: /);
        await expectSuccess('Sign Offchain Message', /^Offchain message signature: /);
        await expectSuccess('Sign In', /^Message signature: /);
        await expectSuccess('Sign In (Offchain)', /^Message signature: /);
        await expectSuccess('Sign Transaction', /Transaction signature valid!/);

        await expectSuccess('Send Transaction', /Transaction successful!/);
        await expectSuccess('Send Legacy Transaction', /Transaction successful!/);
        await expectSuccess('Send V0 Transaction', /Transaction successful!/);
        await expectSuccess('Send V1 Transaction', /Transaction successful!/);
    }, 120_000);

    it('keeps working after switching network and disconnects', async () => {
        renderPage();
        await connectTo('Full wallet');

        fireEvent.change(screen.getByLabelText('Network'), {
            target: { value: 'testnet' },
        });
        expect(localStorage.getItem('network')).toBe(JSON.stringify('testnet'));
        await connectTo('Full wallet');
        await expectSuccess('Send Transaction', /Transaction successful!/);

        fireEvent.click(screen.getAllByRole('button', { name: /Disconnect$/ })[0]!);
        await screen.findAllByRole('button', { name: /Connect Wallet$/ });
        expect(button('Sign Message').disabled).toBe(true);
    }, 60_000);

    it('marks unsupported features on a legacy-only wallet', async () => {
        renderPage();
        await connectTo('Legacy-only wallet');

        for (const name of [
            /Sign Message \(not supported\)/,
            /Sign Offchain Message \(not supported\)/,
            /Sign In \(not supported\)/,
            /Sign In \(Offchain\) \(not supported\)/,
            /Send V0 Transaction \(not supported\)/,
            /Send V1 Transaction \(not supported\)/,
        ]) {
            expect(button(name).disabled).toBe(true);
        }
        expect(button('Sign Transaction').disabled).toBe(false);
        expect(button('Send Legacy Transaction').disabled).toBe(false);
    });
});
