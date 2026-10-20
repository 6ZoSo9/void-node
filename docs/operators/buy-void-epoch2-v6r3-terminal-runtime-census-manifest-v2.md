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
