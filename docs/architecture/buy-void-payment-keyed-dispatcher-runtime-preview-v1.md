# Buy VOID payment-keyed dispatcher runtime preview v1

Status: source-only active-lease runtime dry-preview composition.

This gate connects an already validated dispatcher lease to the existing payment-keyed full-runtime dry-run selector. It does not apply a runtime stage.

## Required bindings

The preview path:

1. validates the lease with the fixed dispatcher lease-context function;
2. reads the exact execution-attempt journal through the fixed production reader;
3. requires an already prepared attempt;
4. requires prepared transaction hash, delivery address, amount, and attempt ID to match durable preparation custody;
5. requires the payment-keyed full-runtime root to equal the same durable root used for lease/custody validation;
6. calls the fixed full-runtime function with apply=false and no caller-supplied runtime options;
7. rejects a preparation stage because dispatcher admission begins only after durable preparation custody exists;
8. requires the dry preview to remain bound to the exact attempt and saga;
9. rejects any preview that reports filesystem/runtime mutation, signing, transaction broadcast, inventory mutation, public fulfilled closeout, automatic retry, or money movement; and
10. returns only a bounded sanitized preview. The lease token and raw signed transaction are never returned.

## Authority boundary

source_only_contract=true
lease_context_function_fixed=true
execution_attempt_reader_fixed=true
full_runtime_root_binding_required=true
full_runtime_preview_function_fixed=true
full_runtime_apply=false
caller_runtime_options_authority=false
prepared_attempt_required=true
prepared_attempt_custody_binding_required=true
prepared_stage_regression_forbidden=true
runtime_preview_sanitized=true
lease_capability_returned=false
raw_signed_transaction_returned=false
worker_runtime_preview=true
worker_execution=false
dispatcher_claim=false
dispatcher_renew=false
dispatcher_publish=false
runtime_route_mount=false
wallet_access=false
credential_access=false
signing=false
transaction_broadcast=false
inventory_mutation=false
public_fulfilled_closeout=false
money_movement=false

## Why this gate is separate

The existing payment-keyed full runtime can eventually apply preparation, guarded broadcast, reconciliation, receipt, and closeout stages. This composition deliberately consumes only its dry-run path.

A later dispatcher gate may authorize one bounded stage transition while the active lease remains current. That future gate must revalidate the lease immediately before any authority transition and preserve the existing write-ahead broadcast and reconciliation rules. This preview gate grants none of that authority.
