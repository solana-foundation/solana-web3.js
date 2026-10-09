# `@solana/web3.js-example-basics`

Node scripts that show common operations with `@solana/web3.js` v3, one file per operation:

| Script                                             | What it shows                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`system-transfer.ts`](src/system-transfer.ts)     | Generates two keypairs, airdrops SOL to the sender, transfers lamports with `SystemProgram.transfer`, and checks both balances.                                                                                                                                                                                                                               |
| [`spl-token.ts`](src/spl-token.ts)                 | Creates a mint, mints to the payer's associated token account, transfers to a second owner, then reads the mint and both token accounts back with `connection.getAccountInfo` and the [`@solana-program/token`](https://www.npmjs.com/package/@solana-program/token) decoders. See the [SPL Token migration guide](../../docs/web3js-spl-token-migration.md). |
| [`partial-sign.ts`](src/partial-sign.ts)           | A server fee payer partially signs a transaction and serializes it with `requireAllSignatures: false`; the user deserializes it with `Transaction.from`, co-signs, and sends it.                                                                                                                                                                              |
| [`compute-budget.ts`](src/compute-budget.ts)       | Simulates a transfer at the maximum compute unit limit, sends it with `setComputeUnitLimit` set to the simulated units plus 10% and a `setComputeUnitPrice` priority fee, and reads the consumed units and fee back with `getTransaction`. The local validator has no fee market, so the price only demonstrates the API.                                     |
| [`v0-lookup-table.ts`](src/v0-lookup-table.ts)     | Creates and extends an address lookup table, waits for the slot after its last extension, then sends a v0 `VersionedTransaction` that transfers SOL to the table's addresses.                                                                                                                                                                                 |
| [`v1-fee-estimation.ts`](src/v1-fee-estimation.ts) | Builds a version 1 transaction, simulates it at the maximum limits to measure compute units and loaded account data, sets those estimates plus 10% and a priority fee in the message's `transactionConfig`, and checks that `getFeeForMessage` matches the fee charged.                                                                                       |
| [`ws-subscriptions.ts`](src/ws-subscriptions.ts)   | Subscribes to the recipient with `onAccountChange` and `onLogs`, sends a SOL transfer, subscribes to its signature with `onSignature`, waits for all three notifications, then removes the listeners so the websocket closes and the script exits.                                                                                                            |

## Run

Start a local validator in another terminal:

```shell
just validator
```

Then build web3.js and run a script:

```shell
pnpm --filter @solana/web3.js compile:js
pnpm --filter @solana/web3.js-example-basics start:system-transfer
pnpm --filter @solana/web3.js-example-basics start:spl-token
pnpm --filter @solana/web3.js-example-basics start:partial-sign
pnpm --filter @solana/web3.js-example-basics start:compute-budget
pnpm --filter @solana/web3.js-example-basics start:v0-lookup-table
pnpm --filter @solana/web3.js-example-basics start:v1-fee-estimation
pnpm --filter @solana/web3.js-example-basics start:ws-subscriptions
```

Set `RPC_URL` to point at a different cluster. `test:live` runs every script and exits non-zero if any assertion fails.

## v1 to v3 differences shown

- `Keypair.generate()` is async.
- `getBalance` returns a `bigint`.
- `SystemProgram.transfer`, `Transaction`, and `sendAndConfirmTransaction` keep their v1 shape; `lamports` accepts a `bigint`.
- `@solana-program/token` replaces `@solana/spl-token`. Its instructions and instruction plans go straight into `new Transaction().add(...)`, next to `SystemProgram.createAccount`.
- `getMintToATAInstructionPlanAsync` and `getTransferToATAInstructionPlanAsync` derive the associated token account and create it if needed, replacing `getOrCreateAssociatedTokenAccount` plus a separate mint or transfer instruction.
- `findAssociatedTokenPda` replaces `getAssociatedTokenAddressSync` and is async.
- A v3 `Keypair` is passed directly to signer fields (`payer`, `mintAuthority`, `authority`); a v3 `PublicKey` is passed directly to account fields, and `.toBase58()` is used where an address string is required.
- `getMintDecoder()` / `getTokenDecoder()` replace `getMint` / `getAccount`, and amounts and supply are `bigint`.
- `ComputeBudgetProgram`, `TransactionMessage`, `compileToV0Message`, and `extendLookupTable` keep their v1 shape. `setComputeUnitLimit` still takes a `number`, while simulated and confirmed compute units are `bigint`.
- `AddressLookupTableProgram.createLookupTable` and `VersionedTransaction.sign` are async, and `getSlot` returns a `bigint`.
- Version 1 transactions are new in v3. `compileToV1Message` takes resource limits in `transactionConfig` instead of compute budget instructions, which are ignored in version 1 transactions. `priorityFeeLamports` is a flat lamport total rather than a price per compute unit, and an unset `computeUnitLimit` or `loadedAccountsDataSizeLimit` budgets zero, so set both. Fetch them with `maxSupportedTransactionVersion: 1`.
- `Transaction.partialSign`, `sign`, `verifySignatures`, and `serialize` are async. `serialize` resolves to a `Uint8Array`, which `Transaction.from` and `sendRawTransaction` accept directly.
- `onAccountChange`, `onLogs`, `onSignature`, and their `remove*Listener` methods keep their v1 shape, and account notifications report `lamports` as a `bigint`. `onSignature` listeners remove themselves after the first notification. The websocket closes shortly after the last listener is removed, so remove every other listener for a Node script to exit.
