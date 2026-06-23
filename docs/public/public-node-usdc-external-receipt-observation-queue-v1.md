# USDC External Receipt Observation Queue v1

Marker: VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1

Purpose: define a read-only external USDC receipt observation queue for classifying live RPC receipt-read outcomes before any finality verification, real payment verification, allocation ledger write, inventory reserve, automatic fulfillment, or VOID transfer exists.

Queue states:

- queued_observation
- observed_receipt_success
- observed_receipt_not_found
- endpoint_blocked_403_no_retry
- rate_limited_429_backoff
- timeout_retry_backoff
- rpc_error_hold
- operator_review_required

Classification rules:

- HTTP 200 with receipt result present -> observed_receipt_success
- HTTP 200 with null receipt result -> observed_receipt_not_found
- HTTP 403 -> endpoint_blocked_403_no_retry
- HTTP 429 -> rate_limited_429_backoff
- timeout transport error -> timeout_retry_backoff
- JSON-RPC error object -> rpc_error_hold
- malformed or ambiguous result -> operator_review_required

Non-activation statement: this queue defines observation classification only. It does not verify finality, trust an external state root, verify a real payment for fulfillment, write the private allocation ledger, reserve inventory, fulfill automatically, expose a public mutation route, or transfer VOID.

Public route target: /public-node/usdc-void-buy-pool/external-receipt-observation-queue-v1.json
Classifier path: ops/mainnet0/usdc-external-receipt-observation-queue-v1.py
Fixture path: fixtures/public/usdc-external-receipt-observation-queue-v1.json
