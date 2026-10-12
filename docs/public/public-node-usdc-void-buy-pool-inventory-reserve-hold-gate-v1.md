# USDC/VOID Buy Pool Inventory Reserve Hold Gate v1

Marker: VOID_USDC_VOID_BUY_POOL_INVENTORY_RESERVE_HOLD_GATE_V1

Purpose: define the inventory reservation boundary after a private allocation ledger write shape is ready.

This is a hold gate. It does not reserve inventory now.

Inputs:

- Private allocation ledger write hold gate
- Allocation claim creation hold gate
- Payment eligibility decision gate
- Amount/rate policy gate

Inventory reservation shape:

- inventory_reservation_id: deterministic id from claim id, pool id, and inventory policy version
- claim_id
- ledger_entry_id
- buyer_binding_key
- receiving_void_address
- pool_id
- void_amount
- inventory_policy_version
- available_inventory_before
- reserved_amount
- available_inventory_after
- reservation_state

Hold states:

- inventory_reserve_hold
- blocked_private_ledger_not_written
- blocked_claim_not_created
- blocked_capacity_insufficient
- blocked_duplicate_reservation
- blocked_operator_not_approved
- operator_review_required

Authority:

No inventory is reserved now, no private ledger write occurs now, no automatic fulfillment is enabled, and no VOID transfer occurs.
