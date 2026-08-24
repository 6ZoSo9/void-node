# VOID AL canonical block-commit runtime gate v1

Marker: `VOID_AL_BLOCK_COMMIT_RUNTIME_GATE_V1_20260824`

Parent: `VOID_ALIGNMENT_LAYER_SOVEREIGN_EMERGENCY_CONTROL_V1_20260824`

Chain: `2050` / VOID Mainnet-0

Status: **source-complete runtime primitive, explicit bootstrap not mounted, not authorized for live activation**.

## Purpose

This is the first concrete runtime-integration slice for the Alignment Layer. It places AL in front of the canonical `SegStore` block-persistence boundary without trying to combine block persistence, transaction admission, Work Credits, validators, governance, treasury and economic settlement into one change.

The reviewed property is narrow:

> When the v1 block-commit runtime gate is explicitly bootstrapped and enabled, a canonical block write must pass deterministic AL pre-accept checks and deterministic post-apply checks. A direct call to the historical raw `saveBlockCommit` primitive is not alternate authority; it is a safe-mode tripwire.

Merging this source does not mount the bootstrap, does not change the normal node entry point, and does not enable AL on a live node.

## Explicit runtime bootstrap

The runtime bootstrap is a dedicated module:

`src/security/void_alignment_layer_block_commit_runtime_bootstrap_v1.ts`

The normal `src/index.ts` entry point does **not** import that module in this generation. The older native block-execution precommit integration remains preparation-only and retains its existing `environment_read: false` / no-state-authority contract.

A later reviewed activation lane may mount the compiled bootstrap explicitly with Node's preload mechanism, for example:

```text
node --import ./dist/security/void_alignment_layer_block_commit_runtime_bootstrap_v1.js dist/index.js
```

That command is an architectural activation shape, not an instruction to change a live service in this PR.

The gate enable control is exactly:

`VOID_AL_BLOCK_COMMIT_RUNTIME_V1=1`

Accepted values are:

- unset / empty: disabled;
- `0`: disabled;
- `1`: enabled;
- any other present value: fail-closed bootstrap error.

No new listener, HTTP route, credential, signer or service is created.

## Proposer-authority activation prerequisite

A block carrying its own Ed25519 public key can prove signature integrity and bind that key to its proposer ID. That is not, by itself, proof that the proposer is authorized by VOID.

The existing block validator already supports a stronger proposer-authority policy through:

`VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1`

and its reviewed allowlist / validator-runtime-truth authority sources.

The explicit AL bootstrap therefore refuses `VOID_AL_BLOCK_COMMIT_RUNTIME_V1=1` unless proposer authority is also required. Marker:

`VOID_AL_BLOCK_COMMIT_PROPOSER_AUTHORITY_REQUIRED_V1`

This prevents an operator from accidentally enabling AL while the validator remains in its backward-compatible default-off proposer-authority mode.

AL reuses the existing block validation result rather than inventing a second proposer schedule. When proposer authority is required, that validation includes the configured authority source as well as signature, block-shape, roots and parent linkage.

## Disabled/unmounted compatibility

The normal node startup path does not preload the AL bootstrap in this generation. Therefore source merge alone cannot patch `SegStore.prototype`.

Even when the bootstrap is explicitly preloaded later, unset/empty/`0` causes the installer to return without modifying `SegStore.prototype`.

This separation matters because source merge is not runtime activation.

## Canonical write lease

When explicitly bootstrapped and enabled, the installer guards these existing `SegStore` methods:

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
- the existing proposer-authority result when activation prerequisites are met;
- modern Ed25519 proposer signature/public-key identity, or the explicitly authorized legacy compatibility method;
- current canonical head / exact idempotence / next-height relation; and
- candidate transition validity.

The caller never supplies severity.

A validly signed but unauthorized modern proposer fails the authority check and is rejected before persistence. A malformed/invalid modern proposer signature fails the actor-security tripwire and can quarantine the actor before persistence. A failed AL policy-integrity check requires safe mode under the parent AL severity contract.

## AL post-apply checks

After a canonical method returns, the adapter independently reopens the stored block and current head and supplies the complete reviewed `ordinary_state / post_apply` check set.

Post-apply evidence binds:

- policy identity;
- exact stored candidate identity;
- independent transition/authority revalidation; and
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
5. rejects all later block mutation attempts until reviewed recovery.

Marker:

`VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1`

This means the gate cannot be enabled live while those historical callers remain on an active production path.

## Current activation HOLDs

Live activation remains explicitly held on all of the following:

`HOLD_AL_BLOCK_COMMIT_BOOTSTRAP_NOT_MOUNTED`

The normal node entry point intentionally does not preload the bootstrap. A later activation lane must identify the exact operator/service launcher and prove the preload plus environment binding before any live change.

`HOLD_AL_BLOCK_COMMIT_DIRECT_CALLERS_NOT_MIGRATED`

A follow-up source lane must inventory every runtime `saveBlockCommit`/equivalent direct persistence path, migrate each legitimate caller through one reviewed canonical method or equivalent AL lease boundary, and prove no direct unleased path remains reachable.

`VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1`

This is an activation prerequisite, not something this PR changes on a live node. The selected existing authority source must itself be reviewed and operationally valid.

The current PR therefore provides the enforcement primitive and proves its fail-closed properties without claiming activation readiness.

## Safe-mode persistence limitation

The v1 block-commit gate latches safe mode in process memory. It deliberately does not claim durable cross-restart emergency-state persistence.

That is sufficient for this source integration proof but insufficient for production activation. Durable, authenticated safe-mode/emergency state remains a separate required activation gate under the merged Sovereign Emergency Control contract.

A process restart must never be represented as constitutional `RESUME` once live activation exists.

## Proof requirements

Focused proof uses the real `SegStore` and must demonstrate:

- normal `src/index.ts` does not mount the explicit bootstrap;
- the older preparation-only precommit module still has no environment-read/bootstrap authority;
- explicit bootstrap rejects AL enablement while proposer authority is not required;
- disabled policy performs no prototype patch;
- valid signed **and authorized** modern canonical block passes pre/post AL and persists;
- validly self-signed but unauthorized proposer is rejected before persistence;
- exact idempotent canonical append remains valid;
- a real durable WAL intent is replayed under the AL replay lease;
- a wrong-signed proposer is quarantined before any block/head write;
- direct raw `saveBlockCommit` is rejected before write and latches safe mode;
- safe mode is sticky and blocks a later valid canonical write;
- historical raw callers keep activation held;
- ordinary Sovereign authentication is unchanged;
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
- live service/runtime activation;
- durable safe-mode persistence; or
- live network-wide Sovereign PAUSE/RESUME propagation.

Each should be integrated at its own real mutation choke point rather than inferred from the block gate.

## Authority boundary

Source/proof/docs/CI only. No deployment, service restart, live launcher change, live environment change, live AL enablement, production pause/resume, key/credential/private-file access, wallet/signer use, transaction construction/broadcast, validator or Work Credit mutation, treasury/liquidity action, or funds movement is authorized or performed by this lane.

*Gate one real mutation boundary. Fail closed on bypass. Mount only through an explicit reviewed bootstrap. Do not activate before the bypass inventory and durable-safe-mode gates are closed.*
