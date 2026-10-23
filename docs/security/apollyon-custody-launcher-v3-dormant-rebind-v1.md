# Apollyon custody launcher v3 dormant rebind v1

Marker: `VOID_APOLLYON_CUSTODY_LAUNCHER_V3_DORMANT_REBIND_V1`

Status: **source-only resumable host rebind; no host mutation by CI**.

Standalone review base: `main@e83b1df4bc3b52d08d5e38e076fa6c80085f7e01`.
This successor contains the corrected launcher v3 generation and the reviewed
group-vector repair directly; neither Draft #3703 nor Draft #3701 is a merge
dependency.
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
- custody target loaded/inactive/disabled; as a processless `.target`, it is not required to expose `MainPID`;
- custody service loaded/static with no MainPID and either inactive or failed;
- training service inactive or failed with no MainPID;
- zero threads in any process carrying the custody UID in any
  real/effective/saved/fs UID slot;
- zero threads in any process carrying the training UID in any
  real/effective/saved/fs UID slot;
- no target or service drop-ins;
- target dependency/stop-propagation still closed to the custody service;
- exact target Git blob `9daceeb07933a8a5158bc93bbc2760027d79e2d8`;
- exact installed v2 service Git blob
  `30b7b7c62b6b7834ae91db1eb37df05286ca5764`;
- exact installed v2 launcher Git blob
  `d23ff045d8c355401fed499c6bcffd503ba4c7fd`;
- exact hardened seven-name `UnsetEnvironment` set;
- exact loaded `ExecStart` for either the reviewed v2 or v3 launcher generation;
- `ExecCondition`, `ExecStartPre`, `ExecStartPost` and `ExecStop` must be
  absent or empty; Xiphos systemd omits those unset properties from
  `systemctl show -p`, so omission is normalized only for those four reviewed
  empty execution-list properties;
- exact loaded cleanup-helper `ExecStopPost`; `ExecStart` and
  `ExecStopPost` remain mandatory and may not be omitted;
- loaded `NoNewPrivileges=yes` and `RestrictAddressFamilies=AF_UNIX`.

The updater parses the effective systemd execution records; launcher generation
is never inferred from a pathname substring.

The updater also supports its own resumable intermediate states. Launcher
publication uses one fixed root-owned pending pathname and recognizes:

- `absent`: neither pending nor destination exists;
- `pending_incomplete`: a single-link mode 0600/0444 pending file whose bytes
  are an exact prefix of the reviewed v3 launcher, recoverable by deleting only
  that bounded scratch object and restarting publication;
- `pending_exact`: complete, fsynced mode 0444 pending generation ready to
  link create-only into the canonical destination;
- `linked_pending`: pending and destination are the same exact two-link inode,
  recoverable by unlinking only the pending name;
- `exact`: the canonical v3 destination is complete with link count one.

A mismatched pending file, unexpected metadata/link topology, or a destination
collision HOLDs. Before a resumed `pending_exact` file may be linked into the
canonical destination, it is reopened without symlink following, its metadata is
revalidated, its descriptor is fsynced, and the visible pending state is
revalidated again. This closes the crash window between final mode assignment
and the original data fsync as well as the windows before/after create-only
hard-link publication.

The updater also resumes a service file replacement whenever the exact service
file is v3 but PID 1 still exposes the exact v2 `ExecStart`, even if
`NeedDaemonReload` has not yet changed to `yes`; the loaded execution
generation is treated as the authoritative reload signal.

A pre-existing `failed` custody service is admitted only when
`MainPID=0`; this preserves the fail-closed dormant state left by the October
22 qualification failure without requiring a `reset-failed` mutation before
the rebind.

## Destination

- v3 launcher Git blob:
  `8d8561c08db7e500a818d269580dad15adca9f58`
- v3-bound service source Git blob:
  `51354b10da89413eb6991514496798c7a1b5d1e8`
- canonical installed service path remains
  `/etc/systemd/system/void-apollyon-authorization-custody-v1.service`
- canonical installed v3 launcher path is
  `/opt/void-apollyon-custody-service-v2-reviewed-v1/tools/apollyon-authorization-custody-launcher-v3.mjs`

## Mutation boundary

Before `--apply` may mutate anything, the updater requires its own Python
source, the launcher v3 source payload, and the v3-bound service source payload
to be root-owned, single-link, nonsymlink files with no group/world write bit
under fully root-owned, symlink-free, non-group/world-writable ancestor chains.
The launcher and service payloads must also match their exact reviewed Git
blobs. A direct root invocation from a user-writable checkout or
`~/Downloads` therefore HOLDs before mutation.

A host operator must first stage the exact reviewed closure into a root-custodied
directory and execute the absolute staged updater path. Before execution, the
root-owned staged updater must have exact Git blob
`7eb3ae379a9e008421fd6f3d67bfb2aad5b22f08`; the staged launcher and service payloads remain
bound to their exact blobs by the updater itself. This requirement binds root
execution to the reviewed generation rather than trusting the transport copy.

`--apply` may perform only:

1. create-only publication of the root-owned mode 0444 v3 launcher;
2. atomic replacement of the dormant root-owned mode 0644 custody service;
3. `systemctl daemon-reload`.

Dormancy is rechecked before publication/replacement and immediately before
daemon reload, including two consecutive all-process/all-TID censuses of the
four real/effective/saved/fs UID slots for both custody and training roles.
Before any destination write, the updater also revalidates the
complete root-owned, symlink-free, non-group/world-writable ancestor chains for
the canonical systemd unit and reviewed launcher paths. The updater contains no
systemctl start/stop action.

It does not mutate custody state, consumed records or sockets and does not
create a durable attempt claim, start training, access keys, sign, transact or
move funds.

## Process-level shutdown proof

The stacked source proof also launches a disposable Node child that imports only
the v3 shutdown helper, waits at top level, receives real SIGTERM and SIGINT,
and requires both runs to:

- settle the synthetic service stop before exit;
- settle the top-level await;
- exit with code 0 rather than Node's unsettled-await exit status;
- emit no unsettled top-level-await warning.

This directly exercises the process-level failure class observed on Xiphos
without starting the custody service or touching host state.

## Next gate

After a successful dormant rebind, the eligible live gate is
`apollyon_live_custody_dormant_qualification_v2 --run`, separately authorized.

PROTECT THE CORE.
