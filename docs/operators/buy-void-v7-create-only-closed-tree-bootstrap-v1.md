# Buy VOID V7 create-only closed-tree bootstrap V1

Status: **source/test/CI implementation candidate only**.

This generation implements and adversarially exercises the closed-tree construction
and publication mechanics required by the landed
`CREATE_ONLY_CLOSED_TREE_V1` security plan. It deliberately does **not** bind
or accept a production launcher/runtime/source payload manifest.

## Bound plan

- plan ID:
  `voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc`
- plan Git blob:
  `9dde5523dca6ab240626430ce1c2b82f1cfe7f20`
- future requirements: **70**
- bootstrap source Git blob:
  `2a8397c85d698d168f2257ec801557281b73c04d`

The existing launcher V2 remains unchanged and fs-verity-only. This bootstrap
candidate does not create or authorize launcher V3.

## Production authority is intentionally absent

The normal binary is compiled without an accepted production manifest identity.
Therefore both `--plan` and `--apply` fail closed with:

`production_payload_manifest_lock_not_bound`.

The source-plan receipt states:

- `production_apply_enabled=false`;
- `production_payload_manifest_lock_bound=false`;
- `new_launcher_generation_authorized=false`;
- `bootstrap_candidate_accepted=false`;
- `root_execution=false`;
- `protected_filesystem_mutation=false`.

The fixture apply path exists only when compiled with
`VOID_V7_CLOSED_TREE_TEST_HOOKS` and targets caller-supplied disposable
directories. It is not a Precision installation interface.

## Manifest and destination model

The future manifest schema is:

`VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_MANIFEST_V1`.

It is bounded to 250,000 entries, 512 MiB per file, 16 GiB total payload bytes
and a 64 MiB manifest. Entries are strictly sorted and use only:

- directories, exact mode `0555`;
- regular files, exact mode `0444` or `0555`.

Symlinks, implicit parent directories, leading blank lines and consecutive
blank lines are rejected; the line-oriented manifest has one canonical textual
shape for a given entry sequence.

For each regular file, the engine:

1. opens the source with retained `O_NOFOLLOW|O_NONBLOCK` regular-file
   authority;
2. authenticates the exact pre-copy size and SHA-256;
3. creates a fresh destination inode with
   `O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`;
4. writes exact bytes descriptor-relative;
5. recomputes the copied SHA-256 and requires equality to the pre-copy pin;
6. fsyncs, applies exact final owner/mode, fsyncs again;
7. closes the writable descriptor;
8. reopens read-only/no-follow and revalidates inode, size and SHA-256.

No source inode is renamed, hard-linked or adopted as trusted destination state.

## Single-thread and asynchronous-I/O boundary

Before the destination parent descriptor is admitted—and therefore before the
private stage or any trusted destination inode can exist—the engine requires:

- exactly one task under `/proc/self/task`;
- the current TID to equal PID;
- no existing `MAP_SHARED|PROT_WRITE` mapping.

It then sets `PR_SET_DUMPABLE=0`, `PR_SET_NO_NEW_PRIVS=1`, and installs a
seccomp barrier denying:

- clone/clone3/fork/vfork;
- execve/execveat;
- io_uring setup/enter/register;
- Linux AIO setup/submit/destroy/cancel/getevents/pgetevents;
- socket/socketpair and sendmsg/sendmmsg;
- UID/GID/group credential changes;
- creation of new shared writable mappings.

This prevents the engine itself from introducing the retained descriptor,
cross-process, secondary-thread or asynchronous-write authorities prohibited by
the 70-rule plan after the write boundary begins.

The implementation intentionally does not treat a local FD-table census alone
as cross-process proof. Before publication it additionally rechecks that the
engine remains single-threaded and has no shared writable mapping.

## Receipt and publication

A fresh single-link `root:root 0444` installation receipt binds:

- seal mode;
- plan ID and plan blob;
- manifest SHA-256 and byte count;
- source generation;
- bootstrap executable SHA-256;
- root device/inode;
- every payload path, kind, mode, size/hash and inode identity.

The payload manifest excludes the receipt itself, avoiding a receipt self-hash
cycle. Receipt metadata/content is verified separately.

The complete stage is closed read-only, all payloads are revalidated, retained
writable destination FDs are rejected, directories are fsynced, and publication
uses same-filesystem `renameat2(..., RENAME_NOREPLACE)`.

After publication the parent is fsynced and the complete visible generation is
reverified. Directory enumeration is exact: every visible leaf must be either a
manifest entry or the single root receipt. Missing, changed, or additional
unreceipted entries all HOLD.

A rerun may accept an existing final only when its receipt, exact directory
layout, and every payload identity/content are exact; mismatches HOLD without
repair in place.

## Source proof

The focused proof:

- authenticates this exact C source blob and the landed plan blob;
- builds a static binary and verifies no PT_INTERP / dynamic NEEDED entries;
- requires normal self-test and source-plan GREEN;
- feeds a noncanonical blank-line manifest and requires pre-publication HOLD;
- requires normal `--apply` to HOLD because no production manifest lock exists;
- exercises the seccomp barrier against fork, io_uring and shared-writable mmap;
- publishes a disposable exact fixture and proves exact idempotence;
- corrupts an existing final and requires HOLD without repair;
- adds an unreceipted extra leaf and requires exact-layout HOLD;
- mutates source bytes after their pre-copy hash pin and requires pre-publication
  HOLD;
- simulates process death immediately after atomic rename and requires exact
  rerun recovery;
- requires a pre-existing stage to HOLD without adoption or merge.

Test hooks are excluded from the normal binary.

## Lifecycle boundary

This PR does **not** authorize:

- a production payload manifest;
- a launcher V3 candidate or acceptance lock;
- bootstrap installation or execution on Precision as root;
- protected `/opt` mutation;
- V5 apply;
- service/systemd mutation;
- credential/private-key/signer access;
- signing, transaction or payment acceptance;
- presale/WC activation;
- treasury/liquidity action or funds movement.

A later source lane must bind an exact reviewed production payload manifest and
new launcher generation before this bootstrap can become a candidate for any
root-custodied install.

First-entry process custody also remains a separate gate. This engine does not
claim that an already-compromised process image, pre-existing ptrace attachment,
hostile inherited descriptor set, or startup environment has been authenticated
merely by entering the write barrier. A future trusted launcher/bootstrap
installation must establish that entry context before this engine can receive
production authority.

PROTECT THE CORE.
