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

One separate long-lived Set remained unbounded:

```text
jobsSeen = Set<string>
```

Every distinct job ID encountered in an admitted append-only jobs generation is
remembered so a duplicate historical row cannot become fresh pending work.
Canonical witnessed appends keep the same logical generation alive, so this Set
could otherwise grow with the entire jobs history.

## Guard

The worker now pins:

```text
VOID_JOBS_DATANET_WORKER_MAX_SEEN_JOB_IDS_V1 = 250000
VOID_JOBS_DATANET_WORKER_MAX_JOB_ID_UTF8_BYTES_V1 = 192
```

`VOID_JOBS_WORKER_MAX_SEEN_JOB_IDS` may lower the distinct-ID ceiling for a
deployment or proof. It cannot raise the reviewed 250,000 ceiling.

Invalid, zero, fractional, or non-numeric configuration falls back to the
reviewed ceiling rather than disabling the guard.

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

- clears its in-memory jobs-generation cursor/carry/seen/pending state; and
- throws:

```text
VOID_JOBS_DATANET_WORKER_SEEN_JOB_CARDINALITY_HOLD
```

The over-budget ID is never inserted.

An overlong ID similarly throws:

```text
VOID_JOBS_DATANET_WORKER_JOB_ID_TOO_LARGE
```

before insertion.

The same unchanged oversized generation will continue to HOLD if rescanned. The
guard never evicts an older ID to make room, because eviction would destroy the
exact duplicate/replay semantics that `jobsSeen` currently provides.

## What this does not solve

This guard bounds the current in-memory design; it does not make historical jobs
membership scalable.

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
- a third distinct ID with a test ceiling of two HOLDs before insertion;
- a 97-character multibyte ID that is 194 UTF-8 bytes is rejected despite being
  fewer than 192 JavaScript characters; and
- existing completion, generation, byte-framing, O(delta), and consumer-effect
  guards continue to run in the same permanent proof.

No live worker, DataNet publication, WC mutation, credential/key/wallet access,
transaction, runtime deployment, validator action, or funds movement is
performed by this source/proof lane.
