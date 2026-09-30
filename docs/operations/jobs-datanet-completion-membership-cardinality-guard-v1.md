# Jobs/DataNet completion membership cardinality guard V1

## Purpose

The jobs/DataNet completion semantic index keeps exact completed-job membership
in JavaScript `Set<string>` objects. Full rebuilds, asynchronous warm rebuilds,
witnessed incremental appends, and immutable completion snapshots all depend on
that exact membership.

The current design is exact, but it is not disk-backed. Without a cardinality
boundary, RAM consumption can grow with the total number of distinct historical
completion IDs and a snapshot can copy that membership again.

This source-only guard makes that limitation fail closed instead of allowing
unbounded in-memory growth.

## Boundary

`VOID_AGENT_PICK2_JSONL_MAX_COMPLETION_IDS_PER_FILE_V1` pins the default
per-completion-file ceiling to **250,000 distinct completion IDs**.

The runtime may supply a reviewed value through
`VOID_JOBS_WORKER_MAX_COMPLETION_IDS_PER_FILE`; the semantic index clamps
configured values to the supported **1..5,000,000** range.

The budget is based on **distinct IDs**, not JSONL rows. Duplicate historical
completion rows do not consume additional cardinality.

When a new distinct completion would exceed the configured per-file ceiling,
the semantic index emits:

```text
VOID_AGENT_PICK2_JSONL_COMPLETION_CARDINALITY_HOLD
```

The completion snapshot classifies that marker as a normal fail-closed
completion-truth HOLD. The jobs runtime therefore returns no queued jobs from
that scan and does not infer effect authority.

## Covered paths

The same bound is applied when completion membership is built through:

- synchronous full rebuild;
- asynchronous warm rebuild;
- canonical witnessed incremental append.

The incremental path accounts for the already-admitted generation before
accepting new distinct IDs, so a near-cap cached generation cannot bypass the
limit through a small append.

When a generation first exceeds the bound, the index records that exact file
stamp as an in-process cardinality HOLD. Repeated scans of the same stamp fail
immediately without rereading the ledger. If the file is replaced, truncated,
or otherwise changes to a different exact stamp, the cached HOLD is cleared and
the new generation is evaluated normally. This prevents an oversized stable
history from becoming repeated full-ledger I/O churn while preserving a
fail-closed recovery path for a reviewed compaction/replacement.

## What this does not solve

This is **not** the final #1613 disk-backed exact-membership implementation.

In particular, it does not:

- make completion membership independent of RAM;
- create an on-disk exact lookup/index;
- increase the supported historical cardinality beyond the configured bound;
- authorize production enqueue/effect behavior;
- deploy or change any running service.

A deployment whose completion history exceeds the bound will HOLD until a
reviewed larger bound or a disk-backed exact-membership successor is provided.

The intended next architectural step remains an exact, deterministic,
disk-backed membership structure with bounded hot RAM and explicit generation
identity. Probabilistic membership is not an acceptable substitute for
completion truth.

## Proof

The permanent jobs/DataNet runtime-wedge proof uses a test cap of two distinct
IDs and proves:

1. two distinct completion IDs are admitted;
2. duplicate rows do not consume additional budget;
3. a witnessed append adding the third distinct ID HOLDs before any queued job
   is surfaced;
4. a repeat scan of the same over-cap generation performs no additional
   completion-ledger read;
5. a changed under-cap generation clears the cached HOLD and becomes usable
   again; and
6. a fresh full rebuild of an independent over-cap history also HOLDs before any
   queued job is surfaced.

Existing immutable completion-generation, jobs-generation, byte-framing,
backpressure, and pre-effect authority proofs remain in force.

## Authority

Source and proof only.

No production job execution, DataNet publication, Work Credit write, wallet or
signer access, transaction, validator mutation, service restart, deployment,
economic activation, or funds movement is performed or authorized by this
guard.
