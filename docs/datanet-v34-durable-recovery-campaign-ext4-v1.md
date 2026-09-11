# DataNet V34 durable recovery campaign on ext4 v1

## Status

V34 is a **Draft-only descendant** of accepted #1493 head `9edfd10721eadc7afb4dd1708f82a11b2df182e7`. That head is an immutable input. V34 does not rewrite, retarget, or weaken the accepted V31/V32/V33 artifacts it composes.

The lane answers one question: can the accepted 27-lifetime / peak-9 campaign carry a durable recovery authorization sequence of `ARMED → CLAIMED → S1 → CLOSED` without adding a campaign process lifetime or another full payload pass?

## Composition

The accepted V31 process census is preserved exactly:

- 21 role lifetimes: observer, 8 E0 contenders, E0 classifier, R0 H0 publisher, checkpoint collector, 8 R0 recovery contenders, and source-distinct final verifier.
- 6 helper lifetimes: one `fallocate` helper and one link helper for each of the three successful publications.
- 27 total lifetimes; derived peak live process count remains 9.

E0 is intentionally unarmed. Its classifier rereads S0, observes the ext4 inode generation, and terminates `HOLD_NO_RECOVERY_AUTH`.

R0 H0 replaces only the already-counted `/usr/bin/ln` helper lifetime with `datanet_v34_link_generation_helper_v1.py`. That helper performs the create-only link and exactly one `EXT4_IOC_GETVERSION` observation on the linked payload inode. The still-running H0 Node publisher owns K, has already completed the accepted postpublication readback, and then create-only writes/fsyncs/readbacks `ARMED`. The diagnostic collector runs afterward while the publisher still owns K; it validates `ARMED` and S0 metadata without rereading the payload or generation. The campaign then SIGKILLs H0 and proves K is released.

The R0 recovery race is still one-of-eight. The winner owns K, performs the accepted full S0 hash plus generation observation, verifies the durable `ARMED` record, creates a sealed anonymous claimant capability, create-only writes/fsyncs/readbacks `CLAIMED`, and only then authorizes S1 allocation. The claimant capability is a Linux memfd sealed with `F_SEAL_WRITE | F_SEAL_GROW | F_SEAL_SHRINK | F_SEAL_SEAL` (mask 15) and is the only new exec-preserved descriptor beyond the already accepted K and S0 custody.

The same Python recovery winner PID executes Node through the V34 adapter. There is **no Node→Python exec return path**: Node closes non-stdio descriptors across `process.execve()`, so V34 deliberately avoids that unsafe composition. Before importing the accepted V32 S1 publisher, the adapter validates the durable `ARMED` and `CLAIMED` records, the sealed inherited claimant bytes, the current PID/root/lock/K bindings, and the absence of S1/CLOSED. Only after that preflight does it import the accepted publisher in the same Node process. It hides only the V34 marker filenames from the legacy publisher's exact namespace assertions; the marker files stay present and are independently validated by the adapter and final verifier.

For S1, the adapter again replaces only the already-counted link helper with the link+generation helper. After the accepted V32 publisher has verified inherited S0 before allocation, allocated/written/fsynced/rehashed S1, linked it create-only, fsynced the directory, closed the writable fd, and completed postpublication readback, the same Node PID rereads ARMED/CLAIMED and the sealed claimant capability, requires their digests to match the preflight, and only then create-only writes/fsyncs/readbacks `CLOSED`.

## Payload ledger

V34 adds no full payload pass. Marker and capability bytes are control-plane evidence and are not counted as payload traffic. The accepted V31 composed payload ledger therefore remains exactly:

- 15,372 calls
- 1,006,632,972 requested bytes
- 1,006,632,960 completed or returned bytes
- 3,072 writes
- 12,300 reads
- 12 EOF probes
- **960 MiB** completed payload I/O

The source-distinct final verifier independently rereads E0/S0 and R0/S0+S1, observes all three terminal inode generations, and binds the R0 durable records to those leaves.

## External syscall census

The workflow traces the campaign externally. The source-bound census requires:

- 7 `EXT4_IOC_GETVERSION` calls and 0 `EXT4_IOC_SETVERSION` calls;
- 3 successful `fallocate` operations and 3 successful payload links;
- 1 claimant `memfd_create`, 1 successful `F_ADD_SEALS`, and 1 `F_GET_SEALS`;
- exactly one create-only ARMED, CLAIMED, and CLOSED marker creation;
- 3 V34 adapter execs and 2 link+generation-helper execs;
- 0 successful unlink/rename-family syscalls inside the traced campaign.

The syscall observer and its post-campaign parser are workflow instrumentation, not campaign lifetimes.

## Fail-closed boundaries

V34 does **not** claim cold unmount/remount durability, physical power-loss survival, hostile same-UID deletion resistance, same-UID ext4 generation rewrite resistance, retained-image FIEMAP provenance, public-peer retrieval, or Chain-2050 economic/validator authority. It does not deploy, mount production storage, touch wallets, submit transactions, activate presale behavior, or move funds.

The lane stays Draft until the exact-head Node 22/24/26 ext4 matrix, V24 source-bound fault controls, external syscall census, evidence package, and diff hygiene are green.
