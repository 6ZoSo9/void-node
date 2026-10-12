# USDC/VOID Buy Pool Automatic Payment Canary Separate Terminal Execute Run Closeout Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_EXECUTE_RUN_CLOSEOUT_HOLD_V1`

## Purpose

Define a private/operator-only closeout hold for the canary separate terminal execute run lane.

This closes the terminal execute run envelope without execution.

## Boundary

Private/operator-only.

This closeout hold does not execute fulfillment.
This closeout hold does not create a fulfillment record.
This closeout hold does not create an allocation claim.
This closeout hold does not expose wallet secrets.
This closeout hold does not expose a wallet address.
This closeout hold does not expose a private key.
This closeout hold does not expose a seed phrase.
This closeout hold does not grant signer access.
This closeout hold does not sign a wallet transaction.
This closeout hold does not transfer VOID.
This closeout hold does not broadcast a transaction.
This closeout hold does not create a public mutation route.
This closeout hold does not authorize buyer execution.
This closeout hold does not mark the canary fulfilled.

## Source binding

Source marker:

`VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_EXECUTE_RUN_HOLD_V1`

Source proof:

`ops/private/usdc-void-buy-pool-automatic-payment-canary-separate-terminal-execute-run-hold-v1-proof.sh`

## Closeout state

The only valid closeout state in this hold is:

`terminal_execute_run_closed_without_execution`

Any future attempt to resume the lane must use a new proofed authorization boundary. This closeout hold itself does not authorize that future boundary.
