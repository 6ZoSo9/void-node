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

Before any training-isolation start, the runner now binds the first-instruction
surface: exact root-owned training unit bytes, exact locked pre-entry and
entrypoint binaries, exact loaded FragmentPath, empty DropInPaths,
NeedDaemonReload=no, and exactly one reviewed ExecStart. It also queries PID1's
effective UnitPath and rejects unreviewed dependency-directory entries before
start. The same boundary is repeated immediately before the start command and
again before success output.

Before the runner may emit a successful source/session binding, the inert
training-isolation unit must begin in the exact reviewed dormant state and
return to exact `loaded/inactive/dead/MainPID=0/static` state after the bounded
stop attempt. The exact training PID/start-ticks generation observed during the
session must also be absent before success output. A nonzero stop command is
not itself treated as success or failure authority; only the exact terminal
state and generation disappearance qualify the cleanup boundary. Cleanup is
armed before the start command is issued, so a timeout, client error, or other
indeterminate start result still triggers a bounded stop plus exact dormant
postcondition check. Active,
deactivating, failed, nonzero-MainPID, enabled/non-static, or lingering exact
process-generation states HOLD.

The runner's live custody-process environment assertion uses the same
seven-name loader/runtime boundary as the reviewed service:
`GCONV_PATH LD_AUDIT LD_LIBRARY_PATH LD_PRELOAD NODE_OPTIONS NODE_PATH
OPENSSL_CONF`. It may report `loader_environment_clean=true` only after all
seven names are absent or empty in the exact bound custody process generation.

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

The closure also fixes Node execution and custody-process identity to the
root-custodied runtime:

`/opt/void-apollyon-node-runtime-v1/node`

The user-owned Xiphos Node distribution is never accepted directly as custody
runtime authority.

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


## Noble systemd 8.18 successor

The reviewed private closure uses the current V2 collector with an exact
systemd package allowlist containing the original reviewed Noble
`255.4-1ubuntu8.11` plus the current Noble-security
`255.4-1ubuntu8.18`. Other package versions remain fail-closed.

The successor is installed under the v2 reviewed root; the v1 reviewed root is
retained unchanged for rollback.
