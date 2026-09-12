'use client';

import {useWallet} from '@solana/wallet-adapter';

export function SelectWallet() {
  const {wallets, selectedWallet, select} = useWallet();
  return (
    <select
      aria-label="Wallet"
      value={selectedWallet?.adapter.name ?? ''}
      onChange={event => select(event.target.value || null)}
    >
      <option value="">Select a wallet…</option>
      {wallets.map(wallet => (
        <option key={wallet.adapter.name} value={wallet.adapter.name}>
          {wallet.adapter.name}
        </option>
      ))}
    </select>
  );
}
