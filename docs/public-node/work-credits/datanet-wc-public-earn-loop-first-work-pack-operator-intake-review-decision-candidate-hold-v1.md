# DataNet WC operator intake review decision candidate hold v1

Marker: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_DECISION_CANDIDATE_HOLD_V1`

This brick defines the deterministic operator decision candidate shape for the DataNet Work Credits first work-pack lane.

## Source chain

- Operator intake review packet candidate: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_PACKET_CANDIDATE_HOLD_V1`
- Operator intake review packet example: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_OPERATOR_INTAKE_REVIEW_PACKET_EXAMPLE_HOLD_V1`
- Public submission intake packet: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PUBLIC_SUBMISSION_INTAKE_PACKET_HOLD_V1`

## What this enables

This creates the decision vocabulary and rule shape needed after an operator has reviewed a prepared worker submission packet.

The allowed candidate outcomes are:

- accept
- reject
- needs_more_info

This brick does not create a decision fixture and does not approve any Work Credit amount.

## Boundary

- Decision candidate only
- No accept decision created
- No reject decision created
- No needs-more-info decision created
- No approved WC amount
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

`datanet-wc-public-earn-loop-first-work-pack-operator-intake-review-decision-example-hold-v1`
