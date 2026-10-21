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
- strict fsck success over 107,003 objects.

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

This lane is anchored after merge `6011fc906a98cb005567f8dd1fa8a3ea184beb12`
and binds these unchanged reviewed dependencies:

- merged user-space reseal builder blob
  `030182d544a92cd6c67868fa4c4f3e83188e4249`;
- V7 protected substrate installer V4 blob
  `6e187a9a6e782df13ecd423fc80c82b759a8f6db`;
- reviewed atomic-upgrade reference implementation blob
  `3fe1158a0fdf19fa4307c2a8122314b75ee36345`.

## Plan contract

`--plan --expected-head <current-main-head>` is read-only.

It independently verifies:

1. clean non-shallow canonical source `main` at the operator-supplied head;
2. the three exact dependency blobs above;
3. the fixed user-space candidate path and its exact physical owner/mode;
4. exact closed candidate Git metadata layout;
5. exact candidate HEAD/tree/main branch;
6. both exact merge parents;
7. exactly 17,931 reachable commits and no missing objects;
8. strict full-object fsck;
9. direct worktree-to-Git-blob equality;
10. a content digest over the complete candidate, including `.git`;
11. the live runtime release remains the exact known shallow generation;
12. the live release still has the accepted HEAD/tree/clean worktree;
13. `.git/shallow` contains exactly the accepted head;
14. both parent commit objects remain absent from the live release;
15. root-owned non-writable `/opt` ancestry;
16. replica target/stage state.

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
4. copies the untrusted candidate with no-follow reads;
5. converts the copy to root ownership and immutable read/execute modes;
6. fsyncs the complete staged generation;
7. independently verifies the staged full-history Git/worktree/object graph;
8. revalidates candidate and live shallow bindings;
9. publishes once with `renameat2(RENAME_NOREPLACE)`;
10. fsyncs `/opt`;
11. recomputes the plan and requires the final protected state to be GREEN.

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
`O_NOFOLLOW`, generation-checked before/after the read, and written only into
the retained root-owned stage descriptor graph.

Creating the stage is the only expected install-parent namespace transition.
The install-parent device/inode/owner/mode must remain stable, and its directory
link count may change only by the single stage-directory transition permitted by
the contract. All higher ancestors remain exact.

### Root execution and termination boundary

After privileged source custody is established, the root parent does not execute
host Git for plan or staged-generation verification. Those Git observations run
inside a forked child that drops supplementary groups and switches to UID/GID
1000 first. The root parent performs only descriptor-based copy, ownership/mode
sealing, fsync and the create-only rename.

Apply installs handlers for SIGTERM, SIGHUP and SIGQUIT. Those signals raise into
the same terminal failure path used by ordinary exceptions. If interruption
lands around publication, target/stage namespace reconciliation determines
whether publication is true, false or unknown before the process exits.

Immediately before and after `RENAME_NOREPLACE`, the plan-bound install parent
is rebound by device, inode, owner and mode through a retained descriptor. The
stage creation may leave the parent directory link count unchanged or increase
it by exactly one; broader namespace drift HOLDs.

### Index and Git metadata closure

The full-history candidate, staged replica and final protected replica require
the Git index to compare exactly equal to the accepted HEAD using read-only
`git diff-index --cached --quiet`. Direct worktree-to-blob verification remains
independent of the index.

Git metadata regular leaves used for authority (HEAD, config, index, main ref,
pack and pack index) must be single-link, expected-owner regular files with no
group/world write bits and no executable bits. The protected copy therefore
cannot acquire executable authority from mutable candidate metadata.

### Private staging before authentication

Candidate bytes are never made broadly readable merely because root copied
them. During construction the stage root and directories are root-only mode
`0700`; copied regular files are root-only `0400` or `0500`.

Before any stage path becomes group/world-readable, root Python computes the
complete content digest over the private stage without executing Git and
requires exact equality with the reviewed candidate digest. Only then are the
already-root-owned bytes sealed to final immutable modes
(`0555` directories, `0444` nonexecutables, `0555` executables) and handed
to the dropped-UID Git verifier.

A raced candidate therefore cannot cause unrelated user-private bytes to become
publicly readable in `/opt` before content authentication.

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
