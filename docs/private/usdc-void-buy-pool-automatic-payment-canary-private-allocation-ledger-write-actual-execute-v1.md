# USDC/VOID Buy Pool Automatic Payment Canary Private Allocation Ledger Write Actual Execute v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1`

## Purpose

Append one private/operator-only USDC/VOID automatic payment canary allocation record to the private allocation ledger.

This is the narrow private ledger write step after:

- actual inventory reserve
- allocation record creation
- private allocation ledger write preflight
- private allocation ledger write packet hold
- operator approval for separate private allocation ledger write execute

## Boundary

Private/operator-only.

This step may append exactly one JSONL record to the private allocation ledger.

This step does not execute fulfillment.
This step does not sign a wallet transaction.
This step does not transfer VOID.
This step does not expose private ledger contents publicly.
This step does not create a public mutation route.
This step does not authorize buyer execution.

## Ledger rules

- append-only JSONL
- create ledger file if missing
- backup ledger before append
- refuse duplicate `allocation_record_id`
- refuse duplicate `packet_id`
- refuse duplicate `canonical_payment_identity`
- first record uses genesis previous hash
- later records reference previous allocation record hash
- record hash covers canonical JSON before hash insertion
- post-write proof must find exactly one matching record

## Actual write unlock

Actual write requires explicit private terminal environment unlock:

`VOID_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE=1`

Proofs must use a temporary ledger path unless intentionally executing the real private write.
