# DataNet WC amount recommendation example hold v1

Marker: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_EXAMPLE_HOLD_V1`

This brick provides a public-safe example Work Credit amount recommendation packet for the DataNet first work-pack lane.

## Source chain

- WC amount recommendation candidate: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CANDIDATE_HOLD_V1`
- Operator decision closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- Operator decision example: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_EXAMPLE_HOLD_V1`
- First work pack: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1`

## What this enables

This shows what a future operator Work Credit amount recommendation packet can look like after a future accepted decision.

The example amount is 100 WC for the first work-pack lane. That number is an example recommendation only; it is not an approval and not a supply limit.

## Boundary

- Amount recommendation example only
- No amount recommendation fixture created
- No approved WC amount
- No Work Credit issuance
- No Work Credit ledger write
- No ledger-write candidate
- No reward creation
- No VOID transfer
- No wallet connect
- No public submission route
- No runtime mutation route

## Work Credit policy

Work Credits remain unlimited and uncapped accounting units for useful verifiable work.

## Next recommended brick

`datanet-wc-public-earn-loop-first-work-pack-wc-amount-recommendation-closeout-audit-rollup-hold-v1`
