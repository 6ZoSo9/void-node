# USDC/VOID automatic payment canary separate terminal closeout — public buyer evidence index v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_BUYER_EVIDENCE_INDEX_V1`

This public-safe brick gives buyers and reviewers one small index for the sealed canary separate terminal closeout evidence.

## Purpose

- Link the buyer-facing closeout evidence card.
- Link the reviewer closeout bundle.
- Link the public closeout status rollup.
- Keep the surface read-only and buyer-safe.

## Routes

- Buyer evidence index HTML: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1.html`
- Buyer evidence index JSON: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1.json`
- Buyer-facing closeout evidence HTML: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-buyer-facing-final-seal-link-v1.html`
- Reviewer closeout bundle HTML: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html`
- Reviewer closeout bundle JSON: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json`
- Public status rollup HTML: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html`
- Public status rollup JSON: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json`
- Pool index JSON: `/public-node/usdc-void-buy-pool/index.json`
- Root public-node index JSON: `/public-node/index.json`

## Boundary

- Public-safe and read-only.
- Buyer-facing discoverability only.
- Runtime observation is not required; static files remain canonical.
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
