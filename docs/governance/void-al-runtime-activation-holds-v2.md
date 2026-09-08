# VOID AL runtime activation holds v2

Marker: `VOID_AL_RUNTIME_ACTIVATION_HOLDS_V2_20260824`

Parent source generations: merged #1409 and #1410.

Status: **source repair; production activation remains held**.

## Purpose

This instrument records the current-main repair generation after #1410. It does not rewrite the history of the v1 HOLDs. It closes specific source defects found by post-merge review and narrows the remaining activation blockers.

No part of this document authorizes deployment, service restart, environment mutation, live AL enablement, production PAUSE/RESUME, key use, Chain-2050 mutation, validator or Work Credit mutation, wallet/treasury action, or funds movement.

## Closed source debts

### AL hash admission

Valid AL requests now require non-zero 64-hex mutation and actor identity hashes. Every check also requires non-zero 64-hex evidence. All-zero SHA-256 is reserved as a sentinel and cannot be accepted as authority-bearing evidence.

Malformed-decision evidence includes a deterministic SHA-256 fingerprint of the exact rejected in-memory structure, including unknown keys/check content. Distinct malformed inputs therefore do not collapse to one generic evidence identity merely because the same schema error is reported.

### Sovereign emergency state machine

An emergency certificate with all-zero `observed_head_hash_sha256` is invalid.

If `last_sequence` is already uint64 max (`18446744073709551615`), admission fails with the terminal code:

`EMERGENCY_SEQUENCE_EXHAUSTED`

V2 does **not** invent an epoch rollover, reset, wrap, rekey, or successor sequence policy. A future constitutional migration would need its own reviewed instrument.

### Proposer-authority policy latch

When the AL block gate is enabled, proposer authority must be required both in the supplied runtime environment and the actual process environment.

The installer records a SHA-256 fingerprint of the authority-relevant environment. Every later pre-accept/post-apply path rechecks that fingerprint; WAL replay checks it before entering replay authority. Drift or attempted weakening becomes a policy-integrity safe-mode failure rather than silently falling back to self-authenticated proposer semantics.

Epoch/slot context variables are deliberately not latched because they are expected to advance as consensus context. Authority-selection configuration, trust roots/paths, required flags, chain/data binding and related authority inputs are latched.

This closes the source seam `HOLD_AL_PROPOSER_AUTHORITY_REQUIRED_NOT_LATCHED_THROUGH_RUNTIME`; it does not prove that any particular production authority source is operationally valid or sufficiently anchored.

### Uncertain canonical mutation exception

A protected canonical storage method may fail after some durable effects have occurred. V2 never interprets such an exception as proof that nothing changed.

Any exception escaping the protected canonical mutation latches process-local safe mode and returns:

`VOID_AL_BLOCK_COMMIT_MUTATION_EXCEPTION_V1`

This closes `HOLD_AL_CANONICAL_COMMIT_EXCEPTION_AFTER_DURABLE_BLOCK_ESCAPES_POST_APPLY_SAFE_MODE` at the source boundary.

### Exact durable-block head healing

`SegStore.saveBlock(...)` now handles the crash-recovery case where block `head+1` is already physically readable and exactly equals the candidate but the head terminal was not completed.

Before advancing head it:

1. revalidates the candidate transition;
2. requires exact stored JSON identity, not merely a matching header hash;
3. re-fsyncs the canonical block file and segment directory;
4. advances the head through the normal head terminal; and
5. appends **no second block frame**.

A conflicting, gapped or non-contiguous candidate fails closed.

### Existing direct follower head recovery

Under enabled AL, an uncontextualized `persistHeadAtomic(target)` is no longer permitted to directly write the durable head merely because a caller can reach the private method in generated JavaScript.

For a bounded forward recovery request, AL instead loads every already-durable block from current head + 1 through target and re-drives each through the guarded canonical `saveBlock(...)` or exact legacy compatibility method. Each block therefore receives authority, transition, replay, actor-security and post-apply checks. Missing/conflicting/oversized/regressing requests trip `VOID_AL_BLOCK_HEAD_DIRECT_BYPASS_V1` safe mode before the requested direct head terminal executes.

The recovery span is bounded to 10,000 blocks per call.

### Startup head reconciliation

When `VOID_AL_BLOCK_COMMIT_RUNTIME_V1=1` is already requested, `SegStore` startup no longer silently rewrites a missing/disagreeing `heads.json` or `head.txt` before AL recovery authority is established.

Such state emits:

`VOID_AL_SEGSTORE_STARTUP_HEAD_RECONCILIATION_HOLD_V1`

AL-disabled startup preserves the existing compatibility behavior.

## Remaining activation HOLDs

### `HOLD_AL_LEGACY_INDEX_RUNTIME_NOT_RETIRED`

Current `src/index.ts` still contains historical raw `saveBlockCommit(...)` users and code that writes `head.txt` / `heads.json` independently of the canonical storage boundary. Some are legacy proposer/hot-runtime/repair surfaces.

This generation deliberately does not grant them AL leases and does not replace the entire large historical runtime file through an unsafe full-file rewrite. Before production AL activation, each remaining mutation-capable legacy surface must be either:

- retired/disabled under the exact production startup contract; or
- migrated through the canonical guarded storage API with focused proof.

A static inventory of those legacy mentions remains an activation sentinel.

### `HOLD_AL_BLOCK_COMMIT_BOOTSTRAP_NOT_MOUNTED`

Normal node startup still does not preload the AL bootstrap. Source merge is not runtime activation.

### `HOLD_AL_DURABLE_SAFE_MODE_STATE_REQUIRED`

The block gate's automatic safe mode is still process-memory state. A process restart must never be equivalent to constitutional RESUME. Durable authenticated safe-mode/emergency state must exist before production activation.

### `HOLD_AL_PROPOSER_AUTHORITY_SOURCE_OPERATIONAL_VALIDATION_REQUIRED`

V2 prevents in-process policy weakening, but activation still requires an actual authority source whose trust root, freshness/replay properties and operating state are reviewed. A merely present path or unsigned mutable runtime-truth file is not elevated into production trust by this repair.

## Activation posture

`activation_ready=false`

The new source is useful before activation because it removes silent-fallback and duplicate-append failure modes. It must remain inert on normal startup until the remaining HOLDs are closed in separately reviewed generations.

*Close source ambiguity first. Retire legacy writers next. Persist emergency state before activation. Never convert a restart into authority.*
