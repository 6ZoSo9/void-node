# DataNet Published Retrieval Operator Review Packet v1

Marker: `VOID_DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_DOC_V1`

Public route:

`GET /public-node/datanet/published-retrieval-operator-review-packet-v1.json`

This lane converts a verified published retrieval WC candidate into an explicit operator review packet.

It does **not** approve the candidate.

It does **not** award Work Credits.

It proves:

- Retrieval receipt is valid.
- Candidate is useful/verifiable work evidence.
- Operator review packet is created.
- Operator approval has not been recorded.
- Operator rejection has not been recorded.
- Duplicate guard is still required and not yet performed.
- Settlement-plane review is still required and not yet performed.
- Public route cannot approve.
- Public route cannot award WC.
- Public route cannot write ledger entries.

Boundary:

- `operator_review_required=true`
- `operator_approval_recorded_now=false`
- `duplicate_guard_required=true`
- `duplicate_guard_performed_now=false`
- `settlement_plane_required=true`
- `settlement_plane_performed_now=false`
- `automatic_award=false`
- `award_intent_created_now=false`
- `award_record_created_now=false`
- `wc_delta_now=0`
- `ledger_write=false`
- `wc_credit_award=false`
