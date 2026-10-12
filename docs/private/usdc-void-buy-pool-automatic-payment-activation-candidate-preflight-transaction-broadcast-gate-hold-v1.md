# USDC/VOID automatic payment activation candidate preflight transaction broadcast gate hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_TRANSACTION_BROADCAST_GATE_HOLD_V1`

This private/operator-only brick holds the transaction broadcast gate closed after fulfilled-state write gate hold.

This is a transaction broadcast gate hold, not network broadcast and not transaction submission.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-fulfilled-state-write-gate-hold-v1.json`
Fulfilled-state write gate status: `activation_candidate_preflight_fulfilled_state_write_gate_held`
Public mutation gate status: `activation_candidate_preflight_public_mutation_gate_held`
Automatic fulfillment enablement gate status: `activation_candidate_preflight_automatic_fulfillment_enablement_gate_held`
Wallet fulfillment gate status: `activation_candidate_preflight_wallet_fulfillment_gate_held`
Signer access gate status: `activation_candidate_preflight_signer_access_gate_held`
Actual execute gate status: `activation_candidate_preflight_actual_execute_gate_held`
Terminal authority gate status: `activation_candidate_preflight_terminal_authority_gate_held`

## Transaction broadcast gate

- gate_exists: true
- gate_state: `held_closed`
- transaction_broadcast: false
- broadcast_payload_created: false
- rpc_send_enabled: false
- tx_hash_created: false
- reason: fulfilled-state write gate hold is not transaction broadcast authorization

## Gate hold checks

- fulfilled_state_write_gate_complete_but_not_transaction_broadcast_authorization
- transaction_broadcast_gate_exists
- transaction_broadcast_gate_held_closed
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
- no_signing_performed
- no_void_transfer_performed

## Boundary

- transaction_broadcast_gate_hold: true
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
- void_transfer_performed: false
- transaction_broadcast: false
- broadcast_payload_created: false
- rpc_send_enabled: false
- tx_hash_created: false
- fulfilled_state_written: false
- public_mutation_route_created: false

Next required gate: `activation_candidate_preflight_void_transfer_gate_hold_v1`
