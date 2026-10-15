# Buy VOID user-runtime custody hardening installer v2

Marker: `VOID_BUY_VOID_USER_RUNTIME_CUSTODY_HARDENING_INSTALLER_V2`.

Status: **source-only guarded successor; no live apply authorized by this PR**.

## Why V2 exists

Precision live evidence established:

- `void-node-live.service` is a per-user systemd service owned by `zoso`;
- the running Node process has zero `CapInh`, `CapPrm`, `CapEff` and
  `CapAmb`;
- both the Node process and user manager retain the ordinary broad kernel
  `CapBnd`;
- `NoNewPrivs` is currently 0;
- V1's three-line hardening drop-in caused the service restart to fail and the
  guarded installer rolled back successfully.

The V1 policy included:

```ini
CapabilityBoundingSet=
AmbientCapabilities=
```

Those directives are capability-management settings. In a per-user systemd
manager they imply a private user namespace when supported. That is a larger
execution-context change than V1's stated boundary and is unnecessary for the
observed host, whose live inheritable/permitted/effective/ambient capability
sets are already zero.

V2 therefore does not mutate the configured capability sets.

## Exact V2 drop-in

```ini
[Service]
NoNewPrivileges=yes
```

Nothing else is configured by this drop-in.

## Pre-apply requirements

The guarded live `--plan` requires:

- exact Precision host and ordinary `zoso` user;
- exact direct user-service fragment;
- service loaded/active/running;
- current process `CapInh/CapPrm/CapEff/CapAmb` all zero;
- `PrivateUsers=no`;
- non-empty current TCP listener endpoint set;
- V2 target absent, or exact and already live-qualified.

The plan records but does not require an empty configured
`CapabilityBoundingSet`. It records the configured bounding set, ambient set
and kernel `CapBnd` as preservation inputs.

## Apply transaction

A separately authorized V2 apply:

1. creates only the exact V2 drop-in at mode 0600;
2. daemon-reloads the existing user manager;
3. performs exactly one success-path restart of `void-node-live.service`;
4. requires a new process generation;
5. requires `NoNewPrivileges=yes` in systemd and `NoNewPrivs: 1` in the
   live kernel process;
6. requires live `CapInh/CapPrm/CapEff/CapAmb` to remain zero;
7. requires `PrivateUsers` to remain false;
8. requires the configured `CapabilityBoundingSet` and
   `AmbientCapabilities` to remain byte-equivalent as normalized sets;
9. requires kernel `CapBnd` to remain exactly unchanged;
10. requires the complete pre/post TCP listener endpoint set to remain equal;
11. writes a private rollback receipt.

Thus the only intended live policy transition is `NoNewPrivileges=no -> yes`.

## Failure rollback

The V1 bounded rollback shape is preserved. If V2 creates its own target and a
later qualification fails, it removes only the same inode/SHA generation,
daemon-reloads, performs at most one recovery restart, and requires the prior
listener set to return.

## Historical boundary

The V1 source, installer and rollback receipt format remain historical. V2 uses
its own target basename and state directory and does not adopt a V1 target.

## Authority

No host apply, daemon-reload or restart is performed by this PR or CI.

This source does not accept payment, activate the public presale/WC market,
access wallet/signing material, submit transactions, or move funds.

PROTECT THE CORE.
