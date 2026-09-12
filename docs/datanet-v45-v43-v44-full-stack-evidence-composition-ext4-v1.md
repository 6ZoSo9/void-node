# DataNet V45 V43→V44 full-stack evidence composition on ext4 v1

V45 is a proof-only descendant of the component-accepted V44/#1504 exact head `d73512174afd4f1f0f2591b11ae6bb9955e203ba`. This revision repairs the invalidated aggregate construction; source alone is not acceptance. One exact head is accepted only when its downstream Node 22/24/26 top aggregate is GREEN. Until that exact-head receipt exists, live coordination status remains **HOLD**.

## Composition

For each Node 22/24/26 job, one traced runner performs a single ordered chain on disposable ext4 images:

1. Run the accepted V41 generation-bound fs-verity campaign.
2. Capture the V42 canonical snapshot.
3. Suspend both device-mapper devices with `--noflush`, retain the crash images before clean unmount, require `needs_recovery`, replay the journal, and require the post-recovery V42 snapshot to remain byte-identical.
4. Run the accepted V43 verifier.
5. On that same recovered R0 filesystem and the same CLOSED record, bind FIEMAP, inode generation, record bytes, and fs-verity digest.
6. Release both mounts, mappers, and loops; mutate exactly one raw backing-image data byte; reattach R0; and require the V44 direct read and actual V41 admission read to fail with `EIO`.
7. Release and remove every disposable storage capability before candidate and terminal verification starts.

The V43 and V44 tiers therefore share one V41 campaign and one recovered R0 image. V44 is not a parallel fixture run.

## Per-node evidence

Each per-node candidate and source-distinct terminal verifier independently reconstruct:

- exact Git head, tree, recursive tree inventory, and the canonical transitive source wall;
- exact Node, Python, kernel, and executable identities;
- ordered V41/V42/V43/V44 child receipts;
- the V41 27-lifetime / peak-9 / 15,372-call / 960-MiB ledger;
- pre/post recovery snapshots and superblock receipts;
- the V43→V44 CLOSED-record identity, ext4 generation, bytes, and fs-verity digest;
- every retained pre-aggregate artifact name, size, and SHA-256 from the exact descriptor bytes used for semantics;
- a `strace -f` census of the runner subtree only, with measured runner-subtree peak process concurrency;
- direct post-run kernel checks that the unique mount/loop/mapper token is absent.

Membership, hashing, and semantic parsing consume bytes from the same retained `O_NOFOLLOW` file descriptors. Retained root and child-directory descriptors bind pathname visibility before and after verification. Candidate and terminal A→B→A controls replace a semantic member and restore the original inode; both cuts must still reject the directory-generation change.

Source execution is generation-bound separately. An exact-workflow bootstrap opens the checked-in source supervisor with `O_NOFOLLOW`, hashes those descriptor bytes against the supervisor blob in the exact expected head, copies the verified bytes into a memfd, applies and verifies the write/grow/shrink/seal seal set, and executes that immutable generation through `/proc/self/fd`. The supervisor reconstructs a private source tree exclusively from the exact-head Git blobs, fsyncs it, opens and retains every source file and directory, and starts the admitted entrypoint through its retained descriptor with the snapshot as the local interpreter root. Every nested Python, Node, and shell source therefore resolves inside the same retained snapshot. After the child retires, the supervisor rechecks every file descriptor, digest, inode/link/size/mode/mtime/ctime fingerprint, visible directory entry, and directory membership before emitting a sealed receipt that binds the child output bytes.

Every named phase has one exact symbolic argv vector, entrypoint handoff mode, path-token set, owned-output role set, and stdout/stderr custody rule duplicated in the source-distinct verifiers. Prefix matches are insufficient. The receipt records every dynamic token value and declared absolute path, and binds the fully resolved argv by SHA-256 so a verifier can reconstruct the command actually executed. Before a child starts, the supervisor requires the final output pathname to be absent, creates a mode-`0400` inode with `O_EXCL` in a private same-filesystem staging directory, retains its descriptor, and gives a producer access only through that inherited descriptor. After successful child and source-generation checks, it atomically publishes that same inode to the declared final pathname and binds its role, name, size, digest, mode, stdout/stderr stream, and generation in the phase receipt. This keeps an in-progress output outside the evidence directory being verified while preventing a child from selecting or overwriting a preexisting pathname.

This supervision applies to the static/runtime phase, the complete traced runner subtree, candidate A, controls B, terminal C and its controls, and downstream verifier D. Every supervised receipt binds the positive GitHub `run_id` and `run_attempt`; the runner environment, capability-release receipt, candidate, controls, per-node aggregate, artifact name, downstream aggregate, top JSON name, and top artifact name carry the same attempt identity. An external source-generation control pauses after snapshot admission, replaces a semantic source with a no-op generation B, restores generation A before execution, and must still reject with `HOLD_V45_SOURCE_GENERATION_CHANGED`. The control runs independently in both the per-node and downstream jobs. Retained relabeled-`--help` controls prove that the matrix selftest, finalizer, and downstream selftest cannot be credited under another phase name. Retained sentinel controls prove that both the per-node finalizer and downstream aggregate reject a preexisting output before starting a child and leave the sentinel bytes unchanged.

The control producer imports none of the candidate implementation. Missing evidence, substituted evidence, a mixed head, a mixed tree, and a premature candidate reject with distinct HOLD codes. It also emits a self-consistent forged candidate/control pair. The terminal verifier imports neither producer, independently rebuilds every acceptance predicate, and must reject that pair on the changed V44 `EIO` predicate.

The 245 reported lifetimes, 240 successful `execve` calls, and peak concurrency of 10 belong only to the traced runner subtree. Separate ledgers mark pre-allocation static/runtime checks, both ABA controls, candidate generation, candidate controls, producer-substitution control, terminal verification, source-execution supervisors, artifact upload, and cross-runtime verification as untraced with unknown lifetime and `execve` counts. V45 makes no full-job process-census claim.

The downstream verifier imports none of the per-node implementations. After all matrix jobs and uploads finish, it queries the exact workflow run through the read-only Actions API, requires the API `run_attempt` to equal the downstream attempt, and admits exactly the Node 22/24/26 artifact IDs whose attempt-qualified names and embedded receipts match that attempt. It downloads the exact ZIP bytes, checks the API SHA-256 against each ZIP, and binds membership, member hashes, per-node aggregate seals, per-node terminal source-execution receipts, runtime labels, head, tree, run ID, run attempt, and source inventory. Missing, duplicate, substituted, mixed-head/tree, mislabeled-runtime, source-drift, premature, stale-run, and stale-attempt models must reject before the top aggregate is emitted.

V45 is deliberately first-attempt-only. The downstream aggregate requires `run_attempt == 1`; a rerun cannot become accepted evidence. A retained source-supervised control binds its own current attempt as `1`, models current-head attempt-1 producer artifacts presented to an attempt-2 finalizer under the same run ID, and enters the production aggregate path with attempt `2`. Both checks must reject with `HOLD_V45_MATRIX_STALE_ATTEMPT`, and the control must prove that the attempt-2 top aggregate pathname remains absent before binding the result into the first-attempt top object. This prevents “Re-run failed jobs” from promoting producer artifacts created by an earlier attempt.

## Ceilings

Each filesystem image is exactly 512 MiB. E0 and R0 namespace ceilings remain 2 and 6 entries. Recovery records remain at most 3,072 bytes. Raw corruption is exactly one byte. Initial full-run process ceilings are deliberately conservative and will be tightened only from retained exact-head traces; they are not presented as already-observed counts.

## Acceptance rule

The fixture separates immutable `required_for_acceptance` design predicates from `observed_status`; every observed status is false in source. The static gate confirms only that design and non-acceptance posture. It never converts declared targets into observed acceptance.

The V45 acceptance object is the downstream terminal source-execution receipt together with the exact Node 22/24/26 aggregate bytes it binds from the same exact head, workflow run, and first run attempt. The retained attempt-qualified top artifact contains that pair plus the independently bound downstream selftest, external source A→B→A control, relabeled-selftest argv control, preexisting-output control, and same-run/different-attempt rejection control. Three separate green matrix jobs, a candidate receipt, a per-node aggregate, an unaccompanied top JSON object, an attempt-2 rerun, or a static fixture declaration are insufficient. A later source change makes every earlier receipt stale.

## Non-claims

V45 composes a hosted-kernel simulation and one mapped data-byte corruption case. Even a valid V45 top aggregate does not prove general DataNet availability. It also does not prove literal physical power loss, controller or drive volatile-cache loss, arbitrary fs-verity tree/descriptor corruption, privileged offline metadata forgery, kernel compromise, public-peer retrieval, Chain-2050 commitment/finality, deployment, or production activation.
