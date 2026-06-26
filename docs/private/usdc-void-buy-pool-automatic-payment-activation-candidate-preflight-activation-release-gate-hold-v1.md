# USDC/VOID automatic payment activation candidate preflight activation release gate hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_ACTIVATION_RELEASE_GATE_HOLD_V1`

This private/operator-only brick holds the activation release gate closed after operator final approval gate hold.

This is an activation release gate hold, not activation release, not activation enablement, and not automatic fulfillment enablement.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-operator-final-approval-gate-hold-v1.json`
Operator final approval gate status: `activation_candidate_preflight_operator_final_approval_gate_held`
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

## Activation release gate

- Gate state: `held_closed`
- Activation release granted: `false`
- Activation candidate released: `false`
- Activation enabled: `false`
- Automatic fulfillment enabled: `false`
- Runtime activation enabled: `false`
- Public activation visible: `false`
- Release result written: `false`

## Boundary

- No activation release is granted.
- No activation candidate is released.
- No activation enablement occurs.
- No runtime activation is enabled.
- No public activation is visible.
- No release result is written.
- No automatic fulfillment is enabled.
- No wallet fulfillment is enabled.
- No signer access is granted.
- No terminal execute is authorized.
- No actual execute is authorized.
- No execution is performed.
- No signing, signature, signing payload, private key access, VOID transfer, transaction broadcast, fulfilled-state write, or public mutation occurs.

Next required gate: `activation_candidate_preflight_activation_release_closeout_hold_v1`
