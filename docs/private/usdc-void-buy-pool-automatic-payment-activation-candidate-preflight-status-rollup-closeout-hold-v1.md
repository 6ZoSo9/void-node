# USDC/VOID automatic payment activation candidate preflight status rollup closeout hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_STATUS_ROLLUP_CLOSEOUT_HOLD_V1`

This private/operator-only brick closes out the activation candidate preflight status rollup only as a held state.

This is a preflight status rollup closeout hold, not activation, not activation release, not execution, and not automatic fulfillment enablement.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-status-rollup-hold-v1.json`
Preflight status rollup status: `activation_candidate_preflight_status_rollup_held`
Preflight complete closeout status: `activation_candidate_preflight_complete_closeout_held`
Preflight complete status: `activation_candidate_preflight_complete_held`
Final seal status: `activation_candidate_preflight_final_seal_held`
Final rollup status: `activation_candidate_preflight_final_rollup_held`
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

## Status rollup closeout hold

- Closeout state: `held_closed`
- Status rollup closeout held: `true`
- Status rollup record written: `false`
- Status rollup closeout record written: `false`
- Preflight complete record written: `false`
- Preflight closeout record written: `false`
- Activation candidate finalized: `false`
- Activation ready: `false`
- Activation released: `false`
- Activation enabled: `false`
- Automatic fulfillment enabled: `false`
- Execution performed: `false`
- Signature created: `false`
- VOID transfer performed: `false`
- Transaction broadcast performed: `false`
- Public mutation performed: `false`

## Rollup closeout

- Held chain count: `20`
- Status rollup closed out as hold: `true`
- All preflight gates held: `true`
- All execution authority false: `true`
- All signing authority false: `true`
- All transfer authority false: `true`
- All public mutation false: `true`
- Activation candidate finalized: `false`
- Activation enabled: `false`
- Execution performed: `false`

## Status rollup closeout chain

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
- `final_seal_hold`
- `preflight_complete_hold`
- `preflight_complete_closeout_hold`
- `preflight_status_rollup_hold`
- `preflight_status_rollup_closeout_hold`

## Boundary

- Preflight status rollup closeout is held closed.
- Status rollup is closed out only as a hold.
- No status rollup record is written.
- No status rollup closeout record is written.
- No preflight complete record is written.
- No preflight closeout record is written.
- All preflight gates remain held.
- Execution authority remains false.
- Signing authority remains false.
- Transfer authority remains false.
- Public mutation remains false.
- Activation candidate is not finalized.
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

Next required gate: `activation_candidate_preflight_final_status_seal_hold_v1`
