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
- the selected claim UID and GID are both non-root numeric identities and the claim UID/GID are separately distinct from the selected training, custody, public-runtime, and interactive-operator UID/GID values;
- the claim service runs with `NoNewPrivileges=true` and exact empty Linux inheritable, permitted, effective, bounding, and ambient capability sets; UID 0/GID 0 and capability-bearing identities are never qualifying claim-service shapes;
- a versioned, fixed claim identity and claim-state root before installation;
- protected root mode `0700` and final immutable claim record mode `0600`;
- a create-once store-generation identity; replacing the same pathname is a new generation, blocks claim publication until separately requalified, cannot reuse an old terminal receipt or authorization/custody generation, and requires fresh Sovereign rebootstrap; migration is allowed only with verified continuity of prior claim history, otherwise replacement is a permanent HOLD;
- root-owned/non-writable retained ancestors;
- no non-claim unprivileged identity may write the claim namespace;
- training UID and custody UID cannot write the claim namespace;
- the claim-service identity cannot write training or custody state;
- training and custody cannot control the claim service, and the claim service cannot control training or custody services;
- the reviewed claim service exposes no delete/overwrite API;
- immediately before publication, revalidate claim-UID process exclusivity, exact service source identity, selected numeric UID/GID separation, supplementary groups, `NoNewPrivileges`, all five empty capability sets, effective sandbox/policy, store generation/root identity, write authority, and all service-control denials;
- the claim service is AF_UNIX-only and has no external network, private-key, signing, wallet, transaction, or funds authority;
- a dedicated claim IPC group has an exact reviewed membership set that excludes training, custody, and public-runtime identities;
- every publish request is admitted from kernel peer credentials against the exact reviewed caller UID/GID and caller process generation/source identity; caller-supplied identity is never trusted and root has no implicit bypass;
- unauthorized peers are rejected before request-body reads;
- the only write method is `publish_claim_v2`, with exact request keys `claim_record`, `marker`, `method`, `store_contract_id`, `version`, canonical encoding, no unknown keys, one request per connection, maximum request/response size 65,536 bytes, 5,000 ms request deadline, and at most 16 concurrent connections.

This source contract does not choose the future literal account name, UID/GID, socket path, or state-root path. It does define a pure least-authority classifier for a later chosen numeric identity/policy: claim UID/GID must be non-root and collision-free against the four protected identities, `NoNewPrivileges` must be true, and every Linux capability mask must be exactly zero. Hosted proof rejects root, collision, and capability-bearing fixtures without observing or changing Xiphos.

## Exact durable record and response schemas

The protected store may persist only one exact canonical claim-record shape. The record key set is closed to:

- marker, version and fixed status;
- content-addressed claim-record ID;
- store-contract and store-generation IDs;
- terminal-receipt ID and exact terminal runner-receipt SHA-256;
- authorization ID, custody generation and custody-record SHA-256;
- request/source/tree/corpus/parent-adapter/operator-key identities;
- attempt_limit=1;
- automatic_retry_authorized=false.

Unknown record keys are rejected. In particular, a canonical record may not add an authority-looking field such as training_execution_authorized, automatic_retry_authorized=true, or a future policy flag. The claim-record ID is derived from the exact canonical record material.

The future service response is also a closed protocol. The exact success schema binds the store contract/generation, terminal receipt, authorization/custody generation, content-addressed claim record, canonical claim-record SHA-256, and SHA-256 of the exact canonical publish request. Success is one of two explicit outcomes only: newly created durable record or recovered existing exact durable record. A different pre-existing record is duplicate rejection.

A success acknowledgment is forbidden until all of the following have completed successfully:

1. final claim metadata/bytes are fixed;
2. claim file fsync completes;
3. create-only publication completes;
4. claim-directory fsync completes;
5. the final visible record metadata and bytes are revalidated.

An indeterminate file/directory durability outcome is never success. Failure responses use a separate exact key schema and classify rejected, duplicate, or indeterminate outcomes. The future training caller may accept only the exact durable-success response; socket close, generic truthiness, or a generic ok token is never training admission.

## Least-authority claim publisher

The AF_UNIX publisher/client is a distinct protected identity, not the interactive operator, claim service, training identity, custody identity, or public runtime. The selected publisher UID/GID must be non-root, have the complete supplementary-group vector exactly equal to the reviewed claim IPC group and no other group, NoNewPrivileges, and empty inheritable/permitted/effective/bounding/ambient capabilities.

The publisher must have no direct write/rename/unlink authority over the claim root, no control over claim/training/custody services, no private-key/wallet/signing authority, and exactly the reviewed process/source generation. Its loader/runtime environment must be explicitly clean of the reviewed dangerous set `GCONV_PATH LD_AUDIT LD_LIBRARY_PATH LD_PRELOAD NODE_OPTIONS NODE_PATH OPENSSL_CONF`; a dirty or unproven environment is a HOLD. Any privileged read-only host/session revalidation is a separate evidence-producing gate; its receipt may be handed to the non-root publisher, but root itself is not the publisher.

## Exact claim-service sandbox and AF_UNIX server authentication

The future claim service must be qualified against an exact loaded systemd policy, not a generic sandbox boolean. Required policy includes:

- exact FragmentPath, no drop-ins, NeedDaemonReload=no and complete reviewed Exec arrays;
- exact claim User/Group and claim-IPC-only supplementary groups;
- exact effective `UnsetEnvironment=GCONV_PATH LD_AUDIT LD_LIBRARY_PATH LD_PRELOAD NODE_OPTIONS NODE_PATH OPENSSL_CONF`, with no unreviewed Environment/EnvironmentFile/PassEnvironment influence;
- UMask=0077;
- PrivateTmp and PrivateDevices;
- ProtectSystem=strict and protected home/kernel tunables/modules/logs/control-groups;
- LockPersonality, RestrictSUIDSGID and RestrictRealtime;
- NoNewPrivileges and empty bounding/ambient capability sets;
- AF_UNIX as the only admitted address family;
- exactly the reviewed writable target roles claim_state_root and claim_socket_parent, with no extra writable home/system/project paths and read-only temporary filesystems.

The socket path and socket-parent path must be versioned/fixed before installation. The parent is direct/symlink-free, retained-ancestor protected, claim-service:claim-IPC owned mode 0750, and unauthorized rename/unlink is denied. The final AF_UNIX socket is claim-service:claim-IPC mode 0660 with an exact reviewed link count.

Socket lifecycle is restart-safe as well as request-safe: publication is create-only/no-overwrite; an existing fixed pathname must be classified as a live reviewed listener or an exact stale reviewed socket before cleanup; live/changed/ambiguous generations are never unlinked; exact owner/group/mode/inode/link-count and claim-UID process exclusivity are rebound immediately before cleanup; cleanup ownership/argv is reviewed; and two-cycle restart plus crash/stale recovery are separately qualified.

Authentication is bidirectional. The server validates the publisher before reading the body; the publisher/client authenticates the server before sending the body and again before accepting the response. Server UID/GID/PID, PID start ticks, executable/source generation and socket inode must remain stable across the request/response. Path replacement, peer PID reuse, wrong executable/source, or server restart mid-request is a HOLD.

## Store-generation history continuity

Store replacement never resets replay history. A non-genesis migration must advance to a different store-generation ID and a different retained root identity; re-labeling a replacement as the existing generation is a HOLD. Every generation has an exact content-addressed store-generation record, and every migration has an exact content-addressed continuity receipt binding:

- predecessor generation-record ID plus **distinct** old generation -> new generation IDs;
- distinct old and new root identities;
- complete prior claim count;
- deterministic SHA-256 over the complete prior claim set sorted by claim_record_id;
- fixed claim-set ordering;
- fresh authorization identity that is not equal to any authorization ID already present in the retained claim history.

Every prior claim included in the history digest must itself pass the exact durable claim-record schema and content-derived ID check. The predecessor generation record has its own content-derived ID and must commit the same complete count and history digest; the migration receipt binds that exact predecessor-record ID; missing, extra, duplicate or mutated claims fail closed. Authorization IDs must also be unique across the complete retained history so a different record ID cannot hide cross-generation authorization replay. The new generation must commit the continuity receipt, and fresh Sovereign authorization must bind the new generation plus prior-history digest.

`genesis` is an exact boolean discriminator. Genesis is a separate exact zero-history shape with no predecessor. A migration cannot masquerade as genesis, including by presenting a forged zero-count history. Migration is accepted only after the new generation and retained history are durably published and reread.

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
- the canonical claim record binds the exact terminal-derived `store_contract_id` (re-derived from the supplied terminal receipt rather than trusted from the caller), the store generation, terminal receipt ID and runner-receipt digest, authorization ID, custody generation and record SHA-256, and the literal identity fields `request_sha256`, `canonical_main`, `canonical_tree`, `corpus_sha256`, `parent_adapter_sha256`, `operator_public_key_raw_sha256`, plus the attempt limit;
- `attempt_limit=1`;
- `automatic_retry_authorized=false`;
- final claim record link count 1;
- file fsync after final metadata and before publication;
- parent-directory fsync after publication;
- fail-closed classification of every crash/restart intermediate state;
- duplicate claim rejection within the current generation **and** cross-generation authorization replay rejection;
- durable claim publication completed before any trainer may start.

A successful store write must not itself start training and is **not** a reusable bearer capability for training start. Durable success reports `training_start_admission=false`, `training_start_consumption_required=true`, `training_start_consumption_performed=false`, and next gate `apollyon_training_start_consumption_v1`. That later protected one-time consumption boundary must create-once bind the claim record, authorization/custody/store generation and exact trainer process generation; recovery must distinguish an unconsumed claim from an already-consumed start so a lost ACK or replayed durable-claim success cannot admit a second trainer start.

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
