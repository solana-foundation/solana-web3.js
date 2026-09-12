# Release Notes

These notes summarize the user-facing changes in `@solana/wallet-adapter` (this package) relative to the 0.x `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, `@solana/wallet-adapter-base` and `@solana/wallet-adapter-base-ui` packages.

## Highlights

- This package is designed for use with `@solana/web3.js` v3+ (`@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, `@solana/wallet-adapter-base` and `@solana/wallet-adapter-base-ui` packages are compatible with v1.x)
- One package, `@solana/wallet-adapter`, replaces the React, React UI, base and base UI packages. The `/core` entry is framework-neutral and the `/ui` entry holds the components.
- Wallets are discovered through Wallet Standard registration in the browser. There are no per-wallet adapter constructors and no aggregate wallets package.
- The familiar providers, hooks, components, CSS classes and `WalletError` subclasses are kept, so most applications migrate by changing imports and `WalletProvider` props.
- `signOffchainMessage` is new, for wallets that advertise `solana:signOffchainMessage` ([ref](https://docs.anza.xyz/proposals/off-chain-message-signing)).
- `useAnchorWallet()` is kept but deprecated until an Anchor release targets web3.js v3.

## Breaking Changes

Imports:

| v1                                                               | v3                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------- |
| `@solana/wallet-adapter-react`, `-react-ui`, `-base-ui`          | `@solana/wallet-adapter` (UI also at `/ui`)               |
| `@solana/wallet-adapter-react-ui/styles.css`                     | `@solana/wallet-adapter/styles.css`                       |
| `@solana/wallet-adapter-base`                                    | `@solana/wallet-adapter/core`                             |
| `@solana/wallet-adapter-wallets` and wallet constructor packages | gone; wallets register themselves through Wallet Standard |

`WalletProvider` props:

| v1                                                       | v3                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `wallets={[new PhantomWalletAdapter()]}`                 | discovered; optional `filter` predicate                                                  |
| network chosen per adapter                               | `chain="solana:mainnet"`, required                                                       |
| `autoConnect` off by default, could be a callback        | boolean, on by default; call `signIn()` yourself                                         |
| `localStorageKey` (`walletName`, stored the picked name) | `storageKey` (`kit-wallet`, stores the authorized account); the old value isn't migrated |
| `onError(error, adapter?)`                               | same; `adapter` carries `name` and `icon`                                                |

Changing `chain`, `filter` or the storage options rebuilds the client and disconnects, so keep them stable.

Behavior:

- `select(name)` records the choice and never throws. It no longer connects; `connect()` does, and rejects with `WalletNotSelectedError` or `WalletNotReadyError`. The packaged modal selects and connects in one click.
- `publicKey` describes the live connection; `selectedWallet` is the picker's choice, and `wallet` is the connected wallet or, while disconnected, the selection. If a switch is rejected, the previous connection stays. The disconnect button and `useWalletDisconnectButton` are enabled only while connected.
- `signTransaction`, `signAllTransactions`, `signMessage` and `signOffchainMessage` are `undefined` when the account can't do them; `signIn` when the selected wallet can't. Sign-in hands back the Wallet Standard output for you to verify.
- `supportedTransactionVersions` moves from the adapter to the snapshot and describes the connected account rather than the wallet. It is `null` while disconnected; test membership for the version you intend to send, for example `supportedTransactionVersions?.has(1)`.
- Everything returns a promise. Hooks throw `WalletConfigError` when their provider is missing.
- A `WalletError` thrown inside an operation comes out unchanged, so `instanceof` still works. A request that a newer one superseded rejects with Kit's `AbortError` and isn't reported to `onError`.
- `sendTransaction` fills a legacy transaction's payer and blockhash, applies `options.signers`, checks the wallet's supported versions, and passes `skipPreflight`, `preflightCommitment`, `maxRetries` and `minContextSlot` to whichever side sends. Extra signers on a `VersionedTransaction` need Kit message signing; v3 `Keypair` has it.
- The UI keeps its names and CSS classes. The modal is a native `<dialog>` with no overlay element, so `div.wallet-adapter-modal` and `.wallet-adapter-modal-overlay` selectors become `.wallet-adapter-modal`. Menu actions are buttons. The trigger does nothing while connecting or disconnecting. A consumer `onClick` runs first and `preventDefault` cancels the built-in action.
- The stylesheet no longer sets a font. The button, dropdown and modal inherit the application's `font-family` instead of v1's `'DM Sans', 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif`; an application that sets no body font sees the browser default and can set one on `.wallet-adapter-button`, `.wallet-adapter-dropdown-list` and `.wallet-adapter-modal-wrapper`.
- React 19 and Node >=20.18.0, because Kit's wallet plugin requires them.

## Removed

- Per-wallet adapter objects with `adapter.on('connect' | 'disconnect' | 'error' | 'readyStateChange')`. Every Wallet Standard wallet shares one implementation, so the snapshot is the only event source.
- `adapter.url` and the install links v1 UIs built from it. Wallet Standard has no install URL.
- `readyState` beyond `Installed`, and the modal's "More options" grouping. A discovered wallet is by definition installed.
- `select()` auto-connecting when `autoConnect` is set. The modal connects explicitly; a custom picker calls `connect()`.
- The `walletName` localStorage cache and its migration. Kit stores the authorized account instead.
- Adapter type aliases (`Adapter`, `WalletAdapter*`, `Signer*WalletAdapter*`, `WalletName`, `isWalletAdapterCompatibleStandardWallet`) and the error classes only adapter constructors threw (`WalletLoadError`, `WalletTimeoutError`, `WalletWindow*Error`, `WalletAccountError`, `WalletPublicKeyError`, `WalletKeypairError`, `WalletDisconnectedError`).
- `Base*WalletAdapter` classes, `EventEmitter`, wallet constructors and the aggregate wallets package.
- Automatic Mobile Wallet Adapter and WalletConnect setup. Both have maintained Wallet Standard integrations that apps register once.
- React 18.
