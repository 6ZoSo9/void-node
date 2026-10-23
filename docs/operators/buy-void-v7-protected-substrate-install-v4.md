# Buy VOID V7 protected substrate installer V4 — immutable release-root mode repair

Marker: `VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V4`.

Status: **source/CI-only repair; protected host apply remains separately authorized**.

## Reproduced Precision blocker

The operation-bound read-only V5R2 host evidence reached the authenticated receipt/live-process lane and found the accepted selector path absent. A follow-up plan-only V3 run reproduced both accepted candidate binaries exactly:

- native SHA-256 `8ce663ff7e3713fc6bf615dd743350be9e50dff729fdb3d609b065b158397851`, 21600 bytes;
- selector SHA-256 `048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232`, 26680 bytes.

Installer V3 then HOLDed before installed-state classification because the exact active release root
`/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`
is a canonical `root:root` directory with mode `0555`, while V3 hard-coded `0755` for that source root.

The V7 protected source, native-preentry and selector targets were all absent. No partial V7 publication occurred.

## Repair

V4 preserves V3 and binds it as the exact predecessor:

- predecessor main/merge: `0ada7fde0d90c3946b10693f4621cbd690bfcde6`;
- predecessor tree: `9e930fba9aacfafb5b163767302786cd7f31c81e`;
- predecessor V3 installer blob: `4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38`;
- materializer V2 blob: `474614da950db72082fb95a5174405ce8caf2513`;
- historical installed qualifier V2 blob: `56a7ca798553766af525d9fb1ccbe58b70fe9c1d`;
- installed qualifier V3 blob: `ea3c31180810ea4efe4341683742827dcf6ac5ac`.

The mode contract is role-specific:

- immutable active source release root: exact `root:root 0555`;
- newly published protected source root: exact `root:root 0755`;
- installed native/selector directories: unchanged exact `root:root 0755`;
- installed native/selector executable files: unchanged exact `root:root 0555`.

No source-release chmod or chown is introduced. Child tree nodes remain root-owned; non-symlink child nodes remain non-group/world-writable; strict internal symlink containment remains mandatory.

The tree digest still binds every child directory mode, regular-file mode/size/SHA-256, and symlink target. Root mode is represented separately in the V4 operation-bound plan so a `0555` immutable source release cannot be confused with the `0755` protected publication root. The plan also binds the exact installed-qualification V3 blob, and a successful create-only install points only to `RUN_INSTALLED_QUALIFICATION_V3`.

## Current direct repository-evidence authority — October 21, 2026

This section **supersedes the earlier V4 Git-observer acceptance text below** for the
installer itself.

Exact-head review of the landed post-#3650 generation found that dropping to runtime
UID/GID before executing `/usr/bin/git` removed root-time dynamic execution, but did
not make Git output trustworthy: UID 1000 could still influence Git's dynamic loader or
shared-library closure and forge `rev-parse`, `status`, or `ls-tree` evidence that the
root parent treated as authoritative.

The current V4 source therefore executes **no Git subprocess at all** for repository
acceptance. It removes `FIXED_GIT`, the runtime observer subprocess path, and every
`git_text` / `git_bytes` / `git_is_ancestor` authority call.

Repository authority is now direct and closed:

- the trusted launcher must provide both `--expected-head <40 lowercase hex>` and
  `--expected-tree <40 lowercase hex>`;
- `.git/HEAD` must be exactly `ref: refs/heads/main\n`;
- `.git/refs/heads/main` is read directly with retained-generation checks and must
  equal the supplied expected HEAD;
- the visible worktree is converted directly to the Git tree object ID using Git's
  blob/tree SHA-1 framing, file modes, symlink targets, directory entries, and Git tree
  ordering rules;
- that directly derived tree ID must equal the supplied expected tree;
- accepted dependency files and the V7 candidate lock are read directly from the
  authenticated worktree and checked against their compile-bound Git blob IDs;
- untracked or otherwise extra worktree paths necessarily change the directly derived
  tree ID and HOLD;
- the same direct HEAD/tree checks are used for the immutable source release, private
  source stage, and installed protected source target.

The operation-bound V4 plan body includes both `expected_head` and `expected_tree`.
Apply must replay the exact pair, exact plan ID, and the existing create-only
confirmation token. A changed tree under the same requested HEAD cannot replay the
plan.

Hosted source proof may use `/usr/bin/git` only as a **test oracle** in a disposable
repository: it compares V4's direct tree calculation with Git's `HEAD^{tree}`, including
an executable, symlink, nested tree, Git prefix-order adversary, and untracked-path
negative case. Git output is not production installer authority.

This repair proves worktree/ref identity, not full historical object connectivity.
Full-history provenance remains a separate protected-source-replica concern and does
not grant this installer additional host authority.

## Installed qualification V3 closure

Historical qualifier V2 remains unchanged. It had no role-specific root-mode contract, so following V4 with V2 would reintroduce the same host mismatch. V3 preserves canonical source-custody, exact commit/tree/symbolic-main/clean-worktree checks, source/target byte-identity comparison, exact native/selector/launcher identities, double native self-tests, and all false payment/activation/funds authority.

V3 adds only the role split required by observed immutable runtime state:
- active source-release root: exact root:root `0555`;
- protected source root: exact root:root `0755`.

Its source-only self-test explicitly rejects swapped modes and non-root ownership. The operational V3 run remains unprivileged/read-only and is not executed by hosted CI.

## Lifecycle

V4 uses a fresh `voidv7substrateinstallplan4_<sha256>` namespace and confirmation token `INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V4_CREATE_ONLY`.

The plan/apply request is bound to the trusted launcher supplied **HEAD + tree pair**.
Both `--expected-head` and `--expected-tree` are mandatory, are incorporated into the
operation-bound plan body, and must be replayed unchanged for apply.

Source/CI GREEN does not authorize `--apply`. A real `/opt` create-only publication remains a separate operator lifecycle action after an exact plan-only run is reviewed.

## Authority

This repair does not perform or authorize chmod/chown of the active release, protected `/opt` publication, service/systemd mutation, credential/private-key/wallet access, signing, transaction/RPC, payment acceptance, presale/WC activation, treasury/liquidity action, or funds movement.

PROTECT THE CORE.


## Qualifier binary-execution custody repair

Independent manual review of exact head `b8d877d219390dc6d807caf0361d4617b4623ad5`
found that qualifier V3 authenticated the native preentry and selector leaf files,
then executed them again by pathname without re-proving custody of their binary-root
directories. A runtime-UID-writable parent directory could therefore permit a
pathname swap between leaf validation and self-test execution.

This generation closes that gap. Qualifier V3 now:

- requires the immediate native/selector binary roots to remain exact root-owned
  `0755` directories and every ancestor to remain root-owned, non-symlink and
  non-group/world-writable;
- opens each exact `0555` ELF once with `O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK`;
- authenticates size and SHA-256 from the retained descriptor;
- executes both self-tests through `/proc/self/fd/<n>` with only that reviewed
  descriptor inherited;
- revalidates retained-descriptor identity, visible pathname identity and the full
  ancestor snapshot before/after execution; and
- re-hashes the retained descriptor after both self-tests before GREEN.

The qualifier remains unprivileged and read-only. This repair grants no protected
filesystem apply, service/systemd mutation, credential/key/wallet access, signing,
transaction/payment/activation, treasury/liquidity, or funds authority.


## Protected publication-parent custody repair

The protected installer also treats `/opt` as part of the privileged publication
boundary. Fixed staging names are safe only while their parent cannot be renamed or
rewritten by the runtime UID.

Installer V4 now fails closed unless `/opt` and its ancestor chain are
non-symlink, root-owned, non-group/world-writable directories and the immediate
`/opt` publication root is exact mode `0755`. Before each create-only
`renameat2(..., RENAME_NOREPLACE)`, it opens `/opt` with
`O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC`, requires the retained descriptor to match
the authenticated parent identity, and revalidates that identity plus path custody
after publication.

This prevents an unprivileged stage-name swap from substituting attacker-controlled
content between staging and create-only publication. No additional host authority is
granted.


## Candidate special-file race repair

The installer accepts externally materialized native and selector candidate paths.
A regular-file `lstat()` followed by a blocking pathname open can otherwise race:
the candidate can be replaced by a FIFO or other special file before `open()`,
causing a plan/apply to hang before the retained-FD identity checks run.

Installer V4 now opens candidate paths with
`O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK`. Immediately after open and before
any read, the retained FD must still be a direct regular file, have exactly one
link, and have the exact accepted byte size. The retained FD generation comparison
also includes mode and link count before and after the read, and the visible path
must remain the same exact generation.

The source self-test explicitly proves that regular/single-link/exact-size metadata
is accepted while FIFO, multi-link, and wrong-size metadata are rejected before
candidate bytes are consumed. This repair grants no new install/payment/activation
authority.


## Privileged Python/source entry boundary

Installer V4 is root-capable, so source validation cannot begin after importing
checkout-shadowable Python modules from an untrusted invocation environment.

The installer now imports only built-in `sys` first and requires isolated Python
with safe-path semantics before importing `argparse`, `ctypes`, `json`,
`pathlib`, or other stdlib modules. Hosted proof places a hostile
checkout-local `argparse.py` next to a disposable installer copy and requires
non-isolated execution to HOLD before that module can execute.

For `--apply`, the installer additionally requires the executing checkout,
its ancestor chain, and every checkout/.git node to be root-owned and
non-group/world-writable, with symlinks confined inside the same trusted source
root. This intentionally rejects privileged apply directly from the ordinary
user-owned canonical checkout.

The in-script guard does not authenticate Python startup hooks that can execute
before script entry. A separately reviewed root-custodied launcher must still pin
the interpreter, require `-I -B`, sanitize the environment, authenticate the
landed installer/input generation, and only then enter this apply path.


## Privileged Git-metadata provenance closure

Filesystem ownership alone is not sufficient Git provenance for a root-capable
installer. A root-owned working tree can still delegate Git authority to metadata
or object storage outside that tree.

Before accepting Git-derived evidence, installer V4 now requires a self-contained
repository contract for every Git root used by the lifecycle:

- the installer checkout `ROOT`;
- immutable `SOURCE_RELEASE`;
- copied `SOURCE_STAGE` before its Git generation check; and
- installed `SOURCE_TARGET` before its Git generation check.

For each root, `.git` and `.git/objects` must be real canonical in-tree
directories. Gitfile and `commondir` indirection are rejected. The gate also
rejects `config.worktree`, shallow state, grafts, object alternates,
HTTP alternates, local-config include/includeIf delegation, `core.worktree`,
worktree-config/partial-clone extensions, and promisor/partial-clone remote state.

Only after those bytes and paths are checked directly does a dropped-UID Git probe
require:

- `rev-parse --git-dir` resolves exactly to the in-tree `.git`;
- `rev-parse --git-common-dir` resolves to that same directory;
- `rev-parse --show-toplevel` resolves exactly to the trusted source root; and
- `rev-parse --is-shallow-repository` is exactly `false`.

The direct metadata snapshot is repeated after those probes and must remain the
same generation. Replacement objects, hooks, fsmonitor, submodule recursion,
lazy fetch and user-controlled transports remain disabled by the existing Git
execution environment.

Source-only self-test adversaries cover gitfile, commondir, alternates,
HTTP-alternates, grafts, shallow state, config includes, `core.worktree`,
worktree-config extension and promisor state.

For the immutable source release, full root-owned/non-writable tree custody and
tree digest are established before its first Git generation check. Stage and
installed target likewise pass their role-specific tree custody/digest checks
before their first Git observations.

This closes only Git metadata/object provenance. It does not replace the separate
trusted root-custodied launcher required before privileged apply and grants no
merge, protected filesystem apply, payment, activation, or funds authority.


## ACL-aware runtime non-writability closure

Root ownership and safe mode bits are necessary but not sufficient custody evidence.
A named POSIX ACL can grant the runtime UID write authority while a path still
appears as `root:root 0755` or `0555`.

This generation adds effective runtime-identity checks in addition to the existing
ownership/mode and descriptor contracts:

- privileged installer audits run under exact UID/GID `1000:1000` with cleared
  supplementary groups through isolated `/usr/bin/python3 -I -B`;
- the privileged checkout and ancestor chain, every non-symlink checkout node,
  `/` + `/opt`, source/protected/staging tree nodes, and installed binary
  roots/leaves must all be non-writable to that runtime identity;
- qualifier V3 `--run` now fails closed unless real/effective UID and GID are
  exactly `1000:1000` and the supplemental-group set is empty; only under that exact
  identity may its `os.access(..., W_OK, effective_ids=True)` checks support installed
  generation authority for native/selector ancestors and exact ELF leaves;
- hosted proof explicitly demonstrates that mode bits with no group/world write are
  not by themselves an effective-writability proof, and statically binds both
  runtime-access implementations.

Candidate ELF inputs remain allowed to be user-controlled/writable input data; they
are never executed by the privileged installer and are reconstructed only from exact
retained-FD authenticated bytes.

This hardening grants no merge, protected filesystem apply, service/systemd,
credential/key/wallet, signing, transaction/payment/activation, treasury/liquidity,
or funds authority.


## ACL-audit ordering and descriptor-read closure

The root-capable installer does not read reviewed tree file contents until effective
runtime-identity non-writability is established.

For each source/protected/staging tree, V4 now uses a guarded two-pass contract:

1. require effective UID/GID 1000 non-writability and generation stability of the
   tree root before the first directory enumeration;
2. enumerate metadata only; before any discovered directory is queued for later
   descent, require that directory to be runtime-nonwritable and generation-stable;
3. after enumeration, repeat the aggregate directory non-writability and complete
   metadata-generation checks;
4. require effective runtime non-writability of every regular file;
5. revalidate the complete metadata generation again; and
6. hash regular files only through retained
   `O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK` descriptors with exact
   type/dev/ino/nlink/size/mtime/ctime binding, bounded EOF, and terminal visible
   generation revalidation.

Installed native/selector binary classification follows the same ordering: binary
root custody and effective non-writability are established first, the exact leaf is
then proven non-writable, and SHA-256 is computed from the retained no-follow,
nonblocking descriptor rather than a pathname reopen.

Source self-test includes regular-metadata -> FIFO and regular-metadata -> symlink
substitution adversaries. The FIFO case must fail without blocking and the symlink
case must fail without following or reading the external target.

This closes the pre-audit privileged pathname-read window without changing create-
only publication, accepted binary identities, service/systemd state, credentials,
payment/activation authority, or funds authority.

## Qualifier runtime-identity binding

Installed qualifier V3 may emit `installed_generation_evidence_authority=true` only
when it is executing as the reviewed runtime identity: real/effective UID 1000,
real/effective GID 1000, and an empty supplemental-group set. A different unprivileged
account is not equivalent evidence because effective ACL access can differ by UID,
primary GID, or supplemental groups.

The reviewed host-evidence launch context is equivalent to
`/usr/bin/setpriv --no-new-privs --reuid=1000 --regid=1000 --clear-groups`
followed by isolated `/usr/bin/python3 -I -B ... --run`. Source-plan and self-test
modes remain non-authoritative and host-independent. The source proof includes
wrong-UID, wrong-GID, and nonempty-supplemental-group adversaries.


## Root-side trusted-tool descriptor execution

A later exact-head manual review found that privileged read-only observation helpers
still reopened `/usr/bin/setpriv` and downstream Git/Python tools by pathname.
That was weaker than the retained-descriptor standard used for protected binaries:
a replaceable external tool path could change between validation and execution.

This generation removes the external Python/setpriv dependency from the ACL-aware
runtime writability audit. Root now forks a child, clears supplementary groups,
sets the exact runtime GID/UID, and performs effective-ID writability checks using
the already-loaded Python runtime and kernel syscalls.

Root-side Git observations now:

- authenticate the resolved setpriv and Git leaves plus every ancestor as root-owned,
  non-symlink, non-group/world-writable and runtime-UID non-writable;
- open both executables with `O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK`;
- hash and retain the exact executable generations;
- execute setpriv through `/proc/self/fd/<setpriv-fd>` and direct it to the retained
  `/proc/self/fd/<git-fd>` target with both FDs inherited; and
- revalidate retained FD identity, visible path identity, ancestor generation and
  SHA-256 after each observation.

The separately reviewed trusted root launcher remains required for Python startup
custody. This repair does not authorize merge, protected `/opt` apply, service or
systemd mutation, credentials, signing, transaction/payment/activation, treasury,
or funds movement.


The hosted source proof also performs a disposable visible-path swap: it retains an executable descriptor, replaces the visible pathname with an attacker script, and proves descriptor-path execution still runs the originally retained generation while the visible inode drift is detectable. This regression is non-privileged and source/CI-only.


## Qualifier trusted-tool and custody-script descriptor execution

A current-head manual review found that installed qualifier V3 still executed
`/usr/bin/git` and `/usr/bin/node` by pathname after binding itself to runtime
UID/GID 1000. Root-owned mode bits alone do not prove those tools are immutable to
that identity because named POSIX ACLs can grant write access. The reviewed custody
JavaScript was also hashed and later reopened by pathname.

Qualifier V3 now closes all three boundaries while remaining unprivileged/read-only:

- Git and Node resolve beneath root-owned, non-symlink, non-group/world-writable
  ancestor chains and every leaf/ancestor must be non-writable to the exact
  UID/GID 1000, empty-supplementary-group runtime identity;
- each tool is opened with `O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC`, hashed from the
  retained descriptor, executed through `/proc/self/fd/<n>`, and revalidated by
  retained FD, visible pathname, ancestor generation, and SHA-256 after execution;
- `canonical-producer-source-custody-v1.cjs` is likewise retained on a
  no-follow/nonblocking descriptor, Git-blob authenticated from those exact bytes,
  supplied to retained Node as `/proc/self/fd/<script-fd>`, and revalidated after
  the custody observation.

A runtime-writable trusted-tool or custody-script path therefore HOLDs before
installed-generation authority. This repair grants no service/systemd, credential,
signing, transaction/payment/activation, treasury/liquidity, or funds authority.


## Privileged source-custody traversal ordering

A current-head manual review found one residual P2 in the root-capable source-custody
scan. UID/GID/mode metadata was checked recursively, but the effective UID1000 ACL
write audit was batched only after traversal. A mode-safe root-owned directory with
a named ACL granting runtime write could therefore be replaced before a later root
`scandir()` or symlink resolution, causing privileged traversal of attacker-chosen
metadata before the eventual HOLD.

Installer V4 now establishes the custody barrier in traversal order:

- source root and every ancestor pass the exact runtime-UID non-writability audit
  before the first recursive scan;
- every real directory passes ACL-aware non-writability plus exact generation
  revalidation before it is queued or used as a future `scandir()` target;
- each directory generation is revalidated immediately after enumeration;
- symlink target resolution is deferred until all mutation-capable directories are
  behind the ACL barrier; and
- the original terminal whole-tree effective non-writability and generation census
  remains mandatory.

This is availability/custody hardening only; it grants no additional install,
service/systemd, credential, signing, transaction/payment/activation, treasury, or
funds authority.


## Active source-release ancestor custody barrier

A later privileged review found that the immutable release root itself was
ACL-audited before descent, but its parent chain
`/opt/void-node-live/releases -> /opt/void-node-live -> /opt -> /` was not
explicitly bound before root-side `resolve()`, tree enumeration and copy.

Installer V4 now establishes that ancestor barrier before the first privileged
source-release traversal. Every ancestor must be a non-symlink root-owned directory,
must not be group/world writable, and must be effectively non-writable to the exact
runtime UID/GID 1000 with cleared supplementary groups. The complete ancestor
generation snapshot is revalidated around source digest, source-generation
verification and protected-source copying.

This closes only the privileged traversal ordering/custody gap. It does not grant
merge, protected filesystem apply, service/systemd, credential/key/wallet, signing,
transaction/payment/activation, treasury/liquidity or funds authority.

## Post-merge Python first-import repair — October 20, 2026

The accepted V4 source in #3539 was merged as `main@fd8131500330d8f8d51caa8275db456338c0a878`.
The root-capable installer used a `from __future__ import annotations` directive
before its built-in `sys` isolation/safe-path guard. That directive emits a
runtime import of `__future__`. On a **non-isolated `python3 -S` invocation
from a writable checkout**, a sibling `__future__.py` could execute before
the installer emitted its otherwise-correct HOLD. This is a conditional
unsafe-invocation issue, **not evidence of host compromise**. It does not affect
the mandatory trusted root-custodied isolated launcher contract.

The repair removes the unnecessary future directive so the first executable
import is only built-in `sys`, and the isolation/safe-path guard runs before
any checkout-resolvable module import. The focused regression uses disposable
`-S -B` subprocesses: a deliberately restored unsafe future import must
execute the shadow-module fixture before HOLD, while the repaired installer
must HOLD with no marker. Existing isolated self-test/source-plan proofs and
all root source/Git/ACL/descriptor controls remain mandatory.

This source-only change does not perform protected `/opt` installation,
qualify the installed runtime, activate presale/WC, sign, broadcast transactions,
or authorize treasury/funds movements. **KEEP DRAFT/HOLD for exact-head CI and
independent review**; a separate post-landing operator gate is still required.


## Root-time observer privilege-drop closure — October 20, 2026

The trusted V7 root-launcher review identified one remaining privileged execution
closure in landed installer V4: when V4 runs as root,
`_run_runtime_observer_tool()` executed host-dynamic `/usr/bin/setpriv` before
the runtime UID/GID drop. Authenticating only the setpriv inode/path does not
authenticate its PT_INTERP/shared-library closure, so writable loader/DSO bytes
could execute as root before the drop.

This source generation removes `/usr/bin/setpriv` from V4 entirely. The
already-authenticated isolated Python process now forks the observer subprocess
and performs the privilege transition in its pre-exec boundary:

1. set `PR_SET_NO_NEW_PRIVS=1`;
2. clear supplementary groups;
3. set runtime GID 1000;
4. set runtime UID 1000;
5. verify real/effective UID/GID and empty supplementary groups;
6. only then execute the retained observer-tool descriptor.

The root parent still authenticates and terminally revalidates the observer tool
descriptor. Any pre-exec, timeout, or execution failure becomes
`runtime_observer_execution_failed` HOLD. The already-runtime-identity path
also requires real/effective UID/GID 1000 and empty supplementary groups.

Focused CI includes an ephemeral root fixture that executes `/usr/bin/cat`
through this boundary and verifies from `/proc/self/status` that all UID/GID
slots are 1000, supplementary groups are empty, and `NoNewPrivs: 1` before the
dynamic observer tool runs.

This is source/CI proof only. It does not install or execute V4 on Precision,
enable fs-verity, install the trusted launcher, perform protected /opt apply,
mutate services, access credentials/signers, accept payments, activate
presale/WC, or move treasury/liquidity/funds.
