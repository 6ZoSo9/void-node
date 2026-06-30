# DataNet WC ledger-write approval candidate hold v1

Marker: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_CANDIDATE_HOLD_V1`

This brick defines the future operator approval candidate shape for a Work Credits ledger-write packet in the DataNet first work-pack lane.

## Source chain

- WC ledger-write closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- WC ledger-write candidate shape: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CANDIDATE_HOLD_V1`
- WC ledger-write candidate example: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CANDIDATE_EXAMPLE_HOLD_V1`
- WC amount recommendation closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- Operator decision closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- First work pack: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1`

## What this enables

This creates the packet shape for a future operator approval candidate before any future Work Credits ledger write can be authorized.

The example amount is 100 WC. That number is a placeholder only; it is not an approval and not a supply limit.

## Boundary

- Approval candidate shape only
- No approval decision created
- No ledger-write authorization
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

`datanet-wc-public-earn-loop-first-work-pack-wc-ledger-write-approval-example-hold-v1`
