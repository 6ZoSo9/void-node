# Apollyon durable attempt-claim store service source implementation V2

Marker:
`VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_V2`.

Status: **source/test integration of the durable core, Linux transaction lease, inherited publisher-pipe reader, retained native peer checks and one-use paired socket/challenge session. Installed service and privileged host qualification remain unproven**.

## Flattened current generation (October 19, 2026)

This PR now directly targets #3357 at
`1b60642d980b76c13130d5124d83a22c2c01ec30` and contains the complete
former #3488 eight-file claim-store/native-session implementation plus the
subsequent generation-input and callback-boundary hardening. The direct diff is
exactly those eight added files and zero behind.

The flattened source preserves descriptor-bound durable publication, Linux
transaction leasing, one-use native peer/session composition, strict caller
record prevalidation, getter-free synchronous callback rejection, and all
negative authority. The former #3488 PR is no longer a required intermediate
source dependency once this generation qualifies on the direct base.

## Purpose

The accepted Apollyon claim-store stack defined all of the pieces surrounding a durable claim writer, but the concrete service core was still missing:

- #3276 defined the fixed service/store policy and path roles;
- #3285 froze exact six-key request framing and `publish_request_sha256`;
- #3291/#3300/#3306/#3309 defined the privileged handoff, native peer/process provenance requirements, and kernel primitives;
- #3357 added the authorization-wide create-once winner slot.

Without this implementation, later training-start protected-store revalidation could not truthfully name concrete claim/slot/generation leaf paths.

This gate provides the reusable synchronous store/publisher core, an actual
read-only authorization-winner observation method, the physical store namespace,
a Linux composition that supplies a real advisory transaction lock, and a native
bridge that reads the actual inherited publisher pipe and retains kernel peer
handles across store operations. A separate one-use session composes actual
publisher socket bytes, a fresh control-peer challenge, durable publication and
a bounded publisher response through that same core. Both store operations bind
record reads to held
descriptors and recheck the visible names within the supplied root. The Linux
composition serializes cooperating operations on that same root inode. The native
bridge reuses the accepted process observer in the Node process. An installed
service wrapper, protected expected-identity/root origin, privileged role admission
and revalidation, and exclusion of other writers or root
migrations remain separate work.

## Exact parent

Base: accepted #3357 exact head
`1b60642d980b76c13130d5124d83a22c2c01ec30`.

Important exact source generations:

- authorization-slot V1:
  `c2ff992a09fe916a5016b5a6c4ceced4ab1d2fa8`;
- exact request envelope V2:
  `339916ce4a6216af9a73476ad5b78e2d7a300f73`;
- protected store contract V2:
  `6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe`;
- inert store-service candidate V2:
  `87019ae1245a2054407dd47835b0b7a891d4d9a2`;
- native peer integration V2:
  `5532d18603ab9b4f400082c6fac265c58672ed85`;
- shared canonicalizer:
  `f97fafb0148527ae3a954e2752faef8c7fc9e88e`;
- terminal receipt:
  `e27f0ebb968f4611bfc069670325c3f5e6df1c65`;
- live source/session binding:
  `981935515e08634be96446e58922c16be56d33ad`;
- revalidation handoff:
  `3feed7f71fb6941f8feccf393f151fa9e973d7a4`.

The Linux composition uses the same implementation core, now at Git blob
`65a11b36cfe7408b7718b6827b260ea52d5048b4`. Its source is
`tools/apollyon-durable-attempt-claim-store-transaction-lease-v2.mjs`, blob
`f485b9e6fc29eab549ebba07e1b49f24c7659092`. The Linux lease blob is unchanged. The core changes in this rebind only in its
four immutable upstream source-generation pins. The bridge links these exact accepted #3309 sources,
already present in the base, without modifying them:

- `ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c`:
  `ecc262686cdc388d08775c735c68430e737e40d5`;
- `ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.h`:
  `5355ffd2856e0f0c57f6e52fd1b347441b94e4d7`.

The existing PR owns eight ADD-only files relative to #3357: the core, Linux
lease, native C bridge, native JS adapter, the two focused proofs, this document
and the focused workflow. The older proof changes only its trigger-closure list;
its 92 existing proof markers remain required. The focused workflow pins the
final native source/proof blobs and the exact current dependency generation.

## October 18 current-parent reconciliation

The current parent is #3357 `1b60642d980b76c13130d5124d83a22c2c01ec30`.
Its previous accepted generation `4e7d433a4141b4a7cad7fb001d0800dccb1b5ec2`
remains the existing Draft's first-parent ancestor. The new parent imports the
repaired native process identity lineage without altering the claim replay-key
contract. Complete nontruncated parent-tree comparison finds 358 upstream
changed files, none overlapping the eight files owned by this Draft.

This integration updates exact immutable pins only: authorization-slot V1,
request-envelope V2, inert store-service candidate V2 and native-peer integration
V2. Their revalidation-handoff and native-guard proof source generations are also
rebound in the focused workflow. The durable core's publication/observation
algorithms, Linux lease, native addon, JS bridge, kernel process-identity
implementation and role/host-negative authority markers are unchanged.

A new parent does not confer protected installed identity, privileged
revalidation, protected runner origin, or live Xiphos claim/training authority.
All descendants binding this store source generation must separately qualify
their exact accepted blobs. Keep Draft until distinct exact-head source review
and designated-host integration gates are satisfied.

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

## Prevalidation and bounded caller inputs

The public source APIs now reject malformed or oversized caller-controlled
material before performing avoidable private allocation or structured cloning:

- publisher/request buffers must be between 3 and 65,536 bytes before the core
  allocates its private copy;
- operation/config own-key cardinality and allowlists are checked with
  `Reflect.ownKeys` before a full descriptor map is captured;
- store-generation records are snapshotted as exact primitive data records
  before the local validator performs content-address calculations; and
- authorization-slot records are snapshotted against the exact parent key
  schema as primitive data before the parent slot validator is invoked.

These checks do not replace the accepted semantic validators. They constrain
the caller-controlled envelope first, then pass the bounded primitive snapshot
to the existing canonical/content-addressed validation. The focused proof
requires oversized request bytes, a 4,096-extra-key operation object, a nested
generation field, and a nested slot field to fail before transaction
acquisition or the targeted descriptor/structured-clone operation.

## Exact publisher forwarding

`prepareApollyonDurableAttemptClaimPublisherForwardV2()` accepts only a Buffer containing the exact canonical #3285 request frame.

It first enforces the accepted 3..65,536-byte request bound, then copies the exact frame into privately owned, unpooled storage before semantic validation.
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

The native adapter now supplies this helper with bytes read from the actual
inherited pipe, through
`readApollyonDurableAttemptClaimPublisherForwardFromInheritedPipeV2()`.
The helper alone remains an in-memory operation; the new entrypoint is the
concrete pipe reader described below.

## Native inherited publisher pipe

`tools/apollyon-durable-attempt-claim-store-native-bridge-v2.mjs` lazily loads the
single fixed build output
`build/Release/apollyon_claim_store_native_bridge_v2.node`. It accepts no runtime
module path, request path, descriptor selector or alternate input source. Import
alone does not load the addon or consume a pipe.

The public pipe entrypoint accepts no arguments and calls the native
`readInheritedPublisherRequest()` once. Native code consumes one process-wide
attempt, including failed or partial reads, across environments loading the same
canonical addon image. Initialization pins that already-loaded image with
`RTLD_NOLOAD | RTLD_NOW | RTLD_NODELETE` and balances the temporary loader
reference. A Worker unloading its environment therefore cannot reset the atomic
limit before another environment loads the same addon. Pinning failure prevents
module initialization; `RTLD_NOLOAD` does not load a new library. A second read
cannot resume a partial request. This is a source invariant for that addon; it
does not establish custody over arbitrary other native code loaded into the
process or confer protected origin on the addon itself.

The native reader requires inherited **FD 3**, an anonymous Linux pipe on
`PIPEFS_MAGIC`, with FIFO type and read-only, already-`O_NONBLOCK` access. A
regular file, named FIFO, socket, writable pipe or blocking pipe is rejected.
It duplicates the descriptor with `F_DUPFD_CLOEXEC`, compares the borrowed and
private identities around duplication, and keeps only the private duplicate as
its reader. The original FD 3 remains borrowed and is not closed by this API.

Descriptor duplication is necessary here: a root-created mode-0600 pipe remains
readable through its inherited descriptor after the child drops privileges,
while reopening `/proc/self/fd/3` would apply a new pathname permission check.
The native reader never reopens that path and never changes the pipe's status
flags. Its duplicate shares the original open-file description; the handoff must
preserve `O_NONBLOCK` and exclusive reader custody for the operation. The source
rechecks identity/flags before reads, but does not claim to constrain an arbitrary
other thread or holder that changes shared flags between a check and a syscall.

Reading uses `CLOCK_MONOTONIC` and `poll` under one five-second total deadline.
At most 65,536 bytes plus a one-byte oversize probe are read. Success requires
EOF within the deadline, final descriptor validation and clean closure of the
private descriptor. Oversize input, missing EOF, invalid poll/read outcomes,
identity drift and uncertain cleanup fail closed. Native cleanup sets a descriptor
aside before any close and never retries a close result.

Only after native cleanup succeeds is a copied Buffer returned directly to the
existing canonical request parser and private forwarding helper. Truncated,
malformed, noncanonical and trailing request data therefore fail through the
same accepted parser. There is no request reconstruction or digest substitution.

This entrypoint implements actual inherited-pipe I/O. It does not authenticate the
pipe's producer or establish the privileged launcher's installed source. The
separate paired-session entrypoint below implements the socket/challenge path.

## Retained native peer and canonical store composition

`createApollyonDurableAttemptClaimStoreServiceWithNativePeerV2(config)` accepts
exactly the Linux factory's five own data fields plus `peer_identity`:

| Field | Required source input |
| --- | --- |
| `root_fd` | Retained root descriptor accepted by the existing core |
| `claim_uid`, `claim_gid` | Existing non-root claim identity policy |
| `session_binding_id` | Existing exact source-session ID |
| `revalidate` | Synchronous local policy callback |
| `peer_identity` | Exact expected-peer data below |

The exact peer data comprises `socket_fd`, `expected_ppid`, `expected_uid`,
`expected_gid`, `expected_supplementary_gids`, `expected_executable_fd` and
`expected_cmdline_bytes`. Peer UIDs/GIDs may include zero as observation inputs;
this does not admit a privileged role. The store's separate non-root identity
rule is unchanged. The adapter rejects proxies, accessors, extra keys, sparse or
duplicate groups, shared cmdline backing, and non-Buffer or unbounded cmdline
input. The cmdline is copied with a captured typed-array intrinsic before native
acquisition; an input-owned `byteLength` or copy method is not invoked.

The C addon obtains the actual peer PID/UID/GID from `SO_PEERCRED` on a connected
AF_UNIX stream socket. The caller does not provide an asserted peer PID. The
addon privately duplicates the socket and expected-executable descriptors,
copies the exact cmdline/group policy, and invokes the unchanged #3309 observer.
That observer checks PPid, PID/start generation, all UID/GID slots, the exact
supplementary group set, raw cmdline and executable inode, while retaining a
pidfd for the observed generation.

The native handle is an environment-owned, type-tagged opaque object. It exposes
no PID, pidfd, descriptor number or caller-editable identity receipt. Every
revalidation checks the original retained pidfd and descriptors, repeats kernel
socket credentials, invokes a fresh #3309 observation, compares it to the original
generation, explicitly closes the temporary pidfd, and checks the original
retained state again. Closing or reusing the caller's original socket/executable
FD numbers after construction cannot redirect the private handle. Executable
metadata is also retained, including size and nanosecond modification/change
timestamps. These observations do not confer protected origin on the expected
executable FD or identify the body of an interpreted script.

A peer may half-close its write side to supply the accepted EOF framing while
remaining alive. That condition is accepted; a full transport hangup or an exited
pidfd is rejected. This reusable one-peer adapter does not consume socket request
bytes or send a challenge. The paired-session API below adds those operations.

The JS factory creates the real Linux transaction core and keeps its raw methods
private. Its wrapped publication method performs native checks before and after
each existing local revalidation callback and before/after the whole operation.
Its read-only observation method performs native checks around that operation
without adding a local revalidation callback or store mutation. The original
native handle remains owned through core descriptor cleanup and lock release.
A peer failure even at that final boundary suppresses the result.

Local callback receipts are captured as a frozen null-prototype object containing
only the existing 13 primitive fields before the native post-check. Thus neither
an inherited `then` getter nor nested property getters can execute later through
the core's receipt processing. Async/generator callbacks are refused; a returned
native Promise is rejected and its rejection is observed through the captured
Promise intrinsic. The core still validates the exact accepted receipt values.

A successful source operation leaves this reusable one-peer adapter available for the next
operation. Call `close()` explicitly when the session is finished; success does
not depend on garbage collection. Every failure after an operation starts closes and poisons the
adapter. Later publish/observe/close calls fail without revisiting released FD
numbers. Reentry, including closing during an active operation, is refused.
Native failure attempts all owned descriptor cleanups and reports frozen error
rows with resource, code and errno. A prior failed close can be reported again
without retrying the underlying close. Environment cleanup is only a fallback.

Publication errors after entering the core conservatively report that store
mutation may have occurred; this is not rollback. Observation errors retain a
false core-mutation classification. The underlying core's successful outcomes and
authority fields are returned unchanged. The adapter itself reports native peer
integration present, with protected expected-identity origin, privileged peer
role admission and challenge exchange explicitly false.

The tests use controlled same-UID peer processes. Linux permission failures while
observing a root revalidator from a non-root capability-empty process must still
fail closed. This addon does not bypass cross-UID `/proc` permissions, install
single-thread process guards in Node, or satisfy full privileged current-host
revalidation merely because its source fixture passes.

## One-use paired socket and challenge session

`createApollyonDurableAttemptClaimStoreServiceWithNativeSessionV2(config)` adds a
complete source transport around the unchanged Linux transaction core. Its
configuration has exactly seven own data fields:

| Field | Required source input |
| --- | --- |
| `root_fd` | Retained root descriptor accepted by the existing core |
| `claim_uid`, `claim_gid` | Existing non-root claim identity policy |
| `session_binding_id` | Existing exact source-session ID |
| `revalidate` | Synchronous local policy callback |
| `control_peer_identity` | The seven-field expected-peer policy above |
| `publisher_peer_identity` | The seven-field expected-peer policy above |

The returned frozen object exposes only `servePublisherRequest({
expected_store_generation_record })` and `close()`, alongside source metadata.
It does not expose the raw core's publish or observation methods. Construction
opens and observes the control handle first, then the publisher handle. This
ordering does not establish when the already-connected sockets arrived.

The native pair must contain distinct handles, sockets and actual peer PIDs.
The publisher's observed direct PPid must equal the retained control PID. Both
handles retain their original socket, executable and pidfd through the whole
operation. The addon repeats the complete accepted #3309 observation for both
peers before and after transport and callback boundaries. Private environment-local
handle/pair identifiers and one-way phases bind the same two handles from the
first request read onward; substituting a handle, re-pairing a consumed handle
or repeating a transport phase rejects and closes the affected owned peers.

This is a generic source pair. Controlled same-UID parent/child fixtures prove
actual kernel lineage and the complete transport/store sequence. They do not
admit the installed privileged revalidator role. A non-root, capability-empty
claim writer cannot treat inaccessible root-peer `/proc` observations as a
successful check; the accepted observer still rejects them. The bridge changes
no credentials and supplies no privileged broker or permission bypass.

### Socket custody and framing

Both service-side sockets must already have `SO_OOBINLINE=1` and
`SO_PEEK_OFF=-1`. These are checked preconditions, including at later peer
boundaries. Native code does not set either option or change shared nonblocking
flags. Inline urgent data prevents ordinary Linux AF_UNIX reads from silently
skipping an urgent byte; the default peek offset prevents a prechallenge peek
from starting after queued bytes. Observed `POLLPRI` is rejected as well.
The Linux [socket option documentation](https://man7.org/linux/man-pages/man7/socket.7.html)
describes both options; the Linux
[AF_UNIX receive path](https://github.com/torvalds/linux/blob/master/net/unix/af_unix.c)
implements urgent-byte skipping when inline delivery is disabled. The handoff must preserve these settings and
exclusive endpoint custody. Rechecks do not constrain another holder changing
shared socket state between a check and a syscall.

All I/O uses per-call `MSG_DONTWAIT`; sends also use `MSG_NOSIGNAL`.
Receives use `recvmsg` with no ancillary buffer and reject `MSG_CTRUNC` or
`MSG_TRUNC`, including descriptor rights that cannot fit that buffer. No received
descriptor is exposed to JS. Each transport operation uses a single
five-second `CLOCK_MONOTONIC` deadline, rather than restarting a timeout after
every fragment:

| Phase | Exact behavior |
| --- | --- |
| Publisher request | Read 1..65,536 bytes and a one-byte oversize probe; require publisher write-side EOF before proceeding |
| Control challenge | Reject already-queued control bytes or EOF; generate 32 bytes with nonblocking `getrandom`, send them, and receive exactly 64 bytes plus EOF under one shared deadline |
| Challenge response | Require `challenge[32] || SHA-256(actual publisher request bytes)[32]`; reject a wrong echo, digest, length, trailing data or missing EOF |
| Publisher response | Send the qualified canonical core success record plus LF, bounded by 65,536 bytes, then shut down only the service's publisher write side |

The challenge has no caller-provided nonce or random fallback. A failed or
partially completed phase consumes the session. The control channel carries the
challenge only; it receives no separate claim-success response.

### Publication and response boundary

`servePublisherRequest` consumes the JS session before validating its arguments
or beginning I/O. It captures all expected-generation fields into frozen,
null-prototype primitive data before blocking. Later caller mutation cannot
replace that expected generation. The existing request parser accepts the bytes
actually read from the retained publisher socket, and the original frame and
digest remain private. The adapter derives the accepted authorization slot from
that parsed claim and digest; callers supply neither request bytes nor a slot.

The unchanged core validates the captured generation and request, acquires the
Linux lease and holds its generation descriptors. Its first
`before_slot_publication` callback performs the fresh native challenge exchange
before pending-state recovery or any core store mutation. The local revalidator
then runs, followed by the second native pair check. The adapter enforces exactly
the core's three existing stages in order and captures each receipt's 13
primitive fields before handing it back to the core. An inherited
`Object.prototype.toJSON` property, including one installed by the callback,
rejects before the parent validators can invoke it during canonicalization.

The core completes slot-first durable publication, final held-record rereads,
all descriptor closes and Linux lease release before the adapter attempts a
success response. The adapter rechecks both retained peers, qualifies the core's
existing success-response schema against the actual request, serializes the
flat primitive record as sorted canonical JSON plus LF, rechecks the pair, and
calls the native bounded send. It then explicitly closes the publisher and
control handles before returning locally. No successful session relies on
garbage collection or permits a second request.

The peers must remain alive throughout. A full publisher transport hangup is
accepted only after native code records its own successful final `SHUT_WR`:
both sides have then legitimately half-closed their writes. Even in that terminal
phase the pidfd, socket credentials, executable, command line and error state
must still pass revalidation. An earlier full hangup remains an error.

Once response bytes have entered the socket, a later error cannot revoke them.
The checks required to begin the response and all core cleanup precede the first
success byte, but a
partial send, final shutdown/check failure or native close failure can still
leave response delivery uncertain. Such errors preserve the primary cause and
all cleanup rows, report `response_delivery_may_have_occurred=true` from entry
into native send, and leave the session consumed. This flag is conservative;
it is not an acknowledgement or permission to retry. Core-entry failures also
retain `core_store_mutation_may_have_occurred` without promising rollback.

A successful local result preserves every original core outcome/authority field
and adds a frozen `native_session` report. That report states actual socket input,
request-derived digest, observed direct-parent lineage, completed challenge and
response transmission, and explicit native-handle cleanup. It keeps
`response_receipt_confirmed=false`,
`protected_expected_identity_origin_proven=false`,
`privileged_peer_role_admission_performed=false` and
`cross_uid_host_qualification_performed=false`. The factory also keeps fixed
listener origin and connection arrival order unproven. These fields distinguish
the source transport evidence from the unchanged core's authority fields.

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

The native bridge now composes actual retained kernel process/peer checks around
that callback through the same core. The callback still supplies local policy
evidence; the bridge does not turn it into privileged terminal/custody/current-host
revalidation. Installed role admission and the complete serialization policy remain
separate requirements.

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

The separate native proof compiles the exact addon and unchanged #3309 observer
using only C Node-API version 8 and public Node headers. It copies the imported
source closure into a disposable snapshot; neither a compiled addon nor test
fixture is added to the repository. The focused workflow runs this proof on all
supported Node majors, **22, 24 and 26**.

Its regular fixtures cover actual anonymous pipes, fragmented canonical input,
the exact byte limit, oversize input, a five-second missing-EOF failure, wrong
descriptor types/directions/flags, malformed frames and clean private-descriptor
release. A first Worker consumes the request and exits before the main
environment first loads the addon; the second read must still reject.

The peer creates its own connected socketpair and transfers a descriptor over a
separate fixture control socket, so the kernel peer credentials identify the
intended process. These fixtures prove retained descriptors, private policy
copies, wrong identity rejection, peer exit and exec, opaque/closed handle
rejection, half-close compatibility and full connection failure. Composed tests
publish and read an exact winner through the actual Linux lease, reject input and
receipt getter attacks, preserve read-only observation, and suppress success when
the peer fails at any publication boundary or during the final core cleanup.

The paired-session fixtures use a real control process that directly forks its
publisher. Each peer creates its own socketpair after that fork and transfers the
service endpoint over a separate fixture-only channel; the process named by
`SO_PEERCRED` is therefore the actual intended parent or child. The fixtures
exercise the complete socket-to-store-to-response path under the actual Linux
lease, exact 65,536-byte transport limits, real send-buffer backpressure, all
three five-second deadlines, fresh challenge/digest binding, both EOF boundaries,
early and urgent control input, incompatible socket options, and attempted
handle re-pairing. Actual `SCM_RIGHTS` injections on otherwise valid publisher
and challenge-response frames must reject and preserve the receiver's descriptor
set. They also check expected-generation capture, callback getter
and async rejection, reentry, peer failures at the publication/cleanup boundaries,
preserved durable-winner observation, and explicit cleanup of both handles.

After those ordinary fixtures pass against the production build, a second
temporary build uses a test-only `--wrap=close` linker wrapper. Three original cases
actually close a retained or temporary pidfd, recycle its number to `/dev/null`,
and return `EIO`. The proof checks cleanup of the other private descriptors,
frozen diagnostics, preservation of a simultaneous primary transport error, and
that repeated close/revalidation never touches the recycled descriptor. The
production source has no injection hook or additional export. A third temporary
build adds `--wrap=send` for two session cases: a send that first transmits a real
prefix and then fails, and a successful response followed by an uncertain native
close. Both preserve the durable winner and report possible response delivery;
neither claims to retract already-sent bytes or authorize a session retry.
The mandatory native suite contains 64 unwrapped cases (29 existing and 35 paired
session cases), five fault cases, and 70 required result markers. The separate
core/lease and root-owned-pipe suites retain their 92 and four markers.

A separate root-owned pipe mode begins with UID0, creates a mode-0600 anonymous
pipe and launches only a disposable UID/GID1000 reader. That child proves that
pathname reopening is denied while inherited-descriptor duplication reads the
exact fragmented frame and EOF. This is a credential-drop I/O fixture, not
privileged revalidator or installed-host qualification. The CI workflow confines
its temporary UID0 invocation to this pipe fixture.

## Deliberate non-authority

The core-only API retains `native_peer_runtime_integration_present=false`; each
native adapter reports its own native integration as present. The paired
session additionally reports its actual observed lineage, challenge exchange and
response transmission in `native_session`. These source observations do not
promote the core outcome to installed or privileged authority. The unchanged
core's authority fields remain false:

```text
caller_supplied_exclusive_transaction_is_host_proof=false
caller_supplied_revalidator_is_host_proof=false
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

The single-use source challenge/response and exact socket framing are now
implemented over a retained actual parent/child pair. The next integration must
admit the distinct publisher and privileged revalidator roles from protected
expected-identity evidence and establish the installed listener, handoff custody
and connection order. The full privileged terminal/custody/current-host checks,
cross-UID observation, installed helper/source custody and protected root
capability still require integration and qualification. Protected-origin work
remains a separate owned gate; a same-UID source fixture is not its substitute.
All permitted writers and migrations must share the required lock domain.
Separate installed Xiphos qualification remains required before any production
claim mutation can be considered.

**PROTECT THE CORE.**

## October 19 — revalidator response prevalidation successor

This add-only *child change to the source implementation* is based on the
independently CI-green #3488 head `f9bef920c66c3499a19b731ddd5827a2d8fab5a0`.
It supersedes the overlapping generation-only experiment in draft #3538
without rewriting either existing branch. The original parent maintains
bounded byte copying, descriptor preflight and exact primitive generation/slot
schema checks.

The direct core callback `revalidate(stage, context)` returns an untrusted
receipt-like value even if the callback function itself has been admitted.
Previously `callRevalidator` read `result.then` and
`validateRevalidationReceipt` passed the result to `structuredClone`
before checking property descriptors. Native JS getters can execute during
either operation, and deeply nested data can consume resources before the
exact closed schema is enforced. A callback's authority must not transitively
authorize arbitrary getters or forged thenables.

The repair keeps the accepted `source_contract_only=true` local receipt and
its exact content binding, but snapshots its exact own primitive fields using
the existing descriptor-only preflight. Active/revoked Proxies, accessors,
unexpected hidden/symbol keys, nested objects and oversized strings are
rejected without invoking hostile getters or Proxy traps. Native Promises
are recognized with `util.types.isPromise` instead of reading `.then`, and
their rejection handlers are attached through the retained native method.
The source also bounds primitive generation/authorization-slot strings to
1–256 characters before the existing semantic validators, matching the
already bounded native-session primitive-data transport.

The disposable proof exercises malformed callback receipt classes before
any slot/claim publication, requires a normally released lease, and checks
unchanged fixture store bytes. It also ports #3538's direct-core hostile
generation cases across *both* publication and observation: getters,
revoked/active Proxies, coercion values, hidden/symbol keys, empty and
oversized strings must be rejected before lease acquisition.

This is a source-only test candidate. It does **not** install services,
grant protected claim/slot origin, admit privileged roles, prove
cross-UID Xiphos behavior, issue activation credentials, authorize training,
perform signing, or move funds. Any actual authorizer still requires the
independent protected origin/host composition gates and code review.

**PROTECT THE CORE.**

## Getter-free forbidden-Promise and thrown-value boundary (October 19, 2026)

The reusable core is synchronous. A native Promise returned by transaction
acquisition, transaction release, or the revalidator is therefore rejected
without attempting to observe it. The core no longer invokes an intrinsic
`Promise.prototype.then`, attaches a handler, performs species construction,
or reads any Promise `constructor` property. This closes the case where a
native Promise has a hostile own `constructor` accessor.

A value thrown by the revalidator is also never formatted from caller
properties. The core emits the fixed internal code
`apollyon_claim_store_impl_v2_revalidation_failed:<stage>` and preserves the
original thrown value only as `Error.cause`; it does not read `message`,
coerce the object, or invoke `Symbol.toPrimitive`.

Hosted regressions require zero Promise-constructor getter calls and zero
thrown-value getter/coercion calls while the store remains unchanged and the
transaction lease is released. These source defenses do not establish
installed protected origin, privileged role admission, production claim
publication, training, credentials, transactions, or funds authority.
