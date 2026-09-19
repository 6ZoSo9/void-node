# Buy VOID payment-keyed dispatcher lease context v1

Status: source-only lease-bound prepared-custody reconstruction.

This gate consumes a dispatcher lease capability only to prove that it is still the current active lease and to reconstruct a nonsecret execution context from durable preparation custody.

It does not execute work, renew the lease, publish a result, sign, expose raw signed transaction bytes, broadcast, or move funds.

## Validation order

1. require an absolute non-root custody root;
2. validate dispatcher lease marker, attempt, generation, 128-bit capability, worker identity, and expiry shape;
3. read validated durable preparation custody through the fixed production reader;
4. inside the qualified dispatcher store transaction, read database time and the canonical job;
5. require custody and dispatcher request fingerprints to match;
6. require the job to be unpublished;
7. require exact generation, capability, owner, and expiry equality;
8. require the lease to be active according to database time;
9. return only nonsecret bindings/hashes.

The lease token is never returned by this context API.

## Authority boundary

source_only_contract=true
custody_reader_fixed=true
dispatcher_read_only_preflight=true
database_time_required=true
exact_lease_generation_required=true
exact_lease_capability_required_for_validation=true
exact_worker_identity_required=true
exact_lease_expiry_required=true
lease_capability_returned=false
raw_signed_transaction_returned=false
worker_execution=false
dispatcher_claim=false
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

After this reconstruction gate is accepted, a later worker-execution gate may use the validated context plus the still-secret lease capability. Any signing or broadcast must remain a separate explicit authority transition and must revalidate the lease immediately before that transition.
