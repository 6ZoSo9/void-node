# Buy VOID allocation-custody user-manager evidence adapter v2

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2`.

Status: **source-only observation adapter; not a complete host-evidence collector**.

## Why this bounded successor exists

Precision's actual public node is a user-systemd `void-node-live.service`.
Historical allocation-custody host evidence V1 assumes a system-manager public
runtime with explicit `User=` and `Group=`. Reusing that complete V1
collector unchanged would therefore reject the real host.

A first version of this Draft attempted to wrap the whole V1 collector. Review
of the current custody source showed that would be incomplete for a different
reason: the future daemon is custody service **V2**, whose source, request-root
and cross-UID capacity-lock configuration are not attested by V1.

This Draft therefore deliberately stops at the reusable manager-adapter
primitive. It cannot emit a production host-evidence packet.

## Exact user-manager observation contract

A future root collector may derive the configured runtime UID/GID/group/home,
then use the invocation plan defined here:

- root `/usr/sbin/runuser -u <runtime-user>`;
- `/usr/bin/env -i`;
- exact HOME;
- `XDG_RUNTIME_DIR=/run/user/<uid>`;
- `DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/<uid>/bus`;
- fixed PATH and C locale;
- `/usr/bin/systemctl --user show <unit> ...`.

The normalized observation accepts only:
- loaded + active + running;
- implicit empty `User=` / `Group=`;
- exact
  `/user.slice/user-<uid>.slice/user@<uid>.service/app.slice/<unit>`;
- positive MainPID;
- `NoNewPrivileges=yes`;
- empty `CapabilityBoundingSet`;
- empty `AmbientCapabilities`.

Only after those checks may the implicit user-manager identity be represented
as the configured runtime user/group for downstream comparison. That
normalization is not host authority by itself.

## Explicit nonclaims

This V2 source does **not**:
- execute systemctl/runuser;
- read the host;
- reuse or call the V1 collector;
- bind custody service V2 source bytes;
- bind custody service V2's exact server configuration;
- bind #3009's RuntimeDirectory policy;
- inspect mounts, socket, Polkit or storage;
- install/restart either service.

The complete successor host collector must compose:
1. this user-manager observation contract;
2. exact custody service V2 source/contract identity;
3. exact server-controlled request root and capacity-lock configuration;
4. accepted #3009 socket RuntimeDirectory policy;
5. V1-equivalent storage/mount/socket/Polkit evidence;
6. double-census stability.

No payment, presale, WC or funds authority is granted.
