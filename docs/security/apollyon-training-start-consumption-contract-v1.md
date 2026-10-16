# Apollyon one-time training-start consumption source contract v1

Marker: `VOID_APOLLYON_TRAINING_START_CONSUMPTION_V1`

Status: **pure source/test contract; no protected consumption store, trainer release, or training execution exists here**.

## Purpose

The accepted protected attempt-claim store contract (#3233) deliberately makes durable-claim success non-bearer authority. A durable claim proves that one exact attempt claim exists, but it does not permit a trainer to start.

This contract defines the next boundary named by #3233: `apollyon_training_start_consumption_v1`.

## Required input shapes

The source finalizer accepts only:

1. an exact V2 durable claim record;
2. an exact V2 durable-success response cross-bound to that record and the exact publish-request SHA-256; and
3. one content-addressed inert pre-training admission generation.

The durable-success shape must still report:

```text
training_start_admission=false
training_start_consumption_required=true
training_start_consumption_performed=false
```

A success object supplied by a caller is not proof that the protected claim record currently exists. The future implementation must reread and revalidate the exact claim record from protected storage and revalidate the current store generation before it creates a start-consumption record.

## Inert pre-training generation

The trainer generation exists before consumption only in a blocked, non-training admission state. Its content-addressed identity binds:

- Linux boot-ID SHA-256;
- PID and process start-time ticks;
- non-root training UID/GID;
- reviewed source-identity SHA-256;
- `admission_blocked=true`;
- `training_execution_performed=false`;
- `candidate_weight_mutation_performed=false`;
- `automatic_retry_authorized=false`.

This source contract validates only that evidence shape. Protected source origin and live host observation remain future gates.

## Exact consumption record

The deterministic candidate record binds:

- a trainer-independent one-attempt consumption slot ID;
- store policy, admission contract and store generation;
- terminal receipt;
- authorization ID;
- custody generation and custody-record SHA-256;
- claim-record ID and canonical claim-record SHA-256;
- exact publish-request SHA-256;
- exact pre-training generation ID, boot ID, PID, start ticks, UID/GID and source identity;
- `attempt_limit=1`;
- `automatic_retry_authorized=false`.

The record has a content-addressed `apollyon_training_start_consumption_v1:<sha256>` identity.

The separate `apollyon_training_start_slot_v1:<sha256>` identity is derived
only from the exact one-attempt **authorization/custody authority**:
authorization ID, custody generation, custody-record SHA-256, attempt limit and
the reviewed no-retry bit. It deliberately excludes store generation, terminal
receipt, claim-record identity/hash, publish-request identity and trainer
generation/source identity.

Therefore:
- two different blocked trainer generations for one durable claim share one slot;
- two different valid terminal/claim records for the same one-attempt
  authorization and custody generation also share that same slot;
- the full consumption records still differ and the later one collides with an
  already occupied slot instead of obtaining a second start namespace.

## Replay and crash rule

The future implementation must publish create-once **by the
authorization-wide, trainer-independent slot ID** in a protected namespace that
the training identity cannot mutate.
The full consumption-record ID is evidence stored inside that slot; it is not
the namespace key. Persisted records must carry the exact accepted #3233 store-policy ID; a merely well-formed alternate policy ID is invalid.

The source exports an exact persisted-record validator and a deterministic recovery classifier. Recovery is bound to the exact expected slot ID. Caller-supplied absence => `unconsumed_shape`, but `create_once_publication_authorized=false` until a future protected-store implementation performs the observation itself. Exact matching caller-supplied record => `already_consumed_shape`, never reusable admission. A different valid trainer or claim record in the same authorization-wide slot, a record from another slot, or a malformed existing record fails closed.

An exact pre-existing consumption is **already consumed**, not reusable training admission. A lost acknowledgement, repeated durable-claim success response, alternate valid claim for the same authorization, service restart, or client retry may not admit another trainer generation.

Immediately before the later release, the implementation must revalidate the same bound trainer generation and its reviewed training-identity policy. If the protected record becomes durable but that generation disappears, drifts, or never crosses its later release gate, the attempt remains spent. Safety takes precedence over automatic retry; a fresh attempt requires fresh authorization through the reviewed claim chain.

## Deliberate non-authority

The recovery classifier itself performs no protected-store read and proves no protected origin; the future implementation supplies only a protected-origin observation after retaining/revalidating the reviewed store generation.\n\nThis source contract reports:

```text
durable_claim_success_origin_proven=false
protected_claim_record_reread_performed=false
current_store_generation_revalidation_performed=false
pretraining_generation_source_origin_proven=false
training_start_consumption_performed=false
trainer_independent_consumption_slot_qualified=true
authorization_wide_consumption_slot_qualified=true
protected_namespace_keyed_by_consumption_slot_required=true
existing_exact_consumption_reusable_admission=false
automatic_retry_authorized=false
protected_consumption_store_proven=false
recovery_classifier_protected_origin_proven=false
bound_trainer_generation_revalidation_performed=false
training_identity_policy_revalidation_performed=false
bound_trainer_generation_loss_after_consumption_forfeits_attempt=true
training_release_performed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
```

It selects no UID/GID, pathname, service, socket, filesystem layout, release mechanism, model, trainer, key, signing, transaction, or funds authority.

This start-slot repair prevents duplicate **training admission** even if two
different valid claim records exist for one authorization. It does not by
itself prove one-authorization/one-claim publication in the upstream protected
claim writer; that atomic authorization→claim binding remains a separate
implementation requirement.

The next gate is `apollyon_training_start_consumption_implementation_v1`, which must separately define and qualify the protected create-once store, the upstream atomic authorization→claim dependency, and the later exact-generation release boundary.
