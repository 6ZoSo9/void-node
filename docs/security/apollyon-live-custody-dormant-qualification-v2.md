# Apollyon live custody dormant qualification v2

Marker: `VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V2`

Status: **source-only successor qualification; not installed and not live**.

## Purpose

Rebind the accepted dormant custody qualification to the graceful-shutdown
launcher v3 candidate while preserving the existing two-cycle custody-only
lifecycle boundary.

This generation also carries the October 22 group-vector repair discovered by
live Xiphos qualification:

- NSS custody-account closure must remain exactly primary custody GID + IPC GID;
- the live process `Groups:` field must include the reviewed IPC GID;
- the primary custody GID may appear there redundantly;
- duplicate GIDs remain forbidden;
- every third/unreviewed GID remains forbidden.

The separately verified four primary GID slots must still all equal the custody
primary GID.

## Exact source bindings

The qualifier binds:

- canonical installed target path
  `/etc/systemd/system/void-apollyon-authorization-custody-v1.target`;
- canonical installed service path
  `/etc/systemd/system/void-apollyon-authorization-custody-v1.service`;
- v3-bound service source Git blob
  `51354b10da89413eb6991514496798c7a1b5d1e8`;
- graceful launcher v3 Git blob
  `ec9e1d2c01581ebdc5323056939f846e67692fe6`;
- the existing cleanup helper, Node runtime, environment, public key, state,
  consumed directory and socket-parent contracts.

The expected launcher path is:

`/opt/void-apollyon-custody-service-v2-reviewed-v1/tools/apollyon-authorization-custody-launcher-v3.mjs`

## Lifecycle

The live `--run` mode retains the v1 lifecycle semantics:

1. prove target/service dormant and training dormant;
2. prove exact static install and effective systemd boundary;
3. start only the custody activation target;
4. observe the dependency-started custody service generation;
5. prove exact executable, argv, credentials, reviewed groups, zero
   capabilities, NNP, socket and custody-UID exclusivity;
6. stop only the custody activation target;
7. prove service/target dormant and socket/process cleanup;
8. repeat once with a distinct process generation;
9. require consumed-state metadata unchanged across both cycles.

No direct custody-service start/stop is authorized.

## Negative authority

This qualification does not create a durable attempt claim, start training,
mutate model weights, access private keys, sign, transact, move funds, or grant
network authority.

The v3 launcher/service must be installed by a separate reviewed dormant rebind
before any live v2 qualification is eligible to run.

PROTECT THE CORE.
