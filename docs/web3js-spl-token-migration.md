# Migrating from `@solana/spl-token` to `@solana-program/token`

This guide is for application and SDK developers upgrading token-program usage as part of a `@solana/web3.js` v1 → v3 migration.

`@solana/spl-token` was the long-standing community client for the SPL Token program. With web3.js v3, kit codecs and Codama-generated program clients become first-class — so the token program now ships an official kit-native client at [`@solana-program/token`](https://www.npmjs.com/package/@solana-program/token). The Codama-generated surface mirrors every token instruction, account, and PDA.

v3 web3.js keeps the familiar `Connection`, `Keypair`, `Transaction`, `SystemProgram`, and `sendAndConfirmTransaction` surface from 1.x, but `Transaction.add(...)` now natively accepts kit-shaped instructions from `@solana-program/token` — and also kit `InstructionPlan` inputs, so the non-generated `@solana-program/token` helpers that return plans (`getCreateMintInstructionPlan`, `getMintToATAInstructionPlan(Async)`, `getTransferToATAInstructionPlan(Async)`) drop directly into `.add(...)`. The `Message` / `MessageV0` compilers accept the same inputs. So migrating off `@solana/spl-token` does **not** require adopting kit transaction messages, plugin clients, or a separate kit RPC — from v3.1.0 the `Connection` itself is a Kit client.

If you want to use this guide as reusable agent context, the token migration is covered by the v1→v3 migration skill at [`skills/web3js-v1-to-v3-migration/reference/spl-token.md`](../skills/web3js-v1-to-v3-migration/reference/spl-token.md).

If your mints live on Token-2022, the equivalent client is [`@solana-program/token-2022`](https://www.npmjs.com/package/@solana-program/token-2022). Everything below applies; only the package name and the explicit `tokenProgram` argument on ATA derivation change.

## Minimum versions

| Package                      | Minimum  | What it unlocks |
| ---------------------------- | -------- | --------------- |
| `@solana/web3.js`            | `3.1.0`  | `Connection` implements Kit's `ClientWithRpc`, `ClientWithRpcSubscriptions`, and `ClientWithGetMinimumBalance`, so it can be passed to plan helpers such as `getCreateMintInstructionPlan` |
| `@solana-program/token`      | `0.18.0` | Every address input accepts `Address \| HasAddress`: account inputs, data args like `mintAuthority`, PDA seeds, plan-helper inputs, and `programAddress` config |
| `@solana-program/token-2022` | `0.20.0` | Same as token `0.18.0` |

The rest of this guide assumes these versions. On older versions, `Address`-typed inputs need `publicKey.toBase58()`, and mint creation uses `SystemProgram.createAccount` + `getInitializeMint2Instruction` instead of `getCreateMintInstructionPlan`.

## Why this migration is needed

- **Kit clients accept Kit's `HasAddress`, which the v3 `PublicKey` class satisfies.** `PublicKey` can be passed directly to instruction builders, PDA helpers, and plan helpers. Where an `Address` or `string` is required, `.toBase58()` returns the kit-branded string.
- **PDA derivation is async.** `getAssociatedTokenAddressSync` is gone; the kit-native equivalent is `findAssociatedTokenPda(...)` which returns a `Promise<[Address, ProgramDerivedAddressBump]>`.
- **`getOrCreateAssociatedTokenAccount` has no single-call equivalent.** The idiomatic replacement is to derive the ATA, include `getCreateAssociatedTokenIdempotentInstruction(...)` in the same transaction, and let the program no-op if the account already exists.
- **`MintLayout`/`AccountLayout` are gone.** Account data is decoded through Codama codecs (`getMintDecoder()` / `getTokenDecoder()`) that work on `Uint8Array` and surface `bigint` for amounts, supply, and lamports.

## Major migration themes

- **Constant swap.** `TOKEN_PROGRAM_ID` → `TOKEN_PROGRAM_ADDRESS`. `ASSOCIATED_TOKEN_PROGRAM_ID` → `ASSOCIATED_TOKEN_PROGRAM_ADDRESS`. `NATIVE_MINT` → `new PublicKey('So11111111111111111111111111111111111111112')` (not currently exported). Your own addresses stay `PublicKey`.
- **Instruction builders rename.** `createXInstruction(...)` becomes `getXInstruction({...})` with a single object argument.
- **High-level helpers are decomposed — but plan helpers re-bundle the common cases.** The most common spl-token "do-it-all" helpers (`createMint`, `mintTo` + ATA, `transfer` + ATA) have non-generated plan helpers in `@solana-program/token` that bundle the two-instruction sequence into one `sequentialInstructionPlan(...)`. Drop them straight into `Transaction.add(...)`. For everything else (`burn`, `approve`, `revoke`, `setAuthority`, `freezeAccount`, `thawAccount`, `closeAccount`), it's still "build the instruction, append, send".
- **Reads use codecs.** Replace `getMint`/`getAccount` with `connection.getAccountInfo(address)` + `getMintDecoder().decode(data)` / `getTokenDecoder().decode(data)`.

## Plan helpers (preferred path for the common cases)

`@solana-program/token` ships a small set of non-generated helpers that return kit `InstructionPlan`s — sequential bundles of two or three underlying instructions. v3 `Transaction.add(...)` flattens these for you (1.x had no notion of plans). This is the lowest-churn replacement for the most-used spl-token helpers:

| `@solana/spl-token` helper                  | `@solana-program/token` plan helper                              |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `createMint(...)`                           | `await getCreateMintInstructionPlan(connection, { payer, newMint, decimals, mintAuthority, freezeAuthority? })` |
| `mintToChecked(...)` + ensure-ATA           | `getMintToATAInstructionPlan(...)` / `getMintToATAInstructionPlanAsync(...)` |
| `transferChecked(...)` + ensure-dest-ATA    | `getTransferToATAInstructionPlan(...)` / `getTransferToATAInstructionPlanAsync(...)` |

`getCreateMintInstructionPlan` is async and takes a `ClientWithGetMinimumBalance` first, which a v3 `Connection` satisfies, so rent for the mint account is fetched for you. The `*Async` variants derive the ATA(s) via `findAssociatedTokenPda` so you don't have to call it explicitly. All helpers take a `PublicKey` for address fields (`owner`, `mint`, `recipient`) and a `TransactionSigner` for signer-typed fields (`payer`, `newMint`, `mintAuthority`, `authority`). A v3 `Keypair` **is** a `TransactionSigner` — it implements Kit's `TransactionPartialSigner` interface — so pass the keypair straight in, no shim needed. Actual signing still happens via v3's `sendAndConfirmTransaction(connection, tx, [keypair, ...])`.

There's also `getBatchInstruction([...])`, which packs multiple non-batch token instructions into a single CPI-friendly batch instruction. Not a plan — use it where you'd otherwise emit many small ixs.

## API mapping

### Constants and addresses

| `@solana/spl-token`              | `@solana-program/token`                  |
| -------------------------------- | ---------------------------------------- |
| `TOKEN_PROGRAM_ID`               | `TOKEN_PROGRAM_ADDRESS`                  |
| `ASSOCIATED_TOKEN_PROGRAM_ID`    | `ASSOCIATED_TOKEN_PROGRAM_ADDRESS`       |
| `NATIVE_MINT`                    | `new PublicKey('So11111111111111111111111111111111111111112')` |
| `MINT_SIZE`                      | `getMintSize()`                          |
| `ACCOUNT_SIZE`                   | `getTokenSize()`                         |

Every `@solana-program/token` address input accepts a v3 `PublicKey` as-is.

### Bridging v3 `PublicKey` class ↔ kit-branded `Address` string

The v3 `PublicKey` from `@solana/web3.js` is a class that implements Kit's `HasAddress`; `@solana-program/token` accepts it anywhere it takes an address. Values the client returns (ATAs from `findAssociatedTokenPda`, `owner` on a decoded token account) are kit-branded `Address` strings.

```ts
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ADDRESS, getInitializeMint2Instruction } from '@solana-program/token';

const payer = await Keypair.generate();
const mint = await Keypair.generate();

// v3 SystemProgram wants the v3 PublicKey class — Keypair.publicKey returns one.
SystemProgram.createAccount({ fromPubkey: payer.publicKey, /* ... */ });

// Account inputs and Address-typed data args both take the v3 PublicKey.
getInitializeMint2Instruction({
  mint: mint.publicKey,
  decimals: 6,
  mintAuthority: payer.publicKey,
  freezeAuthority: null,
});

// Going the other way: wrap a kit Address into the v3 class for SystemProgram / Connection.
const TOKEN_PROGRAM = new PublicKey(TOKEN_PROGRAM_ADDRESS);

// Comparing against a returned kit Address (e.g. a decoded token account's owner): use the string form.
const isOwner = tokenData.owner === owner.toBase58();
```

### Associated Token Account derivation

```ts
// @solana/spl-token
const ata = getAssociatedTokenAddressSync(mint, owner);

// @solana-program/token
const [ata] = await findAssociatedTokenPda({
  mint,                                // v3 PublicKey
  owner,                               // v3 PublicKey
  tokenProgram: TOKEN_PROGRAM_ADDRESS, // required; use TOKEN_2022_PROGRAM_ADDRESS for Token-2022
});
```

`findAssociatedTokenPda` is async — surrounding functions must be `async`. It returns the kit-branded `Address`, which feeds straight back into other `@solana-program/token` calls; wrap it in `new PublicKey(ata)` only for v3 `Connection` / `SystemProgram` methods.

### `getOrCreateAssociatedTokenAccount`

There is no single-call equivalent. The replacement is to derive the ATA and include `getCreateAssociatedTokenIdempotentInstruction(...)` in the same transaction. The program no-ops if the account already exists.

```ts
const [ata] = await findAssociatedTokenPda({ mint, owner, tokenProgram: TOKEN_PROGRAM_ADDRESS });

const createAtaIx = getCreateAssociatedTokenIdempotentInstruction({
  payer,   // a TransactionSigner — a v3 Keypair works directly
  ata,     // kit Address from findAssociatedTokenPda
  owner,   // v3 PublicKey (the wallet)
  mint,    // v3 PublicKey
});

new Transaction().add(createAtaIx, /* transfer/mintTo */);
```

If you need the decoded token account after the transaction lands, fetch it with `connection.getAccountInfo(new PublicKey(ata))` and decode with `getTokenDecoder().decode(data)`.

### Instruction builders

The shape changes from positional arguments to a single object; account fields still take a v3 `PublicKey`. Naming flips from `createXInstruction` to `getXInstruction`.

| `@solana/spl-token`                              | `@solana-program/token`                            |
| ------------------------------------------------ | -------------------------------------------------- |
| `createInitializeMintInstruction`                | `getInitializeMintInstruction`                     |
| `createInitializeMint2Instruction`               | `getInitializeMint2Instruction`                    |
| `createInitializeAccountInstruction`             | `getInitializeAccountInstruction`                  |
| `createInitializeAccount3Instruction`            | `getInitializeAccount3Instruction`                 |
| `createAssociatedTokenAccountInstruction`        | `getCreateAssociatedTokenInstruction`              |
| `createAssociatedTokenAccountIdempotentInstruction` | `getCreateAssociatedTokenIdempotentInstruction` |
| `createMintToInstruction`                        | `getMintToInstruction`                             |
| `createMintToCheckedInstruction`                 | `getMintToCheckedInstruction`                      |
| `createTransferInstruction`                      | `getTransferInstruction`                           |
| `createTransferCheckedInstruction`               | `getTransferCheckedInstruction`                    |
| `createBurnInstruction`                          | `getBurnInstruction`                               |
| `createBurnCheckedInstruction`                   | `getBurnCheckedInstruction`                        |
| `createApproveInstruction`                       | `getApproveInstruction`                            |
| `createApproveCheckedInstruction`                | `getApproveCheckedInstruction`                     |
| `createRevokeInstruction`                        | `getRevokeInstruction`                             |
| `createSetAuthorityInstruction`                  | `getSetAuthorityInstruction`                       |
| `createCloseAccountInstruction`                  | `getCloseAccountInstruction`                       |
| `createFreezeAccountInstruction`                 | `getFreezeAccountInstruction`                      |
| `createThawAccountInstruction`                   | `getThawAccountInstruction`                        |
| `createSyncNativeInstruction`                    | `getSyncNativeInstruction`                         |
| `createInitializeMultisigInstruction`            | `getInitializeMultisigInstruction`                 |

`AuthorityType` is still a numeric enum in the Codama-generated client — keep using named variants (e.g. `AuthorityType.MintTokens`, `AuthorityType.FreezeAccount`).

Prefer the `*Checked` variants for transfers, mints, burns, and approvals — they enforce decimals and mint identity.

### Signer fields on instruction builders

Several builders type the authority field as `Address | TransactionSigner` (`mintAuthority` on `getMintToCheckedInstruction`, `authority` on `getTransferCheckedInstruction`, `payer` on `getCreateAssociatedTokenIdempotentInstruction`, etc.). Passing a `PublicKey` or `Address` will **not** mark that account as a signer in the resulting meta. A v3 `Keypair` implements Kit's `TransactionPartialSigner`, a valid `TransactionSigner` — pass the keypair directly (no shim, no noop signer). The Codama builder reads `.address` (a kit-branded `Address`) off it to set the signer-role meta; actual signing still happens via `sendAndConfirmTransaction(connection, tx, [keypair])`:

```ts
getMintToCheckedInstruction({
  mint: mint.publicKey,
  token: ata,
  mintAuthority: payer, // a v3 Keypair is a TransactionSigner
  amount: 1_000_000n,
  decimals: 6,
});
```

### High-level send helpers

`@solana/spl-token` exposed many helpers that built an instruction and sent it in one call (`createMint`, `mintTo`, `transfer`, `burn`, `approve`, `revoke`, `setAuthority`, `freezeAccount`, `thawAccount`, `closeAccount`, `getOrCreateAssociatedTokenAccount`). `@solana-program/token` doesn't include them as send-helpers, but it does ship non-generated **plan helpers** for the three most common multi-instruction cases — `createMint`, `mintTo` + ATA, `transfer` + ATA — that drop straight into `Transaction.add(...)`. See "Plan helpers" above. For everything else, replace the spl-token helper with explicit "build an instruction, add to a `Transaction`, send" code.

### Account fetches and decoders

| `@solana/spl-token`             | `@solana-program/token`                       |
| ------------------------------- | --------------------------------------------- |
| `getMint(connection, address)`  | `connection.getAccountInfo(pubkey)` + `getMintDecoder().decode(data)` |
| `getAccount(connection, addr)`  | `connection.getAccountInfo(pubkey)` + `getTokenDecoder().decode(data)` |
| `getMultisig(connection, addr)` | `connection.getAccountInfo(pubkey)` + `getMultisigDecoder().decode(data)` |
| Batched `getMint` / `getAccount` | `connection.getMultipleAccountsInfo(pubkeys)` + the matching decoder |
| `unpackMint(addr, accountInfo)` | `getMintDecoder().decode(uint8Array)` or `decodeMint(encodedAccount)` |
| `unpackAccount(addr, info)`     | `getTokenDecoder().decode(uint8Array)` or `decodeToken(encodedAccount)` |
| `MintLayout` / `AccountLayout`  | `getMintCodec()` / `getTokenCodec()`          |

v3 `connection.getAccountInfo(pubkey)` returns `{ data: Uint8Array, owner: PublicKey, lamports, executable, ... }` — `owner` is a `PublicKey` class instance, so compare with `owner.equals(...)`, never `owner === TOKEN_PROGRAM_ADDRESS`. Feed `data` straight into the decoder.

Prefer `Connection` methods for reads. The generated `fetchMint` / `fetchToken` helpers take a raw Kit `Rpc`; don't pass them `connection.rpc`, which exists only so `Connection` satisfies Kit's `ClientWithRpc`.

Numeric fields on decoded mint/token state (`supply`, `amount`) are `bigint`. Authority fields (`mintAuthority`, `freezeAuthority`) come back as a kit `Option<Address>` — unwrap with `unwrapOption(...)` from `@solana/kit` or check `option.__option === 'Some'`.

## Concrete before/after

### Create a mint

```ts
// @solana/spl-token + web3.js v1
import { createMint } from '@solana/spl-token';
import { Connection, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';

const mint = await createMint(connection, payer, payer.publicKey, null, 6);
```

```ts
// @solana-program/token + web3.js v3 (preferred — plan helper)
import { getCreateMintInstructionPlan } from '@solana-program/token';
import { Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

const mint = await Keypair.generate();

const tx = new Transaction().add(
  await getCreateMintInstructionPlan(connection, {
    payer,                          // v3 Keypair — a TransactionSigner
    newMint: mint,                  // v3 Keypair — a TransactionSigner
    decimals: 6,
    mintAuthority: payer.publicKey, // v3 PublicKey
    freezeAuthority: null,
  }),
);
await sendAndConfirmTransaction(connection, tx, [payer, mint]);
```

For a fixed lamport amount, pass `mintAccountLamports`; for a different system/token program, pass `{ systemProgram, tokenProgram }` as the third argument. To insert other instructions between the two steps, expand the plan to its primitives instead:

```ts
import {
  getInitializeMint2Instruction,
  getMintSize,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token';
import { PublicKey, SystemProgram } from '@solana/web3.js';

const TOKEN_PROGRAM = new PublicKey(TOKEN_PROGRAM_ADDRESS);
const space = getMintSize();
const lamports = await connection.getMinimumBalance(space);

const tx = new Transaction().add(
  SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports,
    space,
    programId: TOKEN_PROGRAM,
  }),
  getInitializeMint2Instruction({
    mint: mint.publicKey,
    decimals: 6,
    mintAuthority: payer.publicKey,
    freezeAuthority: null,
  }),
);
await sendAndConfirmTransaction(connection, tx, [payer, mint]);
```

### Mint into a recipient's ATA

```ts
// @solana/spl-token
const recipientAta = await getOrCreateAssociatedTokenAccount(
  connection, payer, mint, recipient.publicKey,
);
await mintToChecked(connection, payer, mint, recipientAta.address, payer, 1_000_000n, 6);
```

```ts
// @solana-program/token + web3.js v3 (preferred — plan helper)
import { getMintToATAInstructionPlanAsync } from '@solana-program/token';

const tx = new Transaction().add(
  await getMintToATAInstructionPlanAsync({
    payer,
    owner: recipient.publicKey,
    mint: mint.publicKey,
    mintAuthority: payer,
    amount: 1_000_000n,
    decimals: 6,
    // ata omitted → derived via findAssociatedTokenPda inside the helper
  }),
);
await sendAndConfirmTransaction(connection, tx, [payer]);
```

To stay explicit (or when the ATA is already known and you want to skip the extra PDA derivation), drop the `Async`:

```ts
const [ata] = await findAssociatedTokenPda({
  mint: mint.publicKey,
  owner: recipient.publicKey,
  tokenProgram: TOKEN_PROGRAM_ADDRESS,
});

new Transaction().add(
  getMintToATAInstructionPlan({
    payer,
    ata,
    owner: recipient.publicKey,
    mint: mint.publicKey,
    mintAuthority: payer,
    amount: 1_000_000n,
    decimals: 6,
  }),
);
```

### Transfer to a (possibly new) recipient

```ts
// @solana/spl-token
const destinationAta = await getOrCreateAssociatedTokenAccount(
  connection, payer, mint, recipient,
);
await transferChecked(
  connection, payer, sourceAta, mint, destinationAta.address, owner, amount, decimals,
);
```

```ts
// @solana-program/token + web3.js v3 (preferred — plan helper)
import { getTransferToATAInstructionPlanAsync } from '@solana-program/token';

const tx = new Transaction().add(
  await getTransferToATAInstructionPlanAsync({
    payer,
    mint,
    authority: owner, // v3 Keypair — a TransactionSigner
    recipient,
    amount,
    decimals,
    // source / destination omitted → both derived via findAssociatedTokenPda
  }),
);
await sendAndConfirmTransaction(connection, tx, [payer, owner]);
```

### Read a mint and a token account

```ts
// @solana/spl-token
const mintInfo = await getMint(connection, mint);            // { supply: bigint, decimals: number, ... }
const accountInfo = await getAccount(connection, tokenAccount); // { amount: bigint, owner: PublicKey, ... }
```

```ts
// @solana-program/token + web3.js v3
import { getMintDecoder, getTokenDecoder } from '@solana-program/token';

const mintRaw = await connection.getAccountInfo(mint);
const tokenRaw = await connection.getAccountInfo(tokenAccount);
if (!mintRaw || !tokenRaw) throw new Error('not found');

const mintData = getMintDecoder().decode(mintRaw.data);   // { supply: bigint, decimals: number, mintAuthority: Option<Address>, ... }
const tokenData = getTokenDecoder().decode(tokenRaw.data); // { amount: bigint, owner: Address, delegate: Option<Address>, ... }
```

`mintData.supply` and `tokenData.amount` are `bigint`. `tokenData.owner` is now the kit-branded `Address` string, not a `PublicKey`. `mintAuthority` / `freezeAuthority` / `delegate` come back as kit `Option<Address>` — unwrap with `unwrapOption(...)` from `@solana/kit`.

## Gotchas

- **Don't keep both clients on the same code path.** `TOKEN_PROGRAM_ID` (PublicKey) and `TOKEN_PROGRAM_ADDRESS` (`Address`) compare-and-collapse to different things; mixing them in one transaction is a top source of subtle bugs.
- **Bridge the two address types deliberately.** v3 web3.js's `PublicKey` class and `@solana-program/token`'s kit-branded `Address` string are different at the type level. Pass the `PublicKey` to `@solana-program/token` directly; use `.toBase58()` to compare against returned `Address` values, and `new PublicKey(kitAddr)` when passing kit → v3.
- **Don't build a second RPC.** Pass the `Connection` to plan helpers and use `Connection` methods for reads instead of creating a `createSolanaRpc(...)` client beside it.
- **Await `getCreateMintInstructionPlan`.** It is async and takes the `Connection` as its first argument; `Transaction.add(promise)` fails.
- **Pass a `Keypair` to signer fields.** Builder fields typed `Address | TransactionSigner` only emit a signer-role account meta when given the signer branch. A v3 `Keypair` implements Kit's `TransactionPartialSigner`, a valid `TransactionSigner` — pass it straight through (no shim, no noop signer). Actual signing happens via `sendAndConfirmTransaction(connection, tx, [keypair])`.
- **Classic vs Token-2022.** `@solana-program/token` targets the classic Token program. For Token-2022 mints, swap to `@solana-program/token-2022` and pass that program's address through `findAssociatedTokenPda({ tokenProgram })`. Don't hardcode `TOKEN_PROGRAM_ADDRESS` in code paths that can see either mint.
- **`bigint` everywhere amounts live.** `amount`, `supply`, and lamports are `bigint`. Don't `Number(...)`-coerce them on the hot path — convert only at JSON or UI boundaries, and check for safe-range issues.
- **`Option<Address>` on authorities.** `mintAuthority`, `freezeAuthority`, and `delegate` are kit `Option<Address>` values, not nullable strings. Unwrap them explicitly before printing or comparing.
- **`Buffer` vs `Uint8Array`.** Codama codecs work on `Uint8Array`. v3 `connection.getAccountInfo(addr).data` is already `Uint8Array`. If you previously did `MintLayout.decode(accountInfo.data)` against a `Buffer`, switch to `getMintDecoder().decode(uint8Array)` and stop carrying `Buffer` through the app.
- **Migration order.** This migration usually rides on top of a broader `@solana/web3.js` v1 → v3 migration. Do that one first (see [`docs/web3js-v1-to-v3-migration.md`](./web3js-v1-to-v3-migration.md)) so `PublicKey` bridging, async `Keypair.generate()`, `bigint`, and `Uint8Array` are already in place when you swap the token client.
- **`MessagePackerInstructionPlan` is not accepted.** `Transaction.add(...)` flattens `sequentialInstructionPlan` / `parallelInstructionPlan` / `singleInstructionPlan` trees, but it rejects `MessagePackerInstructionPlan` leaves at runtime — those plan kinds are designed to span multiple transactions and can't be honored inside one. The `@solana-program/token` plan helpers above all return `sequentialInstructionPlan`s, so they're safe; the gotcha applies if you build plans yourself.

