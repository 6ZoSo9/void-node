# Buy VOID user-manager ControlGroup service-interface repair v5

Marker: `VOID_BUY_VOID_USER_MANAGER_CONTROLGROUP_SERVICE_INTERFACE_V5`.

Status: **source/CI repair only; no protected replacement or live query authority**.

## Precision evidence

The protected V2 query on Precision authenticated the user manager and reached
the unit-property phase, then returned:

`reason=unit_property_query_failed`.

A disposable exact-source probe isolated the first failing read to:

`ControlGroup` with libsystemd return `-53`.

The accepted runtime state itself was already consistent:
- service loaded/active/running;
- NoNewPrivileges=yes and kernel NoNewPrivs=1;
- PrivateUsers=no;
- kernel CapInh/CapPrm/CapEff/CapAmb all zero;
- kernel CapBnd `000001ffffffffff`;
- exact Node process/cgroup and systemd user-manager generation.

## Repair

The native authenticated query previously requested:

`org.freedesktop.systemd1.Unit.ControlGroup`.

The service cgroup property belongs to the service-specific systemd interface.
V5 therefore requests:

`org.freedesktop.systemd1.Service.ControlGroup`.

Generic unit-state properties remain on `org.freedesktop.systemd1.Unit` and
the remaining service/process-security properties remain on
`org.freedesktop.systemd1.Service`.

The private-manager socket, SO_PEERCRED, pidfd, executable, cgroup, capability,
PrivateUsers and post-query generation checks are unchanged.

## Promotion boundary

This source repair invalidates the accepted V4 dynamic-query ELF identity.
V4 candidate/lock evidence remains frozen historical evidence.

A fresh V5 deterministic ELF candidate and separate acceptance lock are
required before any protected host replacement or live authenticated query.

No host filesystem mutation, systemd/service mutation, request/payment content
read, credential/key/wallet access, transaction, payment acceptance,
presale/WC activation or funds movement.

PROTECT THE CORE.
