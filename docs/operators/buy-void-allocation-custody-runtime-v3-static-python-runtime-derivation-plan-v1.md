# Buy VOID custody V3 static Python runtime derivation plan V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_STATIC_PYTHON_RUNTIME_DERIVATION_PLAN_V1`.

Status: **source-only derivation plan; no build, candidate execution, host install, or economic authority**.

Plan ID:

`voidbuycustodystaticpythonplan1_830b9c2a6f16b797f20cb491c9e34c19aaea6ea2e89788d5d8038ff2d996d6ae`

## Why this successor exists

The accepted V2 native first-entry source requires an exact fully-static Python
3.12 executable plus an exact pure-Python stdlib ZIP before it can derive a
first-entry binary. Draft #3816 defines the host-facing closed-runtime census,
but it does not derive those bytes.

The historical V7 static-runtime proof is not accepted as a V3 candidate. It
was built around `ctypes`, builtin `_ctypes` and libc `renameat2`
resolution, while the accepted V2 custody installer deliberately uses the
ctypes-free builtin `_voidfs.rename_noreplace` boundary. Its candidate
`--run` also remains intentionally HOLD.

This plan therefore defines a distinct V3 runtime-generation contract.

## Parent V3 bindings

The plan is based on closed-runtime Draft #3816 head:

`b0582a370a5f39b9f8f441c6c6bd59cfba4d2644`

and binds its production census source at Git blob:

`8914d9e8031377e3bcda4770194024e2f6fed2fd`.

It also binds:

- accepted V2 first-entry lock:
  `36d6c4a5ff825993371f109ee86a77b601e12d07`;
- accepted ctypes-free installer V2 lock:
  `486a6f6e1e2c594e60d6f9fe3fa32b03175630ae`;
- accepted installer V2 source:
  `bd8728be0b59bce3db0f559d0ebd01692f9a5844`.

A successor PR must not be opened until the exact parent closed-runtime focused
CI is green.

## Reviewed native bridge dependency

The runtime must compile the already-reviewed `_voidfs` implementation from
landed PR #3697, merge commit:

`cfc77165cdff35dd02090c1137473dadd385e8f4`.

Exact historical identities:

- bridge source:
  `ops/precision/void_v7_static_rename_noreplace_bridge_v1.c`
  → `34e32a5b77e0bd82138aa47ad4f8645fc93c0b9c`;
- bridge proof:
  `51dede10966f91d27399363c876da4ef3372f501`;
- bridge document:
  `7795d06f316385ddcf21fa06fc1e7c16403ba81b`.

The generated runtime must report `_voidfs` in
`sys.builtin_module_names`, import it with origin exactly `built-in`, and
expose only the public operation `rename_noreplace`.

No extension DSO, `ctypes`, `_ctypes`, libffi, `dlopen`, or `dlsym`
substitute is accepted.

## Required Python and stdlib shape

The future generator must select an exact CPython 3.12 source identity and an
exact compiler/linker/binutils toolchain before producing candidate bytes.

The Python output must be:

- Linux x86-64 ELF64 little-endian `ET_EXEC`;
- at least one `PT_LOAD`;
- no `PT_INTERP`;
- no `PT_DYNAMIC`;
- installed name `python3.12-static`;
- mode `0555`, single link.

The stdlib output must be one deterministic `python312.zip`:

- sorted deterministic entries;
- pure Python only;
- no `.pyc`;
- no `site-packages`;
- no `lib-dynload`;
- no native extension DSOs;
- exact direct and transitive import closure for the accepted installer V2;
- mode `0444`, single link.

The accepted installer directly imports:

`argparse`, `hashlib`, `importlib.machinery`, `importlib.util`,
`json`, `os`, `pathlib`, `stat`, `tempfile`, and `typing`.

A future generator must derive and bind the complete transitive closure rather
than merely copying those top-level modules.

## Reproducibility gate

A runtime candidate cannot exist until two clean builds from the exact same
source/toolchain/recipe produce byte-identical:

1. `python3.12-static`; and
2. `python312.zip`.

The receipt must bind exact byte lengths, SHA-256 digests, selected CPython
source identity, toolchain identities, build arguments, bridge source identity,
stdlib manifest, and both build results.

## Hosted candidate proof

Candidate execution remains a later source/test gate and must be non-root.

The future proof must preserve the older V7 runtime proof's useful isolation
ideas while removing its obsolete ctypes contract:

- authenticate candidate bytes through retained descriptors;
- copy Python and stdlib into same-UID-resistant immutable execution snapshots,
  such as sealed memfds or an equivalently reviewed mechanism;
- execute under a closed environment with `-I -B -S`;
- confine filesystem/network/process escape with Landlock/seccomp or an
  equivalently reviewed boundary;
- require `sys.path` to contain only the exact stdlib ZIP;
- require every loaded module origin to be builtin, frozen, or the exact ZIP;
- require exact builtin `_voidfs` identity and surface;
- execute the exact accepted installer V2 self-test under the candidate;
- emit a content-addressed candidate receipt without installing anything under
  `/opt`.

The historical V7 runtime candidate itself must never be relabeled as this V3
candidate.

## Persistent seal remains separate

The runtime derivation plan does not solve persistent host sealing.

Landed PR #3679, merge commit

`b186cb73b26ca50d73fb6f5c2326ead7ea59ed8d`

contains the reviewed generic
`CREATE_ONLY_CLOSED_TREE_V1` alternative. Its exact plan blob is
`9dde5523dca6ab240626430ce1c2b82f1cfe7f20`.

That plan records a historical Precision observation
`FS_IOC_MEASURE_VERITY -> ENOTSUP` for the filesystem backing `/opt`.
This V3 plan does **not** assume the capability remains unchanged: a fresh host
capability check is required before protected installation.

If fs-verity remains unavailable, a later V3-specific successor must separately
adopt and compose the reviewed create-only seal contract. This plan does not
select that seal mode and does not authorize its implementation or use.

## Still unselected

```text
cpython_source_identity_selected=false
toolchain_identity_selected=false
deterministic_build_recipe_selected=false
stdlib_transitive_closure_selected=false
python_candidate_derived=false
stdlib_candidate_derived=false
runtime_candidate_receipt_derived=false
runtime_candidate_accepted=false
v3_persistent_seal_mode_selected=false
```

## Authority boundary

```text
plan_only=true
runtime_generator_implementation_authorized=false
candidate_build_execution_authorized=false
candidate_runtime_execution_authorized=false
root_execution=false
package_installation=false
protected_filesystem_mutation=false
opt_runtime_install=false
fsverity_enablement=false
create_only_seal_installation=false
protected_runtime_accepted=false
first_entry_candidate_derived=false
protected_install_authorized=false
existing_target_replaced=false
replacement_apply_authorized=false
service_mutation=false
systemd_mutation=false
credential_access=false
wallet_or_signer_access=false
signing=false
rpc_or_transaction=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

Next gate:

`IMPLEMENT_SOURCE_ONLY_V3_STATIC_PYTHON_RUNTIME_GENERATOR_AND_HOSTED_CANDIDATE_PROOF`

**PROTECT THE CORE.**
