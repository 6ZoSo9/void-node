# Public Node First External Tester WC Review Decision Boundary v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_DOC_V1`

Route:

`/public-node/first-external-tester-wc-review-decision-boundary.json`

UI marker:

`VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_UI_V1`

Card id:

`publicNodeFirstExternalTesterWcReviewDecisionBoundaryCard`

This is a public read-only boundary for future manual review decisions.

Allowed future decision states:

- `accepted`
- `rejected`
- `deferred`

Required current boundary:

- `boundary_state=allowed_states_only_no_decision_record_created`
- `current_decision_state=not_decided`
- `decision_record_created_now=false`
- `review_record_created_now=false`
- `award_created_now=false`
- `wc_decision_record_write=false`
- `wc_review_record_write=false`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `wc_to_void_swap=false`

This route/card does not create a decision record, create a review record, award Work Credits, mutate the WC ledger, create payouts, send wallets, or enable WC-to-VOID swaps.
