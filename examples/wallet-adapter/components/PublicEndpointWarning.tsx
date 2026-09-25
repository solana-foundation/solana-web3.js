'use client';

import {useConnection} from '@solana/wallet-adapter';
import {useSyncExternalStore} from 'react';

const PUBLIC_MAINNET_HOSTS = new Set([
  'api.mainnet-beta.solana.com',
  'api.mainnet.solana.com',
]);

function isPublicMainnet(endpoint: string): boolean {
  const {hostname, pathname, search} = new URL(endpoint);
  return (
    PUBLIC_MAINNET_HOSTS.has(hostname) && pathname === '/' && search === ''
  );
}

const noSubscription = () => () => {};

export function PublicEndpointWarning() {
  const {connection} = useConnection();
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  if (!mounted || !isPublicMainnet(connection.rpcEndpoint)) return null;
  return (
    <p className="warning" role="alert">
      Using the public mainnet RPC. It rejects browser requests, so sending
      transactions will fail. Set <code>NEXT_PUBLIC_MAINNET_RPC_URL</code> to a
      private endpoint.
    </p>
  );
}
