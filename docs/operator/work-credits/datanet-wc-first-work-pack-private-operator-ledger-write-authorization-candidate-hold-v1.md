# DataNet WC first work-pack private operator ledger-write authorization candidate hold v1

Marker: `VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_WRITE_AUTHORIZATION_CANDIDATE_HOLD_V1`

This brick defines a private/operator-only ledger-write authorization candidate shape for a future DataNet first work-pack Work Credits award append.

## Source chain

- Private operator award append approval closeout: `VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- Private operator award append approval candidate: `VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_APPROVAL_CANDIDATE_HOLD_V1`
- Private operator award append approval example: `VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_APPROVAL_EXAMPLE_HOLD_V1`
- Private operator award append decision closeout: `VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- Private operator award append preflight closeout: `VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_PREFLIGHT_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- WC award public status closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AWARD_PUBLIC_STATUS_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- Public WC ledger-write approval closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- Public WC ledger-write closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- WC amount recommendation closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`
- First work pack: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1`

## What this enables

This creates the private operator ledger-write authorization candidate shape for a future award append review. It does not create an effective authorization, create a ledger line, append the ledger, issue WC, create a reward, or transfer VOID.

The example amount is 100 WC. That number is an example placeholder only; it is not an approval and not a supply limit.

## Boundary

- Private/operator-only authorization candidate shape
- No public route
- No public index mutation
- No effective ledger-write authorization created
- No effective operator approval created
- No operator append decision created
- No award created
- No award approved
- No ledger line created
- No ledger append performed
- No Work Credit issuance
- No Work Credit ledger write
- No reward creation
- No VOID transfer
- No wallet connect
- No public submission route
- No runtime mutation route
