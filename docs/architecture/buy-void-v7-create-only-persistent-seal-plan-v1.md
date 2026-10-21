# Buy VOID V7 create-only persistent seal alternative plan V1

## Status

Plan only. This does not change the landed trusted launcher V2 and does not install anything.

Plan ID: `voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc`.

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
5. keep the entire destination-write phase single-process: while any trusted destination write FD is live, forbid fork/clone/vfork/posix_spawn/helper creation, descriptor inheritance/duplication into another process, SCM_RIGHTS or other FD passing, and any UID/GID drop;
6. never create a MAP_SHARED|PROT_WRITE mapping of a trusted destination inode, and forbid process creation while any writable shared destination mapping exists;
7. close every writable destination descriptor;
8. treat the installer's own FD-table census only as local evidence, never as proof of cross-process containment;
9. reopen each file read-only/no-follow/nonblocking and revalidate device, inode, owner, mode, nlink, size and SHA-256;
10. require the accepted destination size and SHA-256 to equal the exact pre-copy pinned source size and SHA-256 before any publication.

Only after the complete tree and a closed installation receipt are read-only revalidated may the whole tree be published with same-filesystem kernel-atomic **no-replace** semantics. A check-for-absence followed by an ordinary replace-capable rename is not authority. The retained final parent is then fsynced and the visible generation is revalidated.

## Cross-process retained-authority adversaries

Fresh root-private inodes and `O_CLOEXEC` are necessary but insufficient. `FD_CLOEXEC` only closes a descriptor across exec; it does not revoke a writable open-file description inherited across fork, and a writable descriptor can also be explicitly transferred to another process. The future bootstrap construction phase must therefore be a single-process critical section from the first trusted-destination writable open through closure of the last trusted-destination writable FD. No fork/clone/vfork/posix_spawn/helper, no `SCM_RIGHTS` or equivalent FD transfer, and no credential drop may occur inside that interval.

The same rule applies to writable shared mappings. Closing an FD and chmodding an inode read-only do not revoke an existing `MAP_SHARED|PROT_WRITE` mapping, and a forked descendant can inherit that mapping. The future bootstrap must never create such a mapping for a trusted destination inode and must not create descendants while any equivalent writable mapping authority exists.

The write phase must also begin and remain **single-threaded**. A pre-existing secondary thread can race a trusted destination descriptor or duplicate it before the primary path closes the descriptor; forbidding only later `fork()`/process creation is therefore insufficient. Before the first trusted-destination writable descriptor or writable mapping exists, the bootstrap must establish that no secondary thread exists, and it must forbid thread creation (`pthread`, `clone3`, or equivalent) until all destination write authority is gone.

Userspace descriptor closure is also not proof that the kernel has stopped writing. The future bootstrap must not submit destination writes through io_uring, POSIX AIO, Linux AIO, or any equivalent asynchronous interface that can retain an in-flight write request beyond userspace FD closure. Publication requires explicit destination-I/O quiescence: no outstanding kernel-retained write request may still target a trusted destination inode.

The source proof deliberately demonstrates the inherited-FD and inherited-shared-mapping Linux hazards with disposable unprivileged temporary files: a forked child writes through an inherited `O_CLOEXEC` destination FD after the parent closes/chmods it, and another child writes through an inherited writable shared mapping after the FD is closed. Those controls prove why the plan must preclude those authorities before publication. The thread and asynchronous-I/O requirements are plan-level obligations for a future bootstrap proof; this plan does not claim they are already implemented or kernel-enforced.

## Same-UID adversary

A future executable proof must let the ordinary runtime UID retain a writable descriptor to the **source** before installation, then mutate/truncate/replace that source after authentication. A retained source descriptor is not a snapshot: mutation may change bytes observed during copy. Therefore any destination whose final size or SHA-256 differs from the pre-copy pinned source identity must HOLD before publication; mutated source bytes must never become an accepted published generation.

The same UID must be unable to obtain a writable descriptor to the destination before publication because the stage is root-private and the destination inode did not exist beforehand. After publication, ordinary write-open attempts must fail.

This is why chmod/chown of a pre-existing inode, a read-only bind mount, a pathname hash check, and `FS_IMMUTABLE_FL` are not equivalent substitutes.

## Crash and idempotence

Before publication, a crash may leave only a root-private non-authoritative stage. The final fixed root is never partially merged or overwritten.

If atomic publication occurs but final-parent fsync fails, retry must revalidate the complete published tree and receipt, fsync the retained parent, and revalidate again before accepting idempotent success.

An existing final root is accepted only when the trusted installation receipt and every bound inode/hash/mode are exact. The receipt payload manifest must bind every trusted payload file but must exclude a receipt self-hash cycle; the receipt file itself is separately required to be a fresh single-link root-owned closed file with exact schema/size/mode/inode checks. Every published trusted payload file and the receipt must have nlink exactly one. Any mismatch HOLDs without repair in place.

## Launcher generation

Launcher V2 remains unchanged and continues to require fs-verity.

A create-only provenance seal can only be consumed by a **new launcher generation** whose policy explicitly selects one reviewed seal mode. The new launcher must preserve V2's exact hashing, retained descriptors, terminal generation checks, static first-instruction boundary and V5 operation bindings.

The alternative's threat model covers unprivileged/same-UID retained-handle, inherited/transferred descriptor, inherited writable shared-mapping, and pathname races. It does not claim resistance to an arbitrary malicious root with post-install kernel/filesystem mutation authority.

## Bootstrap gate

The future root bootstrap installer is itself a first-entry security boundary and requires its own distinct static source generation and review. This plan does not authorize implementing or executing it.

## Authority

No launcher modification, bootstrap implementation, host capability probe, root execution, protected filesystem mutation, fs-verity enablement, launcher installation, V5 apply, service mutation, credentials/signing, RPC/transaction, payment/presale/WC activation, treasury/liquidity action, or funds movement is authorized.

Next gate:

`DISTINCT_REVIEW_OF_ALTERNATIVE_SEAL_PLAN_BEFORE_NEW_LAUNCHER_OR_BOOTSTRAP_IMPLEMENTATION`

PROTECT THE CORE.
