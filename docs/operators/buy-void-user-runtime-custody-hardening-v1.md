# Buy VOID user-runtime custody hardening v1

Marker: `VOID_BUY_VOID_USER_RUNTIME_CUSTODY_HARDENING_V1`.

Status: **source-only drop-in candidate; not installed**.

Precision's live `void-node-live.service` is a user-systemd service owned by
the existing runtime user. Read-only host census shows the live Node process
currently has zero inheritable/permitted/effective/ambient Linux capabilities,
but the unit policy still reports `NoNewPrivileges=no` and a broad
`CapabilityBoundingSet`.

This candidate defines the minimum additive user-unit policy required by the
allocation-custody host boundary:

~~~ini
[Service]
NoNewPrivileges=yes
CapabilityBoundingSet=
AmbientCapabilities=
~~~

It deliberately does not migrate the service to a system manager or to
`void-buy-runtime`, does not change ExecStart/environment/network/storage
settings, and grants no supplementary group. The request-root IPC group and
custody service/socket remain separate gates.

Before any separately authorized install/restart:
1. exact live drop-in collision/census is required;
2. systemd must parse the merged user unit;
3. existing public HTTP/P2P and production runtime duties must be shown not to
   require Linux capabilities;
4. rollback bytes must be retained;
5. after restart, kernel `CapInh/CapPrm/CapEff/CapAmb` must all be zero and
   `NoNewPrivs: 1`;
6. the active unit must report empty CapabilityBoundingSet/AmbientCapabilities
   and `NoNewPrivileges=yes`.

This source candidate performs no host/service mutation, payment, transaction,
presale activation, or funds movement.
