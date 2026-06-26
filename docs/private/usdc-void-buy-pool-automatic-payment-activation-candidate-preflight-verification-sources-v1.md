# USDC/VOID automatic payment activation candidate preflight verification sources v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_VERIFICATION_SOURCES_V1`

This private/operator-only brick binds the activation candidate preflight plan to exact verification sources.

This is source binding, not execution.

## Source chain

- preflight_execution_plan: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-execution-plan-v1.json`
- payment_verification_work_item: `fixtures/private/usdc-void-buy-pool-buyer-packet-payment-verification-work-item-hold-v1.json`
- payment_verification_queue: `fixtures/private/usdc-void-buy-pool-buyer-packet-payment-verification-queue-hold-v1.json`
- buyer_identity_binding: `fixtures/private/usdc-void-buy-pool-buyer-packet-buyer-identity-binding-check-result-hold-v1.json`
- duplicate_payment_guard: `fixtures/private/usdc-void-buy-pool-buyer-packet-duplicate-payment-guard-check-result-hold-v1.json`
- amount_rate_policy: `fixtures/private/usdc-void-buy-pool-buyer-packet-amount-rate-policy-check-result-hold-v1.json`
- chain_token_receiver_allowlist: `fixtures/private/usdc-void-buy-pool-buyer-packet-chain-token-receiver-allowlist-check-result-hold-v1.json`
- inventory_reserve_behavior: `fixtures/private/usdc-void-buy-pool-automatic-payment-inventory-reserve-decrement-live-path-hold-v1.json`
- allocation_ledger_write_behavior: `fixtures/private/usdc-void-buy-pool-automatic-payment-canary-private-allocation-ledger-write-post-write-closeout-v1.json`
- fulfillment_record_write_behavior: `fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-record-creation-live-path-hold-v1.json`
- separate_signer_authorization: `fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-signer-authorization-live-path-hold-v1.json`
- separate_execution_authorization: `fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-execution-authorization-live-path-hold-v1.json`

## Boundary

- verification_source_binding: true
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

Next required gate: `activation_candidate_preflight_source_consistency_check_v1`
