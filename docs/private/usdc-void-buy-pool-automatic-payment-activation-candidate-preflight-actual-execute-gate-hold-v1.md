# USDC/VOID automatic payment activation candidate preflight actual execute gate hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_ACTUAL_EXECUTE_GATE_HOLD_V1`

This private/operator-only brick holds the actual execute gate closed after terminal authority gate hold.

This is an actual execute gate hold, not execution.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-terminal-authority-gate-hold-v1.json`
Terminal authority gate status: `activation_candidate_preflight_terminal_authority_gate_held`

## Actual execute gate

- gate_exists: true
- gate_state: `held_closed`
- actual_execute_authorized: false
- reason: terminal authority gate hold is not actual execute authorization

## Gate hold checks

- terminal_authority_gate_complete_but_not_actual_execute_authority
- actual_execute_gate_exists
- actual_execute_gate_held_closed
- no_actual_execute_authorization_created
- no_execution_performed
- no_signing_performed
- no_void_transfer_performed
- no_transaction_broadcast_created
- no_fulfilled_state_write_created
- no_public_mutation_route_created

## Boundary

- actual_execute_gate_hold: true
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
- public_mutation_route_created: false

Next required gate: `activation_candidate_preflight_signer_access_gate_hold_v1`
