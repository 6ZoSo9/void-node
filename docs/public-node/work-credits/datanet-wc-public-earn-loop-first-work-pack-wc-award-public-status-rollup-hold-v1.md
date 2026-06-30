# DataNet WC award public status rollup hold v1

Marker: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AWARD_PUBLIC_STATUS_ROLLUP_HOLD_V1`

This brick publishes a public-safe status rollup for the DataNet first work-pack Work Credits award lane.

## Source chain

- WC ledger-write approval closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- WC ledger-write approval candidate: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_CANDIDATE_HOLD_V1`
- WC ledger-write approval example: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_EXAMPLE_HOLD_V1`
- WC ledger-write closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- WC amount recommendation closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- Operator decision closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- Public submission intake closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PUBLIC_SUBMISSION_INTAKE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- First work pack: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1`

## Public status

The first work-pack lane has documented the static path from public work pack through review, amount recommendation, ledger-write candidate, and ledger-write approval readiness.

The example amount is 100 WC. That number is an example placeholder only; it is not an approval and not a supply limit.

## Boundary

- Public status rollup only
- No award created
- No award approved
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

`datanet-wc-public-earn-loop-first-work-pack-wc-award-public-status-closeout-audit-rollup-hold-v1`
