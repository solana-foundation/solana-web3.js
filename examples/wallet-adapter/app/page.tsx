'use client';

import {
  WalletConnectButton,
  WalletDisconnectButton,
  WalletModalButton,
  WalletMultiButton,
} from '@solana/wallet-adapter';
import {SendLegacyTransaction} from '../components/SendLegacyTransaction';
import {SendTransaction} from '../components/SendTransaction';
import {SendV0Transaction} from '../components/SendV0Transaction';
import {SendV1Transaction} from '../components/SendV1Transaction';
import {SelectWallet} from '../components/SelectWallet';
import {Settings} from '../components/Settings';
import {SignIn} from '../components/SignIn';
import {SignMessage} from '../components/SignMessage';
import {SignOffchainMessage} from '../components/SignOffchainMessage';
import {SignTransaction} from '../components/SignTransaction';

export default function Page() {
  return (
    <main>
      <header>
        <div>
          <h1>Wallet Adapter</h1>
          <p>Components and hooks from @solana/wallet-adapter.</p>
        </div>
        <Settings />
      </header>
      <section>
        <h2>Components</h2>
        <table>
          <tbody>
            <tr>
              <th scope="row">Select Wallet</th>
              <td>
                <SelectWallet />
              </td>
            </tr>
            <tr>
              <th scope="row">Connect Button</th>
              <td>
                <WalletConnectButton />
              </td>
            </tr>
            <tr>
              <th scope="row">Disconnect Button</th>
              <td>
                <WalletDisconnectButton />
              </td>
            </tr>
            <tr>
              <th scope="row">Modal Button</th>
              <td>
                <WalletModalButton />
              </td>
            </tr>
            <tr>
              <th scope="row">Multi Button</th>
              <td>
                <WalletMultiButton />
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h2>Signing</h2>
        <div className="actions">
          <SignMessage />
          <SignOffchainMessage />
          <SignIn />
          <SignTransaction />
        </div>
      </section>
      <section>
        <h2>Transactions</h2>
        <div className="actions">
          <SendTransaction />
          <SendLegacyTransaction />
          <SendV0Transaction />
          <SendV1Transaction />
        </div>
      </section>
    </main>
  );
}
