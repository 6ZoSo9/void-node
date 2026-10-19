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

Before the historical #3333 validator is invoked, this gate snapshots the
one-key request envelope and every exact persisted-record field from enumerable
own **data descriptors**. Active/revoked Proxies, accessors, hidden/symbol/unknown
keys, arrays, non-plain objects, non-primitive record values and oversized key
sets fail closed before any caller getter or Proxy trap can run and before the
historical validator's `structuredClone` sees the record.

## Fixed protected-store target

The accepted #3276 service-source candidate fixes the claim state root at:

`/var/lib/void-apollyon-attempt-claim-v2`

This contract additionally freezes the future one-time consumption namespace to:

`/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1`

No caller-selected descendant is accepted. A future installer/host qualifier must
prove that exact directory exists with the ownership and 0700 policy required by
#3377 before its retained FD can be used. This contract re-derives #3276 and
requires its exact accepted store policy and binds the exact #3377 writer blob.

## Revalidation identities

The request carries the exact expected:

- store policy, store contract and current store generation IDs;
- terminal receipt ID;
- authorization ID;
- authorization-wide #3357 slot ID and exact winning slot-record ID;
- custody generation and custody-record SHA-256;
- durable claim-record ID and canonical claim-record SHA-256;
- exact publish-request SHA-256;
- authorization-wide training-start consumption slot ID and its exact derived
  leaf `training-start-consumption-v1-<slot-digest>.json`;
- exact trainer-specific consumption-record ID;
- blocked trainer generation, boot ID, PID/start ticks, UID/GID and source
  identity.

A replacement trainer for the same authorization maps to the same consumption
slot but a different consumption record and therefore a different revalidation
request.

## Required future bridge

Immediately before invoking #3377, a future protected-store revalidator must
prove, from the fixed protected store rather than caller assertions:

1. the directory capability is exactly the fixed
   `training-start-consumption-v1` directory under the reviewed claim state
   root and originates from the bound store generation;
2. the current store-generation record and authenticated generation lineage
   are reread and still establish the exact requested generation;
3. the fixed claim-state root and fixed consumption directory remain visibly
   bound to that same generation (not merely reachable through stale retained
   FDs);
4. the protected #3357 authorization winner is reread and still exactly the
   requested winner;
5. the durable claim record is reread and still has the requested canonical
   identity/hash;
6. the exact derived training-start consumption leaf is classified in the same
   protected namespace;
7. the directory capability handed to #3377 remains visibly bound to that same
   store generation through the writer mutation boundary.

The future bridge must distinguish an absent slot from an exact existing
consumption record. An exact existing record is already consumed and is not
reusable admission.

## Deliberate non-authority

This source contract always reports:

```text
protected_store_origin_proven=false
current_store_generation_revalidation_performed=false
store_generation_record_reread_performed=false
generation_lineage_revalidation_performed=false
fixed_root_visible_generation_revalidation_performed=false
fixed_consumption_directory_visible_generation_revalidation_performed=false
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

## October 19 current-generation writer + revalidation request

This PR is reconciled directly onto current #3351
`9e1da5dbb1ae12114a26506fbf1c6bc56780b98f` and carries the complete
eight-file writer + protected-store revalidation-request layer.

The protected-writer implementation remains byte-identical at
`a08927b7b16884a9bf0c28328047afdab49649ea`. Its current proof binds
#3333 consumption source `f557d92e89f3502ee6ac1243411cd43191ec1f37`,
authorization-slot source `25629371f6da164e12fecfc08c5f26815418e3a8`, and claim-service
candidate `87019ae1245a2054407dd47835b0b7a891d4d9a2`.

The revalidation-request source is rebound to those same current consumption
and claim-service generations. The composite workflow runs the current writer
proof before the revalidation-request proof and requires the direct PR scope to
be exactly the eight writer/request files.

This consolidation does not prove protected-store origin, current store
generation/winner/claim rereads, writer invocation authority, consumption
publication, trainer release, training, credential/key access, transactions or
funds movement.

## October 19 — bound to prevalidated protected writer

The historical #3385 revalidation request already snapshots its own
caller-provided record descriptors before validating or deriving the request.
The protected *writer* it references has now been hardened to require that
same inert-data boundary for both direct publish and read-only classify entry
points, and the exported slot-leaf helper. This child updates the request's
exact writer Git-blob dependency so the request cannot silently bind an older
getter-executing writer. The request's content-derived ID naturally changes
with the pinned writer source; record, path and policy semantics do not.

Composite proof must re-run the hardened writer regressions first, then the
pure request contract, with exact source Git-blob pins and no granted protected
host writer/admission/training authority. **PROTECT THE CORE.**

## October 19 — bound to held-inode/bounded-read writer

The request is now pinned to writer blob
`ee1570b561c6c78e114114d66cdbf190c58b091e`. That writer admits an existing
slot inode with O_PATH before data-open, reopens only the retained inode with
O_NONBLOCK, and bounds the actual FD read to 64 KiB + 1.

The composite proof re-runs the FIFO-substitution and growth-amplification
adversaries before qualifying this pure request. This remains a source-only
dependency rebind; protected-store origin, current winner/store/claim rereads,
writer invocation authority, consumption publication and training remain
false/unperformed.

## October 19 — flattened hardened writer/request generation

This PR now targets #3351 directly at
`9e1da5dbb1ae12114a26506fbf1c6bc56780b98f` and owns exactly the eight
writer/request files. It subsumes the historical #3377 protected writer and
#3385 writer+request stack while preserving their negative authority.

The composite workflow requires this exact eight-file direct scope, re-runs the
hardened writer proof (including getter/proxy, FIFO substitution and bounded
growth adversaries), then proves the immutable protected-store revalidation
request.

This consolidation does not prove protected-store origin, current
winner/store/claim rereads, writer invocation authority, consumption
publication, trainer release/training, credentials, transactions or funds.

## October 19 — existing-slot dual descriptor close safety

This direct child of the consolidated #3545 writer/request stack retains the
current flattened #3351 source ancestry and binds the request to the writer
that attempts both held-inode `O_PATH` and data descriptor closes exactly
once, even when the first close reports failure. An ambiguous close forces
a negative HOLD; it cannot return an `already_consumed` success.

The composite workflow re-runs the writer's synthetic post-close EIO
regressions before requalifying the pure store request, and binds the writer's
updated exact Git-blob identity. This source-only contract cannot prove
privileged directory origin, current protected winner/claim/store rereads,
writer admission, consumption publication, training, signing or funds activity.

## October 19 — writer owned-directory cleanup binding

The request is rebound to writer blob `ee1570b561c6c78e114114d66cdbf190c58b091e`, which now surfaces
cleanup uncertainty if an owned duplicate of the caller directory must be
discarded after failed validation. This does not promote the writer or request
to protected-store authority.


## Current writer terminal-close requirement

The bound protected writer generation now classifies terminal descriptor-close
uncertainty for both the retained created-record FD and the module-owned
consumption-directory FD. The future protected-store bridge must therefore treat
`apollyon_training_start_writer_created_record_close_uncertain` and
`apollyon_training_start_writer_owned_directory_close_uncertain` as possible
post-durability outcomes, never as proof that the one-time slot remained absent.

The revalidation request remains source-only and performs no filesystem IO or
writer invocation. Its role is to ensure a future host bridge can reclassify the
exact slot under the same protected store generation before taking any next
action.

## October 19 current authorization-slot generation rebind

The direct #3351 ancestry now carries authorization-slot source
`25629371f6da164e12fecfc08c5f26815418e3a8`. The writer/revalidation
focused proofs are rebound to that exact source generation. No writer runtime
logic, path policy, publication semantics, or authority field changed in this
rebind. Protected host origin, current store/winner/claim verification,
writer invocation, release/training and funds authority remain unproven.

## October 19 — dual terminal-close diagnostic dependency

This request binds the new writer blob
`ee1570b561c6c78e114114d66cdbf190c58b091e`.
Alongside the individually namespaced terminal close errors, a future
host revalidator must treat
`apollyon_training_start_writer_both_terminal_closes_uncertain`
as a **failed/indeterminate one-time publication outcome**. It cannot
assume the slot remained absent or automatically retry the writer.

The composed test injects EIO after both real descriptor closes and
preserves both original errors. The request still performs no host-path
IO and issues no writer/trainer authority. Protected Xiphos store lineage,
winner, claim, terminal, credential, transaction and funds checks are
separate blocked gates.
