---
name: web3js-v1-to-v3-migration
description: 'Migrate legacy @solana/web3.js v1 applications to v3. Use when auditing or fixing code after upgrading for Address/PublicKey changes, removed unique/Account/FeeCalculator APIs, async Keypair and transaction flows, Connection commitment and bigint changes, Buffer-to-Uint8Array migration, readonly RPC results, and SDK-specific type changes.'
user-invocable: true
---

# Web3.js V1 To V3 Migration

For human-facing background, see [`docs/web3js-v1-to-v3-migration.md`](../../docs/web3js-v1-to-v3-migration.md). This skill is the execution-oriented companion for agents fixing code.

## When to Use
- Migrating an application, SDK, script, or test suite from legacy `@solana/web3.js` v1 assumptions to the v3 API and runtime model.
- Auditing a codebase after a dependency bump when failures likely come from removed helpers, async key or transaction APIs, stricter key handling, `bigint` RPC values, readonly wrappers, or byte-array changes.
- Updating older examples or guides that still use `PublicKey`-specific internals, removed `unique()` helpers, removed `Connection` methods, `Buffer`-centric code, or older program helpers.
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
- `Keypair.generate\(\)\.publicKey|Keypair.generate\(|fromSecretKey\(|fromSeed\(|createProgramAddressSync|findProgramAddressSync`
- app-local wrappers around message signing or signature verification
- `serialize()` on legacy `Transaction` call sites that assume sync behavior
- `PublicKeyData|_bn|new PublicKey(`
- `AccountInfo<Buffer>|ParsedAccountData \| Buffer`
- `Buffer.from|Buffer.alloc|Buffer.concat`
- arithmetic or comparisons on `slot`, `blockHeight`, `context.slot`, `transactionCount`, `minContextSlot`
- `.sort\(|\.push\(|logMessages|readonly`

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

- If code only stores, passes, compares, or prints key values, migrate touched code toward `Address` semantics and strict input validation.
- If code depends on constructor internals, BN.js coercions, or class identity details, rewrite those call sites directly rather than assuming the alias preserves legacy behavior.
- Replace removed `PublicKey.unique()` usage with a local dummy-address generator in tests and fixtures.

### 4. Migrate async crypto and transaction flows
Find call sites that previously assumed sync behavior for signature verification, key generation, message signing, transaction signing, PDA derivation, or legacy transaction serialization.

- Add `await` to current async methods: `transaction.sign(...)`, `transaction.partialSign(...)`, and `versionedTransaction.sign(...)`.
- Replace sync PDA helpers with the current async surfaces:
  - `PublicKey.createProgramAddressSync(...)` -> `await Address.createProgramAddress(...)`
  - `PublicKey.findProgramAddressSync(...)` -> `await Address.findProgramAddress(...)`
- For raw message signing or signature verification, prefer the direct v3 object methods instead of app-local wrappers:
  - sign raw bytes with `await keypair.signBytes(messageBytes)`
  - verify signatures with `await keypair.verifySignature(signature, messageBytes)` or `await address.verifySignature(signature, messageBytes)`
- Add `async` to any function that now calls `Keypair.generate()`, `Keypair.fromSecretKey(...)`, `Keypair.fromSeed(...)`, `Address.createProgramAddress(...)`, `Address.findProgramAddress(...)`, transaction signing, signature verification, or legacy `Transaction.serialize(...)`, then add the corresponding `await` at each call site.
- Fix immediate sync assumptions after those calls: if code reads `.publicKey` from a newly created keypair, inspects transaction signatures right after signing, serializes a legacy transaction, or sends it immediately after signing, move that logic after the awaited call.
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

## Decision Rules

### `PublicKey` vs `Address`
- If code only stores, passes, compares, or prints key values, the `PublicKey` alias may be enough short term, but touched code should move toward `Address` semantics.
- If code depends on constructor internals, BN.js coercions, or class identity details, rewrite those call sites directly.

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
- App-local helper types drift from readonly SDK response shapes or more specific SDK value types.
- Manual account decoders retain stale field sizes or enum assumptions after the public API moved to newer codec-backed definitions.
- Deprecated aliases are treated as full legacy compatibility rather than a temporary bridge.

## Quality Bar
The migration is not complete until these are true:

1. Removed APIs are gone or shimmed at one controlled boundary.
2. Async transaction and signing flows are awaited end to end.
3. RPC numeric fields are handled intentionally, with `bigint` preserved or narrowed safely.
4. Commitment-sensitive flows are explicit about `processed`, `confirmed`, or `finalized`.
5. Byte-oriented paths no longer rely on implicit Buffer semantics.
6. Readonly wrappers and SDK-specific value types are either preserved or intentionally converted at controlled boundaries.
7. Program and account decode logic matches the current public API rather than stale manual layouts.
8. Narrow tests or smoke checks cover each migrated slice, and the project typechecks afterward.

## Completion Checklist
1. Search for removed symbols and confirm each one is deleted or replaced.
2. Search for legacy transaction and signature APIs and convert the remaining sync assumptions.
3. Search for `PublicKey` internals and strict-input violations.
4. Audit `Connection` call sites for omitted commitment and numeric-type assumptions.
5. Audit byte-handling code for Buffer dependence and sliced-view hazards.
6. Audit readonly RPC collections and SDK-shaped local helper types.
7. Run the narrowest affected tests.
8. Run project typecheck.
9. Run one broader integration or app smoke path that exercises transaction sending and RPC reads.

## Trigger Phrases
This skill should activate for prompts such as:
- "migrate this web3.js v1 app to v3"
- "audit this Solana app for web3.js v3 compatibility"
- "replace removed web3.js APIs"
- "fix Address/PublicKey migration issues"
- "fix PublicKey.unique removal"
- "sign messages with a keypair"
- "verify signatures with a keypair or address"
- "update legacy transaction signing to async"
- "find bigint breakages after upgrading web3.js"
- "convert Buffer-based Solana code to Uint8Array"
- "fix readonly array errors after upgrading web3.js"
- "review this v1 to v3 migration PR"
