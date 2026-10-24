# Buy VOID custody V3 installer protected first-entry native source V1

Marker:

`VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALLER_FIRST_ENTRY_SOURCE_V1`.

Status: **source/test/CI only; no launcher candidate, protected install, privileged execution, or economic authority**.

This successor implements the next source-only step from merged first-entry plan
#3803. It authors the static native first-instruction source required before the
accepted Python installer may ever execute with root authority.

It deliberately does **not** select a production Python interpreter, standard
library/import closure, policy bytes, protected source paths, or launcher binary.
Those identities must arrive later through an exact reviewed compile-time
binding header.

## Parent plan and accepted installer

This source is based on merged first-entry plan commit:

```text
ef0dabf066b0f7c7f8d1fa7735e0a55ce6977194
```

Exact plan source:

```text
ops/precision/void_buy_allocation_custody_runtime_v3_installer_first_entry_plan_v1.py
Git blob: 87f6f9766309bfe3d0b9c74625dbc48c6aa0e16d
```

Accepted installer lock:

```text
ops/security/buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v1.json
Git blob: a1e1f4887787b408d313e73360966f93a63b2b58
```

## No default production bindings

The native source includes:

```text
void_buy_allocation_custody_runtime_v3_installer_first_entry_bindings_v1.h
```

That header is intentionally **not** checked in by this generation.

Compilation fails unless a later reviewed runtime-binding gate supplies every
required identity, including:

- installed first-entry binary and policy paths;
- policy mode, length, and SHA-256;
- exact accepted installer path/mode/length/SHA-256;
- exact install-plan path/mode/length/SHA-256;
- exact accepted protected-source lock path/mode/length/SHA-256;
- exact protected all-process census path/mode/length/SHA-256;
- exact Python executable path/mode/length/SHA-256;
- exact pure-Python stdlib archive path/mode/length/SHA-256;
- fixed retained installer and Python descriptor numbers.

There is intentionally **no dynamic-extension directory binding** in this
generation. The later Python runtime must be fully static and must provide every
native module needed by the accepted installer as a built-in module.

There are no production `/opt` path or runtime/hash defaults in the C source.

## Native first-instruction behavior

The authored source binds the plan's privileged argv surface to exactly:

```text
--install-accepted-protected-census-source
--confirm INSTALL_ACCEPTED_VOID_CUSTODY_PROTECTED_PROCREF_SOURCE_V1_CREATE_ONLY
```

It rejects any other argument count, operation, confirmation flag or token.

Before Python execution the source requires:

1. empty environment at native entry;
2. real/effective UID and GID zero;
3. supplementary groups cleared;
4. exact installed native inode equal to `/proc/self/exe`;
5. root-owned, root-grouped, non-group/world-writable ancestry;
6. exact trusted-file type/owner/group/mode/link-count/length, with all trusted leaf opens using shared `O_RDONLY|O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC` flags so a regular-to-FIFO substitution cannot block before descriptor/type/generation rejection;
7. in-process SHA-256 verification of policy, all four protected source files,
   Python executable and one exact pure-Python stdlib archive;
8. native ELF admission of the Python executable as ELF64 little-endian x86-64
   `ET_EXEC`, with at least one `PT_LOAD` and both `PT_INTERP` and
   `PT_DYNAMIC` forbidden;
9. before/open/after visible file-generation equality;
10. retained exact installer and Python descriptors;
11. stdin rebound to `/dev/null`;
12. `PR_SET_NO_NEW_PRIVS`;
13. all untrusted file descriptors closed through Linux `close_range`.

The native source itself contains no filesystem publication primitive:
no create/link/rename/unlink/chmod/chown/mkdir operation is present.

## Fixed Python handoff

After all native checks, Python is executed from its retained descriptor with
`fexecve`, not re-resolved by pathname.

The child flags are fixed:

```text
-I -B -S -c
```

The embedded bootstrap:

- replaces `sys.path` with exactly one compile-bound entry: the verified
  pure-Python stdlib archive;
- reads installer bytes only from the retained installer descriptor;
- sets `__file__` to the compile-bound protected installer path;
- executes those exact bytes;
- calls only
  `install_accepted_source_create_only_after_protected_first_entry()`.

No caller-selected Python code, path, payload or destination is accepted.

## Runtime closure remains a separate gate

This source intentionally does not provide the binding header and does not
derive a native launcher candidate.

Therefore:

```text
first_entry_native_source_authored=true
python_runtime_identity_selected=false
python_stdlib_import_closure_selected=false
first_entry_candidate_derived=false
first_entry_candidate_accepted=false
```

A later gate must qualify the exact Python runtime and complete import closure,
including construction of the immutable stdlib archive and proof that every
native module needed by the accepted installer is built into the fully-static
Python executable. It must also prove the interpreter's **startup imports before
the `-c` bootstrap executes** are contained in that accepted static
runtime/stdlib closure. Only then may the binding header be derived and a
reproducible native candidate be compiled.

The source itself now has no `lib-dynload` path or runtime-file table at all.
This removes an entire privileged filesystem import namespace rather than
trying to police it after selection.

## Source-only verification

The proof:

- binds the exact C source, merged plan and accepted installer lock;
- rejects production defaults in the C source;
- requires all compile-time binding macros;
- creates a disposable **synthetic** binding header;
- runs `cc -fsyntax-only` with `-Wall -Wextra -Werror` for the source contract;
- compiles the same production C source into a disposable test harness that shares `trusted_leaf_flags()`, observes a regular leaf, replaces it with a FIFO after `lstat`, and requires the subsequent production-flags open to return nonblocking and expose FIFO type for fail-closed rejection;
- proves both the ordinary trusted-file path and installed-self path use that shared nonblocking leaf-open helper;
- proves compilation fails when the binding header is absent;
- emits no production native binary or production candidate.

No root/sudo execution is part of this generation.

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

**PROTECT THE CORE.**
