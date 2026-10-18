# Installed Apollyon training bus-isolation qualification V2

Marker: `VOID_APOLLYON_INSTALLED_TRAINING_BUS_ISOLATION_QUALIFICATION_V2`.

Status: **source/test/CI successor for standalone live qualification; no Xiphos service action is performed by hosted proof**.

## Purpose

V1 remains the accepted same-process observation interface used by the current
preclaim/session chain. Its exact source blob is:

`1fdb495aafa136119d50f41410b015930d9fc90d`.

This V2 gate does not modify that source or its `--observe-live-pid` receipt.
It closes only the standalone `--live-qualify` shutdown proof.

The V1 standalone path currently calls `systemctl stop` with
`check=False`, ignores a nonzero return code, and then proves only that
`ActiveState` is not exactly `active`. That is insufficient to support the
receipt claim that the qualification service is stopped.

## V2 shutdown contract

A successful V2 standalone qualification must prove all of the following after
the reviewed V1 live-generation observation:

- the explicit `systemctl stop` command returned zero;
- `ActiveState=inactive`;
- `SubState=dead`;
- `MainPID=0`;
- `UnitFileState=static`;
- the exact previously observed PID/start-tick generation is absent.

Each service observation is one `systemctl show` invocation requesting
`LoadState`, `ActiveState`, `SubState`, `MainPID` and
`UnitFileState` together. V2 never composes those properties from separate
`systemctl` calls.

The shutdown state is polled for a bounded five-second interval. A PID reused
for another start-tick generation does not count as the original generation
remaining alive. An observation error other than process disappearance fails
closed. When one snapshot and the old-generation check appear green, V2 takes
a second complete service snapshot and rechecks the old process generation.
Success requires that the two complete service snapshots are identical and
both are exact inactive/dead/MainPID=0/static state with the old generation
absent. Concurrent start/state drift therefore remains a HOLD.

The exact installed unit is static on the designated host. V2 therefore binds
`UnitFileState=static` instead of reducing "not enabled" to one
`systemctl is-enabled` string. Before start, the service may be either
inactive/dead or failed/dead with `MainPID=0`; the latter preserves known
one-shot failure residue without treating it as a live process. Post-stop
success remains strictly inactive/dead/MainPID=0/static.

V2 also binds the **effective** systemd generation rather than trusting only
the bytes at the expected unit path. Before the initial state check,
immediately before `systemctl start`, and again before successful receipt
construction it requires:

- `FragmentPath` exactly equals the reviewed
  `/etc/systemd/system/void-apollyon-training-bus-isolation-v1.service`;
- `DropInPaths` is empty;
- `NeedDaemonReload=no`;
- exactly one `ExecStart`, whose sole argv entry is the reviewed pre-entry;
- PID 1's effective `UnitPath` contains only reviewed roots in reviewed
  precedence order; and
- no reviewed root contains a nonempty
  `.wants` or `.requires` directory for this training unit.

The pre-start and pre-success effective-unit observations must equal the
initial reviewed contract. Drop-ins, daemon-reload drift, alternate
`ExecStart`, unreviewed unit-path roots, or dependency entries therefore
HOLD.

## Pre-action authority receipt

Before the first `systemctl start`, V2 prints and flushes a machine-readable
authority receipt covering host/filesystem mutation, Git mutation/fetch,
service/process action, credential and wallet/signer access, transaction
construction/signing/broadcast, chain mutation, economic activation and funds
movement.

Only service start/stop and process observation are true. Filesystem/Git/key/
wallet/transaction/chain/economic/funds authority remains false. Failure to
emit this receipt is a HOLD before any service start attempt.

## Failure and interruption semantics

V1 source loading is lazy. A missing, inaccessible or unreadable exact V1
dependency is translated into a machine-readable V2 HOLD rather than escaping
as an import-time traceback.

Once service start is attempted, shutdown verification runs from `finally`.
A primary qualification failure cannot mask a shutdown failure. If both occur,
V2 returns a combined HOLD describing both boundaries.

A nonzero stop command, a lingering active service, a non-dead substate, a
nonzero MainPID, survival of the exact observed process generation, unit-file
state drift, effective-unit drift, or a change between the first and final
complete service snapshots all prevent a successful V2 receipt.

After the final installed-launcher and effective-unit contract revalidations,
V2 performs one additional zero-wait stable shutdown observation: two complete
inactive/dead/MainPID=0/static service snapshots plus exact old-generation
absence. That observation is intentionally the final host-state read before
receipt construction. A direct `systemctl start`, dependency activation, or
other service-state drift that lands after the earlier stop proof but before
receipt construction therefore HOLDs instead of being hidden by the earlier
shutdown snapshot.

## Shared lifecycle serialization

V2 defines one shared kernel `flock(2)` boundary for the standalone qualifier
and the reviewed live-custody launch path without rewriting the already accepted
launcher or Node-runner sources.

The lock-aware launcher successor source is:

`ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py`

with exact Git blob:

`2496644ecc13b425c0885d9e38887d845a5824ef`.

It is a successor source for the existing fixed runtime launcher path:

`/opt/void-apollyon-live-custody-binding-v2-preentry-v1/apollyon_live_custody_source_session_launcher_v2.py`.

The legacy repository launcher source remains byte-for-byte
`820f7151c0f83280b7457f841cee14c3b0c274b6`, and the accepted Node runner
remains byte-for-byte
`8c2c92055ab05c074653cee971e095934b5cb85c`.

Before standalone `--live-qualify` may validate or act through the fixed
launcher, V2 first acquires the replacement-stable lifecycle lock. While that
lock is held it requires the fixed installed launcher path itself to be the
exact lock-aware successor: regular root:root file, one link, mode `0444`,
stable open/visible generation and the exact successor Git blob. An unupgraded
legacy launcher therefore causes HOLD while the lifecycle lock is still held,
before any service start.

The same launcher identity is revalidated under that lock immediately before
`systemctl start` and again before successful receipt construction. Path
disappearance or access failure during either visible-generation observation is
translated into machine-readable HOLD rather than escaping as an `OSError`
traceback.

### Replacement-stable root-only lock inode

Both owners lock one create-once regular inode:

`/opt/void-apollyon-live-custody-binding-v2-preentry-v1/.void-apollyon-training-lifecycle-lock-v1`.

The future launcher-upgrade/host-qualification gate must create this object
**once** and preserve the same inode across later launcher and systemd-unit
refreshes. The accepted runtime contract requires:

- canonical non-symlink path;
- root:root ownership;
- regular file;
- one hard link;
- mode `0600`;
- zero-byte content;
- stable visible/open generation;
- `O_CLOEXEC|O_NOFOLLOW` open;
- nonblocking exclusive `flock(2)`.

The parent preentry directory may remain `0755`; the lock inode itself is not
openable by an ordinary local account. A service account therefore cannot hold
the lifecycle flock and deny both authorized owners. Missing, replaced,
permission-drifted, linked, nonempty or non-root lock objects fail closed before
service action.

The lifecycle lock is independent of the replaceable training unit-file inode.
Atomic replacement or refresh of
`/etc/systemd/system/void-apollyon-training-bus-isolation-v1.service` therefore
does not create a second lock domain. The runtime never creates, rewrites,
truncates, unlinks or recovers the lock inode; there is no stale PID/token
authority.

The qualifier holds the lock descriptor from **before** installed-launcher
validation, installed-material, effective-unit and quiescence preflight through
launcher revalidation, start, live-generation observation, stop, final
launcher/effective-unit/state/generation attestation and receipt construction.

The successor launcher holds the same lock before it opens/materializes the
reviewed execution closure. It synchronously runs the unchanged reviewed Node
runner with `subprocess.run(...)` and includes the lifecycle-lock FD in
`pass_fds`. Launcher and runner therefore share the same open file
description. If the launcher parent disappears first, the runner's inherited FD
continues to retain the lock until the runner exits.

### Abnormal runner loss

Normal runner exit retains the existing runner-owned stop-and-attest cleanup.
If the runner exits nonzero, is killed by signal, exceeds the launcher's
timeout, or the launcher is interrupted/receives another post-spawn exception,
its JavaScript `finally` cleanup cannot be trusted to have completed
successfully. Before the launcher can release its own lifecycle-lock descriptor,
the successor therefore:

1. issues an explicit `systemctl stop` for the reviewed training unit;
2. requires stop exit status zero;
3. observes one complete five-property service snapshot with
   `LoadState=loaded`, `ActiveState=inactive`, `SubState=dead`,
   `MainPID=0`, and `UnitFileState=static`;
4. requires a second complete snapshot exactly equal to the first.

If exact dormancy cannot be proven, the launcher HOLDs. An operator
`KeyboardInterrupt` is re-raised only after this stop+dormancy attestation has
completed. Filesystem/subprocess operational failures are translated into the
launcher's machine-readable HOLD contract rather than escaping as tracebacks.
Any later lifecycle owner independently repeats its own pre-start dormancy
checks.

### Pre-mutation launcher authority receipt

The lock-aware successor emits and flushes its own live authority receipt to
**stderr** before taking the lifecycle lock, materializing the private reviewed
closure under `/run`, or invoking the Node runner. Stderr is used deliberately
so the unchanged runner's machine-readable stdout contract remains intact.

The receipt declares:

- host/private-closure filesystem mutation: true;
- service/process start-stop action: true;
- Git mutation/fetch: false;
- systemd configuration mutation: false;
- credential/private-key/wallet/signer access: false;
- transaction construction/signing/broadcast: false;
- chain/economic activation: false;
- funds movement: false.

Failure to emit or flush the receipt is a HOLD before host mutation.

Hosted proof executes the launcher with all mutation boundaries replaced by
event-recording fixtures and requires exact launcher order:
installed-launcher identity → authority receipt → lifecycle lock → trusted Node
open → private closure materialization → sanitized environment → runner
invocation → private cleanup → lifecycle unlock.

The qualifier fixture separately requires:
lifecycle lock → launcher validation → effective-unit/quiescence preflight →
authority receipt → launcher revalidation → effective-unit revalidation →
service start → live observation → verified stop → final launcher/effective-unit
revalidation → lifecycle unlock.

Hosted proof exercises:

- qualifier-held lock rejects the successor launcher;
- successor-held lock rejects the qualifier;
- descriptor close releases the lock without stale state;
- replacing the systemd unit file while the dedicated lock inode is held does
  not split the lock domain;
- a non-root process cannot open the root-owned mode-`0600` lock inode;
- a real Node child retains the inherited lock after the launcher-side FD closes
  and releases it only when the Node process exits;
- every nonzero/signal/timeout/interruption post-spawn outcome receives
  launcher-side stop plus two stable exact-dormant snapshots before unlock; an
  active/running state is rejected;
- launcher filesystem/subprocess failures are translated into machine-readable
  HOLD rather than traceback;
- launcher authority receipt contents and executed pre-mutation call order are
  verified without changing the runner stdout protocol;
- launcher disappearance during post-open revalidation becomes HOLD;
- qualifier launcher identity is validated only after lock acquisition and is
  revalidated immediately before service start and before success;
- legacy installed launcher bytes are rejected before service action;
- the currently reviewed root-v2 upgrader is exact-blob pinned and recognizes
  only its historical `e18124d...` and legacy `b96f99d...` launcher
  generations; the `bb14067d...` lock-aware successor is therefore rejected
  as `fixed_launcher_collision` rather than replaced.

This source gate does **not** claim that Xiphos already has the successor
installed. A separate reviewed launcher-upgrade/host-qualification action is
required before live standalone qualification. Until that exact installed
generation is proven, `--live-qualify` fails closed.

No currently reviewed mutation path can replace the lock-aware successor after
it is installed: the create-only installer will not overwrite a mismatched
existing launcher, and the current root-v2 upgrader rejects the successor as a
collision. Any **future** launcher-refresh successor must acquire this same
persistent lifecycle lock before replacement, preserve the lock inode itself,
and complete post-replacement launcher revalidation before releasing the lock.

## Compatibility boundary

V1 stays byte-for-byte unchanged. Current downstream same-process composition
continues to consume the V1 `--observe-live-pid` receipt. V2 explicitly
reports:

`same_process_composition_receipt_changed=false`.

Migration of the downstream preclaim/session receipt chain, if ever needed, is
a separate versioned gate rather than an implicit source-blob replacement.

A successful V2 standalone receipt is content-addressed with the prefix:

`apollyon_training_isolation_shutdown_v2:`.

It does not create a training/claim authority.

## Hosted proof

Hosted CI is inert. It imports the V2 source and substitutes only the local
systemctl/state/process-generation helpers to prove:

- missing V1 dependency becomes HOLD;
- pre-action authority receipt is emitted before the start call;
- the executed `live_qualify()` fixture proves authority receipt occurs before
  the first start action;
- one multi-property `systemctl show` snapshot is used per service
  observation;
- effective `FragmentPath`, `DropInPaths`, `NeedDaemonReload` and
  `ExecStart` are bound;
- unreviewed systemd `UnitPath` roots and nonempty unit dependency
  directories are rejected;
- the effective-unit contract is revalidated immediately before start and
  again before success;
- qualifier and lock-aware successor-launcher owners contend on the same
  nonblocking exclusive root-only lock inode, and descriptor/process exit
  releases it;
- the executed standalone lifecycle holds the shared lock from before preflight
  through final stop attestation and receipt construction;
- legacy installed launcher bytes are rejected before service action;
- legacy repository launcher and accepted Node-runner blobs remain unchanged;
- a service transition between the first green snapshot and final
  revalidation is rejected;
- nonzero stop is rejected;
- active-after-stop is rejected;
- exact old PID generation survival is rejected even with inactive/dead/0;
- non-dead substate is rejected;
- inactive/dead/MainPID=0 plus old-generation absence is accepted;
- unit-file-state drift away from static is rejected;
- the exact V1 source blob remains bound.

No hosted mode starts or stops a Xiphos service.

## Authority

This source/test/CI gate does not:

- mutate Xiphos filesystem, accounts, groups, systemd or services;
- publish a durable attempt claim;
- release a trainer or execute training/model/weight mutation;
- access private keys, signing or wallets;
- sign or submit transactions;
- move funds.

All such authority remains false.

**PROTECT THE CORE.**
