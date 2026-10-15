# Buy VOID legacy request-history disposition candidate v1

Marker: `VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1`.

Status: **candidate-only governance/accounting record; not accepted history**.

## Why a disposition is necessary

The pre-anchor request journal never had an independently controlled monotonic
high-water. No later filesystem scan can cryptographically prove that an absent
or zero-byte ledger was never populated and rolled back.

The metadata census therefore remains technical observation only. This
candidate provides an explicit place for the economic owner to state a
**human/accounting disposition** without rewriting that technical fact.

## Decisions

The classifier recognizes exactly three candidate decisions:

- `NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED`
- `SURVIVING_HISTORY_REQUIRES_MIGRATION`
- `UNRESOLVED_HOLD`

A no-liability declaration is admissible as a *candidate* only when the bound
metadata census reports zero surviving-history roots and zero unverified roots.
It still does not prove that the filesystem was never used.

Observed surviving history requires the migration disposition. Any unverified
root requires HOLD.

## Acceptance boundary

Every candidate keeps:

- `technical_candidate_set_completeness_proven=false`;
- `technical_historical_origin_proven=false`;
- `filesystem_rollback_prevention_proven=false`;
- `sovereign_signature_verified=false`;
- `external_witness_verified=false`;
- `historical_request_history_disposition_accepted=false`;
- `stable_root_apply_authorized=false`.

A later acceptance ceremony must bind the exact candidate ID, verify an
explicit Sovereign signature, and append the accepted decision into an
independently controlled external witness before the new stable request-root
genesis can rely on it.

That acceptance receipt must preserve the distinction between:

1. technical historical proof — unavailable for the pre-anchor era; and
2. the owner's explicit accounting/governance disposition — a human decision
   about whether any current customer liability survives.

This PR does not make that decision for the owner and contains no signature.

No host mutation, request/payment content read, migration, service change,
payment acceptance, presale activation or funds movement occurs.

PROTECT THE CORE.
