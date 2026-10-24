# Buy VOID custody V3 protected installer native first-entry plan V1

Marker:

`VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_INSTALLER_FIRST_ENTRY_PLAN_V1`.

Status: **source-only first-entry architecture; no protected installation or
execution authority**.

This plan consumes the exact protected installer-source lock and defines the
minimum mechanism required before the accepted Python installer can ever be
invoked with root authority.

It does not derive a native source file, compile a binary, install anything
under `/opt`, execute the installer, run the privileged process census, or
grant replacement/payment/presale/funds authority.

## Accepted installer input

Installer lock:

`ops/security/buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v1.json`

Expected lock Git blob:

`a1e1f4887787b408d313e73360966f93a63b2b58`

Accepted installer:

`ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v1.py`

Exact identity:

```text
Git blob:
9dd33f38fe4c89a5d2beacbc535380346eaea83b

bytes:
38420

SHA-256:
e956c90ad9680680d0734466b632a58a4145ad74c8962e9e8960b186caeced01
```

Fixed installer function:

`install_accepted_source_create_only_after_protected_first_entry`

The accepted installer lock already preserves
`install_target_selected=true`; this first-entry plan does not change that
install target or authorize its use.

## Why Python cannot be the first privileged instruction

The accepted installer is Python source stored in a user-owned repository
before protected installation.

Launching that pathname directly with root Python would let mutable pathname
resolution and Python startup occur before a protected mechanism authenticated
the exact accepted bytes.

Therefore this plan requires:

```text
first_privileged_instruction_static_native_required=true
mutable_checkout_python_first_instruction_forbidden=true
direct_root_python_authoritative=false
```

The first privileged instruction must belong to a separately derived,
reproducibly built, accepted, root-custodied static native binary.

## Selected first-entry mechanism

Mechanism identifier:

`STATIC_NATIVE_PREENTRY_SEALED_MEMFD_FIXED_PYTHON_V1`

Future protected first-entry root:

`/opt/void-buy-allocation-custody-procref-installer-first-entry-v1`

Future native entrypoint:

`/opt/void-buy-allocation-custody-procref-installer-first-entry-v1/bin/void-buy-allocation-custody-procref-installer-first-entry-v1`

Those paths are planning targets only.

### 1. Authenticate and snapshot the installer

The native pre-entry must:

1. open the fixed repository installer source without following symlinks;
2. require the exact accepted Git-blob-equivalent bytes, byte length and
   SHA-256;
3. retain the opened generation while reading and reject generation drift;
4. copy only those authenticated bytes into a Linux memfd;
5. seal the memfd against write, grow, shrink and seal changes.

Required seals:

```text
F_SEAL_WRITE
F_SEAL_GROW
F_SEAL_SHRINK
F_SEAL_SEAL
```

The verified repository pathname is not reopened as executable Python source
after the sealed snapshot is created.

### 2. Bind the Python interpreter generation

The selected interpreter path is:

`/usr/bin/python3`

This plan intentionally does **not** choose a Python byte identity yet.

A later candidate must bind an exact root-owned, non-group/world-writable
Python generation and trusted ancestry. The native pre-entry must execute that
verified generation through a retained descriptor; reopening
`/usr/bin/python3` by pathname after verification is forbidden.

Therefore:

```text
python_generation_candidate_required=true
python_generation_selected=false
python_descriptor_bound_exec_required=true
python_path_reopen_after_verification_forbidden=true
```

## Python startup policy

The future native launcher must enforce equivalent Python startup semantics to:

```text
-I
-S
-B
```

No caller-controlled Python environment may influence startup.

The launcher must also:

- clear ambient Python-related environment variables;
- use `/dev/null` as stdin;
- select `/` as the working directory;
- pass no caller-selected Python source/module/function name.

The standard library and loader remain future root-custodied OS dependencies
that must be reviewed as part of the later native/Python-generation candidate.

## Fixed bridge

A small fixed bridge must be compiled into the accepted native policy.

It must:

1. read only the inherited sealed installer memfd;
2. recheck the exact installer byte length and SHA-256;
3. compile those bytes with the fixed synthetic filename

   `/home/zoso/dev/void-node/ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v1.py`;

4. execute them in a fresh fixed module namespace;
5. invoke only

   `install_accepted_source_create_only_after_protected_first_entry()`.

The synthetic filename intentionally preserves the accepted installer's
repository-root calculation. The installer then independently reopens and
reauthenticates its exact install plan, accepted census lock and accepted
all-process census source through its own descriptor-bound readers.

A changed repository input must HOLD; it cannot be substituted as authority.

## Recovery contract inheritance

The first-entry mechanism does not weaken #3797's installer recovery semantics.

The accepted installer still requires:

- create-only/no-replace publication;
- exact destination selection;
- fixed accepted payload;
- dedicated `StageGenerationUnknownError` when stage creation succeeds but
  its first identity read cannot bind the new generation;
- possible residual stage reported;
- operator inspection before retry;
- exact-generation cleanup only after a stage identity has been bound;
- post-publication failures to preserve the final root for inspection.

## Still unselected / unproven

This plan deliberately leaves these false:

```text
native_first_entry_source_derived=false
native_first_entry_binary_derived=false
native_first_entry_binary_accepted=false
native_first_entry_binary_installed=false
native_first_entry_binary_verified=false
first_entry_execution_authorized=false
protected_installer_first_entry_installed=false
protected_installer_first_entry_verified=false
protected_install_authorized=false
protected_source_installed=false
live_privileged_census_authorized=false
live_privileged_census_executed=false
existing_target_replaced=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

The next gate is only:

`DERIVE_STATIC_NATIVE_FIRST_ENTRY_CANDIDATE`

That later source/CI gate must derive reproducible native bytes and a fixed
Python-generation policy. It is still separate from protected installation or
execution.

**PROTECT THE CORE.**
