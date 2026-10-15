# Buy VOID authenticated user-manager unit evidence v3

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V3`.

Status: **source/read-only trust composition; complete host evidence still HOLD**.

## Purpose

The V2 allocation-custody adapter can normalize the real Precision
`void-node-live.service` user-systemd property shape, but it deliberately does
not authenticate the peer behind the ordinary per-user D-Bus endpoint.

The accepted private-peer guard from #3026 root-selects the actual
`systemd --user` manager and authenticates
`/run/user/<uid>/systemd/private` using kernel `SO_PEERCRED`, but
deliberately stops before issuing a D-Bus method.

This successor composes those two boundaries without reopening the public user
bus.

## Same retained connection

The native query source includes the reviewed #3026 guard source and therefore
reuses its exact manager selection:

- cgroup-v2 `user@<uid>.service/init.scope`;
- exact runtime UID;
- `systemd --user` argv;
- PPid 1;
- root-owned immutable `/usr/lib/systemd/systemd` executable identity;
- manager PID/start ticks;
- retained manager pidfd;
- `/run/user/<uid>/systemd/private`;
- exact `SO_PEERCRED` PID/UID/GID equality.

After that peer check, the native source gives **that same already-connected
socket FD** to sd-bus with `sd_bus_set_fd()` and direct-peer mode. It does not
connect to `/run/user/<uid>/bus` and does not invoke `systemctl --user`.

The source queries only the fixed target service through the retained private
connection:

- `Manager.GetUnit`;
- Unit `LoadState`, `ActiveState`, `SubState`, `ControlGroup`;
- Service `User`, `Group`, `MainPID`, `NoNewPrivileges`,
  `CapabilityBoundingSet`, `AmbientCapabilities`.

It requires loaded/active/running, implicit user-unit identity, exact
user-manager cgroup, NNP enabled, and zero bounding/ambient capability masks.

## Kernel rebind after property query

The D-Bus-reported MainPID does not become authority by itself. The collector
requires that process to be:

- the direct child of the authenticated user manager;
- the expected runtime UID/GID;
- in the exact service cgroup;
- executing root-owned/non-writable `/usr/bin/node`;
- held with a pidfd.

After the unit query, both manager and service process generations, cgroups,
executables, pidfd liveness, and the retained socket's `SO_PEERCRED` are
rechecked.

## V2 adapter composition

The V3 JavaScript classifier parses only the native collector's exact bounded
output, reconstructs the equivalent user-service property set, and passes it
through the existing V2 shape normalizer. Only after both the native trust
checks and V2 shape checks succeed does V3 report:

```text
manager_peer_authenticated=true
same_authenticated_connection_unit_query=true
runtime_user_manager_identity_verified=true
runtime_user_manager_cgroup_bound=true
runtime_main_pid_kernel_bound=true
```

## Deliberate remaining HOLD

This is still not the complete #2452 host-evidence collector. It does not yet
bind:

- custody service V2 source/config;
- the stable custody-readable request-root host profile;
- live ledger/custody mount evidence;
- live #3009 RuntimeDirectory socket evidence;
- exact Polkit runtime-control denial;
- double-census stability;
- monotonic external witness continuity.

Therefore:

```text
complete_host_evidence_collector=false
production_host_evidence_authority=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

No host mutation, service restart, filesystem write, RPC, credential, key,
wallet, signer, payment, transaction, WC/presale activation or funds movement
is authorized by this source.
