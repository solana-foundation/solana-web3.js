import type { ClientWithWallet } from '@solana/kit-plugin-wallet';
import { useClient } from '@solana/react';

/** Reads the wallet-enabled Kit client published by {@link WalletProvider}. */
export function useWalletClient<TClient extends ClientWithWallet = ClientWithWallet>() {
    return useClient<TClient>();
}
