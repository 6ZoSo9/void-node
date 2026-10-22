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
primary GID. The live generation extends this credential binding to every TID
in the custody process. A second process is rejected even when only one of its
nonleader threads carries the custody UID, including saved/fs-UID-only cases.
The same all-TID rule proves training-UID absence before, during and after both
cycles. Global custody/training role maps are accepted only when two consecutive
all-process/all-TID snapshots are identical; a changing role census HOLDs rather
than being treated as absence or exclusivity. For the live custody service, the
stable global custody-UID TID tuple must additionally equal the already
double-read per-thread credential inventory. A newly appearing custody-UID
thread therefore cannot be accepted without passing the full thread credential
boundary.

## Exact source bindings

The qualifier binds:

- canonical installed target path
  `/etc/systemd/system/void-apollyon-authorization-custody-v1.target`;
- canonical installed service path
  `/etc/systemd/system/void-apollyon-authorization-custody-v1.service`;
- v3-bound service source Git blob
  `51354b10da89413eb6991514496798c7a1b5d1e8`;
- graceful launcher v3 Git blob
  `8d8561c08db7e500a818d269580dad15adca9f58`;
- the existing cleanup helper, Node runtime, environment, public key, state,
  consumed directory and socket-parent contracts.

The expected launcher path is:

`/opt/void-apollyon-custody-service-v2-reviewed-v1/tools/apollyon-authorization-custody-launcher-v3.mjs`

For effective service execution properties, Xiphos systemd may omit unset
`ExecCondition`, `ExecStartPre`, `ExecStartPost` and `ExecStop` keys
entirely from `systemctl show -p`. The qualifier normalizes omission to an
empty execution list only for those four reviewed properties. `ExecStart` and
`ExecStopPost` remain mandatory and exact; omission of either HOLDs.

## Lifecycle

The live `--run` mode retains the v1 lifecycle semantics:

1. prove the processless target dormant (`loaded`, `inactive`, `disabled`
   without requiring a nonexistent `MainPID` property), the training unit
   dormant and exactly `static`, and the custody service safely dead
   (`inactive` or pre-existing `failed`, always with no MainPID);
2. prove exact static install and effective systemd boundary;
3. immediately before each start, re-attest target/service/training unit
   dormancy, socket absence, socket-parent emptiness and custody/training
   process absence; only cycle 1 may admit the pre-existing failed/dead custody
   state, while cycle 2 requires the clean inactive state proven by cycle 1;
4. start only the custody activation target;
5. observe the dependency-started custody service generation;
6. enumerate the custody process's complete TID set twice and require it stable;
   every custody TID must have exact custody UID/GID slots, only the reviewed
   group closure, zero inheritable/permitted/effective/ambient capabilities,
   and NoNewPrivileges;
7. census every process/TID on the host twice, require the two global role-UID
   maps to be identical, require the custody UID to appear only inside that
   exact service process, and require its global custody-UID TID tuple to equal
   the exact TID set whose credentials were just validated; the training UID
   must appear nowhere;
8. prove exact executable, argv, socket and remaining runtime bindings;
9. stop only the custody activation target;
10. prove service/target dormant and socket/process cleanup using the all-TID
    role census;
11. repeat once with a distinct process generation;
12. require consumed-state metadata unchanged across both cycles.

A pre-existing or failure-cleanup custody state may be `failed` only when the
unit is dead, the socket is absent and no custody process remains. That
fail-closed state is accepted for recovery without `reset-failed`. By contrast,
every **successful normal cycle stop** must reach `inactive`; a v3 exit-status
regression therefore still fails the qualification.

No direct custody-service start/stop is authorized.

## Negative authority

This qualification does not create a durable attempt claim, start training,
mutate model weights, access private keys, sign, transact, move funds, or grant
network authority.

The v3 launcher/service must be installed by a separate reviewed dormant rebind
before any live v2 qualification is eligible to run.

PROTECT THE CORE.
