# DataNet WC Public Review Lane Rollup Hold v1

Marker: `VOID_DATANET_WC_PUBLIC_REVIEW_LANE_ROLLUP_HOLD_V1`

## What changed

This brick publishes a public rollup for the DataNet Work Credits review lane:

- `/public-node/work-credits/datanet-wc-public-review-lane-rollup-hold-v1.json`

It also indexes the rollup from:

- `/public-node/work-credits/index.json`

## Purpose

The Work Credits lane now has one public rollup that points to the review-lane stack:

1. DataNet availability status card
2. available-work packet template
3. public-safe available-work packet example
4. review criteria
5. review checklist
6. review result template
7. public-safe review result example

The rollup lets outsiders understand the review lane without clicking every artifact first.

## Boundary

This is rollup-only.

It does not accept work packets.

It does not create a public submission endpoint.

It does not enable live earning.

It does not perform active review decisions.

It does not approve WC.

It does not perform WC issuance.

It does not create or append a Work Credits ledger line.

It does not allocate or transfer VOID.

It does not handle USDC.

It does not activate USDC autofulfillment.

It does not access wallets or signers.

It does not create a runtime route.

It does not activate a mutation handler.

## Result

The DataNet Work Credits review lane now has a public rollup while all submission, review decision, approval, earning, issuance, ledger, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
