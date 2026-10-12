# Public Node First External Tester WC Award Policy v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_DOC_V1`

Route:

`/public-node/first-external-tester-wc-award-policy.json`

This is a public read-only award policy stub for the first external tester Work Credit candidate.

It defines what a future operator review record must contain before any Work Credit ledger mutation is allowed.

It does not create a review record. It does not award Work Credits. It does not mutate the WC ledger. It does not create payouts. It does not enable WC-to-VOID swaps.

Required current-state boundary:

- `policy_state=draft_public_read_only`
- `review_record_created_now=false`
- `review_outcome_now=not_decided`
- `award_decision_now=not_decided`
- `award_created_now=false`
- `wc_ledger_mutated_now=false`
- `wc_credit_delta_now=0`
- `proposed_wc_credit_delta_now=null`
- `payout_created_now=false`
- `redeemable_now=false`
- `wc_to_void_swap=false`
- `money_movement=false`
- `wallet_send=false`

Route marker:

`VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_ROUTE_V1`
