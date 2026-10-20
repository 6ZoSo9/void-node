# Buy VOID Epoch-2 V6R3 Python closure freshness gate V1

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_PYTHON_RUNTIME_CLOSURE_FRESHNESS_GATE_V1`.

Status: **source/test/CI only — live enforcement not implemented, host census not authorized**.

## Why this successor exists

Draft #3575 defines the Python interpreter, ELF loader, dynamic-library, sys.path,
and import-file closure that a later read-only host census must record. A report
from that census is a *historical observation*. A perfectly content-addressed
report does not prove the same files, libraries, symlinks, absent paths or ACLs
remain in place when the static launcher later enters Python.

An accepted report is not a live first-execution authorization. This follow-on
records a separate **temporal** gate for installed read-only qualification.

## Bound source

- Parent Python closure contract Git blob:
  `d6b31cab5745bf76f5ae8c69bef864ee4f3338b5`.
- Parent contract ID:
  `voidbuye2v6r3pyruntimecontract1_6b88925643319fd7724f4fd66d115fd5ec9598a3c59a57cbc0a8c51737c8bae8`.
- Accepted static first-entry binary lock Git blob:
  `66bf48fd6477e0335b1eea6e2b7e8a7f297f8c57`.
- First-entry binary lock ID:
  `voidbuye2v6r3planfirstentrybinlock1_f6b452bb75542809454a0b68bae2f0049a4f2af6329e0b13075de1491bbbbc61`.
- This gate ID:
  `voidbuye2v6r3pyclosurefreshness1_63ab4349db96b99792bd58531b39d05527821af8eec0111c11b088e6ab381342`.

## Required future live boundary

A separately reviewed installed observer/launcher must bind the exact accepted
host report and host identity to a **current** complete runtime-manifest check.
The check must reobserve Python ELF and loader closure, interpreter configuration,
every accepted sys.path and import root, all regular-file SHA-256/metadata,
symlink target graphs, existing and missing paths, and effective runtime-UID
writability of every source, ancestor, directory and loader-authority path.

This gate must be repeated **after the permanent UID/GID 1000 drop** and
**before Python first exec**. New/deleted files, loader-cache or preload drift,
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

The proof contains 14 **in-memory** adversaries for stale report identity, wrong
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
