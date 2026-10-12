# Public Node Funding Gateway Card v1

Marker: `VOID_FUNDING_GATEWAY_CARD_DOC_V1`

## Purpose

This document records the Funding Gateway Card v1 public-dashboard exposure.

The card makes the guarded VOID funding path visible from `/public-node`, alongside the existing public proof surfaces. It links to:

- `/public-node/funding`
- `/buy-void`
- `/funding`
- `/public-node/triad-seal-v1.json`

## Boundary

This is a public read-only navigation and disclosure card.

It does not create a payment.
It does not verify payment.
It does not move USDC.
It does not deliver VOID.
It does not expose wallets.
It does not expose operator queues.
It does not expose treasury controls.
It does not create an investment-return, profit, or yield promise.

## Safety assertions

- public_mutation=false
- money_movement_now=false
- wallet_send_now=false
- buy_void_fulfillment_now=false
- automatic_token_delivery=false
- investment_return_claim=false
- yield_claim=false
- operator_review_required=true

## Proof scope

The proof checks that the `/public-node` dashboard contains the Funding Gateway Card marker, links to the guarded funding surfaces, preserves the no-auto-delivery/no-wallet-send/no-money-movement boundary, and does not add a public funding POST mutation route.

