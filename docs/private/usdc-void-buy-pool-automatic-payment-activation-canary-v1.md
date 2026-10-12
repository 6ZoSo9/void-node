# USDC/VOID Buy Pool Automatic Payment Activation Canary v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANARY_V1`

## Purpose

Enable a tiny private operator-controlled automatic payment canary for the USDC/VOID buy pool.

This does not rewrite prior public refusal artifacts. Those remain historical safety evidence.

## Canary boundary

Automatic payment activation is enabled only as a capped private canary.

The canary may process at most one eligible payment candidate before the operator reviews the result.

## Required gates

- dual-chain native USDC allowlist must remain green
- finality confirmations gate must remain green
- transfer log parser must remain green
- duplicate payment guard must remain green
- buyer identity binding must remain green
- amount/rate policy must remain green
- payment eligibility decision must remain green
- allocation claim creation must remain private/operator-controlled
- private allocation ledger write must remain private/operator-controlled
- no public mutation route may execute payment, allocation, ledger, wallet, or transfer authority

## Authority

Private canary activation: true.

Public mutation authority: false.
Public buyer execution authority: false.
Private key or signer material exposed: false.
Treasury or wallet secret exposed: false.
