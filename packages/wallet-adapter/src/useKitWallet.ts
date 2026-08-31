import {
    useConnect,
    useConnectedWallet,
    useDisconnect,
    useSignIn,
    useSignMessage,
    useWallets,
    useWalletStatus,
} from '@solana/kit-plugin-wallet/react';
import { useMemo } from 'react';

import type { UseWalletResult } from './types.js';
import { useWalletClient } from './useWalletClient.js';

/** The wallet connection as Kit sees it: Kit signers and wallet-standard accounts, no web3.js types. */
export function useKitWallet(): UseWalletResult {
    const client = useWalletClient();
    const wallets = useWallets(client);
    const connected = useConnectedWallet(client);
    const status = useWalletStatus(client);
    const connect = useConnect(client);
    const disconnect = useDisconnect(client);
    const signMessage = useSignMessage(client);
    const signIn = useSignIn(client);

    return useMemo(
        () => ({
            account: connected?.account ?? null,
            address: connected?.account.address ?? null,
            connect: connect.dispatch,
            connectAsync: connect.dispatchAsync,
            connected: status === 'connected',
            connecting: status === 'connecting' || status === 'reconnecting',
            disconnect: disconnect.dispatch,
            disconnectAsync: disconnect.dispatchAsync,
            disconnecting: status === 'disconnecting',
            signIn: signIn.dispatchAsync,
            signMessage: signMessage.dispatchAsync,
            signer: connected?.signer ?? null,
            status,
            wallet: connected?.wallet ?? null,
            wallets,
        }),
        [
            wallets,
            connected,
            status,
            connect.dispatch,
            connect.dispatchAsync,
            disconnect.dispatch,
            disconnect.dispatchAsync,
            signMessage.dispatchAsync,
            signIn.dispatchAsync,
        ],
    );
}
