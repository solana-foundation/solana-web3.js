import type { Connection } from '@solana/web3.js';
import { createContext, useContext } from 'react';

export interface ConnectionContextState {
    connection: Connection;
}

export const ConnectionContext = createContext<ConnectionContextState>({} as ConnectionContextState);

/** Reads the `@solana/web3.js` v3 `Connection` published by {@link ConnectionProvider}. */
export function useConnection(): ConnectionContextState {
    return useContext(ConnectionContext);
}
