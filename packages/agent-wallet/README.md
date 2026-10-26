# `@solana/agent-wallet`

A scriptable, headless [Wallet Standard](https://github.com/wallet-standard/wallet-standard) wallet for driving Solana dApps from AI agents ([agent-browser](https://github.com/vercel-labs/agent-browser)) and end-to-end tests. It signs for real with a Kit keypair, so signatures verify and transactions land on a live validator, and it registers itself like any installed wallet extension.

This package is private to the workspace and is not published.

> [!WARNING]
> The generated init script embeds the wallet's secret key in plain text. Use throwaway test keys only.

## Agent-browser

Generate an init script, fund the printed address, and load the script before the page:

```shell
just agent-wallet --out wallet.js
# agent wallet 8p9T…rjVo (auto) -> http://127.0.0.1:8899

surfpool start --airdrop 8p9T…rjVo
agent-browser --init-script wallet.js open http://localhost:3000
```

The wallet shows up as **Agent Wallet** in any dApp that discovers wallets through the Wallet Standard registry, such as [`examples/wallet-adapter`](../../examples/wallet-adapter) (run it with `NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899`).

| Option             | Default                 | Description                                                     |
| ------------------ | ----------------------- | --------------------------------------------------------------- |
| `--keypair <path>` | a fresh keypair         | Solana CLI keypair JSON                                         |
| `--rpc <url>`      | `http://127.0.0.1:8899` | Endpoint `solana:signAndSendTransaction` submits to             |
| `--chain <chain>`  | every `solana:` cluster | Advertised chain, repeatable                                    |
| `--mode <mode>`    | `auto`                  | `auto` signs immediately, `manual` waits for approval           |
| `--delay <ms>`     |                         | Wait before each `auto` approval, for demos and loading states  |
| `--name <name>`    | `Agent Wallet`          | Wallet name                                                     |
| `--out <path>`     | stdout                  | Output file                                                     |

### Manual approvals

With `--mode manual`, every connect and signing request waits until the agent decides it through `window.__agentWallet`. Silent connects (autoconnect) never prompt: they return only accounts the agent already approved, so autoconnect finds nothing until a regular connect is approved. In `auto` mode they connect right away.

```shell
agent-browser eval 'window.__agentWallet.pending()'
# [{"id":2,"method":"solana:signAndSendTransaction","inputs":[{"account":"3DdX…FkJu",
#   "feePayer":"3DdX…FkJu","instructions":1,"programs":["1111…1111"],"version":0}]}]

agent-browser eval 'window.__agentWallet.approve(2)'
agent-browser eval 'window.__agentWallet.reject(3)'   # dApp sees "The user rejected the request"
```

`window.__agentWallet` also exposes `address`, `mode` and `setMode('auto' | 'manual')`.

## Tests

`createAgentWallet` builds the same wallet in-process, for registering with `getWallets().register(wallet)` in tests:

```ts
import {createAgentWallet} from '@solana/agent-wallet';

const {approvals, signers, wallet} = await createAgentWallet({
  features: ['standard:connect', 'solana:signTransaction'],
  mode: 'manual',
});
```
