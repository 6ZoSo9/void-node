# Apollyon training-start protected-store revalidator contract V2

Marker: `VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_CONTRACT_V2`.

Status: **source/test/CI contract only**. No live Xiphos filesystem read, writer
capability, protected writer invocation, claim publication, trainer release,
training, credential, signing, transaction or funds action is authorized.

## Why V2

A historical V1 contract exists only on the stale branch
`ren/apollyon-training-start-protected-store-revalidator-contract-v1-20261019`.
It never became a current PR and its ancestry is hundreds of commits behind the
repository. V2 does not revive or force-update that history.

V2 stacks on the current reviewed #3551 source generation:

- parent head: `550020518c2e4d7392b42d79cb83a3aee99f8c1e`;
- store-revalidation request blob:
  `079576db7f880872f2d4dea8e7759bd536161516`;
- protected consumption writer blob:
  `76f5a6bcbc9854a1133cd1324eb862cb50102c0e`;
- synthetic directory-custody observer blob:
  `ed6eb47c2f83b35b489d0e9034a4b87c2d10b9dd`.

The current fixture observer includes the terminal root mode/owner/access/default
ACL and retained/visible generation revalidation that closed the #3551 TOCTOU
finding. A fixture receipt remains non-authoritative for the real Xiphos store.

## Candidate content address

The historical contract rebuilt an ordinary object and used
`JSON.stringify()` for its public candidate ID. V2 does not.

V2 snapshots an exact closed **flat primitive-only** record and encodes every
field in the fixed schema order as a length-prefixed typed frame. Strings,
booleans and safe integers have distinct encodings; key and payload lengths are
explicit. The frame path uses captured reflection, numeric, hashing and Buffer
primitives.

The candidate ID is:

`apollyon_training_start_protected_store_revalidator_v2:<sha256(frame)>`.

The executable proof poisons `JSON.stringify`, installs an inherited
`Object.prototype.toJSON` getter, and replaces the live reflection helpers
after module import. Qualifying and encoding an already-built V2 candidate must
still produce identical bytes without executing the inherited getter. Revoked
Proxy candidates and accessor-bearing inputs fail closed.

This closes the V2 candidate's own content-address realm seam. It does **not**
promote the legacy V1 request-construction realm into host authority.

## Separate safe canonicalizer prerequisite

The future protected host implementation must consume a reviewed safe
canonicalizer generation rather than silently trusting the legacy V1 request
serializer. The current reviewed source reference is:

- #3740 head:
  `4306d608fbf5b13a8e20b02d8d416b9f55726b8f`;
- `tools/apollyon-claim-contract-canonical-json-v2.mjs` blob:
  `6e8056287ae4ac8c73b9230679a6a4b570d8eac8`.

This contract records:

```text
reviewed_canonicalizer_v2_required_for_future_host=true
reviewed_canonicalizer_v2_host_integration_proven=false
parent_revalidation_request_v1_host_realm_proven=false
```

The #3740 reference is a reviewed source prerequisite, not evidence that this
#3551-stacked branch contains or has installed that serializer.

## Protected-store evidence contract

The V2 public candidate binds the exact current #3551 request material and the
fixed future paths:

- `/var/lib/void-apollyon-attempt-claim-v2`;
- `/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1`.

It carries the store policy/contract/generation, terminal receipt,
authorization and winning authorization-slot identities, custody generation,
durable claim record and publish-request digest, one-time consumption slot and
leaf, consumption record, and blocked trainer generation/process/source
identity.

A future privileged implementation must still prove, in one bounded retained
capability generation:

1. protected fixed-root and trusted-ancestor origin;
2. active + immutable store-generation and lineage rereads;
3. exact authorization winner/slot and durable claim rereads;
4. terminal/custody/request cross-binding;
5. one-time consumption-slot absence/collision classification;
6. root and consumption-directory owner/mode/link/access/default-ACL policy;
7. retained/visible inode generation stability through the writer boundary;
8. writer directory capability derived only from the retained fixed root;
9. the same store/winner/claim generation through any separately authorized
   writer invocation;
10. no automatic retry after indeterminate close, lease loss, partial write or
    uncertain mutation.

A content-addressed V2 candidate, a caller-provided FD, a source checkout, or a
synthetic fixture receipt is never sufficient proof of those facts.

The machine-readable V2 contract also requires, without claiming they have
been performed:

- trusted ancestor custody;
- absent POSIX access **and** default ACLs on root/consumption directories;
- fail-closed symlink/FIFO/device/hardlink substitution handling;
- regular single-link bounded records with canonical bytes, terminal EOF and
  retained/visible generation checks;
- terminal receipt, custody record and publish-request binding rereads;
- transaction lease/fencing across final revalidation and any writer handoff;
- lease-loss and indeterminate-close mapping to HOLD; and
- no automatic retry after an indeterminate outcome.

All matching `*_proven`, `*_revalidated` and `*_performed` fields remain
false in this source candidate.

## Parent request cross-binding

`qualifyApollyonTrainingStartProtectedStoreRevalidatorAgainstRequestV2()`
rebuilds the candidate from the exact validated parent request and compares the
complete fixed-schema primitive record, not only its hash.

The proof builds a second, internally valid V2 candidate from a different
coherent store-generation request. It remains a valid public candidate but is
rejected when presented against the original request. Content addressing is not
bearer authority.

## Authority boundary

Only source/test facts advance. These remain false:

```text
reviewed_canonicalizer_v2_host_integration_proven=false
parent_revalidation_request_v1_host_realm_proven=false
fixture_custody_receipt_authoritative=false
protected_store_origin_proven=false
current_store_generation_revalidation_performed=false
store_generation_record_reread_performed=false
generation_lineage_revalidation_performed=false
durable_claim_record_reread_performed=false
authorization_winner_reread_performed=false
consumption_slot_classification_performed=false
writer_directory_capability_exact_path_proven=false
writer_directory_capability_origin_proven=false
fixed_root_visible_generation_revalidation_performed=false
fixed_consumption_directory_visible_generation_revalidation_performed=false
protected_writer_invocation_authorized=false
live_host_observation_performed=false
filesystem_read=false
filesystem_write=false
service_action=false
network_access=false
credential_access=false
private_key_access=false
signing=false
wallet_access=false
transaction=false
funds_movement=false
training_start_consumption_performed=false
trainer_release_authorized=false
trainer_release_performed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
```

Current V2 source generation before this document:

- contract source blob:
  `ef578b704e8cb186b98fd4f89f410f70dc0306b0`;
- proof blob:
  `12b8869ef3147803a9028b36d142e1276b74f1ac`.

Next gate:
`apollyon_training_start_protected_store_revalidator_implementation_v2`,
after exact-head CI and distinct review. Any live host observation remains a
separately authorized read-only gate.

**PROTECT THE CORE.**
