# USDC/VOID automatic payment activation candidate preflight operator final approval gate hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_OPERATOR_FINAL_APPROVAL_GATE_HOLD_V1`

This private/operator-only brick holds the operator final approval gate closed after execution-performed gate hold.

This is an operator final approval gate hold, not activation approval and not activation enablement.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-execution-performed-gate-hold-v1.json`
Execution-performed gate status: `activation_candidate_preflight_execution_performed_gate_held`
Signing gate status: `activation_candidate_preflight_signing_gate_held`
VOID transfer gate status: `activation_candidate_preflight_void_transfer_gate_held`
Transaction broadcast gate status: `activation_candidate_preflight_transaction_broadcast_gate_held`
Fulfilled-state write gate status: `activation_candidate_preflight_fulfilled_state_write_gate_held`
Public mutation gate status: `activation_candidate_preflight_public_mutation_gate_held`
Automatic fulfillment enablement gate status: `activation_candidate_preflight_automatic_fulfillment_enablement_gate_held`
Wallet fulfillment gate status: `activation_candidate_preflight_wallet_fulfillment_gate_held`
Signer access gate status: `activation_candidate_preflight_signer_access_gate_held`
Actual execute gate status: `activation_candidate_preflight_actual_execute_gate_held`
Terminal authority gate status: `activation_candidate_preflight_terminal_authority_gate_held`

## Operator final approval gate

- gate_exists: true
- gate_state: `held_closed`
- operator_final_approval_granted: false
- activation_approved: false
- activation_enabled: false
- activation_candidate_released: false
- reason: execution-performed gate hold is not operator final approval

## Gate hold checks

- execution_performed_gate_complete_but_not_operator_final_approval
- operator_final_approval_gate_exists
- operator_final_approval_gate_held_closed
- no_operator_final_approval_granted
- no_activation_approved
- no_activation_enabled
- no_activation_candidate_released
- no_execution_performed
- no_operator_execution_performed
- no_automatic_execution_performed
- no_runtime_execution_performed
- no_signing_performed
- no_signature_created
- no_private_key_accessed
- no_void_transfer_performed
- no_transaction_broadcast
- no_fulfilled_state_written
- no_public_mutation_route_created
- no_automatic_fulfillment_enabled
- no_wallet_fulfillment_enabled
- no_signer_access_granted
- no_actual_execute_authorized

## Boundary

- operator_final_approval_gate_hold: true
- execution_performed_gate_hold_complete: true
- signing_gate_hold_complete: true
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
- operator_final_approval_granted: false
- activation_approved: false
- activation_enabled: false
- activation_candidate_released: false
- automatic_fulfillment_enabled: false
- wallet_fulfillment_enabled: false
- signer_access_granted: false
- terminal_execute_authorized: false
- actual_execute_authorized: false
- execution_performed: false
- operator_execution_performed: false
- automatic_execution_performed: false
- runtime_execution_performed: false
- signing_performed: false
- signature_created: false
- private_key_accessed: false
- void_transfer_performed: false
- transaction_broadcast: false
- fulfilled_state_written: false
- public_mutation_route_created: false

Next required gate: `activation_candidate_preflight_activation_release_gate_hold_v1`
