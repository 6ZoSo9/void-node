# DataNet WC public submission intake packet hold v1

Marker: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PUBLIC_SUBMISSION_INTAKE_PACKET_HOLD_V1`

This brick exposes the first public-safe submission packet template for the DataNet Work Credits first work pack.

It moves the lane from reviewer-only evidence preparation toward a worker-facing packet shape: a worker can prepare the fields needed for later review, but this brick does not open a public submission form or runtime endpoint.

## Source chain

- First work pack: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1`
- Reviewer handoff packet: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_HANDOFF_PACKET_HOLD_V1`
- Reviewer evidence packet template: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_EVIDENCE_PACKET_TEMPLATE_HOLD_V1`
- Reviewer evidence packet example: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_EVIDENCE_PACKET_EXAMPLE_HOLD_V1`
- Reviewer evidence example closeout: `VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_EVIDENCE_EXAMPLE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1`

## Public intake posture

- Worker packet preparation: available as static template
- Public submission open: false
- Public form route created: false
- Server-side submission endpoint created: false
- Operator review required: true
- Automatic scoring: false
- Automatic Work Credit issuance: false
- Work Credit ledger write: false
- VOID transfer: false

## Work Credit policy

Work Credits remain unlimited and uncapped accounting units for useful verifiable work.

The suggested starter review amount is 100 WC for this first work-pack lane. That number is a starter review quote only; it is not a supply limit.

## Boundary

This is static public metadata only. It does not create a public mutation route, does not collect submissions, does not connect wallets, does not score work, does not award Work Credits, and does not append to any ledger.
