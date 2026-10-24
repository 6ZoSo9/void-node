# Buy VOID custody V3 installer protected first-entry native source V2

Marker:

`VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALLER_FIRST_ENTRY_SOURCE_V2`.

Status: **source/test/CI only; no launcher candidate, protected install, privileged execution, replacement, or economic authority**.

This successor composes two exact reviewed parents without silently merging their
histories:

1. accepted ctypes-free installer V2 source lock from Draft #3809;
2. exact native first-entry V1 source from Draft #3805 as the structural
   predecessor.

The V2 source preserves the static native first-instruction design, updates the
binding/token lineage to V2, and closes the V1 FIFO-open blocking gap.

## Accepted installer V2 parent

Accepted installer lock:

```text
ops/security/buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v2.json
Git blob: f9372da99d8ab9b3d5f7fddc6d8de0de605576f0
parent lock head: c1c50f848b42d720d2dae94cfef52c3f7e92a215
```

The lock accepts exact installer source:

```text
Git blob: bd8728be0b59bce3db0f559d0ebd01692f9a5844
bytes: 46939
SHA-256: 75934d38e5b89eed904be7738c82de6cd586ac11afc28e075cc44a4e7fb9d715
```

and keeps protected install, protected-source-installed, live privileged census,
replacement apply, payment, presale and funds authority false.

## Native predecessor parent

The exact structural predecessor is:

```text
PR #3805 head:
86e2e5c92f87a74985e4f96617b4d013c252e237

native source:
native/void_buy_allocation_custody_runtime_v3_installer_first_entry_source_v1.c

Git blob:
1bbe19704a3d1f89b8fe1bfc3759e202ba85594c
```

The V1 file is historical evidence only. V2 is a distinct source file and does
not rewrite the V1 bytes.

## Exact V2 source identities

```text
native source:
native/void_buy_allocation_custody_runtime_v3_installer_first_entry_source_v2.c
Git blob: d7693320783bcd0e3a2c4ef6c4afd86123e3688e

standalone proof:
scripts/prove_void_buy_allocation_custody_runtime_v3_installer_first_entry_source_v2.py
Git blob: d640403d01643cff452fc95090a4c426fb3627e5
```

## V2 binding surface

V2 requires a later compile-time header:

`void_buy_allocation_custody_runtime_v3_installer_first_entry_bindings_v2.h`

with:

```text
VOID_CUSTODY_FIRST_ENTRY_BINDINGS_VERSION=2
```

The header remains intentionally absent in this generation.

It must later bind the exact first-entry binary/policy, accepted installer V2,
install plan, accepted V2 source lock, protected all-process census source,
fully-static Python executable, pure-Python stdlib archive and retained file
descriptor numbers.

No production path or digest defaults are embedded in this source.

The privileged confirmation token is also generation-specific:

```text
INSTALL_ACCEPTED_VOID_CUSTODY_PROTECTED_PROCREF_SOURCE_V2_CREATE_ONLY
```

## Nonblocking trusted-leaf boundary

V1 used blocking read-only opens for two trusted pathname leaves. An attacker
able to substitute a FIFO after the pre-open metadata check could therefore
block the first-entry process before post-open type/generation rejection.

V2 centralizes both pathname leaf opens through:

```text
open_leaf_nofollow_nonblocking()
```

with exactly:

```text
O_RDONLY | O_NOFOLLOW | O_NONBLOCK | O_CLOEXEC
```

The helper is used for:

- every `open_verified_regular(...)` trusted-file open; and
- the installed first-entry pathname open in `verify_self_generation()`.

Post-open `fstat`, generation, type, owner, mode, link-count, length and
digest checks remain unchanged.

The standalone proof compiles a disposable native harness that includes the
actual production V2 source and calls the exact helper on a real FIFO with no
writer. The subprocess has a short timeout. Success therefore proves the
production helper returns promptly instead of blocking on the FIFO shape.

This is a test fixture only; no production path is opened and no privileged
binary is produced.

## Preserved first-instruction behavior

Before Python execution the native source still requires:

1. exact privileged argv and V2 confirmation token;
2. empty environment at native entry;
3. real/effective UID and GID zero;
4. supplementary groups cleared;
5. exact installed native inode equal to `/proc/self/exe`;
6. root-owned, root-grouped, non-group/world-writable ancestry;
7. exact trusted-file metadata and in-process SHA-256;
8. fully static ELF64 little-endian x86-64 Python with `PT_INTERP` and
   `PT_DYNAMIC` forbidden and at least one `PT_LOAD`;
9. retained installer and Python descriptors;
10. stdin rebound to `/dev/null`;
11. `PR_SET_NO_NEW_PRIVS`;
12. all untrusted descriptors closed with Linux `close_range`;
13. Python `fexecve` from the retained descriptor with fixed
    `-I -B -S -c` flags.

The bootstrap still reads installer bytes only from the retained installer
descriptor, constrains `sys.path` to the compile-bound stdlib archive, and
calls only:

`install_accepted_source_create_only_after_protected_first_entry()`

## Native mutation boundary

The C source itself still contains no filesystem publication primitive:

- no create;
- no mkdir;
- no link;
- no rename;
- no unlink;
- no chmod/chown;
- no shell/process spawning helper.

Publication remains inside the accepted Python V2 installer and is not
authorized by this source generation.

## Verification

Hosted proof must establish:

- exact V2 source blob;
- exact accepted installer V2 lock;
- exact V1 predecessor head/blob through the workflow;
- V2 binding header required and missing-header compilation HOLD;
- synthetic V2 binding syntax compile green;
- exact privileged V2 confirmation token;
- no production identity defaults;
- static Python and retained-FD boundaries;
- shared nonblocking nofollow leaf-open helper;
- helper used by both trusted-file and installed-self opens;
- real FIFO substitution returns without blocking;
- no native filesystem publication primitive.

No root or sudo execution is part of this generation.

## Authority boundary

Only the source-authorship fact advances:

```text
first_entry_native_source_authored=true
```

The following remain false/unselected:

```text
python_runtime_identity_selected=false
python_stdlib_import_closure_selected=false
first_entry_candidate_derived=false
first_entry_candidate_accepted=false
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

A later gate may qualify exact runtime/import-closure bindings and compile a
candidate. Actual protected installation and live privileged execution remain
separate authorization events.

**PROTECT THE CORE.**
