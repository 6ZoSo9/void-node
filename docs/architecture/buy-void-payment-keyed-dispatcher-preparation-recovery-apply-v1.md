# Buy VOID dispatcher preparation-recovery apply v1

Status: source-only bounded worker execution gate.

This is the first dispatcher composition permitted to mutate durable Buy VOID runtime state. Its scope is intentionally restricted to recovery of an already-prepared transaction whose saga is still at \`attempt_reserved\`.

It does **not** create a fresh prepared transaction, access a signer, bootstrap RPC/signing dependencies, broadcast, publish the dispatcher result, mutate inventory, close out fulfillment, or move funds.

## Required sequence

1. Run the fixed lease-bound dispatcher runtime preview.
2. Require the server-derived stage to be exactly \`preparation_recovery\`.
3. Revalidate the exact dispatcher generation/token/worker/expiry against database time before policy and dry selection.
4. Require both existing full-runtime server switches:
   - \`VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=1\`
   - \`VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=1\`
5. Re-read the execution attempt and require durable \`prepared\` state.
6. Re-run the fixed full-runtime dry selector after lease revalidation and require it still selects \`preparation_recovery\`.
7. Consume only the exact inner recovery confirmations/fingerprints from that dry selector.
8. Enter the dispatcher's per-attempt serializable decision while holding its session advisory admission lock.
9. Revalidate the exact job, request fingerprint, generation, token, worker and expiry against database time at admission.
10. Call the fixed preparation coordinator directly, not generic full-runtime apply, and supply only the fixed internal pre-append fence.
11. After durable recovery reconstruction and immediately before the saga append, re-read database time and the locked dispatcher job. Require the same lease to remain current and unexpired.
12. Keep dispatcher admission held until the coordinator returns, so claim, reclaim, renew and publish cannot cross the append linearization point.

The direct coordinator call is deliberate. A generic \`apply:true\` call would re-select whatever stage is current at apply time; if another actor advanced the saga between preview and apply, that could accidentally authorize a later stage such as guarded broadcast. This gate cannot do that.

## Recovery authority

The preparation coordinator's durable-prepared recovery branch executes before its fresh-preparation signer requirement. It must reconstruct an existing nonce plan, preparation custody, prepared execution attempt, inventory reservation and saga binding. It may only append or confirm the deterministic \`transaction_prepared\` saga event.

A pre-existing \`transaction_prepared\` event is duplicate-safe and returns no mutation.

The final database-time check is the mutation linearization point. The lease must be valid at that check, and the dispatcher's per-attempt advisory admission remains held across the following saga append. If the lease expires during earlier reconstruction, the coordinator returns held and the saga remains at \`attempt_reserved\`. If the filesystem append succeeds but the surrounding serializable database transaction later retries or fails, the append is still idempotent: the next recovery observes and validates the existing \`transaction_prepared\` event rather than appending a second transition.

## Authority

source_only_contract=true
durable_lease_context_required=true
runtime_preview_required=true
lease_revalidation_immediately_before_apply_required=true
lease_fence_database_time_at_mutation_cut_required=true
dispatcher_admission_held_through_saga_append_required=true
lease_reclaim_excluded_during_saga_append=true
full_runtime_enabled_required=true
full_runtime_apply_enabled_required=true
server_derived_stage_required=preparation_recovery
generic_full_runtime_apply_forbidden=true
preparation_coordinator_function_fixed=true
caller_stage_authority=false
caller_policy_authority=false
caller_dependencies_authority=false
fresh_preparation_forbidden=true
signer_dependency_forbidden=true
rpc_dependency_bootstrap_forbidden=true
worker_execution_bounded=true
worker_execution_scope=preparation_recovery_only
dispatcher_renew=false
dispatcher_publish=false
lease_capability_returned=false
raw_signed_transaction_returned=false
runtime_route_mount=false
wallet_access=false
credential_access=false
signing=false
transaction_broadcast=false
inventory_mutation=false
public_fulfilled_closeout=false
money_movement=false
