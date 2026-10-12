# USDC/VOID Buy Pool Automatic Payment Canary Separate Terminal Closeout Rollup Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_ROLLUP_HOLD_V1`

## Purpose

Define a private/operator-only terminal closeout rollup hold for the canary separate fulfillment lane.

This rollup binds the terminal execute run closeout hold to the upstream canary separate actual-execute lane and records that the lane is closed without execution.

## Boundary

Private/operator-only.

This rollup hold does not execute fulfillment.
This rollup hold does not create a fulfillment record.
This rollup hold does not create an allocation claim.
This rollup hold does not expose wallet secrets.
This rollup hold does not expose a wallet address.
This rollup hold does not expose a private key.
This rollup hold does not expose a seed phrase.
This rollup hold does not grant signer access.
This rollup hold does not sign a wallet transaction.
This rollup hold does not transfer VOID.
This rollup hold does not broadcast a transaction.
This rollup hold does not create a public mutation route.
This rollup hold does not authorize buyer execution.
This rollup hold does not mark the canary fulfilled.
This rollup hold does not reopen the terminal execute lane.

## Source binding

Source marker:

`VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_EXECUTE_RUN_CLOSEOUT_HOLD_V1`

Source proof:

`ops/private/usdc-void-buy-pool-automatic-payment-canary-separate-terminal-execute-run-closeout-hold-v1-proof.sh`

## Rollup state

The only valid rollup state in this hold is:

`canary_separate_terminal_lane_closed_without_execution`

This is an evidence rollup only.
