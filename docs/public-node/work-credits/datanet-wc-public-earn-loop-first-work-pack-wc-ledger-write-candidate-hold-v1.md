# DataNet WC ledger-write candidate hold v1

Marker: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CANDIDATE_HOLD_V1`

This brick defines the future Work Credits ledger-write candidate shape for the DataNet first work-pack lane.

## Source chain

- WC amount recommendation closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- WC amount recommendation candidate: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CANDIDATE_HOLD_V1`
- WC amount recommendation example: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_EXAMPLE_HOLD_V1`
- Operator decision closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- First work pack: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1`

## What this enables

This creates the packet shape for a future operator-approved WC ledger entry candidate after a future approved amount.

The example amount is 100 WC. That number is a placeholder in the candidate shape only; it is not an approval and not a supply limit.

## Boundary

- Ledger-write candidate shape only
- No ledger-write candidate instantiated
- No ledger line created
- No ledger append performed
- No Work Credit issuance
- No Work Credit ledger write
- No reward creation
- No VOID transfer
- No wallet connect
- No public submission route
- No runtime mutation route

## Work Credit policy

Work Credits remain unlimited and uncapped accounting units for useful verifiable work.

## Next recommended brick

`datanet-wc-public-earn-loop-first-work-pack-wc-ledger-write-candidate-example-hold-v1`
