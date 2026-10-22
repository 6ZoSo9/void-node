# Apollyon custody launcher v3 dormant rebind v1

Marker: `VOID_APOLLYON_CUSTODY_LAUNCHER_V3_DORMANT_REBIND_V1`

Status: **source-only resumable host rebind; no host mutation by CI**.

## Purpose

Provide the smallest reviewed Xiphos transition from the currently installed
custody launcher v2 generation to the graceful-shutdown v3 candidate without
starting any service or training process.

The rebind intentionally leaves the accepted v2 launcher installed. It creates
v3 beside v2, replaces only the canonical custody service unit with a source
that points at v3, and runs `systemctl daemon-reload`.

## Accepted starting state

The updater requires:

- Xiphos hostname;
- custody target loaded/inactive/disabled;
- custody service loaded/inactive/static;
- training service inactive or failed with no MainPID;
- no target or service drop-ins;
- target dependency/stop-propagation still closed to the custody service;
- exact target Git blob `9daceeb07933a8a5158bc93bbc2760027d79e2d8`;
- exact installed v2 service Git blob
  `30b7b7c62b6b7834ae91db1eb37df05286ca5764`;
- exact installed v2 launcher Git blob
  `d23ff045d8c355401fed499c6bcffd503ba4c7fd`;
- exact hardened seven-name `UnsetEnvironment` set.

The updater also supports its own resumable intermediate states: v3 launcher
already created, service file replaced but manager still loaded on v2, and
fully rebound.

## Destination

- v3 launcher Git blob:
  `ec9e1d2c01581ebdc5323056939f846e67692fe6`
- v3-bound service source Git blob:
  `51354b10da89413eb6991514496798c7a1b5d1e8`
- canonical installed service path remains
  `/etc/systemd/system/void-apollyon-authorization-custody-v1.service`
- canonical installed v3 launcher path is
  `/opt/void-apollyon-custody-service-v2-reviewed-v1/tools/apollyon-authorization-custody-launcher-v3.mjs`

## Mutation boundary

`--apply` may perform only:

1. create-only publication of the root-owned mode 0444 v3 launcher;
2. atomic replacement of the dormant root-owned mode 0644 custody service;
3. `systemctl daemon-reload`.

Dormancy is rechecked before publication/replacement and immediately before
daemon reload. Before any destination write, the updater also revalidates the
complete root-owned, symlink-free, non-group/world-writable ancestor chains for
the canonical systemd unit and reviewed launcher paths. The updater contains no
systemctl start/stop action.

It does not mutate custody state, consumed records or sockets and does not
create a durable attempt claim, start training, access keys, sign, transact or
move funds.

## Next gate

After a successful dormant rebind, the eligible live gate is
`apollyon_live_custody_dormant_qualification_v2 --run`, separately authorized.

PROTECT THE CORE.
