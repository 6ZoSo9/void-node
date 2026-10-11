# Buy VOID web cross-UID failure binding V1

Status: **source-only, unmounted successor candidate / production HOLD**.

## Purpose

The merged web payment writer executes the canonical verified-payment allocation
dispatch under the shared web/custody cross-UID capacity claim. The merged
failure-reconciliation classifier can diagnose durable state after an uncertain
handoff. Before this candidate, those components were not composed: a dispatch
exception escaped directly to the lock primitive, which retained the claim but
could not record whether durable state showed no target effect, a missing
allocation, or a complete handoff.

This candidate catches the dispatch failure **inside the still-owned lock
callback**, invokes the canonical read-only classifier with only the planned
request identity and server-controlled roots, validates its exact non-authority
contract, attaches the diagnosis to the retained failure, and rethrows. The
outer lock therefore retains its claim for every diagnosis and for every
classifier failure.

## Exact composition

The candidate reuses:

- `checkedVerifiedPaymentDispatchPlanV1` for the bounded frozen event/request
  snapshot before lock acquisition;
- `withBuyVoidCrossUidCapacityExclusiveLockV1` for the outer web/custody claim;
- `dispatchBuyVoidOperatorEventWithAllocationRequiredV1` for the only accepted
  `payment_verified` writer; and
- `classifyBuyVoidCrossUidFailureReconciliationV1` for read-only durable-state
  diagnosis.

The reconciliation input is constructed before the wait from the planned
snapshot and canonical roots:

```text
request_id
request_dir
/var/lib/void-allocation-ledger-v1
/var/lib/void-allocation-custody-v1
```

Caller mutation while the lock is contended cannot redirect either dispatch or
diagnosis.

## Failure outcomes

All four classifier outcomes retain the outer claim:

- `observed_no_target_capacity_effect`
- `verified_allocation_missing`
- `allocation_present`
- `held`

No diagnosis is converted into callback success. An unqualified classifier
result or a classifier exception also rethrows while the callback still owns
the claim. The resulting outer error preserves the dispatch failure as its
cause and, when qualified, exposes the frozen reconciliation result as a
non-enumerable property for a later reviewed recovery layer.

## What this closes

This establishes a source composition in which:

- reconciliation runs only after a dispatch failure;
- reconciliation runs while the web participant still owns the cross-UID
  critical section;
- exact planned identity and server roots are reused; and
- every uncertain, missing, complete, absent-effect, malformed, or unreadable
  outcome remains fail-closed with the claim retained.

## Deliberate HOLD

This does **not** authorize claim release. Repeated descriptor-bound reads do
not prove one atomic cross-filesystem snapshot. Ledger/high-water binding does
not prove an external protected witness or exclude coordinated rollback. The
candidate is not mounted into a public route and does not establish installed
web/custody principals or artifact identity.

```text
production_cross_uid_lock_ownership_verified=false
cross_file_atomic_snapshot_verified=false
external_high_water_witness_verified=false
coordinated_storage_rollback_excluded=false
cross_uid_lock_release_authorized=false
custody_recovery_authorized=false
deployed_artifact_generation_verified=false
runtime_integration=false
payment_acceptance=false
presale_activation=false
wallet_or_signer_access=false
transaction_broadcast=false
funds_movement=false
```

The next gate is a separately reviewed protected-witness and phase-aware
release/recovery protocol. A proven pre-mutation rejection may be releasable
only after that evidence is durable and independently bound. Missing or
uncertain allocation must continue requiring exclusive recovery.

## Complete allocation receipt before the outer lock can release

The original callback accepted a dispatcher `{ok:true}` result without
inspecting whether its durable allocation publication had completed. The
canonical verified-payment allocation writer currently returns a frozen
outer handoff receipt containing a separately frozen allocation receipt.
The new source-only success check runs **inside** the outer lock callback
and requires both canonical receipt/authority identities; matching exact
SHA-256 of the already-frozen planned event JSON plus LF; a canonical
allocation record ID; positive final allocation record count; consistent
payment-append versus replay-idempotence flags; and all runtime/production/
money-movement authorities still false.

An absent allocation, success-only object, incorrect event digest,
forged marker, unfrozen receipt or getter-bearing field throws through the
existing in-lock reconciliation path. The cross-UID claim stays retained;
no ambiguous callback can be promoted to completed solely because it
returned `ok:true`. The existing Node 22/24/26 synthetic proof exercises
both new-payment and exact idempotent receipt success and all negative
classes without writing any ledger or invoking real dispatch.

This guards the `source_candidate_only` interface, not installed real
web/custody identities, protected high-water custody, a complete external
transaction, cross-file atomic snapshot or public operator mount. Success
of this proof never authorizes payment acceptance, reserve/recovery,
presale/WC activation, signer access or funds movement.


## Strict allocation publication outcome and recovery evidence

The exact source-only receipt verifier additionally requires a native
allocation writer status (`persisted`, `recovered` or `idempotent`) with a
matching operation-performed flag, Boolean prior recovery evidence, and a
canonical non-genesis SHA-256 final ledger tip. A forged completed result with
an invalid tip, impossible writer status, or contradictory operation flag
retains the outer cross-UID claim through the existing failure pathway.

Payment replay idempotence and allocation replay idempotence are separate:
a previously durable payment may legitimately need a *first* allocation
publication during recovery. The synthetic proof tests that case and a fully
idempotent completed replay without turning either into live authorization.
These checks inspect a returned source-level receipt; they **do not** establish
an independently authenticated installed witness or actual payment finality.
