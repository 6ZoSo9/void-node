# USDC/VOID Buy Pool Private Allocation Ledger Write Hold Gate v1

Marker: VOID_USDC_VOID_BUY_POOL_PRIVATE_ALLOCATION_LEDGER_WRITE_HOLD_GATE_V1

Purpose: define the private allocation ledger write boundary after allocation claim shape is ready.

This is a hold gate. It does not write the private allocation ledger now.

Inputs:

- Allocation claim creation hold gate
- Payment eligibility decision gate
- Duplicate payment guard gate
- Buyer identity binding gate

Ledger write shape:

- ledger_entry_id: deterministic id from claim id and ledger policy version
- claim_id
- buyer_binding_key
- receiving_void_address
- chain_id
- tx_hash
- transfer_log_index
- token_address
- receiver_address
- usdc_amount_micro
- void_amount
- rate_policy_version
- ledger_policy_version
- previous_ledger_entry_hash
- entry_hash
- write_state

Hold states:

- private_allocation_ledger_write_hold
- blocked_claim_not_created
- blocked_claim_creation_hold
- blocked_duplicate_claim
- blocked_inventory_not_reserved
- blocked_operator_not_approved
- operator_review_required

Authority:

No private ledger write occurs, no inventory is reserved, no automatic fulfillment is enabled, and no VOID transfer occurs.
