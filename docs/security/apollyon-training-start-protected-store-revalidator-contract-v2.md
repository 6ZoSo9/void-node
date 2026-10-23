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
after module import. It additionally poisons the live Proxy detector, both
RegExp `test` and `exec`, hash update/digest methods, Buffer
allocation/encoding helpers and a synthetic `Buffer.prototype.length` getter,
`Reflect.apply`, and the Array iterator/index-setter surface. The source uses
captured `RegExp.exec` directly, a captured typed-array length intrinsic for
generated Buffer lengths, and a captured `Uint8Array.prototype.set` to copy
frame segments. It deliberately avoids `Buffer.concat` in the content-address
path because the captured Node helper still reads the live Buffer `length`
property internally. The public encoder also returns the newly allocated
`frameRecord()` Buffer directly instead of wrapping it in
`Buffer.from(Buffer)`, which would re-read the same live length surface.
Qualifying and
encoding an already-built V2 candidate must still produce identical bytes
without executing the inherited getter or Array index setter. Revoked Proxy
candidates and accessor-bearing inputs fail closed.

This closes the V2 candidate's own content-address realm seam. It does **not**
promote the legacy V1 request-construction realm into host authority.

## Separate safe canonicalizer prerequisite

The future protected host implementation must consume a reviewed safe
canonicalizer generation rather than silently trusting the legacy V1 request
serializer. The current reviewed source reference is:

- #3740 head:
  `1f5dbd8f505d90ed197e80a97015066c567e8ced`;
- `tools/apollyon-claim-contract-canonical-json-v2.mjs` blob:
  `4d4b970fa2df3a3e7cae176b18c62aff52e94adc`.

The superseded #3740 tuple
`4306d608fbf5b13a8e20b02d8d416b9f55726b8f` /
`6e8056287ae4ac8c73b9230679a6a4b570d8eac8` is intentionally rejected by
the V2 proof. The current serializer generation moves captured Proxy detection
ahead of both object and function dispatch, including callable/revoked-callable
Proxy cases, and is 15/15 exact-head CI green.

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

## Full #3557 future-host matrix

The machine-readable candidate now binds the complete **future** qualification
matrix from #3557 rather than using `full_3557_future_host_matrix_bound=true`
as a prose-only rollup.

In addition to the retained store/writer gates above, the contract requires:

- exact installed source generation, package closure, trusted
  interpreter/runtime, and service/process identity;
- rejection of ambient environment and mutable external provenance;
- a privileged fixed-root capability with mount/bind-alias namespace
  provenance; caller-selected roots or directory FDs never grant authority;
- cross-UID kernel peer credential provenance, protected operator/claim-service
  identity, and bounded ephemeral delegated capability lifetime;
- exact record content-digest/ID cross-binding, pending/partial-record HOLD,
  and no unlink/rollback/release after an indeterminate outcome;
- post-publication revalidation of root, generation, winner, claim and
  consumption state plus parent-fsync evidence;
- stopped-trainer identity revalidation, a separate native releaser gate, and
  the separate sole-writer/exact-frame/EOF/protected-credential gate;
- the rule that a protected-store receipt conveys **no** key, signing, wallet,
  transaction, payment, token-allocation or treasury authority;
- complete negative-fixture FD census, exactly-once close attempts, zero
  protected mutation/stable synthetic namespace, and terminal-close failure
  provenance; and
- a separately authorized first host pass that is read-only and metadata-safe,
  with credentials/keys/wallets and mutation/service/training actions forbidden.

The public candidate keeps the corresponding host facts false, including
installed source/package/runtime/process proof, fixed-root/mount provenance,
cross-UID and protected-role provenance, delegated-capability proof,
post-publication checks, stopped-trainer reread, releaser/sole-writer gates,
and `first_host_pass_performed=false`.

The executable proof flips **all 27 new required fields** to false one at a
time and all **15 new proof/performance fields** to true one at a time. Every
mutation must fail candidate qualification before its stale content address
could be treated as authority.

These are source-contract obligations only. They do not claim an installed
observer, Xiphos read, service/process qualification, writer invocation,
release, credential use, training, signing, transaction, or funds action.

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
installed_source_generation_identity_proven=false
installed_package_closure_identity_proven=false
trusted_interpreter_runtime_identity_proven=false
installed_service_process_identity_proven=false
privileged_fixed_root_capability_origin_proven=false
mount_namespace_and_bind_alias_provenance_proven=false
cross_uid_kernel_peer_credential_provenance_proven=false
protected_operator_and_claim_service_identity_proven=false
ephemeral_delegated_capability_lifetime_proven=false
stopped_trainer_identity_revalidation_performed=false
postpublication_revalidation_performed=false
postpublication_parent_fsync_evidence_proven=false
separate_native_releaser_gate_satisfied=false
sole_writer_exact_frame_eof_and_credential_gate_satisfied=false
first_host_pass_performed=false
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
  `4c78459826c25cab43870b0b322b566575d18667`;
- proof blob:
  `9a5819e115373950a980d5effbc849d8f5f4c26b`.

Next gate:
`apollyon_training_start_protected_store_revalidator_implementation_v2`,
after exact-head CI and distinct review. Any live host observation remains a
separately authorized read-only gate.

**PROTECT THE CORE.**
