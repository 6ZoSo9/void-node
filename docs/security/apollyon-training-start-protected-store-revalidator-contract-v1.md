# Apollyon training-start protected-store revalidator contract V1

Marker: `VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_CONTRACT_V1`.

Status: **source/test/CI contract only**. It performs no Xiphos filesystem read,
does not issue a writer directory capability, does not invoke the protected
writer, and does not authorize trainer release or training.

## Purpose

The current training-start chain has three separately reviewed source
boundaries:

1. an exact one-time consumption record and protected writer;
2. a fixed-root store-revalidation request; and
3. a synthetic-only directory-custody observer that deliberately refuses the
   production Xiphos root.

This contract freezes the evidence that a future privileged revalidator must
cross-bind before it may hand the writer a directory capability. It prevents a
future implementation from treating a content-addressed request, a fixture
receipt, or a caller-supplied directory FD as protected-store origin by itself.

## Exact parent generation

Direct parent: #3548 exact head
`477248e81d1fb5fb64e0af41e84d5bff092f7bab`.

Pinned parent source identities:

- store revalidation request:
  `be9347a157c7e220aa65cf3dad1c8b7781904277`;
- protected consumption writer:
  `473b4148e6bcb755bb8bf7c6af890150a9f43efe`;
- synthetic directory-custody source:
  `42408e7a65e3565a8a98cb4e23985c3ca76045bc`.

The fixture custody source is required as reviewed negative/adversarial
evidence, but a fixture receipt is explicitly **not authoritative** for the
production Xiphos store.

## Flat public candidate

`buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV1()` first
constructs the exact reviewed
`apollyon_training_store_revalidation_request_v1` from an exact consumption
record. It then emits a flat primitive-only, content-addressed candidate that
binds:

- fixed claim-state root
  `/var/lib/void-apollyon-attempt-claim-v2`;
- fixed `training-start-consumption-v1` directory;
- store policy / contract / generation;
- terminal receipt, authorization and authorization-slot identities;
- custody generation and custody-record digest;
- durable claim record and publish-request digest;
- training-start consumption slot/leaf/record identity;
- blocked trainer generation, boot, PID/start, UID/GID and source identity;
- all required future reread, visible-generation and writer-capability checks.

The candidate itself remains public policy material. Its content address is not
protected origin and is not bearer authority.

## Parent-request cross-binding

A standalone candidate qualifier proves only exact primitive shape,
content-address integrity and fixed policy values. Therefore the contract also
exposes
`qualifyApollyonTrainingStartProtectedStoreRevalidatorAgainstRequestV1()`.

That API rebuilds the candidate from the exact validated parent revalidation
request and requires byte-equivalent canonical material. A valid-looking
candidate whose store-generation ID is changed and whose candidate ID is
recomputed remains a valid *standalone public shape*, but must fail this
cross-binding API.

This distinction is deliberate: content addressing cannot be promoted into
host provenance.

## Mandatory future protected-host evidence

A future
`apollyon_training_start_protected_store_revalidator_implementation_v1`
must establish, in one bounded operation:

- protected fixed-root origin;
- current active and immutable store-generation reread and lineage validation;
- exact durable claim record reread;
- exact authorization winner / slot reread;
- classification of the derived training-start consumption slot;
- retained root and consumption-directory visible-generation continuity;
- a writer directory capability derived from that exact retained fixed root;
- the same store generation through writer invocation;
- no caller-selected path or detached-directory substitution.

Until an implementation proves those facts, every corresponding
`*_performed` / `*_proven` field stays false.

## Authority

This contract has no filesystem, network, subprocess, service, credential,
private-key, signing, wallet, transaction, or funds API.

It explicitly keeps false:

- `protected_store_origin_proven`;
- `current_store_generation_revalidation_performed`;
- `authorization_winner_reread_performed`;
- `durable_claim_record_reread_performed`;
- `writer_directory_capability_origin_proven`;
- `protected_writer_invocation_authorized`;
- `training_start_consumption_performed`;
- `trainer_release_authorized`;
- `training_execution_authorized`;
- `funds_movement`.

**PROTECT THE CORE.**
