# USDC/VOID Buy Pool Automatic Payment Canary Separate Terminal Closeout Public Node Reviewer Closeout Index Runtime Live Verification Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_NODE_REVIEWER_CLOSEOUT_INDEX_RUNTIME_LIVE_VERIFICATION_HOLD_V1`

## Purpose

Define an optional read-only runtime live verification hold for root public-node reviewer closeout discovery.

Root index route:

`/public-node/index.json`

Primary reviewer route:

`/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html`

JSON reviewer bundle:

`/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json`

## Boundary

This hold is observation-only.

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

If the node is not running locally, the proof reports runtime unavailable without failing the sealed static root-index proof.
