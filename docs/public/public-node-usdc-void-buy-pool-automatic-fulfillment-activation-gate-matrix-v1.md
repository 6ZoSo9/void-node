# USDC → VOID Presale Automatic Fulfillment Activation Gate Matrix v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_V1`

## Purpose

Define the hard activation gate matrix required before USDC → VOID presale automatic fulfillment can be enabled.

## Public route

- `/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-v1.json`

## Boundary

This is a readiness matrix only.

It does not enable automatic fulfillment, wallet fulfillment, buyer execution authority, signer access, treasury transfer authority, public mutation, WC ledger writes, or VOID transfers.

## Rule

Automatic fulfillment may only be enabled after every required activation gate is green and after a separate explicit operator activation record is created.
