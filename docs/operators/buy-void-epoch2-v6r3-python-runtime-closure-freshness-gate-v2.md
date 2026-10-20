# VOID Epoch-2 V6R3 V2 Python/Git runtime closure freshness gate

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_PYTHON_RUNTIME_CLOSURE_FRESHNESS_GATE_V2`.

**Source/test/CI only.** This contract is **not** a live enforcement implementation, does not
run a Precision host census, and does not authorize a protected host plan.

## Exact V2 dependency lineage

```text
parent_pr=3595
closure_contract_head=83c066af5542c2b4d836f3df9d06381499031a30
closure_contract_git_blob=c56361ecaccb916a79591c016200b8dc02f5ca54
closure_contract_id=voidbuye2v6r3pyruntimecontract2_6fe0f7e5779d998659ffb67d64832e9ce5babac92584c88f43c1400cef3e4e50
repaired_binary_lock_git_blob=14a3ff2eca0583d1355dc8b75bd54cc55115d946
repaired_binary_lock_id=voidbuye2v6r3planfirstentrybinlock2_b5e1bbca28ed7aad579ac7f37a7575ed90eadd44f73d24edac79df3cc74664c1
freshness_gate_id=voidbuye2v6r3pyclosurefreshness2_5840ca9aaecbbef2b50783fe05d364161e66b19a79c793b71dd80d18d243c54b
```

This is a deliberate V2 reissue of historical #3578. Its original V1 contract/ELF pins
remain frozen, but **cannot authorize** the changed first-entry executable from #3585,
candidate #3587, or the new content-addressed binary lock #3591. The parent V2 source
contract #3595 is itself only reviewed repository source evidence; it has **not**
accepted an installed host Python/Git/loader runtime.

## Temporal security boundary

A historical host report or a correct SHA-256 lock is not current first-instruction evidence.
Before any future separately approved read-only host planner execution, one coherent,
independently reviewed installed first-entry must:

- Compare the exact accepted report, host identity and its complete current Python/Git
  execution closure to the **current** host generation.
- Authenticate Python ELF, dynamic loader, transitive libraries, `-I -B -S` sys.path,
  import roots, mapped ELFs, all file-access/config/plugin authorities, symlinks and
  explicit absences, with effective UID-1000 ancestor and leaf custody.
- Independently authenticate Git's retained executable, loader/DSOs, runtime helpers,
  config and repository metadata/absences—not merely `/usr/bin/git` as a pathname.
- Reject missing/new/writable/unapproved imports or runtime paths, changed symlinks,
  materialized absent paths and all ambiguous dependency resolution.
- Revalidate terminally **after** irreversible UID/GID reduction and **before** the
  authenticated Python `fexecve`; a previous read-only census cannot authorize
  the future loader/import sequence on its own.
- Separately resolve the **post-`fexecve` dumpability** isolation finding. Historical
  #3579 observed ordinary `pre=0, post=1`; this is a **diagnostic**, not evidence that
  the new V2 Python process remains nondumpable after exec.

This V2 gate is content-addressed with canonical SHA-256 over exact JSON material.
The current source verifier authenticates the V2 parent Git blob/ID and lock blob/ID;
its **in-memory-only** classifier checks complete manifest equality, root/leaf writable
flags, declared absences and file-access subsets. It also requires a Git runtime
submanifest containing the executable, mapped ELFs, helper files and configuration
presence/absence; synthetic negatives cover Git binary/loader/DSO/helper hash drift,
configuration materialization, unapproved helpers and library loads.

These fixtures are not a real host census, not descriptor-bound protected traversal,
and not runtime-process/procfs evidence. The sibling census substrate #3594 is still
a **fixture-only, V1-ancestry generation** and requires separate source rebind and
review before any future host observer.

## Negative authority

```text
source_contract_only=true
host_census_authorized=false
installed_enforcement_source_proven=false
installed_v2_first_entry_enforcement_source_proven=false
installed_post_exec_dumpability_enforcement_source_proven=false
production_host_evidence_authority=false
host_manifest_accepted=false
host_plan_authorized=false
protected_install_authorized=false
credential_access=false
private_key_access=false
signing=false
rpc_call=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

After source CI, a **genuinely distinct independent security review** is still required,
followed by separately scoped source-authenticated host census, accepted runtime closure
and protected install/qualification. The public presale remains disabled.

PROTECT THE CORE.
