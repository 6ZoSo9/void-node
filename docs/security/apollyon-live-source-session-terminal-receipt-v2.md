# Apollyon live source/session terminal receipt v2

Marker: VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_V2

Status: pure source-only finalizer. It performs no host observation, filesystem mutation, service action, durable claim, training, signing, transaction, or funds movement.

## Purpose

The current V2 live source/session runner creates its inner live binding while the inert training-isolation process generation is still alive. The runner only proves exact shutdown afterward, before it emits its terminal success receipt.

Therefore the inner live binding alone is not sufficient authority for a durable candidate-training attempt claim.

This contract accepts only the exact terminal runner receipt from the reviewed #3217 generation. It requires:

- runner status live_source_session_binding_complete_training_service_stopped;
- the enclosed live binding to be an exact valid current V2 binding;
- the top-level training PID and process start-time ticks to exactly equal the enclosed binding generation;
- training_service_enabled=false;
- training_service_active_after=false;
- training_service_exact_dormant_after=true;
- training_generation_absent_after=true;
- durable attempt claim, training execution, candidate-weight mutation, custody-service action, and funds movement all false.

The contract rejects the earlier pending-stop runner shape and rejects an inner binding presented without the terminal wrapper.

## Output boundary

A successful result reports:

terminal_shutdown_proven=true
training_service_exact_dormant_after=true
training_generation_absent_after=true
inner_live_binding_alone_sufficient_for_executor=false
current_host_revalidation_required=true
protected_runner_origin_required=true
protected_runner_origin_proven=false
live_host_observation_performed=false
durable_attempt_claim_performed=false
attempt_claim_authorized=false
attempt_claimed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false

The next source gate remains durable_candidate_training_attempt_claim_executor_v2.

## Current-host requirement

This source finalizer qualifies the exact terminal receipt shape; it does not itself observe Xiphos or authenticate the caller as the protected installed runner. Accordingly protected_runner_origin_required remains true while protected_runner_origin_proven remains false. The terminal receipt is also not a perpetual host lease. A future durable executor must obtain the receipt through the reviewed protected-runner boundary and revalidate the required current host state immediately before its durable mutation and must fail closed if a new training generation or non-dormant unit state is present.

No future executor may treat the enclosed inner live binding, by itself, as sufficient authority.

## Authority

This module imports no filesystem, network, child-process, service, key, wallet, signing, transaction, trainer, or funds capability. It only validates immutable input objects and returns a content-addressed source-only receipt.
