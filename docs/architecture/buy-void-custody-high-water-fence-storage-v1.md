# Buy VOID create-only custody high-water fence storage V1 — staged, unmounted

## Purpose

The source-only [transition fence planner #2692](https://github.com/6ZoSo9/void-node/pull/2692)
defines one immutable, permanent fence slot for each exact prior high-water.
The [current writer correction #2713](https://github.com/6ZoSo9/void-node/pull/2713)
prevents deletion of another writer's temporary file after a failed O_EXCL.
It does **not** serialize two successful concurrent writers. This separate
Draft begins the missing *durable fence storage* side without changing any
installed writer or monetary authority. It is stacked directly on the
source-only planner #2692 to reuse its **exact canonical fence record**.

## Storage protocol

The new module takes only a preprovisioned private trusted fence-directory
path and exact canonical `record_bytes` from the reviewed planner. The
directory must be a real Linux directory owned by the current UID and private
to that owner (mode not accessible to group/other).

- From the filesystem root, each directory component is opened relative to
  a retained `O_DIRECTORY|O_NOFOLLOW` descriptor, checking pathname vs fd
  metadata along the way; the private fence root fd remains pinned during
  the complete operation.
- The sole permitted filename is built from the planner's fixed
  `voidchwf1_<64hex>` slot identity plus `.json`, never from arbitrary
  request input. File creation uses `O_CREAT|O_EXCL|O_NOFOLLOW` and 0600.
- After exclusive open, the new complete immutable fence bytes are written,
  fsynced, closed, and the private directory is fsynced. A retained fd-backed
  read verifies the same record bytes against the visible pinned name.
- If O_EXCL encounters an existing slot, the implementation NEVER overwrites,
  unlinks or reaps it. It can re-read an exact same transition, fsync its file
  and directory and report `exists_same_transition`. Competing successor,
  damaged/partial, symlink, nonprivate or mismatched record **HOLDs**.
- If write, fd-close or fsync fails after create, the slot stays on disk.
  This is deliberately conservative: an incomplete permanent fence may
  require **independently reviewed manual recovery**, rather than unsafe
  automatic deletion/replacement or silent presumed durability.

Permanent slot identity and conflict policy come from the exact #2692
planner, not a second payment, generation or high-water identity algorithm.
The source does not call the actual `atomicAdvance()` method in #2713 and
does not claim to guard its high-water rename. That integration requires
separate review and new tests.

## Disposable two-process proof

The inert proof only creates private 0700 fixture directories under OS temp.
Two deliberately different canonical next high-water candidates from the
**same prior bytes** produce the exact same permanent slot name. Three
pairwise races launch two independent Node processes simultaneously. Exactly
one can O_EXCL-create the record; the loser HOLDS with a known conflict or
in-flight record observation. The winning record is preserved byte-for-byte,
while exact replay of that record is idempotent.

Additional adversaries check corrupt preexisting bytes, a symlink preplant,
nonprivate directory permissions, and a simulated fsync failure after
successful exclusive creation. These cannot remove or repurpose an unknown
permanent slot. A following exact replay can fsync and reobserve a complete
same-record fixture without exposing any live custody path.

The exact-head Node 22/24/26 GitHub workflow compares source-only negative
proof receipts byte-for-byte and runs no deployment or real custody service.
No private customer file, signer, wallet, transaction, production RPC or
funds movement is accessed.

## What remains open

This is a **fence-storage mechanism**, NOT a qualified, integrated
cross-process high-water writer. It has `high_water_writer_integration=false`
and `cross_process_high_water_rename_serialization_verified=false`.
Before monetary authority, the real writer must (1) derive canonical fence
bytes from custody observations, (2) create/verify the permanent slot
**before** any high-water replacement, (3) recover ambiguous crashes without
unsafe deletion, (4) preserve read-only inspection, and (5) authenticate
the exact source and shared custody UID/fence directory in a reviewed
installed runtime. Test two independent concurrent real *synthetic*
`advance()` calls, not only the storage module, and prove no older
generation can overwrite a later one.

Existing [#2711](https://github.com/6ZoSo9/void-node/pull/2711),
[#2712](https://github.com/6ZoSo9/void-node/pull/2712) and
[#2713](https://github.com/6ZoSo9/void-node/pull/2713) remain separate
writer repairs. Neither the actual high-water writer nor its files are
modified in this Draft. Reviewer acceptance, merge and installed service
qualification remain distinct holds.

```text
high_water_writer_integration=false
cross_process_high_water_rename_serialization_verified=false
custody_reserve_method_enabled=false
custody_recover_method_enabled=false
production_allocation_mutation_ready=false
funds_moved=false
```

**No Ready/merge, host/service mutation, private customer file, signer/wallet,
transaction, Chain-2050/WC, allocation, presale/market, inventory/treasury/
liquidity or funds action. PROTECT THE CORE.**
