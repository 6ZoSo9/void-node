# Buy VOID Epoch-2 V6R3 Python closure freshness gate V2

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_PYTHON_RUNTIME_CLOSURE_FRESHNESS_GATE_V2`.

Status: **source/test/CI only — live enforcement not implemented, host census not authorized**.

## Why this successor exists

#3595 defines the Python interpreter, ELF loader, dynamic-library, sys.path,
and import-file closure that a later read-only host census must record. A report
from that census is a *historical observation*. A perfectly content-addressed
report does not prove the same files, libraries, symlinks, absent paths or ACLs
remain in place when the static launcher later enters Python.

An accepted report is not a live first-execution authorization. This follow-on
records a separate **temporal** gate for installed read-only qualification.

## Bound source

- Parent corrected contract head: `83c066af5542c2b4d836f3df9d06381499031a30`.
- Parent Python closure contract Git blob:
  `c56361ecaccb916a79591c016200b8dc02f5ca54`.
- Parent contract ID:
  `voidbuye2v6r3pyruntimecontract2_6fe0f7e5779d998659ffb67d64832e9ce5babac92584c88f43c1400cef3e4e50`.
- Accepted static first-entry binary lock Git blob:
  `14a3ff2eca0583d1355dc8b75bd54cc55115d946`.
- First-entry binary lock ID:
  `voidbuye2v6r3planfirstentrybinlock2_b5e1bbca28ed7aad579ac7f37a7575ed90eadd44f73d24edac79df3cc74664c1`.
- This gate ID:
  `voidbuye2v6r3pyclosurefreshness2_53653912534048b7be8b02aed429a28383edb9b419632e7e1d8fd32a19050414`.

## Required future live boundary

A separately reviewed installed observer/launcher must bind the exact accepted
host report and host identity to a **current** complete runtime-manifest check.
The check must reobserve Python ELF and loader closure, interpreter configuration, Git subprocess runtime dependencies,
every accepted sys.path and import root, all regular-file SHA-256/metadata,
symlink target graphs, existing and missing paths, and effective runtime-UID
writability of every source, ancestor, directory and loader-authority path.

This gate must be repeated **after the permanent UID/GID 1000 drop** and
**before Python first exec**. It is strictly a **pre-exec freshness** gate: it does not prove the child remains nondumpable after `fexecve()`. The corrected parent binds the observed `pre=0 → post=1` diagnostic, and a separate post-exec protection/isolation plus actual `PR_GET_DUMPABLE` observation remains mandatory before host-plan authority. New/deleted files, loader-cache or preload drift,
new path roots, absent-path materialization, link swaps, ambiguous dependencies,
ACL write grants, or unmapped runtime file accesses must HOLD. A future observer
must produce source-authenticated, host-bound evidence and reject stale manifests.

Even perfect on-disk revalidation is not sufficient if a runtime-writable
ancestor can be replaced before the dynamic loader imports its dependencies.
Use retained generation bindings or fail-closed root-owned/ACL-sealed ancestry
and terminal checks; do not call an offline scan an atomic loader snapshot.
The accepted static first-entry and its protected host installation remain
separate gates.

## Synthetic proof and limits

The proof contains 15 **in-memory** adversaries for stale report identity, wrong
host or runtime identity, Python binary and loader drift, new sys.path roots,
new/deleted files, previously absent path materialization, writable ancestors,
leaf ACL grants, symlink swaps and unaccepted dynamic file loads. It runs under
isolated no-site Python `-I -B -S`; it does **not** enumerate the actual
host, read protected files, invoke the launcher, access credentials or install
anything. Its positive result **must never** be labeled production readiness.

This contract adds a *required future gate*. It is not that gate's installed
implementation. Independently review any later live-census collector and
enforcement mechanism and qualify them on the exact designated host.

## Negative authority

```text
host_census_authorized=false
installed_enforcement_source_proven=false
installed_post_exec_dumpability_enforcement_source_proven=false
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

**PROTECT THE CORE.**

## V2 exact-source boundary

Binds the corrected #3595 V2 runtime contract `voidbuye2v6r3pyruntimecontract2_6fe0f7e5779d998659ffb67d64832e9ce5babac92584c88f43c1400cef3e4e50`
(blob `c56361ecaccb916a79591c016200b8dc02f5ca54`), and the repaired #3591 V2 static first-entry
lock `voidbuye2v6r3planfirstentrybinlock2_b5e1bbca28ed7aad579ac7f37a7575ed90eadd44f73d24edac79df3cc74664c1` (blob `14a3ff2eca0583d1355dc8b75bd54cc55115d946`). This V2 source gate does
not accept the stale V1 #3578 terminal freshness generation.
#3579's post-`fexecve` dumpability reset remains a historical diagnostic
and not a proof of runtime child protection.

The enhanced terminal census substrate on #3594 is still V1-bound; this
gate does not import, run or approve that code. Root-owned/ACL custody,
FD-relative generation checking, Python/Git/loader runtime inventory,
host binding, post-exec isolation and distinct independent review
remain separate prerequisites. This is an offline 15-adversary classifier
only, not a protected-host census or activation control.

```text
gate_id=voidbuye2v6r3pyclosurefreshness2_53653912534048b7be8b02aed429a28383edb9b419632e7e1d8fd32a19050414
contract_id=voidbuye2v6r3pyruntimecontract2_6fe0f7e5779d998659ffb67d64832e9ce5babac92584c88f43c1400cef3e4e50
live_enforcement_proven=false
post_exec_dumpability_accepted=false
host_census_authorized=false
protected_install_authorized=false
host_plan_authorized=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```
