# Public Node First External Tester WC Candidate v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_DOC_V1`

Route:

`/public-node/first-external-tester-wc-candidate.json`

This is a public read-only Work Credit candidate packet for the first external tester loop.

It does not award Work Credits. It only creates a reviewable candidate packet with:

- candidate id
- source evidence
- closeout proof marker
- earned-readiness marker
- suggested review fields
- accounting boundary flags

Required boundary:

- `candidate_status=pending_operator_review`
- `award_created_now=false`
- `wc_ledger_mutated_now=false`
- `wc_credit_delta_now=0`
- `payout_created_now=false`
- `redeemable_now=false`
- `wc_to_void_swap=false`
- `money_movement=false`
- `wallet_send=false`

Route marker:

`VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_ROUTE_V1`
