'use client';

import {
  SignAndSendAllTransactions,
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignOffchainMessage,
  SolanaSignTransaction,
} from '@solana/wallet-standard-features';
import type {Wallet} from '@wallet-standard/base';
import Link from 'next/link';
import {
  hasFeature,
  isSolanaWallet,
  supportsSignInWithOffchainMessage,
  supportsTransactionVersion,
  useStandardWallets,
} from '../../components/walletFeatures';

const COLUMNS: readonly {
  label: string;
  supported: (wallet: Wallet) => boolean;
}[] = [
  {
    label: 'legacy',
    supported: wallet => supportsTransactionVersion(wallet, 'legacy'),
  },
  {label: 'v0', supported: wallet => supportsTransactionVersion(wallet, 0)},
  {label: 'v1', supported: wallet => supportsTransactionVersion(wallet, 1)},
  {
    label: 'Sign Tx',
    supported: wallet => hasFeature(wallet, SolanaSignTransaction),
  },
  {
    label: 'Sign & Send',
    supported: wallet => hasFeature(wallet, SolanaSignAndSendTransaction),
  },
  {
    label: 'Sign & Send All',
    supported: wallet => hasFeature(wallet, SignAndSendAllTransactions),
  },
  {
    label: 'Sign Message',
    supported: wallet => hasFeature(wallet, SolanaSignMessage),
  },
  {
    label: 'OCMS',
    supported: wallet => hasFeature(wallet, SolanaSignOffchainMessage),
  },
  {label: 'SIWS', supported: wallet => hasFeature(wallet, SolanaSignIn)},
  {label: 'SIWS Offchain', supported: supportsSignInWithOffchainMessage},
];

function Support({supported}: {supported: boolean}) {
  return supported ? (
    <span className="yes">✓</span>
  ) : (
    <span className="no">✗</span>
  );
}

export default function WalletFeaturesPage() {
  const wallets = useStandardWallets()
    .filter(isSolanaWallet)
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <main className="wide">
      <header>
        <div>
          <h1>Wallet Features</h1>
          <p>
            Every Solana wallet installed in this browser and the Wallet
            Standard features it advertises, read live from its registration.
          </p>
        </div>
        <Link href="/">← Back</Link>
      </header>
      <section>
        <h2>Installed wallets</h2>
        {wallets.length === 0 ? (
          <p className="empty">No Solana wallet detected in this browser.</p>
        ) : (
          <div className="scroll">
            <table className="features">
              <thead>
                <tr>
                  <th scope="col">Wallet</th>
                  {COLUMNS.map(({label}) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wallets.map(wallet => (
                  <tr key={wallet.name}>
                    <th scope="row">
                      <span className="wallet-name">
                        <img src={wallet.icon} alt="" width={20} height={20} />
                        {wallet.name}
                      </span>
                    </th>
                    {COLUMNS.map(({label, supported}) => (
                      <td key={label}>
                        <Support supported={supported(wallet)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ul className="legend">
        <li>
          <span className="yes">✓</span> supported
        </li>
        <li>
          <span className="no">✗</span> not supported, or not known to be
        </li>
        <li>
          <strong>OCMS</strong> offchain message signing (
          <code>solana:signOffchainMessage</code>)
        </li>
        <li>
          <strong>SIWS</strong> Sign In With Solana (<code>solana:signIn</code>
          ); <strong>SIWS Offchain</strong> requires feature version 1.1.0
        </li>
      </ul>
    </main>
  );
}
