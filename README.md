# solana-web3.js

This repository is a pnpm workspace containing `@solana/web3.js` and the tooling that ships alongside it. Each package is versioned and published independently; the root package is private and exists only to orchestrate installs and scripts across the workspace.

## Packages

| Package             | Path               | Description                                     |
| ------------------- | ------------------ | ----------------------------------------------- |
| [`@solana/web3.js`](packages/web3.js/README.md) | `packages/web3.js` | Solana JavaScript API |

## Development

Install all workspace dependencies from the repository root:

```shell
pnpm install
```

Run a script across every package:

```shell
pnpm test:unit
```

Run a script in a single package:

```shell
pnpm --filter @solana/web3.js run test:unit
```

## Security

See [SECURITY.md](SECURITY.md) for how to report a vulnerability.
