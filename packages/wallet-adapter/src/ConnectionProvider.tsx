import type { ConnectionConfig } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import type { FC, ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';

import { WalletConfigError } from './errors.js';

export interface ConnectionContextState {
    connection: Connection;
}

export const ConnectionContext = createContext<ConnectionContextState | null>(null);

export function useConnection(): ConnectionContextState {
    const context = useContext(ConnectionContext);
    if (!context) throw new WalletConfigError('ConnectionProvider is missing.');
    return context;
}

export interface ConnectionProviderProps {
    children: ReactNode;
    endpoint: string;
    config?: ConnectionConfig;
}

const DEFAULT_CONFIG: ConnectionConfig = { commitment: 'confirmed' };

/** Publishes a `@solana/web3.js` v3 `Connection` to the subtree, like the v1 `ConnectionProvider`. */
export const ConnectionProvider: FC<ConnectionProviderProps> = ({ children, endpoint, config = DEFAULT_CONFIG }) => {
    const value = useMemo(() => ({ connection: new Connection(endpoint, config) }), [endpoint, config]);
    return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
};
