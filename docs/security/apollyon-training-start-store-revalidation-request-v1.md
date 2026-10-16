# Apollyon training-start protected-store revalidation request v1

Marker: `VOID_APOLLYON_TRAINING_START_STORE_REVALIDATION_REQUEST_V1`

Status: **source/test contract only**. This gate does not contact Xiphos, read a
protected store, invoke the #3377 writer, publish a consumption record, release
a trainer, or authorize training.

## Purpose

Accepted #3377 intentionally accepts a caller-retained directory file
descriptor while reporting that protected-store origin and current-store
revalidation are unproven. That is the correct low-level writer boundary, but a
future Xiphos integration needs an exact immutable request describing what must
be reread and cross-bound before that directory capability may be handed to the
writer.

This contract derives that request from one exact validated #3333 persisted
training-start consumption record. It accepts no caller-selected path, filename,
"proven" boolean, service name or arbitrary revalidation identity.

## Fixed protected-store target

The accepted #3276 service-source candidate fixes the claim state root at:

`/var/lib/void-apollyon-attempt-claim-v2`

This contract re-derives #3276 and requires its exact accepted store policy and
fixed root. The request also binds the exact accepted #3377 writer blob.

## Revalidation identities

The request carries the exact expected:

- store policy, store contract and current store generation IDs;
- terminal receipt ID;
- authorization ID;
- authorization-wide #3357 slot ID and exact winning slot-record ID;
- custody generation and custody-record SHA-256;
- durable claim-record ID and canonical claim-record SHA-256;
- exact publish-request SHA-256;
- authorization-wide training-start consumption slot ID;
- exact trainer-specific consumption-record ID;
- blocked trainer generation, boot ID, PID/start ticks, UID/GID and source
  identity.

A replacement trainer for the same authorization maps to the same consumption
slot but a different consumption record and therefore a different revalidation
request.

## Required future bridge

Immediately before invoking #3377, a future protected-store revalidator must
prove, from the fixed protected store rather than caller assertions:

1. the directory capability originates from the fixed reviewed claim state
   root/generation;
2. the current store generation is still the exact requested generation;
3. the protected #3357 authorization winner is reread and still exactly the
   requested winner;
4. the durable claim record is reread and still has the requested canonical
   identity/hash;
5. the training-start consumption slot is classified in the same protected
   namespace;
6. the directory capability handed to #3377 remains in that same store
   generation through the writer mutation boundary.

The future bridge must distinguish an absent slot from an exact existing
consumption record. An exact existing record is already consumed and is not
reusable admission.

## Deliberate non-authority

This source contract always reports:

```text
protected_store_origin_proven=false
current_store_generation_revalidation_performed=false
durable_claim_record_reread_performed=false
authorization_winner_reread_performed=false
consumption_slot_classification_performed=false
writer_directory_capability_origin_proven=false
protected_writer_invocation_authorized=false
training_start_consumption_performed=false
trainer_release_authorized=false
trainer_release_performed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
```

It imports no filesystem, network, child-process, service, key, signing, wallet,
transaction or funds capability.

Next gate:
`apollyon_training_start_protected_store_revalidator_v1`.

PROTECT THE CORE.
