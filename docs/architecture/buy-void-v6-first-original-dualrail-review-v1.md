# Buy VOID V6 and first-original dual-rail source composition — review only

## Purpose

This branch composes two existing unmerged, independently reviewed source
lines WITHOUT modifying either owning PR:

- [V6/operator integration #2675](https://github.com/6ZoSo9/void-node/pull/2675)
  exact prior head `0512b5aba4b1417f56688aa1492523fc2a6902b6`.
- [First-original Base+Ethereum buyer/dispatch #2749](https://github.com/6ZoSo9/void-node/pull/2749)
  exact prior head `0e5c69e20c8d89a1046f261a8fff1793b0329151`.

The independently verified Git merge base is
`8384105508a96ff84ffe9143422191764f750ad7`.

This composition is intentionally a NEW source-only Draft, NOT a merge
to main or authorization to activate Buy VOID. It is assembled as one
non-force Git commit with TWO recorded parents, and a source tree based on
#2675 to preserve its late frozen-witness and utility-boundary repairs.

## File-level preservation

The first-original donor differs from the common base in 27 paths. The
integration owner's two latest commits differ in 8 paths. The only two
overlaps are:

1. `.github/workflows/buy-void-enforcement-artifact-attestation-v1.yml`:
   retain the integration owner's separate `prove_buy_void_enforcement_v1_util_boundary_v1.mjs`
   step, **and** adopt the donor's correct current V6
   `j.source_runtime_parent=22a30e3ffad6047a472488104c769140bd050878`
   assertion. Do not substitute the older stale `3533626d...` assertion
   or delete the frozen V1 negative/utility check.
2. `scripts/prove_buy_void_enforcement_artifact_attestation_v5_candidate.mjs`:
   use the exact donor-reviewed blob `70292a0b283d8f06814f153105e27397f924c19d`
   that keeps the V6 source identity while exercising both allowed
   `node:util` and rejected `node:child_process` static external import
   cases. The integration-owned separate V1 util-boundary script is retained
   unchanged, and the frozen original V1 enforcement script stays immutable.

The other 25 donor paths are copied as exact donor Git blobs. No other
source/runtime, Dockerfile, original Nimo V1 witness identity or historical
enforcement attestations are intentionally overwritten.

## New source-level evidence

The donor includes reviewed first-original buyer tests, independent
Base/Ethereum payment->allocation handoffs, replay crash tests,
operator-event dispatch guards, and first-original custody reserve plans.
The dual-rail tests bind canonical native-USDC identity and original buyer
wallet, including same transaction hash/log index on different chains.

The integration retains V6 authenticated source-finality, strict
operator bearer/POST intent, canonical payment capacity and the deliberately
UNMOUNTED verified-payment->allocation dispatcher. Neither the
cross-UID production custody writer nor the original durable live request
is automatically qualified by composing inert tests.

The donor source and its earlier focused green tests were qualified on
different exact heads. **Their green status does not transfer**. A fresh
full-head CI run, independent reviewer falsification, source/compiled
identity check and explicit confirmation of correct merge ancestry are
required here. Historical frozen Nimo witness V1 HOLD remains a true
identity mismatch; do NOT repin or reissue its original bytes to force
overall CI green.

## Production and funding boundary

Production operator `payment_verified` still invokes the legacy
payment-only writer in `src/index.ts`; the integrated verified-allocation
dispatcher is NOT mounted. The cross-UID custody service successor,
high-water durability, crash-after-payment-fsync recovery, true original
buyer ledger ancestry, real Base/Ethereum payment finality/provider
quorum, deployed source/compiled/package identities, inactive Nimo V2
witness, signing, treasury inventory and coupled WC/VOID pool remain
separate real launch acceptance gates.

This Draft authorizes **no** changes to active hosts, services, Nimo,
private customer ledger, wallet, keys, transaction submission, Chain2050,
Work Credits, inventory/treasury/liquidity, live presale/market, or funds.
No Ready or merge to main. After CI completes, review and accept only
the truthful source-level composition. Deployment requires distinct approval
and installed-host evidence.

**PROTECT THE CORE.**
