# Apollyon atomic authorization-to-claim slot source contract v1

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_V1`

Status: **pure source/test contract; no protected-store observation, slot publication, durable claim publication, service action, or training execution occurs here**.

## Purpose

Accepted #3233/#3276 bind durable claim records to one authorization and require `attempt_limit=1`, but each content-addressed claim record is terminal/session-specific. Create-only publication by claim-record ID alone therefore cannot serialize two concurrent valid terminal sessions for the same authorization.

This contract adds the missing stable atomic namespace without changing the accepted #3233 `store_policy_id`. The slot namespace is not a second store: it must live under the exact same protected claim state root and store-generation lifecycle, with the same dedicated claim service as its only writer. Publisher, training and custody identities must have no slot write/rename/unlink authority.

## Current-parent binding (October 18, 2026)

The source contract is composed on the updated native process-identity parent
#3309 `954c160b9a0c0f3585458c0e785bc2be26f9f7f3`. The previous base was
`030fa29867c1296cc2f91f024f55f4fb9596191f`. Complete nontruncated Git-tree
comparison identifies 355 upstream changed paths and **zero path overlap** with
the four authorization-slot contract paths.

The accepted source-only service-candidate module in the current parent has
Git blob `87019ae1245a2054407dd47835b0b7a891d4d9a2`, replacing historical
`d67ef39c4cd034844fb0862e180de46ed4cd0c88`. Its own revision differs only
in two pinned host-plan source-generation identities. The authorization-slot
contract rebinds this exact parent blob but does not change the authorization
slot ID derivation, replay uniqueness rules, the stable reviewed store-policy
ID, or any physical writer/runtime authority.

Every downstream contract that pins the old authorization-slot source blob
must be independently requalified; an updated parent source identity does not
make a detached receipt a protected origin, and green CI does not authorize
claim-service installation, training, or capability issuance.

## Stable authorization slot

The authorization slot ID is content-addressed from exactly:

- marker/version;
- authorization ID;
- `attempt_limit=1`;
- `automatic_retry_authorized=false`.

It deliberately excludes:

- terminal receipt;
- store contract;
- store generation;
- claim-record ID/hash;
- publish-request digest.

Therefore the same one-attempt authorization always maps to the same slot across different terminal sessions, store-generation migrations, and future store-policy upgrades. The current store-policy ID is still required and bound in the winning slot record and source contract, but it is deliberately not part of the replay-key derivation.

A different authorization maps to a different slot.

## Slot record

The winning slot record binds the stable slot to the exact claim candidate. This shape helper is **not** claim admission authority: before a future writer reserves the slot it must separately revalidate the exact claim-record semantics, terminal receipt/protected origin, exact request envelope and current store generation. Those revalidations remain unperformed in this source-only contract.

- store policy;
- authorization ID;
- store contract and store generation;
- terminal receipt;
- claim-record ID and canonical claim-record SHA-256;
- exact publish-request SHA-256;
- attempt limit and retry=false.

The full slot record is independently content-addressed.

## Required future publication order

The future protected writer must:

1. validate/revalidate the exact claim candidate and current store generation;
2. create and fsync a private slot-record pending inode after final metadata/bytes verification;
3. publish the fixed authorization slot create-once without ever writing partial bytes directly to the final pathname;
4. fsync the slot directory, clean the pending name and fsync the directory again;
5. if the same exact slot record already exists, enter exact recovery;
6. if a different claim occupies the slot, HOLD permanently for that request;
7. while holding the same store-generation transaction/serialization boundary, revalidate the exact claim/terminal/request and current generation again;
8. publish/recover only the exact claim bound by the slot;
9. fsync and reread both the authorization slot and final claim record;
10. emit durable success only after both are proven exact and durable.

Store migration must be excluded while a slot→claim transaction is in flight. A slot that has become durable without its exact bound durable claim must be recovered/settled before migration may proceed.

A crash after slot reservation but before claim publication may only recover the exact bound claim. It may not free the authorization for a different terminal/session claim.

## Concurrency and migration

Two valid terminal sessions for one authorization may produce different claim IDs, but both derive the same authorization slot. At most one can become the winning durable claim.

Store migration must preserve the complete authorization-slot set and its bindings. The slot identity is stable across both store-generation changes and future store-policy upgrades because it is derived from the one-attempt authorization itself, not from store policy or generation.

The source contract defines a deterministic slot-set commitment: validated slot records are sorted by authorization-slot ID, duplicate authorization slots are rejected, and the complete count plus SHA-256 of the canonical sorted records form a stable content-addressed set ID. A migration receipt must bind distinct old/new store generations, the parent #3233 store-continuity receipt ID, and the exact same slot-set count/hash/ID on both sides. Slot records are copied byte-for-byte; they retain the store generation in which their winning claim was originally bound. Dropping or rewriting any prior authorization slot fails closed. Protected old/new slot-set origin and parent continuity revalidation remain future host duties.

The one-time training-start gate must later revalidate that its durable claim is the unique claim bound by this protected authorization slot. Migration must cross-bind the complete authorization-slot set to the complete durable claim set; a slot without its exact durable claim is not a migratable steady state.

## Deliberate non-authority

This source contract reports:

```text
protected_authorization_slot_store_proven=false
same_protected_claim_root_binding_performed=false
claim_service_only_slot_writer_proven=false
protected_claim_record_origin_proven=false
claim_record_semantic_revalidation_performed=false
terminal_receipt_revalidation_performed=false
publish_request_revalidation_performed=false
store_generation_revalidation_performed=false
parent_store_continuity_receipt_revalidation_performed=false
authorization_slot_set_migration_continuity_performed=false
authorization_slot_publication_performed=false
durable_attempt_claim_performed=false
attempt_claim_authorized=false
attempt_claimed=false
training_start_admission=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
```

It performs no filesystem, network, service, socket, key, signing, wallet, transaction or funds action.

## Next gate

The future claim-store implementation must compose this contract with the accepted request/provenance lineage before any durable claim writer can be considered.

## Untrusted JavaScript input preflight (October 19, 2026)

All public authorization-slot shape APIs now reject caller-controlled JavaScript
objects before cloning, canonicalization, regular-expression coercion, sorting,
or nested-record traversal can execute caller code.

Ordinary objects are admitted only after an exact own-key and descriptor
snapshot proves a plain/null-prototype object whose required fields are
enumerable own **data** properties. Accessors, hidden/symbol/unknown keys,
non-plain objects, active/revoked Proxies and non-primitive scalar fields fail
closed without invoking getters or Proxy traps.

Slot-record arrays are likewise admitted from a dense ordinary Array only after
its exact index descriptors and length descriptor are proven. Array element
accessors, sparse/extra/symbol keys and Proxy arrays fail before any element is
read. Each detached element is then passed through the same hardened slot-record
validator before ordering or migration commitment calculation.

This changes only rejection/preflight behavior. Valid slot IDs, slot-record
content addresses, deterministic slot-set commitments, migration semantics and
all deliberate non-authority flags remain unchanged.
