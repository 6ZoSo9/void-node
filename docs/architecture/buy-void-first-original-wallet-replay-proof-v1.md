# Original buyer wallet replay provenance — V2 proof successor, V1 immutable

## Current first-original buyer source boundary

On reviewed first-original wallet code in [#2750](https://github.com/6ZoSo9/void-node/pull/2750),
`src/economic/buy_void_verified_allocation_replay_binding_v1.ts` uses exact
source Git blob `0a74a3652081c3e142d0b887676771a7ac148f32`.
The previous independently reviewed blob was
`970e686cd96b43d496c44acb4ff343a5e61e26c5`.
Their **only** textual difference is eight added lines: an
`initialDeliveryQualified` bit initialized from the *first* request row,
preserved through subsequent snapshots, and checked in target replay,
verified event binding and original preappend verification.

The new rule prevents a request's delivery wallet from appearing for the
first time after a supposedly durable original request. A late wallet graft
cannot create verified-payment authority, a canonical reservation, or
recoverable buyer funds.

## Preserve V1 historical evidence exactly

This successor deliberately **does NOT replace, repin or reissue** the two
original historical scripts. These original blobs are preserved by exact
Git identity from the parent #2750 source generation:

- `scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v1.mjs`:
  `1a8db260a134ad438366d5b7660f926768c98a79`
- `scripts/prove_buy_void_custody_reserve_plan_v1.mjs`:
  `94596835ee781f1dcfd42ab79787787868c31841`

Their rejection of the **changed current source** is expected and remains
explicitly tested. This is vital: the original first-original buyer workflow
contains a historical V1 preservation job that must HOLD if a legacy V1
test is silently rewritten into a new source generation.

A previous draft revision accidentally replaced the V1 files in place; the
historical preservation job correctly rejected that revision. This correction
restores the exact old Git blobs and instead introduces two **distinctly
named new V2 proof files**:

- `scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v2_original_wallet.mjs`
- `scripts/prove_buy_void_custody_reserve_plan_v2_original_wallet.mjs`

The V2 proofs lock the **new exact source blob**, not the historical source
blob, and explicitly require a missing original first-row delivery wallet
to HOLD both as a single historical request and with a later fully populated
snapshot. Independent pure crash and custody reserve planners must reject
`request_initial_delivery_address_missing` (wrapped in the reserve
`verified_payment_replay_` prefix). Every original, unchanged V1 adversarial
case is retained in the separate V2 successor tests: canonical verified
payment identity, idempotent recovery, allocation publication phases,
duplicate and conflicting history, sold-out capacity, launch-generation
matching, and all-false monetary authority.

## Exact-head CI and trust limits

The new Node 22/24/26 synthetic workflow independently builds the reviewed
TypeScript dependency closure, runs both **current-generation V2** proofs,
checks their explicit V2 source identity and no-funds flags, verifies that
**historical V1** proofs still decline the current source, and demands
byte-identical V2 JSON and text receipts across all three Node versions.
A focused GREEN is not transferable to production runtime or the old
historical witness.

A separate original Nimo frozen V1 witness bundle remains installed with
8/8 matching bytes by operator read-only observation. Current V2 is an
**INACTIVE, UNACCEPTED** review archive staged only under Nimo's user home,
not a reviewed installed service. The current original V1 witness source
identity must never be aliased or repinned to V2 compiled bytes.

`installed_nimo_v2_accepted=false`
`custody_reserve_method_enabled=false`
`production_allocation_mutation_ready=false`
`presale_activation=false`
`funds_moved=false`

The actual operator verified-payment HTTP route still uses the payment-only
writer; the verified→allocation dispatcher is **UNMOUNTED**. No first live
buyer payment finality, authenticated custody IPC, protected high-water or
payment→allocation fsync is qualified. No host, service, credentials, keys,
wallet, customer ledger, Chain-2050/WC, treasury, inventory or funds action
may be inferred from these synthetic results.

**PROTECT THE CORE.**
