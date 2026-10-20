# Buy VOID Epoch-2 V6R3 terminal runtime census manifest substrate V1

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_TERMINAL_RUNTIME_CENSUS_MANIFEST_V1`.

Status: **source/test/CI manifest substrate only**. Production host census execution is
hard-disabled in this candidate.

## Bound upstream gates

```text
runtime_closure_contract_blob=c70dfd9da29c75b348a3619f6df7329381e939cf
runtime_closure_contract_id=voidbuye2v6r3pyruntimecontract1_cdb98f511f04a3c798200e304481ec14d94373fdbdf6ec30cf88b0e281b0eb4f

freshness_gate_blob=9657fff243e44135e1f992b1ef5b8e0d977b8b65
freshness_gate_id=voidbuye2v6r3pyclosurefreshness1_66f0fc4c608ab2874e75620e0e4037c9a672369fbd460b12a35a0b0600398a66
```

The corrected parent records the canonical sealed-Python `fexecve`
`pre_dumpable=0 → post_dumpable=1` diagnostic. The freshness gate is explicitly
pre-exec only.

## Implemented substrate

The source candidate implements reusable, bounded manifest primitives for a future
source-authenticated observer:

- no-follow/nonblocking, generation-stable SHA-256 of regular files;
- deterministic directory inventory without following symlinks;
- symlink text plus resolved-target facts, with **every traversal hop** confined
  to the inventory root and a hard 40-symlink hop limit;
- explicit absent-path records bound to their nearest existing parent;
- rejection of FIFOs/devices/sockets and other special files;
- a **streaming** 100,000-entry discovery budget, including child directories
  already queued but not yet visited; each `scandir` iterator stops on the
  first over-budget entry **before** sorting, stat-ing, or queuing it;
- 512 MiB/file and 16 MiB/report bounds;
- exact accessed-path subset validation;
- canonical JSON terminal-manifest equality;
- explicit refusal to promote post-exec dumpability to verified/accepted.

The self-test uses only a temporary synthetic tree. It exercises content drift, a
materialized declared absence, symlink identity, special-file rejection, and a false
post-exec dumpability promotion. Additional adversaries set the entry budget to
two for a three-directory fan-out, and inject an effectively endless
`scandir` iterator that fails if the collector asks for a third entry.
The test proves early termination; it does not enumerate or mutate host files.

## Deliberate execution HOLD

This candidate contains:

```text
HOST_EXECUTION_ENABLED=False
```

Its CLI exposes only `--self-test` and `--source-plan`. There is no `--run`,
`--host-census`, installer, apply, service, credential, signer, RPC, payment, or
activation mode. The proof rejects the introduction of subprocess execution, `sudo`,
`/opt` paths, or privileged/destructive commands.

The substrate does **not** yet establish the Python/Git ELF resolution, exact import
probe, mapped-object/file-access observation, or protected first entry needed for a
real Precision report. Those belong to the next source-authenticated host-observer
adapter.

## Authority

```text
host_execution_enabled=false
host_census_authorized=false
protected_install_authorized=false
post_exec_dumpability_accepted=false
host_plan_authorized=false
credential_access=false
private_key_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
funds_movement=false
```

Next gate: `source_authenticated_host_observer_adapter`.

PROTECT THE CORE.

## Bounded enumeration repair — source-only child

In the predecessor, `sorted(os.scandir(current))` eagerly materialized the full
directory before testing `len(objects)>MAX_TREE_ENTRIES`. Because pending
directories were not counted in `objects`, a wide all-directory fan-out could
also queue an unbounded number of paths. This child maintains an independent
discovered-entry counter, initialized with the root, and stops consuming the
iterator at the first entry beyond the cap. Sorting is performed only on the
bounded batch.

A successful synthetic test demonstrates the resource bound **inside this
fixture implementation**. It does not prove future protected-host ancestor
ACL custody, descriptor-bound enumeration, symlink race closure, live
Python/ELF runtime resolution, or any host census authority. Keep those
separate, reviewed gates; this repair never enables host execution.

## Intermediate-symlink escape repair — source-only successor

The prior `symlink_record()` called `os.path.realpath()` and checked only that
the **final** target was within the inventory root. A symlink could point
outside the root to another link that pointed back inside, thus traversing an
out-of-root intermediate path while still satisfying the final-target check.

The repaired source walks each component and each `readlink()` hop itself.
An absolute target must start within the root, a relative `..` must not
climb above it, and a chain is rejected once more than 40 symlinks are
encountered. Metadata is rechecked after reading each symlink. Nonexistent
targets contained within the root remain explicit `resolved_exists=false`
evidence. The disposable fixture proves outside-then-return and cyclic-link
paths HOLD; an ordinary internal link remains accepted.

**This does not establish host-grade path custody.** The synthetic scanner
still uses path-based `lstat` and `scandir`, so it does not defend against
a runtime-writable ancestor being swapped concurrently. Any future protected
host execution requires separate root/ACL custody, retained directory-FD
observation, and terminal generation binding. Production host mode remains
hard-disabled and all authority flags remain false.

## Missing ancestor cancellation cannot create a symlink target

A further fixture-only case was found in the hop-walking resolver:
`link -> missing-parent/../existing-file`. Although `existing-file` is a
real regular file, the Linux kernel cannot traverse the nonexistent parent,
so this symlink is **dangling** (the target returns `ENOENT`). Merely
folding `..` after a missing hop and then `lstat`-ing the resulting
existing file would misreport `resolved_exists=true` and attach that
file's hash to a link whose target cannot be reached.

The resolver keeps its existing Path return type for compatibility with
other census helpers, while an optional output parameter records the first
missing component for the symlink reporter. Attempting to cancel a missing component via `..`
is a structured `Hold("symlink_missing_component_parent_reentry:...")`,
never a present-target report. For an ordinary contained dangling link,
`resolved_exists=false` is emitted without probing a lexically rejoined
existing file. The first missing component is rechecked at the terminal
boundary so materialization during the census also fails closed.

The synthetic self-test constructs both a missing-parent reentry link
(which must HOLD) and a conventional contained dangling link (which must
remain explicitly absent). No protected host paths are inspected.

```text
source_git_blob=8e4949bc8e87987dec85319f9b7b7526763aee3d
proof_git_blob=5ceebb9cf4d19c067cbc8cb8b4d5aff30a8c831e
HOST_EXECUTION_ENABLED=False
host_census_authorized=false
host_plan_authorized=false
```

This is a **manifest-evidence correctness** repair only. The future live
source-authenticated host observer must separately enforce root/ACL custody,
retained directory descriptors and terminal generation identity. Independent
review remains outstanding; no host plan, installer, credential, payment,
public presale/WC activation or funds action is authorized.

## Negative-path and sys.path authority (source-only successor)

The earlier `absence_record()` checked `target.exists()` and located a
nearest parent by ordinary pathnames without validating intermediate symlinks.
A direct call could therefore claim that a file is absent **outside** the
inventory root when `root/alias` points to an outside directory containing a
real child. The existing root-tree inventory happens to reject outside links
when fully scanned first, but the standalone absence helper was not safe for
future reuse by a host adapter.

The repaired helper now checks each component with the existing bounded
`_contained_resolve()` **before** any pathname-based existence query. It
rejects outside hops, noncanonical negative paths, and even internal symlink
aliases on a supposedly missing-path chain (so the nearest parent is
unambiguous). An absence record is still **not** proof of live host custody:
directory generations and effective ACL must be checked by a separate
source-authenticated host collector.

`build_manifest()` also now rejects a `sys.path` entry which is not
represented as either an actually inventoried directory/regular file or an
**explicit** missing-path record. Symlink entries cannot become import
authority merely because they are included as a manifest object. `sys.path`
and the logical display root must use canonical absolute POSIX spellings;
the collector rejects redundant `..`, `.`, duplicate separators and
trailing slashes. Existing ordered root entries and explicitly absent roots
still qualify in the disposable synthetic fixture.

These are conservative source-only coverage checks. They do **not** enumerate
real Python/Git import roots on Precision, qualify root/ACL ancestry, or
provide complete descriptor-based host path confinement. `HOST_EXECUTION_ENABLED`
remains `False`, with no new live observer, installer, signer, transaction,
payment or presale mode.
