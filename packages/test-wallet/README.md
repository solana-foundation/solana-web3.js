# `@solana/test-wallet`

A scriptable, headless [Wallet Standard](https://github.com/wallet-standard/wallet-standard) wallet for driving Solana dApps from AI agents ([agent-browser](https://github.com/vercel-labs/agent-browser)) and end-to-end tests. It signs for real with a Kit keypair, so signatures verify and transactions land on a live validator, and it registers itself like any installed wallet extension.

This package is private to the workspace and is not published.

> [!WARNING]
> This is a testing tool, not a wallet for agents to hold funds. In `auto` mode it approves every request, and the generated init script embeds its secret key in plain text. Use throwaway keys on devnet or a local validator only.

## Agent-browser

Generate an init script, fund the printed address, and load the script before the page:

```shell
just test-wallet-script --out wallet.js
# test wallet 8p9T…rjVo (auto) -> http://127.0.0.1:8899

surfpool start --airdrop 8p9T…rjVo
agent-browser --init-script wallet.js open http://localhost:3000
```

The wallet shows up as **Test Wallet** in any dApp that discovers wallets through the Wallet Standard registry, such as [`examples/wallet-adapter`](../../examples/wallet-adapter) (run it with `NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899`).

| Option             | Default                 | Description                                                     |
| ------------------ | ----------------------- | --------------------------------------------------------------- |
| `--keypair <path>` | a fresh keypair         | Solana CLI keypair JSON                                         |
| `--rpc <url>`      | `http://127.0.0.1:8899` | Endpoint `solana:signAndSendTransaction` submits to             |
| `--chain <chain>`  | every `solana:` cluster | Advertised chain, repeatable                                    |
| `--mode <mode>`    | `auto`                  | `auto` signs immediately, `manual` waits for approval           |
| `--delay <ms>`     |                         | Wait before each `auto` approval, for demos and loading states  |
| `--name <name>`    | `Test Wallet`          | Wallet name                                                     |
| `--out <path>`     | stdout                  | Output file                                                     |

### Manual approvals

With `--mode manual`, every connect and signing request waits until the agent decides it through `window.__testWallet`. Silent connects (autoconnect) never prompt: they return only accounts the agent already approved, so autoconnect finds nothing until a regular connect is approved. In `auto` mode they connect right away.

```shell
agent-browser eval 'window.__testWallet.pending()'
# [{"id":2,"method":"solana:signAndSendTransaction","inputs":[{"account":"3DdX…FkJu",
#   "feePayer":"3DdX…FkJu","instructions":1,"programs":["1111…1111"],"version":0}]}]

agent-browser eval 'window.__testWallet.approve(2)'
agent-browser eval 'window.__testWallet.reject(3)'   # dApp sees "The user rejected the request"
```

`window.__testWallet` also exposes `address`, `mode` and `setMode('auto' | 'manual')`.

## Tests

`createTestWallet` builds the same wallet in-process, for registering with `getWallets().register(wallet)` in tests:

```ts
import {createTestWallet} from '@solana/test-wallet';

const {approvals, signers, wallet} = await createTestWallet({
  features: ['standard:connect', 'solana:signTransaction'],
  mode: 'manual',
});
```
