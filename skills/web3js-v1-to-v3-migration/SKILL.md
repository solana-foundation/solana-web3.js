---
name: web3js-v1-to-v3-migration
description: 'Migrate legacy @solana/web3.js v1 applications to v3, including the `@solana/spl-token` → `@solana-program/token` token surface. Use when auditing or fixing code after upgrading for Address/PublicKey changes, Keypair.address vs publicKey changes, Kit signer API interop, removed unique/Account/FeeCalculator APIs, async Keypair and transaction flows, Connection commitment and bigint changes, Buffer-to-Uint8Array migration, readonly RPC results, SDK-specific type changes, and token-program migration.'
user-invocable: true
---

# Web3.js V1 To V3 Migration

For human-facing background, see [`docs/web3js-v1-to-v3-migration.md`](../../docs/web3js-v1-to-v3-migration.md). This skill is the execution-oriented companion for agents fixing code.

If the migration also touches `@solana/spl-token` usage (token instructions, ATAs, mint/account fetches), read [`reference/spl-token.md`](./reference/spl-token.md) for that surface — it covers `@solana/spl-token` → `@solana-program/token` while staying on the v3 `Connection`/`Transaction`/`Keypair` API. Load it as soon as Fast Triage (below) turns up any `@solana/spl-token` imports.

## When to Use

- Migrating an application, SDK, script, or test suite from legacy `@solana/web3.js` v1 assumptions to the v3 API and runtime model.
- Auditing a codebase after a dependency bump when failures likely come from removed helpers, async key or transaction APIs, stricter key handling, `bigint` RPC values, readonly wrappers, or byte-array changes.
- Updating older examples or guides that still use `PublicKey`-specific internals, assume `keypair.address` is a web3.js `Address` object, wrap Kit signers unnecessarily, use removed `unique()` helpers, removed `Connection` methods, `Buffer`-centric code, or older program helpers.
- Reviewing a migration PR to find compatibility gaps, silent behavior changes, and missing regression tests.

## Goal

Provide an agent workflow that finds the highest-risk breakage first, makes concrete code updates, and validates each migrated slice before moving on.

## Operating Model

- Work in narrow, behavior-scoped slices. Start at a shared boundary, fix one class of breakage, validate it, then widen.
- Treat most churn as mechanical rather than architectural: `bigint` numerics, `Uint8Array` account data, async key and transaction helpers, readonly RPC results, and stricter SDK value types are the main recurring sources of breakage.
- Prefer SDK-derived types and current public APIs over app-local compatibility shims unless the shim clearly owns a boundary.

## Fast Triage

Use regex-capable search for these patterns before chasing softer type churn:

- `PublicKey.unique`
- `new Account`
- `FeeCalculator|getRecentBlockhash|getRecentBlockhashAndContext|getFeeCalculatorForBlockhash`
- `sign|partialSign|VersionedTransaction.sign`
- `new Keypair\(|Keypair.generate\(\)\.publicKey|Keypair.generate\(|fromSecretKey\(|fromSeed\(|createProgramAddressSync|findProgramAddressSync`
- `keypair\.address\.|\.address\.toBytes|\.address\.equals|\.address\.toBase58`
- `createNoopSigner|createSignerFromKeyPair|KeyPairSigner|MessagePartialSigner|TransactionPartialSigner|signMessages|signTransactions`
- app-local wrappers around message signing or signature verification
- `serialize()` on legacy `Transaction` call sites that assume sync behavior
- `PublicKeyData|_bn|new PublicKey(`
- `AccountInfo<Buffer>|ParsedAccountData \| Buffer`
- `Buffer.from|Buffer.alloc|Buffer.concat`
- arithmetic or comparisons on `slot`, `blockHeight`, `context.slot`, `transactionCount`, `minContextSlot`
- `.sort\(|\.push\(|logMessages|readonly`
- `from ['"]@solana/spl-token['"]` — if present, the migration also touches the token surface; read [`reference/spl-token.md`](./reference/spl-token.md) and follow its workflow for those call sites.

## Recommended Agent Workflow

### 1. Start at the dependency boundary

Search for `@solana/web3.js` imports, wrapper modules, and app-local compatibility layers that re-export Solana types. Migrate the narrowest shared boundary first so downstream fixes become smaller.

### 2. Audit hard breaks first

Search for removed APIs and signatures before chasing softer type churn:

- `PublicKey.unique`
- `new Account`
- `FeeCalculator`
- `getRecentBlockhash`
- `getRecentBlockhashAndContext`
- `getFeeCalculatorForBlockhash`

### 3. Migrate key and address handling

Check whether the app only uses public keys as opaque values, or whether it depends on old `PublicKey` constructor internals, identity checks, BN.js inputs, or custom wrappers around those behaviors.

- `keypair.publicKey` remains the canonical web3.js identity accessor. Use it whenever code needs `.toBytes()`, `.equals(...)`, `.toBase58()`, `.verifySignature(...)`, or any API that takes a class-based `Address` value. This is the default choice for web3.js consumers.
- Do not use `keypair.address`. It exists for ecosystem signer interop only — it returns the Kit branded base58 signer address string so a `Keypair` can satisfy Kit's `KeyPairSigner` shape. Do not reach for it in normal web3.js code.
- If code only stores, passes, compares, or prints key values, migrate touched code toward `Address` semantics and strict input validation.
- `Address.toBase58()` now returns the branded `KitAddress` string type rather than a plain `string`, so keep that type through SDK-aware code and only narrow it at generic string boundaries.
- If code depends on constructor internals, BN.js coercions, or class identity details, rewrite those call sites directly rather than assuming the alias preserves legacy behavior.
- Replace removed `PublicKey.unique()` usage with a local dummy-address generator in tests and fixtures.

### 4. Migrate async crypto and transaction flows

Find call sites that previously assumed sync behavior for signature verification, key generation, message signing, transaction signing, PDA derivation, or legacy transaction serialization.

- The `Keypair` constructor is no longer public — `new Keypair(...)` will fail to typecheck. Replace it with `await Keypair.generate()` (or `await Keypair.fromSecretKey(...)` / `await Keypair.fromSeed(...)` when reconstructing from existing bytes).
- Add `await` to current async methods: `transaction.sign(...)`, `transaction.partialSign(...)`, and `versionedTransaction.sign(...)`.
- Prefer Kit-compatible signer APIs when integrating with Kit, Kit Plugins, Codama-generated clients, browser wallets, ledgers, or custom signing systems. `Keypair` now provides `signMessages(...)`, `signTransactions(...)`, and `keyPair`, and structurally satisfies Kit's `KeyPairSigner` shape so it can be passed directly to Kit APIs that accept one.
- Pass compatible Kit `MessagePartialSigner` or `TransactionPartialSigner` values directly to web3.js transaction signing APIs instead of adapting them through noop signers only to satisfy legacy types.
- Do not assume every Kit `TransactionSigner` can sign a web3.js transaction. The exported `Signer` type is now a union of the v1 `Web3Signer` shape (`publicKey` + `secretKey`) and Kit `MessagePartialSigner` / `TransactionPartialSigner` values; sending-only or modifying-only signers need a boundary that understands those behaviors. Custom signers that only expose an ad-hoc `signBytes(...)` function should implement Kit's `MessagePartialSigner` shape rather than relying on a bespoke web3.js byte-signer interface.
- The v1 `Signer` interface has been renamed to `Web3Signer`. v1 code that passes arrays of `{publicKey, secretKey}` objects continues to work because the new `Signer` union includes that shape. v1 code that holds a `Signer`-typed value and reads `.secretKey` directly should either narrow with `if ('secretKey' in signer)` or switch the type annotation to `Web3Signer`.
- Replace sync PDA helpers with the current async surfaces:
  - `PublicKey.createProgramAddressSync(...)` -> `await Address.createProgramAddress(...)`
  - `PublicKey.findProgramAddressSync(...)` -> `await Address.findProgramAddress(...)`
- For raw message signing or signature verification, prefer the direct v3 object methods instead of app-local wrappers:
  - sign raw bytes with `await keypair.signBytes(messageBytes)`
  - verify signatures with `await keypair.verifySignature(signature, messageBytes)` or `await address.verifySignature(signature, messageBytes)`
- Add `async` to any function that now calls `Keypair.generate()`, `Keypair.fromSecretKey(...)`, `Keypair.fromSeed(...)`, `Address.createProgramAddress(...)`, `Address.findProgramAddress(...)`, transaction signing, signature verification, or legacy `Transaction.serialize(...)`, then add the corresponding `await` at each call site.
- Fix immediate sync assumptions after those calls: if code reads `.publicKey` from a newly created keypair, inspects transaction signatures right after signing, serializes a legacy transaction, or sends it immediately after signing, move that logic after the awaited call.
- If code converts a web3.js keypair for Kit APIs, prefer passing the keypair directly where a `KeyPairSigner` is accepted — `Keypair` structurally satisfies `KeyPairSigner` and `isKeyPairSigner(keypair)` returns `true`. Use `createSignerFromKeyPair(keypair.keyPair)` only when an API specifically needs a freshly constructed signer from a raw `CryptoKeyPair`.
- Do not hide async migration work behind mixed sync wrappers unless the wrapper owns real scheduling or lifecycle behavior.
- Pay special attention to tests and stories that used `Keypair.generate().publicKey` or removed `unique()` helpers such as `Address.unique()` or `PublicKey.unique()` as shorthand for a unique address; replace them with a dummy-address helper instead of spreading async churn through the test.

### 5. Audit `Connection` behavior and numeric types

Identify code that relied on the old implicit `finalized` default or on numeric RPC results being JavaScript `number` values.

- If the app needs `finalized`, set it explicitly.
- If the app performs arithmetic, comparisons, JSON serialization, or schema validation on slots, counts, context slots, block heights, or similar fields, update those paths to accept `bigint` or convert intentionally at the edge with safe-range checks.
- If those values appear in fixtures or mocked RPC payloads, update the fixtures too instead of coercing production code back to `number`.

### 6. Migrate bytes and binary data

Search for `Buffer` assumptions in transaction instruction data, signatures, message serialization, hashing, and account decoding.

- Prefer `Uint8Array` and array-like byte inputs.
- When callers depend on tightly packed bytes, normalize sliced views deliberately instead of assuming a pooled Buffer view is safe.
- If a decoder or third-party dependency still requires `Buffer`, convert at that edge instead of carrying `Buffer` through the app.

### 7. Audit readonly wrappers and SDK value types

Search for in-place mutations (`sort`, `push`, direct assignment) on RPC results and for local helper types that mirror SDK shapes with plain `string`, `number`, or mutable arrays.

- Copy collections before mutating.
- Prefer SDK-derived types when readonly wrappers or more specific SDK value types are now part of the contract.

### 8. Update program and codec surfaces

Inspect uses of system, stake, vote, compute-budget, address-lookup-table, and account-decoder utilities.

- Replace deprecated layout or manual decode assumptions with the current codec-backed or generated-client-backed public APIs.
- If the app decodes raw account data manually, verify field widths and enum variants instead of carrying old layout constants forward.

### 9. Revalidate by slice

After each migration slice, run the narrowest test or smoke check that exercises that surface, then widen to typecheck and broader integration coverage.

## Concrete Code Fixes

### Removed helpers and legacy APIs

- Replace removed `unique()` helper usage with a local dummy-address helper in tests or fixtures.
- Replace removed fee-calculator and recent-blockhash-era APIs with current blockhash and fee surfaces at the boundary that owns transaction assembly.
- Remove app-local compatibility shims that only preserve old constructor internals or deprecated layout assumptions.

### Async boundary edits

- Apply the async transaction-signing and raw-crypto replacements listed above under "Migrate async crypto and transaction flows," then repair the surrounding control flow.
- If a function now awaits key generation, PDA derivation, signing, signature verification, or legacy transaction serialization, mark that function `async` and propagate the promise outward coherently.
- When reviewing a migration diff, check for follow-on bugs where code reads signatures, serializes a legacy transaction, or sends it before the awaited signing call completes.

### Type and data edits

- Widen slot, block height, lamports-like, epoch, and context fields to accept `bigint`.
- Convert `Buffer`-typed account data or instruction data to `Uint8Array`, and only re-wrap at third-party boundaries that still require `Buffer`.
- Clone readonly RPC arrays before calling mutating helpers like `.sort()` or `.push()`.
- Prefer SDK-derived types over hand-maintained primitive mirrors for `Address`, `Blockhash`, `Slot`, `Lamports`, and timestamp-like values.
- Use `KeyPairSigner`, `MessagePartialSigner`, and `TransactionPartialSigner` from `@solana/web3.js` or `@solana/signers` instead of app-local signer interfaces when crossing Kit-aware boundaries.

## Decision Rules

### `PublicKey` vs `Address`

- If code only stores, passes, compares, or prints key values, the `PublicKey` alias may be enough short term, but touched code should move toward `Address` semantics.
- If code depends on constructor internals, BN.js coercions, or class identity details, rewrite those call sites directly.
- If code uses a keypair's identity, default to `keypair.publicKey` (the web3.js `Address` class) (Do not use `keypair.address` as it will return a `KitAddress` not suitable for most Web3.js operations)

### Signer interop

- If the signer is a web3.js `Keypair`, pass it directly to Kit APIs that accept `KeyPairSigner` or to web3.js transaction signing APIs.
- If the signer is a Kit `MessagePartialSigner` or `TransactionPartialSigner`, pass it directly to web3.js transaction signing APIs.
- If the signer is a sending-only or modifying-only Kit signer, do not force it into web3.js `Transaction.sign(...)`; use a Kit-aware transaction flow or add an explicit boundary that handles modification/sending semantics.
- If old code used `createNoopSigner(...)` only because web3.js could not accept Kit signers, remove the noop wrapper and pass the real signer where possible.

### Async boundary changes

- If a sync-looking call site already lives inside an async flow, convert it in place.
- If the change crosses a public boundary, update that boundary contract instead of hiding the promise behind a partial shim.

### `bigint` handling

- If a value represents a slot, count, block height, lamports-like threshold, or RPC context field, assume `bigint` may now appear.
- If the app must interoperate with JSON, UI state, or libraries that reject `bigint`, convert at the boundary and assert safe range before narrowing.
- If mocks or fixtures currently use plain numeric literals for those fields, fix the fixtures instead of weakening the production types.

### Commitment defaults

- If old behavior implicitly relied on `finalized`, set `commitment: 'finalized'` explicitly.
- If no code depends on finality-specific semantics, prefer the v3 defaults and remove redundant config.

### Readonly vs mutable

- If an RPC result or nested collection is now readonly, spread or clone it before mutating.
- If a local type only exists to mirror an SDK response, prefer deriving it from the SDK instead of re-declaring a mutable copy.

## Common Failure Modes

- A migration updates imports but misses behavior changes, especially async transaction APIs and default commitment changes.
- `bigint` values leak into code that expects `number`, causing subtle comparison, sort, serialization, or schema bugs.
- `JSON.stringify(...)` or fixture helpers crash on `bigint` because migration work stopped at compile-time fixes.
- Tests continue passing against mocks while live or integration flows still depend on old `finalized` defaults.
- Buffer-based helper code keeps sliced or pooled views and accidentally signs or hashes the wrong bytes.
- Sync-looking tests or stories still depend on `Keypair.generate().publicKey` and balloon into unnecessary async churn.
- `keypair.address` returns a `KitAddress` branded string, not a web3.js `Address` and is not suitable for most Web3.js operations. Use `keypair.publicKey` for those methods.
- Kit signer integrations wrap real signers in noop signers even though web3.js transaction signing can now accept partial signers directly.
- Code assumes any Kit `TransactionSigner` can be passed to web3.js signing, even when the signer is sending-only or modifying-only.
- App-local helper types drift from readonly SDK response shapes or more specific SDK value types.
- Manual account decoders retain stale field sizes or enum assumptions after the public API moved to newer codec-backed definitions.
- Deprecated aliases are treated as full legacy compatibility rather than a temporary bridge.

## Quality Bar

The migration is not complete until these are true:

1. Removed APIs are gone or shimmed at one controlled boundary.
2. Async transaction and signing flows are awaited end to end.
3. Keypair identity usage defaults to `publicKey` for web3.js `Address` methods (e.g., `const myWeb3Address: Address = myKeypair.publicKey` )
4. Kit signer integrations use direct partial signer support where possible instead of unnecessary noop adapters.
5. RPC numeric fields are handled intentionally, with `bigint` preserved or narrowed safely.
6. Commitment-sensitive flows are explicit about `processed`, `confirmed`, or `finalized`.
7. Byte-oriented paths no longer rely on implicit Buffer semantics.
8. Readonly wrappers and SDK-specific value types are either preserved or intentionally converted at controlled boundaries.
9. Program and account decode logic matches the current public API rather than stale manual layouts.
10. Narrow tests or smoke checks cover each migrated slice, and the project typechecks afterward.

## Completion Checklist

1. Search for removed symbols and confirm each one is deleted or replaced.
2. Search for legacy transaction and signature APIs and convert the remaining sync assumptions.
3. Search for `keypair.address.` call chains and move class-method usage to `keypair.publicKey`.
4. Search for `PublicKey` internals and strict-input violations.
5. Audit signer adapters and remove noop wrappers where direct Kit partial signer support is available.
6. Audit `Connection` call sites for omitted commitment and numeric-type assumptions.
7. Audit byte-handling code for Buffer dependence and sliced-view hazards.
8. Audit readonly RPC collections and SDK-shaped local helper types.
9. Run the narrowest affected tests.
10. Run project typecheck.
11. Run one broader integration or app smoke path that exercises transaction sending and RPC reads.

## Trigger Phrases

This skill should activate for prompts such as:

- "migrate this web3.js v1 app to v3"
- "audit this Solana app for web3.js v3 compatibility"
- "replace removed web3.js APIs"
- "fix Address/PublicKey migration issues"
- "fix Keypair.address migration issues"
- "pass Kit signers to web3.js transactions"
- "remove noop signer adapters"
- "fix PublicKey.unique removal"
- "sign messages with a keypair"
- "verify signatures with a keypair or address"
- "update legacy transaction signing to async"
- "find bigint breakages after upgrading web3.js"
- "convert Buffer-based Solana code to Uint8Array"
- "fix readonly array errors after upgrading web3.js"
- "replace `new Keypair()` after upgrading web3.js"
- "review this v1 to v3 migration PR"
- "migrate @solana/spl-token to @solana-program/token"
- "replace spl-token with the kit token client"
- "convert createTransferCheckedInstruction to kit"
- "replace getAssociatedTokenAddressSync with findAssociatedTokenPda"
- "replace getOrCreateAssociatedTokenAccount in v3"
- "swap getMint/getAccount for getMintDecoder/getTokenDecoder"
- "replace TOKEN_PROGRAM_ID with TOKEN_PROGRAM_ADDRESS"
- "audit this app for spl-token leftovers after v3 migration"

For token-program prompts, follow [`reference/spl-token.md`](./reference/spl-token.md).

## Related Skills
- [[solana-kit]] — general `@solana/kit` primitives (transactions, accounts, RPC). Only relevant if the project is moving beyond v3 web3.js to a kit-native stack.
