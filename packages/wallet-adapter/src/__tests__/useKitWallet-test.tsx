import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useKitWallet } from '../useKitWallet.js';
import { makeClient, makeWrapper, mockAccount, mockWallet } from './helpers.js';

describe('useKitWallet', () => {
    it('reports a disconnected wallet', () => {
        const { client } = makeClient();
        const { result } = renderHook(() => useKitWallet(), { wrapper: makeWrapper(client) });

        expect(result.current.connected).toBe(false);
        expect(result.current.connecting).toBe(false);
        expect(result.current.account).toBeNull();
        expect(result.current.address).toBeNull();
        expect(result.current.signer).toBeNull();
        expect(result.current.wallets).toEqual([]);
    });

    it('maps a connected wallet to the classic surface', () => {
        const account = mockAccount('ABCDefgh00000000000000000000WXYZ');
        const wallet = mockWallet('Mock', [account]);
        const signer = { address: account.address };
        const { client } = makeClient({
            connected: { account, signer, wallet },
            status: 'connected',
            wallets: [wallet],
        } as never);
        const { result } = renderHook(() => useKitWallet(), { wrapper: makeWrapper(client) });

        expect(result.current.connected).toBe(true);
        expect(result.current.account).toBe(account);
        expect(result.current.address).toBe(account.address);
        expect(result.current.signer).toBe(signer);
        expect(result.current.wallet).toBe(wallet);
        expect(result.current.wallets).toHaveLength(1);
    });

    it('treats reconnecting as connecting', () => {
        const { client } = makeClient({ status: 'reconnecting' } as never);
        const { result } = renderHook(() => useKitWallet(), { wrapper: makeWrapper(client) });

        expect(result.current.connecting).toBe(true);
    });

    it('forwards connect and disconnect to the wallet namespace', async () => {
        const wallet = mockWallet('Mock');
        const { client, wallet: namespace } = makeClient({ wallets: [wallet] } as never);
        const { result } = renderHook(() => useKitWallet(), { wrapper: makeWrapper(client) });

        await act(async () => {
            await result.current.connectAsync(wallet as never);
        });
        expect(namespace.connect).toHaveBeenCalledTimes(1);
        expect(namespace.connect.mock.calls[0]?.[0]).toBe(wallet);

        await act(async () => {
            await result.current.disconnectAsync();
        });
        expect(namespace.disconnect).toHaveBeenCalledTimes(1);
    });
});
