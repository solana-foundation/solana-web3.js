# `@solana/spl-token` → `@solana-program/token` (token surface)

Reference companion to the v1→v3 migration skill, loaded when the migration touches token-program usage. For human-facing background, see [`docs/web3js-spl-token-migration.md`](../../../docs/web3js-spl-token-migration.md).

## When this applies
- The v1→v3 migration also touches `@solana/spl-token`: token instructions, ATAs, mint/account fetches, or token-account decoding.
- The codebase still imports `createMintToInstruction`, `createTransferCheckedInstruction`, `getOrCreateAssociatedTokenAccount`, `getAssociatedTokenAddressSync`, `getMint`, `getAccount`, `MintLayout`, `AccountLayout`, `TOKEN_PROGRAM_ID`, or `ASSOCIATED_TOKEN_PROGRAM_ID`.

If the mint is owned by Token-2022 (extensions, transfer hooks, etc.), use `@solana-program/token-2022` instead — the naming, instruction surface, and steps below are otherwise identical; only the package and the `tokenProgram` argument on ATA derivation differ.

## Goal
Migrate token-program usage from `@solana/spl-token` to `@solana-program/token` while staying on v3 `@solana/web3.js`'s `Connection` / `Transaction` / `Keypair` / `sendAndConfirmTransaction` surface. Do **not** rewrite the surrounding code to kit transaction messages, plugin clients, or a kit RPC — v3 web3.js bridges to `@solana-program/token` natively and that's the minimal-churn migration path.

## Operating Model
- Work in narrow, behavior-scoped slices: imports → PDA derivation → instruction builders → high-level helpers → account reads.
- The bulk of churn is mechanical: `createXInstruction(...)` → `getXInstruction(...)`, `PublicKey` → kit `Address` strings (call `.toAddress()` on v3 `PublicKey` instances at builder boundaries), sync ATA derivation → async `findAssociatedTokenPda`, `getMint`/`getAccount` → `connection.getAccountInfo(...)` + `getMintDecoder().decode(data)` / `getTokenDecoder().decode(data)`.
- Keep `Connection`, `Transaction`, `Keypair`, `SystemProgram`, and `sendAndConfirmTransaction` from `@solana/web3.js`. v3 `Transaction.add(ix)` / `Message` / `MessageV0` accepts kit-shaped instructions and instruction plans and can support `@solana-program/token` instruction generators directly (1.x did not — that's the bridge that makes the rest of this migration possible) (e.g., `getCreateMintInstructionPlan`, `getMintToATAInstructionPlan(Async)`, `getTransferToATAInstructionPlan(Async)` from `@solana-program/token`) can be passed straight into `.add(...)`. No manual conversion, no kit transaction-message pipeline.
- Do not keep `@solana/spl-token` alongside `@solana-program/token` for the same code path — the constants and types diverge (`PublicKey` vs `Address`) and silently mixing them is the most common source of bugs.

## Preferred Path: `@solana-program/token` Plan Helpers
For the three highest-churn spl-token helpers (`createMint`, `mintTo` + ATA, `transfer` + ATA), `@solana-program/token` ships non-generated plan helpers that bundle the `SystemProgram.createAccount` / `getCreateAssociatedTokenIdempotentInstruction` + checked instruction pair into a single `sequentialInstructionPlan(...)`. v3 `Transaction.add(...)` flattens these directly:

- `getCreateMintInstructionPlan({ payer, newMint, decimals, mintAuthority, freezeAuthority? })` — replaces `createMint`. Internally: `getCreateAccountInstruction` (@solana-program/system) + `getInitializeMint2Instruction`.
- `getMintToATAInstructionPlan({ payer, ata, owner, mint, mintAuthority, amount, decimals })` / `getMintToATAInstructionPlanAsync(...)` — replaces `mintToChecked` + idempotent ATA create. The `Async` variant derives `ata` via `findAssociatedTokenPda` for you.
- `getTransferToATAInstructionPlan({ payer, source, destination, recipient, mint, authority, amount, decimals })` / `getTransferToATAInstructionPlanAsync(...)` — replaces `transferChecked` + idempotent destination-ATA create. The `Async` variant derives `source` and `destination` for you when omitted.

These helpers all take `TransactionSigner` for `payer` / `newMint` / authority fields where applicable. A v3 `Keypair` **is** a `TransactionSigner` (it implements Kit's `TransactionPartialSigner` interface), so pass the keypair directly — see step 6. Actual signing still happens via `sendAndConfirmTransaction(connection, tx, [keypair, ...])`.

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

## Recommended Agent Workflow

### 1. Swap the dependency
Replace `@solana/spl-token` with `@solana-program/token` in `package.json` and update imports. Do not leave both installed unless a sibling package still needs spl-token — in that case isolate spl-token usage behind one module and migrate the rest.

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
- `NATIVE_MINT` (PublicKey) → inline `address('So11111111111111111111111111111111111111112')` using `address` from `@solana/kit`. `@solana-program/token` (through at least 0.16.0) does **not** export `NATIVE_MINT_ADDRESS` — don't try to import it.
- All `PublicKey` arguments on instruction builders become kit-branded `Address`. v3 web3.js's `PublicKey` class exposes `.toAddress()` typed as the kit brand — call it at the boundary whenever passing v3 `Keypair.publicKey` or another v3 `PublicKey` into a `@solana-program/token` builder. Going the other direction, wrap a kit `Address` with `new PublicKey(kitAddr)` when v3 `Connection.getAccountInfo` / `SystemProgram` needs the v3 class.

> [!IMPORTANT]
> **In v3 web3.js, `PublicKey` is the canonical class** — byte-holding, unlike kit's branded `Address` string. Two failure modes to avoid:
> - **Do not** "get a kit address" via `new PublicKey(addr.toAddress())`. That re-wraps the value into the v3 `PublicKey` **class** (the opposite of what a `@solana-program/token` builder wants). To produce the kit-branded string for a builder, just call `addr.toAddress()`.
> - `new PublicKey(...)` converts a kit-branded **string** (or a real v1 `PublicKey` from an un-migrated dependency) **into** the v3 `PublicKey` class. Only reach for it when handing a value to `SystemProgram` / `Connection`, never to feed a `@solana-program/token` builder.
>
> Quick rule: **builder boundary → `.toAddress()`; `SystemProgram`/`Connection` boundary → `new PublicKey(...)`.**

### 3. Replace ATA derivation
`getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve?, programId?, associatedTokenProgramId?)` is sync and PublicKey-typed. `findAssociatedTokenPda` is async and returns `[Address, ProgramDerivedAddressBump]`.

```ts
// before
const ata = getAssociatedTokenAddressSync(mint, owner);

// after
const [ata] = await findAssociatedTokenPda({
  mint,                            // kit Address
  owner,                           // kit Address
  tokenProgram: TOKEN_PROGRAM_ADDRESS, // omit for default; required for Token-2022
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
  ata,     // kit Address
  owner,   // kit Address (the wallet)
  mint,    // kit Address
});
const tx = new Transaction().add(createAtaIx, /* transfer/mintTo */);
await sendAndConfirmTransaction(connection, tx, [payer]);
```

If the app's flow needs the decoded `Account` object after sending, fetch it with `connection.getAccountInfo(new PublicKey(ata))` and decode with `getTokenDecoder().decode(data)`.

### 5. Replace instruction builders
The naming is `createXInstruction(...)` → `getXInstruction(...)`, argument order moves to a single object, and PublicKeys become kit-branded `Address` strings. Prefer the `*Checked` variants where they exist — they're safer (enforce decimals and mint identity).

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
  source,                  // kit Address
  mint,                    // kit Address
  destination,             // kit Address
  authority: owner,        // a v3 Keypair — it's a TransactionSigner (see step 6)
  amount,                  // bigint | number
  decimals,                // number
});
```

For `setAuthority`, `AuthorityType` remains a numeric enum in the Codama-generated client — keep using named variants, e.g. `{ authorityType: AuthorityType.MintTokens }`.

### 6. Pass keypairs to signer-typed fields
Several `@solana-program/token` builders type a field as `Address | TransactionSigner` (`mintAuthority` on `getMintToCheckedInstruction`, `authority` on `getTransferCheckedInstruction`, `payer` on `getCreateAssociatedTokenIdempotentInstruction`, etc.). Passing a plain `Address` will **not** emit a signer-role account meta. A v3 `Keypair` implements Kit's `TransactionPartialSigner`, a valid `TransactionSigner` (`isTransactionPartialSigner(keypair) === true`) — pass the keypair directly, no shim or noop signer required. The builder reads `.address` (a kit-branded `Address`) off it to set the signer-role meta; actual signing still happens via v3's `sendAndConfirmTransaction(connection, tx, [keypair])`:

```ts
const ix = getMintToCheckedInstruction({
  mint: mint.publicKey.toAddress(),
  token: ata,
  mintAuthority: payer, // a v3 Keypair is a TransactionSigner
  amount: 1_000_000n,
  decimals: 6,
});
```

Then `mintAuthority: payer`, `authority: owner`, etc.

### 7. Replace high-level "do-it-all" helpers
The spl-token helpers that sent a transaction in one call (`createMint`, `mintTo`, `transfer`, `burn`, `approve`, `revoke`, `setAuthority`, `freezeAccount`, `thawAccount`, `closeAccount`, `getOrCreateAssociatedTokenAccount`) have no single-call equivalent in `@solana-program/token`. Replace each with either (a) a `@solana-program/token` plan helper dropped into `Transaction.add(...)` where one exists (preferred — see "Preferred Path" above), or (b) explicit "build the instruction(s), add to a `Transaction`, send" code.

`createMint` collapses to a single `getCreateMintInstructionPlan(...)` call inside `Transaction.add(...)` — `Transaction.add` flattens the plan internally:

```ts
import { getCreateMintInstructionPlan } from '@solana-program/token';

const mint = await Keypair.generate();
const tx = new Transaction().add(
  getCreateMintInstructionPlan({
    payer,         // v3 Keypair — a TransactionSigner
    newMint: mint, // v3 Keypair — a TransactionSigner
    decimals: 6,
    mintAuthority: payer.publicKey.toAddress(),
    freezeAuthority: null,
  }),
);
await sendAndConfirmTransaction(connection, tx, [payer, mint]);
```

If you need to opt out of the plan helper (custom funding lamports beyond `mintAccountLamports`, a different program layout, etc.), expand it back to `SystemProgram.createAccount(...)` + `getInitializeMint2Instruction(...)` manually:

```ts
const space = BigInt(getMintSize());
const lamports = await connection.getMinimumBalanceForRentExemption(Number(space));

const tx = new Transaction().add(
  SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports: BigInt(lamports),
    space,
    programId: new PublicKey(TOKEN_PROGRAM_ADDRESS), // bridge the kit Address string into the v3 PublicKey class
  }),
  getInitializeMint2Instruction({
    mint: mint.publicKey.toAddress(),
    decimals: 6,
    mintAuthority: payer.publicKey.toAddress(),
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
    owner: recipient.publicKey.toAddress(),
    mint: mint.publicKey.toAddress(),
    mintAuthority: payer,
    amount: 1_000_000n,
    decimals: 6,
  }),
);
await sendAndConfirmTransaction(connection, mintToTx, [payer]);

const transferTx = new Transaction().add(
  await getTransferToATAInstructionPlanAsync({
    payer,
    mint: mint.publicKey.toAddress(),
    authority: owner,
    recipient: recipient.publicKey.toAddress(),
    amount,
    decimals,
    // source / destination omitted → derived via findAssociatedTokenPda
  }),
);
await sendAndConfirmTransaction(connection, transferTx, [payer, owner]);
```

### 8. Replace mint/account fetches and decoders
v3 `connection.getAccountInfo(address)` returns `{ data: Uint8Array, owner: PublicKey, lamports, executable, ... }` — note `owner` is a `PublicKey` class instance, so compare with `owner.equals(...)` or `owner.toBase58() === ...`, never `owner === TOKEN_PROGRAM_ADDRESS`. Feed `data` straight into a `@solana-program/token` decoder.

| spl-token                       | @solana-program/token via v3 Connection                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| `getMint(connection, address)`  | `connection.getAccountInfo(pubkey)` + `getMintDecoder().decode(data)`   |
| `getAccount(connection, addr)`  | `connection.getAccountInfo(pubkey)` + `getTokenDecoder().decode(data)`     |
| `getMultisig(connection, addr)` | `connection.getAccountInfo(pubkey)` + `getMultisigDecoder().decode(data)`  |
| `unpackMint(addr, accountInfo)` | `getMintDecoder().decode(uint8Array)` or `decodeMint(encodedAccount)`    |
| `unpackAccount(addr, info)`     | `getTokenDecoder().decode(uint8Array)` or `decodeToken(encodedAccount)`  |
| `MintLayout` / `AccountLayout`  | `getMintCodec()` / `getTokenCodec()`                                     |
| `MINT_SIZE` / `ACCOUNT_SIZE`    | `getMintSize()` / `getTokenSize()`                                       |

Numeric fields are `bigint` (`supply`, `amount`). Authority fields (`mintAuthority`, `freezeAuthority`, `delegate`) come back as kit `Option<Address>` — unwrap with `unwrapOption(...)` from `@solana/kit` or check `option.__option === 'Some'`. There is no synchronous `unpack` equivalent that takes a raw `Buffer` — v3's `getAccountInfo(...).data` is already `Uint8Array`.

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

- Inside the migrated module, use the v3 `PublicKey` class for everything that touches `SystemProgram` / `Connection`, and call `.toAddress()` to produce the kit-branded string at every `@solana-program/token` builder boundary.
- **Never write `new PublicKey(addr.toAddress())` to obtain a kit address.** That round-trips back into the v3 `PublicKey` class — not the kit-branded string a builder expects. Use `addr.toAddress()` for the builder; pass `addr` itself (or `new PublicKey(kitString)`) when a `SystemProgram` / `Connection` API wants the class.
- At third-party boundaries that still hand back a genuine v1 `PublicKey`, convert once (`new PublicKey(pk.toBase58())`) and keep the v3 `PublicKey` downstream. Do not let v1 `PublicKey` propagate.

## Common Failure Modes
The steps above cover the mechanical swaps. These are the silent bugs they don't make obvious:

- Mixing `TOKEN_PROGRAM_ID` (PublicKey) and `TOKEN_PROGRAM_ADDRESS` (Kit branded `Address`) in the same call site — types may collapse to `string` at the wrong spot and the instruction silently targets the wrong program.
- **Double-wrapping an already-migrated address** — `new PublicKey(addr.toAddress())` on a value that's already a v3 `PublicKey` produces the class again, not the kit-branded string a `@solana-program/token` builder needs. Reach for `.toAddress()` at builder boundaries and reserve `new PublicKey(...)` for `SystemProgram` / `Connection`.
- **`owner` vs `ata` swap** — `findAssociatedTokenPda({ owner, mint, tokenProgram })` returns the ATA; `owner` is the wallet. Passing one where the builder expects the other compiles fine and fails on-chain.
- **`bigint` leakage** — `amount`/`supply` come out of `getTokenDecoder()`/`getMintDecoder()` as `bigint`. Code that does math, `JSON.stringify`, or UI display expecting `number` breaks at runtime, not compile time.
- **`Option<Address>` fields** — `mintAuthority` / `freezeAuthority` / `delegate` decode to kit `Option<Address>` (`{__option: 'Some', value: '...'}`), not a bare address. Unwrap with `unwrapOption(...)` from `@solana/kit`.
- **`Buffer` pooled-view hazard** — if a legacy path hands you a `Buffer` (not v3's `Uint8Array` from `getAccountInfo`), convert with `new Uint8Array(buf)` before decoding; `Buffer`'s pooled-view semantics can yield wrong bytes after `slice`.

## Done When
- Fast Triage patterns above all come back clean (or isolated to one controlled boundary).
- Authority/payer fields receive a `Keypair` (a `TransactionSigner`), not a bare `Address`.
- Token-2022 paths use `@solana-program/token-2022`, and program ownership is explicit at any call site that can see either.
- Project typechecks, and the narrowest affected tests — or an on-chain smoke path exercising mint → ATA create → mint-to → transfer → balance read — pass.
- Package.json no longer includes `@solana/spl-token`
