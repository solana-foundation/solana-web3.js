# `@solana/spl-token` → `@solana-program/token` (token surface)

Reference companion to the v1→v3 migration skill, loaded when the migration touches token-program usage. For human-facing background, see [`docs/web3js-spl-token-migration.md`](../../../docs/web3js-spl-token-migration.md).

## When this applies
- The v1→v3 migration also touches `@solana/spl-token`: token instructions, ATAs, mint/account fetches, or token-account decoding.
- The codebase still imports `createMintToInstruction`, `createTransferCheckedInstruction`, `getOrCreateAssociatedTokenAccount`, `getAssociatedTokenAddressSync`, `getMint`, `getAccount`, `MintLayout`, `AccountLayout`, `TOKEN_PROGRAM_ID`, or `ASSOCIATED_TOKEN_PROGRAM_ID`.

If the mint is owned by Token-2022 (extensions, transfer hooks, etc.), use `@solana-program/token-2022` instead — the naming, instruction surface, and steps below are otherwise identical; only the package and the `tokenProgram` argument on ATA derivation differ.

## Minimum Versions
Target these versions (or newer). Everything below assumes them; older versions need the `.toBase58()` / `getAccountInfo` + decoder workarounds noted in "Older client versions".

| Package                      | Minimum   | What it unlocks                                                                                                                                                       |
| ---------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@solana/web3.js`            | `3.1.0`   | `Connection` implements Kit's `ClientWithRpc`, `ClientWithRpcSubscriptions`, and `ClientWithGetMinimumBalance`, so it can be passed to plan helpers such as `getCreateMintInstructionPlan` |
| `@solana-program/token`      | `0.18.0`  | `HasAddress` accepted everywhere: PDA seeds, `Address`-typed data args, plan-helper inputs, and `programAddress` config                                                |
| `@solana-program/token-2022` | `0.20.0`  | Same `HasAddress` coverage as token `0.18.0`                                                                                                                           |
| `@solana/kit`                | `^8.5.0`  | Peer dependency of the program clients                                                                                                                                 |

v3 `PublicKey` implements Kit's `HasAddress` (it exposes `.address`), so with these versions a `PublicKey` passes straight into every `@solana-program/token` input that names an account or address.

## Goal
Migrate token-program usage from `@solana/spl-token` to `@solana-program/token` while staying on v3 `@solana/web3.js`'s `Connection` / `Transaction` / `Keypair` / `sendAndConfirmTransaction` surface. Do **not** rewrite the surrounding code to kit transaction messages, plugin clients, or a separate kit RPC — v3 web3.js bridges to `@solana-program/token` natively and that's the minimal-churn migration path.

## Operating Model
- Work in narrow, behavior-scoped slices: imports → PDA derivation → instruction builders → high-level helpers → account reads.
- The bulk of churn is mechanical: `createXInstruction(...)` → `getXInstruction(...)`, positional args → a single input object, sync ATA derivation → async `findAssociatedTokenPda`, `getMint`/`getAccount` → `connection.getAccountInfo(pubkey)` + `getMintDecoder().decode(data)` / `getTokenDecoder().decode(data)`.
- Pass v3 `PublicKey` values as-is. Do not sprinkle `.toBase58()` across token call sites — every `@solana-program/token` address input accepts `HasAddress`.
- Pass the `Connection` itself wherever a Kit client is expected (`getCreateMintInstructionPlan(connection, ...)`). For reads, use `Connection` methods (`getAccountInfo`, `getMultipleAccountsInfo`) and the `@solana-program/token` decoders. Do not reach for `connection.rpc` — it exists so `Connection` satisfies Kit's `ClientWithRpc`, not as an API to call directly — and do not construct a second kit RPC with `createSolanaRpc(...)`.
- Keep `Connection`, `Transaction`, `Keypair`, `SystemProgram`, and `sendAndConfirmTransaction` from `@solana/web3.js`. v3 `Transaction.add(ix)` / `Message` / `MessageV0` accept kit-shaped instructions and instruction plans (1.x did not — that's the bridge that makes the rest of this migration possible), so `@solana-program/token` builders and plan helpers (`getCreateMintInstructionPlan`, `getMintToATAInstructionPlan(Async)`, `getTransferToATAInstructionPlan(Async)`) go straight into `.add(...)`. No manual conversion, no kit transaction-message pipeline.
- Do not keep `@solana/spl-token` alongside `@solana-program/token` for the same code path — the constants and types diverge (`PublicKey` vs `Address`) and silently mixing them is the most common source of bugs.

## Preferred Path: `@solana-program/token` Plan Helpers
For the three highest-churn spl-token helpers (`createMint`, `mintTo` + ATA, `transfer` + ATA), `@solana-program/token` ships non-generated plan helpers that bundle the account-creation / idempotent-ATA-create + checked instruction pair into a single `sequentialInstructionPlan(...)`. v3 `Transaction.add(...)` flattens these directly:

- `await getCreateMintInstructionPlan(connection, { payer, newMint, decimals, mintAuthority, freezeAuthority? })` — replaces `createMint`. Async; the first argument is a `ClientWithGetMinimumBalance`, which a v3 `Connection` satisfies, so rent for the mint account is fetched for you. Internally: `getCreateAccountInstruction` (@solana-program/system) + `getInitializeMint2Instruction`.
- `getMintToATAInstructionPlan({ payer, ata, owner, mint, mintAuthority, amount, decimals })` / `await getMintToATAInstructionPlanAsync(...)` — replaces `mintToChecked` + idempotent ATA create. The `Async` variant derives `ata` via `findAssociatedTokenPda` for you.
- `getTransferToATAInstructionPlan({ payer, source, destination, recipient, mint, authority, amount, decimals })` / `await getTransferToATAInstructionPlanAsync(...)` — replaces `transferChecked` + idempotent destination-ATA create. The `Async` variant derives `source` and `destination` for you when omitted.

Signer fields (`payer`, `newMint`, `mintAuthority`, `authority`) take a `TransactionSigner`. A v3 `Keypair` **is** a `TransactionSigner` (it implements Kit's `TransactionPartialSigner` interface), so pass the keypair directly — see step 6. Address fields (`owner`, `mint`, `recipient`, `mintAuthority` on `createMint`) take a `PublicKey` directly. Actual signing still happens via `sendAndConfirmTransaction(connection, tx, [keypair, ...])`.

When a plan helper exists for the operation you're migrating, **prefer it over hand-rolling the equivalent two-instruction sequence** — fewer call sites, fewer chances to forget the idempotent create or to pass `owner` where the builder expects `ata`.

## Fast Triage
Use regex-capable search for these patterns before chasing softer churn:

- `from ['"]@solana/spl-token['"]`
- `TOKEN_PROGRAM_ID|ASSOCIATED_TOKEN_PROGRAM_ID|TOKEN_2022_PROGRAM_ID`
- `getAssociatedTokenAddress(Sync)?\(`
- `getOrCreateAssociatedTokenAccount\(`
- `createAssociatedTokenAccount(Idempotent)?(Instruction)?\(`
- `createInitializeMint(2)?Instruction\(|createMint\(`
- `createMintTo(Checked)?Instruction\(|mintTo\(`
- `createTransfer(Checked)?Instruction\(|\btransfer\(.*spl-token`
- `createBurn(Checked)?Instruction\(|burn\(`
- `createApproveInstruction\(|createRevokeInstruction\(|approve\(|revoke\(`
- `createSetAuthorityInstruction\(|setAuthority\(|AuthorityType\.`
- `createCloseAccountInstruction\(|closeAccount\(`
- `createFreezeAccountInstruction\(|createThawAccountInstruction\(`
- `createSyncNativeInstruction\(|NATIVE_MINT`
- `getMint\(|getAccount\(|getMultipleAccounts\(.*spl-token`
- `unpackMint\(|unpackAccount\(|MintLayout|AccountLayout|MINT_SIZE|ACCOUNT_SIZE`
- `createSolanaRpc\(` next to a `new Connection(` — a redundant kit RPC; use `Connection` methods plus the decoders.
- `\.toBase58\(\)` inside `@solana-program/token` call arguments — unnecessary at the minimum versions above.

## Recommended Agent Workflow

### 1. Swap the dependency
Replace `@solana/spl-token` with `@solana-program/token` (`^0.18.0`) in `package.json`, make sure `@solana/web3.js` is `^3.1.0`, and update imports. Do not leave both token packages installed unless a sibling package still needs spl-token — in that case isolate spl-token usage behind one module and migrate the rest.

```ts
// before
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createMintToCheckedInstruction,
  createTransferCheckedInstruction,
  getOrCreateAssociatedTokenAccount,
  getMint,
  getAccount,
} from '@solana/spl-token';

// after
import {
  TOKEN_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  getMintToCheckedInstruction,
  getTransferCheckedInstruction,
  getCreateAssociatedTokenIdempotentInstruction,
  getMintDecoder,
  getTokenDecoder,
} from '@solana-program/token';
```

### 2. Replace constants and address types
- `TOKEN_PROGRAM_ID` (PublicKey) → `TOKEN_PROGRAM_ADDRESS` (kit-branded `Address`)
- `ASSOCIATED_TOKEN_PROGRAM_ID` → `ASSOCIATED_TOKEN_PROGRAM_ADDRESS`
- `NATIVE_MINT` (PublicKey) → `new PublicKey('So11111111111111111111111111111111111111112')`, or `address('So11111111111111111111111111111111111111112')` from `@solana/kit` if the value only flows into `@solana-program/token`. `@solana-program/token` (through at least 0.18.0) does **not** export `NATIVE_MINT_ADDRESS` — don't try to import it.
- Every `@solana-program/token` address input accepts `Address | HasAddress`: instruction account inputs, `Address`-typed data args (`mintAuthority`, `freezeAuthority`, `newAuthority`), PDA seeds, plan-helper inputs, and `{ programAddress }` config. A v3 `PublicKey` passes straight in.
- Going the other direction, `@solana-program/token` returns kit `Address` strings (e.g. the ATA from `findAssociatedTokenPda`). Those feed back into other `@solana-program/token` calls as-is; wrap with `new PublicKey(kitAddr)` only when a v3 `Connection` method or `SystemProgram` needs the class.

> [!IMPORTANT]
> **In v3 web3.js, `PublicKey` is the canonical class** — byte-holding, unlike kit's branded `Address` string. Two failure modes to avoid:
> - **Do not** "get a kit address" via `new PublicKey(pubkey.toBase58())`. That re-wraps the value into the v3 `PublicKey` **class**. The class already satisfies `HasAddress`; when an `Address` or `string` is required, call `pubkey.toBase58()`.
> - `new PublicKey(...)` converts a kit-branded **string** (or a real v1 `PublicKey` from an un-migrated dependency) **into** the v3 `PublicKey` class. Only reach for it when handing a value to `SystemProgram` / `Connection`.
>
> Quick rule: **`@solana-program/token` input → pass the `PublicKey`; `Address` or `string` required → `.toBase58()`; `SystemProgram`/`Connection` boundary → `new PublicKey(...)`.**

### 3. Replace ATA derivation
`getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve?, programId?, associatedTokenProgramId?)` is sync and PublicKey-typed. `findAssociatedTokenPda` is async and returns `[Address, ProgramDerivedAddressBump]`.

```ts
// before
const ata = getAssociatedTokenAddressSync(mint, owner);

// after
const [ata] = await findAssociatedTokenPda({
  mint,                                // v3 PublicKey
  owner,                               // v3 PublicKey
  tokenProgram: TOKEN_PROGRAM_ADDRESS, // required; use TOKEN_2022_PROGRAM_ADDRESS for Token-2022
});
```

Mark surrounding functions `async` and propagate `await` outward. Tests and fixtures that previously inlined `getAssociatedTokenAddressSync(...)` should be updated too rather than wrapped in `Promise.resolve(...)`.

### 4. Replace `getOrCreateAssociatedTokenAccount`
There is no single-call equivalent. The idiom is to derive the ATA and include `getCreateAssociatedTokenIdempotentInstruction(...)` in the same `Transaction` — the program no-ops if the account already exists.

```ts
// before
const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, owner);

// after
const [ata] = await findAssociatedTokenPda({ mint, owner, tokenProgram: TOKEN_PROGRAM_ADDRESS });
const createAtaIx = getCreateAssociatedTokenIdempotentInstruction({
  payer,   // a v3 Keypair — it's a TransactionSigner (see step 6)
  ata,     // kit Address from findAssociatedTokenPda
  owner,   // v3 PublicKey (the wallet)
  mint,    // v3 PublicKey
});
const tx = new Transaction().add(createAtaIx, /* transfer/mintTo */);
await sendAndConfirmTransaction(connection, tx, [payer]);
```

If the app's flow needs the decoded token account after sending, fetch it with `connection.getAccountInfo(new PublicKey(ata))` and decode with `getTokenDecoder().decode(data)` (see step 8).

### 5. Replace instruction builders
The naming is `createXInstruction(...)` → `getXInstruction(...)` and argument order moves to a single object. Prefer the `*Checked` variants where they exist — they're safer (enforce decimals and mint identity).

| `@solana/spl-token`                              | `@solana-program/token`                            |
| ------------------------------------------------ | -------------------------------------------------- |
| `createInitializeMintInstruction`                | `getInitializeMintInstruction`                     |
| `createInitializeMint2Instruction`               | `getInitializeMint2Instruction`                    |
| `createInitializeAccountInstruction`             | `getInitializeAccountInstruction`                  |
| `createInitializeAccount3Instruction`            | `getInitializeAccount3Instruction`                 |
| `createAssociatedTokenAccountInstruction`        | `getCreateAssociatedTokenInstruction`              |
| `createAssociatedTokenAccountIdempotent…`        | `getCreateAssociatedTokenIdempotentInstruction`    |
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

Example:

```ts
// before
const ix = createTransferCheckedInstruction(
  source, mint, destination, ownerPubkey, amount, decimals,
);

// after
const ix = getTransferCheckedInstruction({
  source,                  // v3 PublicKey or kit Address
  mint,                    // v3 PublicKey or kit Address
  destination,             // v3 PublicKey or kit Address
  authority: owner,        // a v3 Keypair — it's a TransactionSigner (see step 6)
  amount,                  // bigint | number
  decimals,                // number
});
```

For `setAuthority`, `AuthorityType` remains a numeric enum in the Codama-generated client — keep using named variants, e.g. `{ authorityType: AuthorityType.MintTokens, newAuthority: newAuthority.publicKey }`.

### 6. Pass keypairs to signer-typed fields
Several `@solana-program/token` builders type a field as `Address | TransactionSigner` (`mintAuthority` on `getMintToCheckedInstruction`, `authority` on `getTransferCheckedInstruction`, `payer` on `getCreateAssociatedTokenIdempotentInstruction`, etc.). Passing a `PublicKey` or `Address` there will **not** emit a signer-role account meta. A v3 `Keypair` implements Kit's `TransactionPartialSigner`, a valid `TransactionSigner` (`isTransactionPartialSigner(keypair) === true`) — pass the keypair directly, no shim or noop signer required. The builder reads `.address` (a kit-branded `Address`) off it to set the signer-role meta; actual signing still happens via v3's `sendAndConfirmTransaction(connection, tx, [keypair])`:

```ts
const ix = getMintToCheckedInstruction({
  mint: mint.publicKey,
  token: ata,
  mintAuthority: payer, // a v3 Keypair is a TransactionSigner
  amount: 1_000_000n,
  decimals: 6,
});
```

Then `mintAuthority: payer`, `authority: owner`, etc.

### 7. Replace high-level "do-it-all" helpers
The spl-token helpers that sent a transaction in one call (`createMint`, `mintTo`, `transfer`, `burn`, `approve`, `revoke`, `setAuthority`, `freezeAccount`, `thawAccount`, `closeAccount`, `getOrCreateAssociatedTokenAccount`) have no single-call equivalent in `@solana-program/token`. Replace each with either (a) a `@solana-program/token` plan helper dropped into `Transaction.add(...)` where one exists (preferred — see "Preferred Path" above), or (b) explicit "build the instruction(s), add to a `Transaction`, send" code.

`createMint` collapses to a single awaited `getCreateMintInstructionPlan(connection, ...)` call inside `Transaction.add(...)` — the `Connection` supplies rent via `getMinimumBalance`, and `Transaction.add` flattens the plan internally:

```ts
import { getCreateMintInstructionPlan } from '@solana-program/token';

const mint = await Keypair.generate();
const tx = new Transaction().add(
  await getCreateMintInstructionPlan(connection, {
    payer,                           // v3 Keypair — a TransactionSigner
    newMint: mint,                   // v3 Keypair — a TransactionSigner
    decimals: 6,
    mintAuthority: payer.publicKey,  // v3 PublicKey
    freezeAuthority: null,
  }),
);
await sendAndConfirmTransaction(connection, tx, [payer, mint]);
```

If you need to opt out of the plan helper (a different program layout, extra instructions between the two, etc.), expand it back to `SystemProgram.createAccount(...)` + `getInitializeMint2Instruction(...)` manually. For a fixed lamport amount, prefer the plan helper's `mintAccountLamports` input over expanding.

```ts
const space = getMintSize();
const lamports = await connection.getMinimumBalance(space);

const tx = new Transaction().add(
  SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports,
    space,
    programId: new PublicKey(TOKEN_PROGRAM_ADDRESS), // bridge the kit Address string into the v3 PublicKey class
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

For `mintTo`/`transfer` into a (possibly new) ATA, prefer the `*Async` plan helpers — they derive the ATA, emit the idempotent create, and emit the checked instruction in one call:

```ts
import { getMintToATAInstructionPlanAsync, getTransferToATAInstructionPlanAsync } from '@solana-program/token';

const mintToTx = new Transaction().add(
  await getMintToATAInstructionPlanAsync({
    payer,
    owner: recipient.publicKey,
    mint: mint.publicKey,
    mintAuthority: payer,
    amount: 1_000_000n,
    decimals: 6,
  }),
);
await sendAndConfirmTransaction(connection, mintToTx, [payer]);

const transferTx = new Transaction().add(
  await getTransferToATAInstructionPlanAsync({
    payer,
    mint: mint.publicKey,
    authority: owner,
    recipient: recipient.publicKey,
    amount,
    decimals,
    // source / destination omitted → derived via findAssociatedTokenPda
  }),
);
await sendAndConfirmTransaction(connection, transferTx, [payer, owner]);
```

### 8. Replace mint/account fetches and decoders
Read accounts with v3 `Connection` methods and decode with the `@solana-program/token` codecs. `connection.getAccountInfo(pubkey)` returns `{ data: Uint8Array, owner: PublicKey, lamports, executable, ... }` (or `null`); feed `data` straight into a decoder. `owner` is a `PublicKey` class instance, so compare with `owner.equals(...)` or `owner.toBase58() === ...`, never `owner === TOKEN_PROGRAM_ADDRESS`.

```ts
// before
const mintInfo = await getMint(connection, mintPubkey);
const tokenAccount = await getAccount(connection, ataPubkey);

// after
const mintRaw = await connection.getAccountInfo(mintPubkey);
const tokenRaw = await connection.getAccountInfo(new PublicKey(ata));
if (!mintRaw || !tokenRaw) throw new Error('account not found');
const mintInfo = getMintDecoder().decode(mintRaw.data);       // .supply, .decimals, ...
const tokenAccount = getTokenDecoder().decode(tokenRaw.data); // .amount, .owner, ...
```

| spl-token                       | @solana-program/token via v3 Connection                                      |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `getMint(connection, address)`  | `connection.getAccountInfo(pubkey)` + `getMintDecoder().decode(data)`        |
| `getAccount(connection, addr)`  | `connection.getAccountInfo(pubkey)` + `getTokenDecoder().decode(data)`       |
| `getMultisig(connection, addr)` | `connection.getAccountInfo(pubkey)` + `getMultisigDecoder().decode(data)`    |
| batch `getMint` / `getAccount`  | `connection.getMultipleAccountsInfo(pubkeys)` + the matching decoder         |
| `unpackMint(addr, accountInfo)` | `getMintDecoder().decode(uint8Array)` or `decodeMint(encodedAccount)`        |
| `unpackAccount(addr, info)`     | `getTokenDecoder().decode(uint8Array)` or `decodeToken(encodedAccount)`      |
| `MintLayout` / `AccountLayout`  | `getMintCodec()` / `getTokenCodec()`                                         |
| `MINT_SIZE` / `ACCOUNT_SIZE`    | `getMintSize()` / `getTokenSize()`                                           |

Do not use the generated `fetchMint` / `fetchToken` helpers with `connection.rpc`. `connection.rpc` exists so `Connection` satisfies Kit's `ClientWithRpc` for APIs that take a client; app code should call `Connection` methods.

Numeric fields are `bigint` (`supply`, `amount`). Authority fields (`mintAuthority`, `freezeAuthority`, `delegate`) come back as kit `Option<Address>` — unwrap with `unwrapOption(...)` from `@solana/kit` or check `option.__option === 'Some'`. There is no synchronous `unpack` equivalent that takes a raw `Buffer`.

### 9. Transaction assembly stays the same
Keep `new Transaction().add(...)`, `sendAndConfirmTransaction(connection, tx, [signers])`, and v3 `Keypair` signing — the surface from 1.x is preserved. v3 `Transaction.add(...)` converts kit-shaped instructions to the v3 `TransactionInstruction` shape internally — signer roles are preserved, and your existing keypairs sign via the same `sendAndConfirmTransaction` path. `Transaction.add(...)` (and the `Message` / `MessageV0` compilers) also accept kit `InstructionPlan` inputs: `sequentialInstructionPlan` / `parallelInstructionPlan` trees are flattened in order; `MessagePackerInstructionPlan` leaves (multi-transaction plans) are rejected at runtime because they can't be honored inside a single transaction.

### 10. Revalidate by slice
After each slice (imports, ATA derivation, one instruction surface, fetches), run the narrowest test or smoke check that exercises it before widening. Token bugs frequently surface only on-chain (wrong program address, wrong decimals, off-curve owner) — a passing typecheck is not sufficient.

## Decision Rules

### Checked vs unchecked variants
- Prefer `*Checked` variants for `transfer`, `mintTo`, `burn`, `approve` — they enforce decimals and mint identity.
- Keep unchecked variants only when migrating code that intentionally avoids the decimals check and you've confirmed that's still correct.

### Classic Token vs Token-2022
- If the mint is owned by the classic Token program, use `@solana-program/token`.
- If the mint is owned by Token-2022 (extensions, transfer hooks, etc.), use `@solana-program/token-2022`. The workflow is identical; only the package and the `tokenProgram` argument on ATA derivation differ.
- If the code path supports both, pass the owning program address through explicitly — do not hardcode `TOKEN_PROGRAM_ADDRESS`.

### `PublicKey` at the boundary
First, know which `PublicKey` you have. The v3 `PublicKey` class accepts the same base58/byte inputs as v1 but validates them and drops BN-era inputs. Only an **un-migrated** dependency hands back a genuine v1 `PublicKey`.

- Inside the migrated module, use the v3 `PublicKey` class everywhere: `SystemProgram`, `Connection`, and every `@solana-program/token` input. Call `.toBase58()` only where an `Address` or `string` is required.
- **Never write `new PublicKey(pubkey.toBase58())` to obtain a kit address.** That round-trips back into the v3 `PublicKey` class — not the kit-branded string.
- At third-party boundaries that still hand back a genuine v1 `PublicKey`, convert once (`new PublicKey(pk.toBase58())`) and keep the v3 `PublicKey` downstream. Do not let v1 `PublicKey` propagate.

### Kit client inputs
- A program-client function whose first parameter is a Kit client (`ClientWithGetMinimumBalance`, `ClientWithRpc`, `ClientWithRpcSubscriptions`) → pass the `Connection`.
- A function whose first parameter is a raw Kit `Rpc` (the generated `fetch*` helpers, `fetchEncodedAccount`) → don't call it; use the equivalent `Connection` method and a decoder instead.
- Need a client shape the `Connection` does not implement (e.g. `ClientWithPayer`, transaction planning/sending for the `tokenProgram()` plugin) → stay on the `Transaction.add(...)` + `sendAndConfirmTransaction(...)` path rather than building a kit plugin client.

### Older client versions
If the project cannot yet move to the minimum versions:
- `@solana-program/token` `< 0.18.0`: builder **account** inputs already accept a `PublicKey`, but `Address`-typed data args (`mintAuthority`, `newAuthority`), PDA seeds, and plan-helper inputs need `pubkey.toBase58()`.
- `@solana/web3.js` `< 3.1.0`: `Connection` is not a Kit client and has no `getMinimumBalance(...)`. Use `connection.getMinimumBalanceForRentExemption(space)` and the manual `SystemProgram.createAccount` + `getInitializeMint2Instruction` pair instead of `getCreateMintInstructionPlan`.
- Prefer bumping over carrying these workarounds; record the bump as its own slice.

## Common Failure Modes
The steps above cover the mechanical swaps. These are the silent bugs they don't make obvious:

- Mixing `TOKEN_PROGRAM_ID` (PublicKey) and `TOKEN_PROGRAM_ADDRESS` (Kit branded `Address`) in the same call site — types may collapse to `string` at the wrong spot and the instruction silently targets the wrong program.
- **Double-wrapping an already-migrated address** — `new PublicKey(pubkey.toBase58())` on a value that's already a v3 `PublicKey` produces the class again, not a kit-branded string. Pass the `PublicKey` itself to `@solana-program/token` and reserve `new PublicKey(...)` for `SystemProgram` / `Connection`.
- **Calling `getCreateMintInstructionPlan` without the client or without `await`** — it is async and takes the `Connection` first; `Transaction.add(promise)` fails.
- **Passing a `PublicKey` to a signer field** — `authority: owner.publicKey` compiles but emits a non-signer account meta; pass the `Keypair`.
- **A second RPC client** — a `createSolanaRpc(...)` built beside the `Connection` drifts in endpoint, commitment, or headers. Use `Connection` methods.
- **`owner` vs `ata` swap** — `findAssociatedTokenPda({ owner, mint, tokenProgram })` returns the ATA; `owner` is the wallet. Passing one where the builder expects the other compiles fine and fails on-chain.
- **`bigint` leakage** — `amount`/`supply` come out of `getTokenDecoder()`/`getMintDecoder()` as `bigint`. Code that does math, `JSON.stringify`, or UI display expecting `number` breaks at runtime, not compile time.
- **`Option<Address>` fields** — `mintAuthority` / `freezeAuthority` / `delegate` decode to kit `Option<Address>` (`{__option: 'Some', value: '...'}`), not a bare address. Unwrap with `unwrapOption(...)` from `@solana/kit`.
- **`Buffer` pooled-view hazard** — if a legacy path hands you a `Buffer` (not v3's `Uint8Array` from `getAccountInfo`), convert with `new Uint8Array(buf)` before decoding; `Buffer`'s pooled-view semantics can yield wrong bytes after `slice`.

## Done When
- Fast Triage patterns above all come back clean (or isolated to one controlled boundary).
- `package.json` no longer includes `@solana/spl-token`, and pins `@solana-program/token` `>=0.18.0` (or `@solana-program/token-2022` `>=0.20.0`) and `@solana/web3.js` `>=3.1.0`.
- Authority/payer fields receive a `Keypair` (a `TransactionSigner`), not a bare `PublicKey` / `Address`.
- Token call sites pass `PublicKey` values directly, with no `.toBase58()` round-trips.
- Account reads go through `Connection` methods plus the decoders, with no parallel kit RPC and no direct `connection.rpc` use.
- Token-2022 paths use `@solana-program/token-2022`, and program ownership is explicit at any call site that can see either.
- Project typechecks, and the narrowest affected tests — or an on-chain smoke path exercising mint → ATA create → mint-to → transfer → balance read — pass.
