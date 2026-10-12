# Jobs/DataNet seen-job cardinality guard v1

Marker: `VOID_JOBS_DATANET_WORKER_SEEN_JOB_CARDINALITY_HOLD`

Status: bounded fail-closed RAM containment for issue #1613. This is **not** the
final disk-backed exact-membership design.

## Remaining memory problem

The current jobs/DataNet worker already has:

- byte-framed jobs JSONL;
- fatal UTF-8 decode;
- witnessed jobs-generation admission;
- pending-use source revalidation;
- bounded pending backpressure;
- immutable completion generations with expiry checks; and
- a deterministic per-file completion-membership cardinality ceiling.

Two exact-membership Sets require explicit RAM ceilings:

```text
jobsSeen = Set<string>
locallyDone = Set<string>
```

`jobsSeen` remembers distinct IDs inside the current admitted jobs generation
so duplicate historical rows cannot become fresh pending work.

`locallyDone` is different: it deliberately survives jobs-generation resets
until durable completion truth catches up, because clearing it could re-authorize
a job whose effects already happened. That cross-generation replay fence was the
remaining unbounded path.

## Guard

The worker now pins:

```text
VOID_JOBS_DATANET_WORKER_MAX_SEEN_JOB_IDS_V1 = 250000
VOID_JOBS_DATANET_WORKER_MAX_LOCALLY_DONE_JOB_IDS_V1 = 250000
VOID_JOBS_DATANET_WORKER_MAX_JOB_ID_UTF8_BYTES_V1 = 192
```

`VOID_JOBS_WORKER_MAX_SEEN_JOB_IDS` and
`VOID_JOBS_WORKER_MAX_LOCALLY_DONE_JOB_IDS` may independently lower their
respective ceilings for a deployment or proof. Neither can raise the reviewed
250,000 ceiling.

Invalid, zero, fractional, or non-numeric configuration falls back to the
corresponding reviewed ceiling rather than disabling either guard.

## Admission order

For every successfully decoded jobs row:

1. normalize the job ID exactly as the existing worker does;
2. reject an ID whose UTF-8 representation exceeds 192 bytes;
3. ignore an ID already present in `jobsSeen`;
4. before inserting a new distinct ID, require
   `jobsSeen.size < maxSeenJobIds`;
5. only then add the ID and continue the established status/completion/pending
   logic.

Duplicate rows therefore do not spend extra distinct-ID budget.

The byte ceiling is intentionally based on UTF-8 bytes, not JavaScript
character count. A short-looking Unicode identifier cannot consume an
unreviewed amount of Set/string memory.

## Overflow behavior

When a new distinct ID would exceed the configured bound, the worker:

- clears its in-memory jobs-generation cursor/carry/seen/pending state;
- quarantines the currently admitted jobs source in this runtime-index instance,
  so earlier pending job proxies from the same file stamp lose use authority; and
- throws:

```text
VOID_JOBS_DATANET_WORKER_SEEN_JOB_CARDINALITY_HOLD
```

The over-budget ID is never inserted.

For `locallyDone`, the worker also checks remaining replay-fence capacity while
building the batch returned by `scan()`. If returning another new job could
later require an over-budget `markDone()`, the jobs source is quarantined and
`scan()` throws:

```text
VOID_JOBS_DATANET_WORKER_LOCALLY_DONE_CARDINALITY_HOLD
```

This occurs before the new job crosses the worker-effect boundary. The
`markDone()` path repeats the same guard as a backstop. No old locally-done ID
is cleared or evicted to make room. Only observed durable completion truth
removes it.

An overlong ID similarly throws:

```text
VOID_JOBS_DATANET_WORKER_JOB_ID_TOO_LARGE
```

before insertion.

The same unchanged oversized generation will continue to HOLD if rescanned. A
runtime-index restart or an explicit source lifecycle reset is required before a
new source can be reconsidered. The guard never evicts an older ID to make room,
because eviction would destroy the exact duplicate/replay semantics that
`jobsSeen` currently provides.

The permanent proof also forces overflow on a later scan chunk while keeping the
jobs file stamp unchanged. A job proxy returned from an earlier chunk must become
unusable after the overflow, and the next scan must return a quarantined
`jobs_seen_job_cardinality_hold` rather than resuming from the old source.

## What this does not solve

These guards bound both long-lived in-memory exact-membership Sets; they do not
make historical jobs membership scalable. In the worst case the reviewed design
can retain up to 250,000 current-generation `jobsSeen` IDs plus 250,000
cross-generation `locallyDone` IDs, subject to the shared 192-byte job-ID cap.

Issue #1613 remains open for an exact disk-backed membership/index successor
that can retain duplicate/replay truth without storing the full historical set
in RAM. A future design should preserve the already-reviewed jobs-generation and
completion-snapshot authority boundaries and use an exact, deterministic
disk-backed lookup. A probabilistic filter must not become completion or
duplicate authority.

This lane also does not alter production enqueue/effect authority. Existing
pre-effect jobs-source and completion-generation assertions remain mandatory.

## Proof

The permanent jobs/DataNet runtime wedge proves:

- the 250,000 maximum is pinned;
- runtime configuration can lower but cannot raise it;
- duplicate job rows consume one distinct-ID slot;
- a third distinct ID with a test `jobsSeen` ceiling of two HOLDs before insertion;
- two locally-completed IDs survive explicit jobs-generation resets when durable
  completion truth is absent;
- a third generation's new queued job HOLDs before worker return when the test
  `locallyDone` ceiling of two is exhausted, with no eviction of the older IDs;
- a 97-character multibyte ID that is 194 UTF-8 bytes is rejected despite being
  fewer than 192 JavaScript characters; and
- existing completion, generation, byte-framing, O(delta), and consumer-effect
  guards continue to run in the same permanent proof.

No live worker, DataNet publication, WC mutation, credential/key/wallet access,
transaction, runtime deployment, validator action, or funds movement is
performed by this source/proof lane.
