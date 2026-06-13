# Public Node First External Tester WC Candidate Card v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_UI_DOC_V1`

The `/public-node` page includes a human-facing card for the first external tester Work Credit candidate packet.

UI marker:

`VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_UI_V1`

The card explains that the external tester receipt is packaged as a reviewable Work Credit candidate, but remains pending operator review.

It explicitly reports:

- `candidate_status=pending_operator_review`
- `review_required_before_award=true`
- `useful_work=true`
- `verifiable=true`
- `award_created_now=false`
- `wc_ledger_mutated_now=false`
- `wc_credit_delta_now=0`
- `wc_to_void_swap=false`

It links to:

- `/public-node/first-external-tester-wc-candidate.json`
- `/public-node/first-external-tester-earned-readiness.json`
