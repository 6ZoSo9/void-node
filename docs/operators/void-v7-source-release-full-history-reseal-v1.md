# VOID V7 source-release full-history reseal V1

Status: **source/test/CI only**. No protected host mutation is authorized or performed.

## Host finding

Precision's active accepted V7 source release at
`/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`
is a real one-commit shallow repository. Its `.git/shallow` contains exactly the
accepted head, and the accepted merge commit's parents
`5752b69a7253a44fd3fabe2964476174b3a80c40` and
`6b7fc90219676a96f5a2c34619e4cfdf3f002244` are absent from that release.

Removing the shallow marker would therefore create false provenance. Installer
V4 correctly HOLDs this generation.

The canonical Precision source checkout is non-shallow and contains the complete
accepted history. The accepted head has tree
`de12c9d2d5e475d435d21da3b047d7b63b69e2b7`, exactly two reviewed parents,
17,931 reachable commits, and roughly 42 MiB of reachable object storage.

## Candidate builder

`ops/precision/void_v7_source_release_full_history_reseal_v1.py` builds only a
disposable candidate beneath the executing non-root account's physical
`/home/<passwd-name>/Downloads` directory. Process `HOME` does not select or
redirect this authority root. The `/home` root itself must be physical,
root-custodied, and non-group/world-writable.

It:

1. requires isolated, unoptimized Python;
2. requires a clean non-shallow canonical `main` checkout;
3. authenticates the accepted commit, tree and both parents;
4. requires exactly 17,931 reachable commits and no missing reachable objects;
5. creates a new physical in-tree `.git` repository with a closed core-only config;
6. writes exactly the accepted head's reachable closure with one bounded
   `git pack-objects --revs` process directly into the candidate's physical
   object store, producing one pack and its index without a live child pipeline;
7. verifies the generated pack index before creating symbolic `main` at the
   exact accepted head;
8. checks the exact tree/index/worktree, full-history status, parent set,
   object closure and strict fsck;
9. rejects shallow, graft, alternate, HTTP-alternate, commondir and
   config.worktree metadata;
10. derives the executing account home from the OS passwd record rather than
    process `HOME`, forbids UID 0, requires the home to be exactly a direct
    `/home/<passwd-name>` child beneath a physical root-custodied `/home`,
    requires `Downloads` and every admitted output parent to be physical
    current-UID directories, and rejects symlinked **or mount-point** aliases;
11. rejects any output path that resolves at or beneath the canonical source
    checkout before candidate creation, so `.git` or worktree writes cannot be
    mislabeled as `source_repository_mutation=false`;
12. creates the candidate relative to a retained validated parent descriptor,
    retains the exact candidate, `.git`, object-store, pack, refs and heads
    directory descriptors, and sends Git candidate operations through
    `/proc/self/fd/*` with `GIT_OBJECT_DIRECTORY` pinned to the retained object
    store; directory leases bind stable device/inode/owner/mode identity while
    intentionally excluding directory link count because checked-out child
    directories legitimately change it; path replacement therefore cannot
    redirect helper writes;
13. revalidates the complete Downloads ancestor chain, mount-point census and
    visible inode identities at mutation boundaries and before GREEN;
14. keeps failure cleanup deliberately non-recursive: it validates retained
    parent/candidate mount IDs and visible root generation, removes only an
    exact **empty** candidate root, and otherwise retains nonempty candidate
    contents for inspection with explicit residual-state and cleanup receipts;
15. rejects C0, DEL, NEL (`U+0085`), Unicode line separator (`U+2028`) and
    paragraph separator (`U+2029`) in operator-supplied output paths before
    any candidate directory is created or any line-oriented receipt can contain
    that path.

The pack bytes themselves are not authority; the reconstructed Git object IDs,
connectivity, generated pack index, and exact worktree are. The single bounded
pack process is reaped by `subprocess.run` before cleanup or continuation.
Receipt path fields are emitted only after the complete line-separator/control
guard, so one filesystem path cannot inject a second line or forge an
authority/status field. A spoofed process `HOME`, protected/runtime passwd home, symlinked `Downloads`,
or output beneath the source checkout cannot redirect the candidate write
boundary.

Failure rollback has no recursive deletion authority. A nonempty retained
candidate is reported as `retained_needs_inspection` and left untouched; a
missing or substituted visible root reports residual state as unknown rather
than deleting through an unproven generation.

## Descriptor-relative worktree materialization

The builder does not run `git reset --hard`, `git checkout-index`, or another
Git command that traverses writable candidate descendants.

After the exact object pack and `refs/heads/main` file are created through
retained descriptors, `git read-tree` writes only the temporary index bound by
`GIT_INDEX_FILE=/proc/self/fd/.../index`. The builder then reads the exact
target tree manifest from the candidate object store and materializes the
worktree itself:

- the accepted tree must contain only directories and regular mode-`100644`
  or mode-`100755` blobs; symlinks, gitlinks and other entry modes HOLD;
- every directory is created relative to an already retained parent descriptor
  and reopened with `O_DIRECTORY|O_NOFOLLOW`;
- every regular file is created with `O_EXCL|O_NOFOLLOW` relative to its
  retained parent descriptor;
- blob bytes are read by exact object ID and rebound to their Git blob hash;
- all 298 tracked directory descriptors remain retained through terminal
  verification;
- terminal verification requires exact direct-entry sets, retained/visible
  directory identity, regular-file mode and Git blob identity for all 11,648
  tracked files.

The final `.git/index` is published with `O_EXCL|O_NOFOLLOW`, retained by
descriptor, and compared read-only with the accepted target using
`git diff-index --cached --quiet`. `.git/logs` remains forbidden. No
candidate Git command updates a ref or delegates descendant worktree writes to
Git pathname traversal.

The Git metadata closure is terminally rebound as well. Retained descriptors for
`.git/objects/pack`, `.git/refs`, `.git/refs/heads`, and
`.git/refs/tags` must still match their visible directory generations.
`.git`, `objects`, `pack`, `refs`, `heads`, and `tags` have exact
entry sets; `HEAD` must be the exact symbolic-main file; `refs/heads/main`
must contain the accepted commit; tags and info namespaces must remain empty;
and the exact pack/index leaves must remain local regular single-link files.
Late symlink or directory substitution therefore cannot make the candidate
borrow external objects or refs while still reporting GREEN.

The generated pack leaves are retained too. The exact `.pack` and `.idx`
files are opened with `O_NOFOLLOW`, bound to device/inode/owner/mode/link
count/size/mtime/ctime and SHA-256, checked across `verify-pack`, and rehashed
again at terminal verification. Replacing or modifying either pack leaf after
object verification therefore cannot produce a GREEN candidate.

The final `.git/index` leaf is held to the same standard: its retained
descriptor is bound to the full file-generation identity and SHA-256 immediately
after publication, its visible name is rebound, and both generation and digest
are checked again during terminal verification. An in-place or replacement
index edit after the cached-tree comparison cannot still produce GREEN.

## Authority boundary

`--self-test` and `--plan` are read-only and retain explicit
`source_repository_mutation=false` and
`protected_filesystem_mutation=false` receipts.

`--build` is different: it deliberately creates a candidate beneath the
current account's Downloads tree. POSIX permissions do not isolate one hostile
process from another process with the **same UID**. A same-UID process can
relocate an inode that this builder already owns to another location that the
same UID can write. Retained descriptors still prevent symlink/pathname
redirection and terminally expose visible-generation drift, but they cannot make
an unconditional namespace non-mutation claim.

Therefore build-mode receipts state:

- `current_uid_filesystem_write_boundary=true`;
- `same_uid_namespace_relocation_isolation=false`;
- intended source/protected mutation remains false;
- observed source/protected mutation authority is reported as `unknown`, not
  `false`, once the build write boundary is entered.

This is not a privilege escalation: the builder gains no authority beyond the
current UID. It also means a GREEN user-space candidate is **untrusted input**,
not evidence that source/protected namespaces were untouched. A future
root-custodied reseal gate must independently revalidate the canonical source,
candidate bytes, object graph and protected target before any protected action.

This lane does not intentionally mutate `/opt`, the active release,
services/systemd, credentials, keys, signers, transactions, payment state,
presale/WC activation, treasury/liquidity state or funds.

A GREEN candidate is only input to a future separately reviewed and separately
authorized protected release repair. The active release must not be edited
in-place by deleting `.git/shallow`.

PROTECT THE CORE.
