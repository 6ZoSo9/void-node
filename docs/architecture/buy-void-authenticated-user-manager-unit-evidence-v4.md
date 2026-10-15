# Buy VOID authenticated user-manager unit evidence v4

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V4`.

Status: **source/read-only trust composition; complete host evidence still HOLD**.

## Why V4 exists

Historical V3 required the authenticated systemd `CapabilityBoundingSet` to be
empty. Precision live hardening established that forcing the per-user manager's
configured bounding set empty changes its execution namespace and is not the
safe host transition.

The reviewed native V3 query instead binds the configured mask to kernel state:
- systemd `NoNewPrivileges=true`;
- systemd `AmbientCapabilities=0`;
- kernel `NoNewPrivs=1`;
- kernel `CapInh/CapPrm/CapEff/CapAmb=0`;
- kernel `CapBnd` exactly equals the authenticated systemd
  `CapabilityBoundingSet`;
- the complete process capability tuple is reread and unchanged after the query.

V4 consumes that exact transcript. V3 stays immutable historical evidence.

## Authenticated user-manager boundary

V4 preserves the accepted private-peer/same-FD boundary:
- root-selected reexec-aware `systemd --user` manager;
- retained manager/service pidfds;
- `/run/user/<uid>/systemd/private` and exact `SO_PEERCRED`;
- fixed root-controlled libsystemd path/descriptor/symbol provenance;
- no public user bus;
- D-Bus MainPID rebound to exact direct-child/cgroup/executable generation.

## Capability semantics

A nonzero configured bounding set is not itself treated as an effective
capability grant. V4 requires all non-bounding process capability sets to be
zero and requires exact configured-bound ↔ kernel-bound equality at the
authenticated MainPID. A mismatch, nonzero permitted/effective/inheritable/
ambient set, missing NNP, malformed mask, or false native relation marker fails
closed.

## Remaining HOLD

V4 still does not bind the complete #2452 host profile:
- custody service V2 source/config;
- stable request-root installed profile;
- live storage mounts;
- RuntimeDirectory/socket;
- Polkit denial;
- double-census stability;
- external monotonic witness continuity.

Therefore complete host evidence, payment acceptance, presale activation and
funds movement remain false.
