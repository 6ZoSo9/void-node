# Buy VOID payment-keyed dispatcher renew v1

Status: source-only active-lease renewal composition.

This gate renews an already-valid dispatcher lease only. It does not execute work, preview or apply the payment-keyed runtime, publish a result, sign, broadcast, mutate inventory, close out fulfillment, or move funds.

## Contract

1. The existing durable lease-context function must first validate:
   - preparation custody;
   - request fingerprint identity;
   - current generation;
   - exact capability token;
   - exact worker owner;
   - exact lease expiry; and
   - active database-time validity.
2. Renewal is hard-bound to the qualified dispatcher renew function.
3. The renewal TTL is inherited from the fixed claim policy: 30,000,000 microseconds.
4. The caller cannot supply a TTL.
5. Renewal must preserve attempt ID, worker ID, lease generation, and capability token.
6. The renewed expiry must strictly extend the prior expiry.
7. The renewed capability is returned only to the already-authorized worker.

## Authority

source_only_contract=true
durable_lease_context_required=true
lease_context_function_fixed=true
dispatcher_renew_only=true
dispatcher_renew_function_fixed=true
lease_ttl_policy_inherited_from_claim=true
lease_ttl_us=30000000
caller_lease_ttl_authority=false
lease_generation_preserved=true
lease_capability_preserved=true
worker_identity_preserved=true
lease_capability_returned=true
worker_execution=false
dispatcher_claim=false
dispatcher_publish=false
runtime_preview=false
runtime_apply=false
runtime_route_mount=false
production_connection_factory=false
wallet_access=false
credential_access=false
signing=false
transaction_broadcast=false
inventory_mutation=false
public_fulfilled_closeout=false
money_movement=false

This gate exists before any future stage-apply composition so long-running or queued worker work never needs caller-controlled lease duration or an unfenced authority extension.
