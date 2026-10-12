# Jobs/DataNet completion snapshot zero-copy v1

Marker: `VOID_JOBS_DATANET_COMPLETION_SNAPSHOT_ZERO_COPY_V1`

Status: bounded residual-memory hardening for #1613. This change does **not**
complete the required disk-backed exact-membership work.

## Problem

`AgentPick2JsonlSemanticIndexV1` already stores each completion-file generation
as a copy-on-write `Set<string>`:

- a full rebuild constructs a new Set before publishing the state;
- an incremental witnessed append constructs
  `new Set(prior.completed)`, applies additions to that new Set, and only then
  publishes the next state;
- published completion Sets are never deleted from or appended to.

Despite that existing lifecycle, `completionTruthSnapshotV1(...)` cloned every
published completion Set again:

```text
completed: new Set(state.completed)
```

For a 250,000-ID completion source, each active snapshot could therefore
duplicate the full exact-membership structure in RAM and create avoidable GC
pressure.

## Change

The published completion state now declares:

```text
completed: ReadonlySet<string>
```

Incremental publication builds a private `nextCompleted` Set, adds the
witnessed delta to it, and only then installs the new state.

A completion snapshot therefore retains the already-published immutable
membership reference:

```text
completed: state.completed
```

No completion IDs are copied solely to create the snapshot.

## Authority and generation semantics

This does not weaken completion-generation authority.

The snapshot still captures the exact source file stamps and derives the same
content generation ID. `assertGeneration()` still re-stats every captured
source and raises:

```text
COMPLETION_SNAPSHOT_EXPIRED
```

when any source generation changes.

The proof also demonstrates the copy-on-write property behaviorally:

1. capture generation G containing completion ID A;
2. canonically/witnessedly append completion ID B;
3. capture G+1 and prove it contains A and B;
4. prove the already captured G still reports B absent; and
5. prove G's generation assertion expires after the append.

Thus retaining the Set reference does not let later completion appends mutate
an older snapshot's membership.

## Scope

This change reduces transient RAM amplification only.

It does **not**:

- move the long-lived completion membership off heap;
- persist an exact-membership index across process restart;
- implement disk-backed bucket/index integrity;
- change the 250,000 distinct-ID ceiling;
- change completion ID byte/character bounds;
- change append-witness authority;
- change completion snapshot lease/expiry behavior;
- change worker enqueue/effect authority; or
- close #1613.

The next #1613 storage layer still needs a reviewed disk-backed exact-membership
cache/index that remains subordinate to canonical JSONL generation authority
and fails closed on cache corruption or uncertain cleanup.

## Verification

The existing worker wedge proof covers this slice:

```bash
npx tsx scripts/prove_jobs_datanet_worker_runtime_wedge_v1.ts
```

Expected added markers:

```text
completion_snapshot_zero_copy_membership=true
completion_state_copy_on_write=true
old_completion_snapshot_membership_immutable=true
```

No live worker, DataNet publication, Work Credit, runtime/service, credential,
wallet/signer, transaction, validator, treasury, liquidity, or funds action is
performed by this source change.
