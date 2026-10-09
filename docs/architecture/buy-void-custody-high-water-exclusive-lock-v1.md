# Buy VOID custody high-water private exclusive lock V1 — unmounted

## Purpose

The reviewed custody-launch V2 classifier [#2681](https://github.com/6ZoSo9/void-node/pull/2681)
checks signed launch receipt and high-water semantics, while the read-only
observer [#2684](https://github.com/6ZoSo9/void-node/pull/2684) binds
disk observations to retained Linux file descriptors. Separate completed
synthetic [#2685](https://github.com/6ZoSo9/void-node/pull/2685)
exercises fsync and rename fault stages but explicitly lacks **exclusive
cross-process serialization**. Merely checking prior high-water bytes
before a rename does NOT serialize competing writers.

This additive Draft introduces a reusable **source-only, unmounted**
private-directory exclusive lock primitive. It does not implement an
authorized high-water record writer, raise any classifier policy flag,
change service/UID/socket configuration, or use live custody state.

## Boundary and failure semantics

`src/economic/buy_void_custody_high_water_exclusive_lock_v1.mjs`
provides `withBuyVoidCustodyHighWaterExclusiveLockV1({private_directory},
criticalSection)` for a future separately reviewed privileged service.
It is never imported by current production handlers. The private path
must be chosen by the future custody-owned service, not an IPC/customer
request; no application-provided private path gains authority here.

The primitive:

- requires Linux, `/proc/self/fd`, `O_DIRECTORY`, `O_NOFOLLOW` and
  strict, canonical absolute directory components; walks from a held
  filesystem root descriptor rather than trusting a mutable original
  ancestor pathname;
- binds each opened directory to visible inode/dev/mode/uid/gid before
  use and after the synchronous critical section, and requires the
  final custody-private directory to be **0700**, owned by a nonroot
  invoking UID;
- atomically creates the fixed private lock directory
  `.void-buy-custody-high-water-exclusive-v1.lock` via a held private
  parent-directory fd; no PID/mtime guess or lock stealing is supported;
- synchronously fsyncs the parent directory before calling the enclosed
  operation; a competing process or recursive entry sees `EEXIST`
  and fails closed;
- forbids async callbacks, which could outlive the exclusive interval;
- checks retained directory and lock identity before an empty-directory
  removal; releases only after synchronous callback completion and
  parent-directory fsync;
- **retains** a lock on callback failure, a failed release or a process
  crash. Stale-lock takeover/reaping is not an API. Recovery needs
  independently approved prior-record/rename/high-water and host
  identity reconstruction.

The synthetic proof only creates private OS-temp fixtures. It tests
nested and real **second-process** contention, successful exclusive
release, a later clean acquisition, 0755 mode, symlink root, existing
stale directory, callback exception and attempted async critical
section. Any failure leaves the lock until **fixture-only** cleanup.
Node 22/24/26 produce byte-identical receipts.

## What this does not close

No signed launch receipt is revalidated at commit, and no custody V2
candidate is written. This is a private-dir lock primitive only, not a
linearizability or power-loss proof for a complete writer; Linux local
filesystem/procfs/mount and cross-UID principal assumptions remain
unqualified on the actual installed service. Same-UID malicious code
or another root process is outside this narrow source proof.

A future actual writer MUST hold the privileged exclusive lock while
revalidating server-owned receipt/generation/clock and protected
high-water, then use staged O_EXCL file creation, exact bytes, file
fsync, same-dir rename, parent fsync and post-commit readback. It must
reconcile every uncertain previous fault/lock without silent
high-water rollback, and allow reserve/recover only after the original
durable buyer/payment+allocation lineage is independently verified.

**Authority remains false:**
`trusted_server_path_selection_verified=false`,
`installed_custody_service_uid_qualified=false`,
`cross_uid_ipc_authenticated=false`,
`custody_high_water_writer_implemented=false`,
`reserve_enabled=false`,
`recover_enabled=false`,
`production_allocation_mutation_ready=false`, and `funds_moved=false`.

No Ready/merge/host/service, credential/key/wallet/signer, customer
ledger, transaction, Chain-2050/WC, presale/market, inventory,
treasury/liquidity or funds movement.

**PROTECT THE CORE.**
