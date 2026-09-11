# DataNet V37 FIEMAP retained-image provenance on ext4 v1

## Scope

V37 is a proof-only stacked descendant of exact accepted V36/#1496 head `f50f65413b2531233078756e3904a05319599db8`.

It does not change the accepted V34 campaign, recovery protocol, publication topology, payload ledger, V35 clean-remount proof, or V36 sudden-device-loss simulation. The preserved campaign remains `ARMED → CLAIMED → S1 → CLOSED`, 27 total lifetimes, peak 9, 15,372 payload calls, and 960 MiB completed payload I/O.

V37 closes one narrower evidence boundary: **FIEMAP-to-retained-crash-image byte provenance for the six accepted data-bearing files**.

## Provenance experiment

For each Node 22/24/26 job, V37:

1. Runs the exact accepted V34 campaign on ext4 behind zero-offset loop devices and zero-offset device-mapper linear targets.
2. Uses the accepted V34 restart census and source-distinct final-verifier receipt as the independent oracle for the exact six data-bearing files: three payload leaves plus `ARMED`, `CLAIMED`, and `CLOSED`.
3. Re-reads each file and requires its live SHA-256, inode identity, size, link count, and mode to match that accepted oracle.
4. Calls Linux `FS_IOC_FIEMAP` **without** `FIEMAP_FLAG_SYNC` and requires complete, contiguous logical coverage with no unknown, delayed-allocation, encoded, inline, unwritten, merged, shared, or unaligned extents.
5. Suspends both mapper devices with `dmsetup suspend --noflush` and captures the backing images before any live filesystem unmount.
6. Requires full SHA-256 equality between each suspended source image and its crash copy.
7. Before journal replay, reads each file directly from the raw crash image at the FIEMAP-reported physical byte ranges and reconstructs the accepted file SHA-256 values.
8. Only after that raw-image proof completes does V37 release the live filesystems and run the accepted V36 recovery sequence on the captured crash images.
9. Requires V36 to remain GREEN after observable `needs_recovery`, journal replay, same-device recreation, and read-only final verification.

The zero-offset loop and device-mapper requirements are material: they make the FIEMAP physical byte addresses directly comparable with offsets in the backing/crash image files.

## What GREEN proves

A GREEN V37 receipt proves, within this Linux loop/device-mapper/ext4 simulation:

- the FIEMAP manifest is census-bound rather than self-authenticating;
- all six accepted data-bearing files have complete ordinary mapped extents;
- no FIEMAP sync request was used to manufacture durability at the loss boundary;
- the source and crash images were byte-identical while the mapper was suspended;
- the raw crash-image bytes at the reported physical extents reconstruct all six accepted file hashes before replay;
- the accepted V36 unclean recovery proof still succeeds afterward;
- no production runtime was touched.

## Explicit non-claims

V37 does **not** prove literal physical power-loss survival, loss of real hardware/controller volatile caches, firmware behavior, torn-sector behavior, or actual runner power interruption.

It also does not prove hostile same-UID deletion or ext4-generation rewriting, public-peer retrieval, Chain-2050/economic authority, deployment, or production activation.

Accordingly, V37 should be cited as **FIEMAP/raw retained-image provenance layered onto the accepted simulated sudden-device-loss proof**, not as a hardware power-loss certification.
