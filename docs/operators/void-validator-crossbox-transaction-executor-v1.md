# VOID validator cross-box transaction executor v1

## Purpose

This is the validator-specific journal/replay layer for issue #2255, stacked on the generic cross-box transaction contract in Draft #2278.

The legacy validator closeout still performs live mutations sequentially. This source slice deliberately does **not** edit or execute that shell yet. Instead, it defines the append-only semantic journal that the eventual live executor must persist and replay before it is safe to replace the legacy sequence.

Marker:

`VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_V1`

Confirmation:

`prepareReviewedValidatorCrossboxTransactionExecutorV1`

## Why this slice exists

The current validator closeout has crash seams around:

- local `verified-current` publication;
- local validator-truth service restart;
- local shadow/runtime refresh;
- remote staged-copy publication;
- remote service restart;
- two-host verification; and
- final checkpoint tag publication.

The generic #2278 contract defines the valid two-participant transaction state machine, but it intentionally performs no host observation and no durable journal I/O.

This validator-specific layer makes the transaction replayable from an append-only event history. A later live executor can therefore persist one event before or after each observed side-effect boundary and reconstruct exactly what may happen next after process, SSH, host, or power interruption.

## Bound prepare state

The prepare input binds:

- exact clean repository HEAD for both participants;
- distinct local/remote host identities;
- each participant's prior `verified-current` existence and identity;
- each participant's prior shadow/runtime identity;
- service active/inactive state and active `InvocationID`;
- exact target epoch and vault name;
- exact intended manifest-set SHA-256;
- exact checkpoint tag;
- proof that the checkpoint tag was absent at prepare.

For validator closeout this controller fixes the generic restart policy to:

- local: restart only if active;
- remote: restart only if active.

A participant that was inactive in prestate must remain inactive.

## Append-only event journal

The journal is not a stored mutable transaction snapshot accepted on faith.

It stores:

1. normalized prepare input;
2. an ordered event list;
3. derived generic transaction state;
4. derived next recovery action;
5. derived checkpoint-publication eligibility; and
6. a content-addressed journal ID.

Every validation replays the complete event sequence through the reviewed #2278 generic transaction API. The supplied derived transaction, next action, authority object, and journal ID must match that replay exactly.

The accepted event types are:

- `PREPARED`
- `BEGIN_COMMIT`
- `PUBLISH_STARTED`
- `PUBLISH_NO_EFFECT`
- `PUBLISHED`
- `VERIFIED`
- `FINALIZE_COMMIT`
- `BEGIN_ROLLBACK`
- `RESTORE_STARTED`
- `RESTORED`
- `FINALIZE_RESTORE`
- `HOLD`

Unknown event types fail closed.

The event count is bounded to 512.

## Crash recovery semantics

The journal preserves the generic contract's critical distinction between starting a side effect and proving its outcome.

After a durable `PUBLISH_STARTED` event, the derived next action is `RECOVER_PUBLISH_<participant>`. A future live executor must observe the participant before doing anything else.

It may then prove one of two outcomes:

- the intended state/restart already happened, so record `PUBLISHED`; or
- the exact original prestate and invocation remain, so record `PUBLISH_NO_EFFECT` and roll back.

It must not infer that a missing final receipt means publication never happened.

Rollback uses the same pattern:

- durably record `RESTORE_STARTED`;
- observe before retry;
- record `RESTORED` only from exact restored prestate evidence.

A partial transaction is never checkpoint-eligible.

## Checkpoint publication authorization

`FINALIZE_COMMIT` is accepted only after both participants independently verify the intended state and the checkpoint tag is rechecked absent.

Even after commit, this controller does not create or push a tag.

`authorizeVoidValidatorCrossboxCheckpointPublicationV1(...)` requires a **fresh** observation that:

- the repository HEAD still equals the transaction's bound source HEAD;
- the exact intended checkpoint tag is still the requested tag; and
- that exact tag is still absent.

It returns a content-addressed source-only authorization with:

- `publication_performed=false`;
- `git_tag_creation=false`;
- `git_push=false`.

The eventual live executor must separately execute and prove tag publication.

## What this slice does not do

This slice does not yet edit:

`ops/mainnet/validator-crossbox-closeout.sh`

It performs no:

- SSH or network access;
- systemd mutation;
- service restart;
- validator publication;
- filesystem publication;
- Git tag creation or push;
- credential, private-key, wallet, or signer access;
- transaction construction/signing/broadcast;
- Chain-2050 write;
- Work Credit mutation;
- treasury, liquidity, inventory, token, or funds movement.

## Required next integration slice

Before the legacy closeout can claim crash/failure atomicity, a later reviewed source slice must make its live host actions obey this journal:

1. observe exact local/remote prestate;
2. stage the complete manifest generation inertly on both hosts;
3. fsync the journal before each `PUBLISH_STARTED` or `RESTORE_STARTED` side-effect boundary;
4. publish one participant at a time;
5. re-observe on every `RECOVER_*` state;
6. restore exact previous `verified-current`, shadow/runtime truth, service state, and invocation chain on failure;
7. reach `COMMITTED` only after both participants independently verify the same manifest-set identity; and
8. publish the checkpoint tag only from a fresh post-commit authorization.

Until that integration exists and is proven, the journal controller is source infrastructure only and grants no live mutation authority.
