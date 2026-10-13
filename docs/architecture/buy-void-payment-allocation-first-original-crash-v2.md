# Buy VOID first-original buyer-wallet crash matrix V2 successor

## Why a successor, not a historical rewrite

[Draft #2739](https://github.com/6ZoSo9/void-node/pull/2739) fixes a
first-original-request authorization gap in
`src/economic/buy_void_verified_allocation_replay_binding_v1.ts`.
Its reviewed source Git blob is
`0a74a3652081c3e142d0b887676771a7ac148f32`,
and its exact initial reviewed source generation is
`7da490d56556ab98b5515f5eba53bf6a8f118203`.

The frozen V1 crash proof remains original Git blob
`1a8db260a134ad438366d5b7660f926768c98a79`. It intentionally
pins the earlier replay-binding source blob
`970e686cd96b43d496c44acb4ff343a5e61e26c5`.
Rewriting that old script to pass on the new source would destroy
historical provenance. Therefore the V1 scripts, workflows, logs and
identities remain untouched.

This new source-only V2 branch copies the **exact original V1 synthetic
matrix**, retains every historical negative and idempotence assertion,
and pins the new verified replay-binding source without pretending it
is the earlier implementation.

## New permanent first-original buyer-wallet falsifiers

The V2 pure replay proof constructs three first-request rows where buyer
`delivery_address` was originally **absent, null or empty**, then
appends a later fully populated request row and a superficially matching
`payment_verified` event. Each must HOLD even with an otherwise
canonical allocation row. The backfilled address cannot become
first-original buyer authorization.

The same tests require a changed original populated wallet to HOLD,
while allowing legitimate late transaction-hash and server receive-address
binding when the first request had a real buyer delivery address.
Every original V1 crash-cut test remains, including payment-only fsync
hypothetical, allocation-before-high-water, complete publication replay,
duplicate/no-double-obligation, finite pool and malformed history.

The Node 22/24/26 workflow independently compiles the *current*
source, reruns the original `src` replay-binding proof, executes the
existing real-OS-temp payment→allocation handoff recovery test and
requires the **frozen V1 crash proof to reject** the new replay source
generation with an exact `reviewed_source_blob_drift` failure. It
then runs the separate V2 proof and byte-compares three resulting JSON
reports. This does NOT change historical acceptance semantics.

## Authority still excluded

A passing V2 test establishes pure in-memory lineage consistency and
synthetic temp-filesystem crash ordering only. It does NOT prove a
first-durable original buyer request on an installed node, live USDC
payment finality, Nimo witness custody, protected anti-rollback,
cross-UID capacity/publication locks, exactly-once production allocation,
operator credential/capability, market activation or funds movement.

Historical V1 remains frozen and must continue to HOLD on the new
source; V2 is a separately reviewable candidate proof. No Ready/merge,
production checkout, host/service, real customer ledger, wallet/signer,
keys, transaction, Chain2050/WC, inventory/treasury, WC/VOID opening,
or funds.

**PROTECT THE CORE.**
