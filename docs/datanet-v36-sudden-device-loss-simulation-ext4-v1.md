# DataNet V36 sudden device-loss simulation on ext4 v1

## Scope

V36 is a proof-only stacked descendant of exact accepted V35/#1495 head `d98367bdefb720c6289e44d1022da9a4e529633d`.

It does not modify the accepted V34 campaign, durable recovery protocol, publication topology, payload ledger, or V35 clean-remount proof. The preserved campaign remains:

`ARMED → CLAIMED → S1 → CLOSED`

with 21 role lifetimes + 6 helper lifetimes = **27 total**, **peak 9**, **15,372** payload calls, and **960 MiB** completed payload I/O.

V36 closes a narrower crash-consistency boundary: **survival of a simulated sudden block-device loss after the accepted campaign has returned GREEN, without a filesystem sync or unmount at the loss boundary**.

## Crash experiment

For each Node 22/24/26 job, the workflow:

1. Creates separate E0 and R0 ext4 backing images.
2. Attaches them to loop devices using direct I/O.
3. Places a device-mapper linear target in front of each loop device and mounts the mapper devices.
4. Runs the exact accepted V34 campaign unchanged and retains its five-file evidence package.
5. Suspends both mapper devices with `dmsetup suspend --noflush`.
6. While the live filesystems remain mounted and suspended, copies the backing images to dedicated crash images.
7. Only after those crash images exist does the workflow resume and cleanly release the original live filesystems. Those later-cleaned originals are never used for recovery.
8. Reattaches only the captured crash images to the same loop paths and recreates the same mapper identities.
9. Before any recovery mount, requires both captured ext4 images to expose the `needs_recovery` feature.
10. Performs a fresh read-write mount so ext4 journal replay can recover the captured images, then cleanly unmounts them.
11. Requires `needs_recovery` to be absent after replay and clean unmount.
12. Remounts the recovered filesystems read-only.
13. Requires the original root identities to remain valid and launches a fresh accepted V34 source-distinct final verifier.
14. Requires the post-recovery final-verifier receipt to equal the pre-loss V34 final-verifier receipt exactly.

The final verifier therefore re-reads all three payload leaves, re-observes their ext4 inode generations, and revalidates the durable `ARMED`, `CLAIMED`, and `CLOSED` records after recovery from the unclean captured images.

## Source binding

The V36 control pins all four V35/#1495 files to their exact Git blob identities at accepted head `d98367bdefb720c6289e44d1022da9a4e529633d`.

The workflow also runs the accepted V34 and V35 static gates before V36's own wall. Changes to accepted V34/V35 dependencies therefore fail closed, and the V36 trigger surface includes those dependencies.

## What GREEN proves

A GREEN V36 receipt proves, within this Linux/device-mapper simulation:

- the exact accepted V34 campaign completed before the simulated loss;
- the loss boundary used device-mapper suspension with `--noflush`;
- the crash images were captured before any live filesystem unmount;
- those captured images were observably unclean (`needs_recovery`) before replay;
- fresh ext4 journal replay recovered them;
- the same device and root identities were recreated;
- the recovered filesystems were verified read-only;
- all three payload leaves and durable recovery records survived;
- the pre-loss and post-recovery accepted V34 final-verifier receipts were identical;
- no production runtime was touched.

## Explicit non-claims

V36 does **not** prove literal physical power-loss survival. In particular, it does not model loss of a real drive/controller volatile write cache, firmware behavior, torn sectors caused by hardware, or power interruption of the GitHub runner itself.

V36 also does not prove hostile same-UID deletion or generation rewriting, FIEMAP/retained-image provenance, public-peer retrieval, Chain-2050/economic authority, deployment, or production activation.

Accordingly, V36 should be cited as a **simulated sudden block-device-loss / unclean crash-recovery proof**, not as a physical hardware power-loss certification.
