# VOID AL durable safe-mode latch v1

Marker: `VOID_AL_DURABLE_SAFE_MODE_LATCH_V1_20260824`

## Purpose

Close `HOLD_AL_DURABLE_SAFE_MODE_STATE_REQUIRED` at the source/proof boundary.

A process-local Alignment Layer safe-mode bit is not a sufficient production safety boundary. If a critical AL failure occurs and the process subsequently exits, crashes, or restarts, startup must not reinterpret the absence of process memory as permission to resume mutation.

This generation adds a small dedicated durable latch and binds the existing explicit AL block-commit bootstrap to it. The normal node entry point still does **not** mount that bootstrap, so this merge remains inert until a separate activation lane explicitly preloads it.

## Durable state contract

The latch uses an operator-selected absolute private directory supplied through:

`VOID_AL_DURABLE_SAFE_MODE_ROOT_V1`

Production enablement requires that directory to have already been deliberately initialized through the explicit source API confirmation:

`initializeVoidAlDurableSafeModeLatchV1`

Runtime startup does not create the state implicitly. Missing state is a HOLD rather than a fresh `running` assumption.

The directory must be a real current-UID-owned private directory with no group/other permission bits. The two authority files are:

- `void-al-durable-safe-mode-v1.json`
- `.void-al-durable-safe-mode-v1.lock`

Both are private single-link regular files at mode `0600` when present.

The state is closed-schema and binds:

- marker/version/Chain-2050 identity;
- monotonic uint64 generation;
- exact `running` or `safe_mode` mode;
- first safe-mode reason/evidence;
- latest safe-mode reason/evidence; and
- a deterministic state fingerprint.

The all-zero SHA-256 sentinel is not valid incident evidence.

## Persistence boundary

State mutation uses a create-only private lock plus durable replacement:

1. create the lock with `O_EXCL | O_NOFOLLOW`;
2. fsync the lock and its containing directory;
3. read and validate the exact current state;
4. write the complete next state to a create-only temporary file;
5. fsync the temporary file;
6. rename it over the state path;
7. fsync the containing directory;
8. remove the lock; and
9. fsync the directory again.

A surviving lock is not treated as stale automatically. It means the previous transition may have ended ambiguously and produces `AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED`. This generation deliberately prefers a persistent HOLD over inventing crash recovery that could clear a real incident.

## Runtime binding

`void_alignment_layer_block_commit_durable_runtime_v1.ts` layers over the already-reviewed in-memory block/head gate. It wraps the five mutation-capable SegStore methods already guarded by #1410/#1411:

- `saveBlock`
- `saveAuthorizedLegacyCommitDirectV2fs`
- `saveBlockCommit`
- `persistHeadAtomic`
- `replayWalAllBestEffort`

When durable state is already `safe_mode`, the outer layer rejects the mutation before entering the child guard.

When the child guard throws a safe-mode terminal, the outer layer durably latches that exact reason/evidence before returning control.

The outer layer also checks for a child safe mode after an inner call returns. This covers child paths such as a WAL replay that reaches a fail-closed terminal in a `finally` path without itself throwing. That latent state is converted into a durable safe-mode incident before caller control continues.

A fresh process generation reading the same durable root therefore comes back in effective safe mode. Restart is not RESUME.

## No automatic resume

This generation implements **no** resume, clear, reset, stale-lock recovery, or automatic unlock API.

That is intentional. Closing the crash/restart persistence gap must not silently invent a second emergency-control authority domain.

The remaining follow-up is therefore narrower and explicit:

`HOLD_AL_DURABLE_SAFE_MODE_RESUME_AUTHENTICATION_BINDING_REQUIRED`

A future reviewed lane should bind durable-latch clearing to the existing Sovereign Emergency `RESUME` state machine and its high-assurance Primary governance-attestation role, with exact state/certificate/replay binding. That future lane is separate from this one and is not activated here.

## Activation truth after this generation

This source closes only the durability/restart HOLD. Production AL remains **not ready** because these independent gates remain:

- `HOLD_AL_DURABLE_SAFE_MODE_RESUME_AUTHENTICATION_BINDING_REQUIRED`
- `HOLD_AL_LEGACY_INDEX_RUNTIME_NOT_RETIRED`
- `HOLD_AL_BLOCK_COMMIT_BOOTSTRAP_NOT_MOUNTED`
- `HOLD_AL_PROPOSER_AUTHORITY_SOURCE_OPERATIONAL_VALIDATION_REQUIRED`

`activation_ready=false`

The historical raw/head writers in `src/index.ts` are not granted durable-AL authority by this change. The normal node entry point still does not import the bootstrap. The production proposer-authority source still needs separate operational trust/freshness/replay validation.

## Authority boundary

This lane is source/proof/CI only. It does not:

- deploy or restart a node;
- change a launcher, service, or live environment;
- mount or enable AL on Mainnet-0;
- sign or submit a PAUSE/RESUME certificate;
- read or mount the Sovereign Primary or Recovery USB;
- change ordinary node authentication;
- access a wallet or signer;
- mutate validators or Work Credits;
- construct or broadcast a transaction;
- mutate Chain-2050 live state;
- touch treasury/liquidity; or
- move funds.

A later merge is not runtime activation. Initializing a real durable latch directory, mounting the bootstrap, and every emergency RESUME remain separate operation-bound authorization gates.
