# Buy VOID user-manager private-peer guard v1

Marker: `VOID_BUY_VOID_USER_MANAGER_PRIVATE_PEER_GUARD_V1`.

Status: **source-only native trust primitive; not a complete host-evidence collector**.

## Purpose

Issue #2963 identifies a real authority gap: a same-UID process can replace the
ordinary user D-Bus pathname and make `systemctl --user` return forged unit
properties. Path ownership and stable inode checks do not authenticate the
service that supplied those properties.

This primitive establishes only the kernel/root anchor needed before a future
collector can query user-systemd properties.

## Live contract

The native guard must execute as root. For a supplied positive runtime UID it:

1. reads only the cgroup-v2
   `user@<uid>.service/init.scope/cgroup.procs`;
2. requires exactly one process matching all of:
   - all four UIDs equal the expected runtime UID;
   - exact `systemd` comm;
   - exact argv in one of two closed forms:
     - `/usr/lib/systemd/systemd --user`; or
     - `/usr/lib/systemd/systemd --user --deserialize=<positive-decimal-fd>`;
   - no additional manager arguments and no zero, signed, malformed, or
     non-decimal deserialize value;
   - exact init.scope cgroup;
   - PPid 1;
   - exact root-owned/non-group-or-world-writable
     `/usr/lib/systemd/systemd` executable identity;
3. records PID and start ticks and retains a pidfd;
4. connects to `/run/user/<uid>/systemd/private`, **not**
   `/run/user/<uid>/bus`;
5. obtains Linux `SO_PEERCRED` on that retained private connection and requires
   peer PID/UID/GID to equal the independently selected manager process;
6. re-reads manager generation/cgroup/executable identity while the pidfd and
   private connection remain open.

A replaced same-UID public D-Bus endpoint cannot satisfy the peer-PID equality
unless it is the proven systemd manager process itself.

A normal systemd user-manager daemon re-exec may retain exactly one
`--deserialize=<fd>` argument while preserving the same manager process
identity. Precision live evidence observed PID 2693 as
`systemd --user --deserialize=44` with the expected executable, UID/GID,
init.scope cgroup and PPid 1. Treating that closed re-exec form as invalid
incorrectly rejects the real authenticated manager before `SO_PEERCRED` can
bind the private socket.

## Deliberate stop

This guard does **not** issue a D-Bus method call and does not read any unit
property. It therefore does not close #2963 by itself.

The complete successor must speak the reviewed systemd private D-Bus protocol
over the *same retained authenticated connection*, query the target unit there,
and only then compose those properties with the shape checks from the
allocation-custody user-manager adapter.

No call to `systemctl --user` or caller-selected D-Bus environment may be
treated as authenticated authority.

## Authority

Source/self-test only. No service/systemd/filesystem/mount/permission mutation,
no credential/key/wallet/signer access, no RPC/payment/transaction, no
presale/WC activation and no funds movement.
