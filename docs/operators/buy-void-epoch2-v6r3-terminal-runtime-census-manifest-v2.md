# VOID Epoch-2 V6R3 bounded terminal runtime census manifest V2

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_TERMINAL_RUNTIME_CENSUS_MANIFEST_V2`.

**Source and disposable-fixture only. Protected host execution hard-disabled.**

## Exact source lineage

```text
parent_pr=3598
parent_head=a0aab3c000db9bf7206bb4aec7a023bf371347c8
strongest_v1_census_pr=3597
strongest_v1_census_head=278480615a2d06c23be8c28668fdc6cc35c5141a
strongest_v1_source_blob=05458587b5743da09ed2f752e971ca67938cceac
new_v2_source_blob=d2f6d44a9dd8c8961fb7952c1aa985bb3da9cdb3
python_git_runtime_closure_blob=c56361ecaccb916a79591c016200b8dc02f5ca54
python_git_runtime_contract_id=voidbuye2v6r3pyruntimecontract2_6fe0f7e5779d998659ffb67d64832e9ce5babac92584c88f43c1400cef3e4e50
temporal_freshness_blob=864c04c578d0abdb6e8c01d3f9dd7eda6ceff2ac
temporal_freshness_gate_id=voidbuye2v6r3pyclosurefreshness2_5840ca9aaecbbef2b50783fe05d364161e66b19a79c793b71dd80d18d243c54b
HOST_EXECUTION_ENABLED=False
```

This V2 successor reissues the fully composed V1 census source containing the
#3589 streaming enumeration guard, #3592 every-symlink-hop confinement,
#3593 dangling missing-component reentry checks, #3594 negative path and
`sys.path` authority binding, and #3597 *pre-traversal input array budgets*.
The original V1 source paths, locks and generation are not overwritten.

## Bounded fixture implementation

The collector applies a combined cardinality/UTF-8-byte budget to input
`sys_path`, `declared_absent` and `accessed_paths` lists **before** tree
traversal or absent-path sorting. It limits each path to 4096 bytes, rejects
non-string/NUL inputs and iterators, then bounds discovered directory entries
before allocation. Regular files are no-follow hashed and generation
rechecked. Nested symlink hops stay inside the disposable inventory root.
Missing-parent `..` reentry and path aliases HOLD; each import root must be
recorded or explicitly absent. Self-tests exercise resource, resolution,
absence, symlink, and drift adversaries. Only `--self-test` and
`--source-plan` exist; no `--run` or live census mode.

## What this does not establish

The parent V2 freshness policy (#3598) includes Git ELF/loader/DSO/helper,
config and source-metadata runtime closure. **This fixture collector does
not implement a live Git submanifest observer**, does not enumerate Python's
actual ELF dependency chain, and does not prove terminal first-exec
equivalence on Precision. Those requirements remain mandatory for a later
source-authenticated, separately reviewed host adapter. Path-based checks
also require protected root/ACL ancestry and descriptor-relative traversal
to withstand concurrent substitutions. Ordinary sealed Python
`fexecve` can reset dumpability from 0 to 1; genuine post-exec isolation
and loader-startup protection remain unverified.

```text
source_only=true
host_execution_enabled=false
host_census_authorized=false
git_live_runtime_observation_implemented=false
python_runtime_closure_accepted=false
post_exec_dumpability_accepted=false
installed_first_entry_binary_qualified=false
protected_install_authorized=false
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

## Non-POSIX pathname truth repair (source-only exact successor)

The pre-traversal budget already rejected NUL in input arrays, but the
logical display root and directly callable absence helper still required
their own checks. This source update refuses embedded NUL in the logical root
and in either standalone absence-record identity **before** touching the
filesystem; it also rejects noncanonical accessed-path spellings before tree
enumeration. Four disposable negative fixture cases cover the direct helper
and manifest entrypoints. The proof pins the new V2 source blob
`f42458ff4c9d2de7d879e7501ab3964e6a48c61b` and checks the new fixture markers.

**These fixture checks are not live host custody.** All protected observer,
postexec isolation, host-plan, signing, payment, public presale and funds
authority flags remain false.

## Display-root and inventory-name output budget — source-only V2 successor

Prior source #3602 bounds input `sys_path`, `declared_absent` and
`accessed_paths` lists, but an independent `display_root` string is
concatenated onto **every** manifest object name. `MAX_REPORT_BYTES` was
checked only after all object keys were built. A caller-provided, very long
logical root could therefore cause major intermediate allocation even when
input-array and 100,000-entry scan bounds were obeyed.

This successor introduces `require_display_root()` at the start of both
`collect_tree()` and `build_manifest()`. It requires a canonical absolute
POSIX display identity (no redundant leading double slash, relative path,
NUL, invalid UTF-8, or malformed components), with at most 4,096 UTF-8
bytes. The standalone `absence_record()` applies the same logical-root
gate and independently caps its full display path.

`collect_tree()` also accumulates the UTF-8 bytes of each **discovered**
logical path key, including queued child directories. The inventory root is
charged once. Exceeding `MAX_REPORT_BYTES=16MiB` raises
`Hold("manifest_display_path_budget_exceeded")` *before* leaf stat/hash or
manifest JSON construction. A caller cannot expand a short input list into
an arbitrarily large output-key dictionary.

Disposable self-tests reject an oversized ASCII display root, an invalid
UTF-8/surrogate root, a double-slash root, a too-long standalone absence
identity and a tiny aggregate display-key limit. A normal fixture inventory
still succeeds. No large allocation or privileged host action is needed.

```text
v2_source_git_blob=3edb183a6e73f7e661d63cc59b7159769c161935
v2_proof_git_blob=479a26bc663fafdc25224938e6de033e0184e707
v2_parent_pr=3602
HOST_EXECUTION_ENABLED=False
host_census_authorized=false
host_plan_authorized=false
protected_install_authorized=false
funds_movement=false
```

These are fixture-only source resource limits. Root/ACL custody, retained
directory-descriptor traversal, exact dynamic Python/Git/loader closure,
post-`fexecve` isolation, independently reviewed installation and any
economic actions remain separate HOLD gates.

**PROTECT THE CORE.**
