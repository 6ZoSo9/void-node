# Buy VOID allocation-custody host evidence v2

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2`.

Status: **source-only read-only collector successor; no install/apply authority**.

## Why V2 exists

Precision's actual public node is a user-systemd `void-node-live.service`.
The V1 allocation-custody collector reads the configured public runtime through
the system manager and additionally requires explicit `User=` / `Group=`
properties. That is correct for a system service but cannot qualify the live
Precision topology.

V2 does not replace V1 storage, mount, socket, source, service-policy or Polkit
logic. It calls the exact V1 collector through its reviewed injected-I/O seam
and changes only how the public-runtime `systemctl show` observation is
obtained.

## User-manager binding

Live V2 collection is root-only because the same collector must read the
root-custodied Polkit rule and designated-host evidence.

For the one configured runtime unit only, V2:

1. derives the runtime UID/GID/primary group/home from the host account database;
2. enters that exact user's existing systemd user-bus namespace using
   root `runuser` plus an empty environment containing only the exact
   `HOME`, `XDG_RUNTIME_DIR=/run/user/<uid>`,
   `DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/<uid>/bus`, fixed PATH and C
   locale;
3. queries `systemctl --user show`;
4. requires the user unit to be loaded, active and running;
5. requires implicit `User=` and `Group=` to remain empty;
6. requires the exact user-manager cgroup
   `/user.slice/user-<uid>.slice/user@<uid>.service/app.slice/<unit>`;
7. requires `NoNewPrivileges=yes` and empty capability bounding/ambient sets;
8. only then normalizes the implicit manager identity into the explicit
   User/Group fields expected by the unchanged V1 collector.

V1 independently rechecks the live MainPID UID/GID, process start ticks,
kernel capability masks, `NoNewPrivs: 1`, Polkit deny rule and all reviewed
systemd control-denial probes.

All custody-service `systemctl` observations remain system-manager reads.

## Evidence packet

The V2 packet preserves the complete V1-compatible evidence payload and adds:

- V2 schema/marker/version;
- `runtime_service_manager="user"`;
- `runtime_service_identity_source="user_manager_bus_plus_live_pid_v1"`;
- the content-addressed predecessor-compatible V1 receipt digest.

The V2 receipt is independently content-addressed.

## Authority

This source does not install or restart either service, create a socket or
request root, install Polkit, alter permissions/mounts, access credentials,
keys, wallets or signers, call RPC, accept payment, activate presale/WC, or move
funds.

A later host plan must still provision the stable #3003 request root, install
the custody service/socket and exact Polkit rule, apply the already-merged
#3005 user-service hardening through a rollback-safe ceremony, then execute V2
read-only evidence twice before classification.
