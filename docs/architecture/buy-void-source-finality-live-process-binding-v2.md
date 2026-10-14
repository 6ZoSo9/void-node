# Buy VOID source-finality live-process binding v2

Marker: `VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V2`.

Status: **source-only V2 evidence contract; production authority HOLD**.

## Why V2 exists

V1 binds a running process to a root-custodied receipt, but the receipt does not
bind how the service PID was selected. The V1 collector asks the runtime user's
user-systemd bus for MainPID. That selector is not a sufficient production trust
root because the runtime UID controls the user bus endpoint.

V2 does not reinterpret or upgrade V1 evidence. Production V2 uses a new path:

`/var/lib/void-source-finality-v7/live-process-binding-v2.json`

and a new content-addressed `voidbsflp2_` receipt generation.

## Precision-qualified selector

The live read-only Precision qualification established this topology:

- cgroup-v2 is mounted at `/sys/fs/cgroup`;
- the user manager is under
  `/user.slice/user-1000.slice/user@1000.service/init.scope`;
- that scope may contain more than one process, but exactly one manager-shaped
  candidate matches the runtime UID, `systemd` identity and `systemd --user`
  argv;
- `void-node-live.service` contains one Node service process plus esbuild
  children;
- the Node service process is the direct child of the selected user manager;
- PID/start-tick/cgroup identity remained stable across reread;
- pidfd acquisition is available on the host;
- `systemctl --user` corroborates the selected MainPID but is not selector
  authority.

The future privileged collector must additionally verify the exact root-owned
manager executable `/usr/lib/systemd/systemd`; the unprivileged qualification
cannot dereference `/proc/<manager>/exe` on this host.

## Selector contract

V2 content-addresses the selector contract itself as
`voidbsfpsel1_<sha256>` and requires:

- manager cgroup:
  `/user.slice/user-<uid>.slice/user@<uid>.service/init.scope`;
- exactly one manager candidate after exact UID, cgroup, systemd executable and
  argv filtering;
- service cgroup:
  `/user.slice/user-<uid>.slice/user@<uid>.service/app.slice/void-node-live.service`;
- exactly one reviewed Node service candidate whose PPid equals the selected
  manager PID;
- manager and service start ticks;
- retained manager and service pidfds throughout privileged collection;
- stable manager/service cgroup membership and generations before receipt
  creation.

Other manager-scope helpers and service-cgroup children are not selected merely
by position.

## Receipt boundary

V2 retains the useful V1 process/source facts and adds:

- exact selector mode;
- exact selector contract ID;
- manager PID/start ticks/cgroup;
- exact manager executable identity;
- manager cmdline digest;
- explicit manager/service pidfd-retention claims.

`INVOCATION_ID` remains bound restart metadata, but it is not the selector
trust root.

Runtime verification re-observes the current process, requires its PPid to equal
the receipt's manager PID, checks manager generation/cgroup/cmdline, and samples
self identity before and after the root receipt read.

A canonical V1 receipt, even for the same deployment/process tuple, is not
accepted as V2 production evidence.

## Next implementation gate

This PR deliberately does **not** create a privileged production collector.
The collector must be introduced behind the reviewed native first-entry
boundary, retain real pidfds, verify exact manager executable custody, and
create the V2 file without using `systemctl --user` to choose MainPID.

Until that collector and V7 consumption are separately accepted:

`production_source_finality_authority_ready=false`

`public_presale_activation=false`

`funds_movement=false`
