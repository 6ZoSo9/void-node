# USDC/VOID automatic payment activation candidate preflight signer access gate hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_SIGNER_ACCESS_GATE_HOLD_V1`

This private/operator-only brick holds the signer access gate closed after actual execute gate hold.

This is a signer access gate hold, not execution.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-actual-execute-gate-hold-v1.json`
Actual execute gate status: `activation_candidate_preflight_actual_execute_gate_held`
Terminal authority gate status: `activation_candidate_preflight_terminal_authority_gate_held`
Authority separation source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-authority-separation-check-v1.json`
Signer authorization source: `fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-signer-authorization-live-path-hold-v1.json`

## Signer access gate

- gate_exists: true
- gate_state: `held_closed`
- signer_access_granted: false
- reason: actual execute gate hold is not signer access authorization

## Gate hold checks

- actual_execute_gate_complete_but_not_signer_access
- signer_access_gate_exists
- signer_access_gate_held_closed
- signer_authorization_source_exists_but_does_not_grant_access
- no_signer_access_granted
- no_signing_performed
- no_void_transfer_performed
- no_transaction_broadcast_created
- no_fulfilled_state_write_created
- no_public_mutation_route_created

## Boundary

- signer_access_gate_hold: true
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
- public_mutation_route_created: false

Next required gate: `activation_candidate_preflight_wallet_fulfillment_gate_hold_v1`
