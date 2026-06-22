# USDC → VOID Presale Allocation Reservation Record v1

Marker: `VOID_USDC_TO_VOID_PRESALE_ALLOCATION_RESERVATION_RECORD_V1`

## Purpose

Define the append-only allocation reservation record contract required before USDC → VOID presale automatic fulfillment can ever reserve allocation or send VOID.

This gate does not enable automatic fulfillment. It does not enable allocation record writes. It does not enable wallet fulfillment, buyer execution authority, signer access, treasury transfer authority, public mutation, WC ledger writes, or VOID transfers.

## Current state distinction

The current Buy VOID lane already has append-only operator events such as `payment_verified` and manual `fulfilled` status events.

Those events are not a dedicated allocation reservation ledger.

A `payment_verified` operator event is not the same as `allocation_reserved`.

A future automatic fulfillment lane must not infer allocation reservation solely from request ID, tx hash, or payment verification. It must write a separate append-only allocation reservation record after all prerequisite gates pass.

## Required prerequisites

An allocation reservation record may only be written after:

1. verified payment detection gate is green.
2. duplicate payment guard is green.
3. inventory allocation guard is green.
4. remaining presale inventory is greater than or equal to quoted VOID.
5. canonical payment identity has not already reserved allocation.
6. request ID has not already reserved allocation.
7. append-only allocation reservation ledger exists and is private/operator-controlled.
8. previous allocation record hash is carried forward.
9. new allocation record hash is produced.
10. explicit operator activation record exists.

## Required record fields

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

## Required invariants

- one request ID can have at most one allocation reservation record.
- one canonical payment identity can have at most one allocation reservation record.
- reserved total after must be less than or equal to total presale inventory.
- remaining inventory after must be non-negative.
- allocation reservation must happen before fulfillment.
- fulfillment cannot happen without prior allocation reservation.
- record hash chain must be append-only.
- public route may describe the record shape only; it must not expose private buyer/payment/operator material.

## Current authority

- `allocation_reservation_record_defined`: true
- `allocation_reservation_record_green`: false
- `allocation_reservation_record_write_enabled`: false
- `append_only_allocation_reservation_record_enforced`: false
- `current_operator_events_are_not_allocation_reservation_ledger`: true
- `current_payment_verified_event_is_not_allocation_reserved`: true
- `current_inventory_accounting_derived_from_payment_verified_events`: true
- `automatic_fulfillment_enabled`: false
- `wallet_fulfillment_enabled`: false
- `signer_access_enabled`: false
- `treasury_transfer_authority_enabled`: false
- `buyer_execution_authorized`: false
- `public_mutation_enabled`: false
- `wc_ledger_write`: false
- `void_transfer_now`: false

## Public route

- `/public-node/usdc-void-buy-pool/allocation-reservation-record-v1.json`
