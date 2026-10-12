# USDC/VOID automatic payment live-path public reviewer verify pack dashboard link v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_DASHBOARD_LINK_V1`

This patch adds human-facing links to the sealed automatic-payment live-path public reviewer verify pack.

Public card markers:

- `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_PUBLIC_NODE_CARD_V1`
- `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_BUY_POOL_CARD_V1`

Linked sealed reviewer routes:

- `/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1`
- `/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json`

Boundary: link-only, public, read-only, non-activating. It does not add automatic payment execution, automatic fulfillment, wallet fulfillment, signer access, treasury transfer authority, buyer execution, public mutation, ledger write, or VOID transfer authority.
