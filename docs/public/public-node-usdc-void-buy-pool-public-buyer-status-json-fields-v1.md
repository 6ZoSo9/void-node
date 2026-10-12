# USDC → VOID Presale Public Buyer Status JSON Fields v1

Marker: `VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1`

## Purpose

Mirror the buyer-facing HTML safety card into the public presale JSON route.

## Route

- `/public-node/buy-pool/usdc-void-v1.json`

## Machine-readable boundary

The JSON should expose public-safe status fields showing:

- presale quote is public-readable,
- operator execution remains manual,
- fulfillment remains gated and withheld,
- automatic VOID delivery is false,
- public fulfillment endpoint is false,
- public wallet-send authority is false,
- autonomous write authority is false,
- private operator packet material is not exposed,
- private buyer payment records are not exposed,
- wallet keys are not exposed,
- send commands are not exposed.

## Boundary

This patch only adds public-safe machine-readable status fields.

It does not create a fulfillment endpoint, expose private records, trigger transfer, open wallet-send authority, or grant autonomous write authority.
