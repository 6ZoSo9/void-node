# Buy VOID custody V3 installer protected first-entry plan V1

Marker:

`VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALLER_FIRST_ENTRY_PLAN_V1`.

Status: **source/test/CI planning only; no protected installation or privileged execution authority**.

This successor consumes the exact accepted installer-source lock from Draft
#3802 and defines the smallest native first-instruction boundary required before
the accepted Python installer can ever execute with root authority.

It does not build a launcher, install anything under `/opt`, invoke the
installer, or authorize a live all-process census.

## Accepted installer input

Accepted installer lock:

- path:
  `ops/security/buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v1.json`;
- Git blob:
  `a1e1f4887787b408d313e73360966f93a63b2b58`.

Accepted installer:

- repository path:
  `ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v1.py`;
- Git blob:
  `9dd33f38fe4c89a5d2beacbc535380346eaea83b`;
- bytes: `38420`;
- SHA-256:
  `e956c90ad9680680d0734466b632a58a4145ad74c8962e9e8960b186caeced01`.

Only `candidate_installer_source_accepted=true` is inherited as positive
authority. Installation/execution/economic authorities remain false.

## Why one installer file is not enough

The accepted installer intentionally resolves authenticated dependencies
relative to its own repository-style `ROOT`.

Its protected source snapshot therefore must preserve exactly these four
repository-relative files:

```text
ops/precision/
  void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v1.py
  void_buy_allocation_custody_runtime_v3_protected_all_process_install_plan_v1.py
  void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py

ops/security/
  buy-void-allocation-custody-runtime-v3-protected-all-process-reference-census-lock-v6.json
```

Required Git blobs:

```text
installer:
9dd33f38fe4c89a5d2beacbc535380346eaea83b

install plan:
0fef4e6f76738dd474ea775985b1facdd922bb54

accepted protected-source lock:
5ba0c8d7b1ab8e8384472bb867e0603e6986b9b1

accepted protected census source:
33a7221cad37aec70474b97b26c2b10e2ef60f66
```

The snapshot must contain no `.git` dependency and no caller-selected extra
files. The installer path remains repository-relative inside this fixed source
root so its existing `ROOT` calculation and authenticated dependency checks
continue to mean the same thing after protection.

## Selected future first-entry namespace

The plan selects:

```text
/opt/void-buy-allocation-custody-procref-installer-first-entry-v1/
  bin/
    void_buy_allocation_custody_procref_installer_first_entry_v1
  policy-v1.conf
  source/
    <exact four-file repository-relative snapshot above>
```

Selected metadata contract:

```text
root owner/group:        0/0
root mode:               0555
native launcher mode:    0555
policy mode:             0444
source-file mode:        0444
trusted-file link count: exactly 1
```

This means `first_entry_target_selected=true`. It does **not** mean a native
source exists, a candidate has been derived, or anything is installed.

## Native first-instruction requirement

The first privileged instruction must be reviewed native code.

The future launcher candidate must be:

- static ELF64 x86-64 `ET_EXEC`;
- free of `PT_INTERP`;
- free of `PT_DYNAMIC`;
- fixed to the exact first-entry root and installer path;
- unable to accept a caller-selected Python source;
- unable to accept a caller-selected installer path;
- unable to accept a caller-selected destination;
- started with stdin bound to `/dev/null`;
- launched with a closed environment;
- executed after supplementary groups are cleared;
- self-bound to its own `/proc/self/exe` generation;
- protected by root-owned, non-group/world-writable ancestry.

Before Python may execute, native code must authenticate:

1. itself and its installed ancestry;
2. the exact closed policy;
3. all four protected snapshot files;
4. the accepted installer byte count and SHA-256;
5. a separately qualified Python runtime and its required import closure;
6. all retained and visible generations immediately before child creation.

No mutable-checkout Python source may execute first as root.

## Python child contract

The accepted installer exposes no direct production `--apply` CLI. The future
native launcher therefore requires a fixed, compile-bound bootstrap and may not
forward arbitrary Python text.

The child invocation shape is fixed to:

```text
-I -B -S -c <native-embedded fixed bootstrap>
```

The fixed bootstrap may load only the retained exact installer source and invoke:

```text
install_accepted_source_create_only_after_protected_first_entry()
```

No caller-controlled source path, destination path or Python program text is
permitted.

## Python runtime remains a separate gate

This plan deliberately does **not** pretend that `/usr/bin/python3` plus an
ambient standard library is already a closed privileged runtime.

Therefore:

```text
closed_python_runtime_required=true
python_runtime_identity_selected=false
python_stdlib_import_closure_selected=false
```

A later first-entry source may require compile-time Python/runtime bindings, but
candidate derivation must not advance until the exact interpreter and import
closure are separately reviewed.

This prevents the native first instruction from authenticating only the Python
ELF while silently allowing unbound library/module bytes to influence the
privileged installer.

## Required later ordering

1. Accept this source-only plan.
2. Author/review a static native first-entry source with no default production
   identities and required compile-time installer/runtime bindings.
3. Qualify the closed Python runtime and exact import closure needed by the
   accepted installer.
4. Derive a reproducible native launcher candidate from sealed reviewed source.
5. Accept/lock that exact candidate identity.
6. Create-only install the launcher, policy and exact four-file source snapshot.
7. Read-only qualify the installed first-entry namespace and Python closure.
8. Only under a separate operator authorization may the protected first entry
   invoke the accepted create-only installer.
9. Only after protected source installation and a new live-at-use host
   qualification may a privileged all-process census be considered.

Each item is a separate gate. This plan authorizes none of the later host
actions.

## Invocation

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_runtime_v3_installer_first_entry_plan_v1.py \
  --plan
```

No sudo is required or authorized. Root execution of this mutable source plan
HOLDs.

## Read-effect labeling

```text
production_plan_read_only=true
production_plan_explicit_filesystem_write=false
production_plan_filesystem_write_free=false
production_plan_atime_write_possible=true
```

## Authority

```text
source_plan_only=true
first_entry_target_selected=true
first_entry_native_source_authored=false
first_entry_candidate_derived=false
first_entry_candidate_accepted=false
protected_installer_first_entry_installed=false
protected_installer_first_entry_verified=false
protected_install_authorized=false
protected_source_installed=false
live_privileged_census_authorized=false
live_privileged_census_executed=false
service_mutation=false
systemd_mutation=false
existing_target_replaced=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

**PROTECT THE CORE.**
