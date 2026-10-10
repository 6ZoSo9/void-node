# Buy VOID first-original buyer + hardened dispatcher source composition

## Current V4/V3 successor reconciliation — October 10, 2026

This section supersedes the historical source-generation description below for
the current cumulative review. Frozen crash V1/V2/V3 and first-original handoff
V2 remain byte-identical and are required to refuse the current replay source.
The current accepted source-only tuple is:

- replay binding Git blob `435ed6000caad046f48fb318fbc7c865393f3b6c`;
- preappend plain-input Git blob `4fbf115830dde01930631e73fea856abe0cceafa`;
- allocation ledger Git blob `66617a89d5ad9f81b5a21d98cca55fcda6902a80`;
- crash V4 proof Git blob `3f91404c8f5b6897b0781455564b4ec26b480c03`;
- first-original handoff V3 proof Git blob `d31f8cbb85ed17c9937baf3c9725a6fae22cc829`;
- unchanged dispatcher source/proof blobs `0e27a76e...` / `e58bf39f...`.

The successor workflow performs locked Node 22/24/26 builds, authenticates the
complete tuple, requires predecessor refusals, runs crash V4, the real temporary-
filesystem first-original handoff V3, and the hardened dispatcher proof, then
requires byte-identical no-authority receipts. This remains source-only: mounted
dispatch, installed cross-UID custody, payment acceptance, presale activation,
and funds movement are false.

## Reviewed source ancestry — unmerged

This Draft combines two reviewed **source-only** predecessor lines without
rewriting either. The first parent is [#2744](https://github.com/6ZoSo9/void-node/pull/2744),
the exact first-original buyer *real payment→allocation temporary-filesystem*
handoff head `5b33a6b5937912753de486d863af06c97a11e9c2`.
The second is [#2737](https://github.com/6ZoSo9/void-node/pull/2737),
the exact outer-input/Proxy/getter hardening head
`18fc88e59604510a0c1142858eac9743540dd32f`.

Their common launch-integration ancestor is [#2675](https://github.com/6ZoSo9/void-node/pull/2675)
head `8384105508a96ff84ffe9143422191764f750ad7`.
The **four** files changed by #2737 are totally disjoint from all
**twelve** paths changed by the #2744 lineage against this ancestor.
All four dispatcher paths at #2744 are exactly the original ancestor
Git blobs, so this composition overlays only the reviewed #2737 blobs.

The bounded reviewed tuple from #2737 is:

| Artifact | Git blob SHA-1 |
| --- | --- |
| `src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts` | `0e27a76e777c326d2d9e2b1550b7f2979fca9abb` |
| `scripts/prove_buy_void_operator_verified_allocation_dispatch_v1.ts` | `e58bf39fadc25123771481608fad2a61a8f3133f` |
| `.github/workflows/buy-void-operator-verified-allocation-dispatch-v1.yml` | `6d5be905b8deda6da6f150f1b4a3eba5e853dd52` |
| `docs/architecture/buy-void-operator-verified-allocation-dispatch-v1.md` | `938c3cc7b81081c7d0aa985d42d114f70189e52b` |

These must remain unchanged by this composition. Original first-buyer
replay source `0a74a3652081c3e142d0b887676771a7ac148f32`,
original V2 real-handoff proof
`9fb39172afa09e49c11d72ff376e9af2d99a4101`,
and original verified-payment handoff source
`f591f7407d9afc2cf77e0f90923aa11b4817fd4e`
are retained without changes.

## Joint Node 22/24/26 qualification

The new source-only workflow does a fresh exact-head lockfile install,
TypeScript typecheck, and compilation without starting a VOID process.
It checks the five source/proof blobs above, **requires** that the frozen
historical V1 crash proof continue refusing the newer replay blob, and runs
both already-reviewed real source proofs together:

1. The hardened dispatcher must reject executable outer Proxy/getter,
   symbol/hidden input, and malicious nested JSON while preserving the
   valid inert null-prototype plan. It must remain **unmounted** and
   never invoke a real payment or allocation writer.
2. The real handoff V2 synthetic proof uses disposable OS-temp
   private JSONL/high-water files. Missing first-buyer address
   (absent/null/empty) must HOLD with no durable new payment/allocation;
   even a matching existing forged allocation cannot invent the original
   buyer. A genuinely valid original buyer with legitimately late tx
   and receive address retains the same deterministic allocation ID
   and refuses a second payment event on replay.

Exact negative markers must appear on all three Node versions; a second
job requires byte-identical deterministic, explicitly unaccepted evidence.

## Non-production and custody boundary

**This is NOT the real route-to-dispatcher mount.** The mounted operator
payment producer still uses the older payment-only writer. Do not change
that producer in this PR. The private high-water/custody service,
authenticated operator principal, installed Nimo V2 witness, privileged
cross-UID IPC, source payment/confirmation, actual fsynced original buyer
history, anti-rollback fencing, exactly-once allocated inventory and
coupled WC/VOID presale/market remain separately **HOLD**.

The entire integration can be considered only as source/proof review.
The older frozen Nimo V1 bundle mismatch still makes an inherited
Runtime Integration workflow red; do not repin it or call the combined
PR entirely green based only on the new focused Node matrix. Keep Draft
and unmerged until independent owner acceptance.

No hosted service, real customer ledger, production node, signer,
wallet, transaction, chain, treasury, inventory, liquidity, payment
or funds action occurs.

**PROTECT THE CORE.**

## Unified historical-V1 HOLD and current first-original crash V2

The candidate also runs the **actual current** `prove_buy_void_payment_allocation_hypothetical_crash_matrix_v2.mjs` on all Node 22/24/26 source-proven heads, in addition to requiring the frozen V1 proof to continue rejecting the newly reviewed replay source generation. The V2 script is pinned at Git blob `d42148523c44d95d3b87236ade22cfb92dcb5bee`. Its original-buyer wallet, late-backfill, replay, double-allocation, synthetic publication-phase and 10m VOID boundary assertions remain intact; the workflow independently checks its positive receipt fields and that every production/funds authority is false.

This unifies the extra crash V2 regression covered in competing Draft #2745 into this exact-first-original/dispatcher composition without changing the payment source, custodian, historical V1 bytes or real route. Neither V2 synthetic success nor cross-node CI is a production crash recovery/first fsync/witness qualification.

## Current dispatcher-router successor — October 10, 2026

Frozen dispatcher proof V1 remains byte-identical and must reject the merged
router generation. Current dispatcher proof V2 is `5050498f600efd7d5c83af214f75663a66685d6e` and
binds `src/index.ts` `1fde828c97175560f98ab070af33eefc595f8002`. It re-runs the complete dispatcher and
mounted route-slice assertions after the independently qualified seal-first
startup transformation. The mounted operator route remains payment-only;
verified allocation dispatch, customer payment acceptance and funds movement
remain false.
