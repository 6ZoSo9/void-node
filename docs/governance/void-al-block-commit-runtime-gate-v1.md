# VOID AL canonical block-commit runtime gate v1

Marker: `VOID_AL_BLOCK_COMMIT_RUNTIME_GATE_V1_20260824`

Parent: `VOID_ALIGNMENT_LAYER_SOVEREIGN_EMERGENCY_CONTROL_V1_20260824`

Chain: `2050` / VOID Mainnet-0

Status: **source-complete runtime primitive, explicit bootstrap not mounted, not authorized for live activation**.

## Purpose

This is the first runtime-integration slice for the Alignment Layer. It gates canonical `SegStore` block persistence and canonical-head persistence without trying to combine transaction admission, Work Credits, validators, governance, treasury and economic settlement into one change.

The reviewed property is narrow:

> When the v1 gate is explicitly bootstrapped and enabled, canonical block/head mutation must occur inside a reviewed AL lease. Historical raw block or head mutation is a safe-mode tripwire, not alternate authority.

Merging this source does not mount the bootstrap, change the normal node entry point, or enable AL on a live node.

## Explicit runtime bootstrap

The dedicated bootstrap is:

`src/security/void_alignment_layer_block_commit_runtime_bootstrap_v1.ts`

The normal `src/index.ts` entry point does **not** import it. The older native block-execution precommit integration remains preparation-only and retains its existing `environment_read: false` / no-state-authority contract.

A later reviewed activation lane may preload the compiled bootstrap explicitly, for example:

```text
node --import ./dist/security/void_alignment_layer_block_commit_runtime_bootstrap_v1.js dist/index.js
```

That is an architectural activation shape, not an instruction to modify a live service in this PR.

Enable control:

`VOID_AL_BLOCK_COMMIT_RUNTIME_V1=1`

- unset / empty / `0`: disabled;
- `1`: request enablement;
- any other present value: fail-closed bootstrap error.

No new listener, HTTP route, credential, signer or service is created.

## Proposer-authority prerequisite

A block carrying its own Ed25519 public key can prove signature integrity and bind that key to its proposer ID. It cannot prove by itself that the proposer is authorized by VOID.

The repository already has the stronger policy:

`VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1`

with reviewed allowlist / validator-runtime-truth authority sources.

The explicit AL bootstrap refuses `VOID_AL_BLOCK_COMMIT_RUNTIME_V1=1` unless proposer authority is required. Marker:

`VOID_AL_BLOCK_COMMIT_PROPOSER_AUTHORITY_REQUIRED_V1`

AL reuses existing `validateBlockForAppend(...)`; when proposer authority is required, that result already includes the selected existing authority source plus signature, block shape, roots and parent linkage. AL does not invent a second proposer schedule.

## Disabled/unmounted compatibility

Normal startup does not preload the AL bootstrap in this generation, so merge alone cannot patch `SegStore.prototype`.

Even when preloaded later, unset/empty/`0` causes the installer to return without modifying the prototype.

Source merge is therefore distinct from runtime activation.

## Guarded mutation surfaces

When explicitly bootstrapped and enabled, the installer guards:

- `saveBlock(...)` — modern canonical append;
- `saveAuthorizedLegacyCommitDirectV2fs(...)` — explicit legacy compatibility append;
- internal `saveBlockCommit(...)` — raw durable block commit;
- internal `persistHeadAtomic(...)` — durable canonical-head mutation;
- internal `replayWalAllBestEffort(...)` — validated recovery/replay context.

Canonical public append receives an in-process lease only after AL pre-accept returns `allow`. WAL replay receives a separate internal replay lease. The leases are process-local implementation state, not bearer credentials and not serializable.

## AL pre-accept

The adapter supplies the complete reviewed `ordinary_state / pre_accept` check set. Evidence binds:

- fixed AL policy identity;
- Chain-2050;
- candidate digestability;
- existing block-transition/proposer-authority validation;
- modern Ed25519 proposer integrity or explicit legacy compatibility method;
- current head / exact idempotence / next-height relation; and
- transition validity.

The caller never supplies severity.

A validly signed but unauthorized modern proposer fails authority and is rejected before persistence. A malformed/invalid signature fails actor security and can quarantine before persistence.

## AL post-apply

After a canonical append or WAL replay terminal, the adapter reopens stored block/head state and supplies the complete `ordinary_state / post_apply` set.

Evidence binds exact stored candidate identity, transition/authority revalidation and canonical-head consistency.

Any post-apply failure requires `safe_mode`. The write may already exist, so the correct response is to stop further mutation and preserve evidence, not to pretend an automatic rollback occurred.

## WAL replay lease

`SegStore` constructor replay is an internal recovery path. Under AL, each replayed raw block receives pre-accept before durable commit; the matching `persistHeadAtomic(...)` receives the post-apply terminal.

A replay commit that never reaches its head terminal latches safe mode. WAL replay cannot become a hidden raw-commit bypass.

## Direct raw-block tripwire

Historical code still reaches `saveBlockCommit(...)` directly.

An unleased raw commit:

1. writes no block;
2. advances no head;
3. records `VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1`;
4. latches process-local safe mode; and
5. blocks later mutation pending reviewed recovery.

## Direct canonical-head tripwire

Follower recovery currently contains a direct `persistHeadAtomic(...)` path that can durably advance the canonical head after inspecting already-present blocks.

That is legitimate recovery behavior today, but it is still a state mutation outside the new AL lease. V1 does not silently exempt it.

An unleased `persistHeadAtomic(...)`:

1. performs no head write;
2. records `VOID_AL_BLOCK_HEAD_DIRECT_BYPASS_V1`;
3. latches safe mode; and
4. blocks later block/head mutation pending reviewed recovery.

The follower recovery path therefore must gain an explicit reviewed AL head-recovery lease before production activation.

## Current activation HOLDs

Live activation remains held on all of the following:

`HOLD_AL_BLOCK_COMMIT_BOOTSTRAP_NOT_MOUNTED`

No current node/service launcher preloads the bootstrap. A later activation lane must identify the exact launcher and prove preload/environment binding.

`HOLD_AL_BLOCK_COMMIT_DIRECT_CALLERS_NOT_MIGRATED`

Every legitimate direct `saveBlockCommit`/equivalent path must be inventoried and migrated through reviewed AL authority.

`HOLD_AL_BLOCK_HEAD_CALLERS_NOT_MIGRATED`

Every legitimate direct durable head-advance path, including current follower recovery, must receive a reviewed AL lease or be retired.

`VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1`

Proposer authority must be explicitly required and the selected authority source must be operationally valid before AL activation.

Durable authenticated safe-mode/emergency state is also required before activation.

## Safe-mode persistence limitation

V1 safe mode is process-memory state. It is not durable across restart.

That is acceptable for this source proof and unacceptable for production activation. A process restart must never become implicit constitutional `RESUME`; durable emergency/safe-mode state remains a later mandatory gate.

## Proof requirements

Focused proof uses the real `SegStore` and demonstrates:

- normal `src/index.ts` does not mount the bootstrap;
- the older preparation-only precommit module remains environment-read/state-mutation free;
- explicit bootstrap rejects AL enablement without required proposer authority;
- disabled installer performs no prototype patch;
- authorized signed modern append passes AL pre/post;
- validly self-signed but unauthorized proposer is rejected;
- exact idempotent append remains valid;
- real durable WAL intent replays under the AL replay lease;
- wrong-signed proposer quarantines before write;
- unleased raw block commit safe-modes before write;
- unleased durable head update safe-modes before write;
- both historical caller inventories keep activation held;
- safe mode never auto-resumes;
- ordinary Sovereign authentication is unchanged;
- no Sovereign USB/private key is accessed;
- no production emergency signature is created;
- no live Chain-2050 mutation or funds movement occurs.

## Non-goals

This lane does not yet gate transaction admission/mempool mutation, validator-set mutation, Work Credit writes, governance, economic settlement, treasury movement, live service activation, durable safe-mode state, or network-wide Sovereign PAUSE/RESUME propagation.

Each must be integrated at its actual mutation choke point.

## Authority boundary

Source/proof/docs/CI only. No merge, deployment, service/launcher change, restart, live environment mutation, live AL enablement, production pause/resume, credential/private-key access, wallet/signer use, transaction construction/broadcast, validator or Work Credit mutation, treasury/liquidity action, Chain-2050 live mutation, or funds movement is authorized or performed.

*Gate real mutation boundaries. Tripwire every unleased write. Mount only through an explicit reviewed bootstrap. Do not activate until caller migration and durable safe mode are closed.*
