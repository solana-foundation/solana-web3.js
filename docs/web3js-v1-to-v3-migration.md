# Migrating from `@solana/web3.js` v1 to v3

This guide is for application and SDK developers upgrading code that was written against the v1 line of `@solana/web3.js`.

The v3 API is still class-based, but non-trivial TypeScript consumers should expect real migration work. In practice, most of that work is mechanical rather than architectural: `bigint` numerics, `Uint8Array` account data, async key and transaction helpers, readonly RPC results, and stricter SDK value types are the main sources of churn.

If you want to use this guide as reusable agent context, this repository also publishes a skill at [`skills/web3js-v1-to-v3-migration/SKILL.md`](../skills/web3js-v1-to-v3-migration/SKILL.md).

If the migration also touches `@solana/spl-token`, see the companion guide [`docs/web3js-spl-token-migration.md`](./web3js-spl-token-migration.md) and the token reference in the migration skill at [`skills/web3js-v1-to-v3-migration/reference/spl-token.md`](../skills/web3js-v1-to-v3-migration/reference/spl-token.md) for the `@solana/spl-token` → `@solana-program/token` migration.

## Major migration themes

- **Keys and identity**: `PublicKey` remains the canonical class. The kit library's branded `Address` string type is not exported; convert with `publicKey.toAddress()` and `new PublicKey(kitAddress)`.
- **Keypair identity access**: keep using `keypair.publicKey` for web3.js code. `keypair.address` exists for Kit signer API (`@solana/signers`) interop and returns Kit's branded `Address` string, not a web3.js `PublicKey` object.
- **Async signing and serialization**: legacy sync signing and signature verification paths are gone.
- **Connection semantics**: omitted commitment now defaults to `confirmed` rather than `finalized`, and many RPC numerics are now `bigint`.
- **Byte handling**: Buffer-oriented internals moved to `Uint8Array` and array-like byte inputs.
- **RPC numeric types**: many RPC numeric fields now use bigint.
- **RPC mutability and wrappers**: many responses are readonly, and `AccountInfo`-like shapes now carry `space: bigint` plus readonly wrappers.
- **Removed legacy APIs**: the `unique()` helper on `PublicKey`, `Account`, fee-calculator methods, and `BufferLayout` surfaces are gone.
- **Program and message codecs**: newer codecs and generated-client-backed flows replace many older manual or BufferLayout-backed assumptions.

## Common migration patterns

### 1. `bigint` propagation

- Widen local interfaces from `number` to `number | bigint` when the value is really a slot, block height, lamports-like quantity, epoch, timestamp, or RPC context field.
- Convert with `Number(...)` only at display or interoperability boundaries, and keep precision-risk call sites explicit.
- Remember that `JSON.stringify(...)` throws on raw `bigint` unless you provide a replacer.

### 2. `AccountInfo` and binary data

- Expect `AccountInfo<Uint8Array>` rather than `AccountInfo<Buffer>`, often wrapped in `Readonly<...>` and extended with `space: bigint`.
- If a decoder still requires `Buffer`, convert at that edge instead of carrying `Buffer` through the app.
- Prefer helper signatures derived from SDK return types when readonly wrappers or response details matter.

### 3. Async key generation and PDA derivation

- The `Keypair` constructor is no longer public: `new Keypair(...)` no longer compiles. Use `await Keypair.generate()` for fresh keys, and `await Keypair.fromSecretKey(...)` / `await Keypair.fromSeed(...)` when restoring from existing bytes.
- Replace sync assumptions around `Keypair.generate()`, `Keypair.fromSecretKey(...)`, `Keypair.fromSeed(...)`, and PDA derivation helpers with async flows.
- In tests and stories that only need a unique address, prefer a local dummy public-key helper over async key generation churn.

### 4. Readonly collections

- Spread or clone RPC arrays before calling mutating methods like `.sort()`, `.push()`, or in-place assignment.
- Check nested arrays too, such as log messages, account lists, rewards, and block transaction collections.

### 5. SDK-specific value types

- Values such as blockhashes, lamports, slots, and timestamps remain plain `string`/`bigint` types. Expect `bigint` where older code used `number`.
- Prefer using SDK-derived types over hand-maintained local primitive mirrors, or cast explicitly at trusted boundaries.
- `PublicKey.toAddress()` returns the kit-branded `Address` string for `@solana/kit` APIs and generated program clients; `.toBase58()`/`.toString()` return a plain `string`, as in v1.

## Suggested workflow

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
- `sign`
- `partialSign`
- `VersionedTransaction.sign`

### 3. Migrate key handling

Check whether the app only uses public keys as opaque values, or whether it depends on old `PublicKey` constructor internals, identity checks, BN.js inputs, or custom wrappers around those behaviors.

- When touched code reads a keypair's public identity, keep using `keypair.publicKey` — it is the web3.js `PublicKey` object. Do not use `keypair.address` (it returns Kit's branded `Address` string, used only to support signing compatibility)
- If it only needs public key values, pass base58 strings or `PublicKey` instances; the constructor validates input.
- If it relies on old constructor internals or ad hoc coercions, replace those call sites explicitly rather than assuming the class preserves legacy internals.

### 4. Migrate async crypto and transaction flows

Find all call sites that previously assumed sync behavior for signature verification, key generation, message signing, transaction signing, or transaction serialization.

- Existing transaction signing methods are now async: add `await` to `transaction.sign(...)`, `transaction.partialSign(...)`, and `versionedTransaction.sign(...)` call sites.
- Replace removed sync-only helpers with the current async surfaces: `sign` and `VersionedTransaction.sign` become `await transaction.sign(...)`, `partialSign` becomes `await transaction.partialSign(...)`, and sync PDA helpers become `await PublicKey.createProgramAddress(...)` or `await PublicKey.findProgramAddress(...)`.
- Add `async` to any function that now calls `Keypair.generate()`, `Keypair.fromSecretKey(...)`, `Keypair.fromSeed(...)`, `PublicKey.createProgramAddress(...)`, `PublicKey.findProgramAddress(...)`, transaction signing, signature verification, or legacy `Transaction.serialize(...)`, then add the corresponding `await` at each call site.
- Fix the immediate sync assumptions after those calls: if code reads `.publicKey` from a newly created keypair, inspects transaction signatures right after signing, or serializes a legacy transaction after enabling signature verification, move that code after the awaited call.
- Do not leave mixed sync wrappers around async APIs unless the wrapper owns real scheduling or lifecycle behavior.
- Pay special attention to tests that used `Keypair.generate().publicKey` or `PublicKey.unique()` as shorthand for a unique address; replace them with a dummy-address helper.

### 5. Audit `Connection` behavior and numeric types

Identify code that relied on the old implicit `finalized` default or on numeric RPC results being JavaScript `number` values.

- If the app needs `finalized`, set it explicitly.
- If the app performs arithmetic, comparisons, JSON serialization, or schema validation on slots, counts, context slots, block heights, or similar fields, update those paths to accept `bigint` or convert intentionally at the edge with safe-range checks.
- If those values appear in fixtures or mocked RPC payloads, update the fixtures too instead of coercing the production code back to `number`.

### 6. Migrate bytes and binary inputs

Search for the use of `Buffer` in transaction instruction data, signatures, message serialization, hashing, and account decoding.

- Prefer `Uint8Array` and array-like byte inputs.
- When callers depend on tightly packed bytes, normalize sliced views deliberately instead of assuming a pooled Buffer view is safe.
- If older decoders still want `Buffer`, wrap only at the decoder boundary.

### 7. Audit readonly wrappers and SDK-specific value types

Search for in-place mutations (`sort`, `push`, direct assignment) on RPC results and for local helper types that mirror SDK shapes with plain `string`, `number`, or mutable arrays.

- Copy collections before mutating.
- Prefer SDK-derived types when readonly wrappers or more specific SDK value types are now part of the contract.

### 8. Update program and codec surfaces

Inspect uses of system, stake, vote, compute-budget, address-lookup-table, and account-decoder utilities.

- Replace deprecated layout or manual decode assumptions with the current codec-backed or generated-client-backed public APIs.
- If the app decodes raw account data manually, verify field widths and enum variants instead of carrying old layout constants forward.

### 9. Revalidate by slice

After each migration slice, run the narrowest test or smoke check that exercises that surface, then widen to typecheck and broader integration coverage.

## High-risk search terms

Start with searches like:

- `PublicKey.unique`
- `new Account`
- `FeeCalculator|getRecentBlockhash|getFeeCalculatorForBlockhash`
- `sign|partialSign|VersionedTransaction.sign`
- `Keypair.generate\(\)\.publicKey|Keypair.generate\(|fromSecretKey\(|fromSeed\(|createProgramAddressSync|findProgramAddressSync`
- `serialize()` on legacy `Transaction` call sites that assume sync behavior
- `PublicKeyData|_bn|new PublicKey(`
- `Buffer.from|Buffer.alloc|Buffer.concat`
- `AccountInfo<Buffer>|ParsedAccountData \| Buffer`
- `ConfirmedTransactionMeta|StakeActivationData`
- `toBuffer()` assumptions in key and message code
- arithmetic or comparisons on `slot`, `blockHeight`, `context.slot`, `transactionCount`, `minContextSlot`
- `.sort\(|\.push\(|logMessages|readonly`

## Common failure modes

- A migration updates imports but misses behavior changes, especially async transaction APIs and default commitment changes.
- `bigint` values leak into code that expects `number`, causing subtle comparison, sort, serialization, or schema bugs.
- `JSON.stringify(...)` or fixture helpers crash on `bigint` because migration work stopped at compile-time fixes.
- Tests continue passing against mocks while live or integration flows still depend on old `finalized` defaults.
- Buffer-based helper code keeps sliced or pooled views and accidentally signs or hashes the wrong bytes.
- Sync-looking tests or stories still depend on `Keypair.generate().publicKey` and balloon into unnecessary async churn.
- App-local helper types drift from readonly SDK response shapes or more specific SDK value types.
- Manual account decoders retain stale field sizes or enum assumptions after the public API moved to newer codec-backed definitions.
- Deprecated aliases are treated as full legacy compatibility rather than a temporary bridge.

## Completion checklist

1. Search for removed symbols and confirm each one is deleted or replaced.
2. Search for legacy transaction and signature APIs and convert the remaining sync assumptions.
3. Search for `PublicKey` internals and strict-input violations.
4. Audit `Connection` call sites for omitted commitment and numeric-type assumptions.
5. Audit byte-handling code for Buffer dependence and sliced-view hazards.
6. Audit readonly RPC collections and SDK-shaped local helper types.
7. Run the narrowest affected tests.
8. Run project typecheck.
9. Run one broader integration or app smoke path that exercises transaction sending and RPC reads.
