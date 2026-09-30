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

The runtime may supply a lower positive-integer value through
`VOID_JOBS_WORKER_MAX_COMPLETION_IDS_PER_FILE`; values above 250,000 clamp to
the source-pinned ceiling. Empty, zero, negative, fractional, or non-numeric
values are treated as invalid and fall back to the 250,000 default rather than
silently collapsing the worker to a near-zero capacity. Runtime configuration
cannot raise the source-pinned ceiling. Increasing the ceiling requires an
explicit source change and review.

The budget is based on **distinct IDs**, not JSONL rows. Duplicate historical
completion rows do not consume additional cardinality.

Retained completion IDs are also capped at **192 characters**, matching the
existing paid-work participant job-ID contract. This prevents a low-cardinality
history from defeating the memory brake with arbitrarily large Set keys. An ID
longer than that fails closed as
`VOID_AGENT_PICK2_JSONL_COMPLETION_ID_LENGTH_HOLD` before queued jobs are
surfaced.

Retained completion IDs are also bounded to **192 characters**, matching the
broadest current paid-work job-ID contract. A longer completed-job identifier
fails closed as
`VOID_AGENT_PICK2_JSONL_COMPLETION_ID_LENGTH_HOLD` before it can enter the
in-memory exact-membership set. The semantic index does not introduce a new identifier-alphabet restriction in
this slice; it only enforces the established maximum retained length.

When a new distinct completion would exceed the configured per-file ceiling,
the semantic index emits:

```text
VOID_AGENT_PICK2_JSONL_COMPLETION_CARDINALITY_HOLD
```

The completion snapshot classifies that marker as a normal fail-closed
completion-truth HOLD. The jobs runtime therefore returns no queued jobs from
that scan and does not infer effect authority.

The runtime's separate `locallyDone` Set remains only a transient replay fence:
`markDone()` may retain an ID while the canonical completion ledger has not yet
made that completion visible, but every scan removes that transient key as soon
as exact durable completion truth contains the same ID. Durable completion
history is therefore not mirrored indefinitely into a second in-memory Set.

## Covered paths

The same bound is applied when completion membership is built through:

- synchronous full rebuild;
- asynchronous warm rebuild;
- canonical witnessed incremental append.

The incremental path accounts for the already-admitted generation before
accepting new distinct IDs, so a near-cap cached generation cannot bypass the
limit through a small append.

When a generation first exceeds the bound, the index records that exact opened
file stamp as an in-process cardinality HOLD **only if the current path still
matches that same stamp**. Repeated scans of the same stamp fail immediately
without rereading the ledger. If the file is replaced, truncated, or otherwise
changes to a different exact stamp, the cached HOLD is cleared and the new
generation is evaluated normally.

Binding the cache to the scanned/opened stamp matters under concurrency: if an
old descriptor crosses the cardinality boundary while the path is concurrently
replaced, the old overflow cannot cache-poison the replacement generation. This
prevents an oversized stable history from becoming repeated full-ledger I/O
churn while preserving a fail-closed recovery path for reviewed
compaction/replacement.

## What this does not solve

This is **not** the final #1613 disk-backed exact-membership implementation.

In particular, it does not:

- make completion membership independent of RAM;
- create an on-disk exact lookup/index;
- bound the jobs-ledger `jobsSeen` identity history; that is a separate
  jobs-generation/indexing problem and is not represented as closed here;
- increase the supported historical cardinality beyond the configured bound;
- authorize production enqueue/effect behavior;
- deploy or change any running service.

A deployment whose completion history exceeds the bound will HOLD until the
source-pinned ceiling is deliberately revised through review or a disk-backed
exact-membership successor is provided.

The intended next architectural step remains an exact, deterministic,
disk-backed membership structure with bounded hot RAM and explicit generation
identity. Probabilistic membership is not an acceptable substitute for
completion truth.

## Proof

The permanent jobs/DataNet runtime-wedge proof uses a test cap of two distinct
IDs and proves:

1. a 192-character completion ID is admitted while a 193-character completion
   ID HOLDs before any queued job is surfaced;
2. the same overlong-ID generation HOLDs again without rereading and a changed
   under-cap generation recovers;
3. two distinct completion IDs are admitted;
4. duplicate rows do not consume additional budget;
5. a witnessed append adding the third distinct ID HOLDs before any queued job
   is surfaced;
6. a repeat scan of the same over-cap generation performs no additional
   completion-ledger read;
7. a changed under-cap generation clears the cached HOLD and becomes usable
   again;
8. a fresh full rebuild of an independent over-cap history also HOLDs before any
   queued job is surfaced; and
9. a racing under-cap path replacement is not poisoned by an old descriptor's
   over-cap scan; and
10. a locally-completed ID is retained only until a witnessed durable completion
    becomes visible, then the duplicate transient key is retired without
    requeueing the job.

Existing immutable completion-generation, jobs-generation, byte-framing,
backpressure, and pre-effect authority proofs remain in force.

## Authority

Source and proof only.

No production job execution, DataNet publication, Work Credit write, wallet or
signer access, transaction, validator mutation, service restart, deployment,
economic activation, or funds movement is performed or authorized by this
guard.
