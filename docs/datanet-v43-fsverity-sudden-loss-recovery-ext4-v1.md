# DataNet V43 fs-verity sudden-loss recovery on ext4 v1

V43 is a proof-only descendant of technically accepted V42/#1502 exact head `eed97234cdd6013ec7e76b4b91393d2518c8d355`.

It preserves the accepted V41 campaign unchanged: `ARMED → CLAIMED → S1 → CLOSED`, V3 generation-bound records, fs-verity protection of ARMED/CLAIMED/CLOSED, 27 total lifetimes, peak 9, 15,372 payload calls, and 960 MiB completed payload I/O.

## Question

Do those actual sealed recovery records retain exact generation identity, bytes, fs-verity digest, mutation denial, and fresh admission semantics after a simulated sudden block-device loss followed by ext4 journal replay?

## Proof shape

For Node 22, 24, and 26, V43:

1. creates independent 512 MiB ext4 E0/R0 images with the `verity` feature;
2. attaches them to explicit direct-I/O loop devices and zero-offset device-mapper linear devices;
3. mounts the mapper devices read-write and runs the accepted V41 campaign unchanged;
4. captures the accepted V42 canonical snapshot before any clean unmount;
5. issues `dmsetup suspend --noflush` on both live devices;
6. while both filesystems remain mounted and suspended, copies the backing images to dedicated crash images and syncs only those copied crash files;
7. only after the crash copies exist, resumes and cleanly releases the original live filesystems; the originals are not used for recovery;
8. reattaches the crash images to the exact same loop-device paths and recreates the exact same mapper names;
9. requires the mapper device identities to match their pre-loss identities;
10. before any recovery mount, requires both crash filesystems to expose ext4 `needs_recovery` and retain the `verity` feature;
11. mounts them read-write to trigger journal replay, syncs, unmounts, and requires `needs_recovery` to clear;
12. remounts the recovered mapper devices read-write;
13. captures the same V42 canonical snapshot again without re-enabling fs-verity;
14. requires the full pre-loss/post-replay V42 snapshots to be byte-identical;
15. requires fresh V41 admission, all three payload leaves, all three recovery records, all three `(dev:ino,i_generation)` bindings, all three fs-verity SHA-256 digests, and same-UID mutation denial to remain intact.

## What GREEN proves

GREEN proves the V41-composed record set survives this bounded Linux/ext4 simulated sudden-device-loss experiment with journal replay, while retaining the V42 clean-remount invariants. The crash images must begin dirty (`needs_recovery`) and the recovered images must end clean.

## Explicit non-claims

`dmsetup suspend --noflush` plus backing-image capture is not literal physical power loss. V43 does not prove controller/drive volatile-write-cache loss, firmware behavior, torn sectors, privileged offline filesystem editing, kernel compromise, public-peer retrieval, Chain-2050 economic authority, deployment, or production activation.

No fs-verity record is re-sealed after recovery; the existing seals must measure successfully as recovered.
