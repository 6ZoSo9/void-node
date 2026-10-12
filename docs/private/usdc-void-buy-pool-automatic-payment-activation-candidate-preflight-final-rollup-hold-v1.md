# USDC/VOID automatic payment activation candidate preflight final rollup hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_FINAL_ROLLUP_HOLD_V1`

This private/operator-only brick rolls up the activation candidate preflight chain as held closed.

This is a final rollup hold, not activation release, not activation enablement, and not automatic fulfillment enablement.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-activation-release-closeout-hold-v1.json`
Activation release closeout status: `activation_candidate_preflight_activation_release_closeout_held`
Activation release gate status: `activation_candidate_preflight_activation_release_gate_held`
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

## Final rollup

- Rollup state: `held_closed`
- Preflight chain complete as hold: `true`
- Activation ready: `false`
- Activation released: `false`
- Activation enabled: `false`
- Automatic fulfillment enabled: `false`
- Operator final approval granted: `false`
- Execution performed: `false`
- Closeout record written: `false`
- Public activation visible: `false`

## Held chain

- `terminal_authority_gate_hold`
- `actual_execute_gate_hold`
- `signer_access_gate_hold`
- `wallet_fulfillment_gate_hold`
- `automatic_fulfillment_enablement_gate_hold`
- `public_mutation_gate_hold`
- `fulfilled_state_write_gate_hold`
- `transaction_broadcast_gate_hold`
- `void_transfer_gate_hold`
- `signing_gate_hold`
- `execution_performed_gate_hold`
- `operator_final_approval_gate_hold`
- `activation_release_gate_hold`
- `activation_release_closeout_hold`
- `final_rollup_hold`

## Boundary

- Final rollup is held closed.
- The preflight chain is complete only as a hold chain.
- Activation is not ready.
- Activation is not released.
- Activation is not enabled.
- No activation release is granted.
- No activation release is closed out.
- No activation candidate is released.
- No activation approval occurs.
- No runtime activation is enabled.
- No public activation is visible.
- No release result or closeout record is written.
- No automatic fulfillment is enabled.
- No wallet fulfillment is enabled.
- No signer access is granted.
- No terminal execute is authorized.
- No actual execute is authorized.
- No execution is performed.
- No signing, signature, signing payload, private key access, VOID transfer, transaction broadcast, fulfilled-state write, or public mutation occurs.

Next required gate: `activation_candidate_preflight_final_seal_hold_v1`
