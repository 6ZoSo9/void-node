# Buy VOID custody V3 closed Python runtime census V1

Marker:

`VOID_BUY_VOID_CUSTODY_RUNTIME_V3_CLOSED_PYTHON_RUNTIME_CENSUS_V1`.

Status: **read-only host runtime candidate census only**.

This successor consumes the exact accepted V2 first-entry source lock from
Draft #3815 and defines the missing closed-Python runtime qualification gate
before any native first-entry candidate may be derived.

It does not install Python, modify `/opt`, derive or accept a launcher
candidate, invoke a privileged installer, replace the legacy custody runtime,
or authorize payment/presale/funds activity.

## Accepted predecessor

Exact accepted first-entry lock:

```text
path:
ops/security/buy-void-allocation-custody-runtime-v3-installer-first-entry-lock-v2.json

Git blob:
36d6c4a5ff825993371f109ee86a77b601e12d07
```

The lock must still state:

```text
first_entry_native_source_accepted=true
python_runtime_identity_selected=false
first_entry_candidate_derived=false
protected_install_authorized=false
replacement_apply_authorized=false
funds_movement=false
```

## Fixed runtime candidate namespace

The census observes only:

```text
/opt/void-buy-void-v7-python-runtime-v1/
  bin/
    python3.12-static
  lib/
    python312.zip
```

The directory tree must be exact:

- runtime root: root:root `0555`;
- `bin`: root:root `0555`;
- `lib`: root:root `0555`;
- Python executable: root:root `0555`, exactly one link;
- stdlib ZIP: root:root `0444`, exactly one link;
- no extra directory entries.

The runtime path and ancestors must be direct, root-owned and not
group/world-writable.

## Static Python identity

The Python executable is read through a retained non-following descriptor,
bounded to 256 MiB, and identified by exact byte count and SHA-256.

The ELF must be:

```text
ELF64
little-endian
ET_EXEC
x86-64
PT_LOAD present
PT_INTERP absent
PT_DYNAMIC absent
```

The census does not import or execute arbitrary checkout code under that
runtime.

## Closed import probe

The runtime is invoked unprivileged with the exact flags:

```text
-I -B -S -c <fixed census probe>
```

The child environment is empty.

The fixed probe imports only built-in `sys` before closure, then immediately
replaces `sys.path` with exactly:

```text
/opt/void-buy-void-v7-python-runtime-v1/lib/python312.zip
```

Only after that replacement may any non-built-in standard-library module be
imported. It then imports the modules required by the accepted V2 installer and
requires:

- Python version in the 3.12 series;
- `_voidfs` present in `sys.builtin_module_names`;
- `_voidfs.__spec__.origin == "built-in"`;
- both `_voidfs.__spec__.loader` and `_voidfs.__loader__` are
  `importlib.machinery.BuiltinImporter`;
- exact public `_voidfs` surface: `rename_noreplace`;
- every loaded module origin either built-in, frozen, or beneath the exact
  stdlib ZIP;
- no ambient host module origin.

The probe neither invokes the protected installer nor calls
`rename_noreplace`.

## fs-verity observation

The census also invokes Linux `FS_IOC_MEASURE_VERITY` read-only on the exact
Python and stdlib descriptors.

This gate **observes rather than assumes** fs-verity:

- unsupported filesystem/operation is recorded as not measured;
- absent verity state is recorded as not measured;
- a successful measurement records algorithm and digest;
- protected-use readiness requires SHA-256 verity measurement on both files.

A missing verity seal does not mutate the host to repair itself. It simply
keeps:

```text
fsverity_ready_for_protected_use=false
protected_runtime_accepted=false
```

## Candidate versus acceptance

A successful host census may emit:

```text
runtime_identity_candidate=true
```

with fresh Python/stdlib bytes, SHA-256 values, inode metadata, ELF admission,
import-closure evidence and fs-verity observations.

It deliberately keeps:

```text
python_runtime_identity_selected=false
python_stdlib_import_closure_selected=false
protected_runtime_accepted=false
first_entry_candidate_derived=false
first_entry_candidate_accepted=false
protected_installer_first_entry_installed=false
protected_install_authorized=false
protected_source_installed=false
live_privileged_census_authorized=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

A later source lock must review and accept one exact runtime-candidate receipt
before the V2 native first-entry source can be compiled with production
runtime bindings.

## Invocation

After exact-head source/CI qualification:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_runtime_v3_closed_python_runtime_census_v1.py \
  --census
```

Do not run this mutable checkout census with sudo. Root execution intentionally
HOLDs.

## Read-effect labeling

The census performs no explicit host writes, but ordinary reads may update
atime depending on mount policy:

```text
production_read_only=true
production_explicit_filesystem_write=false
production_filesystem_write_free=false
production_atime_write_possible=true
```

**PROTECT THE CORE.**
