# VOID V7 static rename-noreplace bridge V1

Status: **source/test/CI implementation candidate only**.

This lane implements only the built-in CPython filesystem primitive required by
the landed static rename-noreplace bridge plan. It does not implement V6,
produce or execute a static CPython runtime candidate, install packages, mutate
protected host state, or authorize V6 apply.

## Reviewed plan binding

Plan:

`voidv7staticrenamenoreplacebridge1_651336b0d39ca60917fc03f441e7be835f6064574a99583bd0af3f3608a13598`

Plan Git blob:

`8dc063e54818ff9c5650ec9b34ba0102dab97656`

The plan records the real Precision/static-glibc compatibility HOLD: V5 resolves
`renameat2` through `ctypes.CDLL(None)`, while the accepted launcher model
requires a static ET_EXEC Python without PT_INTERP or PT_DYNAMIC. On the tested
Precision static-glibc model, `dlsym("renameat2")` does not resolve.

V5 remains unchanged.

## Built-in module contract

Source:

`ops/precision/void_v7_static_rename_noreplace_bridge_v1.c`

The module name is exactly:

`_voidfs`

It exposes exactly one Python-callable operation:

`rename_noreplace(parent_fd, old_leaf, new_leaf)`

The operation:

- is Linux x86-64 compile-time bound;
- requires `SYS_renameat2`;
- uses exactly `RENAME_NOREPLACE`;
- uses the same `parent_fd` for source and target;
- requires a non-negative integer descriptor whose `fstat()` is a directory;
- accepts only Python `str` ASCII leaf names of 1–255 bytes;
- rejects empty, slash-containing, non-ASCII, `.`, `..`, and equal names;
- returns `None` on success;
- raises `OSError` with the kernel errno on syscall failure.

There is no fallback to ordinary rename, link/unlink, shell, external helper,
dynamic loader, or host libc symbol lookup.

## Focused proof

The proof authenticates the exact source and plan blobs. It builds a disposable
hosted CPython embedder that registers `_voidfs` with
`PyImport_AppendInittab` before isolated interpreter initialization.

The hosted probe requires:

- module origin `built-in`;
- exactly one public module operation;
- fresh-file and fresh-directory no-replace publication;
- parent fsync after each successful test publication;
- existing regular-file, symlink and directory targets return `EEXIST` and
  preserve source and target generations;
- missing source returns `ENOENT` without creating the target;
- negative FD, regular-file FD, bad leaf and same-leaf inputs reject.

The hosted embedder is **test evidence only**. It is not the final fully-static
CPython 3.12 candidate and grants no runtime execution or release authority.

## Next gate

The landed plan requires this bridge to receive a distinct independent review
before V6 implementation. Until that happens:

- V6 installer implementation remains outside this lane;
- the static runtime proof's execution HOLD remains;
- no launcher/policy generation may claim V6 authority;
- no protected install/apply may consume this source.

## Authority boundary

This change does not authorize:

- V6 implementation or apply;
- runtime candidate execution;
- package installation;
- root execution;
- protected filesystem mutation;
- persistent-seal installation;
- service/systemd mutation;
- credential/key/signer access;
- RPC/transaction/payment acceptance;
- public presale or WC activation;
- treasury/liquidity action;
- funds movement.

PROTECT THE CORE.
