import {createKeyPairSignerFromBytes} from '@solana/kit';
import {registerWallet} from '@wallet-standard/wallet';

import type {SigningMode} from './approvals.js';
import {AGENT_WALLET_FEATURES, createAgentWallet} from './wallet.js';

export interface AgentWalletConfig {
  chains: `solana:${string}`[];
  delay?: number;
  mode?: SigningMode;
  name: string;
  rpcUrl: string;
  /** A 64-byte Solana CLI keypair. */
  secretKey: number[];
}

declare const __AGENT_WALLET_CONFIG__: AgentWalletConfig;

const ICON =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iIzk5NDVGRiIvPjx0ZXh0IHg9IjE2IiB5PSIyMiIgZm9udC1zaXplPSIxNiIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QTwvdGV4dD48L3N2Zz4=' as const;

void (async () => {
  const {secretKey, ...config} = __AGENT_WALLET_CONFIG__;
  const signer = await createKeyPairSignerFromBytes(new Uint8Array(secretKey));
  const {approvals, wallet} = await createAgentWallet({
    ...config,
    features: AGENT_WALLET_FEATURES,
    icon: ICON,
    signers: [signer],
    supportedTransactionVersions: ['legacy', 0, 1],
  });
  Object.assign(window, {
    __agentWallet: {
      address: signer.address,
      approve: approvals.approve,
      get mode() {
        return approvals.mode;
      },
      pending: approvals.pending,
      reject: approvals.reject,
      setMode: approvals.setMode,
    },
  });
  registerWallet(wallet);
})();
