# solana-web3.js

> [!IMPORTANT]
> Looking for Legacy `@solana/web3.js` (v.1.x)? That code exists on the [`maintenance/v1.x`](https://github.com/solana-foundation/solana-web3.js/tree/maintenance/v1.x) branch. Version 1.x is no longer actively maintained and receives critical fixes only. New development happens here, on the v3+.

This repository is a pnpm workspace containing `@solana/web3.js` and the tooling that ships alongside it. Each package is versioned and published independently; the root package is private and exists only to orchestrate installs and scripts across the workspace.

## Packages

| Package                                                       | Path                      | Description           |
| ------------------------------------------------------------- | ------------------------- | --------------------- |
| [`@solana/web3.js`](packages/web3.js/README.md)               | `packages/web3.js`        | Solana JavaScript API |
| [`@solana/wallet-adapter`](packages/wallet-adapter/README.md) | `packages/wallet-adapter` | Solana Wallet Adapter |

## Development

### Prerequisites

- [Just](https://github.com/casey/just) (command runner) — `brew install just`
- Node.js 20.18+ and pnpm 10

### Setup

```shell
just setup
```

### Common commands

```shell
just build      # bundle JavaScript and generate type definitions
just test       # unit tests across every package
just fmt        # check formatting
just lint       # check lint rules
just ci         # everything CI runs on a pull request
```

Run `just -l` to list every recipe, including the validator and release ones.
Running `just` with no arguments runs the default recipe: format, lint,
typecheck, build, and unit tests.

## Security

See [SECURITY.md](SECURITY.md) for how to report a vulnerability.
