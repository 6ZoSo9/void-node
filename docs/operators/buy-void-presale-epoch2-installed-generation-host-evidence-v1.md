# Buy VOID presale Epoch-2 installed-generation host evidence V1

Marker:
`VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V1`.

Status: **source/CI-only collector definition; no Precision qualification has been run by this gate**.

Parent plan:

`voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab`

This gate implements only #3507 lane:

`epoch2_installed_generation`.

## Reviewed qualifier

The collector binds the existing read-only installed qualifier:

`ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py`

Git blob:

`a04c2e7665294cdd142426e9eb01ee27c5292b8d`

And its adversarial proof:

`scripts/prove_void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py`

Git blob:

`c14ec00acffbc55630aa68db0013d97cac068ab3`.

The collector loads the exact qualifier Git-object bytes into memory and calls
only `collect(expected_head)`.

## Future host run

A future separately authorized root run accepts:

`--run --expected-head <exact clean lowercase-hex main HEAD>`

The collector first requires the local checkout to be clean branch `main` at
that exact HEAD and requires the qualifier/proof paths at that HEAD to match the
pinned reviewed Git blobs.

The V5 qualifier then:

1. authenticates the accepted V6R2 native candidate lock and protected upgrade;
2. verifies the exact current install root;
3. verifies the retained predecessor root;
4. binds Git, setpriv, Node, policy and checkout generations;
5. executes the installed native self-test through a retained descriptor;
6. snapshots the installed generation again;
7. executes a second descriptor-bound native self-test;
8. snapshots a third time;
9. requires before/middle/after installed generations to be identical;
10. requires both self-test outputs/digests to be identical.

Its reviewed proof also demonstrates that a visible pathname swap cannot cause
the replacement binary to execute: the retained descriptor executes the
original generation and the visible generation drift causes HOLD.

## Deliberate process execution

This evidence lane is read-only for persistent state but is not metadata-only.

A future host run executes the installed native **self-test twice**.

It does not execute:
- the authenticated JS runner;
- live composition;
- credentials/private keys;
- signing;
- a transaction or RPC submission.

A GREEN evidence report may set:

```text
epoch2_installed_generation_qualified=true
protected_upgrade_verified=true
installed_generation_stable=true
retained_predecessor_verified=true
node_generation_bound=true
checkout_generation_bound=true
git_generation_bound=true
setpriv_generation_bound=true
native_self_test_execution_performed=true
native_self_test_descriptor_bound=true
native_self_test_stable=true
```

It must retain:

```text
filesystem_write_performed=false
runner_execution=false
live_composition_execution=false
service_mutation=false
network_contact=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction_submission=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_or_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

## Relationship to presale qualification

A GREEN lane-3 result proves only the reviewed Epoch-2 installed-generation
evidence required by #3503/#3507.

It does not by itself prove:
- authenticated deployment/live-process receipt evidence;
- allocation-custody durability/rollback/independence;
- host-install qualification;
- payment-rail policy acceptance;
- one-payment/one-fulfillment;
- WC/VOID launch coupling;
- customer payment acceptance;
- presale or market activation.

Lane 1 is separately defined in #3510.

Lane 2 remains HOLD because current reviewed custody primitives deliberately
leave live durability, rollback resistance and independent custody unproven.

## CI boundary

Hosted CI:
- binds #3507's exact parent plan;
- binds exact V5 qualifier and proof blobs;
- compiles and adversarially checks the wrapper;
- exercises only wrapper `--self-test`;
- uses `--run` only on a disposable unisolated copy to prove rejection before collection;
- does not execute the real native self-test or inspect Precision.

Real host qualification remains separately authorized.

**PROTECT THE CORE.**

## Qualifier source stat contract

The future wrapper observes the checked-out reviewed qualifier through
`os.fstat()` on a retained descriptor and `os.stat(..., follow_symlinks=False)`
relative to a retained parent directory. Regular/symlink classification uses
`stat.S_ISREG(before.st_mode)` and `stat.S_ISLNK(visible.st_mode)`.
The wrapper does not rely on nonexistent pathlib-style methods on
`os.stat_result`; malformed or drifting source metadata remains fail-closed.

## Git observation failure contract

Every checkout/source query uses the fixed reviewed `/usr/bin/git` invocation
with a 20-second timeout. The wrapper supplies `-c core.fsmonitor=false` on
every Git invocation so an owner-controlled repository-local
`core.fsmonitor=<executable>` cannot run under the future root observation
boundary. System and global Git config remain disabled; replacement objects and
optional locks remain disabled as well.

Failure to start Git and Git timeout are both caught and converted to
`EvidenceError`, so a future separately authorized host run emits the same
machine-readable `status=HOLD` contract instead of a traceback. Hosted proof
captures the constructed Git argv and requires the FSMonitor override before
the subcommand, then separately injects both an `OSError` spawn failure and
`subprocess.TimeoutExpired` and requires those normalized HOLD reasons.

No host execution authority changes.


## Delegated root execution isolation

A future `--run` is accepted only under Python isolated/safe-path mode. The
wrapper refuses the collection before checkout or qualifier access if
`sys.flags.isolated != 1`, safe-path mode is absent, or any active
`sys.path` entry resolves inside the fixed checkout. This prevents
checkout-local Python modules from satisfying absolute imports when the exact
qualifier and installer source are executed in memory.

The exact V5 qualifier source remains byte-identical. Before its
`collect(expected_head)` call can load the exact protected installer, the
wrapper replaces the qualifier's installer-loader boundary with an exact-object,
descriptor-validated loader. It never calls the original pathname-based loader.
The returned exact installer module must expose the reviewed
`CLEAN_GIT_ENV`; the guard then adds command-scope Git configuration through
the environment:

- `core.fsmonitor=false`;
- `core.hooksPath=/dev/null`;
- `HOME=/nonexistent`;
- `GIT_TERMINAL_PROMPT=0`;
- `GIT_ATTR_NOSYSTEM=1`.

The installer environment contract remains checked. Its query entrypoint is
replaced with the wrapper's shared UID-dropping, confined Git boundary described
below. Hosted proof creates a disposable repository with a
local FSMonitor executable and requires that it is not invoked under the exact
delegated environment. It separately invokes the wrapper without `-I` and
requires a machine-readable `python_isolated_mode_required` HOLD.

No accepted qualifier/installer source blob is rewritten and no additional
runtime/payment authority is granted.

## Pre-import isolation bootstrap

The root-started wrapper now performs its isolation/safe-path check before any
shadowable standard-library import. The only module loaded before that check is
built-in `sys`, which cannot be replaced by a checkout-local `sys.py`.

If Python was not started in isolated/safe-path mode, direct execution emits the
same machine-readable `status=HOLD` negative-authority receipt and exits before
`argparse`, `hashlib`, `json`, `pathlib`, or any other shadowable module
is imported. Non-main import under an unisolated interpreter is rejected
immediately as well.

The unnecessary `from __future__ import annotations` is absent: that statement
also performs a runtime import and could execute a checkout-local `__future__.py`
before the bootstrap. Hosted proof executes a disposable copy beside hostile
`__future__.py`, `hashlib.py`, and `argparse.py` modules that would create a marker
if imported. An unisolated
`python3 -B` launch must HOLD and the hostile marker must remain absent. The
later full `sys.path` checkout-exposure check remains in place for isolated
execution.

No host/runtime/payment authority changes.

## Descriptor-bound qualifier source

Before executing the reviewed qualifier module, the wrapper opens the fixed
checkout qualifier file exactly once, relative to a retained parent, with
`O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK`. The retained descriptor must be a
regular single-link file whose size is exactly the already-authenticated Git
object byte length before any content read occurs.

The parent path is traversed component by component from `/` through directory
descriptors using `O_PATH|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC`. Revalidation repeats
that traversal and checks parent/file identity. A symlink in any ancestor is
rejected, as are visible-path replacement, metadata drift, and file growth.

The wrapper bounded-reads only through that descriptor, checks exact EOF/bytes,
revalidates descriptor generation, and then requires the canonical visible path
to still name the same generation. A symlink is rejected before its target can
be consumed, and FIFO/special-file inputs are rejected from descriptor metadata
without blocking.

The exact Git object remains compile authority; the visible checkout file must
be byte-identical. This adds no host mutation or runtime/economic authority.

## Delegated installer and accepted-lock reads

The same bounded reader protects the delegated installer source and accepted
lock. The wrapper independently binds installer Git blob
`fd7a06490ccf6fb14831d8b0372a892e2764c9dc` and lock Git blob
`bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b` at the expected checkout head.
Only authenticated Git-object bytes are compiled, after the visible installer
passes descriptor validation. Its marker, checkout path, lock path/blob, and Git
environment must match the reviewed contract.

Before returning the module, the wrapper replaces `_direct_repo_bytes` with an
exact lock-path allowlist and descriptor-validated read. The qualification's
`accepted_lock()` retains its own schema/blob checks; other repository-read paths
HOLD before lookup or access. The reviewed V5 qualifier and installer files stay
byte-identical.

Hosted proof uses synthetic installer definitions and a mocked exact-object
lookup in a disposable directory. It proves the original loader/reader cannot
be called, symlink/FIFO/changed-byte sources reject, and path swaps, ancestor
symlinks, and growth fail closed. The real installer, host qualification, native
self-test, credentials, and economic paths are not executed by these fixtures.

## Checkout observation without content filters

The wrapper no longer invokes `git status`. A repository-owned clean or process
filter can execute during status, even when FSMonitor and hooks are disabled,
and can return original bytes while hiding a worktree change. The same risk
applies to the delegated installer's otherwise unchanged status query.

Both checks now use one raw checkout verifier:

- `git ls-tree -r -l -z --full-tree` lists the exact expected commit's paths,
  modes, blob identities, and sizes;
- `git ls-files --stage --full-name -z` must match that tree exactly, with only
  stage-zero entries;
- `git ls-files --others --full-name -z` must be empty, including ignored files;
- every tracked regular file is read through the existing no-follow ancestor
  and retained-descriptor boundary, with exact size/EOF, mode, stable-generation,
  and raw Git-blob equality checks;
- head, branch, index, and untracked-file observations are repeated after the
  content reads. Detected drift is HOLD.

These commands do not request content conversion. The wrapper rejects direct
status commands. The exact installer module's `_run_git` is replaced in memory:
its original status query calls the same raw verifier, while only an exact
allowlist of existing ref/object-name queries reaches the wrapper's confined
Git path. The original runner is never called. No protected V5 source is modified. Existing Git environment hardening
remains, and wrapper Git disables protocols, lazy fetch and untracked caching.

Wrapper Git also forces `core.excludesFile=/dev/null` before every query. Local
configuration cannot redirect the global excludes read to a credential or FIFO
readable by the checkout UID. The untracked-file query does not enable exclusion
processing at all: it opens neither `.git/info/exclude` nor per-directory
`.gitignore` sources. The disposable proof first reproduces a configured FIFO
blocking an ordinary excludes query, then retains that hostile configuration
through the repaired wrapper and delegated checkout tests without opening it.
It also proves that a symlink from `.git/info/exclude` to a checkout-UID-readable
FIFO blocks the old query but cannot affect either repaired observation.

This intentionally requires raw bytes and executable modes to match the commit.
Filtered/normalized or CRLF worktrees, symlinks, gitlinks, unmerged or different
index entries, invalid paths, tracked special files, and tracked hardlinks HOLD.
Every untracked path reported by Git now causes HOLD, even if an ignore rule
would normally hide it. Git can omit untracked special objects such as FIFOs;
this listing is not an inventory or qualification of all filesystem objects. This is
stricter than ordinary Git status: a future source checkout containing ignored
dependencies, caches, logs, or other untracked state does not qualify. The
collector never deletes that state or grants permission to remove it.
The bounds are 50,000 tracked files, 64 MiB per file, 512 MiB total tracked
content, and 16 MiB per parsed listing. This is a sequence of revalidated
observations, not an atomic filesystem snapshot.

The disposable hosted fixture first reproduces the old defect: status returns
empty while its configured clean filter writes a marker. The repaired wrapper
and delegated checks must accept unchanged raw files without running either a
clean or required process filter. Changed bytes, executable modes, staged or
untracked changes, symlink/FIFO replacements, and path traversal are rejected;
assume-unchanged and skip-worktree flags cannot hide changed bytes.

This is source/proof coverage only. It grants no real host qualification,
installation, native self-test, runtime, credential, signing, transaction,
payment, activation, or funds authority.

## Git metadata privilege boundary

Disabling system/global configuration does not disable a checkout's local Git
configuration. A local include can name a root-readable file or FIFO even for
`rev-parse`. Every wrapper Git subprocess therefore drops to the same fixed
checkout identity used by the accepted installer: UID 1000 / GID 1000.

For root callers, fixed `/usr/bin/setpriv` applies `--no-new-privs`, both UID/GID
changes, `--clear-groups`, and empty inheritable, ambient and bounding capability
sets before entering a fixed isolated `/usr/bin/python3` in-memory launcher and
then fixed `/usr/bin/git`. The child has a closed environment,
cwd `/`, no inherited extra descriptors, and the existing timeout/error-to-HOLD
handling. An already unprivileged UID-1000 query may enter the launcher directly; other caller
UIDs HOLD before spawning. No Git metadata/config parser is entered as root by
the wrapper. The in-process raw-file verifier and fixed installed qualification
retain their separately documented descriptor and root requirements.

The UID drop prevents local config includes from borrowing the collector's root
access. The additional filesystem boundary below denies outside reads even when
the target is readable by UID 1000. The earlier filter-free observation and
delegated query allowlist remain in place, and the accepted V5 sources remain unchanged.

Hosted CI runs the adversarial proof as root solely for disposable `/tmp`
fixtures, with `--require-kernel-uid-drop`. It must reproduce a root Git query
blocking on a synthetic root-owned mode-0600 include FIFO, then prove the
repaired query cannot open that FIFO. A disposable executable probe verifies
real/effective UID/GID 1000, no supplementary groups, no-new-privs set, zero
inheritable/permitted/effective/bounding/ambient capabilities, and denial of the
root-only include. The workflow requires both kernel-evidence markers to be
true. It never invokes the collector's real `--run`, host qualifier, installed
native self-test, or installer apply.

Restricted local user namespaces may run the source/filter tests and command
construction checks without that kernel fixture. They explicitly print
`kernel_git_uid_drop_executed=false`; that local result cannot satisfy hosted
CI or be presented as privilege-drop evidence.

## Fixed Git namespace and kernel read boundary

Every wrapper and delegated metadata query supplies explicit
`--git-dir=<fixed checkout>/.git` and `--work-tree=<fixed checkout>` arguments.
A checkout-controlled `core.worktree` cannot redirect the untracked-file scan
while the raw-byte verifier examines the fixed checkout. A disposable regression
first demonstrates the old query missing an untracked file after redirection,
then requires both wrapper and delegated checks to reject that file.

Dropping to UID 1000 alone does not prevent local config includes from reading
that UID's credentials. Before any Git parser starts, the isolated launcher
requires Linux x86-64 Landlock ABI 3 or later and installs an inherited read
policy. It grants directory enumeration beneath the fixed checkout; individual
regular, single-link metadata files (`config`, `HEAD`, optional `index`,
`packed-refs`, and `shallow`, plus object/ref leaves); and the fixed executable,
system library directories, loader cache, `/dev/null`, and process status needed
by the runtime and disposable identity probe. It grants no checkout executable
permission or worktree file-content access. The raw tracked-file reader remains
the separate descriptor-validated boundary described above.

Metadata paths are traversed with no-follow descriptors before inode rules are
added. Object/ref trees are bounded to 50,000 entries and grant file access per
inode, not to whole subtrees. Symlink, hardlink, special-file, shared gitfile, or
unsupported metadata layouts HOLD. Outside includes and alternate object stores
cannot escape the enforced policy; newly replaced metadata inodes are denied.
Only the `/dev/null` discard device may be opened read/write; persistent paths
receive no write rights. Landlock does not restrict
every metadata syscall, so this is a file-content read boundary, not a general
claim that every possible filesystem operation is sandboxed.

Missing kernel support, rule construction failures, or enforcement failures HOLD
before Git execution. There is no runtime fallback. All allowlisted delegated
metadata queries use this same launcher; `branch --show-current` is mapped to
the existing symbolic-ref query. Protocols and lazy fetching remain disabled.

Hosted proof must reproduce a demoted Git query blocking on a synthetic
UID-1000-owned mode-0600 include FIFO, then prove confined wrapper/delegated
queries cannot block on it. The executable probe must receive `PermissionError`
for both root-only and same-UID FIFOs while retaining the UID/capability checks.
Both `kernel_git_read_boundary_executed=true` and
`query_uid_config_include_denied=true` are mandatory workflow markers. Local
environments without Landlock exercise only disposable filter/worktree fixtures
with a test-only launcher substitution and explicitly print false kernel
markers; they cannot satisfy hosted CI. No real credentials are used.

## Bounded Git output and unforgeable HOLD lines

The parent reads Git stdout and stderr concurrently through nonblocking pipes
and a selector. It retains at most 16 MiB of stdout and 64 KiB of stderr, reading
only up to the remaining allowance plus one detection byte before rejecting an
overflow. This limit applies while reading, before listing parsing or allocation
of an unbounded `communicate()` result. Each query retains a 20-second deadline.
Limit or timeout failures kill the query's process group, reap the child, and
close both pipes. Cleanup failure itself produces a fixed HOLD reason.

Git failure receipts contain only `git_command_failed:<numeric status>` or a
fixed error code; raw stderr never becomes receipt text. Delegated qualifier
exceptions likewise become a fixed reason. The final HOLD renderer restricts
every reason to one bounded ASCII line and emits each negative-authority field
exactly once, preventing newlines, carriage returns, Unicode line separators,
or terminal controls from forging additional receipt fields.

The source-only proof exercises real disposable pipe producers: exact-limit
success, endless stdout/stderr overflow, actual timeout with killed/reaped
children, and forged status/authority lines in failed and successful-process
diagnostics. The hosted same-UID config-include FIFO also carries forged receipt
lines in its filename. The kernel denial remains required and none of those
diagnostics may become authority claims. No real credentials or host collection
are involved.
