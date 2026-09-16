# DataNet V39 generation-bound recovery-record admission on ext4 v1

## Scope

V39 is an additive stacked descendant of exact technically accepted V38/#1498 head `bdf244f56b151250cb76a595864cde8e174ea499`.

V39 does not edit the accepted V34–V38 files. It moves the inode-generation identity demonstrated externally by V38 into the actual durable recovery-record creation and admission path.

The preserved campaign target remains `ARMED → CLAIMED → S1 → CLOSED`, 21 role lifetimes + 6 helper lifetimes = 27 total lifetimes, peak 9, 15,372 payload calls, and 960 MiB completed payload I/O.

## V3 record binding

`ARMED`, `CLAIMED`, and `CLOSED` use V3 schemas and embed two object-identity fields:

- `record_identity`: exact live `st_dev:st_ino` of the newly created record inode;
- `record_generation`: ext4 `i_generation` observed with the existing one-GETVERSION, no-SETVERSION primitive.

Python V3 creation is open-first: create-only `O_EXCL` → exact FD metadata → GETVERSION → construct canonical V3 bytes including identity/generation → write → fd fsync → directory fsync → generation-bound reread.

Python admission opens the exact pathname with `O_NOFOLLOW`, compares fd/path identity and metadata, observes GETVERSION on the exact FD before trust, parses canonical bytes, and requires the embedded identity and generation to equal the live object.

## Node publication path without topology growth

V39 preserves the existing helper-lifetime count.

For H0 and S1, Node reserves the next durable record inode as an empty create-only `0600` file immediately before the already-counted link helper. The existing link-helper lifetime both performs the payload link and observes the reserved record FD generation. The parent Node process keeps that exact reserved FD open.

Only after the publisher's accepted postpublication readback does Node write/fsync the final V3 `ARMED` or `CLOSED` bytes into the retained reserved FD and fsync the parent directory. Therefore the durable state transition remains after readback even though its inode identity was safely reserved earlier.

For H1 claim, Python creates V3 `CLAIMED` before S1 candidate allocation. It retains generation-verified `ARMED` and `CLAIMED` FDs through the existing Python→Node exec. Node preflight authenticates those exact inherited objects and their embedded generations before S1 publication.

## Adversarial control

After a successful disposable V39 campaign, the focused workflow deletes the actual V3 `CLOSED` record and recreates byte-identical content until the original inode number is reused. The real V39 admission reader must reject the replacement on `HOLD_RECORD_EMBEDDED_GENERATION` because the live ext4 generation differs from the generation embedded in the copied record.

This control is outside the measured campaign lifetime census and therefore does not alter the 27-lifetime campaign claim.

## Explicit non-claims

V39 does not claim arbitrary hostile-host resistance, privileged offline filesystem editing resistance, kernel-compromise resistance, literal physical power loss, controller/drive volatile-cache loss, firmware behavior, torn-sector behavior, public-peer retrieval, Chain-2050 economic authority, deployment, or production activation.

V39 should be cited only after exact-head Node 22/24/26 campaign evidence and parent-preservation workflows are reviewed. Keep Draft until then.
