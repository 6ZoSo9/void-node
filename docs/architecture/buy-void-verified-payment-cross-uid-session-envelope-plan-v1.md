# Buy VOID verified-payment cross-UID session envelope source plan V1

Status: **source-only plan / production HOLD**.

This plan defines the missing common-host/session envelope and phase-aware
release/recovery contract between the existing web/custody cross-UID claim and
any future protected recovery implementation. It does not mount a route,
release a claim, recover custody, accept a payment, activate presale, or move
funds.

## Exact source generation

- source base: `7197eb96ff3ce2d3f630545a85c150b694d20b3b` (FIFO-safe claim-reader source generation)
- source base tree: `ed7c516dc7d49895a2af576add999c3a5dde945b`
- plan ID: `voidbuyxuid1_f5aedeb3290db0ce83cad747e97d6fc27b6c3d422263525a2f23df79f126004e`
- plan blob: `336aa696f4ff08341be649d7b5e087367c7c629e`
- proof blob: `1466f852d91de10b255fac3637fe5e9056280cc1`
- source bindings: **11**

The retained claim reader dependency is now bound to #3671 exact source blob `94f0a0dd8997e1e2c0fab54044f19d70d983d441`, proof blob `4c70b8f9f30eee30395a0f13b028de2007c28249`, workflow blob `cbb5e1cecf613b8bbc7e3b3aafd8ee1e31e582a9`, and focused run `39618226898`. This is source/CI evidence only; independent review is still false and the release/recovery gate stays closed.

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

Recovery from `uncertain` additionally requires a protected phase witness. The specific `uncertain → pre_mutation_rejected` edge requires a **second, distinct pre-mutation zero-effect witness** before that classification is even eligible. A generic protected phase receipt is insufficient.

That zero-effect witness must bind the original claim/session incarnation, request/payment lineage, web/custody artifact generations, request/operator-payment durable ledger identities and tips, allocation ledger/tip and high-water generation, sidecar/pending-intent state, previous envelope/phase sequence, and reviewed rollback/time domains. It must positively attest no payment append, allocation publication, sidecar, pending intent, or earlier target-capacity write effect. Verification of the complete zero-effect witness contract must return true before any future release-candidate classification. Presence of the witness SHA-256 alone is not sufficient.

The two future release-candidate labels (`pre_mutation_rejected` and
`terminal_revalidated`) still retain the claim in this plan and grant no
release authority.

## Current reconciliation mapping

- `held` → retain;
- `observed_no_target_capacity_effect` → retain until the distinct authenticated pre-mutation zero-effect witness;
- `verified_allocation_missing` → retain and require exclusive recovery;
- `allocation_present` → retain until terminal revalidation and protected
  witness.

## Explicit current HOLDs

1. cross-UID claim read FIFO-nonblocking source/CI evidence is bound and green, but independent review is not complete;
2. custody service V2 reserve/recover is disabled;
3. protected phase witness is missing;
4. pre-mutation zero-effect witness is missing;
5. external high-water witness is missing;
6. allocation-required operator route is unmounted;
7. direct web private-root write authority is forbidden;
8. trusted clock is unbound; and
9. deployed artifact generation is unverified.

Any repair of a HOLD requires a reviewed successor. It cannot silently promote
this plan.

## Authority

```text
source_plan_only=true
common_host_session_envelope_implemented=false
capacity_lock_claim_read_nonblocking_source_evidence_verified=true
capacity_lock_claim_read_nonblocking_independent_review_complete=false
capacity_lock_claim_read_nonblocking_verified=false
protected_phase_witness_implemented=false
pre_mutation_zero_effect_witness_implemented=false
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
