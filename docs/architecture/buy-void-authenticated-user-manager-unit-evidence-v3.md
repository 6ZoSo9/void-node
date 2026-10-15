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

## Loader provenance before the retained connection

The native query must itself start from a reviewed empty loader environment.
The supported operation shape launches the target through `/usr/bin/env -i`
with fixed PATH/locale plus the single
`VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1=1` marker.
The target refuses `LD_PRELOAD`, `LD_LIBRARY_PATH`, `LD_AUDIT`,
`GLIBC_TUNABLES` and the other reviewed dynamic-loader variables.

The sd-bus implementation is no longer selected by the soname search path.
The query resolves only the fixed
`/usr/lib/x86_64-linux-gnu/libsystemd.so.0`, requires root-owned,
non-group/world-writable system-library ancestry and target metadata, retains
the exact target descriptor, and loads `/proc/self/fd/<fd>`. Every required
sd-bus symbol is then checked with `dladdr()` to come from that same retained
library target.

Focused CI proves:
- direct execution without the sanitizer marker HOLDS;
- an ambient fake `libsystemd.so.0` through `LD_LIBRARY_PATH` HOLDS before
  library selection;
- the same poison outside `env -i` cannot affect the sanitized child;
- an `LD_PRELOAD` constructor demonstrably reaches the query under unsafe
  direct execution, while the sanitized child does not load it.

This closes loader search/interposition as caller-controlled query authority.
The future installed operation must preserve the exact sanitized launch shape
and reverify the system-library path at use.

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
sanitized_loader_environment=true
libsystemd_fixed_path_verified=true
libsystemd_retained_fd_load=true
libsystemd_symbol_provenance_verified=true
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
