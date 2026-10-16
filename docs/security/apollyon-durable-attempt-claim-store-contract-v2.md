# Apollyon durable attempt-claim protected-store contract v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_V2`

Status: **pure source-only requirements contract; no host store, claim writer, or trainer exists here**.

## Purpose

The accepted V2 terminal-receipt gate exposes a source-level evidence shape; this contract validates and content-binds that shape but does not prove its protected source origin. It intentionally leaves protected-runner origin, live host shutdown authority, current-host revalidation, protected claim storage, and durable attempt claim unproven.

Before an Apollyon candidate-training attempt may be claimed, replay state must live outside the mutable authority of both the training identity and the authorization-custody identity. The existing broker execution ledger is not a claim ledger, and the historical V1 authorization-consumption store explicitly does not prove hostile same-UID replay resistance or global single use.

This contract therefore defines the requirements for a future independently protected attempt-claim store without selecting or installing a host UID/GID, service, socket, or pathname.

## Required future ownership boundary

A host-qualified successor must prove the static boundary below, and the future executor must re-establish the complete boundary immediately before every claim publication:

- a dedicated claim-service identity distinct from training, custody, the public runtime, and the interactive non-root operator, with a closed supplementary-group set and exactly the reviewed claim-service process admitted under that UID;
- a versioned, fixed claim identity and claim-state root before installation;
- protected root mode `0700` and final immutable claim record mode `0600`;
- a create-once store-generation identity; replacing the same pathname is a new generation, blocks claim publication until separately requalified, cannot reuse an old terminal receipt or authorization/custody generation, and requires fresh Sovereign rebootstrap; migration is allowed only with verified continuity of prior claim history, otherwise replacement is a permanent HOLD;
- root-owned/non-writable retained ancestors;
- no non-claim unprivileged identity may write the claim namespace;
- training UID and custody UID cannot write the claim namespace;
- the claim-service identity cannot write training or custody state;
- training and custody cannot control the claim service, and the claim service cannot control training or custody services;
- the reviewed claim service exposes no delete/overwrite API;
- immediately before publication, revalidate claim-UID process exclusivity, exact service source identity, supplementary groups, effective sandbox/policy, store generation/root identity, write authority, and all service-control denials;
- the claim service is AF_UNIX-only and has no external network, private-key, signing, wallet, transaction, or funds authority;
- a dedicated claim IPC group has an exact reviewed membership set that excludes training, custody, and public-runtime identities;
- every publish request is admitted from kernel peer credentials against the exact reviewed caller UID/GID and caller process generation/source identity; caller-supplied identity is never trusted and root has no implicit bypass;
- unauthorized peers are rejected before request-body reads;
- the only write method is `publish_claim_v2`, with exact request keys `claim_record`, `marker`, `method`, `store_contract_id`, `version`, canonical encoding, no unknown keys, one request per connection, maximum request/response size 65,536 bytes, 5,000 ms request deadline, and at most 16 concurrent connections.

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

- exactly one claim per admitted authorization/custody/store generation;
- the canonical claim record binds the store generation, terminal receipt ID and runner-receipt digest, authorization ID, custody generation and record SHA-256, and the literal identity fields `request_sha256`, `canonical_main`, `canonical_tree`, `corpus_sha256`, `parent_adapter_sha256`, `operator_public_key_raw_sha256`, plus the attempt limit;
- `attempt_limit=1`;
- `automatic_retry_authorized=false`;
- final claim record link count 1;
- file fsync after final metadata and before publication;
- parent-directory fsync after publication;
- fail-closed classification of every crash/restart intermediate state;
- duplicate claim rejection within the current generation **and** cross-generation authorization replay rejection;
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
