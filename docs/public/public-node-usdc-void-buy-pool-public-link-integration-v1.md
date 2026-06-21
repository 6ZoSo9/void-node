# VOID USDC/VOID Buy Pool Public Link Integration v1

Marker: `VOID_USDC_VOID_BUY_POOL_PUBLIC_LINK_INTEGRATION_V1`

This is a public discoverability patch for the already-added fixed-price USDC → VOID buy pool public page.

It adds visible links to:

- `/public-node`
- `/public-node/money-engine-v1`
- `/buy-void`
- `/public-node/funding`

The linked destination is:

- `/public-node/buy-pool/usdc-void-v1`
- `/public-node/buy-pool/usdc-void-v1.json`

Safety boundary:

- No new public mutation route.
- No wallet send route.
- No automatic fulfillment.
- No silent credit mutation.
- No route-count increase; this patch links existing GET-only routes.
- Existing buy-pool page remains the canonical public proof surface for the fixed-price 10,000,000 VOID pool at $0.50 USDC per VOID.
- Self-custody-only and no-exchange-send messaging remains on the buy-pool page.
