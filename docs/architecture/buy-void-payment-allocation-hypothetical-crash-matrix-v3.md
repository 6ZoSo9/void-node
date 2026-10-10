# Buy VOID current-source crash matrix V3 — frozen V1/V2 retained

## Why V3 is required

The current [#2758](https://github.com/6ZoSo9/void-node/pull/2758)
first-original buyer + plain-allocation combination, exact source head
`452ac177df4ac63d53cac36ba10216ff68495a77`, changes two
**real** source generations:
- replay-binder Git blob `895a429ec7a2ef554552cdaa821731d7a645a701`
  (caller Buffer internal-length/first-buyer hardening);
- canonical allocation-ledger Git blob
  `66617a89d5ad9f81b5a21d98cca55fcda6902a80`
  (plain-data snapshots and inherited-toJSON isolation).

The historical V1 crash proof at exact Git blob
`1a8db260a134ad438366d5b7660f926768c98a79`
and the first-original-buyer V2 crash proof at exact Git blob
`d42148523c44d95d3b87236ade22cfb92dcb5bee` MUST NOT be
rewritten, repinned or treated as current-generation source validation.
Both old proofs pin the *original* allocation-ledger blob first;
they correctly fail on `reviewed_source_blob_drift:` for
`buy_void_allocation_reservation_ledger_v1.ts`, **before**
checking the independent replay source drift.

The old V2 crash matrix is copied to a separate V3 source file only as a
reviewable new successor, with the two current source Git blobs and
distinct marker/lineage identifiers. It verifies the old proof source bytes
remain intact before the simulation runs, and maintains all existing
first-original-wallet, missing-payment, native-USDC, crash-cut,
exact-once in-memory idempotency, finite pool, conflicting identity,
high-water-publication-phase and malformed ledger adversaries.

## New current-source falsifications

- A caller Buffer holding actual `payment_verified` JSONL but spoofing its
  own `length=0` must be rejected by the current replay binder before
  an older payment disappears from evidence.
- A canonical allocation ledger with a fake own `Buffer.length=0` still
  contains its internal TypedArray bytes: the current detached ledger
  planner must produce exactly the same idempotent record ID and
  unchanged next-ledger bytes, never create a second allocation.

Each isolated Node22/24/26 test rebuilds current TypeScript source,
independently verifies old V1/V2 **reject** the two-source generation for the
expected first-drift reason, then runs the new V3 simulation. A separate job
requires all three V3 JSON results to be **byte identical**.

The V3 output explicitly distinguishes source-only hypothetical phases
`intent_only`, `ledger_committed`, `complete` from any actual
durable payment, operator capacity/request serialization, protected custody
high-water, Nimo witness, deployment or on-chain allocation. All those
real-world authorities remain FALSE.

## Deliberately remaining blockers

This is a NEW reviewed **candidate**, not a rewrite of old V1/V2 witnesses
or V2 compiler identities. Even if the focused V3 matrix is green,
the [#2758](https://github.com/6ZoSo9/void-node/pull/2758) broader
witness and earlier first-buyer V2 workflows can legitimately remain red
until independently reviewed current-generation successors adopt both new
source identities. Never repin historical witness files to clear CI.

Production still requires a qualified installed current witness, protected
payment/allocation custody, true provider finality, authenticated original
buyer and operator, shared capacity and request locks, exact-once
payment→allocation fsync+recovery, signed coupled launch and legitimate
WC/VOID liquidity. No customer ledger, live RPC, wallet/key/signer, transaction,
host/service, treasury, inventory, market or funds touched by this proof.

**PROTECT THE CORE.**
