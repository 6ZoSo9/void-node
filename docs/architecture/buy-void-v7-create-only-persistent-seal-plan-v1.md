# Buy VOID V7 create-only persistent seal alternative plan V1

## Status

Plan only. This does not change the landed trusted launcher V2 and does not install anything.

Plan ID: `voidv7createonlysealplan1_792de040abebf3e158a6a591cd74478dc2ab3ba21a396b504a542af08594022c`.

Base: `main@0d93be0a7ae1395449a386d4fbe14bb680f51c3f`.

## Why this lane exists

Launcher V2 deliberately requires SHA-256 fs-verity for every privileged file that can influence pre-V5 execution. Precision's same-filesystem probe for `/opt` returned `FS_IOC_MEASURE_VERITY -> ENOTSUP`, so that exact kernel seal is unavailable on the observed target filesystem.

The obvious inode-immutable fallback is **not** accepted here. Current e2fsprogs documentation notes that setting the immutable (`i`) or append-only attribute does not remove write ability from file descriptors that were already open. That fails the retained-writable-handle threat this gate exists to close.

## Candidate alternative: CREATE_ONLY_CLOSED_TREE_V1

The alternative does not claim kernel cryptographic verified reads. It changes the provenance rule instead:

> No trusted destination inode may ever have existed under caller ownership or caller write authority.

A future separately reviewed bootstrap installer must build the complete launcher/runtime/policy/source payload in a private root-only staging tree beneath a retained root-owned parent. Every trusted destination file is created as a **fresh inode** with descriptor-relative `O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`. Caller/source inodes are read only; they are never renamed or hard-linked into the trusted tree and an existing destination is never adopted by chmod/chown.

For each destination the future installer must:

1. bind exact source size/SHA-256 through a retained no-follow/nonblocking regular-file descriptor;
2. create a fresh root-private destination inode;
3. write exact bytes through the retained destination descriptor;
4. fsync data, set final root ownership/mode, and fsync metadata;
5. close every writable destination descriptor;
6. prove its own descriptor table contains no writable handle to any trusted staged inode;
7. reopen each file read-only/no-follow/nonblocking and revalidate device, inode, owner, mode, nlink, size and SHA-256.

Only after the complete tree and a closed installation receipt are read-only revalidated may the whole tree be published with same-filesystem atomic **no-replace** semantics. The retained final parent is then fsynced and the visible generation is revalidated.

## Same-UID adversary

A future executable proof must let the ordinary runtime UID retain a writable descriptor to the **source** before installation, then mutate/truncate/replace that source after authentication. The already-created destination bytes must remain unchanged.

The same UID must be unable to obtain a writable descriptor to the destination before publication because the stage is root-private and the destination inode did not exist beforehand. After publication, ordinary write-open attempts must fail.

This is why chmod/chown of a pre-existing inode, a read-only bind mount, a pathname hash check, and `FS_IMMUTABLE_FL` are not equivalent substitutes.

## Crash and idempotence

Before publication, a crash may leave only a root-private non-authoritative stage. The final fixed root is never partially merged or overwritten.

If atomic publication occurs but final-parent fsync fails, retry must revalidate the complete published tree and receipt, fsync the retained parent, and revalidate again before accepting idempotent success.

An existing final root is accepted only when the trusted installation receipt and every bound inode/hash/mode are exact. Any mismatch HOLDs without repair in place.

## Launcher generation

Launcher V2 remains unchanged and continues to require fs-verity.

A create-only provenance seal can only be consumed by a **new launcher generation** whose policy explicitly selects one reviewed seal mode. The new launcher must preserve V2's exact hashing, retained descriptors, terminal generation checks, static first-instruction boundary and V5 operation bindings.

The alternative's threat model covers unprivileged/same-UID retained-handle and pathname races. It does not claim resistance to an arbitrary malicious root with post-install kernel/filesystem mutation authority.

## Bootstrap gate

The future root bootstrap installer is itself a first-entry security boundary and requires its own distinct static source generation and review. This plan does not authorize implementing or executing it.

## Authority

No launcher modification, bootstrap implementation, host capability probe, root execution, protected filesystem mutation, fs-verity enablement, launcher installation, V5 apply, service mutation, credentials/signing, RPC/transaction, payment/presale/WC activation, treasury/liquidity action, or funds movement is authorized.

Next gate:

`DISTINCT_REVIEW_OF_ALTERNATIVE_SEAL_PLAN_BEFORE_NEW_LAUNCHER_OR_BOOTSTRAP_IMPLEMENTATION`

PROTECT THE CORE.
