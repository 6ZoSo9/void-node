# USDC/VOID Buy Pool Automatic Payment Canary Candidate Intake v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_INTAKE_V1`

## Purpose

Define and expose the public-safe runtime shape for the first automatic payment canary candidate intake path.

This is the first candidate intake layer after private canary activation and public canary runtime config.

## Runtime routes

- `/public-node/usdc-void-buy-pool/automatic-payment-canary/candidate-intake-v1`
- `/public-node/usdc-void-buy-pool/automatic-payment-canary/candidate-intake-v1.json`

## Candidate source

Candidate intake is allowed only from a verified native USDC receipt and ERC-20 Transfer log that passes the sealed gates.

The canary may create at most one candidate object before operator review.

## Boundary

This route is public-safe and status/config only.

It does not expose private ledger paths, signer material, wallet material, treasury secrets, or private operator execution material.

It does not create a wallet signature, VOID transfer, public mutation, buyer execution, or public ledger write.
