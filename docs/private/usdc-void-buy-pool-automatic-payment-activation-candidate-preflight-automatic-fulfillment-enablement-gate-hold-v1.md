# USDC/VOID automatic payment activation candidate preflight automatic fulfillment enablement gate hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_AUTOMATIC_FULFILLMENT_ENABLEMENT_GATE_HOLD_V1`

This private/operator-only brick holds the automatic fulfillment enablement gate closed after wallet fulfillment gate hold.

This is an automatic fulfillment enablement gate hold, not execution.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-wallet-fulfillment-gate-hold-v1.json`
Wallet fulfillment gate status: `activation_candidate_preflight_wallet_fulfillment_gate_held`
Signer access gate status: `activation_candidate_preflight_signer_access_gate_held`
Actual execute gate status: `activation_candidate_preflight_actual_execute_gate_held`
Terminal authority gate status: `activation_candidate_preflight_terminal_authority_gate_held`

## Automatic fulfillment enablement gate

- gate_exists: true
- gate_state: `held_closed`
- automatic_fulfillment_enabled: false
- reason: wallet fulfillment gate hold is not automatic fulfillment enablement

## Gate hold checks

- wallet_fulfillment_gate_complete_but_not_automatic_fulfillment_enablement
- automatic_fulfillment_enablement_gate_exists
- automatic_fulfillment_enablement_gate_held_closed
- no_automatic_fulfillment_enabled
- no_wallet_fulfillment_enabled
- no_signer_access_granted
- no_actual_execute_authorized
- no_signing_performed
- no_void_transfer_performed
- no_transaction_broadcast_created
- no_fulfilled_state_write_created
- no_public_mutation_route_created

## Boundary

- automatic_fulfillment_enablement_gate_hold: true
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
- public_mutation_route_created: false

Next required gate: `activation_candidate_preflight_public_mutation_gate_hold_v1`
