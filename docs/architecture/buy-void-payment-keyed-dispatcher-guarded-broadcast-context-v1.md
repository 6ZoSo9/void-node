# Buy VOID dispatcher guarded-broadcast context v1

Status: source-only, non-mutating dispatcher admission context.

This gate prepares the next dispatcher boundary after the already-merged
`preparation_recovery` transition. It does **not** sign or broadcast.

## Sequence

1. Run the fixed dispatcher runtime preview.
2. Require the server-derived stage to be exactly `guarded_broadcast`.
3. Revalidate the exact dispatcher generation/token/worker/expiry against
   database time.
4. Re-bind the payment-keyed full-runtime root to the same durable root.
5. Run the fixed full-runtime dry selector again with `apply=false`.
6. Require the stage to still be `guarded_broadcast`.
7. Require the inner result to be the fixed guarded-broadcast coordinator
   `dry_run` decision and its action to remain
   `execute_prepared_transaction`. An inner
   `reconcile_possible_broadcast` result means durable state advanced after
   the outer stage snapshot and therefore holds instead of returning a stale
   guarded-broadcast context.
8. Enter the canonical per-job dispatcher admission section. Validate the
   exact dispatcher generation/token/worker/expiry against database time and
   capture the exact saga head (event count plus last event ID).
9. While that admission remains held, run one final fixed full-runtime dry
   selector with `apply=false`, revalidate the lease against database time,
   and reread the saga head.
10. Require the saga head to be unchanged across the final preview, require
    the final stage/action/state and all returned identities to match the
    earlier preview, then perform one last database-time lease check after
    all final identity reads. Return the saga-head token for mandatory
    revalidation by a future execution gate.
11. Return only sanitized nonsecret admission metadata.

The final database-time check is deliberately after the final preview.
Expiry, renewal/reclaim, publication, or dispatcher-job drift during that
preview cannot produce a `ready` result. The saga-head bracket separately
detects a durable saga append even when it lands after the final inner
preview. A later append cannot turn this source-only context into execution
authority: a future execution gate must revalidate the returned event count
and last event ID before it can act.

## Returned context

The ready result may expose:

- attempt, worker, lease generation and expiry;
- saga ID/state;
- saga event count and last event ID for future execution revalidation;
- an explicit `saga_head_revalidation_required=true` and
  `execution_authorized=false`;
- next action;
- whether a definitive-not-submitted retry is being prepared;
- whether reconciliation is required;
- whether durable broadcast evidence already exists;
- policy/request/custody fingerprints;
- the already-public signed transaction hash;
- server-selected confirmation strings.

It never returns:

- dispatcher lease token;
- raw signed transaction bytes;
- credential path/content;
- signer or broadcaster objects;
- submission-guard object;
- provider submission ID.

For this outer `guarded_broadcast` stage, `next_action` is exactly
`execute_prepared_transaction` and `reconciliation_required` is false. A
reconciliation action belongs to a fresh `broadcast_reconciliation` stage
selection, not to this context.

## Authority

source_only_contract=true
durable_lease_context_required=true
dispatcher_runtime_preview_required=true
lease_revalidation_required=true
final_lease_revalidation_required=true
final_database_time_after_identity_reads_required=true
final_stage_revalidation_required=true
final_context_identity_binding_required=true
final_saga_head_binding_required=true
final_saga_head_returned_for_execution_revalidation=true
dispatcher_admission_held_through_final_preview=true
final_full_runtime_preview_function_fixed=true
full_runtime_apply=false
server_derived_stage_required=guarded_broadcast
guarded_stage_action_required=execute_prepared_transaction
guarded_stage_reconciliation_action_forbidden=true
dependency_bootstrap=false
credential_read=false
rpc_call=false
submission_guard_claim=false
signer_access=false
signing=false
broadcast_call=false
transaction_broadcast=false
money_movement=false
existing_evidence_sanitized=true
lease_capability_returned=false
raw_signed_transaction_returned=false
provider_submission_id_returned=false
worker_execution=false
ready_is_execution_authority=false
execution_authorized=false
dispatcher_publish=false
runtime_route_mount=false
inventory_mutation=false
public_fulfilled_closeout=false

A later, separately reviewed gate would be required to construct the fixed
runtime dependencies and authorize the guarded-broadcast coordinator's
`apply=true` path. This context grants none of that authority.
