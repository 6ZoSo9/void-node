# Apollyon training-service lifecycle lock V1

Marker: `VOID_APOLLYON_TRAINING_SERVICE_LIFECYCLE_LOCK_V1`.

Status: **source/test/CI synchronization primitive only**.

## Purpose

The standalone installed-isolation qualifier and the reviewed live custody
launcher both have authority to start and stop the same Apollyon training unit.
Without one shared mutex, each can pass an initial quiescence check and then
race the other owner across `systemctl start` / observation / cleanup.

This gate defines the shared crash-releasing kernel lock primitive needed to
serialize those future lifecycle owners.

It does not start, stop, enable, install or mutate any service.

## Lock domain

The lock domain is the stable systemd directory:

`/etc/systemd/system`.

The implementation opens that directory:

- read-only;
- as a directory;
- with `O_CLOEXEC`;
- with `O_NOFOLLOW`;
- requiring root ownership; and
- requiring no group/world write bits.

It then takes:

`flock(LOCK_EX | LOCK_NB)`.

The lock is retained by the owner process for the entire future lifecycle
critical section. Normal close releases the lock, and kernel process teardown
releases it automatically if the owner crashes.

No lock file is created, so there is no stale PID file or stale filesystem lock
record to clean up.

## Training-unit identity under lock

Before and immediately after acquiring the directory lock, and on explicit
revalidation, the primitive verifies the exact reviewed training unit:

`/etc/systemd/system/void-apollyon-training-bus-isolation-v1.service`.

Required identity:

- Git blob SHA-1:
  `62fbabe1cf7ae0d940f5d96e19b06282f841267b`;
- owner/group: `0/0`;
- mode: `0644`;
- regular non-symlink leaf;
- link count exactly one;
- bounded complete read.

The directory FD's device/inode is retained and the visible directory path must
remain the same generation. The unit file itself may be re-opened for
revalidation, but it must remain the exact reviewed bytes and metadata while
the lifecycle lock is held.

Using the directory inode as the lock domain means a replacement of the unit
file cannot silently create a second mutex domain.

## Hosted proof

The proof uses only disposable temporary directories/files. It performs no
systemd or service action.

It proves:

- exact source generation;
- same-process second acquisition fails busy;
- explicit close releases and permits reacquisition;
- a separate process holding the lock blocks the parent;
- `os._exit` without Python cleanup still releases the lock through kernel
  process teardown;
- unit symlinks fail closed;
- wrong unit mode fails closed;
- wrong unit bytes fail closed;
- writable lock-root metadata fails closed;
- replacement of the lock-root path while the FD is retained is detected;
- the retained lock FD has `FD_CLOEXEC`.

## Integration requirement

This primitive **does not by itself close the shared-lifecycle P1**.

The finding is closed only after every live-authoritative owner of
`void-apollyon-training-bus-isolation-v1.service` participates in this same
lock domain for the complete interval:

1. acquire lock;
2. verify effective unit and exact quiescence;
3. start;
4. observe/use the exact service generation;
5. stop and prove generation absence;
6. revalidate unit/lock generation;
7. release lock.

At minimum the future integrations must cover:

- standalone installed-isolation qualification; and
- the protected live custody source-session launcher wrapping the reviewed Node
  runner.

No owner may acquire after its quiescence check or release before final stop
attestation.

## Authority

This gate keeps false/unperformed:

- Xiphos filesystem mutation;
- systemd/service action;
- training execution;
- durable attempt claim;
- trainer release;
- credential/private-key/signing/wallet access;
- transaction/funds action.

Next gate: integrate the shared lock across the two live lifecycle owners and
prove mutual exclusion end-to-end.

**PROTECT THE CORE.**
