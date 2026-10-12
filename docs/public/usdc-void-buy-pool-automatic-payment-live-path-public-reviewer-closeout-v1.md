# USDC/VOID automatic payment live-path public reviewer closeout v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_V1`

This is the final public closeout/status endpoint for the automatic-payment public reviewer stack.

It confirms that reviewer verification is discoverable from:

- `/public-node`
- `/public-node/buy-pool/usdc-void-v1`
- `/public-node/route-index.json`
- `/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1`
- `/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json`

Route-index wiring marker:

- `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_ROUTE_INDEX_WIRING_V1`

Boundary: public, read-only, closeout/status only. It does not add automatic payment execution, automatic fulfillment, wallet fulfillment, signer access, treasury transfer authority, buyer execution, public mutation, ledger write, or VOID transfer authority.
