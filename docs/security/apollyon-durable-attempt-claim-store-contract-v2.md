# Apollyon durable attempt-claim protected-store contract v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_V2`

Status: **pure source-only requirements contract; no host store, claim writer, or trainer exists here**.

## Purpose

The accepted V2 terminal-receipt gate exposes a source-level evidence shape; this contract validates and content-binds that shape but does not prove its protected source origin. It intentionally leaves protected-runner origin, live host shutdown authority, current-host revalidation, protected claim storage, and durable attempt claim unproven.

Before an Apollyon candidate-training attempt may be claimed, replay state must live outside the mutable authority of both the training identity and the authorization-custody identity. The existing broker execution ledger is not a claim ledger, and the historical V1 authorization-consumption store explicitly does not prove hostile same-UID replay resistance or global single use.

This contract therefore defines the requirements for a future independently protected attempt-claim store without selecting or installing a host UID/GID, service, socket, or pathname.

## Required future ownership boundary

A host-qualified successor must prove:

- a dedicated claim-service identity distinct from training and custody, with a closed supplementary-group set and exactly the reviewed claim-service process admitted under that UID;
- a versioned, fixed claim identity and claim-state root before installation;
- protected root mode `0700` and final immutable claim record mode `0600`;
- a create-once store-generation identity; replacing the same pathname is a new generation and cannot inherit replay authority;
- root-owned/non-writable retained ancestors;
- no non-claim unprivileged identity may write the claim namespace;
- training UID and custody UID cannot write the claim namespace;
- the claim-service identity cannot write training or custody state;
- training and custody cannot control the claim service, and the claim service cannot control training or custody services;
- the reviewed claim service exposes no delete/overwrite API;
- the claim service is AF_UNIX-only and has no external network, private-key, signing, wallet, transaction, or funds authority.

This source contract does not choose the future literal account name, UID/GID, socket path, or state-root path.

## Required future revalidation

Immediately before any durable claim publication, the future host gate/executor must re-establish:

- protected runner origin for the terminal receipt;
- exact current training-service dormancy and absence of the observed training PID/start-ticks generation;
- exact custody state-root, consumed-directory, socket, and service-process identities carried by the terminal receipt;
- exact current V2 custody consumed record;
- exact custody generation;
- request/source/corpus/parent-adapter/operator identities already content-addressed through the accepted chain.

A stale source receipt is never a perpetual host lease.

## Required future publication semantics

The claim store must use a create-only/no-overwrite canonical claim record with:

- exactly one claim per admitted authorization/custody generation;
- `attempt_limit=1`;
- `automatic_retry_authorized=false`;
- final claim record link count 1;
- file fsync after final metadata and before publication;
- parent-directory fsync after publication;
- fail-closed classification of every crash/restart intermediate state;
- duplicate claim rejection;
- durable claim publication completed before any trainer may start.

A successful store write must not itself start training.

## Deliberate non-authority

This contract reports:

```text
terminal_receipt_shape_bound=true
terminal_receipt_source_origin_proven=false
claim_identity_bound=false
claim_root_bound=false
host_installation_performed=false
protected_claim_store_proven=false
protected_runner_origin_proven=false
current_host_revalidation_performed=false
exact_v2_custody_record_revalidation_performed=false
durable_attempt_claim_performed=false
attempt_claim_authorized=false
attempt_claimed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
```

The next gate is `apollyon_durable_attempt_claim_store_host_qualification_v2`. Only after that distinct host boundary is proven may `durable_candidate_training_attempt_claim_executor_v2` be considered.

No filesystem, network, service, key, wallet, signing, transaction, model/trainer, candidate-weight, or funds capability exists in this module.
