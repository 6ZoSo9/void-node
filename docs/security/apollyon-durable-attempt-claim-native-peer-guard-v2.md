# Apollyon durable attempt-claim native peer guard v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_V2`

Status: **source/test candidate only; self-test is the only executable mode**.

## Purpose

Accepted #3291 requires kernel-authenticated provenance that must survive the
whole claim-publication session:

- AF_UNIX `SO_PEERCRED`;
- retained pidfd liveness;
- PID/start-time binding;
- exec-sensitive executable/source revalidation;
- an exact 64-byte challenge response followed by a write-half-close;
- EOF after exactly 64 bytes before any protected-store mutation; and
- a still-open read half for the later service acknowledgment.

This candidate implements and tests those Linux primitives without implementing
the claim service, publisher, root revalidator, store writer, systemd unit or
host installation.

It is stacked on #3291 exact head
`562139b1582bd6b926ac0c8ce67f06c30c2f23d0` and its proof pins the accepted
handoff source blob `5d913eb08d79c76ed926d8b88be05b12f475abd5` plus the
reviewed native kernel peer reference
`d8b30ac499c3bb8a5d223dbc6be687dd175be611`.

## Self-test boundary

The native self-test uses only ephemeral process/socket state.

It proves:

1. a real Linux AF_UNIX connect/accept exposes the connecting child through
   `SO_PEERCRED`;
2. `pidfd_open` retains a liveness handle for that child while alive and the same retained pidfd is proven non-live after that child terminates;
3. the child initially resolves to the same executable inode as the reviewed
   self-test binary;
4. the exact same PID/start-ticks/pidfd generation performs an in-place
   `execve("/bin/sleep", ...)` and the executable-inode comparison detects the
   executable-image change while the process is still alive;
5. exactly 64 response bytes followed by `shutdown(SHUT_WR)` are accepted;
6. the receiver observes EOF after exactly those 64 bytes and can still send an
   acknowledgment on its write half;
7. a 65-byte response is rejected only after the adversary sender is proven to have exited successfully after its intended send/half-close sequence;
8. EOF after only 63 bytes is rejected only after that sender is likewise proven successful;
9. an extra byte sent after a delay following a valid 64-byte prefix is rejected only after the sender's intended delayed-extra sequence exits successfully; and
10. after an explicit synchronization proves the child has already sent the full 64-byte prefix, the child keeps its write half open until the parent observes the EOF deadline and terminates it; the missing EOF is therefore deterministically rejected rather than depending on a fixed sleep.

The candidate has no live mode. Any invocation other than `--self-test`
returns HOLD.

## Deliberate missing authority

This source does **not** prove:

- cross-UID observation on Xiphos;
- installed/root-owned source custody;
- claim-service process integration;
- publisher/revalidator installation or execution;
- systemd sandboxing;
- socket namespace ownership;
- protected claim-store durability;
- terminal/custody/current-host revalidation;
- durable attempt-claim publication; or
- training admission/execution.

Those remain later integration and designated-host qualification gates.

### Interpreted-source limitation

Executable-inode comparison is an exec-sensitive primitive, not complete source
identity for an interpreted body. Re-executing the same reviewed interpreter
with different argv or a different script can preserve the interpreter inode.
The later revalidator/publisher integration must additionally bind exact
`/proc/<pid>/cmdline` semantics and the root-custodied script/source bytes
(or use a fully native fixed executable) at every #3291 source-revalidation
boundary. This candidate therefore reports
`interpreted_body_source_identity_proven=false`.

## Authority

No Xiphos access, host installation, account/group/systemd mutation, service
start/stop, persistent socket namespace, protected-store mutation, durable
attempt claim, training, private-key/signing/wallet, transaction or funds
authority is granted.

Next gate:
`apollyon_durable_attempt_claim_native_peer_guard_integration_v2`.

Keep Draft. PROTECT THE CORE.
