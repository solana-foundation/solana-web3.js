# solana-web3.js: make ed25519 verify non-throwing for malformed inputs

**Repo:** https://github.com/solana-foundation/solana-web3.js

**PR:** https://github.com/solana-foundation/solana-web3.js/pull/3777

## Summary
`solana-web3.js` exposes a `verifySignatures()` method on `Transaction` which verifies ed25519 signatures over the transaction message.

Under the hood, the library uses `@noble/curves/ed25519` for signature verification. Some ed25519 implementations throw synchronous exceptions when given malformed inputs (for example, signatures with incorrect length).

Prior to this patch, a malformed signature could bubble a synchronous exception out of verification codepaths. In applications that process untrusted transactions or partially-constructed transaction payloads (wallet adapters, relayers, indexers, dApps reading user-provided base64 transactions, etc.), this creates a **crash/DoS vector**.

This patch changes `src/utils/ed25519.ts` so that malformed signature/public key bytes are treated as a **failed verification** (`false`) rather than an exception.

## Affected code
- `src/utils/ed25519.ts`

## Impact
### What can go wrong (before)
If a consumer calls:
- `Transaction.verifySignatures()`
- or any helper that reaches ed25519 verification

and the transaction contains a corrupted signature field (wrong length, non-Uint8Array, etc.), verification could throw. If the calling app does not wrap these calls in a `try/catch`, this can:
- crash a Node process
- break a browser UI flow
- cause relayers/indexers to drop/abort a batch

### Why it matters
Even though the on-chain runtime will reject invalid signatures, **off-chain** signature verification is frequently used as a fast-path and safety check before sending/broadcasting transactions. Many codebases treat verification as a pure boolean check.

A throw-on-verify turns "invalid signature" into a more severe operational issue.

## Reproduction (prior behavior)
In a downstream app:

1. Construct a valid transaction and partially sign it.
2. Corrupt the signature bytes (e.g. set length to 63 instead of 64).
3. Call `verifySignatures(false)`.

Depending on the behavior of the underlying ed25519 verification implementation, the call may throw synchronously.

The included test demonstrates this scenario by mutating `expectedTransaction.signatures[0].signature` to a 63-byte buffer.

## The fix
- Wrap ed25519 verification in a small helper `verify()` that:
  - checks signature/public key lengths (`64` and `32` bytes)
  - catches any thrown errors from the underlying library
  - returns `false` on any malformed input

This keeps the API contract simple: **verification yields a boolean**, and callers can rely on normal error handling pathways (e.g., serialization failing with the existing `Signature verification failed.` error).

## Verification proof
### Test
Added test in `test/transaction.test.ts`:
- `treats malformed signature lengths as invalid instead of throwing`

Assertions:
- `verifySignatures(false)` does not throw
- it returns `false`
- `serialize()` throws the existing signature verification error

### Manual
You can also run the same mutation in a local script and confirm verification returns `false`.

## Notes on severity
This is primarily an **availability hardening** fix (off-chain DoS/crash risk), not a direct on-chain fund-loss vulnerability. However, it is security-relevant because many production services treat untrusted transaction data as input.
