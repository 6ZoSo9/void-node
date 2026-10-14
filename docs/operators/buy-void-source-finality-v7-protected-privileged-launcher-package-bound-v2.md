# Buy VOID V7 native-preentry protected privileged launcher V2

## Purpose

Close the privileged first-instruction trust gap in the V7 receipt launcher
without repinning the frozen #2954 package lock.

The supported source design now has three separate boundaries:

1. a small native pre-entry is the only privileged first code;
2. the shell launcher body is a non-executable reviewed file reached only
   through a retained descriptor from that native pre-entry; and
3. the audited Node/TSX package bytes are re-inventoried from the exact protected
   source tree, then the exact TSX/esbuild runtime is independently materialized
   and exercised with an inert TypeScript transform before any allowlisted receipt
   tool can run.

The #2954 V1 package lock remains historical evidence for its exact launcher
generation. This successor does not edit or reinterpret that frozen lock.

## Native first-entry boundary

Reviewed native source:

```text
ops/precision/void_buy_void_source_finality_v7_native_preentry_v1.c
```

The future installed entry path is fixed:

```text
/opt/void-buy-void-v7-preentry-v1/void_buy_void_source_finality_v7_native_preentry_v1
```

The reviewed protected source root is fixed:

```text
/opt/void-buy-void-v7-reviewed-v1
```

and the non-executable launcher body is fixed beneath it:

```text
/opt/void-buy-void-v7-reviewed-v1/ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash
```

Before any shell source is evaluated, the native pre-entry:

- requires effective UID 0 supplied by the operator's separate privilege
  boundary;
- proves `/proc/self/exe` is the exact fixed native pathname;
- requires root-owned, non-group/world-writable, symlink-free ancestry;
- rejects setuid/setgid or group/world-writable native/interpreter files;
- opens fixed `/usr/bin/bash` with `O_NOFOLLOW` and rechecks
  path/descriptor identity;
- opens the fixed launcher body with `O_NOFOLLOW`, requires it to be
  root-owned, single-link, non-group/world-writable and **non-executable**,
  then retains that exact descriptor across exec;
- invokes bash with `fexecve()`, `--noprofile --norc`, and the launcher
  pathname supplied as `/proc/self/fd/<retained-fd>`; and
- supplies a minimal fixed environment containing the native-entry marker.

The historical `.sh` path remains executable only as a fail-only retirement stub so the repository-wide `ops/**/*.sh` executable guard stays intact. It cannot dispatch a receipt tool.\n\nThe shell body fails closed unless both the native marker and descriptor-form
`BASH_SOURCE[0]` are present. Direct privileged invocation of either the
repository checkout shell or the installed shell body is unsupported.

The native executable itself has no setuid transition, service mutation, RPC,
credential/key, signer, wallet, transaction, payment, WC, presale, treasury,
or funds capability.

## Protected source and package runtime

After native entry, the shell still requires the existing protected source
custody check under the designated unprivileged runtime UID/GID, exact
commit/tree, branch `main`, and a clean source tree.

The current launcher does **not** consume the #2954 package lock manifest.
Embedding a lock that binds the launcher back into that launcher would create
an identity cycle.

Instead it pins the reviewed source blob of:

```text
scripts/prove_void_buy_v7_privileged_launcher_package_runtime_v2.mjs
```

That proof independently re-inventories:

- the accepted post-#2865 `ethers + express` package profile;
- `tsx@4.23.15`;
- `esbuild@0.28.2`; and
- the exact Linux-x64 esbuild platform package,

from the audited package/lock bytes in the same protected tree. It also derives
the exact three-package `tsx + esbuild + @esbuild/linux-x64` byte closure into
a purpose-built private materialization outside the repository, makes only the
reviewed Linux-x64 esbuild binary executable without making it writable, and
runs an inert TypeScript-only probe through the exact TSX CLI under Node
filesystem permissions. TSX receives a dedicated private scratch directory via
`TMPDIR`/`TMP`/`TEMP`; filesystem writes are permitted only to that scratch
subtree, never to the copied package tree or probe source. The proof then
re-inventories the private package bytes and requires no probe or package
mutation. It also
checks the current launcher/native gate contracts and requires all
production/economic authority flags to remain false.

Node 22, 24 and 26 must derive byte-identical V2 package-runtime evidence.

A later versioned candidate/lock may bind the final native source plus launcher
generation as review evidence, but that lock is deliberately not fed back into
the launcher.

## Disposable CI boundary

Hosted CI may:

- compile the native source in the runner temporary directory;
- run its source-only `--self-test`;
- construct disposable root-owned `/opt` fixtures;
- install a runner-only `/usr/bin/node` fixture when the hosted image lacks
  that production path;
- exercise qualification-only positive/negative cases; and
- remove those disposable fixtures afterward.

That is not Precision installation evidence.

The focused proof requires:

```text
native_preentry_first_instruction=true
native_bash_descriptor_execution=true
native_launcher_descriptor_execution=true
direct_shell_privileged_invocation_supported=false
protected_root_owned_source_positive=true
tsx_private_materialization_verified=true
tsx_inert_transform_execution_verified=true
esbuild_runtime_execution_verified=true
privileged_launcher_package_runtime_verified=true
privileged_tool_execution_performed=false
funds_movement=false
```

## Authority boundary

Even GREEN source/CI remains:

```text
protected_source_install_authorized=false
privileged_receipt_execution_authorized=false
runtime_service_mutation=false
credential_access=false
wallet_or_signer_access=false
rpc_call=false
transaction_broadcast=false
public_presale_activation=false
funds_movement=false
```

Installing either fixed `/opt` tree on Precision is a separate privileged
operator gate. Real receipt plan/apply, live-process/provider evidence, payment,
transaction, and coupled presale/WC activation remain later gates.

**PROTECT THE CORE.**
