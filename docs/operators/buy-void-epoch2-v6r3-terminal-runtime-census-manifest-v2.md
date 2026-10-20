# VOID Epoch-2 V6R3 terminal Python/Git census manifest — V2

Status: **source/test/CI-only substrate; not a host census or runtime authorization**.

## Why V2 is separate

The reviewed V1 manifest collector lineage was bound to the historical V1 binary and Python runtime contracts. The composed native launcher changed through capability and output-FD hardening; its current repository-only static binary identity is a **different, content-addressed V2 lock**. It would be unsafe to claim the old V1 host census has authority for that executable by merely ignoring its accepted source pins.

This successor is deliberately **four new ADD-only paths** stacked on the Git-aware V2 temporal-closure Draft #3598. It preserves the V1 source and historical green checks untouched. Its source is derived from the exact V1 fixture-only substrate source Git blob `05458587b5743da09ed2f752e971ca67938cceac` (#3597), including the fixes for:

- streaming directory entry count (queued directories count; no eager `sorted(os.scandir())`);
- bounded per-file reads, report size, path-count and encoded input-byte budgets **before any traversal**;
- symlink-hop confinement, missing/.. reentry and dangling-link truth;
- confined nearest-parent absence claims, noncanonical path rejection and ordered `sys.path` inventory/explicit absence requirements;
- terminal directory/symlink generations, accessed-file subset checks and rejection of special files.

These are source/fixture properties only, not a complete implementation of safe production scanning.

The V2 source additionally carries the later standalone V1 [#3601](https://github.com/6ZoSo9/void-node/pull/3601) **non-POSIX identity** guard: `chr(0)` in the logical display root, sys.path and standalone declared absences is not a valid filesystem authority. The input-size budget already rejects NUL in the three entry arrays; separate canonical checks reject noncanonical accessed paths, and the standalone `absence_record()` now rejects NUL before any filesystem query. Seven disposable negative fixtures establish these distinctions; these are not host path-custody evidence.

## Exact V2 source trust generation

```text
v2_parent=#3598
v2_parent_head=fe974482fc1cbe75fcbbe3ad7aa5dd0466f72fc7
v2_contract_blob=c56361ecaccb916a79591c016200b8dc02f5ca54
v2_contract_id=voidbuye2v6r3pyruntimecontract2_6fe0f7e5779d998659ffb67d64832e9ce5babac92584c88f43c1400cef3e4e50
v2_freshness_blob=864c04c578d0abdb6e8c01d3f9dd7eda6ceff2ac
v2_freshness_id=voidbuye2v6r3pyclosurefreshness2_5840ca9aaecbbef2b50783fe05d364161e66b19a79c793b71dd80d18d243c54b
v2_native_binary_lock_blob=14a3ff2eca0583d1355dc8b75bd54cc55115d946
v2_native_binary_lock_id=voidbuye2v6r3planfirstentrybinlock2_b5e1bbca28ed7aad579ac7f37a7575ed90eadd44f73d24edac79df3cc74664c1
v2_native_binary_sha256=b3043169c466ab96a953d00fedd960817e982bf45897ac6b3259baaaeb0e81dd
v1_census_substrate_source_blob=05458587b5743da09ed2f752e971ca67938cceac
v2_census_substrate_source_blob=fb31838cc28303a3da9bd6e238edad704bffe3e2
```

The source proof additionally requires the current #3598 Git-specific loader, helper, config and accepted runtime-access subset constraints, never treating a generic Python-file inventory as sufficient Git closure evidence. The V2 manifest itself additionally records the exact V2 binary lock ID and **keeps**
`installed_first_entry_binary_identity_proven=false`,
`git_subprocess_runtime_closure_accepted=false`,
`post_exec_dumpability_verified=false`, and
`post_exec_dumpability_accepted=false`.
The terminal-equality checker rejects attempts to upgrade any of those claims. Content-addressed source identities do not create host authority.

## Source/CI tests and hard limits

The dedicated workflow checks exact checkout HEAD; isolated Python syntax; the source proof's SHA-1 Git blob binding to the **new V2 census source**, source identity of both V2 contract/freshness JSON and V2 native lock; AST-verified `HOST_EXECUTION_ENABLED=False`; and the full disposable fixture covering path budget, symlink escapes/dangling links, declared absences, import-path custody, special files, and report drift. The proof runs with isolated Python `-I -B -S`, sanitized environment, no real protected host data or credentials.

The current source exposes only `--self-test` and `--source-plan`. It has no host census command, no installed entry, and no supported route to force it on. No previous V1 proof, CI, or lock applies transitively to this exact V2 head.

## Explicit future HOLDs

A production-capable census **does not exist** in this PR. Before any such adapter is permitted, independently review authenticated static first-entry startup; directory-FD rooted, race-resistant traversal with root/ACL custody; host-specific Python/Git ELF loader/transitive dependency closure and import/file/map observations; current accepted manifest/absence rechecks under runtime UID/GID; and actual post-`fexecve` nondumpability or acceptable external isolation. A separate installer and operation-scoped read-only host plan must be independently authorized. Passing source CI is not a substitute.

```text
HOST_EXECUTION_ENABLED=False
host_census_authorized=false
protected_install_authorized=false
installed_first_entry_binary_identity_proven=false
git_subprocess_runtime_closure_accepted=false
post_exec_dumpability_accepted=false
host_plan_authorized=false
credential_access=false
private_key_access=false
signing=false
transaction=false
rpc_call=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

**PROTECT THE CORE.**

## Canonical double-slash display-root policy

POSIX permits implementation-defined treatment of precisely two leading
slashes. Python preserves that spelling under
`posixpath.normpath("//fixture")`. The previous standalone absence
helper would accept `//fixture/etc/ghost` as a canonical display identity,
even though such a path spelling cannot be assumed portable or unambiguous.

The V2 substrate now rejects `display_root.startswith("//")` in both
`build_manifest()` and standalone `absence_record()` before inventory or
filesystem lookup. Two disposable adversaries assert specific HOLD reasons;
the non-POSIX input suite now has nine cases. The source proof pins blob
`8c8516a63d8890bd7103e0c868a3e88776f1e3e8`. This is still fixture-only and does not certify
an installed host observer.



## Aggregate display-name output budget — current V2 census successor

The logical `display_root` is an independent caller-supplied prefix on **every**
object key. Although the three import/absence/access arrays have pre-traversal
resource limits, a giant root or many repeated output keys can allocate
substantial intermediate memory before the final 16 MiB JSON report cap.

This source-only successor combines the stronger cumulative output budget from
the superseded-path #3603 approach with the **current #3600 double-slash and
nine non-POSIX path fixture** generation. It does not replace any original
V2 Python/Git/binary identities.

`require_display_root()` bounds root spelling to a canonical absolute POSIX
path, no leading // or embedded NUL, strictly encodable UTF-8 and no more than
4,096 UTF-8 bytes. It is invoked at the start of `collect_tree()` and
`build_manifest()`. `collect_tree()` counts all discovered child display
path UTF-8 bytes (and the root once) against 16 MiB **before leaf stat,
hashing or queuing a child**. Standalone `absence_record()` validates the
root and full displayed absence path with the same size/encoding barrier
before inspecting any filesystem state.

Disposable tests require HOLD for oversized ASCII and multibyte roots,
unencodable Unicode, double-leading slash, overlong/unencodable direct
absence names and an injected tiny aggregate output-name budget. The
original nine non-POSIX path regression fixtures remain. No large
collections or protected host data are used.

```text
parent_pr=3600
parent_head=8a6b15a0c4e73fc9f3f6a1edc991e76ae34ded14
new_source_blob=23e975df97f6cd02b1c1f3ce6a83ab02334468b2
HOST_EXECUTION_ENABLED=False
host_census_authorized=false
host_plan_authorized=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

These limits qualify only source/fixture behavior, **not** root/ACL-safe
retained-FD host traversal, runtime Python/Git loader dependencies,
post-`fexecve` process isolation, independent security review or payment
readiness.

**PROTECT THE CORE.**


### Per-key display-path limit

In addition to the aggregate 16 MiB output-name cap, every generated display
path (including a symlink's resolved logical target) must fit within
4096 strict UTF-8 bytes. A valid root near the limit can still create a
child name that exceeds this bound; an isolated fixture now requires
`Hold("manifest_display_path_length_exceeded")` before any leaf stat/hash.

Exact updated source Git blob: `78afee78387d50e9144d5739cabfd33664492aa5`. Fresh source/test CI is
required on this generation. Host census, installed runtime, signing, payment
and funds authorities remain disabled.

**PROTECT THE CORE.**

## Scan-time output-name budgeting — fixture-only follow-up

The previous V2 candidate charged the 16 MiB cumulative displayed-name budget
while processing the **sorted** `entries` list. A wide directory's complete
`os.scandir` result could therefore be buffered before the name budget was
evaluated, even though the entry-count cap remained in place.

The corrected source charges the full rendered child display name **within**
the `scandir` iteration and before `entries.append`, sorting, `stat`,
hashing or queueing that child. The counted name is not charged again during
subsequent sorted processing. An injected synthetic iterator raises if a
second entry is requested after the first entry already exceeds a tiny name
budget. The expected result is
`Hold("manifest_display_path_budget_exceeded")` with exactly one consumed
entry. Original entry-count sentinel tests now return a named dummy entry.

These tests bound displayed-name work in this disposable Python fixture,
not peak memory from Python objects, protected-host ancestry, descriptor-
relative traversal or an actual terminal Python/Git loader observation.
Runtime, signer, payment, presale and funds authorities remain disabled.

## Symlink-record variable string resource bound — source-only successor

The cumulative output-name budget from #3605 charged each inventory object
key, but a symlink record also contains **`target_text`** and
**`resolved_display_path`**. Many symlinks could store these additional
variable-length strings without counting them against the 16 MiB
pre-materialization budget. The final canonical-report limit would reject
only **after** allocating the records.

This successor counts the strict UTF-8 byte lengths of both symlink fields
against the *same* `display_budget` before publishing the record. An
over-budget record HOLDS as `manifest_display_path_budget_exceeded`;
an unencodable field HOLDS as
`manifest_symlink_record_encoding_invalid`.

The disposable negative proof computes a small inventory's exact object-key
byte total, then demonstrates that this **key-only** budget must HOLD.
A positive proof allows precisely the object-key bytes plus the recorded
symlink-string bytes and requires an identical inventory.

The original 100,000-entry streaming census limit, 4096-byte individual
display-path limit, V2 Git-aware contract and launch-authority restrictions
are unchanged. This is *not* a strict total process-memory bound or a
real host-observer qualification. Metadata/dictionary overhead and other
serialized fields remain separate limits requiring review before a future
production collector exists.

```text
HOST_EXECUTION_ENABLED=False
host_census_authorized=false
protected_install_authorized=false
host_plan_authorized=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

PROTECT THE CORE.



## Aggregate file-hash read/I/O budget — new source-only descendant

The prior collector bounded **each** regular input file to 512 MiB and bounded
display-name/report bytes, but up to 100,000 regular files (or symlinks
which repeatedly resolve to the same large regular target) could still
trigger a vastly larger cumulative amount of read-and-hash I/O before a
small final JSON report would be rejected. This is a future protected
host-observer **availability bound**, not an observed attack or existing
authorized host census.

One source-only `_HashReadBudget` is now shared by the entire
`collect_tree()` traversal: ordinary `stable_regular()` files and every
`symlink_record()` resolved regular-file digest charge their full size
**before opening and reading**. The default synthetic ceiling is 8 GiB,
bounded by `MAX_TOTAL_HASH_BYTES`; no caller can request a higher value
or a negative/boolean budget. The exact number remains a *source fixture
policy*, not a claim that 8 GiB is sufficient for a particular approved
production Python/Git root. Host acceptance must separately choose and
review that limit.

A disposable fixture proves that a budget sufficient for all unique regular
files but not their symlink rehashes HOLDS. The combined regular+symlink
budget reproduces the same positive inventory. An injected `os.open`
sentinel proves an exhausted budget rejects **before** the next regular
file open; invalid budget values are separately rejected. No large
allocations or privileged filesystem operations are used.

The preceding 16 MiB aggregate display-name/string and 4096-byte
per-logical-path bounds, stable regular generation checks, symlink-hop
confinement, V2 contract/binary lock and explicitly false installed/host/
payment authority remain unchanged.

```text
parent_pr=3607
parent_head=2d68d5a928feeac66e043ce156770f6f858ef2d8
repaired_source_git_blob=bb76f730d63250e658831f44baf307663bbb2c6b
MAX_TOTAL_HASH_BYTES=8589934592
HOST_EXECUTION_ENABLED=False
host_census_authorized=false
host_plan_authorized=false
protected_install_authorized=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

This is source/test/CI only. A production collector also needs validated
root/ACL/directory-FD custody, complete runtime Python/Git loader/import/
helper observation, terminal generation checks, post-`fexecve` isolation,
distinct independent security review and installation qualification.

**PROTECT THE CORE.**


## Combined canonical record-byte and hash-read limits — source-only

Parallel Draft #3608 identified another resource dimension: raw display-name
and symlink-text budgets omit canonical JSON escaping of object metadata.
One control byte in a Linux symlink target can expand to six ASCII bytes
under `ensure_ascii=True`.

This composed #3609 source generation bounds **both** aggregate regular and
symlink-target hashing (charged before file open) **and** canonical record
serialization (charged before object insertion). `record_budget` is a
strict bounded 1–16 MiB integer. Each `{display_path:record}` JSON pair
is measured, including metadata keys and escaped symlink strings, before
admission to the inventory. Synthetic fixtures require the exact serialized
sum to pass and one byte less to HOLD, including a contained control-character
symlink target. Invalid record budgets fail closed.

```text
census_source_git_blob=4bbb5d2296649893eba1ddeef71de2655b70709a
parent_pr=3607
MAX_TOTAL_HASH_BYTES=8589934592
MAX_REPORT_BYTES=16777216
HOST_EXECUTION_ENABLED=False
host_census_authorized=false
host_plan_authorized=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

The #3608 sibling remains historic until superseded; never accept two
divergent manifests interchangeably. This is a synthetic source-only
resource limit, not a bound on all Python object overhead or proof of a
real protected-host census, Python/Git/loader closure, post-exec isolation,
installed first entry, independent review, or customer-payment authority.

PROTECT THE CORE.


## Canonical declared-absence records — combined V2 source

A declared **missing** pathname also has a canonical JSON key, parent
metadata and potentially control characters requiring JSON escaping. These
bytes must be charged against the *same* 16 MiB record budget as regular,
directory and symlink objects, not merely the output-name budget.

This source generation now passes `record_budget` into the source inventory,
recalculates the accepted object's exact conservative canonical byte count,
then charges `{declared_absent_path: absence_evidence}` for each declared
absence **before inserting it into the absence map**. A one-byte-short
budget HOLDS with `manifest_absence_record_budget_exceeded`, and a
disposable control-character missing-path fixture proves escaped JSON names
are counted. The shared 8 GiB ordinary/symlink file-read budget still
applies, including pre-open exhaustion rejection.

```text
combined_source_blob=4bbb5d2296649893eba1ddeef71de2655b70709a
HOST_EXECUTION_ENABLED=False
host_census_authorized=false
protected_install_authorized=false
payment_acceptance=false
funds_movement=false
```

The historical sibling #3608 is not automatically accepted or transitive
CI evidence; this exact combined source/proof generation requires new
focused/full Actions and a genuinely independent reviewer. No installed
host observer, privileged tree scan, post-`fexecve` isolation, wallet,
signer, customer payments or live presale authority follows.

PROTECT THE CORE.


## Exact cumulative hash limit under concurrent file growth

The source collector's earlier `stable_regular()` charged the original
regular-file `st_size` against the shared hash budget, then **always**
called `os.read(fd, 1)` to detect a file that grew. If the budget was
already exhausted, that terminal probe could consume a byte beyond the
claimed hard cumulative I/O ceiling before raising `regular_grew`.

This source-only successor reserves **one extra budget byte before issuing
the growth probe** whenever any allowance remains. At exact exhaustion,
it does not issue another read; it checks the terminal opened descriptor
and visible file generation, including size growth, and fails closed if
the expected generation changed. EOF attempts are conservatively charged
so the caller's budget cannot be exceeded even if an unexpected byte is
returned. This does not weaken the existing `st_size`-before-open charge
or stable visible-generation checks.

Disposable adversaries cover: a file that succeeds under an exact-sized
budget without a second `os.read`; a file that **grows immediately after
its initially charged read** and is rejected without a terminal growth read
at exhaustion; and a positive-budget path that charges the spare probe
byte before calling `os.read(fd,1)`. Tests monkeypatch only the temporary
fixture's in-process `os.read` and restore it afterwards, with no protected
host execution or large allocations.

```text
parent_pr=3609
parent_head=50f57c88f86b68e3cba98a04441f51957c3aaa4b
new_source_git_blob=7a9074709c67cce7c40d2a39ac9153a60bb8dd33
HOST_EXECUTION_ENABLED=False
host_census_authorized=false
host_plan_authorized=false
credential_access=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

The default 8 GiB synthetic hash budget remains only a **source fixture**
limit; this neither qualifies a host-specific runtime policy nor proves
root/ACL/retained-FD custody, Python/Git loader/import identity or
post-`fexecve` process isolation. A distinct security reviewer and
new exact-head CI are required before source acceptance.

**PROTECT THE CORE.**


## Composed terminal growth-byte and isolated preimport guard

This generation combines both former sibling source-only drafts #3617 and
#3611 without merging two conflicting V2 census files:

- Cumulative regular and symlink-target read budgets are charged before
  opening, with the optional terminal `os.read(fd,1)` growth probe charged
  before it is attempted. At exact exhaustion no extra byte is read;
  terminal descriptor and visible-file generation still fail closed.
- Census and proof scripts import **only built-in sys** first, then enforce
  `sys.flags.isolated`, `sys.flags.dont_write_bytecode`, and
  `sys.flags.no_site` before importing other stdlib modules. Required
  execution: `python3 -I -B -S`. The source verifier checks the leading
  source AST/prefix and actually runs three sanitized negative invocations
  each missing one required flag.
- The checked-in proof must bind the exact changed source Git blob, while
  all existing growth, hash-read, serialized-record, path/absence and
  symlink budget fixtures remain active.

**Boundary:** this is an accidental-invocation guard *after* Python
interpreter startup, not an authenticated privileged first instruction.
It cannot attest Python ELF or loader bytes, or prevent earlier
`sitecustomize` or environment-dependent initialization. The source
remains inert with `HOST_EXECUTION_ENABLED=False`; there is no protected
host census, first-entry install, independent security acceptance,
private-key/signing, transaction, payment, presale/WC or funds authority.

PROTECT THE CORE.
