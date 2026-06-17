# DataNet Published Retrieval WC Candidate Boundary v1

Marker: `VOID_DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_DOC_V1`

Public route:

`GET /public-node/datanet/published-retrieval-wc-candidate-boundary-v1.json`

This lane bridges a verified DataNet published retrieval receipt into a Work Credit candidate boundary.

It does **not** award Work Credits.

It proves:

- A published retrieval receipt can be validated as useful work evidence.
- The evidence is SHA-256 verifiable.
- The candidate is public-safe.
- Operator review is still required.
- Duplicate guard is still required.
- Settlement-plane review is still required.
- Public route cannot write the ledger.
- Public route cannot award WC.
- Public route cannot create an award record.

Boundary:

- `useful_work_candidate=true`
- `operator_review_required=true`
- `duplicate_guard_required=true`
- `settlement_plane_required=true`
- `automatic_award=false`
- `award_record_created_now=false`
- `wc_delta_now=0`
- `ledger_write=false`
- `wc_credit_award=false`
