# USDC/VOID automatic payment activation candidate preflight signing gate hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_SIGNING_GATE_HOLD_V1`

This private/operator-only brick holds the signing gate closed after VOID transfer gate hold.

This is a signing gate hold, not signature creation and not private key access.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-void-transfer-gate-hold-v1.json`
VOID transfer gate status: `activation_candidate_preflight_void_transfer_gate_held`
Transaction broadcast gate status: `activation_candidate_preflight_transaction_broadcast_gate_held`
Fulfilled-state write gate status: `activation_candidate_preflight_fulfilled_state_write_gate_held`
Public mutation gate status: `activation_candidate_preflight_public_mutation_gate_held`
Automatic fulfillment enablement gate status: `activation_candidate_preflight_automatic_fulfillment_enablement_gate_held`
Wallet fulfillment gate status: `activation_candidate_preflight_wallet_fulfillment_gate_held`
Signer access gate status: `activation_candidate_preflight_signer_access_gate_held`
Actual execute gate status: `activation_candidate_preflight_actual_execute_gate_held`
Terminal authority gate status: `activation_candidate_preflight_terminal_authority_gate_held`

## Signing gate

- gate_exists: true
- gate_state: `held_closed`
- signing_performed: false
- signature_created: false
- signing_payload_created: false
- private_key_accessed: false
- reason: VOID transfer gate hold is not signing authorization

## Gate hold checks

- void_transfer_gate_complete_but_not_signing_authorization
- signing_gate_exists
- signing_gate_held_closed
- no_signing_performed
- no_signature_created
- no_signing_payload_created
- no_private_key_accessed
- no_void_transfer_performed
- no_void_debit_created
- no_void_credit_created
- no_transfer_instruction_materialized
- no_transaction_broadcast
- no_broadcast_payload_created
- no_rpc_send_enabled
- no_tx_hash_created
- no_fulfilled_state_written
- no_public_mutation_route_created
- no_automatic_fulfillment_enabled
- no_wallet_fulfillment_enabled
- no_signer_access_granted
- no_actual_execute_authorized

## Boundary

- signing_gate_hold: true
- void_transfer_gate_hold_complete: true
- transaction_broadcast_gate_hold_complete: true
- fulfilled_state_write_gate_hold_complete: true
- public_mutation_gate_hold_complete: true
- automatic_fulfillment_enablement_gate_hold_complete: true
- wallet_fulfillment_gate_hold_complete: true
- signer_access_gate_hold_complete: true
- actual_execute_gate_hold_complete: true
- terminal_authority_gate_hold_complete: true
- execution_plan_only: true
- automatic_fulfillment_enabled: false
- wallet_fulfillment_enabled: false
- signer_access_granted: false
- terminal_execute_authorized: false
- actual_execute_authorized: false
- execution_performed: false
- signing_performed: false
- signature_created: false
- signing_payload_created: false
- private_key_accessed: false
- void_transfer_performed: false
- void_debit_created: false
- void_credit_created: false
- transfer_instruction_materialized: false
- transaction_broadcast: false
- broadcast_payload_created: false
- rpc_send_enabled: false
- tx_hash_created: false
- fulfilled_state_written: false
- public_mutation_route_created: false

Next required gate: `activation_candidate_preflight_execution_performed_gate_hold_v1`
