# USDC → VOID Presale Private Allocation Ledger Activation Matrix v1

Marker: `VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_ACTIVATION_MATRIX_V1`

## Purpose

Define the public read-only activation matrix required before the USDC → VOID presale private allocation reservation ledger can ever move from hold to active.

This matrix does not activate the ledger. It does not create a ledger file. It does not enable writes. It does not enable automatic fulfillment. It does not enable wallet fulfillment, buyer execution authority, signer access, treasury transfer authority, public mutation, WC ledger writes, or VOID transfers.

## Current state

- `private_allocation_ledger_activation_matrix_defined`: true
- `private_allocation_ledger_activation_matrix_green`: false
- `private_allocation_ledger_activation_authorized`: false
- `private_allocation_ledger_created`: false
- `private_allocation_ledger_write_enabled`: false
- `private_allocation_ledger_append_only_enforced`: false
- `private_allocation_ledger_hash_chain_enforced`: false
- `allocation_reservation_record_write_enabled`: false
- `automatic_fulfillment_enabled`: false
- `void_transfer_now`: false

## Required green gates before activation

The private allocation ledger may not be created or written until all of these are true in a later explicit activation lane:

1. verified USDC payment detection gate green.
2. duplicate payment guard green.
3. inventory allocation guard green.
4. allocation reservation record gate green.
5. private allocation ledger hold green.
6. private ledger file path selected by operator only.
7. private ledger path no-leak check green.
8. append-only writer implementation proof green.
9. hash-chain verifier proof green.
10. duplicate request ID recheck green.
11. duplicate canonical payment identity recheck green.
12. inventory reservation prewrite recheck green.
13. prewrite backup/snapshot green.
14. explicit operator activation record green.
15. public mutation boundary green.
16. advisory AI no-write boundary green.
17. buyer execution refusal green.

## Activation blockers

Activation remains blocked when any condition is missing:

- payment verifier is definition-only or red.
- duplicate payment guard is definition-only or red.
- inventory allocation guard is definition-only or red.
- allocation reservation record gate is definition-only or red.
- private allocation ledger hold is red or not green.
- private ledger path is public or leaked.
- append-only writer is not proven.
- hash-chain verifier is not proven.
- duplicate request/payment identity recheck is missing.
- inventory prewrite recheck is missing.
- prewrite backup is missing.
- explicit operator activation record is missing.
- public mutation boundary is red.
- advisory AI write boundary is red.
- buyer execution refusal is red.

## Required future activation record fields

A future activation record must include:

- `activation_record_type`
- `activation_record_id`
- `operator_id`
- `activated_at_ms`
- `activated_commit`
- `activated_cross_box_tag`
- `verified_payment_gate_ref`
- `duplicate_payment_guard_ref`
- `inventory_allocation_guard_ref`
- `allocation_reservation_record_ref`
- `private_allocation_ledger_hold_ref`
- `private_ledger_path_ref`
- `path_no_leak_proof_ref`
- `append_only_writer_proof_ref`
- `hash_chain_verifier_proof_ref`
- `duplicate_recheck_proof_ref`
- `inventory_recheck_proof_ref`
- `prewrite_backup_ref`
- `public_mutation_boundary_ref`
- `advisory_ai_no_write_ref`
- `buyer_execution_refusal_ref`
- `activation_record_hash`

## Public route

- `/public-node/usdc-void-buy-pool/private-allocation-ledger-activation-matrix-v1.json`
