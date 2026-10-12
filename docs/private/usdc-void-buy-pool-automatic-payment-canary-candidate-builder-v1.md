# USDC/VOID Buy Pool Automatic Payment Canary Candidate Builder v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_BUILDER_V1`

## Purpose

Create one private operator-only canary candidate builder for the USDC/VOID automatic payment path.

The builder consumes one explicit input JSON and emits one deterministic candidate object.

## Boundary

This is private/operator-only.

It may build one candidate object from explicit input.

It does not write the allocation ledger.
It does not reserve inventory.
It does not execute fulfillment.
It does not sign a wallet transaction.
It does not transfer VOID.
It does not expose secrets.
It does not create a public mutation route.

## Required source

Input must represent a verified native USDC receipt Transfer log candidate with:

- allowed chain_id: 1 or 8453
- transaction_hash
- transfer_log_index
- official native USDC contract
- buyer_key
- void_receive_address
- amount_raw
- confirmations at or above policy
- canonical payment identity: chain_id:transaction_hash:transfer_log_index

## Canary cap

The builder is canary-limited to one candidate object.
