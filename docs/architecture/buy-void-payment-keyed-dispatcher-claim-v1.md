# Buy VOID payment-keyed dispatcher claim v1

Status: source-only claim admission stacked after prepared-attempt enqueue.

This gate claims an already-enqueued dispatcher job and returns the bounded lease capability. It does not execute work, renew a lease, publish a result, sign, broadcast, mount a runtime route, or move funds.

## Identity preflight

The claim path uses the fixed durable preparation custody reader. Before claim it reads the dispatcher job inside the qualified store transaction and requires the immutable dispatcher request fingerprint to equal the durable custody request fingerprint.

A missing job, malformed job, missing custody, invalid custody, or fingerprint mismatch is held before lease issuance.

## Lease policy

- fixed TTL: 30,000,000 microseconds (30 seconds)
- caller TTL authority: false
- token factory: fixed
- token entropy source: crypto.randomBytes(16)
- token encoding: 32 lowercase hexadecimal characters
- worker identity: required and bound by the dispatcher claim contract

## Authority boundary

source_only_contract=true
custody_reader_fixed=true
dispatcher_job_identity_preflight_required=true
dispatcher_claim_only=true
dispatcher_claim_function_fixed=true
lease_ttl_policy_fixed=true
caller_lease_ttl_authority=false
lease_token_factory_fixed=true
lease_token_random_bytes=16
worker_execution=false
dispatcher_renew=false
dispatcher_publish=false
runtime_route_mount=false
production_connection_factory=false
wallet_access=false
credential_access=false
signing=false
transaction_broadcast=false
money_movement=false

## Next gate

After claim-only admission is accepted, the next gate may reconstruct the prepared custody under the claimed lease and prove worker execution boundaries. Signing or broadcast must remain a separate explicitly reviewed authority transition.
