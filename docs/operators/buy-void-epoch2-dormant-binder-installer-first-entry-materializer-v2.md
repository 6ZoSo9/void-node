# Buy VOID Epoch-2 dormant-binder first-entry launcher materializer V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_MATERIALIZER_V2`.

Status: **source/CI artifact publication only**.

This four-file repair of the merged V2 materializer makes cleanup and output
publication checks explicit, corrects completion receipts and supports manual
replay. The accepted lock, candidate commit, report and launcher bytes remain
unchanged.

## Purpose

Materialize the launcher ELF accepted by V2 lock #3450 as a deterministic
create-only operator artifact.

The verified candidate derivation compiles the launcher and runs its inert
`--self-test`. This gate creates an artifact; it does not install it under `/opt`
or invoke the default-path launcher against a host repository.

## Accepted authority

V2 lock:

`voidbuye2dormantfirstentrylock2_89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543`

Lock Git blob:

`227c2fa449abf1387925373c706ecd07775d5898`

Canonical candidate merge:

`3a38da1e53ac52374aae4182d24ad4c245dfe504`

Canonical tree:

`4a25e5cb001667920b1b5715679c7cce99bd68fe`

Candidate:

`voidbuye2dormantfirstentrycand2_b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b`

Accepted ELF:

- bytes: `731072`;
- SHA-256:
  `4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28`;
- Git blob:
  `798907b18c73ee2cc1dea0fe05b36f27ab4137a7`;
- output mode: `0555`;
- static executable;
- no `PT_INTERP`;
- no dynamic `NEEDED`.

Accepted report:

- bytes: `6131`;
- SHA-256:
  `2eafc4dc83d7d59fbd5e1d7a7fa809661c72e3387ae83e7f3badae78780da6ac`;
- Git blob:
  `ec94d8238028a32dbf8a03ac72fc5ce7120607b7`.

## Runtime-head contract

The accepted launcher V2 is repository-HEAD independent at the ELF boundary:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_launcher=true
frozen_child_launcher_path_compatible=true
```

The materializer does not change or reinterpret those claims. It rederives the
exact candidate at the locked canonical merge and rejects any byte drift.

Historical V1 lock remains frozen with install authority false.

## Deterministic rederivation

The materializer:

1. verifies the exact V2 lock blob and authority fields;
2. verifies canonical candidate merge/tree;
3. creates a disposable detached worktree at the canonical merge;
4. verifies the exact V2 candidate proof Git blob;
5. executes that verified candidate source in-memory;
6. calls its reviewed `derive()`;
7. requires exact report bytes/hash/Git blob/candidate ID;
8. requires exact launcher bytes/hash/Git blob and ELF magic;
9. verifies removal of the owned worktree, its Git registration and the owned
   temporary directory before permitting output publication.

Derivation remains fixed to this accepted candidate commit when the materializer
runs from a later source commit. The candidate helper uses the compiler and
static-link inputs recorded in the accepted report; any resulting report or ELF
drift causes HOLD. No expiring hosted artifact is needed for reproduction.

The materializer emits its temporary-write and helper-execution authority before
starting derivation. A successful cleanup receipt reports completed removal;
cleanup failure causes HOLD and does not claim that temporary state was removed.

`--self-test` checks the accepted lock and fixed source bindings. It reports
derivation, output readback, synchronization and cleanup as required capabilities;
it does not report those operations as completed. It performs no candidate build
or output creation. `--derive ABSENT_OUTPUT` authorizes the temporary worktree,
compiler/helper processes, inert launcher self-tests and create-only output.

## Create-only publication

The output parent must already exist as a real directory.

The materializer:

- opens the output with `O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`;
- writes exact accepted bytes;
- changes mode to `0555`;
- fsyncs the output;
- rereads/hashes the retained output descriptor;
- fsyncs the parent directory;
- checks the retained parent and the parent reached through the absolute output
  path;
- verifies both the parent-relative name and the absolute output name still
  identify the created inode.

Replay against an existing output fails with `reason=output_exists`.

A failed materialization does not delete the visible pathname by name. HOLD can
leave an incomplete output for inspection; an existing pathname is never
silently overwritten or removed. Output success is reported only after the
write, descriptor readback, directory synchronization, final pathname checks and
descriptor closes succeed. These checks observe the output at completion; they
do not guarantee that another process cannot change it later.

Successful derivation requires `git_worktree_cleanup_verified=true`,
`temporary_directory_cleanup_verified=true`,
`output_visible_parent_and_leaf_verified=true` and `output_verified=true`.
HOLD reports the observed mutation and cleanup state with exit status `2`;
possible temporary writes, completed cleanup and verified output are separate
facts.

## Independent proof

The proof binds:

- materializer Git blob
  `3556931d9e14a5181d5ced96df6c89a2ade4284e`;
- V2 lock blob
  `227c2fa449abf1387925373c706ecd07775d5898`;
- V2 candidate proof
  `de2f487c625cf96c812cb6d4246d3d036a589e89`;
- launcher V2 source
  `86dc09e52402c04fb6e4b30a7fcf695833808ca3`;
- frozen runtime child
  `f3d6b1559be7490303cf36338c4bfa38fdaa390a`.

The default proof run performs two independent materializations and requires
byte identity, exact SHA/Git-blob identity, static ELF properties and replay
rejection. Focused temporary-directory fixtures exercise output parent/name
changes, retained output readback and failed worktree cleanup. `--fixtures-only` runs those bounded
fixtures and reports `full_materialization_performed=false`. The accepted
candidate's launcher source proof and source workflow are authenticated as data;
this materializer does not run the privileged production-child source proof.

## CI release scope and manual replay

Pull-request and main-push qualification use their event's base commit and
require exactly the four existing materializer paths to be modified, with both
old and new Git modes `100644`. The event base is separate from the fixed
candidate reproduction commit.

Manual dispatch replays the exact pinned materializer and accepted dependency
state. It checks the four materializer tree-entry modes, exact source/proof/doc
pins and the accepted candidate closure. It reports
`manual_exact_state_replay=true` and `event_diff_scope_verified=false`: a manual
replay does not claim to validate a new four-file repair diff. It can therefore
run from a later commit that preserves these exact inputs.

## Authority

This is artifact publication only.

Still false:

```text
protected_install_authorized=false
precision_install_authorized=false
native_or_binder_live_execution_authorized=false
protected_installer_consumer_bound=false
live_launcher_execution_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
funds_movement=false
```

The next gate is a coherent protected installer generation that binds this
accepted launcher. The accepted inner V4 / native C5 / source-generation V2
protected-install generation binds the earlier launcher; this materializer does
not change that binding or establish a Precision host handoff.

**PROTECT THE CORE.**

