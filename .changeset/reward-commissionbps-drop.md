---
'@solana/web3.js': patch
---

Surface the SIMD-0291 `commissionBps` field on block and transaction rewards returned by `getBlock`, `getTransaction` and their parsed variants, instead of silently dropping it
