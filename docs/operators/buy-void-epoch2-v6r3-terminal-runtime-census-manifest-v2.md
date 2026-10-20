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
