# Public node safe-serve snapshot budget v1

## Purpose

This is the bounded aggregate-memory successor to #3015 / #3007 and tracks
#3021.

#3015 caps one retained public file at 8 MiB before allocation and removes body
reads from HEAD. This policy adds a process-global admission budget so many
individually valid GETs cannot accumulate an unbounded number of full-file
snapshot Buffers.

## Budget

The reviewed source constants are:

- maximum one retained-file snapshot: 8 MiB (preserved from #3015);
- aggregate admitted snapshot bytes: 32 MiB;
- maximum active GET snapshot reservations: 8.

The aggregate limit therefore admits at most four simultaneous maximum-size
snapshots. The count ceiling remains independently useful for many small files.

These limits cover safe-serve body snapshot Buffers only. They are not a claim
about whole-process RSS, V8/GC retention, socket buffers, kernel buffers, or
other memory domains.

## Admission ordering

For a nonempty GET:

1. descriptor-relative traversal and retained-file metadata validation happen
   under the #2965 / #3015 custody contract;
2. the exact retained descriptor size is reserved from the process-global
   budget;
3. capacity rejection closes the retained file and returns bounded HTTP 503 +
   Retry-After before body allocation/read;
4. only an admitted request calls the #3015 bounded retained-descriptor reader;
5. the reservation remains owned by that response until completion.

HEAD returns retained metadata and closes the descriptor before the budget path.
It creates no body-snapshot reservation.

## Release contract

A successful snapshot reservation is released on:

- response finish;
- response close;
- response error;
- request abort;
- an already-aborted request or already-destroyed response at lifecycle arm;
- body read/descriptor verification failure; or
- synchronous response-send failure.

Release is idempotent and bound to one private reservation identity. Capacity
becomes available for retry immediately after release.

## Preserved boundaries

This source does not weaken:

- the 8 MiB per-file ceiling;
- retained descriptor identity checks;
- descriptor-relative traversal beneath the retained public root;
- O_NOFOLLOW symlink refusal;
- lexical traversal rejection; or
- HEAD's no-body-read behavior.

No caller header, address, or identity participates in memory admission.

## Authority boundary

Source/test/CI only.

No deployment, public listener/network/DNS/service mutation, credential/key/
wallet/signer access, transaction, validator/WC mutation, presale/market
activation, treasury/liquidity or funds movement is authorized or performed.
