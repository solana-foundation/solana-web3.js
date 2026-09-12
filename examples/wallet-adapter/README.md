# `@solana/wallet-adapter-example`

Demo application for [`@solana/wallet-adapter`](../../packages/wallet-adapter), modeled on the original [wallet-adapter example](https://anza-xyz.github.io/wallet-adapter/example/).

It exercises the connect/disconnect/modal/multi buttons, the AutoConnect and network settings, legacy, v0 and v1 transaction sending, transaction signing, message signing, [off-chain message signing](https://docs.anza.xyz/proposals/off-chain-message-signing) and Sign In With Solana.

```shell
pnpm install
pnpm --filter @solana/wallet-adapter compile:js
pnpm --filter @solana/wallet-adapter-example dev
```

`pnpm --filter @solana/wallet-adapter-example build` writes a static site to `out/`. Set `BASE_PATH` (and optionally `ASSET_PREFIX`) to serve it from a sub-path, for example `BASE_PATH=/solana-web3.js/wallet-adapter`.
