'use client';

import {useLocalStorage} from '@solana/wallet-adapter';
import type {Cluster} from '@solana/web3.js';
import type {ReactNode} from 'react';
import {createContext, useContext, useMemo, useSyncExternalStore} from 'react';

const NETWORKS: readonly Cluster[] = ['devnet', 'testnet', 'mainnet-beta'];

interface SettingsState {
  autoConnect: boolean;
  network: Cluster;
  setAutoConnect(autoConnect: boolean): void;
  setNetwork(network: Cluster): void;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function useSettings(): SettingsState {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('SettingsProvider is missing.');
  return settings;
}

export function SettingsProvider({children}: {children: ReactNode}) {
  const [autoConnect, setAutoConnect] = useLocalStorage('autoConnect', true);
  const [network, setNetwork] = useLocalStorage<Cluster>('network', 'devnet');
  const value = useMemo(
    () => ({autoConnect, network, setAutoConnect, setNetwork}),
    [autoConnect, network, setAutoConnect, setNetwork],
  );
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

const noSubscription = () => () => {};

export function Settings() {
  const {autoConnect, network, setAutoConnect, setNetwork} = useSettings();
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return (
    <div className="setting">
      <label>
        <input
          type="checkbox"
          name="autoConnect"
          checked={autoConnect}
          onChange={event => setAutoConnect(event.target.checked)}
        />
        AutoConnect
      </label>
      <select
        name="network"
        aria-label="Network"
        value={network}
        onChange={event => setNetwork(event.target.value as Cluster)}
      >
        {NETWORKS.map(cluster => (
          <option key={cluster} value={cluster}>
            {cluster}
          </option>
        ))}
      </select>
    </div>
  );
}
