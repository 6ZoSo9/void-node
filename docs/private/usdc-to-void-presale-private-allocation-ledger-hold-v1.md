# USDC → VOID Presale Private Allocation Ledger Hold v1

Marker: `VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_HOLD_V1`

## Purpose

Define the private/operator-only allocation reservation ledger hold required before USDC → VOID presale automatic fulfillment can ever write allocation reservations.

This hold does not enable ledger writes. It does not enable automatic fulfillment. It does not enable wallet fulfillment, buyer execution authority, signer access, treasury transfer authority, public mutation, WC ledger writes, or VOID transfers.

## Private ledger intent

The future private ledger is an operator-controlled append-only JSONL ledger for allocation reservation records.

The public route may describe the ledger hold and invariants only. It must not expose private buyer delivery wallets, raw payment receipt material, operator execution material, private ledger path secrets, or private record contents.

## Held private ledger shape

- `ledger_name`: `usdc_to_void_presale_allocation_reservations_v1`
- `ledger_visibility`: `private_operator_only`
- `ledger_file_name`: `allocation-reservations.jsonl`
- `ledger_write_enabled`: false
- `append_only_enforced`: false
- `hash_chain_enforced`: false
- `private_ledger_created`: false
- `private_ledger_write_authorized`: false

## Required line shape

Each future ledger line must contain one complete allocation reservation record with:

- `record_type`
- `record_id`
- `request_id`
- `source_chain`
- `payment_transaction_hash`
- `payment_log_index`
- `canonical_payment_identity`
- `buyer_delivery_wallet`
- `quote_void_amount`
- `quote_usdc_amount`
- `pool_void_total_before`
- `reserved_void_total_before`
- `remaining_void_before`
- `reserved_void_total_after`
- `remaining_void_after`
- `verified_payment_receipt_ref`
- `duplicate_payment_guard_result`
- `inventory_allocation_guard_result`
- `operator_activation_record_ref`
- `created_at_ms`
- `previous_allocation_record_hash`
- `allocation_record_hash`

## Hash-chain rules

- the first line must use a genesis previous hash value.
- every later line must reference the previous line hash.
- every line hash must cover canonical JSON content before hash insertion.
- the chain must fail closed on malformed JSON.
- the chain must fail closed on missing previous hash.
- the chain must fail closed on wrong previous hash.
- the chain must fail closed on duplicate record hash.
- the chain must fail closed on duplicate request ID.
- the chain must fail closed on duplicate canonical payment identity.

## Refusal conditions

A future writer must refuse when:

- verified payment gate is not green.
- duplicate payment guard is not green.
- inventory allocation guard is not green.
- allocation reservation record gate is not green.
- private ledger hold is not green.
- canonical payment identity is missing.
- request ID is missing.
- buyer delivery wallet is missing.
- quoted VOID amount is non-positive.
- remaining inventory before is less than quoted VOID.
- reserved total after exceeds pool total.
- remaining inventory after is negative.
- previous allocation record hash is missing or wrong.
- operator activation record is missing.
- public mutation attempts to write the ledger.
- buyer attempts to write the ledger.
- AI/advisory tooling attempts to write the ledger.

## Current authority

- `private_allocation_ledger_hold_defined`: true
- `private_allocation_ledger_hold_green`: false
- `private_allocation_ledger_created`: false
- `private_allocation_ledger_write_enabled`: false
- `private_allocation_ledger_append_only_enforced`: false
- `private_allocation_ledger_hash_chain_enforced`: false
- `allocation_reservation_record_write_enabled`: false
- `append_only_allocation_reservation_record_enforced`: false
- `automatic_fulfillment_enabled`: false
- `wallet_fulfillment_enabled`: false
- `signer_access_enabled`: false
- `treasury_transfer_authority_enabled`: false
- `buyer_execution_authorized`: false
- `public_mutation_enabled`: false
- `wc_ledger_write`: false
- `void_transfer_now`: false

## Public status route

- `/public-node/usdc-void-buy-pool/private-allocation-ledger-hold-v1.json`
