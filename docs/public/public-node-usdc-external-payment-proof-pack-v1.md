# USDC External Payment Proof Pack v1

Marker: VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_V1

Purpose: define the proof pack object shape for externally verified USDC-chain payment evidence before any VOID allocation, private ledger write, or fulfillment can occur.

Parent boundary: VOID_USDC_TO_VOID_EXTERNAL_STATE_RELAY_VERIFICATION_BOUNDARY_V1

This is proof-pack shape only.
This does not fetch live chain data.
This does not verify Ethereum or Base finality.
This does not enable external state root trust.
This does not enable automatic fulfillment.
This does not enable wallet fulfillment.
This does not write the private allocation ledger.
This does not reserve inventory.
This does not transfer VOID.

Rejected weak evidence:
pasted_tx_hash
explorer_trust
receiver_balance_delta
manual_vibes

Preferred proof target:
successful finalized USDC Transfer event or future PaymentReceived intake event

Proof pack required fields:
proof_pack_version
source_chain
source_chain_id
source_network_family
block_number
block_hash
block_timestamp
transaction_hash
transaction_index
receipt_index
receipt_status
log_index
token_contract
token_decimals
from_address
to_address
official_receiver_ref
amount_raw
amount_decimal
canonical_payment_identity
payment_event_type
receipt_root_ref
state_root_ref
proof_material_ref
finality_mode
trust_mode
allocation_rule_ref
duplicate_guard_ref
inventory_guard_ref

Canonical payment identity components:
source_chain_id
transaction_hash
log_index
token_contract
to_address
amount_raw

Required verifier expectations:
receipt_status_success
token_contract_allowlisted
to_address_matches_official_receiver
amount_matches_allocation_rule
payment_event_exists
canonical_payment_identity_constructed
canonical_payment_identity_not_previously_used
inventory_available_before_allocation
allocation_record_not_created_by_this_pack
void_not_transferred_by_this_pack

Current authority:
external_payment_proof_pack_defined true
external_payment_proof_pack_green false
external_payment_proof_pack_verifier_enabled false
external_chain_rpc_fetch_enabled false
external_state_root_trust_enabled false
automatic_fulfillment_enabled false
private_allocation_ledger_write_enabled false
void_transfer_now false

Public route: /public-node/usdc-void-buy-pool/external-payment-proof-pack-v1.json
