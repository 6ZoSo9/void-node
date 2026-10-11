# Buy VOID cross-UID shared bakery queue v1

## Purpose

The verified-payment capacity admission queue on current main is private to the
ordinary runtime UID. The allocation-custody service runs under a distinct UID,
so it cannot independently prove that it shares the same serialization domain.

This change extends the existing filesystem bakery-lock primitive with one
**additive, existing-only shared-group queue API**. It does not create,
provision, chmod or chown a production queue.

## Shared queue contract

`withBuyVoidFilesystemBakeryLockAsyncExistingSharedGroupQueueV1(...)`
requires all of the following before it creates a claim:

- an absolute existing direct directory;
- exact caller-supplied numeric GID;
- the calling process is a member of that GID;
- exact directory mode `02770` (setgid, owner/group rwx, no other access);
- claim files are forced to mode `0660`;
- the directory GID inherited by every claim is checked before publication.

The existing private `0700` APIs and their ownership checks are unchanged.

The shared queue still uses the same choosing/ticket bakery algorithm,
process-incarnation binding, dead-process cleanup, bounded wait, fsync and
own-claim cleanup as the private queue. This is deliberately not a second
lock implementation.

## Cross-UID proof

Hosted CI provisions a disposable Linux group plus two distinct unprivileged
users. Both users enter the same root-owned setgid `02770` queue and contend
for an exclusive synthetic sentinel. The proof fails if their critical
sections overlap, if either user cannot read the other user's claim, if claim
permissions are not group-readable/writable, or if the queue is left dirty.

The proof also checks that wrong mode, wrong GID and symlink substitution fail
closed, and that the pre-existing private-queue API still works.

## Authority boundary

This source lane does **not** yet mount the shared queue into either the
verified-payment writer or the custody service. It therefore does not make
`payment_capacity_lock_verified` true and does not authorize reserve,
recovery, payment acceptance, allocation mutation, presale activation,
wallet/signer use, transaction broadcast, Chain-2050 state change or funds
movement.

The next source step is to make both sides enter this exact queue before their
existing private serialization/read logic, followed by a host permission
qualification for the dedicated IPC group. No production directory or service
change is performed here.

**PROTECT THE CORE.**
