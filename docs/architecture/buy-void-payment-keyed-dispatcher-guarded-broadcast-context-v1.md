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
8. Revalidate the exact dispatcher generation/token/worker/expiry against
   database time again after the second preview, and require the final
   request/custody/saga/transaction identity to match the earlier context.
9. Return only sanitized nonsecret admission metadata.

The second lease check is deliberately after the second preview. Expiry,
renewal/reclaim, publication, or identity drift during that preview cannot
produce a `ready` result.

## Returned context

The ready result may expose:

- attempt, worker, lease generation and expiry;
- saga ID/state;
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
final_context_identity_binding_required=true
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
dispatcher_publish=false
runtime_route_mount=false
inventory_mutation=false
public_fulfilled_closeout=false

A later, separately reviewed gate would be required to construct the fixed
runtime dependencies and authorize the guarded-broadcast coordinator's
`apply=true` path. This context grants none of that authority.
