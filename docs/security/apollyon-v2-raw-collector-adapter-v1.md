# Apollyon V2 raw collector adapter v1

Marker: `VOID_APOLLYON_V2_RAW_COLLECTOR_ADAPTER_V1`

Status: **source-only reviewed adapter; no host deployment or invocation**.

## Purpose

Current V2 securely materializes its reviewed collector into a private execution
tree, but the raw collector runner is intentionally internal to that module.
The new current-V2 preclaim composer needs the two raw observations before the
installed training-isolation receipt supplies the otherwise-unobservable
descriptor boundary.

This adapter accepts the already-materialized private collector path and runs
that exact collector through a trusted `/usr/bin/python3` descriptor.

It does not modify the existing V2 runner, avoiding the open #2902 path
collision.

## Required raw boundary

Successful output must still contain the current collector's deliberate HOLD
state:

```text
inherited_system_bus_descriptor_absence_required=true
inherited_system_bus_descriptor_absence_proven=false
absolute_runtime_service_control_denial_proven=false
runtime_can_control_service=null
```

The adapter rejects evidence where those fields have already been promoted.
Only the #3037 composer may promote them after exact same-process binding to
the installed/live isolation receipt.

## Execution custody

The adapter:

- requires the private collector to be mode 0400 and owned by the current
  executing identity;
- opens it with `O_NOFOLLOW`;
- requires Git blob
  `2a285b5b1da2597a8b9eae6d08cd42d010bf7f71`;
- resolves and verifies root-owned, non-writable `/usr/bin/python3`;
- retains local ownership of each newly opened collector/Python fd until all
  post-open identity checks succeed, closing the fd in a `finally` path on
  any pre-transfer exception;
- executes Python and collector through inherited descriptors; and
- accepts one bounded canonical JSON line plus the existing live collector
  success marker.

The focused proof fault-injects a post-open verification failure independently
for the collector and Python admissions. It requires the just-opened descriptor
to be closed before the exception escapes; the Python case additionally proves
the already-admitted collector descriptor is closed by the outer execution
boundary.

## Authority

The source contains process-execution capability for the later live gate, but
the PR and hosted proof perform no Xiphos contact.

No filesystem write, service action, external network, attempt claim, training,
candidate-weight mutation, credential/key/wallet/signing, transaction or funds
authority is granted.
