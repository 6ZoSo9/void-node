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

The live runner pins:

```text
V2 collector 25c553567172c1372a29f5e81bc45422022d7f4f
V2 policy    83afde66ad89c29ec7b40932b2ebd7e0b2ce7bc7
```

The focused proof also pins historical V84/V1 tool, proof and documentation so
the successor cannot silently rewrite the earlier evidence generation.

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
  --custody-user <custody-user> \
  --ipc-group <ipc-group> \
  --state-root /absolute/custody/state/root \
  --socket-path /absolute/custody.sock \
  --service-unit <custody-service>.service
```

No filesystem/service mutation, private-key access, signing, attempt claim,
training execution, wallet/transaction operation or funds movement occurs.

## Next gate

`live_custody_service_source_identity_binding_v2`

That gate must bind the stable live MainPID and AF_UNIX session to exact reviewed
launcher/source bytes before any candidate-training claim contract is considered.
