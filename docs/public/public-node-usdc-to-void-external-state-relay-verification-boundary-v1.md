# USDC to VOID External State Relay Verification Boundary v1

Marker: VOID_USDC_TO_VOID_EXTERNAL_STATE_RELAY_VERIFICATION_BOUNDARY_V1

Purpose: define the long-term proof boundary for relaying external USDC-chain payment evidence into VOID without trusting pasted tx hashes, explorer pages, or receiver balance deltas.

This does not enable automatic fulfillment.
This does not enable wallet fulfillment.
This does not enable signer access.
This does not enable treasury transfer authority.
This does not create a private allocation ledger write.
This does not transfer VOID.

Core doctrine:
automatic fulfillment must depend on verified external payment proof
not pasted tx hash
not explorer trust
not receiver balance delta
not manual vibes

Preferred proof target:
successful finalized USDC Transfer event or future PaymentReceived intake event

Non-preferred proof target:
receiver wallet balance increased

Required payment proof fields:
source_chain
source_chain_id
block_number
block_hash
transaction_hash
transaction_index
receipt_index
log_index
token_contract
from_address
to_address
amount
canonical_payment_identity
receipt_root_ref
state_root_ref
proof_material_ref
finality_mode
trust_mode

Allowed trust modes:
operator_attested_root_initial
multi_rpc_quorum_future
ethereum_light_client_future
zk_external_state_proof_future
base_l2_finality_policy_future

Required verifier checks:
transaction_succeeded
token_contract_allowlisted
receiver_matches_official_receiver
amount_matches_quote_or_allocation_rules
transfer_or_payment_event_exists
canonical_payment_identity_unique
payment_not_already_used
inventory_available_before_allocation
allocation_record_created_before_fulfillment

Current state:
external_state_relay_boundary_defined true
external_state_relay_boundary_green false
external_payment_proof_verifier_enabled false
external_state_root_trust_enabled false
automatic_fulfillment_enabled false
wallet_fulfillment_enabled false
buyer_execution_authorized false
public_mutation_enabled false
private_allocation_ledger_write_enabled false
void_transfer_now false

Public route: /public-node/usdc-void-buy-pool/external-state-relay-verification-boundary-v1.json
