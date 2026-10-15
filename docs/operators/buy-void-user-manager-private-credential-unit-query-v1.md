# Buy VOID authenticated credential-unit query v1

Issue #2963 identified a trust gap in the Epoch-2 installed-credential
attestation: the existing sealed observer queries user-unit properties through
the same-UID public user bus. A same-UID fake D-Bus endpoint could therefore
forge the credential-effective systemd properties even while reporting the real
node PID.

This source lane adds a new native query primitive without changing the current
PrivateUsers V5 query generation.

## Trust path

The query embeds the accepted authenticated user-manager private peer guard
`d8b30ac499c3bb8a5d223dbc6be687dd175be611`.

The current V5 PrivateUsers-bound unit-query source
`ddca2c544ce14261dffb80a202c0a4ae2979ec1e` is pinned as the integration
peer. Accepted V4 binary evidence remains frozen in its historical lock, and
the current unit-query preexec source is pinned at
`f0fbfaae97df3294097a281100f06ada2ef157ff` only as historical/integration
context. It executes the ordinary unit-query binary, not this credential-query
binary, and therefore supplies no live execution authority for this lane.

A future live execution must run as root and:

1. prove the exact `systemd --user` manager PID from kernel/cgroup/executable
   evidence;
2. retain a pidfd for that manager;
3. connect only to `/run/user/<uid>/systemd/private`;
4. bind that socket to the proven manager with `SO_PEERCRED`;
5. hand that exact retained file descriptor to `sd-bus`;
6. query the target unit and credential-effective properties over that same
   authenticated connection;
7. bind MainPID to cgroup, executable, parent-manager, UID/GID and process
   generation inside this primitive;
8. compose that exact MainPID/start-ticks generation with the separately
   accepted current capability/NoNewPrivileges/PrivateUsers security transcript;
9. run this binary only through a new protected preexec generation that binds
   its exact installed identity and constructs the minimal loader environment;
10. re-query both ordinary and credential properties and revalidate manager,
   service, pidfds and retained socket peer before success.

This primitive independently kernel-binds the returned MainPID to the same
manager, exact cgroup, UID/GID generation and root-owned `/usr/bin/node`
executable. It does not itself query or prove CapabilityBoundingSet,
AmbientCapabilities, kernel capability sets, NoNewPrivileges or PrivateUsers.
A later integration must require this exact MainPID/start-ticks generation to
match whichever canonical security-transcript generation is accepted at that
time; the source-only primitive carries no such policy authority by itself.

The public `/run/user/<uid>/bus` endpoint is never used.

`ControlGroup` is read from `org.freedesktop.systemd1.Service`; the obsolete
generic-Unit binding is forbidden.

## Credential-effective properties

For `void-node-live.service`, the primitive requires and emits:

- `NeedDaemonReload=no`;
- one canonical absolute `FragmentPath`;
- a bounded set of at most 32 canonical absolute `DropInPaths`, with at most
  16 KiB of canonical path bytes retained for same-generation comparison;
- exactly one member whose basename is
  `97-buy-void-epoch2-fulfiller-credential-v1.conf`;
- unrelated canonical hardening drop-ins are allowed, including the current
  `98-buy-void-allocation-custody-runtime-hardening-v2.conf`;
- exactly one `LoadCredential` pair;
- credential ID `buy-void-epoch2-fulfiller-v1`;
- one canonical absolute credential source path;
- the same authenticated MainPID and stable process generation.

The credential contents are not opened or read by this primitive.

## Why this is separate from the accepted V4 query

The canonical V4 query is already accepted and merged. Rewriting it to add
credential properties would create a new binary generation and invalidate its
accepted evidence. This lane is additive so the accepted query remains
byte-frozen.

The source is also deliberately not wired into the older Epoch-2 sealed
attestation yet. A later integration must consume an accepted binary identity
for this primitive and replace the unauthenticated user-bus property source
without weakening #2870's filesystem/drop-in validation.

## Current authority

This lane is source/test/CI only.

Still false:

- binary acceptance;
- protected installation;
- live credential-unit query authority;
- production host evidence authority;
- credential-content access;
- service/systemd mutation;
- payment acceptance;
- public presale activation;
- transaction or funds movement.

Next gate: a protected credential-query preexec generation plus reproducible
candidate/lock acceptance. Before any live integration, refresh the composition
against the accepted current security-transcript generation, then build a
separately reviewed #2870 integration successor.

PROTECT THE CORE.
