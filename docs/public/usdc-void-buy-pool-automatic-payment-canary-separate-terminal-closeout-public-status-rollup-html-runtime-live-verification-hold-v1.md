# USDC/VOID Buy Pool Automatic Payment Canary Separate Terminal Closeout Public Status Rollup HTML Runtime Live Verification Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_HTML_RUNTIME_LIVE_VERIFICATION_HOLD_V1`

## Purpose

Define a read-only runtime live verification hold for the browser-readable public HTML status page.

HTML route:

`/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html`

JSON route:

`/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json`

This hold verifies whether the running node serves the public HTML status page.

## Boundary

This is observation-only.

This hold does not create a mutation route.
This hold does not execute fulfillment.
This hold does not authorize terminal execution.
This hold does not authorize actual execution.
This hold does not grant signer access.
This hold does not sign.
This hold does not transfer VOID.
This hold does not broadcast a transaction.
This hold does not mark fulfillment complete.
This hold does not reopen the terminal lane.

## Runtime check

The proof may check localhost runtime if available.

If the node is not running locally, the proof reports runtime unavailable without failing the sealed static HTML proof.
