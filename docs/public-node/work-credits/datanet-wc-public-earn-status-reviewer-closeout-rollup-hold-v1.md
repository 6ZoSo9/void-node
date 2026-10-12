# DataNet WC Public Earn Status Reviewer Closeout Rollup Hold v1

Marker: `VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_ROLLUP_HOLD_V1`

## What changed

This brick publishes a public reviewer closeout rollup for the DataNet Work Credits public earn-status lane.

It binds the public review-lane rollup, public earn-readiness summary, and available-work public reviewer final seal.

Public JSON path:

- /public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-rollup-hold-v1.json

Index path:

- /public-node/work-credits/index.json

## Boundary

This is public-safe read-only audit/status evidence only.

Work Credits remain unlimited and uncapped.

Earning remains held.

It does not enable public submission.

It does not accept work packets.

It does not perform review decisions.

It does not approve or issue Work Credits.

It does not create or append a WC ledger line.

It does not allocate or transfer VOID.

It does not access a wallet or signer.

It does not add a runtime route or mutation handler.

Expected proof result:

`VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_ROLLUP_HOLD_V1_GREEN`
