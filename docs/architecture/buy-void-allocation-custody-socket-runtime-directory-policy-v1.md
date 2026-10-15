# Buy VOID custody socket RuntimeDirectory policy v1

Marker: `VOID_BUY_VOID_CUSTODY_SOCKET_RUNTIME_DIRECTORY_POLICY_V1`.

Status: **source policy only; not installed; production HOLD**.

## Purpose

The existing custody bootstrap contract intentionally leaves one systemd
namespace question unresolved:

- the custody service must run as `User=void-buy-custody` and
  `Group=void-buy-custody`;
- the AF_UNIX socket parent must be owned by the custody UID but grouped to the
  distinct IPC group `void-buy-custody-ipc`, mode `0750`;
- the socket must be custody-owned, IPC-grouped, mode `0660`;
- the public runtime must be able to connect through IPC-group membership but
  must not be able to replace entries in the socket parent;
- `ProtectSystem=strict` must remain enabled;
- the existing allocation qualification requires exactly the two data roots in
  `ReadWritePaths` and must not silently gain a third writable path;
- the custody runtime creates its own socket and therefore must not use a
  competing systemd `.socket` unit.

This policy selects a source-level mechanism that satisfies those constraints
without changing the existing two-path `ReadWritePaths` contract.

## Selected mechanism

The future system service must compose this exact service fragment:

```ini
[Service]
RuntimeDirectory=void-allocation-custody-v1
RuntimeDirectoryMode=0750
RuntimeDirectoryPreserve=no
SupplementaryGroups=void-buy-custody-ipc
ExecStartPre=/usr/bin/chgrp -- void-buy-custody-ipc /run/void-allocation-custody-v1
```

Systemd creates the runtime directory before service commands and makes it a
writable runtime directory for the unit. The directory is initially owned by
the configured service user and primary group. The pre-start command changes
only its group to the already-reviewed IPC group.

The service primary group therefore remains `void-buy-custody`; no
`ReadWritePaths=/run/...` entry is added.

## Why the group transition is non-privileged

The future host qualification must prove that:

- `void-buy-custody` is the runtime directory owner;
- `void-buy-custody` is a member of `void-buy-custody-ipc`;
- systemd applies the supplementary IPC group to the service and
  `ExecStartPre`;
- `/usr/bin/chgrp` is the reviewed executable identity;
- the pre-start transition succeeds without granting `CAP_CHOWN` or another
  capability;
- after the transition the parent is direct, custody-owned, IPC-grouped and
  exactly `0750`.

This source policy does not claim those live facts.

## Socket compatibility

The existing custody V2 service already requires:

- direct socket parent;
- parent mode `0750`;
- parent GID equal to the configured `socket_group_gid`;
- service process membership in that GID;
- absent socket before bind;
- service-owned `net.createServer(...).listen(socket_path)`;
- post-bind `chmod(0660)`;
- post-bind socket group transition to `socket_group_gid`;
- exact post-bind socket metadata.

No socket-activation unit is introduced.

## Restart and cleanup boundary

`RuntimeDirectoryPreserve=no` intentionally keeps the runtime namespace
ephemeral. A later host ceremony must prove:

1. startup creates the parent and applies the IPC group before the Node service
   starts;
2. custody V2 creates the socket and reaches its expected metadata;
3. a normal stop removes/cleans the socket generation safely;
4. restart creates a fresh parent, reapplies the IPC group, and returns one
   valid socket;
5. no stale socket or foreign parent generation is accepted;
6. rollback removes only the new service/runtime-directory generation and does
   not mutate allocation ledger or high-water contents.

## Relationship to protected storage

The existing service policy remains:

```text
ProtectSystem=strict
ReadWritePaths=/var/lib/void-allocation-custody-v1
ReadWritePaths=/var/lib/void-allocation-ledger-v1
```

This policy does **not** add the socket parent to `ReadWritePaths`; the
systemd-managed runtime directory is the selected namespace exception.

## Remaining gates

Still unproven after source acceptance:

- exact service `ExecStart` and immutable root-owned runtime closure;
- #3003 stable custody-readable request-root generation;
- live #3005 user-runtime hardening application/restart;
- exact Polkit denial bytes and noninteractive status-1 probes;
- account/group membership at use;
- live RuntimeDirectory/chgrp behavior;
- service/socket startup/restart/rollback;
- independent monotonic custody anchor;
- same-UID joint rollback exclusion;
- mounted payment->allocation handoff;
- reserve/recover enablement;
- payment acceptance and coupled presale/WC launch.

## Authority boundary

Source/test/CI only. No service installation/start/restart, systemd mutation,
permission/group mutation, Polkit change, request/payment data read,
credential/key/wallet/signer access, RPC, transaction, Chain-2050/WC mutation,
presale activation, treasury/liquidity/inventory action or funds movement.
