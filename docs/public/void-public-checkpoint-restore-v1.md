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

An existing file, directory, symlink, or dangling symlink at `DATA_DIR` makes
the restore ineligible. The consumer does not delete, rename, empty, reinterpret,
or overwrite an existing data directory.

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

## One staging generation

The consumer creates one sibling staging path:

```text
<DATA_DIR>.void-public-checkpoint-restore-v1-staging
```

It downloads the exact packet into that directory using durable file writes.

The existing canonical checkpoint verifier then scans the whole packet using the
production follower block-admission semantics.

Only after that semantic verification succeeds does the consumer delete the
packet-only `checkpoint.json` and run:

```text
autoRepairDataDir(staging, { sparseEvery: 16, dryRun: false })
```

That reconstructs `index.sparse`, `meta.json`, `heads.json`, and `head.txt` from
the verified `blocks.bin` files.

## Activation

Immediately before activation, `DATA_DIR` must still be absent.

The verified/reconstructed sibling staging generation is activated with a
same-filesystem **no-replace** rename using reviewed GNU Coreutils `mv >= 9.4`:

```text
mv -T --no-copy --no-clobber -- <staging> <DATA_DIR>
```

The reviewed Coreutils 9.4 two-path move begins with
`renameat2(..., RENAME_NOREPLACE)`. `--no-clobber` also prevents fallback from
replacing an existing destination, while `--no-copy` forbids cross-filesystem
copy fallback.

The consumer treats a surviving staging directory as an activation HOLD even
when `mv --no-clobber` returns success. On successful activation it additionally
requires the final `DATA_DIR` to have the exact same device and inode as the
staging directory, then fsyncs the parent directory.

Therefore a `DATA_DIR` that appears after the earlier eligibility check is not
replaced. The external destination remains untouched and the staged generation
is not activated.

There is no in-place population of a live store and no concurrent node process.

If any pre-activation or no-clobber activation step fails, the process removes
only the staging generation it created. An independently created `DATA_DIR` is
preserved.

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
