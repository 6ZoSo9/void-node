# Public Node First External Tester WC Review Checklist Card v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_CARD_DOC_V1`

This adds a visible `/public-node` card for the first external tester Work Credit review checklist.

UI marker:

`VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_UI_V1`

Card id:

`publicNodeFirstExternalTesterWcReviewChecklistCard`

Links:

- `/public-node/first-external-tester-wc-review-checklist.json`
- `/public-node/first-external-tester-wc-candidate.json`

Required boundary:

- `review_state=pending_operator_review`
- `checklist_status=open`
- `review_required_before_award=true`
- `award_decision=not_decided`
- `ledger_write_allowed_now=false`
- `award_created_now=false`
- `wc_ledger_mutated_now=false`
- `wc_credit_delta_now=0`
- `wc_to_void_swap=false`

The card is read-only public status. It does not create awards, mutate the WC ledger, create payouts, or enable WC-to-VOID swaps.
