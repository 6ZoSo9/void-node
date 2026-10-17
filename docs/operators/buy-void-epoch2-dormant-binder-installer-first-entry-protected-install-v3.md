# Buy VOID Epoch-2 dormant first-entry protected installer V3

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V3`.

Status: **source/test/CI-only installer repair. This source change performs no
Precision install or activation.**

## Why this targeted successor is needed

V3 succeeds the merged inner V2 source at Git blob
`69a018c0eccedf3782055c56725579d02463b05e` without changing that predecessor.
It repairs three gaps in V2's Git reads:

| V2 gap | V3 requirement |
| --- | --- |
| Reading a live split index can refresh its shared-index timestamp while returning a clean result | Git receives a sealed private index view; unsupported split indexes return HOLD without touching source metadata |
| A recursive tree listing can trust altered object content under an unchanged object filename | Commit and complete tree hierarchy identities are authenticated before their entries become source evidence |
| A file can change after its individual hash check but before the checkout result is accepted | Earlier file and directory generations are retained and rechecked before the complete snapshot is accepted |

V3 retains canonical V2's descriptor-relative cleanup, publication-aware
`entrypoint()` handler, and sealed-source startup behavior. In particular, it
has no unused checkout-root derivation from `__file__`: the complete source must
start successfully through a sealed `/proc/self/fd/N` descriptor in inert
`--source-plan` mode.

The native **protected-install bootstrap V4** authenticates this V3 Python child.
Canonical bootstrap V3 remains bound to its accepted V2 child. A new bootstrap
candidate, acceptance lock, and materializer must bind the V4 source generation
before it can become an operator entrypoint. Existing source and acceptance
artifacts keep their original meanings.

The accepted installed payload namespace, payload identities, and policy schema
remain those of the canonical predecessor. Versioning the installer does not
rename or alter those accepted payloads.

## Accepted payloads and source bindings

The accepted first-entry lock remains:

`voidbuye2dormantfirstentrylock1_bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85`.

The accepted launcher candidate remains:

`voidbuye2dormantfirstentrycand1_b7109c847373114e2d5e044928ecc4e30c65ef446880d70d9ec57d5853ad3736`.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| First-entry launcher | 731072 | `4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a` |
| Retained native candidate | 726976 | `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c` |
| Runtime protected installer V2 | 57255 | `602d7fbc256d346b3f80adc93e3b20a39403be5158e944e23456851764a954b9` |

The supplied exact `main` generation must contain the accepted lock at Git blob
`f8ff6fbb855aecafc329cd60622cf3af782745a3` and the runtime protected installer at
Git blob `f3d6b1559be7490303cf36338c4bfa38fdaa390a`, at their fixed source paths.
Finding an otherwise valid blob elsewhere in the object store is insufficient.
The runtime installer also has to match the byte count and SHA-256 above.

## Git boundary and clean checkout contract

The fixed checkout is `/home/zoso/dev/void-node`. The operator supplies its
expected full lowercase 40-hex commit ID. The branch must be `main`, its resolved
head must match that ID, and the index and worktree must match the authenticated
commit tree.

The installer reads Git metadata as bounded ordinary file data and constructs a
private temporary metadata view. Git receives an explicit private Git directory,
a sealed index snapshot, controlled local object inputs, and a closed
environment. The live repository's configuration and configuration includes are
not loaded. The private view has no remote configuration or alternate object
store. Both protocol denial and lazy-fetch denial are explicit. Git hooks,
fsmonitor, automatic maintenance, and optional index writes are disabled in the
private view.

Each Git child is bounded to at most 2 GiB of address space and 60 CPU seconds,
and preserves a stricter inherited resource limit. These limits apply in the
child before Git executes; they do not change the parent installer limits.
Metadata counts, input/output bytes, and command/witness time are also bounded.

Only raw object and index plumbing is used. Commit, tree, and selected source
blob identities are authenticated. For checkout cleanliness, the installer
hashes the actual tracked file bytes directly and checks Git executable modes
using the owner-executable bit;
tracked leaf symlinks are checked by their link text. Git clean filters,
textconv, and line-ending conversion do not normalize differences away.
Consequently a checkout that is clean only after a conversion still returns
HOLD. Ordinary `.gitignore` and `.git/info/exclude` patterns may exclude inert
untracked files; configuration-based ignore files do not extend that policy.

Unsupported metadata layouts return HOLD. These include redirected `.git`
metadata, linked worktrees, alternates, shallow metadata, submodules, split
indexes, sparse indexes, skip-worktree and assume-unchanged entries. Source
directory traversal through symlinks and unsupported object or file generations
also fail closed. The installer does not fetch, repair, refresh, repack, or
rewrite the source repository to make a check pass.

## Plan mode and temporary writes

Plan mode emits its authority facts **before** collecting host inputs or creating
temporary Git metadata. Its scope is explicit:

- temporary private metadata writes are possible;
- source repository mutation is false;
- protected installation mutation is false;
- repository configuration loading and source object fetch are false.

The final plan receipt retains the separate false authority fields for
credential, signing, payment, activation, and funds actions. Planning performs
no service action or protected-payload execution.

Plan mode therefore reports `read_only=false`; it does not claim that temporary
files were never written. Its temporary view is removed before a successful
plan receipt. Source checks retain and recheck input generations, and temporary
paths or descriptor numbers are not part of the operation identity.

IO and resource failures return HOLD, and a failed private-view cleanup also
returns HOLD. A failed plan receipt reports temporary mutation and cleanup as
unknown instead of claiming that no temporary writes occurred. Repository
configuration diagnostics are not echoed into the receipt.

The operation body uses schema
`void_buy_void_epoch2_dormant_binder_installer_first_entry_install_plan_v3`,
version `3`, and the plan ID prefix:

`voidbuye2dormantfirstentryinstall3_<64hex>`.

The plan binds accepted candidates, exact checkout, trusted Git and Python
generations, policy bytes, protected-root state, and the private Git boundary.
An apply invocation must reproduce the same plan ID.

## Protected namespace and publication

The final root remains:

`/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1`.

| Relative path under the final root | Required mode |
| --- | --- |
| `bin/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1` | root:root `0555` |
| `input/void_buy_void_epoch2_dormant_binder_native_candidate_v2` | root:root `0444` |
| `source/ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py` | root:root `0444` |
| `policy-v1.conf` | root:root `0444` |

Directories remain root:root `0755`, with exact direct-entry sets. The policy
schema remains
`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1`
and binds the verified Python SHA-256 and byte count.

Apply checks the exact V3 confirmation token before consulting root privilege,
candidate files, or protected-root state:

`INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V3_CREATE_ONLY`.

The authorized apply still requires root, isolated Python, the expected head,
and the operation-bound plan ID. It creates the fixed complete stage, fsyncs its
files and directories, revalidates checkout/lock/Python and staged bytes, then
publishes with `renameat2(RENAME_NOREPLACE)`. An existing final root is never
overwritten.

## Failure receipts

Before publication, cleanup is attempted only for a stage created by the current
invocation. It uses the retained parent descriptor, recorded stage device and
inode, and retained child-directory descriptors. It preflights the fixed entry
sets before deletion and rejects unknown entries, symlinks, special files, or
hardlinked files. A replacement or unidentified stage remains untouched. These
are the canonical V2 cleanup rules, retained by V3.

After publication, failure reports `publication=true` and
`publication_state=published_needs_inspection`. Publication is not rolled back
or reclassified as absent. The final receipt separately records parent fsync,
final verification, closing the install parent, original failure, and any close
failure. In particular:

- a successful publication and verification followed by a close failure still
  reports publication and verification as true;
- a verification failure followed by a close failure retains both failures;
- a close failure cannot fall into the generic prepublication handler and print
  `publication=false`.

## Source proof and preserved lineage

The V3 proof imports only the exact canonical terminal fixture at Git blob
`7b2ddaeddf844d98aa4eb7006ee371ea6a455f57`, then points that fixture at the V3
source. It retains all 12 canonical terminal scenarios, including stage
substitution, unexpected entries, child symlinks, an unidentified stage,
postpublication parent-fsync failure, and paired original/close failures.
The canonical fixture file is not rewritten.

Additional checks cover actual sealed-memfd source startup, confirmation before
input access, occupied-target `RENAME_NOREPLACE`, V3 plan identity and authority
ordering, loose/packed object stores and packed refs, owner-executable modes,
index flags, missing objects, exact source-path membership, nested-tree
corruption, and earlier tracked-file drift. Ordinary read fixtures compare source
bytes and metadata, including shared-index mtime. The earlier-file-drift case
explicitly injects a worktree change and requires the installer to detect it.

Repository configuration is inert test data. One fixture sets an unsupported
repository-format value while its private metadata view remains valid; every
configured helper path is nonexistent. No helper program is supplied or
executed. Resource-limit assertions use mocks to check clamping without changing
parent limits; real Git fixture children also use the bounded execution path.

The proof binds frozen V1 and canonical V2 child source, the canonical terminal
fixture, and unchanged accepted lock/runtime inputs. It uses disposable local
repositories and temporary installation fixtures with simulated admission and
inert payload bytes. A fixture apply is not evidence of a Precision install.

## Separate outer-entry and operational work

This targeted successor does not repair Git reads in the already merged outer
bootstrap installer:

`ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v3.py`

at blob `21860bce2c1589cead5c0789342871049c2d6055`.
That tool's live-repository Git boundary remains separate work. Authenticating
inner V3 from native bootstrap V4 therefore does not establish complete host-entry
closure. This source proof also does not establish a complete pre-child manifest
or a private-parent proof for the native entrypoint.

Source proof, merge, native candidate acceptance, protected bootstrap
installation, and installed qualification remain distinct evidence states.
After the applicable entry and acceptance gates are closed, an authorized GREEN
first-entry installation is followed by installed read-only qualification of the
complete protected generation. This installer executes no launcher, native
candidate, or dormant binder and grants no payment or market activation.

**PROTECT THE CORE.**
