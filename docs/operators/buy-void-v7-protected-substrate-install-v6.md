# Buy VOID V7 protected substrate installer V6 — built-in no-replace bridge

Status: **source/test/CI successor only**. No protected host apply is authorized or
performed by this generation.

## Purpose

Precision proved that the landed V5 publication primitive is incompatible with
the reviewed fully-static launcher/runtime model on the tested Ubuntu/glibc
host. V5 resolves `renameat2` through `ctypes.CDLL(None)`, while a static
ET_EXEC without `PT_INTERP` or `PT_DYNAMIC` did not export that symbol
through `dlsym(NULL, ...)`.

V6 leaves V5 byte-for-byte unchanged and replaces only that dynamic symbol
dependency with the separately reviewed built-in bridge merged in #3697.

Reviewed bridge plan:

`voidv7staticrenamenoreplacebridge1_651336b0d39ca60917fc03f441e7be835f6064574a99583bd0af3f3608a13598`

Plan blob:

`8dc063e54818ff9c5650ec9b34ba0102dab97656`

Bridge source blob:

`34e32a5b77e0bd82138aa47ad4f8645fc93c0b9c`

Landed V5 predecessor blob:

`632f3371ad3095e6a8fdf338b24c34431abe7d2c`

## Exact V6 source generation

Installer:

`ops/precision/void_buy_void_v7_protected_substrate_install_v6.py`

Git blob:

`bff71178f3771a04d96d4f4a9aabe88e050eb683`

Installed qualifier successor:

`ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v5.py`

Git blob:

`e078cc69386f513c0bc4181ab12499d58356af61`

Qualifier V5 embeds the exact V6 installer Git blob. V6 itself retains
qualifier V4 only as a historical predecessor dependency and requires a
qualifier V5 successor. This avoids a circular V6/qualifier self-hash while
making the qualification source generation explicit.

## Publication bridge

V6 imports no `ctypes` and has no `CDLL`, `dlopen` or `dlsym` path.

Before publication it requires:

- `_voidfs` to appear in `sys.builtin_module_names`;
- imported module origin exactly `built-in`;
- public module surface exactly `rename_noreplace`;
- the operation to be callable.

The reviewed bridge receives the retained install-parent directory FD and the
two leaf names. It performs one Linux x86-64
`SYS_renameat2(..., RENAME_NOREPLACE)` call with that same parent FD.

V6 preserves the V5 publication ordering:

1. authenticate install-parent custody and retained descriptor identity;
2. call built-in `rename_noreplace`;
3. on success, record publication immediately;
4. fsync the retained parent;
5. revalidate parent descriptor generation and custody.

Bridge `OSError.errno` is normalized to the existing
`rename_noreplace_failed:<errno>` InstallError reason. A non-OSError bridge
exception becomes an explicit bridge-contract failure. There is no fallback to
ordinary rename, link/unlink composition, shell, external binary or dynamic
loader.

## V6 self-test

The actual V6 self-test must run inside a Python generation where `_voidfs` is
registered as a true built-in module. It exercises real disposable filesystem
operations for:

- fresh regular-file publication;
- fresh directory publication;
- existing regular-file, symlink and directory target rejection with
  `EEXIST`, preserving source and target;
- missing source rejection with `ENOENT`;
- negative and non-directory FDs;
- empty, dot, dot-dot, slash-containing, embedded-NUL, non-ASCII, over-255-byte,
  non-string and same-name leaves;
- errno normalization.

All inherited V5 source/tree/provenance, protected full-history replica,
candidate identity, ACL/nonwritability, retained-parent, publication-truth and
partial-publication semantics remain.

## Fresh operation namespace

```text
schema=void_buy_void_v7_protected_substrate_install_plan_v6
plan_prefix=voidv7substrateinstallplan6_
confirmation=INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V6_CREATE_ONLY
```

The source, native, selector, live shallow release and protected full-history
replica contracts remain the V5 contracts. V6 uses new stage names so V5 stage
state cannot accidentally become V6 authority.

## Installed qualifier V5

Qualifier V5 preserves qualifier V4's runtime verification logic. It adds only a
source-generation binding to installer V6 and corresponding source-plan/self-
test receipts. Runtime qualification remains external-repository-observer-free.

## Focused proof

The proof authenticates exact V5, V6, qualifier V4, qualifier V5, bridge and
bridge-plan blobs. It parses both installer sources and requires every
pre-existing V5 function outside the explicit V6 transition allowlist to have an
identical Python AST.

It similarly requires qualifier V4/V5 runtime functions to remain identical
outside `source_plan` and `self_test`.

The proof then compiles a disposable hosted CPython embedder, registers the
reviewed bridge with `PyImport_AppendInittab` before isolated interpreter
initialization, and runs the real V6 `--self-test`. This is **hosted source
test evidence**, not acceptance of the future fully-static CPython runtime.

## Remaining lifecycle gates

V6 source does not by itself satisfy the remaining bridge-plan requirements.
Before any protected V6 apply there must still be separately reviewed and
accepted generations for at least:

- the static-runtime proof successor that binds V6 and `_voidfs`;
- a fully-static CPython candidate with `_voidfs` listed in
  `sys.builtin_module_names`;
- the same-UID-resistant immutable execution snapshot;
- the persistent host content-seal/closed-tree production manifest;
- a new trusted root launcher generation, because the existing launcher pins V5;
- host evidence and an operation-bound V6 plan.

No historical launcher, source CI result or hosted embedder may be interpreted
as V6 root-execution or protected-apply authority.

## Authority boundary

This generation does not authorize or perform:

- runtime candidate execution;
- root execution or package installation;
- protected filesystem mutation;
- V6 apply;
- persistent seal installation;
- service/systemd mutation;
- credential/private-key/signer access;
- RPC, transaction or payment acceptance;
- public presale/WC activation;
- treasury/liquidity action;
- funds movement.

PROTECT THE CORE.
