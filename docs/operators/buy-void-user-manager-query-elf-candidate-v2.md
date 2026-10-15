# Buy VOID authenticated user-manager query kernel capability evidence v2

Marker: `VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V2`.

Status: **source/CI candidate; no protected installation or live execution is authorized by this document**.

## Purpose

Precision's accepted user-runtime hardening V2 proves that the public node is a
per-user systemd service with:

- `NoNewPrivileges=yes`;
- `PrivateUsers=false`;
- live kernel `CapInh/CapPrm/CapEff/CapAmb` all zero;
- the configured broad `CapabilityBoundingSet` preserved;
- kernel `CapBnd` preserved and equal to that configured systemd mask.

The prior authenticated unit query required an empty configured
`CapabilityBoundingSet`. That assumption belonged to the superseded V1
hardening policy and is not valid for the actual Precision user-manager
execution model.

## V2 authenticated evidence

The query still authenticates the same root-selected user manager and retained
`/run/user/<uid>/systemd/private` connection with kernel `SO_PEERCRED`.
It still binds the systemd-returned MainPID to the exact Node executable,
service cgroup, direct manager parent, start ticks and retained pidfds.

The V2 query additionally reads the selected MainPID's bounded
`/proc/<pid>/status` and requires:

- systemd `NoNewPrivileges=true`;
- authenticated systemd `PrivateUsers=false`;
- kernel `NoNewPrivs=1`;
- systemd `AmbientCapabilities=0`;
- kernel `CapInh=0`;
- kernel `CapPrm=0`;
- kernel `CapEff=0`;
- kernel `CapAmb=0`;
- kernel `CapBnd == systemd CapabilityBoundingSet`.

It re-reads the complete kernel security snapshot before returning and requires
it to remain identical.

The transcript emits `PrivateUsers=no`, both configured and kernel masks as
fixed 16-digit lowercase hexadecimal values, plus:

`configured_kernel_bounding_set_equal=true`

`kernel_active_capabilities_zero=true`

## Manager selector

This source generation includes #3092's reviewed manager argv repair. The real
systemd daemon-reexec form
`/usr/lib/systemd/systemd --user --deserialize=<positive-decimal-fd>`
is accepted while all existing UID/GID/executable/cgroup/PPid/pidfd/private
socket/peer credential/generation checks remain mandatory.

## Candidate derivation

`.github/workflows/buy-void-user-manager-query-elf-candidate-v2.yml` builds
the unchanged static preexec and this V2 dynamic query in three independent
Ubuntu 24.04 jobs, strips them, runs the exact query self-test, exercises the
fixed-path preload adversary through the static preexec, and requires all
three ELF/metadata outputs to be byte-identical.

Candidate only. A separate exact lock and separately reviewed protected
replacement transaction are required before Precision may consume the new
query bytes.

## Authority

No host write, protected binary replacement, service/systemd mutation,
credential/key/wallet access, request/payment content read, transaction,
payment acceptance, presale/WC activation or funds movement.

PROTECT THE CORE.
