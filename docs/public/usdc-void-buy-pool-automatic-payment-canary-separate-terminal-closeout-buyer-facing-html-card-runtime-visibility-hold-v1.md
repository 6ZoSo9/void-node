# USDC/VOID automatic payment canary separate terminal closeout — buyer-facing HTML card runtime visibility hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_BUYER_FACING_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1`

This brick adds a browser-visible, buyer-safe, read-only evidence card for the sealed canary separate terminal closeout.

## Browser route

- Buyer-facing evidence card HTML: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-buyer-facing-final-seal-link-v1.html`

## Evidence routes

- Reviewer closeout bundle HTML: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html`
- Reviewer closeout bundle JSON: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json`
- Public status rollup HTML: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html`
- Public status rollup JSON: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json`
- Pool index JSON: `/public-node/usdc-void-buy-pool/index.json`
- Root public-node index JSON: `/public-node/index.json`

## Boundary

- Public-safe and read-only.
- Buyer-facing visibility only.
- Runtime observation is not required; if local runtime is not observed, the static HTML file remains canonical.
- No public mutation route.
- No terminal execute authorization.
- No actual execute authorization.
- No signer access.
- No execution.
- No signing.
- No VOID transfer.
- No transaction broadcast.
- No fulfilled state write.
- No terminal lane reopen.
