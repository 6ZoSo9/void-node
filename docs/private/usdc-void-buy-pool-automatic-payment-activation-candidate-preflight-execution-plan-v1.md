# USDC/VOID automatic payment activation candidate preflight execution plan v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_EXECUTION_PLAN_V1`

This private/operator-only brick defines the activation-candidate preflight execution plan.

This is a plan, not execution.

## Source chain

- activation_candidate_gate: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-gate-v1.json`
- operator_activation_packet: `fixtures/private/usdc-void-buy-pool-automatic-payment-operator-activation-packet-hold-v1.json`
- wallet_policy: `fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-wallet-policy-hold-v1.json`
- signer_authorization_hold: `fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-signer-authorization-live-path-hold-v1.json`
- execution_authorization_hold: `fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-execution-authorization-live-path-hold-v1.json`
- enablement_preflight_closeout: `fixtures/public/usdc-void-buy-pool-automatic-payment-enablement-preflight-closeout-v1.json`

## Required next checks

- verified_payment_input_source
- buyer_identity_binding_source
- duplicate_payment_guard_source
- amount_rate_policy_source
- chain_token_receiver_allowlist_source
- inventory_reserve_behavior
- allocation_ledger_write_behavior
- fulfillment_record_write_behavior
- separate_signer_authorization
- separate_execution_authorization

## Boundary

- activation_candidate_planning: true
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

Next required gate: `activation_candidate_preflight_verification_sources_v1`
