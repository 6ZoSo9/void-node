# USDC/VOID Buy Pool Automatic Payment Canary Private Allocation Ledger Write Operator Approval v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_APPROVAL_V1`

## Purpose

Add a private operator approval gate after the private allocation ledger write packet hold.

This gate approves, holds, or rejects one held private allocation ledger write packet before any actual private allocation ledger append or mutation.

## Required upstream state

The upstream packet hold output must include:

- `private_allocation_ledger_write_packet_hold.state`: `held_pending_separate_operator_private_allocation_ledger_write_review`
- `packet.packet_status`: `held_pending_separate_operator_private_allocation_ledger_write_review`
- `authority.packet_created`: `true`
- `authority.private_allocation_ledger_write_now`: `false`
- `authority.private_allocation_ledger_mutation`: `false`
- `authority.fulfillment_execution`: `false`
- `authority.wallet_signing`: `false`
- `authority.void_transfer`: `false`
- `authority.public_mutation`: `false`

## Boundary

Private/operator-only.

This gate may approve one held private allocation ledger write packet for a future separate private ledger write execute step.

This gate does not append the private allocation ledger.
This gate does not mutate any ledger file.
This gate does not execute fulfillment.
This gate does not sign a wallet transaction.
This gate does not transfer VOID.
This gate does not expose private ledger path, signer material, wallet material, treasury material, or operator execution material.
This gate does not create a public mutation route.

## Allowed operator decisions

- approve_for_separate_private_allocation_ledger_write_execute
- hold_for_operator_review
- reject_private_allocation_ledger_write_packet
