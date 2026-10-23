# VOID V7 source-release full-history reseal V2

Status: **source/test/CI only**. No Precision protected filesystem or runtime
mutation is authorized.

## Purpose

V2 is the exact-generation successor to the reviewed V1 reseal builder. It
preserves the V1 algorithm and safety boundary while rebinding the source
identity to the accepted canonical V5 lock generation.

Exact target:

- commit: `3dc143bb16d7c1d1d5e0f674881cf12621818661`;
- tree: `21e7fae2d3dfeb6a918c11799ae6644c6ca70a64`;
- parent: `b9d8ad7aec19592b104d47da4a496710d4fde8db`;
- reachable commits: `18,390`.

The reachable-commit count was independently derived from GitHub's commit
collection for the exact target head rather than inferred from a local mutable
checkout.

## Algorithm continuity

V2 is mechanically derived from reviewed V1
`ops/precision/void_v7_source_release_full_history_reseal_v1.py`
(blob `030182d544a92cd6c67868fa4c4f3e83188e4249`).

Only the version marker and exact target head/tree/parent/reachable-count
constants change. The following V1 controls remain intact:

- isolated unoptimized Python;
- clean non-shallow canonical `main` checkout;
- complete reachable-object graph;
- no shallow/grafts/alternates/commondir/config.worktree;
- closed Git config;
- bounded one-process `pack-objects` construction;
- retained pack/index descriptors and terminal digest/generation checks;
- descriptor-relative worktree materialization;
- regular-file-only target tree contract;
- physical passwd-derived `/home/<user>/Downloads` output boundary;
- source-checkout overlap rejection;
- mount-point/symlink/control-character rejection;
- nonrecursive failure cleanup with truthful residual-state receipts.

## Authority

`--self-test` and `--plan` are read-only.

`--build` creates only a disposable current-UID candidate below the physical
account Downloads directory. As in V1, after entering that write boundary the
builder does not claim same-UID namespace isolation. A GREEN candidate is
untrusted input for a separately reviewed root-custodied source-stage gate.

This lane grants no authority to mutate `/opt`, replace
`/opt/void-buy-void-v7-reviewed-v1`, replace the production deployment
receipt, restart a service, contact providers, access credentials or keys,
sign, broadcast transactions, accept payments, activate presale/WC, or move
funds.

The candidate is intended to satisfy the full-history provenance prerequisite
identified by Draft #3706. It does not implement or authorize the source +
receipt exchange itself.

PROTECT THE CORE.

## Current accepted-V5 target — October 23, 2026

This generation binds current accepted V5 head `3dc143bb16d7c1d1d5e0f674881cf12621818661`, tree `21e7fae2d3dfeb6a918c11799ae6644c6ca70a64`, sole parent `b9d8ad7aec19592b104d47da4a496710d4fde8db`, and GitHub commit-collection reachable count `18,390`. The prior target count method was independently reproduced against the old `18,357` generation before advancing these constants. No protected install authority is added.
