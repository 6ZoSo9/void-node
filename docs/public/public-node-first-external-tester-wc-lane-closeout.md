# Public Node First External Tester WC Lane Closeout v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_DOC_V1`

Route:

`/public-node/first-external-tester-wc-lane-closeout.json`

UI marker:

`VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_UI_V1`

Card id:

`publicNodeFirstExternalTesterWcLaneCloseoutCard`

This is a public read-only closeout summary for the first external tester Work Credit lane.

It summarizes:

- external receipt imported
- earned readiness green
- WC candidate green
- WC candidate card green
- review checklist green
- review checklist card green
- award policy green
- award policy card green

Required boundary:

- `review_record_created_now=false`
- `award_created_now=false`
- `wc_ledger_mutated_now=false`
- `wc_credit_delta_now=0`
- `wc_review_record_write=false`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `wc_to_void_swap=false`

This route/card does not create review records, award Work Credits, mutate the WC ledger, create payouts, or enable WC-to-VOID swaps.
