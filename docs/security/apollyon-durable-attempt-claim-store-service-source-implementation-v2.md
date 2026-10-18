# Apollyon durable attempt-claim store service source implementation V2

Marker:
`VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_V2`.

Status: **source/test/CI core and Linux transaction composition; no installed service, AF_UNIX listener, Xiphos mutation, or production claim publication**.

## Purpose

The accepted Apollyon claim-store stack defined all of the pieces surrounding a durable claim writer, but the concrete service core was still missing:

- #3276 defined the fixed service/store policy and path roles;
- #3285 froze exact six-key request framing and `publish_request_sha256`;
- #3291/#3300/#3306/#3309 defined the privileged handoff, native peer/process provenance requirements, and kernel primitives;
- #3357 added the authorization-wide create-once winner slot.

Without this implementation, later training-start protected-store revalidation could not truthfully name concrete claim/slot/generation leaf paths.

This gate provides the reusable synchronous store/publisher core, an actual
read-only authorization-winner observation method, the physical store namespace,
and a Linux composition that supplies a real advisory transaction lock. Both
operations bind record reads to held descriptors and recheck the visible names
within the caller-supplied root. The Linux composition serializes cooperating
operations on that same root inode. An installed service wrapper, protected-root
origin, privileged revalidation and exclusion of other writers or root migrations
remain separate work.

## Exact parent

Base: accepted #3357 exact head
`4e7d433a4141b4a7cad7fb001d0800dccb1b5ec2`.

Important exact source generations:

- authorization-slot V1:
  `93582c324ca85aeff56eb61f82b32f1e4c18dfe9`;
- exact request envelope V2:
  `d1726e3be042549769d2fe554371facd2ed60553`;
- protected store contract V2:
  `6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe`;
- inert store-service candidate V2:
  `d67ef39c4cd034844fb0862e180de46ed4cd0c88`;
- native peer integration V2:
  `394b9dbaebbdbb561be6119f5be8b60d59fb367d`;
- shared canonicalizer:
  `f97fafb0148527ae3a954e2752faef8c7fc9e88e`;
- terminal receipt:
  `e27f0ebb968f4611bfc069670325c3f5e6df1c65`;
- live source/session binding:
  `981935515e08634be96446e58922c16be56d33ad`;
- revalidation handoff:
  `5d913eb08d79c76ed926d8b88be05b12f475abd5`.

The Linux composition is added over the unchanged core blob
`e1329dece0caa2c8c3db142589b5c1c83e6c1076`. Its source is
`tools/apollyon-durable-attempt-claim-store-transaction-lease-v2.mjs`, blob
`f485b9e6fc29eab549ebba07e1b49f24c7659092`. The existing PR owns five files: core, transaction
composition, focused proof, this document and the focused workflow.

## Fixed physical namespace

The service implementation fixes the protected root role to the existing host-plan path:

`/var/lib/void-apollyon-attempt-claim-v2`.

Within one retained root descriptor, the V2 implementation namespace is:

```text
active-generation-v2.json
store-generations-v2/
authorization-slots-v1/
claims-v2/
.pending-v2/
training-start-consumption-v1/
```

The implementation itself does not create those directories or install that root. Host installation remains a separate gate.

The core refuses claim UID 0 or claim GID 0 and admits numeric values only in
`1..65533`. The fuller separation against training/custody/public/operator
identities and exact claim-IPC supplementary-group set remains a host-integration
gate.

Protected root and subdirectories are required mode `0700` and owned by the
configured non-root claim service UID/GID. Durable record leaves are required
mode `0600`, single-link after completed publication, and exact owner/group.

The retained root identity is content-addressed as canonical:

```text
dev
ino
mode
uid
gid
nlink
size
```

and must equal the active/immutable store-generation record's
`root_identity_sha256`.

The persisted identity scheme remains
`canonical_dev_ino_mode_uid_gid_nlink_size_v1`. Filesystem observations use
BigInt stat: device and inode values become exact decimal strings, while the
other persisted fields must fit safe integers. No timestamp fields are added
to existing generation records and no generation is rewritten. A generation
created with a rounded, inaccurate inode identity will fail comparison.

## Descriptor and namespace binding

The backend requires Linux, procfs descriptor traversal, and available
`O_DIRECTORY`, `O_NOFOLLOW` and `O_NONBLOCK` flags. Unsupported platform/flag
combinations fail with `apollyon_claim_store_impl_v2_backend_unsupported`.
An unavailable procfs traversal also fails; it is not replaced with ordinary
caller-supplied pathname traversal.

After acquiring a valid lease, each operation opens its own root-directory
descriptor through the supplied FD. It compares the caller descriptor before
and after that open with the owned descriptor and the retained root identity.
Subsequent traversal uses the owned descriptor. Closing and reusing the
caller's original FD during an operation cannot redirect that operation. A
later operation still requires a valid caller FD for the original root.

Each record read retains the first validated metadata snapshot through the
read. That snapshot includes exact device/inode identity, mode, UID, GID,
link count, size, and nanosecond modification/change timestamps. The reader
checks it before reading, reads from offset zero within the 256 KiB bound,
probes for EOF at the expected length, and checks it again afterward. A
nofollow stat of the visible leaf must match the held file. Record opens are
nonblocking so a FIFO can be rejected by type without waiting for a writer.
Access time is excluded because the read itself may change it.

Active and immutable generation descriptors remain open through the operation.
Publication also holds the persisted slot and claim as soon as each is
validated. Every revalidation bracket rereads the held records and checks
their visible bindings. The final checks run **after** `before_success_ack`
returns, so that callback cannot change a final record's permissions or
replace its inode and still obtain success.

The root and every opened child directory are rechecked at those boundaries.
The visible child name must still identify the held directory, with the
required owner, group, mode and link count. Publication permits child-directory
length and timestamp changes caused by its own create/link/unlink operations.
The read-only operation requires the full transient directory snapshots to
remain unchanged. The owned root's full transient snapshot remains fixed
during both operations.

These checks detect changes across the observed boundaries. A trustworthy
store-wide lease must still exclude concurrent writers and generation changes;
sequential filesystem checks alone do not create an atomic multi-file snapshot.
The supplied root FD is an anchor, not evidence that it was opened from the
protected installed path. The Linux composition below supplies same-inode
advisory exclusion for participants using its lock, without proving that all
host writers and migrations participate.

## Exact publisher forwarding

`prepareApollyonDurableAttemptClaimPublisherForwardV2()` accepts only a Buffer containing the exact canonical #3285 request frame.

It copies the exact frame into privately owned, unpooled storage before validation.
The frozen result retains the original digest and a deeply frozen parsed request.
Every access to `exact_request_bytes` returns a new, unpooled Buffer containing
the validated frame. Changing the input, a previous returned copy, or that copy's
entire backing ArrayBuffer cannot change a later access. Copies use captured
intrinsics so an input-owned `copy` method or a later prototype override cannot
receive the private buffer. The helper explicitly reports:

- no request reconstruction;
- no recanonicalization;
- no argv source;
- no environment source;
- no stdin source;
- no filesystem source;
- no network source.

A later publisher process wrapper must obtain those bytes from the reviewed inherited private pipe. This source function alone is not that runtime proof.

## Durable slot-first publication

`createApollyonDurableAttemptClaimStoreServiceCoreV2()` receives a retained root FD, exact claim UID/GID, a source-session binding ID, and two injected synchronous capabilities:

- `acquireExclusiveStoreTransaction(context)`;
- `revalidate(stage, context)`.

This replaces the earlier `withExclusiveStoreTransaction(fn)` source-candidate
API. The old configuration is rejected explicitly, including when a caller also
supplies the new interface. It has no compatibility adapter: a wrapper can call
`fn()` and then return a Promise, after the store has already changed.

Configuration contains exactly the four data fields above and the two capability
functions as own data properties. The core captures them at construction; later
changes to the caller's configuration do not replace the approved functions.

The publisher validates the exact request, claim record, authorization-slot winner,
expected generation record and root binding before acquisition. It then obtains
and validates the synchronous lease before entering its private filesystem
transaction. Acquisition receives only a frozen object containing these strings:

| Field | Binding |
| --- | --- |
| `root_identity_sha256` | Retained root identity |
| `session_binding_id` | Configured source session |
| `store_generation_id` | Expected generation |
| `store_generation_record_id` | Exact expected generation record |
| `authorization_slot_id` | Authorization-wide winner slot |
| `claim_record_id` | Exact claim |
| `publish_request_sha256` | Original validated request bytes |

Acquisition must return a plain or null-prototype object with exactly one own,
enumerable data property, `release`, whose value is a synchronous function.
Promises, proxies, accessor properties, extra keys, and recognized async or
generator release functions are rejected before the core transaction. Validation
does not read caller-provided `then` or `release` getters. The transaction body
is never passed to acquisition.

The captured `release` is invoked once with the lease as its receiver, no
arguments, and an exact `undefined` success result. The lease must cover the
whole store-generation boundary, including recovery, publication, rereads and
descriptor cleanup. The core checks retained root identity and current active
and immutable generation records within that lifetime.

The mutation order is fixed:

1. pre-mutation generation + source revalidation;
2. recover any exact interrupted hard-link publication;
3. classify existing slot/claim state;
4. create or recover the authorization slot;
5. reread/validate exact slot bytes;
6. revalidate generation/provenance;
7. create or recover the exact bound claim;
8. reread/validate exact claim bytes;
9. revalidate generation/provenance, then recheck all held records and directory
   bindings after the final callback;
10. close every transaction-owned descriptor, release the lease, and return the
    validated standard durable-success response only if all cleanup succeeded.

A pre-existing claim without its authorization slot is a hard HOLD.

A different valid claim for the same occupied authorization slot is a hard collision/HOLD before a second claim can be published.

## Linux transaction composition

`tools/apollyon-durable-attempt-claim-store-transaction-lease-v2.mjs` exports
`createApollyonDurableAttemptClaimStoreServiceWithLinuxTransactionV2()`.
Its configuration contains exactly five own enumerable data properties:
`root_fd`, `claim_uid`, `claim_gid`, `session_binding_id` and `revalidate`.
The factory captures those values, supplies its private acquisition function to
the existing core, and returns that same frozen core with the same two methods
and authority fields. It exposes no lock descriptor, unlock function, extra
receipt or caller-selected helper. The original six-field core factory remains
available for explicit dependency injection and its existing proofs.

For a service wrapper that already retains the claim-root descriptor and the
required request/generation material, composition is:

```javascript
import {
  createApollyonDurableAttemptClaimStoreServiceWithLinuxTransactionV2,
} from "./apollyon-durable-attempt-claim-store-transaction-lease-v2.mjs";

const core = createApollyonDurableAttemptClaimStoreServiceWithLinuxTransactionV2({
  root_fd: retainedClaimRootFd,
  claim_uid: claimServiceUid,
  claim_gid: claimServiceGid,
  session_binding_id: sourceSessionBindingId,
  revalidate: revalidateClaimContext,
});

const observed = core.observeAuthorizationWinner({
  authorization_id,
  expected_store_generation_record,
  request_bytes,
});
```

`publishClaim()` uses the same transaction provider. The example supplies no
host provenance: the wrapper must separately establish the root's origin and
the privilege and evidence behind `revalidateClaimContext`. Importing the module
and constructing the core start no process and acquire no lock. Each operation
that passes the provider's acquisition prechecks does launch the fixed helper
described below, including read-only observation.

### Acquisition and lifetime

The provider checks the exact seven-string acquisition context supplied by the
core, including its retained root hash and source-session binding. It opens
`/proc/self/fd/<root_fd>` to obtain a **fresh private open-file description** for
each acquisition. A duplicate of an already locked description would share that
lock; a fresh open lets independent core instances contend even when they use
the same caller FD. Exact BigInt root identity and timestamps are checked across
the borrowed and private descriptors before and after acquisition.

The only helper invocation is:

```text
/usr/bin/flock --exclusive --nonblock --conflict-exit-code 75 3
```

The parent's private descriptor is passed as child FD 3. Linux associates this
advisory lock with the open-file description, so the parent's retained reference
keeps the lock after the helper exits. The provider holds it through recovery,
publication or observation, final record rereads, and all core-owned descriptor
cleanup. It then rechecks its private root snapshot and attempts one close.
There is no unlock subprocess or lock-file unlink/recreation. Linux releases
the lock when its last descriptor reference closes; abrupt process exit likewise
releases it once no reference remains. These lifetime semantics follow
[`flock(2)`](https://man7.org/linux/man-pages/man2/flock.2.html), with the inherited
FD handoff supported by Node's
[`options.stdio`](https://nodejs.org/api/child_process.html#optionsstdio).

The helper runs directly with `shell:false`, working directory `/`, and only
`PATH=/usr/bin:/bin`, `LANG=C` and `LC_ALL=C` in its environment. Stdin and stdout
are ignored; stderr has an 8,192-byte capture limit. The synchronous launch
specifies a 5,000 ms timeout and `SIGKILL`. A spawn error, timeout, signal,
buffer-limit failure or unexpected exit fails acquisition. These are the configured
[`spawnSync` limits](https://nodejs.org/api/child_process.html#child_processspawnsynccommand-args-options);
the call waits for helper termination and supplies no lock-wait retry loop.

### Failure and authority boundary

Exit 75 produces `apollyon_claim_store_lease_v2_busy`. The core wraps failed
acquisition as `apollyon_claim_store_impl_v2_transaction_acquisition_failed`,
retaining the provider error as its cause. BUSY, other acquisition failures and
release failures make that instance unusable. Acquisition failure closes any
private descriptor already opened; every close is attempted once because a
failed close may already have recycled the FD. There is no automatic retry.
A transaction-body error followed by successful cleanup/release retains the
core's existing retry/recovery behavior. Release failure suppresses success,
preserves the core's cleanup classification and does not imply rollback.

This is **advisory exclusion among cooperating operations on the same inode**.
It does not prevent an actor that ignores the lock from writing, replacing the
root or starting a migration. It does not authenticate `/usr/bin/flock`, the
installed source or the caller's root path. Those installed-custody and policy
checks remain unproven, as do privileged terminal revalidation, exclusion of
nonparticipating writers, and serialization across root replacement/migration.
No protected-origin, capability-issuance, training or production authority field
is promoted by selecting this factory.

## Read-only authorization-winner observation

The same core exposes:

```javascript
core.observeAuthorizationWinner({
  authorization_id,
  expected_store_generation_record,
  request_bytes,
});
```

Input contains exactly those three own enumerable data properties. Proxies,
accessors, extra fields and a non-Buffer request are rejected. The request is
copied into private, unpooled storage using captured copy intrinsics before it
is parsed. Later caller changes to the request or its entire backing buffer
cannot change the validated request used by this operation.

The method derives the authorization-slot ID with the accepted V1 parent
helper from the validated authorization ID, `attempt_limit:1` and
`automatic_retry_authorized:false`. It accepts no caller-selected slot record
or filename. It obtains the same synchronous lease using the same seven-field
acquisition context, and shares the publisher's guard and unusable-instance
state. It invokes no publication revalidation callbacks.

Within the lease, it holds its owned root, the generation/slot/claim
directories, and four files: active generation, immutable generation, the
derived slot, and the claim named by that validated slot. The accepted parent
validators check the records' schemas and content-addressed IDs. Active and
immutable generation bytes must match the expected generation. The slot must
bind the exact claim and original publish-request digest, and the persisted
claim must exactly equal the canonical claim from that request. A final
bounded reread and visible-name check runs with all four file descriptors
still held. All eight core-owned descriptors close before the lease is released
and the result is returned. The Linux composition retains one additional private
root descriptor until that release.

The core issues no write, fsync, link, unlink, rename, truncate, chmod or chown
for observation. It does not open or scan `.pending-v2`, repair interrupted
publication, or create an absent winner. Missing, malformed, replaced,
misbound or incompletely published records produce an error. In particular,
a final record still linked to pending state is rejected by the single-link
policy. Normal filesystem access-time effects and side effects of an injected
lease provider are outside this explicit core-mutation claim. With the Linux
composition, the fixed `flock` process and advisory lock acquisition/release
occur even though observation performs no core store mutation.

The deeply frozen plain result has marker
`VOID_APOLLYON_AUTHORIZATION_WINNER_OBSERVATION_V1` and status
`authorization_winner_observed_source_only`. It contains the authorization,
slot, slot-record, claim, generation and generation-record IDs; SHA-256 hashes
for the slot record, claim record, original publish request and retained root;
and validated copies of the slot, claim and generation records. It exposes no
FD or Buffer. Its explicit boundary fields are:

| Field | Value |
| --- | --- |
| `descriptor_stable_reread_performed` | `true` |
| `visible_namespace_rebind_performed` | `true` |
| `source_filesystem_read_performed` | `true` |
| `source_core_filesystem_mutation_performed` | `false` |
| `protected_store_origin_proven` | `false` |
| `privileged_terminal_receipt_revalidation_performed` | `false` |
| `activation_capability_issuance_authorized` | `false` |
| `training_start_admission` | `false` |
| `training_execution_authorized` | `false` |

This result describes the files observed during that call. It is not a durable
success response, an issuance capability, a privileged terminal-receipt
revalidation, or a guarantee that the namespace will remain unchanged after
return. Runtime integration must establish those distinct prerequisites
before any activation or training decision.

## Create-only durability algorithm

Both slot and claim records use the same bounded publication primitive:

1. create a private random pending leaf in `.pending-v2` with
   `O_RDWR|O_EXCL|O_NOFOLLOW`; read/write access is retained only so the
   service can verify the exact bytes through that same private descriptor;
2. enforce mode/owner/link-count metadata;
3. write exact canonical bytes;
4. file `fsync`;
5. exact same-descriptor reread from byte offset zero;
6. create-only hard-link pending → final and verify that the final name identifies
   the held inode that was fsynced;
7. final-directory `fsync`;
8. unlink the pending name;
9. pending-directory `fsync`;
10. exact final reread and identity comparison while the private descriptor is
    still held, followed by descriptor cleanup.

Hard-link publication is used so the final leaf is never directly partially written and no overwrite API is required.

The link/unlink transition may change link count and change time. Device/inode,
mode, owner/group, size and modification time must still match the file that was
fsynced, and the held inode must match the visible final leaf. The completed
final snapshot is also checked when the transaction acquires its longer-lived
slot/claim observation. Replacing the pending or final name with an identical
byte copy therefore cannot substitute an unflushed inode or pass unnoticed
between the publication primitive and the final revalidation brackets.

An existing exact record, including the `EEXIST` path during publication, is
opened and validated through a held descriptor, then that descriptor and the
target directory are fsynced before a stable reread. Recovery establishes the
durability of the actual existing inode/name; equal bytes or a prior failed
publication alone do not establish it. The observer does not use this recovery
primitive and issues no fsync.

If a crash occurs after the private pending file is durable but **before** its
final hard link is created, retry scans only the deterministic pending prefix
for that exact slot/claim digest. A stale unlinked pending entry is removable
only when mode/owner/link-count/size and exact bytes match the requested record.
Mismatched or excessive stale pending state HOLDs.

If a crash or cleanup failure leaves a final link with `nlink=2`, retry may
remove only the single pending entry whose device/inode exactly equals that
final record and whose deterministic pending prefix matches the expected
slot/claim digest. Ambiguous or foreign pending state HOLDs.

A failure after final publication but before durable cleanup is reported as
indeterminate, never false success.

## Cleanup and transaction failure semantics

Every successfully opened descriptor is registered immediately, including during
partial child-directory acquisition. Cleanup attempts all registered closes in
reverse order, then releases the lease. A failed close is never retried because
the descriptor may already have been closed or reused.

Cleanup failures carry a frozen `cleanup_errors` array of frozen records with
`code`, `role`, and a bounded `error_code`. A cleanup failure without a primary
operation error produces a typed cleanup error. When an operation and cleanup
both fail, the error preserves the primary message/code and original error in
the `cause` chain, and appends all cleanup classifications. Cleanup reads error properties through own data descriptors; an error getter, proxy, or frozen error cannot
interrupt the remaining cleanup attempts. Request bytes and caller arguments
are not copied into diagnostic records.

A failed acquisition, invalid lease, or cleanup failure makes that core instance
unusable for either operation. The acquisition provider owns cleanup of
any partial lock it acquired before throwing or returning an invalid result.
Rejecting acquisition establishes zero **core** filesystem mutation; it does not
assert that an injected provider had no side effects.

Release can fail after records have been published. A normal function that
returns a Promise, a bound async function, or any other non-`undefined` result
fails during cleanup, suppresses success, and makes the instance unusable. Such
publisher errors report `core_store_mutation_may_have_occurred=true`; this is
conservative and is not a rollback claim. Observation cleanup errors report
`core_store_mutation_may_have_occurred=false`, while still suppressing the
result and poisoning the shared instance. Descriptor cleanup errors retain their specific
primary classification. An otherwise successful transaction followed by failed
release reports `apollyon_claim_store_impl_v2_transaction_cleanup_indeterminate`.
Genuine Promise rejections are observed through the captured native Promise
method while the unsupported result is rejected; arbitrary thenables are never
invoked or awaited.

The per-core reentry guard starts before request validation and remains active
through acquisition, all revalidation stages, descriptor cleanup and release.
It is cleared in the outermost `finally`, independently of the unusable-instance
state. A provider cannot use a nested publish or observe call to enter a second
operation on that core.

## Source-only revalidation boundary

The three required revalidation stages are:

```text
before_slot_publication
after_slot_before_claim
before_success_ack
```

Each publication stage is bracketed by held active + immutable generation
rereads, persisted slot/claim rereads when present, and namespace checks.

The callback receipt is exact-schema and binds:

- source-session binding ID;
- publish-request SHA-256;
- store generation and generation-record IDs;
- authorization-slot ID + record ID;
- claim-record ID;
- exact stage.

However, a **caller-supplied callback is not host provenance**. Likewise, a
caller-supplied acquisition lease is not proof of system-wide serialization.
The Linux composition supplies an actual advisory lock for cooperating callers;
it does not establish universal participation or authenticate the revalidator.

These are narrow injectable interfaces so the store algorithm can be
deterministically tested before the later native/Xiphos integration binds them
to reviewed kernel process/session evidence and the installed store's complete
serialization policy.

The source interface enforces acquisition before core mutation and successful
synchronous cleanup before returning success. Native/runtime integration must
still prove that every permitted writer and migration uses the same lock domain
for that complete lifetime. No JSON receipt or configured UID substitutes for
that host evidence.

## Hosted adversarial proof

The focused proof uses only disposable private temporary roots. It proves:

- root claim UID/GID are rejected before store use;
- exact publisher bytes survive input mutation, returned Buffer and whole
  ArrayBuffer mutation, nested request mutation, and overridden copy methods;
- malformed/noncanonical requests reject;
- retained root identity is bound to generation records;
- active and immutable generation records must match;
- slot is durable before claim publication;
- pending-file fsync → hard-link → directory-fsync → cleanup ordering;
- final exact reread;
- exact replay is idempotent;
- a different claim for the same authorization is rejected;
- failure after durable slot / before claim recovers only that same bound claim;
- failure after claim hard-link / before pending cleanup produces indeterminate
  state, then exact retry reconciles the nlink-2 generation and succeeds;
- failure after pending fsync / before claim hard-link leaves an unlinked exact
  pending file, then retry cleans only that exact stale generation and succeeds;
- the earlier Promise-wrapping callback API is rejected without invocation;
- invalid acquisition results reject before core filesystem mutation;
- lease fields are checked without invoking caller getters or proxy traps;
- acquisition, revalidation and release cannot reenter publication;
- later configuration/lease mutation cannot replace captured functions;
- release occurs once, after descriptor cleanup, on success and operation failure;
- partial directory-open failure closes every previously acquired descriptor;
- failed closes do not prevent later closes or lease release, and are not retried;
- primary errors survive combined close/release failures with frozen diagnostics;
- failed or non-void release suppresses success and blocks reuse of that core;
- generation drift introduced by revalidation callback rejects before mutation;
- initial-to-read permission/link-count drift and same-byte inode or timestamp
  changes reject;
- directory replacement at every publication revalidation stage rejects;
- final slot/claim permission changes inside `before_success_ack` reject;
- same-byte pending/final inode substitution at publication and during handoff
  to the held transaction records rejects;
- recovery fsyncs the actual validated existing inode and its target directory
  before returning durable success;
- read-only observation succeeds on an exact published winner with no core
  mutation syscall, pending recovery, or revalidation callback;
- observation holds and closes all eight core descriptors before releasing its lease;
- absence, partial publication, symlinks, FIFO/socket entries, oversize or
  malformed records cannot produce a winner observation;
- bounded EOF, nanosecond metadata and visible-leaf rechecks reject changed
  records, including device/inode values outside Number's exact range;
- caller FD reuse cannot redirect an operation after root duplication;
- observation cleanup failure reports no core mutation and blocks both APIs;
- the shared guard rejects nested calls across publishing and observing;
- orphan claim without slot rejects;
- asynchronous prepublication revalidation and asynchronous acquisition reject
  before core publication.

The Linux composition adds real same-process and cross-process contention
checks for publishing and observing, including distinct sessions using the
same borrowed root FD, independent store roots, all three publication stages
and the end of core descriptor cleanup. It verifies availability after release
and after terminating only a disposable owner process. It also exercises
read-only observation, exact helper options, invalid factory configurations,
borrowed-FD reuse, root drift, injected helper failures and uncertain close
results. Acquisition failures must preserve the store and reject poisoned-instance
reuse; release errors after publication remain indeterminate and do not imply rollback.

The proof mutates only disposable CI filesystem state. It does not contact Xiphos.
The composed-provider cases also run the fixed local `flock` helper and disposable
contender processes; the core-only cases retain their injected lease seam.

## Deliberate non-authority

This generation reports implementation source as present, but keeps all live authority false:

```text
caller_supplied_exclusive_transaction_is_host_proof=false
caller_supplied_revalidator_is_host_proof=false
native_peer_runtime_integration_present=false
af_unix_listener_implementation_present=false
privileged_revalidator_runtime_integration_present=false
publisher_runtime_process_integration_present=false
installed_source_custody_proven=false
protected_store_origin_proven=false
cross_uid_host_qualification_performed=false
kernel_peer_authentication_performed=false
direct_parent_lineage_proven=false
privileged_revalidation_performed=false
challenge_exchange_performed=false
xiphos_execution_performed=false
production_claim_store_mutation_performed=false
production_durable_attempt_claim_performed=false
attempt_claim_authorized=false
training_start_admission=false
training_execution_authorized=false
training_execution_performed=false
operator_private_key_access=false
signing=false
wallet_access=false
transaction=false
funds_movement=false
```

## Next gate

`apollyon_durable_attempt_claim_store_service_runtime_integration_v2`.

That gate must bind the source core and transaction composition to the accepted
native peer/process/revalidator primitives, authenticate installed helper/source
custody and the root capability, and prove that all permitted writers and
migrations share the required lock domain. Separate installed Xiphos
qualification remains required before any production claim mutation can be
considered.

**PROTECT THE CORE.**
