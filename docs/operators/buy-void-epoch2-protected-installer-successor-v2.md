# Epoch-2 inner installer V2 and bootstrap V3 source repair

Marker: `VOID_EPOCH2_PROTECTED_INSTALLER_SUCCESSOR_V2`

## Problem and resulting behavior

The accepted first-entry inner installer V1 performs Git reads using a private
environment that did not prohibit transport. Its checkout check also runs
`git status`, which can invoke repository-configured filesystem monitors and
content conversion helpers. Guards added to an outer installer do not repair
that independently constructed inner environment.

V1 also has two terminal-state defects tracked by #3416: cleanup can adopt an
unowned visible stage after a failure, and a parent-directory close error can
replace an already-publication-aware error. The latter can falsely report
`publication=false` after create-only publication succeeded.

The additive inner V2 closes these concrete paths. A new bootstrap V3 targets
and authenticates V2, so a future accepted native candidate can carry the actual
repair. The accepted V1 inner source, V2 bootstrap, candidate reports, locks,
materializers, outer installers, and installed qualifiers remain frozen.

This is source/build verification. No accepted bootstrap V3 candidate, Precision
installation, running-generation qualification, payment acceptance, or coupled
market opening follows from the source proof.

## Git read boundary

Every inner Git call receives a closed environment and explicit fixed checkout,
Git-directory, and worktree arguments. The empty `GIT_ALLOW_PROTOCOL` is the
transport restriction compatible with Git 2.43; `GIT_NO_LAZY_FETCH=1` is an
additional control on Git versions that implement it. Optional locks, hooks,
filesystem monitors, automatic maintenance/GC, index preloading, submodule
recursion, and global attribute/exclusion files are disabled.

The checkout verifier requires the exact requested commit and the full symbolic
ref `refs/heads/main`. It compares the NUL-delimited committed tree with the
stage-zero index, then reads and hashes every tracked worktree entry itself.
Regular files are opened without following symlinks; tracked symlinks are
checked by their link text, without opening the target. Tracked directory
components are traversed through retained, no-follow directory descriptors.

The check rejects raw-content or executable-bit changes, staged disagreement,
untracked nonignored files, assume-unchanged and skip-worktree entries,
unmerged entries, sparse-directory entries, gitlinks, unsupported modes,
duplicate/unsafe paths, and detected path or checkout drift. It rechecks the
index, HEAD, branch, and checkout-root identity before reporting a clean result.

Dependency reads use raw `git cat-file blob`, without filters or text conversion,
and still require the accepted Git-blob identity and any bound SHA-256/length.
Arbitrary Git stderr is omitted from failure receipts.

The relevant upstream contracts are documented in [Git 2.43 environment
variables](https://git-scm.com/docs/git/2.43.0),
[git-ls-files](https://git-scm.com/docs/git-ls-files/2.43.0),
[git-ls-tree](https://git-scm.com/docs/git-ls-tree/2.43.0), and
[git-cat-file](https://git-scm.com/docs/git-cat-file/2.43.0).

### Compatibility and coverage limits

This verifier checks raw worktree bytes. A checkout that is clean only after
CRLF normalization, LFS processing, or another content filter is rejected.
The ordinary Linux LF checkout remains supported. Ignored files remain outside
the clean-source assertion. A physical `.git` directory is required; linked
worktree gitfiles and symlinked checkout ancestors are rejected.

The parser accepts at most 200,000 tracked entries and 4,096-byte paths. Raw file
reads allow at most 256 MiB per file and 4 GiB in total. Git commands have a
20-second timeout and accepted output is limited to 64 MiB after capture.

Repository-local configuration/includes and object-store indirection remain
Git inputs. These controls remove the relevant executable-helper conversion
path and prohibit transports; they are not a general malicious-repository
sandbox, a complete index-format audit, or an atomic freeze of the checkout.
Git 2.43 may attempt an internal lazy-fetch subprocess before transport is
rejected. Do not claim that only one Git process can exist. These source proofs
do not execute a configured monitor, hook, clean filter, or process filter.

## Cleanup and terminal receipts

V2 records the device/inode of the stage it creates. Cleanup requires that exact
stage generation and operates relative to the retained install-parent and
stage/child descriptors. It refuses an unidentified or substituted stage,
unknown entries, symlinked child directories, special files, and hardlinks.
A stage already present before this invocation is never adopted for deletion.

After publication, failures remain `publication=true` and require inspection.
The failure object preserves the original phase/class/reason, parent fsync and
final verification outcomes, and the separate parent-close outcome. A close
error after otherwise successful publication also produces a publication-aware
HOLD. There is no postpublication rollback. Success requires a completed
install-parent close and reports it explicitly.

The unused import-time repository-root calculation has been removed from V2.
The native bootstrap executes a sealed `/proc/self/fd/...` script whose resolved
name is not a checkout path; inert source-plan execution now works in that form.

## Versioning and payload compatibility

The repaired operation uses:

- inner source `void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py`;
- plan prefix `voidbuye2dormantfirstentryinstall2_`;
- confirmation `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V2_CREATE_ONLY`;
- bootstrap source `void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3.c`;
- separate V3 bootstrap root and policy schema.

The accepted launcher/native/runtime-installer payload bytes and their V1
installed namespace are unchanged. That namespace is bound by the accepted
launcher and is independent of the version of this installation tool. V2
therefore retains the V1 payload policy schema and existing create-only target;
it does not overwrite or migrate an installed root.

V3 requires compiler-supplied installer SHA-256, length, and the exact V2
confirmation. It preserves strict runtime-HEAD parsing/forwarding, the sealed
installer snapshot, fixed Python policy, root-custodied native first entry,
closed child environment, and apply uncertainty after child creation.
Unrelated repository commits do not become a compile-time HEAD restriction.

## Reproducible source verification

Run from the source checkout in an ordinary disposable build environment:

```bash
python3 -I -B scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2_git.py
python3 -I -B scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2_terminal.py
python3 -I -B scripts/prove_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3.py
```

The Git proof uses ordinary local repositories with no configured executable
helpers. It covers clean reads without repository mutation, invalid/wrong HEAD,
raw/staged/untracked changes, index flags, modes, symlink drift, a second main
commit with the same dependency bytes, missing-object failure, and sealed
descriptor execution of inert `--source-plan`.

The terminal proof exercises the actual writer, create-only rename, cleanup,
and receipt handler using disposable filesystem fixtures with substituted
ownership and source-plan dependencies. Its 12 cases cover success, original
publication failures, parent-close combinations, own-stage cleanup, and refusal
to remove unowned or ambiguous stages. It executes no production apply.

The bootstrap proof compiles static C in a disposable directory, checks the
absence of `PT_INTERP` and dynamic `NEEDED` entries, and executes only native
`--self-test`. It requires the binary to report the exact repaired inner-source
digest and length and tests missing/invalid compile parameters. It does not
execute bootstrap plan/apply or a privileged fixture.

The dedicated workflow runs all three proofs, syntax, inert self-test/source
plan, and worktree hygiene against the exact event head. Frozen-source checks
retain the reviewed V1 inner, V2 bootstrap, accepted first-entry lock, and runtime
installer identities.

## Next source gate

Use the reviewed V2 inner and V3 bootstrap as the source for the next canonical
candidate derivation/acceptance. An old accepted bootstrap must not be relabeled
as this repaired generation. No Precision command is supplied by this source PR.

#3413 remains open: its complete source-generation manifest and prechild/private
proof requirements are not established by this limited successor. Its reserved
source branch is reused for this repair; #3425/#3426 remain separate outer
installation/qualification work.
