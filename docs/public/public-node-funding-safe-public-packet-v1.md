# Funding Safe Public Packet v1

Marker: `VOID_FUNDING_SAFE_PUBLIC_PACKET_DOC_V1`

## Purpose

Funding Safe Public Packet v1 is a docs/proof-only public reviewer packet for the VOID funding surface.

It intentionally does not add a runtime route.

It summarizes the live funding public surfaces that already exist and were proven separately.

## Current valid funding baseline

- current head after abort recovery seal: `ca3babbe`
- valid live funding runtime lane: Funding Gateway Card v1
- valid dashboard marker: `VOID_FUNDING_GATEWAY_CARD_UI_V1`
- valid funding route marker: `VOID_FUNDING_PATH_TIGHTEN_V1`
- valid triad marker: `VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1`
- valid runtime baseline marker: `VOID_FUNDING_ABORT_RECOVERY_SEAL_RUNTIME_BASELINE_STILL_GREEN`

## Public reviewer links

- `/public-node`
- `/public-node/funding`
- `/buy-void`
- `/funding`
- `/public-node/triad-seal-v1.json`
- `/public-node/route-index.json`

## Funding boundary

The public funding surface is a guarded request and disclosure path.

It is not automatic fulfillment.
It is not a token vending machine.
It is not a payment verification endpoint.
It is not a public wallet-send route.
It is not a treasury control panel.
It is not a yield product.
It is not an investment-return promise.

## Safety assertions

- public_read_only=true
- public_mutation=false
- manual_review_required=true
- automatic_token_delivery=false
- public_fulfillment=false
- wallet_send_now=false
- money_movement_now=false
- investment_return_claim=false
- profit_promise=false
- yield_claim=false
- operator_queue_public=false
- treasury_controls_public=false
- payment_verification_public=false
- wallet_private_key_public=false
- admin_api_public=false

## Why this packet exists

Funding is sensitive. The correct move is to make the public boundary easy to inspect without adding new runtime authority.

This packet preserves the proof trail after the aborted Funding Public Proof Pack v1 runtime patch and provides a safe reviewer-facing explanation using docs/proof only.
