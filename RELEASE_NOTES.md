# Release Notes for 3.0.0-rc.0

These notes summarize the user-facing changes that landed since 1.98.4.

## Highlights

- `Connection` now runs on typed Solana Kit HTTP and websocket transports end-to-end, replacing the older JSON-RPC plumbing while preserving the class-based `web3.js` API shape.
- Websocket subscription setup failures no longer spin through indefinite retry loops; failed opens now become terminal until listener demand changes or the transport reconnects.
- The library has moved much further toward `Uint8Array`-first and async-first behavior, reducing Buffer-specific behavior and aligning signing and verification with WebCrypto/Kit.
- Program and account encode/decode paths have been modernized around codecs and vendored generated program clients.
- Packaging, build, and install flows were refreshed, including esbuild-based bundling, generated `lib/` output for git installs, and updated validator/dependency tooling.

## Migration Reality Check

- The public API is still class-based, but non-trivial TypeScript consumers should still expect broad mechanical migration work. In practice, the largest sources of churn are `bigint` numerics, `Uint8Array` account data, async key/serialization helpers, and readonly RPC results. Blockhashes are kit-branded `Blockhash` string subtypes; lamports and timestamps are `bigint`. Validation happens inside the library at the RPC boundary.
- For full-app consumers already using most of the class surface, the immediate payoff is usually API modernization and future compatibility rather than a dramatic bundle-size reduction.

## Breaking Changes

- `PublicKey.unique()` was removed.
- Legacy BN-era `PublicKey` constructor inputs such as `PublicKeyData` or `{ _bn: BN }` are no longer accepted.
- `Keypair.generate()`, `Keypair.fromSecretKey(...)`, and `Keypair.fromSeed(...)` are now async. Tests and stories that previously used sync key generation often need to become async or switch to app-local dummy public-key helpers.
- `Transaction.verifySignatures()` is now async and returns a promise.
- `Transaction.serialize()` is now async and must be awaited.
- Remaining sync signing helpers that existed earlier in the range were removed in favor of the async signing surface.
- The legacy `Web3Signer` shape (`{publicKey, secretKey}`) and the `MessageSigner` type alias were removed. The exported `Signer` type is now `MessagePartialSigner | TransactionPartialSigner` from `@solana/kit`, and `VersionedTransaction.sign(...)` accepts `Array<MessagePartialSigner>` directly. Pass `Keypair` instances or other Kit signers; migrate any remaining `{publicKey, secretKey}` literals via `await Keypair.fromSecretKey(legacySigner.secretKey)`.
- The implicit `Connection` default commitment changed from `finalized` to `confirmed`.
- Many migrated `Connection` methods now return Kit-native `bigint` values instead of legacy `number` values.
- Slot-like and `minContextSlot` inputs were widened to `number | bigint` and now reject unsafe numeric inputs.
- `AccountInfo`-like responses now use `Uint8Array` payloads, readonly wrappers, and `space: bigint` instead of the old mutable `Buffer`-centric shapes.
- The deprecated FeeCalculator surface was removed, including `FeeCalculator`, `getRecentBlockhash`, `getRecentBlockhashAndContext`, and `getFeeCalculatorForBlockhash`.
- The legacy `Account` class was removed.
- Deprecated BufferLayout-based internals and compatibility surfaces were removed in favor of codec-backed implementations.
- `Transaction.add(...)` now narrows its inputs with `instanceof Transaction` and `instanceof TransactionInstruction` instead of the previous `'instructions' in item` / `'data' in item` duck-typing checks. Loose "Transaction-like" or "TransactionInstruction-like" objects that aren't real instances will no longer be accepted at runtime. Well-typed TypeScript callers are unaffected.

## API And Runtime Changes

### Connection

- HTTP requests now go through typed Kit RPC calls instead of the legacy request pipeline.
- Websocket subscriptions now run on a Kit-backed subscription runtime with stronger request/response shaping and broader payload coverage.
- Added `Connection.awaitSubscriptionReady(...)` so callers can await websocket subscription establishment, explicit setup failure, or listener invalidation.
- Shared websocket subscriptions now invalidate readiness per client listener, so removing one deduplicated listener before acknowledgement no longer resolves readiness for the wrong listener.
- Signature-confirmation fallback now treats failed or inactive subscription setup as terminal and continues via `getSignatureStatuses()` when needed.
- `ConnectionConfig.fetch` and `fetchMiddleware` remain available as compatibility hooks on top of the typed HTTP path.
- Additional RPC coverage and stricter typing landed across account, block, transaction, token, simulation, and node metadata methods.
- Repeated `getBlockHeight` calls with equivalent arguments are now coalesced.
- Many RPC arrays and nested collections are now readonly, so code that mutates in place may need to spread or clone first.

### Addresses, transactions, and signing

- `PublicKey` remains the primary address type; the `Address` class shipped in earlier 3.0.0 release candidates has been removed. `PublicKey.toBase58()` returns the kit-branded `Address` string.
- Blockhashes and nonces are kit-branded `Blockhash` string subtypes; transaction signatures are plain `string`s. Values are validated when they cross into RPC calls or transaction serialization.
- `Keypair` implements Kit's `KeyPairSigner` interface. It exposes `address`, `keyPair`, `signMessages(...)`, and `signTransactions(...)`, and can be passed directly to Kit APIs and generated program clients that accept a `TransactionSigner` or `KeyPairSigner`.
- `Keypair.address` is Kit's branded `Address` string (base58). `Keypair.publicKey` remains the web3.js `PublicKey` object for class-based address operations.
- The exported `Signer` type is now `MessagePartialSigner | TransactionPartialSigner` from `@solana/kit`. The legacy `{publicKey, secretKey}` shape is no longer accepted by `Transaction.sign(...)`, `Transaction.partialSign(...)`, `VersionedTransaction.sign(...)`, `Connection.sendTransaction(...)`, `Connection.simulateTransaction(...)`, or `sendAndConfirmTransaction(...)`. Note that `VersionedTransaction.sign(...)` specifically requires message-signing capability (`MessagePartialSigner`), since no transaction lifetime information is available in that code path. Pass `Keypair` instances or other Kit signers; custom signers should implement Kit's `MessagePartialSigner` or `TransactionPartialSigner` shape.
- `Transaction.sign(...)`, `Transaction.partialSign(...)`, `VersionedTransaction.sign(...)`, `Connection.sendTransaction(...)`, `Connection.simulateTransaction(...)`, and `sendAndConfirmTransaction(...)` can now sign with compatible Kit signer objects.
- Verification is now WebCrypto/Kit-backed and async-only.
- Transaction and message internals were normalized around `Uint8Array`, including instruction data, signatures, serialization, and deserialization.
- Buffer-backed public APIs now accept `Uint8Array`, sliced views, and `Array<number>` more consistently.

### Programs and decoders

- Address Lookup Table, Compute Budget, System, Stake, Vote, ValidatorInfo, and VoteAccount code paths were migrated to codec-backed or generated-client-backed implementations.
- Vote account decoding now covers newer state variants and prior-voter normalization.
- Stake account decoding coverage now includes initialized, delegated, and non-data variants.
- Vendored generated program clients now back address-lookup-table, compute-budget, stake, and system support.

## Tooling And Packaging

- The build moved from Babel to esbuild.
- Git installs now work through `prepack`, with generated `lib/` output included.
- The old `node-fetch` fallback path and fetch fork files were removed.
- `bs58`, BufferLayout, Buffer-centric helpers, and other dead utilities were removed as the runtime moved to codecs and typed arrays.
- ESLint moved to flat config, dependencies were refreshed, and the test-validator flow was updated to Agave v3.

## Upgrade Notes

- Audit all transaction serialization and signature-verification call sites for missing `await`.
- Audit any code that assumes slots, counts, context values, lamports-like fields, or timestamps are `number`; migrated Connection methods may now produce `bigint`.
- If you serialize SDK responses or mocks with `JSON.stringify`, remember that raw `bigint` values throw without a replacer.
- Prefer propagating `bigint` through app state and only converting with `Number(...)` at display or interoperability boundaries, with safe-range checks where precision matters.
- When interoperating with `@solana/kit` or generated program clients, convert with `publicKey.toBase58()` (web3.js → kit) and `new PublicKey(kitAddress)` (kit → web3.js). `.toBase58()` returns Kit's branded `Address` string, which is assignable anywhere a plain `string` is expected.
- Replace `keypair.address.toBytes()`, `keypair.address.equals(...)`, and `keypair.address.toBase58()` with `keypair.publicKey.toBytes()`, `keypair.publicKey.equals(...)`, and `keypair.publicKey.toBase58()`. If you only need the base58 signer address, use `keypair.address` directly.
- Prefer passing Kit-compatible signers directly to transaction signing APIs instead of wrapping them in noop signers solely to satisfy web3.js types.
- Replace any remaining `{publicKey, secretKey}` signer literals with a `Keypair` (e.g. `await Keypair.fromSecretKey(legacySigner.secretKey)`) or another Kit signer. The `Web3Signer` interface and the `MessageSigner` alias are no longer exported.
- Replace any dependency on removed helper APIs such as `PublicKey.unique()`, FeeCalculator-related methods, or BN-era key construction.
- If you depend on Buffer-based decoders, convert at that boundary with `Buffer.from(...)` or a zero-copy aliasing form for hot paths instead of keeping `Buffer` as your internal default.
