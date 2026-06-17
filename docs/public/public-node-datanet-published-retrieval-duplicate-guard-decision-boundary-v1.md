# DataNet Published Retrieval Duplicate Guard Decision Boundary v1

Marker: `VOID_DATANET_PUBLISHED_RETRIEVAL_DUPLICATE_GUARD_DECISION_BOUNDARY_DOC_V1`

Public route:

`GET /public-node/datanet/published-retrieval-duplicate-guard-decision-boundary-v1.json`

This lane performs a read-only duplicate guard decision for the published retrieval WC candidate.

It does **not** approve the candidate.

It does **not** create an award intent.

It does **not** write a ledger entry.

It does **not** award Work Credits.

It proves:

- Review packet is valid.
- Duplicate guard is required.
- Duplicate guard is performed now as a read-only decision.
- Duplicate is not found in the fixture guard set.
- No duplicate record is written.
- Operator approval is still not recorded.
- Settlement-plane review remains required before award.
- Public route cannot award WC.
- Public route cannot write ledger entries.

Boundary:

- `duplicate_guard_required=true`
- `duplicate_guard_performed_now=true`
- `duplicate_found=false`
- `duplicate_record_written_now=false`
- `operator_approval_recorded_now=false`
- `settlement_plane_required_before_award=true`
- `settlement_plane_performed_now=false`
- `automatic_award=false`
- `award_intent_created_now=false`
- `award_record_created_now=false`
- `wc_delta_now=0`
- `ledger_write=false`
- `wc_credit_award=false`
