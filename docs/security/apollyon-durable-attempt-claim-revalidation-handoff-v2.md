# Apollyon durable attempt-claim privileged revalidation handoff v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REVALIDATION_HANDOFF_V2`

Status: **pure source/test contract; no implementation or host action**.

## Purpose

Accepted #3285 closes the durable claim request marker/version/framing contract,
but the least-authority publisher and claim service still cannot independently
perform every privileged current-host, terminal-receipt and custody revalidation
required by #3233.

This gate closes the provenance design gap **without adding an attestation
object, bearer token, or field to the accepted six-key publish request**.

## Exact source dependencies

The contract pins:

- #3285 accepted repaired head
  `f736a51f6bc02ba40d89d3d6f32c09c28c0ea897`, request-envelope blob
  `339916ce4a6216af9a73476ad5b78e2d7a300f73`;
- #3276 accepted repaired head
  `68cbfbdd7a025e7a69403c9d072b0cbf70ceed0e`, service-candidate blob
  `87019ae1245a2054407dd47835b0b7a891d4d9a2`;
- #3233 store-contract blob
  `6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe`;
- reviewed native kernel peer-generation reference
  `d8b30ac499c3bb8a5d223dbc6be687dd175be611`.

The last item is a **reference pattern only**, not host authority. The repaired
#3276 candidate transitively binds the fresh live-process credential exclusion
and host PID/user-namespace evidence from #3265; this handoff does not weaken or
replace that prerequisite.

## Two connection roles, one fixed claim socket

The future service keeps the existing
`/run/void-apollyon-attempt-claim-v2/claim.sock` namespace.

It distinguishes two kernel-authenticated connection roles:

1. **privileged revalidator control**
   - exact root UID/GID and a fixed, later-reviewed revalidator source generation;
   - performs no claim publication and carries no claim request body;
   - remains live through the request and success-ack window;
2. **publisher request**
   - exact planned `voidapollyonclaimpub` UID/GID + claim IPC group only;
   - is the only connection allowed to carry the accepted six-key claim request.

Root is never implicitly authorized to publish a claim.

Both roles require `SO_PEERCRED`, retained pidfds, process start-time identity
and exact source-generation binding. The publisher must be a direct child of
the exact retained root revalidator generation.

Before sending its request body, the publisher must also authenticate the claim
service and its fixed socket/process generation as required by #3233. Provenance
is mutual: the service authenticates caller lineage, and the publisher
authenticates the server boundary.

These are future runtime requirements. This source contract performs none of
them.

## Root first-entry boundary

The revalidator is privileged, so source identity is not enough if loader or
runtime environment can execute unreviewed code first.

A future implementation must bind a root-owned, symlink-free,
non-group/world-writable source/entry generation and clear the exact accepted
dangerous environment set before the first reviewed instruction:

`GCONV_PATH LD_AUDIT LD_LIBRARY_PATH LD_PRELOAD NODE_OPTIONS NODE_PATH OPENSSL_CONF`

If the privileged logic is interpreted, it requires a separately reviewed
native pre-entry that binds the fixed interpreter/runtime and protected body.
PATH/shell dispatch and arbitrary process spawning are forbidden. The only
process creation authority in this boundary is exactly one reviewed publisher
child for the current provenance session.

The root revalidator has no persistent host/account/group/systemd/service
mutation, private-key, signing, wallet, transaction or funds authority.
A later implementation must provide a negative-authority proof and designated
host first-entry qualification.

## Initial privileged phase

Before the provenance connection is established, the future fixed root
revalidator must validate the exact #3285 request and repeat the privileged
checks needed by the accepted chain:

- exact terminal receipt and protected-runner origin;
- current training service exact dormancy and prior generation absence;
- current live custody service/session identities;
- exact custody consumed record;
- authorization ID, custody generation and custody-record digest;
- terminal receipt ID and runner-receipt digest;
- request/source/tree/corpus/adapter/operator cross-bindings.

The revalidator then establishes the provenance connection and directly spawns
the fixed non-root publisher.

The exact canonical request bytes already validated by root must be handed to
that child only through an anonymous one-way root→publisher pipe whose read-end
descriptor number is fixed by the later implementation contract. The
revalidator retains its own exact request bytes and digest through the challenge
window. The child inherits only the read end, never the write end, must read the
bounded exact canonical bytes followed by EOF, and may not inherit unrelated
descriptors.

The publisher may not source a request from argv, environment, stdin,
filesystem or another network input; it must forward the exact inherited bytes
without reconstructing or recanonicalizing them.

The request bytes reach the claim service only from that publisher role; the
root control connection never becomes a claim request. If the publisher alters
even one byte, the service's parsed request digest will not match the retained
root revalidator's post-challenge digest response.

## Fresh pre-publication challenge

A one-time initial revalidation is not sufficient because host state may drift
while the publisher request is being parsed.

After the service has parsed the publisher request but **before any protected
store mutation**, the service must:

1. generate a fresh cryptographic-random 32-byte challenge;
2. send **exactly those 32 raw bytes** on the retained, kernel-authenticated
   root revalidator connection; no control bytes are accepted before this
   challenge;
3. require the same revalidator generation to rerun the complete privileged
   checks against the same retained canonical request bytes;
4. require one exact **64-byte binary response**:
   the 32 challenge bytes followed by the 32 raw bytes obtained by decoding the
   parsed lowercase-hex `publish_request_sha256`;
5. require the root revalidator to write-half-close immediately after those
   64 bytes; before any store mutation, the service must observe EOF after
   exactly 64 bytes. EOF before 64 bytes, bytes beyond 64 before EOF, delayed
   extra bytes after a valid 64-byte prefix, or timeout waiting for EOF are
   rejection with zero store mutation. The read half remains open so the
   service can send the later acknowledgment;
6. reject extra responses, challenge reuse and provenance session reuse;
7. retain and recheck root/publisher pidfd liveness, PID/start generations
   **and exact executable/source identities** before body read, before store
   mutation and before success acknowledgment. Same PID/start/pidfd with
   exec-in-place source drift is a HOLD.

Each provenance session binds exactly one direct-child publisher generation and
exactly one publisher request. The publisher may connect only after the root
control peer is authenticated.

This response is live channel evidence. It is not a transferable credential.

The post-challenge rerun must revalidate the exact same canonical request whose
digest the claim service parsed.

Timeout, disconnect, generation drift, challenge mismatch, request-digest
mismatch, or failed privileged revalidation must prevent store mutation.

The privileged handoff is additive. It never replaces the claim service's own
accepted #3233 local pre-publication checks over its service policy, numeric
identity, capability state, writable authority, store generation/root identity,
or durability boundary. After the root challenge response, the claim service
must rerun its bounded local checks and perform no unbounded or external work
before the protected-store mutation.

If provenance is lost after a mutation may have occurred, the service must not
return a false success; the existing protected-store recovery/indeterminate
rules remain authoritative.

## Host qualification still required

This contract does **not** prove that Xiphos currently permits every required
cross-UID process/source observation. A later exact implementation and
designated-host qualification must prove the concrete kernel mechanism before
installation or live use.

In particular, the future gate must prove:

- root revalidator source identity;
- publisher source identity;
- `SO_PEERCRED`;
- pidfd creation/liveness;
- direct PPid lineage;
- cross-UID generation/source checks, including an exec-sensitive mechanism
  that detects in-place executable/source changes with stable PID/start/pidfd;
- challenge ordering, response write-half-close/EOF framing and liveness;
- fail-closed behavior around store mutation and success acknowledgment.

## Authority

This gate performs no filesystem read/write, account/group/systemd mutation,
service/socket/network action, protected-store write, durable claim, training,
credential/private-key access, signing, wallet, transaction, or funds movement.

All runtime proof fields remain false.

Next gate after source/CI acceptance:

`apollyon_durable_attempt_claim_store_service_source_implementation_v2`

Keep Draft. PROTECT THE CORE.

## Accepted current-source handoff generation

The source-only privileged handoff contract now pins the reviewed #3285
request-envelope head `f736a51f6bc02ba40d89d3d6f32c09c28c0ea897` and source blob
`339916ce4a6216af9a73476ad5b78e2d7a300f73`, plus accepted #3276 service candidate blob
`87019ae1245a2054407dd47835b0b7a891d4d9a2`. The six-key request remains unchanged. Root-control
connections still cannot carry claim bytes, and the fresh revalidator challenge,
SO_PEERCRED/pidfd/lineage requirements and fail-closed pre-mutation checks are
preserved. This does not implement or invoke a root revalidator, publisher,
claim listener, protected claim writer or trainer.
