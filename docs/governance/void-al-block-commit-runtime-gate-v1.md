# VOID AL canonical block-commit runtime gate v1

Marker: `VOID_AL_BLOCK_COMMIT_RUNTIME_GATE_V1_20260824`

Parent: `VOID_ALIGNMENT_LAYER_SOVEREIGN_EMERGENCY_CONTROL_V1_20260824`

Chain: `2050` / VOID Mainnet-0

Status: **runtime-reachable, disabled by default, not authorized for live activation**.

## Purpose

This is the first concrete runtime-integration slice for the Alignment Layer. It places AL in front of the canonical `SegStore` block-persistence boundary without trying to combine block persistence, transaction admission, Work Credits, validators, governance, treasury and economic settlement into one change.

The reviewed property is narrow:

> When the v1 block-commit runtime gate is enabled, a canonical block write must pass deterministic AL pre-accept checks and deterministic post-apply checks. A direct call to the historical raw `saveBlockCommit` primitive is not alternate authority; it is a safe-mode tripwire.

When the gate is disabled, its installer does not patch `SegStore` and current Mainnet-0 behavior is preserved.

## Runtime bootstrap

`src/index.ts` already imports `src/chain/native_block_execution_precommit_integration_v1.ts` before the runtime creates its `SegStore` instances.

That existing small integration module now invokes:

`installVoidAlignmentLayerBlockCommitRuntimeFromEnvironmentV1()`

The enable control is exactly:

`VOID_AL_BLOCK_COMMIT_RUNTIME_V1=1`

Accepted values are:

- unset / empty: disabled;
- `0`: disabled;
- `1`: enabled;
- any other present value: fail-closed startup error.

No new listener, HTTP route, credential, signer or service is created.

## Disabled-by-default compatibility

If the gate is disabled, the installer returns without modifying `SegStore.prototype`.

This matters because source merge is not runtime activation. Merging this contract must not change current block production, follower import or WAL replay behavior unless an operator later supplies the exact reviewed enable control.

## Canonical write lease

When enabled, the installer guards these existing `SegStore` methods:

- `saveBlock(...)` — modern canonical append;
- `saveAuthorizedLegacyCommitDirectV2fs(...)` — explicit legacy compatibility append;
- internal `saveBlockCommit(...)` — raw durable commit primitive;
- internal `persistHeadAtomic(...)` — canonical-head persistence terminal;
- internal `replayWalAllBestEffort(...)` — validated recovery/replay context.

A public canonical method receives a short in-process commit lease only after its AL pre-accept decision is `allow`. The raw commit method accepts that internal lease and otherwise fails closed.

The lease is process-local implementation state, not a bearer credential, not serializable, and not exposed to callers.

## AL pre-accept checks

The runtime adapter supplies the complete reviewed `ordinary_state / pre_accept` check set to the merged AL evaluator.

Evidence binds at least:

- fixed AL runtime policy identity;
- Chain-2050 identity;
- canonical candidate digestability;
- existing block-transition validation;
- modern Ed25519 proposer signature/public-key identity, or the explicitly authorized legacy compatibility method;
- current canonical head / exact idempotence / next-height relation; and
- candidate transition validity.

The caller never supplies severity.

A failed actor-security check quarantines the actor before persistence. A failed policy-integrity check would require safe mode under the parent AL severity contract.

## AL post-apply checks

After a canonical method returns, the adapter independently reopens the stored block and current head and supplies the complete reviewed `ordinary_state / post_apply` check set.

Post-apply evidence binds:

- policy identity;
- exact stored candidate identity;
- independent transition revalidation; and
- canonical head consistency.

Any post-apply failure is `safe_mode` under the merged AL contract. The write may already exist; the safety response is therefore to stop further mutation, preserve evidence and require diagnosis rather than pretend the failed postcondition can be undone automatically.

## WAL replay lease

`SegStore` constructor replay is a special internal recovery path. Existing replay already validates candidate height/parent/block shape before its raw commit and head persistence.

When AL is enabled, `replayWalAllBestEffort(...)` receives an explicit internal `wal-replay` lease. Each replayed raw block receives AL pre-accept checks before durable commit; the matching `persistHeadAtomic(...)` terminal performs the corresponding AL post-apply check.

A replay commit that never reaches its head terminal leaves the AL runtime in safe mode. Replay is not allowed to become a hidden raw-commit bypass.

## Direct raw-commit tripwire

The repository still contains historical runtime code that directly reaches `store.saveBlockCommit(...)` instead of using the canonical public append methods.

V1 intentionally does **not** grandfather those callers.

With AL enabled, an unleased raw commit:

1. writes no block;
2. advances no head;
3. increments the direct-bypass tripwire;
4. latches process-local safe mode; and
5. rejects all later block mutation attempts until restart/recovery.

Marker:

`VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1`

This means the gate cannot be enabled live while those historical callers remain on an active production path.

## Current activation HOLD

Live activation is explicitly held on:

`HOLD_AL_BLOCK_COMMIT_DIRECT_CALLERS_NOT_MIGRATED`

A follow-up source lane must inventory every runtime `saveBlockCommit`/equivalent direct persistence path, migrate each legitimate caller through one reviewed canonical method or equivalent AL lease boundary, and prove no direct unleased path remains reachable before live activation can be considered.

The current PR therefore makes bypass attempts fail closed without claiming activation readiness.

## Safe-mode persistence limitation

The v1 block-commit gate latches safe mode in process memory. It deliberately does not claim durable cross-restart emergency-state persistence.

That is sufficient for this source integration proof but insufficient for production activation. Durable, authenticated safe-mode/emergency state remains a separate required activation gate under the merged Sovereign Emergency Control contract.

A process restart must never be represented as constitutional `RESUME` once live activation exists.

## Proof requirements

Focused proof uses the real `SegStore` and must demonstrate:

- disabled policy performs no prototype patch;
- valid signed modern canonical block passes pre/post AL and persists;
- exact idempotent canonical append remains valid;
- a real durable WAL intent is replayed under the AL replay lease;
- a wrong-signed proposer is quarantined before any block/head write;
- direct raw `saveBlockCommit` is rejected before write and latches safe mode;
- safe mode is sticky and blocks a later valid canonical write;
- ordinary authentication is unchanged;
- no Sovereign USB is accessed;
- no production emergency signature is created;
- no live Chain-2050 mutation is performed; and
- no funds move.

## Non-goals

This lane does not yet gate:

- public transaction admission / mempool mutation;
- validator-set mutation;
- Work Credit writes;
- governance state changes;
- economic settlement;
- treasury movement;
- service/runtime activation control beyond this disabled-by-default bootstrap; or
- live network-wide Sovereign PAUSE/RESUME propagation.

Each should be integrated at its own real mutation choke point rather than inferred from the block gate.

## Authority boundary

Source/proof/docs/CI only. No deployment, service restart, live environment change, live AL enablement, production pause/resume, key/credential/private-file access, wallet/signer use, transaction construction/broadcast, validator or Work Credit mutation, treasury/liquidity action, or funds movement is authorized or performed by this lane.

*Gate one real mutation boundary. Fail closed on bypass. Do not activate before the bypass inventory is empty.*
