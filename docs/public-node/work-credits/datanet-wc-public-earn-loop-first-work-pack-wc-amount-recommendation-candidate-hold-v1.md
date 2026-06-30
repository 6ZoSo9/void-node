# DataNet WC amount recommendation candidate hold v1

Marker: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CANDIDATE_HOLD_V1`

This brick defines the operator Work Credit amount recommendation candidate shape for the DataNet first work-pack lane.

## Source chain

- Operator decision closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- Operator decision candidate: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CANDIDATE_HOLD_V1`
- Operator decision example: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_EXAMPLE_HOLD_V1`
- First work pack: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1`

## What this enables

This creates the shape for a future operator recommendation of a Work Credit amount after a future accepted decision.

The starter recommendation shown here is 100 WC for the first work-pack lane. That is a recommendation placeholder only; it is not an approval and not a supply limit.

## Boundary

- Amount recommendation candidate only
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

`datanet-wc-public-earn-loop-first-work-pack-wc-amount-recommendation-example-hold-v1`
