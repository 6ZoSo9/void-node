# VOID V7 full-history protected source replica install V1

Marker:

`VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_INSTALL_V1`

Status: **source/test/CI only; no Precision protected apply is performed by this change**.

## Why this lane exists

Precision proved that the accepted runtime generation

`/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`

is a genuine one-commit shallow Git repository. Its exact merge parents are absent.
The merged source-only reseal lane then built and independently verified a
non-shallow user-space candidate at:

`/home/zoso/Downloads/void-v7-full-history-candidate-6011fc`

with:

- HEAD `4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- tree `de12c9d2d5e475d435d21da3b047d7b63b69e2b7`;
- exact parents `5752b69a...` and `6b7fc902...`;
- 17,931 reachable commits;
- no shallow/graft/alternate/commondir state;
- clean exact worktree;
- the original user-space census also reported strict fsck success over 107,003 objects; that is historical input evidence, not production provenance authority.

The active runtime release is deliberately **not repaired in place**. Renaming or
replacing the directory used as a live service cwd creates unnecessary runtime
risk and is not required to establish full-history provenance.

## Protected target

V1 installs one new immutable create-only replica:

`/opt/void-v7-source-release-full-history-v1`

The existing live runtime release is read-only cross-binding evidence only.

The replica must prove the same accepted HEAD/tree/worktree as the live release,
while additionally proving the complete local object graph and both merge
parents.

## Source dependencies

This lane is anchored after landed V4 security repair merge
`6a577bc61bd95524597e534b37a531c5b60ee7c1` and binds these reviewed dependencies:

- merged user-space reseal builder blob
  `030182d544a92cd6c67868fa4c4f3e83188e4249`;
- V7 protected substrate installer V4 blob
  `4448acb51cbc15d845550a55cd11c38f4185a7b3`;
- reviewed atomic-upgrade reference implementation blob
  `3fe1158a0fdf19fa4307c2a8122314b75ee36345`.

## Plan contract

`--plan --expected-head <current-main-head> --expected-tree <current-main-tree>` is read-only. The trusted launcher supplies the exact HEAD/tree pair and the operation-bound plan binds both values.

It independently verifies:

1. clean non-shallow canonical source `main` at the operator-supplied head;
2. the three exact dependency blobs above;
3. the fixed user-space candidate path and its exact physical owner/mode;
4. exact closed candidate Git metadata layout;
5. exact candidate HEAD/tree/main branch;
6. both exact merge parents;
7. exactly 17,931 reachable commits;
8. built-in pack/index authentication: pack and index SHA-1 trailers, fanout, CRCs, object offsets, OFS/REF deltas, reconstructed Git object IDs, and exact reachable-object closure;
9. direct version-2 index parsing with no staged/extended flags or extensions, equal to the accepted source-tree manifest;
10. direct worktree-to-Git-blob equality against that manifest;
11. a content digest over the complete candidate, including `.git`;
12. the live runtime release remains the exact known shallow generation;
13. the live release still has the accepted HEAD/tree/clean worktree;
14. `.git/shallow` contains exactly the accepted head;
15. both parent commit objects remain absent from the live release;
16. root-owned non-writable `/opt` ancestry;
17. replica target/stage state.

The operation-bound plan ID binds the candidate, live shallow generation,
repository generation, install-parent custody and all authority boundaries.

A user-space candidate is untrusted mutable input. Plan GREEN is not protected
installation authority.

## Create-only apply

Apply requires all of:

- exact operation-bound plan ID;
- exact confirmation token
  `INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY`;
- root identity;
- isolated/unoptimized Python;
- a separately reviewed **root-custodied source/launcher tree**.

Direct privileged execution from the ordinary user checkout is intentionally
rejected.

Apply:

1. recomputes the complete plan;
2. requires state `READY`;
3. creates only
   `/opt/.void-v7-source-release-full-history-v1.stage-v1`;
4. copies the untrusted candidate with descriptor-relative no-follow reads into a root-owned private stage;
5. charges the cumulative protected-write budget from the exact opened source descriptor generation, not a stale pathname stat;
6. authenticates the complete private-stage content digest;
7. keeps the authenticated stage `root:root`, installs an exact POSIX access ACL that grants **only named UID 1000** read/search permission (group-object and other entries are zero), and runs the built-in pack/index/object/worktree verifier after dropping to UID/GID 1000;
8. only after that built-in provenance verification succeeds, removes the temporary UID-specific ACL, seals the exact stage to final root:root immutable read/execute modes, and rechecks the complete content digest;
9. fsyncs the complete staged generation;
10. revalidates candidate and live shallow bindings;
11. publishes once with `renameat2(RENAME_NOREPLACE)`;
12. fsyncs `/opt`;
13. recomputes the plan and requires the final protected state to be GREEN.

The live runtime release is never renamed, deleted, chmodded, chowned, written,
fetched into, or otherwise mutated.

### Untrusted-candidate privilege confinement

When apply runs as root, operation-bound plan recomputation is executed in a
forked child that drops supplementary groups and switches to UID/GID 1000 before
reading the user-space candidate, live release, or repository state. The root
parent accepts only a bounded JSON result from that child.

The root copy path does not recurse through candidate pathnames. It opens the
candidate root once with `O_DIRECTORY|O_NOFOLLOW`, retains that descriptor, and
opens every child directory relative to retained parent descriptors with
`O_NOFOLLOW`. Regular files are opened relative to retained descriptors with
`O_NOFOLLOW`, and the helper requires the opened descriptor generation to
equal the descriptor-relative metadata generation observed by its parent
traversal. The exact opened `st_size` must fit both the per-file limit and the
remaining cumulative 16 GiB write budget **before** the destination file is
created. The helper returns that exact copied size; the caller never charges the
budget from a stale outer pathname stat. Source generation is revalidated after
the read, and bytes are written only into the retained root-owned stage
descriptor graph.

Every descriptor-relative candidate component must also round-trip strict UTF-8
before a destination entry is created. A raced byte filename represented through
Python surrogate escapes therefore becomes a normal `InstallError` and enters
the same retained-stage/publication reconciliation path; it cannot escape through
a later digest `UnicodeEncodeError`.

Line-oriented receipt integrity is bound at the same boundary. Candidate path
components must consist only of Unicode characters Python classifies as printable;
this rejects ASCII/C1 controls, bidi/zero-width formatting controls, DEL, NEL,
line/paragraph separators, and other terminal-active non-printing characters
before copy. Terminal exception reasons apply the same printable-character policy
and replace every non-printing character with `_` on one bounded line, so an
attacker-controlled filename cannot inject, reorder, conceal, or visually
overwrite HOLD/publication receipt fields.

Candidate traversal is also resource-bounded before protected publication.
The root copy path never calls `listdir()` or sorts/materializes a complete
attacker-controlled directory. It consumes `os.scandir(fd)` incrementally and
uses an explicit depth-first descriptor stack rather than Python recursion.
Directory descent is capped at `MAX_COPY_DEPTH=128`, well below interpreter
recursion limits and with a bounded number of simultaneously retained directory
descriptors. Over-wide and over-deep candidates therefore raise
`InstallError("copy_node_limit")` or `InstallError("copy_depth_limit")`
inside the normal write-boundary reconciliation path rather than risking OOM or
`RecursionError`.

The broad `MAX_NODES=250000` and 16 GiB values are only outer admission
ceilings. The operation-bound plan already records the candidate's exact
`nodes` and `regular_file_bytes`; apply validates both as real integers
within those ceilings **before entering the write boundary**. Those exact
planned values, not the globals, become the walker's node and byte limits.
The returned copied node/byte counts must exactly equal the plan before any
content hash can advance. A post-plan extra entry therefore stops at the
approved node count, and a sparse-file size inflation stops at the approved byte
count before the inflated destination file is created. A race cannot consume
the unused remainder of the global protected-disk/inode ceilings.

Creating the stage is the only expected install-parent namespace transition.
The install-parent device/inode/owner/mode must remain stable, and its directory
link count may change only by the single stage-directory transition permitted by
the contract. All higher ancestors remain exact.

### Root execution and termination boundary

After privileged source custody is established, production provenance does not
execute host Git at all. The installer contains no `subprocess`,
`/usr/bin/git`, dynamic Git command wrapper, or host-Git evidence authority.
The forked verifier sets `PR_SET_NO_NEW_PRIVS=1`, clears supplementary groups,
switches GID and UID to 1000, and requires all real/effective/saved UID and GID
slots to equal 1000 with no supplementary groups. It then explicitly clears
Linux ambient capabilities and uses `capset(2)` to zero its permitted,
effective and inheritable capability sets. The child reads
`/proc/self/status` and requires `CapInh`, `CapPrm`, `CapEff` and
`CapAmb` all to be zero and `NoNewPrivs` to remain 1 before it may read the
candidate or staged generation.

Repository state is interpreted by built-in parsers only. Canonical source
authority comes from physical `.git/HEAD` and loose `refs/heads/main`
custody plus Git blob/tree SHA-1 framing over the visible worktree, bound to the
trusted `--expected-head` + `--expected-tree` pair. Candidate/stage history
authority comes from direct pack/index parsing, object reconstruction and exact
commit/tree/blob closure. Git is used only as a disposable CI oracle.

This capability clearing is required even if the trusted launcher inherited a
capability-preserving securebits configuration such as
`SECBIT_NO_SETUID_FIXUP`; UID/GID equality alone is not accepted as proof of a
non-privileged verifier. A compromised runtime-user loader/DSO therefore starts
with neither root identity nor retained Linux capabilities. The root parent
performs only descriptor-based copy, ownership/mode sealing, fsync and the
create-only rename.

Apply installs handlers for SIGTERM, SIGHUP and SIGQUIT. Those signals raise into
the same terminal failure path used by ordinary exceptions. The conservative
write-boundary flag is set **before** the first stage-creation syscall, so a
signal arriving immediately after kernel namespace mutation cannot bypass
stage/target reconciliation. If interruption lands anywhere after that boundary,
including around publication, target/stage namespace reconciliation determines
whether publication is true, false or unknown before the process exits.

Immediately before and after `RENAME_NOREPLACE`, the plan-bound install parent
is rebound by device, inode, owner and mode through a retained descriptor. The
stage creation may leave the parent directory link count unchanged or increase
it by exactly one; broader namespace drift HOLDs.

### Index and Git metadata closure

The full-history candidate, staged replica and final protected replica require
the version-2 Git index to be parsed directly and compare exactly equal to the
accepted source-tree manifest. Unsupported flags, staged entries, modes and
extensions are rejected. Direct worktree-to-blob verification remains
independent of the index.

Git metadata regular leaves used for authority (HEAD, config, index, main ref,
pack and pack index) must be single-link, expected-owner regular files with no
group/world write bits and no executable bits. The protected copy therefore
cannot acquire executable authority from mutable candidate metadata.

### Private staging and Git authentication before broad readability

Candidate bytes are never made broadly readable merely because root copied
them. During construction the stage root and directories are root-only mode
`0700`; copied regular files are root-only `0400` or `0500`.

Root Python first computes the complete content digest over that private stage
without executing Git and requires exact equality with the reviewed candidate
digest. That digest alone is **not** treated as Git authority.

Before any broad-readable final mode is granted, the already-authenticated
stage is transitioned to a temporary verification-only generation without
changing ownership:

- every stage node remains `root:root`;
- an exact Linux POSIX access ACL names UID 1000 only;
- the ACL user-object entry preserves root owner permissions;
- the named UID-1000 entry grants read, plus search/execute where required;
- the ACL group-object and other entries are exactly zero;
- the ACL mask equals only the named UID-1000 permission;
- directories project mode `0750`, nonexecutables `0440`, and executables
  `0550` while the ACL is present;
- UID 1000 must be able to read/search the stage but must not have write access.

Because ownership never moves away from root, UID 1000 cannot chmod the staged
generation. Because group-object permission is zero, another account that merely
shares GID 1000 receives no access; the temporary authority is tied to the exact
numeric UID.

A forked verifier then sets `PR_SET_NO_NEW_PRIVS`, clears supplementary groups,
drops every UID/GID slot to 1000, clears and verifies all permitted/effective/
inheritable/ambient capability sets, and only then runs the complete built-in
non-shallow pack/index/object/worktree verification against that exact ACL-bound
stage. The root parent verifies the ACL bytes and metadata before the child is
admitted.

Only after this exact staged repository generation is GREEN are the named-user ACLs
removed and files/directories changed to final root:root `0444`/`0555`
modes. Root then recomputes the full content digest and requires exact equality
again before publication.

This closes the race where candidate bytes could change between candidate provenance
verification and plan digest calculation: even if the untrusted plan observes a
raced candidate generation, a provenance-inconsistent copy cannot become broadly
readable or publishable because staged built-in provenance verification occurs before final
sealing.



## Bounded-memory content authentication

Large regular-file authentication is streaming. The installer never retains and
joins a complete worktree file, Git index, pack, or pack index in memory.

`_stream_regular_hashes_stable()` opens the exact regular-file generation with
`O_NOFOLLOW`, binds the opened metadata identity to the visible generation,
uses the opened size to initialize Git-blob SHA-1 when required, and feeds each
bounded chunk directly into SHA-256 and optional Git-blob SHA-1. The helper then
requires the opened and visible generation to remain unchanged after EOF.

Byte-returning `_read_regular_stable()` is limited to at most 64 KiB and is
used only for tiny metadata leaves such as `HEAD`, config, the main ref, and
the live shallow marker. Candidate/stage worktree regulars and Git
`index`/`.pack`/`.idx` leaves use the streaming path.

The built-in pack parser separately needs bounded temporary memory for one
compressed pack entry and for decoded-object reuse. Before an indexed entry is
read into memory, its `end - offset` span must be positive and no larger than
`MAX_PACK_ENTRY_BYTES = MAX_GIT_OBJECT_BYTES + 2 MiB` (130 MiB with the
current 128 MiB decoded-object ceiling). Oversized indexed spans HOLD before
the allocation. Decoded objects remain individually bounded by
`MAX_GIT_OBJECT_BYTES`; the LRU additionally has both the existing
256-object ceiling and a 64 MiB aggregate decoded-byte ceiling. These limits
prevent a checksum-valid hostile pack/index from turning a small declared
object into a near-pack-sized read or retaining roughly a gigabyte of cached
decoded objects.

Focused CI executes a large sparse regular-file authentication fixture under a
constrained address-space limit and verifies both SHA-256 and Git-blob SHA-1.
This proves the authentication path does not require memory proportional to the
permitted file size. Catching `MemoryError` is not treated as the safety
mechanism; the large allocation is removed from the authority path.

## Failure truth

The installer has **no automatic recursive cleanup authority** for a nonempty
stage. A failed prepublication stage remains for explicit inspection.

Publication truth is reconciled from the root-only target/stage namespace if an
exception or signal lands around the create-only rename. The receipt reports
`publication=true`, `false`, or `unknown`; it does not silently convert an
uncertain publication into a no-write claim.

## Next lane

A GREEN protected full-history replica still does not install the V7 substrate.

The next source lane must update the V7 protected substrate installer to require:

- exact live runtime HEAD/tree/worktree cross-binding; **and**
- this exact root-custodied full-history replica for ancestry/object provenance.

That allows V7 source protection to advance without mutating the active runtime
release.

## Built-in provenance closure

This generation closes the dynamic-Git architecture HOLD that previously kept
the protected replica lane Draft. Production repository evidence is parsed and
validated entirely in-process.

The protected full-history candidate must be self-contained and exact: every
object reachable from the accepted source commit must be present, every object
present in the candidate pack must be reachable from that commit, reconstructed
object IDs must match their names, and exactly 17,931 commits must be reachable.
The accepted commit must bind the exact source tree and exact two parent IDs.

The built-in pack reader validates version-2 pack indexes, fanout tables, CRCs,
32/64-bit offsets, pack/index SHA-1 trailers, compressed object framing,
OFS/REF deltas and final Git object IDs. Decompression is bounded by the reviewed
per-object ceiling. The built-in index reader accepts only version 2, rejects
staged/extended flags and all required (lowercase-signature) extensions, permits
only bounded optional uppercase-signature extensions as opaque checksum-covered
bytes, enforces exact pathname-length encoding (the 0xFFF sentinel is valid only
for paths at least that long), authenticates required v2 entry padding as NUL,
and requires exact equality with the source tree. All production directory
enumeration is fail-fast and node-bounded before names are retained.

The live shallow predecessor is evaluated by the same built-in object reader:
the shallow marker contains only the accepted head, the accepted commit/tree are
available, and both parent objects remain absent.

A GREEN source/CI result still grants no protected apply authority.

## Authority boundary

This lane grants no authority for:

- service or systemd mutation;
- live runtime release mutation;
- credential/private-key/signer access;
- signing;
- transaction/RPC;
- payment acceptance;
- public presale activation;
- WC/VOID market activation;
- treasury/liquidity action;
- funds movement.

PROTECT THE CORE.
