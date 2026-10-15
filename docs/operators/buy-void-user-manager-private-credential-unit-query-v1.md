# Buy VOID authenticated credential-unit query v1

Issue #2963 identified a trust gap in the Epoch-2 installed-credential
attestation: the existing sealed observer queries user-unit properties through
the same-UID public user bus. A same-UID fake D-Bus endpoint could therefore
forge the credential-effective systemd properties even while reporting the real
node PID.

This source lane adds a new native query primitive without changing the accepted
PrivateUsers V4 query generation.

## Trust path

The query embeds the accepted canonical sources:

- authenticated user-manager private peer guard:
  `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- PrivateUsers-bound unit query:
  `6aefc385bcc4212d3c45e36871bfde0da3529baa`;
- the accepted preexec source remains independently pinned:
  `f0fbfaae97df3294097a281100f06ada2ef157ff`.

A future live execution must run as root and:

1. prove the exact `systemd --user` manager PID from kernel/cgroup/executable
   evidence;
2. retain a pidfd for that manager;
3. connect only to `/run/user/<uid>/systemd/private`;
4. bind that socket to the proven manager with `SO_PEERCRED`;
5. hand that exact retained file descriptor to `sd-bus`;
6. query the target unit and credential-effective properties over that same
   authenticated connection;
7. bind MainPID back to cgroup, executable, parent-manager, kernel capability,
   NoNewPrivileges and PrivateUsers evidence;
8. re-query both ordinary and credential properties and revalidate manager,
   service, pidfds and retained socket peer before success.

The public `/run/user/<uid>/bus` endpoint is never used.

## Credential-effective properties

For `void-node-live.service`, the primitive requires and emits:

- `NeedDaemonReload=no`;
- one canonical absolute `FragmentPath`;
- exactly one canonical absolute `DropInPath`, whose basename is
  `97-buy-void-epoch2-fulfiller-credential-v1.conf`;
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

Next gate: reproducible candidate/lock acceptance for this exact source
generation, followed by a separately reviewed #2870 integration successor.

PROTECT THE CORE.
