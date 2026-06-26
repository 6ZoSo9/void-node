# USDC/VOID automatic payment activation candidate preflight authority separation check v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_AUTHORITY_SEPARATION_CHECK_V1`

This private/operator-only brick checks that signer authorization and execution authorization remain separate from source consistency.

This is an authority-separation check, not execution.

Source fixture: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-source-consistency-check-v1.json`
Source consistency status: `activation_candidate_preflight_source_consistency_check_ready`

Signer authorization source: `fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-signer-authorization-live-path-hold-v1.json`
Execution authorization source: `fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-execution-authorization-live-path-hold-v1.json`

## Separation checks

- source_consistency_is_not_signer_authorization
- source_consistency_is_not_execution_authorization
- signer_authorization_source_exists_but_does_not_grant_access
- execution_authorization_source_exists_but_does_not_authorize_execute
- signing_and_broadcast_remain_false
- fulfilled_state_write_remains_false
- public_mutation_remains_false

## Boundary

- authority_separation_check: true
- source_consistency_check_complete: true
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

Next required gate: `activation_candidate_preflight_terminal_authority_gate_hold_v1`
