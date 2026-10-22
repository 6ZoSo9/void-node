# Buy VOID V7 static rename-noreplace bridge plan V1

## Status

Plan/proof/CI only.

This lane defines the versioned successor contract required by the observed
static-runtime incompatibility between landed V5 and launcher V2. It does not
implement V6, build a Python candidate, install packages, execute a candidate,
or authorize any protected host action.

Plan ID:

`voidv7staticrenamenoreplacebridge1_651336b0d39ca60917fc03f441e7be835f6064574a99583bd0af3f3608a13598`.

## Bound landed generations

Current canonical base for this plan:

`main@1d8c8804d75fa12e1fa9fcfffe7bc93940fbd56c`.

Landed V5:

- path: `ops/precision/void_buy_void_v7_protected_substrate_install_v5.py`
- Git blob: `632f3371ad3095e6a8fdf338b24c34431abe7d2c`

V5 imports `ctypes` only for its native publication primitive and self-test:
it resolves `renameat2` through `ctypes.CDLL(None)`.

Landed trusted launcher V2:

- path: `ops/precision/void_buy_void_v7_protected_substrate_root_launcher_v2.c`
- Git blob: `0aa8d3a990de662b8c3c9928d4c31452d8299ca7`

Launcher V2 requires a static x86-64 `ET_EXEC` Python and rejects both
`PT_INTERP` and `PT_DYNAMIC`.

## Precision compatibility evidence

A non-root Precision feasibility receipt established, for the tested Ubuntu /
glibc static link model:

- static control linked successfully;
- resulting ELF was `ET_EXEC`;
- `PT_INTERP` / `PT_DYNAMIC` were absent;
- `dlopen(NULL)` succeeded;
- `dlsym(..., "renameat2")` did not resolve.

Disposition:

`STATIC_PYTHON_V5_RENAMEAT2_COMPAT_HOLD`.

That receipt is diagnostic operator evidence, not release authority and not a
claim about every libc implementation. It is sufficient to forbid assuming that
the current V5 + launcher-V2 contract is compatible with a static glibc Python.

## Required versioned successor

V5 remains unchanged.

A future V6 may replace only the native no-replace publication dependency with
a separately reviewed, statically integrated CPython built-in module.

The bridge must expose one filesystem mutation operation:

`rename_noreplace(parent_fd, old_leaf, new_leaf)`.

The operation must:

- use the Linux x86-64 `SYS_renameat2` syscall directly;
- use exactly `RENAME_NOREPLACE`;
- require a non-negative integer `parent_fd` whose `fstat()` proves a
  directory;
- use that same already-retained parent directory descriptor for source and
  destination;
- accept only Python `str` leaf names whose UTF-8 representation is exact
  ASCII, 1–255 bytes, contains no NUL or slash, is neither `.` nor `..`,
  and requires `old_leaf != new_leaf`;
- return `None` on success and raise `OSError` carrying the kernel errno on
  failure;
- reject unsupported syscall/kernel behavior without fallback;
- never fall back to `os.rename`, link/unlink composition, shell, external
  executables, `dlopen`, `dlsym`, or an arbitrary host libc.

V6 must catch bridge `OSError` and normalize its `errno` into V5's existing
`InstallError("rename_noreplace_failed:<errno>")` reason shape before any
publication/failure receipt is emitted.

Existing destination files, symlinks and directories must remain untouched and
must fail as no-replace conflicts. The source and destination generations must
also remain unchanged on every failed no-replace attempt.

## V5 semantics that V6 must preserve

The bridge does not authorize a broader V6 rewrite. V6 must preserve:

- retained install-parent descriptor provenance and generation checks;
- exact rejection tests for invalid fd, invalid leaf, same-leaf and missing
  source cases, in addition to existing-destination file/symlink/directory
  conflicts;
- publication truth recorded immediately after successful rename, before parent
  fsync can fail;
- parent-directory fsync after publication;
- partial-publication and failure receipt semantics;
- live shallow release cross-binding;
- protected full-history replica authority;
- candidate native and selector identities;
- all service/key/signing/payment/activation/funds boundaries.

CI must prove a narrow semantic-delta allowlist from V5 to V6.

V6 must receive a new plan schema, plan prefix and confirmation token.

## Static-runtime consequence

A successor static runtime proof must bind V6 and the built-in bridge.

The bridge must be present in `sys.builtin_module_names`; it may not be a
shared-object extension or pathname-loaded helper.

The successor proof must no longer require `ctypes` or `libffi` merely to
perform the no-replace publication primitive.

The Python executable must remain static x86-64 `ET_EXEC` with neither
`PT_INTERP` nor `PT_DYNAMIC`.

The immutable-snapshot same-UID resistance gate and the persistent host content-seal gate remain separate and mandatory. Solving this bridge does not
solve either gate.

## Required successor generations

Because current launcher V2 pins V5, V6 requires a new trusted-root launcher
generation.

Installed qualification must also advance to a version that binds the accepted
V6 source generation.

## Lifecycle gate

Implementation must not begin from this plan without a distinct review of this
exact plan generation.

Next gate:

`DISTINCTLY_REVIEW_STATIC_RENAME_NOREPLACE_BRIDGE_PLAN_BEFORE_V6_IMPLEMENTATION`.

## Authority

This plan authorizes none of the following:

- V6 implementation;
- built-in bridge implementation;
- runtime candidate execution;
- root execution;
- package installation;
- protected filesystem mutation;
- persistent seal installation;
- fs-verity enablement;
- V6 protected apply;
- service/systemd mutation;
- credentials, private keys or signing;
- RPC/transaction/payment;
- public presale or WC activation;
- treasury/liquidity action;
- funds movement.

PROTECT THE CORE.
