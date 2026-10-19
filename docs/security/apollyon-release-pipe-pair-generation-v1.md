# Apollyon native release same-pipe generation candidate v1

Marker: `VOID_APOLLYON_RELEASE_PIPE_PAIR_GENERATION_V1`

Status: **source/test-only native candidate**. No Xiphos installation, service, claim-store mutation, trainer release or training execution.

## Purpose

Accepted native trainer reader #3381 binds its inherited FD3 to one anonymous read-only Linux pipe generation. It deliberately cannot show that a future releaser owns the matching write end. This candidate supplies a concrete kernel-level construction/cross-process **same-pipe identity proof** for later integration without treating matching inodes or a frame as release authority.

Exact parent: #3381 head `458e8d3e8e7b52c1963788b9d09b7e4ea2294f45`. The parent native candidate and its proof remain unchanged.

## Kernel evidence

The candidate validates two caller-held descriptors within one process:

- both numbers are distinct and at least FD 3;
- `fcntl(F_GETFL)` establishes a read-only read end and write-only write end, with no `O_PATH` substitution;
- `fcntl(F_GETPIPE_SZ)` succeeds on both Linux pipe endpoints;
- `fstat` proves `S_IFIFO` and exact matching device, inode, and mode;
- readlink observations of `/proc/self/fd/N` are performed beneath a retained `/proc` descriptor with `PROC_SUPER_MAGIC` and exact `self -> getpid()` binding;
- both procfs links are exactly `pipe:[<same inode>]`, not a named FIFO pathname.

The candidate duplicates both endpoints into **module-owned CLOEXEC FDs**, then revalidates both originals and retained copies. A changed original FD number is rejected even while the module-owned copy keeps the original kernel inode alive. It makes no claim to detect a change-and-restore ABA that happened entirely between observations; later protected execution must serialize/deny such substitutions.

## Cross-process fixture

The hosted self-test uses real `pipe2`, `fork`, inherited FD 3 and a separate child-ready handshake. Only after the child confirms FD3 was installed does the parent inspect the real child's `/proc/<pid>/fd/3` symlink under verified procfs. The test requires:

- same pipe across retained parent read/write and child FD3 = accepted fixture;
- a child FD3 connected to an unrelated second pipe = rejected fixture;
- swapped directions, distinct pipe endpoints, duplicate FD number, and original FD replacement = rejected;
- the same held duplicate write endpoint does **not** make identity false, demonstrating that pipe identity alone cannot establish exclusive writer ownership.

This is a test-only fork fixture. The candidate does not prove a reviewed protected releaser spawned the eventual Xiphos trainer. The later releaser/trainer integration must bind source identity, direct parent or equivalent kernel lineage, retained pidfd/start-ticks, and both live endpoints to the same retained kernel pipe from construction through write, close and EOF.

## Deliberate HOLDs

The native tool exposes one successful mode: `--self-test`. Every other argument set returns HOLD with no release action. The code performs no real trainer release or model work.

Even a successful self-test leaves:

```text
protected_releaser_origin_proven=false
writer_exclusivity_proven=false
trainer_releaser_lineage_proven=false
trainer_release_authorized=false
trainer_release_performed=false
training_execution_authorized=false
training_execution_performed=false
store_mutation=false
key_signing_transaction_funds=false
```

Matching read/write pipe identity is necessary but insufficient: late `dup`, `fork` or `SCM_RIGHTS` may escape a writer-end census. Future native integration must enforce writer exclusivity continuously through the exact 64-byte frame, write-half close and EOF, and must authenticate the release source/lineage at those boundaries.

## Proof and authority

The hosted proof pins the exact source and upstream #3381 C blob, builds three deterministic static ELF candidates, rejects dynamic interpreter/NEEDED imports, runs the real self-test, then verifies `--run`, missing and extra modes all HOLD. Its only writes are disposable CI build files.

This source candidate grants **no** Xiphos account, group, systemd, socket, claim-store, authorization, trainer-release, training, private-key, signing, wallet, transaction or funds authority.

PROTECT THE CORE.

## October 19 current-parent reconciliation

This generation is a non-force merge-forward over current #3381
`458e8d3e8e7b52c1963788b9d09b7e4ea2294f45`. The #3397 native same-pipe C source remains byte-identical
at `93390eefd1e72e70af7206e9982c8eaa5e042149`; only the focused proof and
documentation bind the current #3381 native C generation
`7ce2475cb50d6527b526479892e5d662792ce84b`.

Writer exclusivity, protected releaser origin, trainer/releaser lineage,
protected-store provenance, trainer release, training, credentials,
transactions, and funds authority remain false/unproven.
