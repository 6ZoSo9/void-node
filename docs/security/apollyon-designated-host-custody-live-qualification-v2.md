# Apollyon designated-host custody live qualification v2

Marker: `VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V2`

Status: **read-only V2 live namespace qualification runner**.

## Purpose

This successor preserves historical V84/V1 and consumes the socket-parent
namespace hardening introduced by #2903.

It accepts no evidence JSON. It runs the exact V2 designated-host collector
twice on Xiphos and immediately classifies both observations with the exact V2
host-policy classifier.

## Exact source binding

The live runner binds a complete reviewed execution closure **before first
policy evaluation or collector execution**:

```text
V1 policy    6f34e79d94c502e31ca4923fd78922d4875550a5
V2 policy    9c14868ab7c3106fd0782f0d184600acbe602e2d
V2 collector b323f6a7fe200da50c40992500f592633d3e1372
custody core f9f18db5bbfeea466202ef0d7babe08c3c401d66
service      8961572ba5834371b1229f790a1960940fc74935
client       fb31dbbda76c94f0ad08e38094c151a24a78b486
```

It performs stable no-follow source reads, copies those exact bytes into a
private execution tree, imports V2 (and its V1 relative dependency) only from
that tree, and launches Python on the private collector through inherited file
descriptor `/proc/self/fd/3`. The collector's own source-binding check therefore
sees the exact private core/service/client bytes and cannot be redirected by a
later worktree pathname replacement.

The focused proof also pins historical V84/V1 tool, proof and documentation so
the successor cannot silently rewrite the earlier evidence generation. It
includes pre-import and post-preparation replacement sentinels for policy and
collector bytes.

## Two-observation rule

Both observations must:

- pass the V2 policy classifier;
- target Xiphos;
- share one boot-ID digest;
- have strictly increasing CLOCK_BOOTTIME evidence generation;
- have non-regressing realtime/observation timestamps; and
- have identical policy-critical host state after removing only observation
  time/generation fields.

The V2 policy additionally requires the socket-parent retained ancestor chain to
be root-owned, direct, symlink-free, non-group/world-writable, and to deny the
training UID rename/unlink authority through the socket parent's immediate
parent.

The corrected V2 evidence also binds the live training PID/start-time/UID and
requires the exact lexically-first action-ID-only Polkit deny rule plus explicit
non-interactive denial checks. The private execution closure therefore includes
the corrected V2 collector and policy bytes, not the earlier overclaiming
generation.

## Deliberate boundary

A successful V2 live observation may report:

```text
live_host_qualification_performed=true
socket_parent_namespace_custody_live_qualified=true
verification_clock_authority_proven=true
evidence_generation_monotonicity_proven=true
```

It deliberately does **not** report production custody ready:

```text
live_service_source_identity_required=true
live_service_source_identity_proven=false
same_live_custody_session_binding_required=true
same_live_custody_session_binding_proven=false
independent_custody_proven=false
custody_production_gate_ready=false
attempt_claimed=false
training_execution_performed=false
```

The live systemd process still needs to be bound to reviewed launcher/source
bytes before any claim path can proceed.

## Invocation

```bash
sudo node tools/apollyon-designated-host-custody-live-qualification-v2.mjs \
  --training-user <training-user> \
  --training-pid <live-training-pid> \
  --custody-user <custody-user> \
  --ipc-group <ipc-group> \
  --state-root /absolute/custody/state/root \
  --socket-path /absolute/custody.sock \
  --service-unit <custody-service>.service
```

The runner creates and removes one private temporary reviewed execution tree.
That is reported truthfully as
`private_temporary_filesystem_write=true`,
`repository_source_write=false`, and
`persistent_host_mutation=false`. It performs no service mutation,
private-key access, signing, attempt claim, training execution,
wallet/transaction operation or funds movement.

## Next gate

`live_custody_service_source_identity_binding_v2`

That gate must bind the stable live MainPID and AF_UNIX session to exact reviewed
launcher/source bytes before any candidate-training claim contract is considered.
