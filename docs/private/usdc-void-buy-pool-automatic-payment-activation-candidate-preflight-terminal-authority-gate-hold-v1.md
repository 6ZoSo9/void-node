# USDC/VOID automatic payment activation candidate preflight terminal authority gate hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_TERMINAL_AUTHORITY_GATE_HOLD_V1`

This private/operator-only brick holds the terminal authority gate closed after authority separation.

This is a terminal authority gate hold, not execution.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-authority-separation-check-v1.json`
Authority separation status: `activation_candidate_preflight_authority_separation_check_ready`

## Terminal authority gate

- gate_exists: true
- gate_state: `held_closed`
- terminal_execute_authorized: false
- reason: preflight authority separation is not terminal execute authorization

## Gate hold checks

- authority_separation_complete_but_not_terminal_authority
- terminal_execute_gate_exists
- terminal_execute_gate_held_closed
- no_terminal_execute_authorization_created
- no_actual_execute_authorization_created
- no_signer_access_created
- no_transfer_or_broadcast_created
- no_fulfilled_state_write_created
- no_public_mutation_route_created

## Boundary

- terminal_authority_gate_hold: true
- authority_separation_check_complete: true
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

Next required gate: `activation_candidate_preflight_actual_execute_gate_hold_v1`
