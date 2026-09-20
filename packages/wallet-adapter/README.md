# `@solana/wallet-adapter`

Wallet-adapter hooks and UI for [`@solana/web3.js`](https://github.com/solana-foundation/solana-web3.js) v3 applications.

The familiar v1 providers, hooks, components and error classes, implemented on [`@solana/kit-plugin-wallet`](https://github.com/anza-xyz/kit-plugins). Wallets are discovered through Wallet Standard registration in the browser; there are no per-wallet adapter constructors. Coming from `@solana/wallet-adapter-react`? See the [release notes](./RELEASE_NOTES.md) for the migration guide.

## Installation

```shell
npm install @solana/wallet-adapter @solana/web3.js@^3.0.0-rc.3 @solana/kit
```

The package is ESM and requires Node >=20.18.0. The React entries need React and React DOM ^19.2.8, the range supported by Kit's wallet plugin. Pin the web3.js version explicitly while v3 is not the registry default.

## Quick start

```tsx
import '@solana/wallet-adapter/styles.css';
import {
  ConnectionProvider,
  WalletModalProvider,
  WalletMultiButton,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter';

function App() {
  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider chain="solana:mainnet">
        <WalletModalProvider>
          <WalletMultiButton />
          <Profile />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function Profile() {
  const {publicKey} = useWallet();
  return <p>{publicKey ? publicKey.toBase58() : 'Not connected'}</p>;
}
```

`WalletProvider` props are Kit's plugin configuration plus `onError`:

| Prop                    | Default                      | Purpose                                                                                                             |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `chain`                 | required                     | `solana:mainnet`, `solana:devnet`, `solana:testnet` or `solana:localnet`; selects eligible accounts and features    |
| `autoConnect`           | `true`                       | Reconnect the stored account on mount                                                                               |
| `storage`, `storageKey` | `localStorage`, `kit-wallet` | Where the authorized account is remembered; `storage={null}` disables persistence                                   |
| `filter`                | all wallets                  | Predicate over discovered Wallet Standard wallets                                                                   |
| `onError`               | none                         | Called with each operation failure and, when known, the `adapter` (`name`, `icon`) of the wallet involved, as in v1 |

Keep object and function props referentially stable; changing `chain`, `filter` or the storage options recreates the client.

## Entries

| Import                              | Contents                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `@solana/wallet-adapter`            | Providers, hooks, UI components and everything in `/core`                                |
| `@solana/wallet-adapter/core`       | Framework-neutral `createWalletController`, types and errors; no React                   |
| `@solana/wallet-adapter/ui`         | `WalletMultiButton`, `WalletModal`, connect/disconnect buttons and headless button hooks |
| `@solana/wallet-adapter/styles.css` | The default stylesheet                                                                   |

### Hooks

| Hook                                                                                | Returns                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useWallet()`                                                                       | The wallet snapshot: `wallets`, `wallet`, `selectedWallet`, `publicKey`, `account`, `signer`, `supportedTransactionVersions`, `supportsOffchainSignIn`, `connected`, `connecting`, `disconnecting`, `status`, `autoConnect` and the operations `select`, `connect`, `disconnect`, `sendTransaction`, and when the wallet supports them, `signTransaction`, `signAllTransactions`, `signMessage`, `signIn`, `signOffchainMessage` |
| `useConnection()`                                                                   | `{ connection }` from the nearest `ConnectionProvider`; throws `WalletConfigError` without one                                                                                                                                                                                                                                                                                                                                   |
| `useAnchorWallet()`                                                                 | `{ publicKey, signTransaction, signAllTransactions }` when the wallet can sign, else `undefined`. Deprecated until an Anchor release targets web3.js v3                                                                                                                                                                                                                                                                          |
| `useLocalStorage(key, defaultState)`                                                | JSON-persisted React state; setting `null` removes the key                                                                                                                                                                                                                                                                                                                                                                       |
| `useWalletModal()`                                                                  | `{ visible, setVisible }` from `WalletModalProvider`                                                                                                                                                                                                                                                                                                                                                                             |
| `useWalletConnectButton()`, `useWalletDisconnectButton()`, `useWalletMultiButton()` | Headless state for custom controls                                                                                                                                                                                                                                                                                                                                                                                               |

`select`, `connect`, `disconnect` and `sendTransaction` keep one identity for the provider's lifetime, so effects may depend on them. Children render on the server in the disconnected state; discovery and reconnect start after hydration.

### Without React

```ts
import {createWalletController} from '@solana/wallet-adapter/core';

const controller = createWalletController({chain: 'solana:mainnet'});
const unsubscribe = controller.subscribe(() =>
  render(controller.getSnapshot()),
);
controller.select('Phantom');
await controller.connect();
// ...
unsubscribe();
controller.dispose();
```

The controller exposes the same snapshot and operations the hooks do.

## Signing and sending

`sendTransaction(transaction, connection, options?)` accepts a legacy `Transaction` or a `VersionedTransaction`. A legacy transaction without a fee payer or blockhash is completed from the connected account and `connection.getLatestBlockhash()` first, as in v1. `options.signers` are applied before the wallet signs. Wallets that implement `solana:signAndSendTransaction` broadcast themselves and receive `skipPreflight`, `preflightCommitment`, `maxRetries` and `minContextSlot`, as in v1; otherwise the wallet signs and the transaction is sent through the connection with the same options.

`signTransaction` and `signAllTransactions` return new transaction objects of the same class. Client-side lifetime bookkeeping (`lastValidBlockHeight`, `nonceInfo`) is carried over while the wallet leaves the lifetime unchanged.

`signMessage(message)` and `signOffchainMessage(message, { requiredSigners? })` return Kit `SignatureBytes`, so the results verify with `publicKey.verifySignature(signature, message)` or Kit's `verifySignature` without a cast. `signOffchainMessage` signs a version 1 [off-chain message](https://github.com/anza-xyz/wallet-standard/blob/master/packages/solana/features/src/signOffchainMessage.ts) when the wallet advertises `solana:signOffchainMessage`; `requiredSigners` defaults to the connected account's public key.

`signIn(input?)` hands the Wallet Standard `SolanaSignInInput` to the selected wallet and returns its output. `verifySignIn(input, output)` checks that output: it resolves `true` when the signed message reproduces the input, names the connected account, and carries that account's valid signature, whether the wallet signed the plain text or a version 1 off-chain message. Pass `useOffchainMessage: { messageVersion: 1 }` to have the wallet wrap the Sign In With Solana text in a version 1 off-chain message, which is what hardware wallets can display and sign; `output.signedMessageFormat` then reports `{ kind: 'offchainMessage', messageVersion: 1 }`. Only wallets advertising `solana:signIn` version `1.1.0` or later accept this option; `supportsOffchainSignIn` reports whether the selected wallet does, and the call rejects with `WalletSignInError` before reaching a wallet that doesn't.

`useWallet().signer` is the active account's Kit signer for applications that also build Kit transactions.

`useWallet().supportedTransactionVersions` is the set of transaction versions the connected account accepts on every signing path it exposes, or `null` while disconnected. Wallets that predate versioned transactions report `Set(['legacy'])`; an account that cannot sign transactions reports an empty set. Check membership for the version you intend to send rather than assuming a ceiling, since the set grows as Wallet Standard adds versions:

```ts
const {supportedTransactionVersions} = useWallet();
const canSendV1 = supportedTransactionVersions?.has(1) ?? false;
```

`sendTransaction`, `signTransaction` and `signAllTransactions` reject with `WalletSignTransactionError` or `WalletSendTransactionError` before calling the wallet when a transaction's version is not supported on the path that will be used.

## Not included

- Wallet adapter constructors, `Base*WalletAdapter` classes and the aggregate `@solana/wallet-adapter-wallets` package. Wallets participate by registering with Wallet Standard.
- Mobile Wallet Adapter setup and WalletConnect. Register the maintained Solana Mobile or Reown Wallet Standard integrations in your application entry; they are then discovered like any other wallet.
- Anchor. Published Anchor (1.x and `anchor-next`) depends on web3.js v1, so `useAnchorWallet()` is exported deprecated: it has the shape Anchor's `Wallet` expects and will be un-deprecated when an Anchor release targets web3.js v3. Until then, adapt at the boundary yourself.
