# Buy VOID verified-payment cross-UID session envelope source plan V1

Status: **source-only plan / production HOLD**.

This plan fills the missing design seam between the existing web/custody cross-UID
claim and any future phase-aware release/recovery implementation. It does not
mount the operator route, start the custody service, release a live claim,
recover custody, accept a payment, activate presale, or move funds.

## Exact source generation

- source base: `f1702672f2399355758e7a07fdd8f0ffb8dc1d33`
- source base tree: `fa74ce8645ee2f452343d95fdc459ae479fe73ef`
- plan ID: `voidbuyxuid1_57fb5e84d83c9fbe98337525263d93309c06ffd96b752a1ee273847bfc91c5f6`
- plan blob: `aead984c39a264ef23e00c9a2a95787760dce684`
- proof blob: `5bf036decaa0aaf30302ef4d7dacf0dacea97da7`
- source bindings: **11**

The plan binds the current source identities for the cross-UID lock, failure
reconciliation, web writer/failure binding, verified-allocation dispatcher and
handoff, allocation publication/replay/ledger contracts, and custody service V2.

It deliberately does **not** claim complete transitive runtime closure.

## Session envelope contract

A future installed implementation must bind the existing claim semantics rather
than inventing a bearer token. The envelope therefore carries:

- the existing claim nonce, staging name, owner role/UID, participant UIDs and
  shared GID;
- request ID plus exact payment-event, allocation-record and allocation-tip
  lineage;
- a monotone phase sequence and previous-envelope commitment;
- exact web/custody artifact generations; and
- a protected phase-witness commitment.

The proposed session ID is content-addressed from the immutable claim/lineage
phase-0 tuple and artifact generations. A clock alone cannot authorize release.

## Phase model

All phases retain the existing outer claim in this plan. The current source
classifier outcomes map as follows:

- `held` → retain;
- `observed_no_target_capacity_effect` → retain until a protected pre-mutation
  witness exists;
- `verified_allocation_missing` → retain and require exclusive recovery;
- `allocation_present` → retain until terminal revalidation plus protected
  witness evidence.

`pre_mutation_rejected` and `terminal_revalidated` are only *future release
candidates*. They are **not release authority** in V1.

## Required future release evidence

A later implementation must prove the same original claim owner, claim
nonce/staging identity, request/payment lineage, web/custody artifact
generations, monotone phase sequence, protected phase witness, repeated
descriptor-bound observations, rollback exclusion, exact allocation handoff
when an allocation effect is possible, terminal owner revalidation and durable
parent fsync.

## Explicit current HOLDs

The plan intentionally records these current negatives:

1. the cross-UID claim reader is not yet proven FIFO-swap nonblocking;
2. custody service V2 reserve/recover is disabled;
3. protected phase witness is missing;
4. external high-water witness is missing;
5. the authenticated allocation-required operator route is unmounted;
6. direct web private-root write authority is forbidden;
7. trusted clock binding is absent; and
8. deployed artifact generation is unverified.

A change that fixes one HOLD must create a reviewed source successor. It must not
silently reinterpret this plan as live authority.

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
