# USDC/VOID Buy Pool Automatic Payment Activation Refusal Guard Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_GUARD_HOLD_V1`

## Purpose

This private operator-only hold records the refusal guard for automatic payment activation.

It follows the sealed activation prerequisite gap matrix:

`VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_PREREQUISITE_GAP_MATRIX_HOLD_V1`

## Rule

Automatic payment activation is refused unless a separate future explicit operator activation artifact exists, is proven, is cross-box green, and is final Precision synced.

The following do not activate automatic payment:

- dry-run decision packet
- dry-run decision result
- dry-run closeout
- non-activation boundary
- prerequisite gap matrix
- public reviewer closeout
- public status card
- preflight closeout
- dual-chain USDC allowlist

## Boundary

This is a refusal guard only.

It does not activate:

- automatic payment execution
- real payment approval
- allocation claim creation
- private allocation ledger write
- inventory reserve/decrement
- automatic fulfillment
- wallet fulfillment
- signer access
- treasury transfer authority
- buyer execution
- public mutation
- VOID transfer
