# Buy VOID Epoch-2 dormant first-entry protected bootstrap install V6

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6`.

Status: **source/test/CI only; no Precision apply is performed by this change**.

## Purpose

Install the accepted dormant first-entry V6 bootstrap into the fixed protected
root:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6`.

The root contains exactly:

- `bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6`;
- `source-generation-v3.conf`;
- `policy-v1.conf`.

The accepted bootstrap input is the static V6 ELF published by the merged
materializer:

- bytes: `874608`;
- SHA-256:
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`;
- Git blob:
  `b577d70666f98ac59a75b84b3dab741fe7b93a4b`.

The source-generation V3 manifest is:

- bytes: `2382`;
- SHA-256:
  `8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`;
- Git blob:
  `de56bacb30bea0adc418e240cf3fb8d900b061ef`.

Accepted V6 lock:

`voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`.

## Host policy

The hosted materializer deliberately cannot manufacture the host policy.

A real Precision plan resolves and snapshots the exact root-custodied targets of:

- `/usr/bin/python3`;
- `/usr/bin/git`.

It then constructs exactly:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6
python_sha256=<64 lowercase hex>
python_bytes=<positive decimal>
git_sha256=<64 lowercase hex>
git_bytes=<positive decimal>
```

Those are the same two host-tool identities authenticated by the installed V6
bootstrap before it can invoke the inner V5 installer.

A root-owned symlink alias is permitted. Its conventional `0777` symlink mode
does not grant write access to the target. A regular alias and the resolved
regular target still must pass their mode checks; the target must also be
executable. The reader retains alias and target identities and rejects changes
to their inode, owner, mode, link count, size or mutation timestamps. It excludes
access time from that comparison because its own reads can advance access time.

## Host observation and deterministic plan

A future host plan requires:

- clean exact `main` at explicit `--expected-head`;
- exact accepted V6 lock from that Git object;
- exact accepted mode-`0555` bootstrap artifact;
- exact mode-`0444` source-generation V3 manifest artifact;
- byte equality between the supplied manifest and the exact Git object;
- stable root-custodied Python/Git generations;
- absent staging root;
- either absent final root (READY) or an already exact GREEN root.

The plan writes private temporary Git metadata and sealed in-memory tool and
index copies. It reports `read_only=false`; it does not change the source
checkout or the protected installation. The private observation described
below must finish its final generation check and cleanup before a plan can
be returned.

The deterministic plan ID prefix is:

`voidbuye2bootstrapinstall6_`.

## Repository observation boundary

The outer installer observes the fixed checkout through one
`_RepositorySnapshot`. It does not run `git status` or `git show` against the
user's repository metadata. The reader authenticates commit and tree objects,
parses the physical index, and compares tracked files as raw bytes. It also
rejects unignored untracked entries. Repository configuration, hooks, filters,
replacement
objects, object alternates, lazy fetching, and other repository-supplied helper
behavior have no execution authority.

The supported checkout is a physical `.git` directory, symbolic `main`, a
supported version-2 index, and a complete locally available object graph.
Linked-worktree pointers, symlinked Git metadata, shallow/graft/alternate
metadata, unsupported index forms, hidden index flags, missing objects, object
hash mismatches, dirty bytes and generation changes cause HOLD. The reader
does not repair or fetch a rejected repository.

Git runs against private metadata built with a fixed configuration and pinned
objects. The executable is copied from the retained, root-custodied
`/usr/bin/git` generation into an owned mode-`0500` memfd with write, grow,
shrink and seal seals. The reader checks the source descriptor, visible alias,
resolved target, root-owned ancestry and sealed execution descriptor before
using it and again during final validation. The memfd belongs to the current
observer; the original host tool remains root-owned. This permits ordinary
nonroot observation without inventing native-parent authority. No native
bootstrap descriptor map is fabricated or supplied.

One observation covers the checkout, accepted lock, canonical manifest,
artifact checks, Python/Git policy and protected-state comparison. Its first
observations remain live until the final generation check at context exit.
The returned plan contains stable source and tool identities, not ephemeral
descriptor numbers or temporary-directory identities. Git children have bounded
output, resource limits and deadlines. A witness has a finite total lifetime;
timeouts, cleanup failure or incomplete final checks cannot become a plan.

### Temporary-write receipts

Before observation the CLI emits `authority_boundary=PRE_GIT_OBSERVATION`,
`read_only=false`, and the permission and scope of its private metadata writes.
Apply emits its broader `PRE_MUTATION` boundary before work. The final receipt
keeps private metadata cleanup distinct from protected-stage cleanup:

| Fact | Meaning |
| --- | --- |
| `git_boundary_policy=private_metadata_pinned_objects_raw_checkout_outer_v6` | The fixed raw-source observation policy used by the wrappers. |
| `temporary_git_metadata_write_required` | Observation requires private metadata and sealed memory copies. |
| `temporary_git_metadata_write_performed` | Whether that private-write boundary was entered, including a later failure. |
| `temporary_git_metadata_cleanup_completed` | All tracked private contexts were closed and cleanup did not fail. |
| `source_repository_mutation=false` | The observer does not rewrite the source checkout or its Git metadata. |
| `source_object_fetch=false` | Missing source objects produce HOLD. |
| `repository_config_loaded=false` / `repository_callback_execution=false` | Source-repository configuration and helpers are not loaded or executed. |
| `standalone_git_tool_admission=true` / `native_parent_authority_claimed=false` | The outer observer admits its fixed host tool directly. |

A no-write receipt remains valid for inert `--source-plan` and argument rejection
that happens before observation. It must not be substituted for an actual host
plan or run. Reading source files may update access times; preservation claims
cover bytes and the checked identity, mode, owner, link count, size, modification
time and change time.

## Separately authorized create-only apply

Apply requires the exact plan ID and confirmation token:

`INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V6_CREATE_ONLY`.

It:

1. revalidates all plan bindings and compares the initial checkout, lock,
   Python and Git identities with the authorized plan before opening `/opt`;
2. creates a private staging generation beneath `/opt`;
3. writes the accepted bootstrap, exact manifest and host policy create-only;
4. root-owns and mode-binds every object;
5. fsyncs files/directories;
6. verifies the complete staged generation;
7. revalidates checkout, lock, Python/Git and candidate inputs;
8. publishes once with `renameat2(RENAME_NOREPLACE)`;
9. fsyncs `/opt`;
10. verifies the final installed generation and bindings again;
11. closes the retained install-parent descriptor once and records the result.

Pre-publication failure cleanup is generation-bound. Creating the stage's own
files changes directory link counts and mutation timestamps, so cleanup binds
the originally created directory's device, inode, mode and owner while allowing
those construction changes. It enumerates the retained directory descriptors,
rejects unknown entries or a substituted directory, and rechecks the visible
stage identity before removal. Cleanup failure produces HOLD; an unrecognized
or substituted stage remains for inspection.

Once create-only publication is known to have succeeded, a later failure is
reported as `published_needs_inspection` and never triggers rollback. A Ctrl-C
can become `KeyboardInterrupt` as the native rename call returns, before Python
records its result. An exception during that handoff therefore compares the
created stage's retained device, inode, mode and owner with both names through
the retained parent descriptor. Both observations must remain stable. Finding
that generation at the final name establishes publication; finding it only at
the staging name permits the existing generation-bound cleanup.

Missing, substituted, conflicting or changing identities, or an observation
error, produce `publication=unknown` and `unknown_needs_inspection`. Neither
stage cleanup nor rollback is attempted when the publication outcome is
uncertain. The receipt preserves the original interrupt and any reconciliation,
pre-publication cleanup or install-parent close failure separately. It does not
retry a failed `close()`, which may already have consumed that descriptor.

### Terminal receipt

A successful publication emits `publication=true`,
`publication_state=rename_noreplace_verified`,
`parent_fsync_completed=true`, `final_verification_completed=true`, and
`install_parent_close_completed=true` before advancing to installed
qualification. A failure after the retained install-parent descriptor was opened
emits a structured HOLD receipt:

| Fact | Meaning |
| --- | --- |
| `publication` | `true` when success is established, `false` when publication did not happen, or `unknown` when an interrupted handoff cannot be resolved. A known success remains true after a later error. |
| `publication_state` | `not_published`, `published_needs_inspection`, or `unknown_needs_inspection`. |
| `failure_phase` | The phase at the original failure, or the parent close when that is the sole failure. |
| `publication_reconciliation_attempted` | Whether the interrupted rename handoff required inspection of both names against the created stage identity. |
| `parent_fsync_completed` | Whether the post-publication parent-directory fsync returned successfully. |
| `final_verification_completed` | Whether final layout and binding verification both completed. |
| `prepublication_cleanup_attempted` / `prepublication_cleanup_completed` | Whether stage cleanup was attempted and returned successfully. No cleanup is attempted after publication or on an uncertain publication outcome. |
| `install_parent_close_completed` | Whether the one parent close returned successfully. A false value does not authorize a retry. |
| `original_failure_class` / `original_failure_reason` | The operation error, or `none` when close alone failed. |
| `cleanup_failure_class` / `cleanup_failure_reason` | The cleanup error, or `none`. |
| `close_failure_class` / `close_failure_reason` | The close error, or `none`. |
| `reconciliation_failure_class` / `reconciliation_failure_reason` | An interrupted-handoff observation error, or `none`. An unresolved identity can report `unknown` without an I/O error. |

Exception reasons are escaped onto one bounded line. For example, a successful
rename and final verification followed by a close error reports
`publication=true`, `final_verification_completed=true`,
`install_parent_close_completed=false`, and the close error. If verification
also failed, the receipt retains that original error and reports
`final_verification_completed=false`.

## Focused source proof

The proof authenticates this installer source, the accepted lock and the source
manifest before loading the installer. It preserves the existing exact policy,
wrong-confirmation ordering, inert source-plan and create-only rename checks.

Seventeen terminal cases exercise the real `apply` and exception entrypoint with
inert payload bytes inside fresh private temporary directories. They cover a
changed Python or Git plan binding before staging, populated stage cleanup,
substituted stages, unknown entries, an existing final target, post-publication
fsync and verification failures, parent-close failures alone or combined with
operation and cleanup failures, and successful publication. Four handoff cases
deliver real SIGINT to the fixture process immediately before or after its real
rename, or after publication followed by an identity substitution or an injected
inspection error. They require truthful publication or explicit uncertainty,
preserve the interrupt and any inspection error, and reject cleanup after
publication or uncertainty. Files, modes,
digests, rename, fsync, descriptor closure and bounded cleanup are real. The
fixture supplies synthetic checkout/tool admission and admits only its own
files; it provides no evidence of production root or Git admission.

Ten additional cases read inert tool files through the actual tool snapshot
reader. They admit ownership only for the registered fixture inodes and supply
fixture ancestry. They cover regular and symlink aliases, reader-induced access
time changes, wrong owner/group, writable or nonexecutable inputs, alias
replacement and target-generation changes. No tool fixture is executed.

The exact twenty-case `prove_tool_snapshot_alias_handling` function merged in
PR #3470, its call and its receipts are also preserved. Those synthetic metadata
cases continue to check ordinary root-owned tool aliases, unsafe alias and
target modes or owners, writable ancestry and alias changes during a read. They
remain separate from the ten additional inode-scoped fixture cases above.

These cases establish source-level terminal behavior. They do not execute the
accepted C6 bootstrap or inner installer, access Precision, qualify a production
installation, or advance artifact acceptance. The accepted ELF, inner V5 and
manifest V3 identities remain unchanged. The terminal and alias fixtures state their synthetic admission boundary
explicitly; the additional Git fixtures below exercise the repository reader.

### Actual private-Git component cases

Three positive and 28 rejection cases use real Git in private ordinary
repositories. Only the checkout location is rebound for these cases. The fixed
host Git/Python admission is real; neither root-tool admission nor a native
parent is simulated. Positive cases cover stable ordinary and packed source
objects plus hostile repository settings that refer only to nonexistent inert
helpers. No configured helper is created or executed.

Rejection cases cover raw/staged/untracked changes, hidden index flags, split,
sparse and version-4 indices, executable-mode or symlink drift, detached or wrong
branches, main-ref drift, unsupported Git metadata, missing or corrupt pinned
objects, tree membership mismatch and changes after an earlier file or later
component was observed. Additional explicit fault cases cover tool metadata,
an unsealed execution-descriptor substitution and private cleanup failure.
Substituted descriptors are never executed. The proof verifies private
descriptor and temporary cleanup and preserves the source bytes and checked
metadata; it does not claim access-time preservation.

The joint proof does not access the production fixed checkout, mutate protected
tool paths, execute a namespace, or qualify an installed C6 root. Its
`private_git_boundary_proven=true` receipt describes these component fixtures.
It is separate from the accepted C6-to-inner handoff evidence.

## Coordinated consumer and CI scope

The outer installer, installed qualifier and non-executing bootstrap planner are
updated together in twelve files: source, proof, operator document and workflow
for each wrapper. The qualifier pins this installer and uses its private reader
across three installed snapshots and both retained-descriptor self-tests. The
planner pins the same qualifier/installer generation and requires the actual
temporary-write and cleanup facts in its qualification contract. Root execution
of installed qualification remains a separate requirement of that contract.

Each workflow requires the accepted source base to be an ancestor of the
checked-out head. A pull request uses its event base SHA, which must also be an
ancestor, and requires a nonempty diff contained in the reviewed twelve-path
allowlist. Main pushes use the literal event `before` SHA; manual replay uses
the head's first parent. These two events do not reapply the PR path scope.
All events verify the same 24 source and dependency pins and full diff hygiene.
Workflow hashes are not cross-pinned into one another. The nine changed source,
proof and document blobs and the accepted artifact dependencies are pinned.

The install workflow also rederives the accepted C6 ELF and manifest with the
current materializer and compares their full byte counts, modes and digests.
This consumer repair preserves the accepted C6 ELF, inner V5, manifest V3 and
candidate lock. The separate accepted-handoff proof, document and workflow may
advance without changing those artifact identities or these wrapper pins.

## Authority boundary

The install lane does **not** execute:

- the V6 bootstrap;
- the inner V5 installer;
- the dormant binder;
- any credential/private-key path;
- signing;
- transaction/RPC;
- payment acceptance;
- public presale/WC activation;
- treasury/liquidity action;
- service/systemd mutation;
- funds movement.

A future GREEN host install advances only to a separately authorized installed
qualification for the V6 bootstrap root. The historical gate token retains
`READ_ONLY` in its name; actual qualification declares its private metadata
writes and requires their cleanup. No gate name overrides those runtime facts.

PROTECT THE CORE.

## Git cruft-pack compatibility

The accepted V6 generation treats `pack-<oid>.mtimes` as non-authoritative cruft-pack metadata under the same regular-file/single-link shape checks as other pack auxiliaries. It is not copied into the private object view and does not grant object authority.
