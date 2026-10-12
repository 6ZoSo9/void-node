# USDC/VOID Buy Pool Automatic Payment Canary Allocation Record Creation Gate v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_RECORD_CREATION_GATE_V1`

## Purpose

Create the private operator-only allocation record creation gate for the first USDC/VOID automatic payment canary.

This gate consumes the actual inventory reserve execute result after the reserve has been completed and emits one deterministic private allocation record object.

## Required upstream state

The upstream inventory reserve actual execute output must be:

- `execute.state`: `inventory_reserved_and_decremented`
- `result.actual_execute_result_status`: `inventory_reserved_pending_allocation_record_gate`
- `result.inventory_reserved`: `true`
- `result.allocation_record_created`: `false`
- `result.private_allocation_ledger_written`: `false`

## Boundary

This is private/operator-only.

This gate may emit one allocation record object from an already-reserved canary inventory result.

It does not append the private allocation ledger.
It does not execute fulfillment.
It does not create a wallet signature.
It does not transfer VOID.
It does not expose wallet, treasury, signer, or operator execution material.
It does not create a public mutation route.

## Canary cap

Only one allocation record object may be created for the canary before operator review.
