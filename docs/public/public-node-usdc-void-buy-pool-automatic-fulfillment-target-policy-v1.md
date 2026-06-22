# USDC → VOID Buy Pool Automatic Fulfillment Target Policy v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_TARGET_POLICY_V1`

## Purpose

Define the intended end-state for the USDC → VOID buy pool.

The target product behavior is automatic fulfillment after verified USDC payment, with no normal per-buyer manual approval, and automatic sold-out closure when pool inventory reaches zero.

## Public route

- `/public-node/usdc-void-buy-pool/automatic-fulfillment-target-policy-v1.json`

## Target behavior

- Buyer submits a buy request.
- Buyer pays USDC to the configured funding/receiving path.
- System verifies payment confirmation.
- System validates buyer address.
- System reserves VOID inventory.
- System fulfills VOID automatically.
- System writes a public fulfillment receipt.
- Pool closes automatically when remaining inventory reaches zero.

## Current boundary

This policy is target-state only.

It does not activate automatic fulfillment, wallet fulfillment, buyer execution authority, signer access, treasury transfer authority, ledger writes, VOID transfers, or public mutation authority.

Manual review remains allowed only for exception handling, disputes, failed verification, duplicate payment, refund review, or operator incident response.
