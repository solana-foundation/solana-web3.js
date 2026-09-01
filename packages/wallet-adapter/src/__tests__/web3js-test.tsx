import type { SignatureBytes, Transaction as KitTransaction } from '@solana/kit';
import { getBase58Decoder } from '@solana/kit';
import type { Blockhash, Connection } from '@solana/web3.js';
import { PublicKey, SystemProgram, Transaction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectionProvider } from '../ConnectionProvider.js';
import { useAnchorWallet } from '../useAnchorWallet.js';
import { useConnection } from '../useConnection.js';
import { useWallet } from '../useWallet.js';
import { makeClient, makeWrapper, mockWallet } from './helpers.js';

const base58 = getBase58Decoder();

const PAYER_ADDRESS = 'So11111111111111111111111111111111111111112';
const PLACEHOLDER_BLOCKHASH = base58.decode(new Uint8Array(32).fill(1)) as Blockhash;
const SIGNATURE = new Uint8Array(64).fill(7) as SignatureBytes;

function makeModifyingSigner(address: string) {
    return {
        address,
        modifyAndSignTransactions: vi.fn((transactions: readonly KitTransaction[]) =>
            Promise.resolve(
                transactions.map(transaction => ({
                    ...transaction,
                    signatures: { ...transaction.signatures, [address]: SIGNATURE },
                })),
            ),
        ),
    };
}

function makeConnectedClient(signer: unknown) {
    const account = { address: PAYER_ADDRESS, publicKey: new Uint8Array(32) };
    const wallet = mockWallet('Mock', [account]);
    return makeClient({
        connected: { account, signer, wallet },
        status: 'connected',
        wallets: [wallet],
    } as never);
}

function makeLegacyTransaction(payer: PublicKey) {
    const transaction = new Transaction();
    transaction.feePayer = payer;
    transaction.recentBlockhash = PLACEHOLDER_BLOCKHASH;
    transaction.add(SystemProgram.transfer({ fromPubkey: payer, lamports: 1n, toPubkey: payer }));
    return transaction;
}

function makeVersionedTransaction(payer: PublicKey) {
    const message = new TransactionMessage({
        instructions: [SystemProgram.transfer({ fromPubkey: payer, lamports: 1n, toPubkey: payer })],
        payerKey: payer,
        recentBlockhash: PLACEHOLDER_BLOCKHASH,
    }).compileToV0Message();
    return new VersionedTransaction(message);
}

describe('useWallet (web3js)', () => {
    it('exposes the connected address as a web3.js PublicKey', () => {
        const { client } = makeConnectedClient(makeModifyingSigner(PAYER_ADDRESS));
        const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper(client) });

        expect(result.current.publicKey).toBeInstanceOf(PublicKey);
        expect(result.current.publicKey?.toBase58()).toBe(PAYER_ADDRESS);
    });

    it('exposes a null publicKey when disconnected', () => {
        const { client } = makeClient();
        const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper(client) });

        expect(result.current.publicKey).toBeNull();
        expect(result.current.signTransaction).toBeUndefined();
        expect(result.current.signAllTransactions).toBeUndefined();
    });

    it('signs a legacy Transaction through the Kit signer', async () => {
        const signer = makeModifyingSigner(PAYER_ADDRESS);
        const { client } = makeConnectedClient(signer);
        const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper(client) });

        const transaction = makeLegacyTransaction(result.current.publicKey!);
        const signed = await result.current.signTransaction!(transaction);

        expect(signer.modifyAndSignTransactions).toHaveBeenCalledTimes(1);
        expect(signed).toBeInstanceOf(Transaction);
        expect(signed.signature).toEqual(SIGNATURE);
    });

    it('signs a VersionedTransaction and preserves its class', async () => {
        const signer = makeModifyingSigner(PAYER_ADDRESS);
        const { client } = makeConnectedClient(signer);
        const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper(client) });

        const transaction = makeVersionedTransaction(result.current.publicKey!);
        const [signed] = await result.current.signAllTransactions!([transaction]);

        expect(signed).toBeInstanceOf(VersionedTransaction);
        expect(signed.signatures[0]).toEqual(SIGNATURE);
    });

    it('exposes no signTransaction for sign-and-send-only wallets', () => {
        const signer = { address: PAYER_ADDRESS, signAndSendTransactions: vi.fn() };
        const { client } = makeConnectedClient(signer);
        const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper(client) });

        expect(result.current.signTransaction).toBeUndefined();
        expect(result.current.signAllTransactions).toBeUndefined();
    });

    it('sends through the wallet when it can sign and send in one step', async () => {
        const signer = {
            address: PAYER_ADDRESS,
            signAndSendTransactions: vi.fn(() => Promise.resolve([SIGNATURE])),
        };
        const { client } = makeConnectedClient(signer);
        const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper(client) });
        const connection = { sendRawTransaction: vi.fn() } as unknown as Connection;

        const transaction = makeLegacyTransaction(result.current.publicKey!);
        const signature = await result.current.sendTransaction(transaction, connection);

        expect(signature).toBe(base58.decode(SIGNATURE));
        expect(connection.sendRawTransaction).not.toHaveBeenCalled();
    });

    it('signs and sends through the connection otherwise', async () => {
        const signer = makeModifyingSigner(PAYER_ADDRESS);
        const { client } = makeConnectedClient(signer);
        const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper(client) });
        const sendRawTransaction = vi.fn(() => Promise.resolve('mock-signature'));
        const connection = { sendRawTransaction } as unknown as Connection;

        const transaction = makeLegacyTransaction(result.current.publicKey!);
        const signature = await result.current.sendTransaction(transaction, connection, { skipPreflight: true });

        expect(signature).toBe('mock-signature');
        expect(sendRawTransaction).toHaveBeenCalledTimes(1);
        const [wireBytes, sendOptions] = sendRawTransaction.mock.calls[0] as unknown as [Uint8Array, unknown];
        expect(Transaction.from(wireBytes).signature).toEqual(SIGNATURE);
        expect(sendOptions).toEqual({ skipPreflight: true });
    });

    it('connects to a wallet by name through select', async () => {
        const { client, wallet: namespace } = makeConnectedClient(makeModifyingSigner(PAYER_ADDRESS));
        const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper(client) });

        await act(() => {
            result.current.select('Mock');
            return Promise.resolve();
        });
        expect(namespace.connect).toHaveBeenCalledTimes(1);

        await act(() => {
            result.current.select(null);
            return Promise.resolve();
        });
        expect(namespace.disconnect).toHaveBeenCalledTimes(1);
    });
});

describe('useAnchorWallet', () => {
    it('returns a signing wallet when connected', () => {
        const { client } = makeConnectedClient(makeModifyingSigner(PAYER_ADDRESS));
        const { result } = renderHook(() => useAnchorWallet(), { wrapper: makeWrapper(client) });

        expect(result.current?.publicKey.toBase58()).toBe(PAYER_ADDRESS);
        expect(typeof result.current?.signTransaction).toBe('function');
        expect(typeof result.current?.signAllTransactions).toBe('function');
    });

    it('returns undefined when disconnected', () => {
        const { client } = makeClient();
        const { result } = renderHook(() => useAnchorWallet(), { wrapper: makeWrapper(client) });

        expect(result.current).toBeUndefined();
    });
});

describe('useConnection', () => {
    it('returns the Connection published by ConnectionProvider', () => {
        function Wrapper({ children }: { children: ReactNode }) {
            return <ConnectionProvider endpoint="http://localhost:8899">{children}</ConnectionProvider>;
        }
        const { result } = renderHook(() => useConnection(), { wrapper: Wrapper });

        expect(result.current.connection.rpcEndpoint).toBe('http://localhost:8899');
    });
});
