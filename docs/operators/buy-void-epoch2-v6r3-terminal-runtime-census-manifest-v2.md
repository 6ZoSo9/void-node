# Buy VOID Epoch-2 V6R3 terminal runtime census manifest V2

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_TERMINAL_RUNTIME_CENSUS_MANIFEST_V2`

**Draft/source-only fixture substrate; host execution hard-disabled.** This is
an ADD-only V2 reissue of the coherent #3594 V1 census repair generation at
`090e0a5423109e5f7e64264c39586e3514ad8187`. Historical V1 census and gate identities are not runtime authority.

## Exact V2 lineage

```text
parent_pr=3596
parent_head=27a9cd9969c02bd7afb03e76dfedcfd509b127ef
source_provenance_pr=3594
source_provenance_head=090e0a5423109e5f7e64264c39586e3514ad8187
source_provenance_blob=e48bb69ec04f21f19c3b98bbd2596a55ce84a979
v2_source_blob=e64a56e0c4c5be6ef198e0dc4d35706745cfd71d
runtime_closure_contract_git_blob=c56361ecaccb916a79591c016200b8dc02f5ca54
runtime_closure_contract_id=voidbuye2v6r3pyruntimecontract2_6fe0f7e5779d998659ffb67d64832e9ce5babac92584c88f43c1400cef3e4e50
freshness_gate_git_blob=66c1e4da7800de930804b195db6b56d8fe29b8f4
freshness_gate_id=voidbuye2v6r3pyclosurefreshness2_53653912534048b7be8b02aed429a28383edb9b419632e7e1d8fd32a19050414
HOST_EXECUTION_ENABLED=False
```

The repository contract still binds the repaired static first-entry ELF
`b3043169c466ab96a953d00fedd960817e982bf45897ac6b3259baaaeb0e81dd`
and the separately reviewed Python/Git closure requirement. A historical
sealed-memfd `fexecve` experiment observed dumpability reset `0 -> 1`.
That observation remains a **release HOLD**, not a demonstration of a V2
process being protected after exec.

## Source-only fixture properties

The V1-derived collector retains bounded nonblocking no-follow hashing of
regular files; directory generation revalidation and streaming discovered-entry
budget before materialization; deterministic canonical directory/regular/link
inventory; every-symlink-hop inventory-root confinement with a 40-hop limit;
missing-component/.. reentry rejection and terminal absent checks; negative
path ancestor/link confinement; and strict `sys.path` coverage requiring
each import root to be inventoried or explicitly declared absent.

Fixtures must reject arbitrary special files, out-of-root symlink
intermediaries, cyclic links, ambiguous nearest parents, changed dependencies,
fabricated absent paths, too-wide directory fan-out, and noncanonical
`sys.path` spellings. Only `--self-test` and `--source-plan` are accepted;
there is **no host probe**, `--run`, installer, privileged filesystem access
or service control.

## Unresolved production requirements

This is NOT a source-authenticated live Python/Git/loader census. No
authenticated host or accepted report is supplied. Path-based observations
still require root/ACL ancestry custody, descriptor-relative traversal and
terminal revalidation against concurrent swaps; real dynamic-ELF import, mmap,
dlopen, loader cache/preload and Git helper/config closure are not observed.
Post-exec process isolation and independent security review remain unproven.

```text
host_execution_enabled=false
host_census_authorized=false
python_runtime_closure_accepted=false
post_exec_dumpability_accepted=false
protected_install_authorized=false
host_plan_authorized=false
service_mutation=false
credential_access=false
private_key_access=false
signing=false
transaction=false
rpc_call=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
funds_movement=false
```

**PROTECT THE CORE.**
