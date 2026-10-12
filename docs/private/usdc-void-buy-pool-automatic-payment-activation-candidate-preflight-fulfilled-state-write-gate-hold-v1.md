# USDC/VOID automatic payment activation candidate preflight fulfilled state write gate hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_FULFILLED_STATE_WRITE_GATE_HOLD_V1`

This private/operator-only brick holds the fulfilled-state write gate closed after public mutation gate hold.

This is a fulfilled-state write gate hold, not state mutation and not buyer fulfillment.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-public-mutation-gate-hold-v1.json`
Public mutation gate status: `activation_candidate_preflight_public_mutation_gate_held`
Automatic fulfillment enablement gate status: `activation_candidate_preflight_automatic_fulfillment_enablement_gate_held`
Wallet fulfillment gate status: `activation_candidate_preflight_wallet_fulfillment_gate_held`
Signer access gate status: `activation_candidate_preflight_signer_access_gate_held`
Actual execute gate status: `activation_candidate_preflight_actual_execute_gate_held`
Terminal authority gate status: `activation_candidate_preflight_terminal_authority_gate_held`

## Fulfilled-state write gate

- gate_exists: true
- gate_state: `held_closed`
- fulfilled_state_written: false
- allocation_record_marked_fulfilled: false
- buyer_status_marked_fulfilled: false
- receipt_status_marked_fulfilled: false
- reason: public mutation gate hold is not fulfilled-state write authorization

## Gate hold checks

- public_mutation_gate_complete_but_not_fulfilled_state_write_authorization
- fulfilled_state_write_gate_exists
- fulfilled_state_write_gate_held_closed
- no_fulfilled_state_written
- no_allocation_record_marked_fulfilled
- no_buyer_status_marked_fulfilled
- no_receipt_status_marked_fulfilled
- no_public_mutation_route_created
- no_automatic_fulfillment_enabled
- no_wallet_fulfillment_enabled
- no_signer_access_granted
- no_actual_execute_authorized
- no_signing_performed
- no_void_transfer_performed
- no_transaction_broadcast_created

## Boundary

- fulfilled_state_write_gate_hold: true
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
- fulfilled_state_written: false
- allocation_record_marked_fulfilled: false
- buyer_status_marked_fulfilled: false
- receipt_status_marked_fulfilled: false
- public_mutation_route_created: false

Next required gate: `activation_candidate_preflight_transaction_broadcast_gate_hold_v1`
