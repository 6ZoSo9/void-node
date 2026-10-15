# Apollyon live custody source/session execution closure v2

Marker: `VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_EXECUTION_CLOSURE_V2`

Status: **source/CI-only execution closure; not installed and not live**.

## Purpose

This closes the source-level execution gap after #3045.

The closure contains:

1. a native root pre-entry;
2. a fixed-path Python launcher; and
3. the current-V2 live source/session runner.

The runner performs one bounded live session:

- starts only the already-installed inert training-isolation service;
- waits through transient systemd executor state to the exact inert entrypoint;
- observes the exact same PID through #3035 isolation logic;
- obtains two raw current-V2 custody observations through #3039;
- composes them through #3037;
- retains and checks custody state-root, consumed-directory, socket and service
  process identities;
- queries the live AF_UNIX custody service for the exact authorization;
- reads the exact immutable custody record;
- qualifies it through #3043;
- finalizes current-V2 live source/session binding through #3045; and
- stops the inert training service in `finally`.

It never invokes a trainer and never creates a durable attempt claim.

## Complete reviewed closure

The Python launcher authenticates every transitive local source before the
runner's first import, including:

- #3035 installed/live isolation observer;
- #3037 current-V2 preclaim composer;
- #3039 raw V2 collector adapter;
- #3043 current-V2 claim contract;
- #3044 custody launcher V2;
- #3045 live-binding finalizer;
- current V2 live qualifier, policy V2/V1 and collector;
- custody client/service/core;
- operator authorization canonicalizer; and
- V1 claim canonicalizer used only for canonical JSON.

All reviewed bytes are copied into one private root beneath `/run`. Node is
opened through a retained trusted descriptor and executes the private runner.
The runner's nested V2 reviewed tree inherits `TMPDIR` beneath that same
private parent.

Direct live worktree invocation is unsupported.

## Authority boundary

This source PR performs no Xiphos contact, installation or service action.

A future separately authorized create-only installer must place the native
pre-entry, Python launcher and exact reviewed source tree beneath their fixed
`/opt` paths before any live run is eligible.

Even a successful future live run still reports:

```text
durable_attempt_claim=false
attempt_claimed=false
training_execution=false
candidate_weight_mutation=false
operator_private_key_access=false
funds_movement=false
```

Only after live qualification of this exact installed closure may the next gate
be `durable_candidate_training_attempt_claim_executor_v2`.
