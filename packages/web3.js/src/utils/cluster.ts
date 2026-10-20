const endpoint = {
  http: {
    devnet: 'http://api.devnet.solana.com',
    testnet: 'http://api.testnet.solana.com',
    mainnet: 'http://api.mainnet.solana.com/',
    'mainnet-beta': 'http://api.mainnet-beta.solana.com/',
  },
  https: {
    devnet: 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    mainnet: 'https://api.mainnet.solana.com/',
    'mainnet-beta': 'https://api.mainnet-beta.solana.com/',
  },
};

export type Cluster = 'devnet' | 'testnet' | 'mainnet' | 'mainnet-beta';

/**
 * Retrieves the RPC API URL for the mainnet cluster
 * @param {boolean} [tls=true] - Use TLS (https). Pass `false` for http.
 *
 * @returns {string} URL string of the RPC endpoint
 *
 * @deprecated `'mainnet-beta'` is kept for compatibility; use `'mainnet'` instead.
 */
export function clusterApiUrl(cluster: 'mainnet-beta', tls?: boolean): string;
/**
 * Retrieves the RPC API URL for the specified cluster
 * @param {Cluster} [cluster="devnet"] - The cluster name of the RPC API URL to use. Possible options: 'devnet' | 'testnet' | 'mainnet' | 'mainnet-beta'
 * @param {boolean} [tls=true] - Use TLS (https). Pass `false` for http.
 *
 * @returns {string} URL string of the RPC endpoint
 */
export function clusterApiUrl(cluster?: Cluster, tls?: boolean): string;
export function clusterApiUrl(cluster?: Cluster, tls?: boolean): string {
  const key = tls === false ? 'http' : 'https';

  if (!cluster) {
    return endpoint[key]['devnet'];
  }

  const url = endpoint[key][cluster];
  if (!url) {
    throw new Error(`Unknown ${key} cluster: ${cluster}`);
  }
  return url;
}
