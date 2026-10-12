# USDC/VOID automatic payment canary separate terminal closeout — buyer-facing final seal link v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_BUYER_FACING_FINAL_SEAL_LINK_V1`

This public-safe brick links the buyer-facing USDC/VOID buy-pool surface to the sealed reviewer closeout bundle.

## Boundaries

- Public-safe and read-only.
- Buyer-facing discoverability only.
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

## Routes

- Reviewer closeout bundle HTML: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html`
- Reviewer closeout bundle JSON: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json`
- Closeout status HTML: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html`
- Closeout status JSON: `/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json`
- Pool index JSON: `/public-node/usdc-void-buy-pool/index.json`
- Root public-node index JSON: `/public-node/index.json`

## Optional HTML target

`none_detected_json_pool_index_is_canonical`
