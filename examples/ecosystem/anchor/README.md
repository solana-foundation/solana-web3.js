# `@solana/web3.js-example-anchor`

[`src/swap.ts`](src/swap.ts) swaps USDC for SOL on a locally simulated [Orca Whirlpools](https://www.orca.so) SOL/USDC pool (via Surfpool) using [`@anchor-lang/core`](https://www.npmjs.com/package/@anchor-lang/core/v/next) 2 with a web3.js v3 `Connection` and `Keypair`. It runs on an embedded [Surfpool](https://www.npmjs.com/package/@solana/surfpool) forked from mainnet, so no validator, program build, or funded wallet is needed.

Anchor 2 is built on Kit, like web3.js v3, so web3.js objects work with it directly:

- `new AnchorProvider(connection, keypair)` takes a `Connection` and a `Keypair` as-is.
- `PublicKey`s work in `.accounts({...})` and `program.account.*.fetch(...)`.
- The instruction from `.instruction()` goes straight into a web3.js `Transaction`.

The Whirlpools IDL in [`idl/`](idl) was fetched from mainnet with `anchor idl fetch` and typed with `anchor idl type`.

## Run

```shell
pnpm --filter @solana/web3.js compile:js
pnpm --filter @solana/web3.js-example-anchor start
```

Set `MAINNET_RPC_URL` to fork from an endpoint other than the public mainnet one.
