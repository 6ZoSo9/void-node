# USDC/VOID Buy Pool Automatic Payment Canary Separate Terminal Closeout Public Status Rollup Route v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_ROUTE_V1`

## Purpose

Expose the public-safe canary separate terminal closeout public status rollup as a read-only public-node JSON route.

Route:

`/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json`

## Boundary

This route serves public status only.

This route does not expose private allocation material.
This route does not expose canonical payment identity material.
This route does not expose wallet secrets.
This route does not expose a wallet address.
This route does not expose a private key.
This route does not expose a seed phrase.
This route does not expose operator-only execution material.
This route does not expose private fixture paths.
This route does not expose private proof paths.

This route does not execute fulfillment.
This route does not authorize terminal execution.
This route does not authorize actual execution.
This route does not grant signer access.
This route does not sign.
This route does not transfer VOID.
This route does not broadcast a transaction.
This route does not mark fulfillment complete.
This route does not create a mutation route.
This route does not reopen the terminal lane.

## Status

`canary_separate_terminal_lane_closed_without_execution`

## Public route file

`public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json`
