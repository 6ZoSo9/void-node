# USDC External Receipt Observation Job Envelope Schema v1

Marker: VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1

Purpose: define a stable read-only job envelope schema for USDC external receipt observation queue jobs before runtime queue execution, finality verification, real payment verification, private allocation ledger write, inventory reserve, automatic fulfillment, or VOID transfer exists.

Required envelope fields:

- job_id
- queue_marker
- chain_id
- tx_hash
- rpc_endpoint_class
- created_at_utc
- requested_observation_method
- current_queue_state
- classification_state
- retry_allowed
- retry_after_seconds
- operator_review_required
- canonical_payment_identity_hint
- authority_flags

Allowed rpc_endpoint_class values:

- free_public_base_rpc
- operator_configured_rpc
- unavailable
- endpoint_blocked

Allowed classification_state values:

- queued_observation
- observed_receipt_success
- observed_receipt_not_found
- endpoint_blocked_403_no_retry
- rate_limited_429_backoff
- timeout_retry_backoff
- rpc_error_hold
- operator_review_required

Non-activation statement: this schema defines the shape of an observation job only. It does not run a queue, fetch live chain data, verify finality, trust an external state root, verify a real payment for fulfillment, write the private allocation ledger, reserve inventory, fulfill automatically, expose public mutation, or transfer VOID.
