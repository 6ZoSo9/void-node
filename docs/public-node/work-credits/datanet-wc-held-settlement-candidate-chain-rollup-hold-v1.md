# DataNet WC Held Settlement Candidate Chain Rollup Hold v1

Marker: `VOID_DATANET_WC_HELD_SETTLEMENT_CANDIDATE_CHAIN_ROLLUP_HOLD_V1`

## What changed

This brick publishes a public rollup for the held DataNet Work Credits settlement candidate chain:

- `/public-node/work-credits/datanet-wc-held-settlement-candidate-chain-rollup-hold-v1.json`

It also indexes the rollup from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has one rollup that ties together the held settlement candidate chain from ledger-write planning through redacted receipt verify-pack planning.

## Work Credits supply policy

Work Credits remain unlimited and uncapped accounting units for useful verifiable work.

The `0` WC and `0` VOID values in this rollup are candidate placeholders only.

They do not declare a Work Credits lifetime supply cap.

## Boundary

This is settlement-candidate-chain-rollup-only.

The candidate WC amount is `0`.

The candidate VOID amount is `0`.

It does not issue WC.

It does not append a ledger line.

It does not allocate VOID.

It does not transfer VOID.

It does not create a transaction.

It does not sign a transaction.

It does not broadcast a transaction.

It does not expose a transaction hash.

It does not create or publish a settlement receipt.

It does not create or publish a verify pack.

It does not access a wallet or signer.

It does not enable a runtime mutation route.

It does not enable a mutation handler.

## Current status

`hold`

## Proof marker

Expected proof result:

`VOID_DATANET_WC_HELD_SETTLEMENT_CANDIDATE_CHAIN_ROLLUP_HOLD_V1_GREEN`
