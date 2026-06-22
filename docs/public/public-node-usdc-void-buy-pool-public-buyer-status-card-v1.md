# USDC → VOID Presale Public Buyer Status Card v1

Marker: `VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_CARD_V1`

## Purpose

Add a buyer-facing status card directly to the public USDC → VOID presale page.

## Public message

The card makes the boundary visible where buyers and reviewers land:

- presale quote is public-readable,
- operator execution is manual,
- fulfillment is gated and withheld,
- no automatic VOID delivery is promised by the page,
- no public fulfillment endpoint is open,
- no public wallet-send authority is granted,
- and no autonomous write authority is added.

## Route

- `/public-node/buy-pool/usdc-void-v1`

## Boundary

This patch only adds public explanatory copy to an existing read-only public page.

It does not expose private operator packets, buyer payment records, wallet keys, send commands, fulfillment queues, or any mutation path.
