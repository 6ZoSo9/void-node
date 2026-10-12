# USDC External Receipt Observation Result Envelope v1

Marker: VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_RESULT_ENVELOPE_V1

Purpose: define a stable read-only result envelope shape for USDC external receipt observation jobs after an observation result is classified, before runtime queue execution, finality verification, real payment verification, private allocation ledger write, inventory reserve, automatic fulfillment, or VOID transfer exists.

Required result envelope fields:

- result_id
- job_id
- source_job_envelope_marker
- source_queue_marker
- chain_id
- tx_hash
- observed_at_utc
- observation_method
- rpc_endpoint_class
- receipt_found
- receipt_status
- block_number
- transfer_log_count
- matching_transfer_log_count
- classification_state
- retry_allowed
- retry_after_seconds
- operator_review_required
- canonical_payment_identity_hint
- authority_flags

Allowed classification_state values:

- observed_receipt_success
- observed_receipt_not_found
- endpoint_blocked_403_no_retry
- rate_limited_429_backoff
- timeout_retry_backoff
- rpc_error_hold
- operator_review_required

Non-activation statement: this schema defines the shape of an observation result only. It does not run a queue, fetch live chain data now, verify finality, trust an external state root, verify a real payment for fulfillment, write the private allocation ledger, reserve inventory, fulfill automatically, expose public mutation, or transfer VOID.
