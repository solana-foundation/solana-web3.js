# `@solana/wallet-adapter`

Wallet-adapter hooks and UI for [`@solana/web3.js`](https://github.com/anza-xyz/web3.js) v3 apps.

If you know the classic `@solana/wallet-adapter-react` — `useWallet()`, `useConnection()`, `<WalletMultiButton />` — this is the same surface in web3.js v3 types. Wallets are discovered automatically through the [wallet standard](https://github.com/wallet-standard/wallet-standard), so there is no adapter list to configure.

## Install

```shell
npm install @solana/wallet-adapter @solana/web3.js @solana/kit @solana/react @solana/kit-plugin-wallet
```

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

const ENDPOINT = 'https://api.mainnet-beta.solana.com';

function App() {
    return (
        <ConnectionProvider endpoint={ENDPOINT}>
            <WalletProvider chain="solana:mainnet" endpoint={ENDPOINT}>
                <WalletModalProvider>
                    <WalletMultiButton />
                    <Profile />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

function Profile() {
    const { publicKey } = useWallet();
    return publicKey ? <p>Connected: {publicKey.toBase58()}</p> : <p>Not connected</p>;
}
```

`<WalletProvider>` handles wallet discovery and signing. `<ConnectionProvider>` publishes a web3.js `Connection` for `useConnection()`. The two are independent — render whichever you need.

## Hooks

| Hook | Returns |
| --- | --- |
| `useWallet()` | The connected wallet: `publicKey`, `wallets`, `select`, `connect`, `disconnect`, `signMessage`, `signIn`, `signTransaction`, `signAllTransactions`, `sendTransaction`, `status` |
| `useConnection()` | `{ connection }` — the web3.js `Connection` from `<ConnectionProvider>` |
| `useAnchorWallet()` | The connected wallet as the `Wallet` interface Anchor providers expect, or `undefined` |

### Sending a transaction

```tsx
const { publicKey, sendTransaction } = useWallet();
const { connection } = useConnection();

const signature = await sendTransaction(transaction, connection);
```

Wallets that support `solana:signAndSendTransaction` broadcast the transaction themselves; the rest are signed and then sent through `connection`.

## UI components

`<WalletMultiButton />`, `<WalletModalProvider />`, `<WalletModal />`, `<WalletListItem />`, `<WalletIcon />`, and `<Button />`, styled by `@solana/wallet-adapter/styles.css`. `useWalletModal()` opens and closes the modal from your own components.

## Transaction helpers

For code that crosses between web3.js and Kit signers: `toKitTransaction`, `toVersionedTransaction`, `toLegacyTransaction`, `signKitTransactions`, `signTransactionsWithWalletSigner`, `canSignTransactions`, and `isVersionedTransaction`.

## License

MIT
