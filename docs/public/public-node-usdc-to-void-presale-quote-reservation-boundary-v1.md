# USDC → VOID Presale Quote Reservation Boundary v1

Marker: `VOID_USDC_TO_VOID_PRESALE_QUOTE_RESERVATION_BOUNDARY_V1`

## Purpose

Seal the public wording and accounting boundary for the USDC → VOID presale before automatic fulfillment work continues.

This is a buy-only presale boundary. It is not a liquidity pool, swap route, exchange route, VOID-to-USDC route, redemption route, or sell route.

## Hard rules

- `quote_created` does not reserve VOID inventory.
- `payment_pending` does not reserve VOID inventory.
- `payment_submitted_unverified` does not reserve VOID inventory.
- A submitted transaction hash is evidence for review only.
- `payment_verified` is required before `allocation_reserved`.
- `allocation_reserved` is the first state that may reduce available presale inventory.
- Automatic fulfillment must remain disabled unless a verified payment receipt, duplicate guard, inventory guard, and explicit activation record are all green.
- Public wording must say presale, quote, buy request, pending payment, verified payment, and allocation.
- Public wording must not imply an unpaid buyer can reserve VOID.

## Public route

- `/public-node/usdc-void-buy-pool/presale-quote-reservation-boundary-v1.json`

The route path keeps the historical `usdc-void-buy-pool` namespace for compatibility, but the public meaning is presale inventory/accounting only.
