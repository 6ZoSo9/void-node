# USDC/VOID Buy Pool Automatic Payment Activation Refusal Public Disclosure Boundary Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_PUBLIC_DISCLOSURE_BOUNDARY_HOLD_V1`

## Purpose

This private operator-only hold defines the public disclosure boundary for a future public-safe activation refusal status surface.

It follows the sealed private terminal rollup:

`VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_TERMINAL_ROLLUP_HOLD_V1`

## Disclosure rule

A future public status surface may disclose only that automatic payment activation remains refused and all authority remains false.

It must not disclose:

- private operator markers
- private fixture contents
- private paths
- buyer-specific records
- tx hashes
- ledger paths
- signer or wallet material
- activation commands
- allocation records
- execution commands

## Boundary

This hold does not create a public route.

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
