# Apollyon atomic authorization-to-claim slot source contract v1

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_V1`

Status: **pure source/test contract; no protected-store observation, slot publication, durable claim publication, service action, or training execution occurs here**.

## Purpose

Accepted #3233/#3276 bind durable claim records to one authorization and require `attempt_limit=1`, but each content-addressed claim record is terminal/session-specific. Create-only publication by claim-record ID alone therefore cannot serialize two concurrent valid terminal sessions for the same authorization.

This contract adds the missing stable atomic namespace without changing the accepted #3233 `store_policy_id`.

## Stable authorization slot

The authorization slot ID is content-addressed from exactly:

- marker/version;
- the stable accepted store-policy ID;
- authorization ID;
- `attempt_limit=1`;
- `automatic_retry_authorized=false`.

It deliberately excludes:

- terminal receipt;
- store contract;
- store generation;
- claim-record ID/hash;
- publish-request digest.

Therefore the same one-attempt authorization always maps to the same slot across different terminal sessions and store-generation migrations.

A different authorization maps to a different slot.

## Slot record

The winning slot record binds the stable slot to the exact claim candidate:

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
2. reserve the protected authorization slot create-once;
3. fsync the slot record and slot directory;
4. if the same exact slot record already exists, enter exact recovery;
5. if a different claim occupies the slot, HOLD permanently for that request;
6. publish/recover only the exact claim bound by the slot;
7. fsync and reread both the authorization slot and final claim record;
8. emit durable success only after both are proven exact and durable.

A crash after slot reservation but before claim publication may only recover the exact bound claim. It may not free the authorization for a different terminal/session claim.

## Concurrency and migration

Two valid terminal sessions for one authorization may produce different claim IDs, but both derive the same authorization slot. At most one can become the winning durable claim.

Store migration must preserve the complete authorization-slot set and its bindings. The slot identity is stable across store-generation changes because it is bound to the persistent store policy, not a generation.

The one-time training-start gate must later revalidate that its durable claim is the unique claim bound by this protected authorization slot.

## Deliberate non-authority

This source contract reports:

```text
protected_authorization_slot_store_proven=false
protected_claim_record_origin_proven=false
store_generation_revalidation_performed=false
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
