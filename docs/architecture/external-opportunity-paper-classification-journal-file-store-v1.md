# VOID External Opportunity Paper Classification Journal File Store V1

Marker:
`VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1`

## Purpose

This lane gives the merged paper-classification journal an explicit local JSONL
durability adapter.

The journal contract remains responsible for entry construction, validation,
deduplication, held-entry policy, and daily summaries. The file store is
responsible only for bounded local persistence under an operator-supplied
allowed root.

Nothing invokes this module automatically. A caller must supply:

1. a validated file-store configuration;
2. one sanitized paper classification;
3. an ISO timestamp;
4. the exact confirmation string
   `storePaperClassificationJournalEntryV1`.

## Path boundary

The allowed root must:

- be an absolute path;
- already exist;
- be a directory;
- not be a symbolic link.

The journal filename is fixed to:

`paper-classification-journal-v1.jsonl`

The store resolves the allowed root to its canonical real path and proves the
journal and sidecar-lock paths remain contained beneath that root. Existing
journal and lock paths must be regular files and must not be symbolic links.

## Bounded read

Before planning an append, the store reads the current journal while holding an
exclusive sidecar lock.

The read is bounded by:

- `max_file_bytes`;
- `max_entries`;
- `max_line_bytes`.

The file must:

- have mode `0600`;
- end on a complete newline when non-empty;
- contain valid JSON on every line;
- contain only valid V1 journal entries;
- contain no repeated classification ID;
- contain no repeated source-record SHA-256.

Malformed, oversized, partial, duplicate, or incorrectly permissioned journals
are held without append.

## Exclusive lock

The lock path is the journal path plus `.lock`.

The store creates it with:

- `O_EXCL`;
- `O_NOFOLLOW` where supported;
- mode `0600`;
- a deterministic operation ID;
- the requested timestamp and current PID;
- `fsync` before proceeding.

An existing regular lock returns `lock_busy`. A symlink or non-regular lock is
held. V1 never deletes or overrides an existing lock and has no stale-lock
automation.

The store records the lock inode and device. It removes only the exact lock it
created.

## Read-plan-append

While holding the lock, the store:

1. reads and validates the bounded journal;
2. calls the merged pure journal planner;
3. returns duplicate or held decisions without journal mutation;
4. for a ready plan, re-reads and verifies the journal has not changed;
5. opens the exact journal in append-only, no-follow mode;
6. uses exclusive creation when the journal was previously absent;
7. verifies the file inode, size, and regular-file posture;
8. forces mode `0600`;
9. appends exactly one compact JSON object and one newline;
10. `fsync`s the journal;
11. `fsync`s the containing directory;
12. re-reads and verifies the new final record and file hash.

The output receipt binds before/after entry counts, byte lengths, SHA-256
digests, append size, lock state, file mode, and `fsync` results.

## Paper-negative values

The file store preserves the journal contract's signed paper results. A
paper-negative entry may contain negative net profit and net-profit margin while
notional, gross revenue, costs, and projected loss remain bounded by the journal
schema.

## Proof scope

Repository proof uses newly created temporary directories only. It proves:

- missing confirmation holds before filesystem access;
- first positive append;
- exact duplicate suppression;
- exclusive-lock contention;
- paper-negative append and signed daily totals;
- `0600` permissions;
- complete newline framing;
- journal symlink rejection;
- lock symlink rejection;
- root symlink rejection;
- trailing partial-line rejection;
- no network, credential, wallet, transaction, runtime, service, scheduler, or
  live-execution authority.

No current observer output or live journal path is read or written by the proof.

## Explicit non-authority

This lane does not:

- modify the Across observer;
- modify or install a scheduled observer;
- install a service or timer;
- access an API credential;
- make a network or RPC request;
- access a wallet, key, mnemonic, or signer;
- construct, sign, or submit a transaction;
- authorize live opportunity execution;
- mutate Buy VOID, Work Credits, validators, or releases;
- perform any implicit or background journal access.

## Six-file boundary

1. `src/external_opportunity/paper_classification_journal_file_store_v1.ts`
2. `scripts/prove_external_opportunity_paper_classification_journal_file_store_v1.ts`
3. `fixtures/external-opportunity/paper-classification-journal-file-store-v1.example.json`
4. `schemas/external-opportunity-paper-classification-journal-file-store-v1.schema.json`
5. `.github/workflows/external-opportunity-paper-classification-journal-file-store-v1.yml`
6. this architecture record
