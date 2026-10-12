# USDC → VOID Presale Inventory Allocation Guard v1

Marker: `VOID_USDC_TO_VOID_PRESALE_INVENTORY_ALLOCATION_GUARD_V1`

## Purpose

Define the inventory/allocation guard contract required before USDC → VOID presale automatic fulfillment can ever reserve allocation or send VOID.

This gate does not enable automatic fulfillment. It does not enable wallet fulfillment, buyer execution authority, signer access, treasury transfer authority, public mutation, WC ledger writes, or VOID transfers.

## Current state distinction

The current request lane already exposes sale-state accounting and quote/request capacity checks:

- sold-out state exists.
- remaining presale inventory is reported.
- request intake can reject a quote request larger than remaining inventory.
- verified payment events may be counted into reported reserved allocation.

That is not the same as an automatic allocation reservation guard.

A live automatic fulfillment lane must not reserve allocation merely because a payment was detected. It must first prove payment verification, duplicate-payment safety, remaining inventory, and an append-only allocation reservation record.

## Required guard behavior

Before automatic allocation reservation can be considered green, all of the following must be true:

1. payment is verified by the verified-payment detection gate.
2. duplicate-payment guard is green for the canonical payment identity.
3. remaining presale inventory is greater than or equal to the quoted VOID allocation.
4. allocation reservation record is append-only and unique.
5. allocation reservation cannot exceed total presale inventory.
6. concurrent reservation attempts cannot oversell inventory.
7. sold-out closure is triggered when remaining inventory reaches zero.
8. allocation reservation happens before fulfillment.
9. fulfillment cannot happen without allocation reservation.
10. explicit operator activation record exists.

## Inventory effect

- `quote_created`: no inventory effect.
- `payment_pending`: no inventory effect.
- `payment_submitted_unverified`: no inventory effect.
- `submitted_tx_hash`: no inventory effect.
- `payment_verified_without_duplicate_guard`: no automatic allocation reservation.
- `payment_verified_with_duplicate_guard_without_inventory_guard`: no automatic allocation reservation.
- `payment_verified_with_duplicate_and_inventory_guard_green`: allocation may reserve only through an append-only allocation reservation record.
- `allocation_reserved`: may reduce available presale inventory.
- `fulfilled`: requires prior allocation reservation and fulfillment receipt.

## Current authority

- `inventory_allocation_guard_defined`: true
- `inventory_allocation_guard_green`: false
- `atomic_allocation_reservation_enforced`: false
- `current_sale_state_quote_capacity_check_present`: true
- `current_verified_payment_inventory_accounting_present`: true
- `current_request_capacity_check_is_not_atomic_allocation_guard`: true
- `automatic_fulfillment_enabled`: false
- `wallet_fulfillment_enabled`: false
- `signer_access_enabled`: false
- `treasury_transfer_authority_enabled`: false
- `buyer_execution_authorized`: false
- `public_mutation_enabled`: false
- `wc_ledger_write`: false
- `void_transfer_now`: false

## Public route

- `/public-node/usdc-void-buy-pool/inventory-allocation-guard-v1.json`
