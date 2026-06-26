# USDC/VOID automatic payment activation candidate preflight public mutation gate hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_PUBLIC_MUTATION_GATE_HOLD_V1`

This private/operator-only brick holds the public mutation gate closed after automatic fulfillment enablement gate hold.

This is a public mutation gate hold, not a runtime route and not public write authorization.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-automatic-fulfillment-enablement-gate-hold-v1.json`
Automatic fulfillment enablement gate status: `activation_candidate_preflight_automatic_fulfillment_enablement_gate_held`
Wallet fulfillment gate status: `activation_candidate_preflight_wallet_fulfillment_gate_held`
Signer access gate status: `activation_candidate_preflight_signer_access_gate_held`
Actual execute gate status: `activation_candidate_preflight_actual_execute_gate_held`
Terminal authority gate status: `activation_candidate_preflight_terminal_authority_gate_held`

## Public mutation gate

- gate_exists: true
- gate_state: `held_closed`
- public_mutation_route_created: false
- public_post_enabled: false
- public_put_enabled: false
- public_patch_enabled: false
- public_delete_enabled: false
- reason: automatic fulfillment enablement gate hold is not public mutation authorization

## Gate hold checks

- automatic_fulfillment_enablement_gate_complete_but_not_public_mutation_authorization
- public_mutation_gate_exists
- public_mutation_gate_held_closed
- no_public_mutation_route_created
- no_public_post_enabled
- no_public_put_enabled
- no_public_patch_enabled
- no_public_delete_enabled
- no_automatic_fulfillment_enabled
- no_wallet_fulfillment_enabled
- no_signer_access_granted
- no_actual_execute_authorized
- no_signing_performed
- no_void_transfer_performed
- no_transaction_broadcast_created
- no_fulfilled_state_write_created

## Boundary

- public_mutation_gate_hold: true
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
- public_mutation_route_created: false
- public_post_enabled: false
- public_put_enabled: false
- public_patch_enabled: false
- public_delete_enabled: false

Next required gate: `activation_candidate_preflight_fulfilled_state_write_gate_hold_v1`
