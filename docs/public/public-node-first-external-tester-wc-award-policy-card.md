# Public Node First External Tester WC Award Policy Card v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_CARD_DOC_V1`

This adds a visible `/public-node` card for the first external tester Work Credit award policy.

UI marker:

`VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_UI_V1`

Card id:

`publicNodeFirstExternalTesterWcAwardPolicyCard`

Links:

- `/public-node/first-external-tester-wc-award-policy.json`
- `/public-node/first-external-tester-wc-review-checklist.json`

Required boundary:

- `policy_state=draft_public_read_only`
- `review_record_created_now=false`
- `review_outcome_now=not_decided`
- `award_decision_now=not_decided`
- `award_created_now=false`
- `wc_ledger_mutated_now=false`
- `wc_credit_delta_now=0`
- `wc_review_record_write=false`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `wc_to_void_swap=false`

The card is read-only public status. It does not create review records, award Work Credits, mutate the WC ledger, create payouts, or enable WC-to-VOID swaps.
