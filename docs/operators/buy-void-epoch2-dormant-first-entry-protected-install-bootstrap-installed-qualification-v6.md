# Buy VOID Epoch-2 protected-bootstrap installed qualification V6

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6`.

Status: **source/test/CI definition; installed qualification requires root, writes
private temporary Git metadata, and permits only two inert bootstrap self-tests**.
This change performs no Precision installation or qualification.

## Purpose and source binding

Qualify the installed V6 dormant first-entry bootstrap root after its
create-only installation. The qualifier is bound to outer installer Git blob:

`438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84`.

It uses that installer as the canonical definition of the accepted V6 lock,
fixed protected root, exact three-file layout, accepted ELF, V3 manifest,
root-custodied Python/Git identities, policy bytes and private source observer.
The accepted native C6 source, inner V5, manifest V3 and artifact lock remain
unchanged by this wrapper repair.

The installed-qualification operation requires effective UID 0. The check occurs
before host observation or bootstrap execution. The separate bootstrap planner
remains nonroot and describes a root qualification contract; planning does not
silently invoke `sudo`, remove this root check or claim qualification success.

## Required installed generation

Fixed root:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6`

| Object | Required identity |
| --- | --- |
| Root and `bin/` directory | `0755 root:root`, no substituted generation or extra entry. |
| `bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6` | `0555 root:root`, 874608 bytes; SHA-256 `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`; Git blob `b577d70666f98ac59a75b84b3dab741fe7b93a4b`. |
| `source-generation-v3.conf` | `0444 root:root`, 2382 bytes; SHA-256 `8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`; Git blob `de56bacb30bea0adc418e240cf3fb8d900b061ef`. |
| `policy-v1.conf` | `0444 root:root`, byte-identical to the five-row V6 policy rederived from the protected targets of `/usr/bin/python3` and `/usr/bin/git`. |

The checkout must be clean exact symbolic `main` at the explicit expected head.
The accepted lock and manifest must be members of its authenticated tree.
Conventional root-owned `0777` symlink aliases for host tools are permitted;
their resolved targets still require root custody, executable modes and stable
generations. Access-time changes caused by reading are excluded from the
generation comparison.

## One repository observation across both self-tests

The qualifier opens one installer `_RepositorySnapshot` and retains it across
the full sequence:

1. Collect the first installed, checkout, lock, manifest, Python/Git and policy
   snapshot.
2. Execute the accepted bootstrap's inert self-test through a retained descriptor.
3. Collect a second snapshot through the same repository observer.
4. Execute the second retained-descriptor self-test.
5. Collect the final snapshot through the same repository observer.
6. Require equality of all three snapshots and both self-test transcripts.
7. Complete the repository's final generation check and private cleanup before
   constructing the GREEN result.

An early source-file observation remains part of the final check even when a
later component or self-test runs afterward. A last-minute repository change,
expired observation deadline or cleanup failure cannot produce GREEN.

The observer authenticates raw commit/tree objects, parses the physical
version-2 index, and compares tracked worktree bytes. It rejects unsupported
Git metadata, unignored untracked files, dirty content, missing objects and
generation drift.
Git executes from a sealed in-memory copy of the admitted root-custodied host
tool against fixed private metadata. The source repository's configuration,
hooks, filters and fetch behavior are not loaded or invoked. This is standalone
host-tool admission; the qualifier claims no native-parent authority.

## Descriptor-bound bootstrap self-test

The qualifier opens the installed bootstrap with `O_NOFOLLOW`, verifies its full
generation, hashes the retained descriptor and executes only:

`/proc/self/fd/<retained-fd> --self-test`.

Visible pathname replacement after retention cannot redirect that execution.
The reader also rechecks the visible path, so replacement still produces HOLD.
The accepted bootstrap self-test is reached before its operational installer
path. It does not run a bootstrap plan, bootstrap apply or inner installer.

Both transcript bytes and transcript digests must match. The successful result
reports exactly two descriptor-bound self-tests. An error receipt reports
`bootstrap_self_test_execution_state=unknown_or_partial_if_started`; it does not
invent a zero-execution claim after a self-test could have started.

## Temporary-write and failure receipts

Actual installed qualification is not literally read-only. Before opening the
repository observer, `collect` emits the `PRE_GIT_OBSERVATION` authority boundary,
declares private metadata writes and the possible inert bootstrap execution, and
flushes that declaration. The private observer may create temporary Git metadata
and sealed memory copies; it does not modify the source checkout or protected
installation.

| Runtime fact | Successful qualification | Meaning on HOLD |
| --- | --- | --- |
| `read_only` | `false` | Derived from whether a private write was performed; a pre-observation rejection can remain `true`. |
| `filesystem_write` | `true` | Preserves the observed private-write fact even when a later check fails. |
| `temporary_git_metadata_write_required` | `true` | Observation requires private metadata, when that boundary is reached. |
| `temporary_git_metadata_write_performed` | `true` | Does not become false merely because qualification failed. |
| `temporary_git_metadata_cleanup_completed` | `true` | A false result remains explicit and prevents success. |
| `protected_filesystem_mutation` | `false` | No protected install, update or rollback is performed. |
| `source_repository_mutation` / `source_object_fetch` | `false` / `false` | The source checkout is not repaired, rewritten or fetched. |
| `repository_config_loaded` / `repository_callback_execution` | `false` / `false` | Repository-supplied configuration and helpers have no execution authority. |
| `native_parent_authority_claimed` | `false` | Standalone source observation does not manufacture the C6 parent contract. |

The collector resets its private-write receipt before each call, including a
nonroot rejection. The observer's final receipt is captured in `finally` after
cleanup. Repository errors and bounded I/O failures become qualification HOLD;
they do not erase earlier writes or return a partially constructed success.
Reads can update access times, which are not included in preservation claims.

The inert `--source-plan`, `--plan` and qualifier `--self-test` modes retain their
no-host-observation and no-write behavior. Their receipts describe only those
inert modes. The historical next-gate token still contains `READ_ONLY`; consumers
must use the actual runtime facts above instead of interpreting that spelling as
a no-write promise.

## Focused source evidence

The proof authenticates this qualifier and its exact installer dependency before
loading either. The retained-descriptor adversary uses an actual inert executable
in a private fixture: it retains `true`, substitutes visible `false`, executes
the retained inode and requires generation HOLD for the replacement. It never
executes an installed C6 binary or touches its production path.

Seven additional control-flow cases use a simulated installer and root-admission
boundary. They exercise a successful shared reader sequence, middle-snapshot
drift, self-test transcript drift, the final repository check, private cleanup
failure, self-test I/O failure and a nonroot rejection before observation. They
verify the result and error receipts, including private-write truth and cleanup.
These are collector-control fixtures, not evidence of actual installed-root
qualification. The proof states `qualification_root_admission_simulated=true`
and `actual_installed_root_qualification=false`.

The outer installer's separate component proof exercises real host-tool
admission and private Git with three positive and 28 rejection cases. Its
configured helpers are nonexistent inert paths; none is created or executed.
Neither wrapper proof executes a namespace or qualifies Precision.

## Planner contract and CI integration

The outer installer, this qualifier and the non-executing V6 bootstrap planner
are reconciled together. The planner's qualification contract pins the repaired
qualifier and installer sources, retains root execution as a separate step, and
requires actual private-write and cleanup facts. A source plan is not an
installed qualification receipt. A source pin mismatch or missing qualification
fact remains HOLD.

All three workflows require the accepted source base to be an ancestor of the
checked-out head. A pull request uses its event base SHA, which must also be an
ancestor, and requires a nonempty diff contained in the reviewed twelve-path
allowlist. Main pushes use the literal event `before` SHA; manual replay uses
the head's first parent. These two events do not reapply the PR path scope.
All events verify the same 24 source and dependency pins and full diff hygiene.
The nine changed nonworkflow blobs and accepted dependencies are pinned without
circular workflow hashes. CI source and fixture evidence does not imply an
installed or running host generation.

## Authority boundary and next gate

Installed qualification permits the two inert bootstrap self-tests and the
declared temporary metadata writes. It performs no bootstrap operational
plan/apply, inner V5 execution, protected-installer apply, source-repository or
protected-state mutation, service/systemd change, credential/private-key access,
signing, transaction/RPC, payment acceptance, public presale/WC activation,
treasury/liquidity action or funds movement.

A GREEN host qualification advances only to:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_V6_PLAN`.

That later gate remains separate from inner protected-installer apply.

PROTECT THE CORE.

## Git cruft-pack compatibility

The accepted V6 generation treats `pack-<oid>.mtimes` as non-authoritative cruft-pack metadata under the same regular-file/single-link shape checks as other pack auxiliaries. It is not copied into the private object view and does not grant object authority.
