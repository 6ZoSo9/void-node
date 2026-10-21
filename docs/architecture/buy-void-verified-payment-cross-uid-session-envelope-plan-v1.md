# Buy VOID verified-payment cross-UID session envelope source plan V1

Status: **source-only plan / production HOLD**.

This plan defines the missing common-host/session envelope and phase-aware
release/recovery contract between the existing web/custody cross-UID claim and
any future protected recovery implementation. It does not mount a route,
release a claim, recover custody, accept a payment, activate presale, or move
funds.

## Exact source generation

- source base: `f1702672f2399355758e7a07fdd8f0ffb8dc1d33`
- source base tree: `fa74ce8645ee2f452343d95fdc459ae479fe73ef`
- plan ID: `voidbuyxuid1_af49f625a1b1db2e198125aea83379e715cd56ce60ee5967e176d2fe085bf384`
- plan blob: `a4c3ef95869f817be8ec8af29957ff918c379efa`
- proof blob: `107a050ac6eea86a632d9d8d594bb56251def353`
- source bindings: **11**

## Claim/incarnation binding

The existing capacity-lock claim already binds UID/role, PID, process-start
ticks, nonce, staging name, creation timestamp, custody/web UIDs and shared GID.
A future session envelope must carry that incarnation instead of reducing claim
ownership to a bearer token.

`claim_created_at_utc` is provenance only. Trusted-clock release authority is
false; wall-clock age cannot release a claim.

## Closed phase graph

Every envelope after phase 0 must increment `phase_seq` by exactly one and bind
the previous envelope SHA-256. Only the closed transition graph in the plan is
allowed. This prevents a writer from jumping directly from `claim_acquired`
to `terminal_revalidated`.

Recovery from `uncertain` additionally requires a protected phase witness.
The two future release-candidate labels (`pre_mutation_rejected` and
`terminal_revalidated`) still retain the claim in this plan and grant no
release authority.

## Current reconciliation mapping

- `held` → retain;
- `observed_no_target_capacity_effect` → retain until protected pre-mutation
  witness;
- `verified_allocation_missing` → retain and require exclusive recovery;
- `allocation_present` → retain until terminal revalidation and protected
  witness.

## Explicit current HOLDs

1. cross-UID claim read FIFO nonblocking is not verified;
2. custody service V2 reserve/recover is disabled;
3. protected phase witness is missing;
4. external high-water witness is missing;
5. allocation-required operator route is unmounted;
6. direct web private-root write authority is forbidden;
7. trusted clock is unbound; and
8. deployed artifact generation is unverified.

Any repair of a HOLD requires a reviewed successor. It cannot silently promote
this plan.

## Authority

```text
source_plan_only=true
common_host_session_envelope_implemented=false
capacity_lock_claim_read_nonblocking_verified=false
protected_phase_witness_implemented=false
external_high_water_witness_verified=false
operator_route_mounted=false
web_private_root_write_authority=false
cross_uid_lock_release_authorized=false
custody_recovery_authorized=false
runtime_integration=false
payment_acceptance=false
presale_activation=false
transaction_broadcast=false
funds_movement=false
```

PROTECT THE CORE. PROTECT THE TRUTH.
