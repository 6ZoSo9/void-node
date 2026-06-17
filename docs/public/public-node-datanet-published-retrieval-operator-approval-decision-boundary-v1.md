# DataNet Published Retrieval Operator Approval Decision Boundary v1

Marker: `VOID_DATANET_PUBLISHED_RETRIEVAL_OPERATOR_APPROVAL_DECISION_BOUNDARY_DOC_V1`

Public route:

`GET /public-node/datanet/published-retrieval-operator-approval-decision-boundary-v1.json`

This lane proves that operator approval is a separate explicit decision boundary.

It does **not** approve the candidate.

It does **not** reject the candidate.

It does **not** create an award intent.

It does **not** award Work Credits.

It proves:

- Review packet is valid.
- Approval is a separate operator action.
- Public route cannot approve.
- Public route cannot record operator identity.
- Public route cannot record approval signature.
- Public route cannot record approval timestamp.
- Duplicate guard remains required before approval.
- Settlement-plane review remains required before award.
- Ledger write remains false.
- WC award remains false.

Boundary:

- `approval_is_separate_operator_action=true`
- `public_route_can_approve_candidate=false`
- `operator_identity_bound_now=false`
- `operator_approval_recorded_now=false`
- `approval_signature_recorded_now=false`
- `approval_timestamp_recorded_now=false`
- `duplicate_guard_required_before_approval=true`
- `duplicate_guard_performed_now=false`
- `settlement_plane_required_before_award=true`
- `settlement_plane_performed_now=false`
- `automatic_award=false`
- `award_intent_created_now=false`
- `award_record_created_now=false`
- `wc_delta_now=0`
- `ledger_write=false`
- `wc_credit_award=false`
