# VOID public checkpoint restore v1

## Purpose

This source layer adds a fail-closed fresh-node checkpoint consumer for the
already-reviewed public checkpoint transport.

It does not publish a checkpoint and it is disabled by default.

Enablement is explicit:

```text
VOID_PUBLIC_CHECKPOINT_RESTORE=1
```

The initial v1 integration is HTTPS-supervisor only. Tor-only and composed
multipath startup continue without checkpoint restore; no unsigned checkpoint
path is introduced.

## Fresh-node eligibility

Checkpoint restore is eligible only when `DATA_DIR` does not exist.

An existing ordinary file or directory at `DATA_DIR` makes a new restore
ineligible. The consumer does not delete, rename, empty, reinterpret, or
overwrite an existing data directory.

After a successful restore, the HTTPS supervisor may recognize one special
checkpoint selector symlink at `DATA_DIR`. That selector is identity metadata,
not a filesystem path followed by the node. An unrecognized or malformed
`DATA_DIR` symlink fails closed.

This is intentionally stricter than accepting an existing empty directory.

## Authority and ordering

The HTTPS public-bootstrap supervisor already owns the qualified loopback client
adapter and its ephemeral response-authority secret before the node process is
spawned.

When restore is enabled, the supervisor:

1. starts the existing qualified HTTPS adapter;
2. starts a short-lived restore child with an IPC channel;
3. sends the same ephemeral adapter authority only over IPC after the restore
   child emits the existing authority-ready handshake;
4. waits for the restore child to finish; and
5. only then starts `dist/index.js`.

The restore child imports the same production challenged-HMAC authority module
used by follower bootstrap. It does not implement a parallel response-authority
transcript.

## Download and verification

The restore child performs the already-bound ordered transport:

1. authenticated `/__void/checkpoint/v1.json`;
2. authenticated `checkpoint.json`;
3. each authenticated `blocks.bin` segment.

The adapter itself enforces discovery→manifest→segment generation binding before
it emits response authority. The restore child independently verifies the HMAC
and uses the shared checkpoint contract again.

The shared 64 MiB per-segment ceiling remains in force.

If discovery returns `status: unavailable`, the restore child exits successfully
without creating `DATA_DIR`, allowing the ordinary historical follower path to
start.

Any HMAC, qualification, content-binding, manifest, segment, filesystem, or
semantic verification failure aborts startup when restore was explicitly
enabled.

## Generation-bound staging

Each restore attempt creates one unique sibling generation:

```text
<DATA_DIR>.void-public-checkpoint-restore-v1-gen-<128-bit-token>
```

Immediately after creation the restore opens that directory with
`O_DIRECTORY|O_NOFOLLOW`, records its device/inode, and retains the directory
file descriptor for the entire attempt.

All packet writes, semantic verification, and metadata reconstruction use the
retained generation through:

```text
/proc/self/fd/<fd>
```

The normal SegStore path-confinement policy still rejects proc-FD roots.
The restore must explicitly register exactly its live directory FD; registration
is process-local, Linux-only, identity-bound, and unregisters before exit.
Symlinks beneath the registered generation remain rejected.

The canonical checkpoint verifier has a similarly explicit verify-only
`--proc-fd-root` mode. The verifier child receives only the already-open staging
directory FD, checks the descriptor identity, and scans the packet through that
FD. Arbitrary proc-FD packet paths remain invalid.

After semantic verification the consumer deletes the packet-only
`checkpoint.json` through the retained FD root and runs:

```text
autoRepairDataDir(fdRoot, { sparseEvery: 16, dryRun: false })
```

That reconstructs `index.sparse`, `meta.json`, `heads.json`, and `head.txt` in
the exact owned generation.

### Failure and crash convergence

Failed staging generations are deliberately **not recursively deleted** by v1.
The attempt closes its descriptor and reports one terminal:

- `owned_stale_generation_retained`;
- `foreign_replacement_preserved`; or
- `namespace_missing`.

Because every attempt uses a new unpredictable generation name, a stale
generation from a crash does not block the next attempt. A retry creates a new
generation and does not adopt or delete the stale one.

This is intentionally conservative: disk reclamation of stale generations is a
separate reviewed maintenance operation, not an implicit failure cleanup path.
A foreign directory installed at a prior generation pathname is never
recursively deleted by restore.

## Activation

The verified generation directory is **never renamed into `DATA_DIR`**.

Activation is split into two boundaries:

1. the restore captures the exact generation token + device + inode + checkpoint
   ID;
2. it atomically creates `DATA_DIR` as a no-replace symlink selector whose
   target is a strict metadata token, not a path.

The selector publication uses one `symlink(2)` directory-entry creation and a
parent-directory fsync. If any file, directory, or selector already occupies
`DATA_DIR`, publication fails without replacing it.

A staging pathname replacement after generation capture cannot redirect the
activation effect: no staging pathname is moved. The selector remains bound to
the captured device/inode. Before node spawn, the HTTPS supervisor opens the
selected generation using `O_DIRECTORY|O_NOFOLLOW` and requires its live
device/inode to match the selector. A foreign replacement therefore remains
unmoved and produces a HOLD before node start.

The supervisor passes the already-open verified generation into `dist/index.js`
as inherited child FD 4 and sets:

```text
DATA_DIR=/proc/self/fd/4
VOID_SEGSTORE_INHERITED_DATA_AUTHORITY_V1=1
VOID_SEGSTORE_INHERITED_DATA_FD_V1=4
VOID_SEGSTORE_INHERITED_DATA_DEV_V1=<captured device>
VOID_SEGSTORE_INHERITED_DATA_INO_V1=<captured inode>
```

SegStore accepts that proc-FD root only when all inherited authority fields are
present and `fstat(4)` matches the expected device/inode. Normal unregistered
proc-FD roots remain rejected, and child symlinks remain rejected.

Once the supervisor opens the generation, later namespace replacement cannot
redirect the node: the child receives the open directory description itself.
The supervisor closes only its parent copy after spawn.

Crash/restart convergence is bounded:

- before selector publication: any unique stale generation is ignored and a
  retry creates a new generation;
- after selector publication: a restart reopens and verifies the selected
  generation by device/inode before node spawn;
- a selector whose generation path was replaced or removed fails closed and
  cannot become ordinary existing-store success.

There is no in-place population of a live store and no concurrent node process
during restore.

## Deliberately not included

This generation does not:

- enable restore by default;
- upload or publish the real checkpoint;
- configure the live seed gateway with checkpoint bytes;
- deploy or restart a service;
- restore or mutate Precision's live `data_a`;
- add checkpoint restore to Tor or multipath supervisors;
- claim #1005 external N−1 bootstrap acceptance;
- grant wallet, signer, validator, treasury, Work Credit, or funds authority; or
- move funds.

A later operational gate may enable this source primitive only after the live
checkpoint transport/publication generation is separately reviewed.
