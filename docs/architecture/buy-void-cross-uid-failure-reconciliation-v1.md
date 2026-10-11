# Buy VOID cross-UID failure reconciliation V1

Marker: `VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_V1`

Status: **source-only, read-only classifier / production HOLD**.

This classifier narrows the callback-failure boundary between the web payment
writer and the custody allocation writer. It does not release a cross-UID
claim, reserve inventory, recover custody state, accept a payment, activate the
presale, or move funds.

## Inputs

The caller supplies exactly four primitive string fields:

- `request_id`
- `request_dir`
- `allocation_ledger_root`
- `allocation_high_water_root`

Proxies, accessors, extra fields, symbols, invalid request IDs, and non-string
values HOLD before any filesystem observation.

The supplied paths remain source-only configuration. This module does not prove
that they are the installed production paths.

## Evidence composition

The classifier reuses the existing descriptor-bound read-only observers for:

1. `requests.jsonl` and `operator-events.jsonl`; and
2. the allocation reservation ledger and its independently stored high-water.

Both observations are repeated and all four byte sequences must remain
identical across the read window. The allocation ledger must bind exactly to
the authoritative high-water. Operator history is strict canonical JSONL, and
the canonical verified-allocation replay classifier validates the complete
verified-event/allocation history with at most two full replay calls. A target
that already has a verified event needs one replay. A target without one uses
one representative global replay, when needed, plus one target-absence replay.
This avoids reparsing the complete ledgers once per verified request.

This detects ordinary concurrent changes but does **not** prove an atomic
cross-filesystem snapshot, an external high-water witness, or exclusion of a
coordinated rollback across both allocation roots. A future caller must
independently establish that it owns the outer cross-UID capacity claim before
using this diagnosis in any release protocol.

## Outcomes

### `observed_no_target_capacity_effect`

The target request is qualified in request history, no canonical
`payment_verified` event exists for it, no allocation record exists for it,
all allocation records belong to durable verified payments, and every other
durable verified payment already has its canonical allocation.

This is an observation, not release authority. The result always states
`cross_uid_lock_release_authorized=false`.

### `verified_allocation_missing`

The exact target `payment_verified` event is durable and canonical, but its
allocation is absent. Every other durable verified payment is fully allocated.
The result identifies the exact event digest and states that exclusive recovery
is required. It does not perform or authorize recovery.

### `allocation_present`

The target payment and canonical allocation are both present and byte-bound,
and every other durable verified payment is fully allocated. This diagnoses a
complete durable handoff; it does not certify sidecar completion, HTTP response
delivery, deployment identity, or runtime mounting.

### `held`

Malformed, changing, unreadable, rollbacked, orphaned, duplicated, globally
incomplete, or otherwise ambiguous evidence always HOLDs. In particular:

- an allocation without a durable verified payment HOLDs;
- a missing allocation for any other verified request HOLDs;
- a ledger/high-water mismatch HOLDs; and
- any observer or strict replay failure HOLDs.

## Deliberate non-authority

The source authority permanently keeps these false:

```text
cross_file_atomic_snapshot_verified=false
external_high_water_witness_verified=false
coordinated_storage_rollback_excluded=false
cross_uid_lock_ownership_verified=false
cross_uid_lock_release_authorized=false
custody_recovery_authorized=false
filesystem_write=false
runtime_integration=false
payment_acceptance=false
presale_activation=false
wallet_or_signer_access=false
transaction_broadcast=false
funds_movement=false
```

The next integration step, after exact-head CI review, is to invoke this
classifier only while the web writer still owns the outer claim. A separate
review must define how a proven pre-mutation rejection is returned through the
lock primitive and rethrown after a durable claim release. Missing or uncertain
handoffs must continue retaining the claim for exclusive reconciliation.
