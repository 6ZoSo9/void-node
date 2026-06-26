# USDC/VOID Buy Pool Automatic Payment Canary Separate Terminal Execute Run Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_EXECUTE_RUN_HOLD_V1`

## Purpose

Define a private/operator-only terminal execute run hold for the canary separate fulfillment lane after the real actual execute packet hold.

This shapes the terminal execute run envelope only. It does not grant signer access, expose wallet material, sign, broadcast, transfer VOID, create a fulfillment record, create an allocation claim, or mark fulfillment complete.

## Boundary

Private/operator-only.

This terminal execute run hold does not execute fulfillment.
This terminal execute run hold does not create a fulfillment record.
This terminal execute run hold does not create an allocation claim.
This terminal execute run hold does not expose wallet secrets.
This terminal execute run hold does not expose a wallet address.
This terminal execute run hold does not expose a private key.
This terminal execute run hold does not expose a seed phrase.
This terminal execute run hold does not grant signer access.
This terminal execute run hold does not sign a wallet transaction.
This terminal execute run hold does not transfer VOID.
This terminal execute run hold does not broadcast a transaction.
This terminal execute run hold does not create a public mutation route.
This terminal execute run hold does not authorize buyer execution.
This terminal execute run hold does not perform money movement.
This terminal execute run hold does not mark fulfilled.

## Allowed states

- `held_pending_terminal_execute_run`
- `terminal_execute_run_envelope_held_pending_terminal_execute_authorization`

## Next lane

Any terminal execute authorization must be separate, explicit, private/operator-only, and separately proven.
