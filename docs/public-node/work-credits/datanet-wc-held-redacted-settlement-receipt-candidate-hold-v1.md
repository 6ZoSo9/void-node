# DataNet WC Held Redacted Settlement Receipt Candidate Hold v1

Marker: `VOID_DATANET_WC_HELD_REDACTED_SETTLEMENT_RECEIPT_CANDIDATE_HOLD_V1`

## What changed

This brick publishes a public candidate shape for a future redacted DataNet Work Credits settlement receipt:

- `/public-node/work-credits/datanet-wc-held-redacted-settlement-receipt-candidate-hold-v1.json`

It also indexes the candidate from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has a candidate redacted settlement receipt shape for future review planning.

This follows the held transfer execution-result candidate and defines what a future public settlement receipt could look like if later authorized.

## Boundary

This is redacted-settlement-receipt-candidate-only.

The candidate WC amount is `0`.

The candidate VOID amount is `0`.

It does not create a settlement receipt.

It does not publish a settlement receipt.

It does not create a worker receipt.

It does not create a public receipt.

It does not append a ledger line.

It does not expose a transaction hash.

It does not perform a VOID transfer.

It does not access a wallet or signer.

It does not enable a runtime mutation route.

It does not enable a mutation handler.

## Current status

`hold`

## Proof marker

Expected proof result:

`VOID_DATANET_WC_HELD_REDACTED_SETTLEMENT_RECEIPT_CANDIDATE_HOLD_V1_GREEN`
