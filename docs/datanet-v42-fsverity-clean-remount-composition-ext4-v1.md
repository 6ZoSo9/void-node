# DataNet V42 fs-verity clean-remount composition on ext4 v1

V42 is a proof-only descendant of technically accepted V41/#1501 exact head `31bc55d86b0fd9a6b963834dfd46243e34cd9ea3`.

It does not edit accepted V41 files or change the accepted campaign. The preserved campaign remains `ARMED → CLAIMED → S1 → CLOSED`, 27 total lifetimes, peak 9, 15,372 payload calls, 960 MiB completed payload I/O, V3 embedded ext4 generation binding, and fs-verity protection of all three completed recovery records.

## Question

Does the actual V41 record set retain the same generation-bound identity, fs-verity digest, bytes, and admission semantics across a clean unmount and read-write remount of the exact same explicit ext4 block devices?

## Proof

For Node 22, 24, and 26, V42:

1. creates independent 512 MiB ext4 E0/R0 images with the `verity` feature;
2. attaches each image to an explicit loop device and mounts those exact devices read-write;
3. runs the accepted V41 campaign unchanged and requires its 27/9/15,372/960 GREEN result and five-file evidence package;
4. while still on the original read-write mounts, launches a fresh source-distinct V42 snapshot verifier;
5. that verifier runs the accepted V39 final verifier with V41 record IO, rereads all three payload leaves, requires all three V3 recovery records to be generation-bound and fs-verity measurable, and requires same-UID O_WRONLY/O_RDWR/truncate attempts to fail with `EPERM`;
6. it records exact ARMED/CLAIMED/CLOSED SHA-256, `(dev:ino,i_generation)`, fs-verity SHA-256 digest, and final-verifier receipt;
7. syncs and cleanly unmounts E0/R0 while leaving the exact loop devices attached;
8. remounts those same block devices **read-write** so mutation denial cannot be attributed to a read-only mount;
9. launches the exact same fresh snapshot verifier again;
10. requires block-device source equality, root identity stability, and byte-for-byte equality of the complete pre/post canonical snapshot;
11. retains the V41 campaign evidence plus pre/post snapshots and V42 receipt.

The V42 verifier does not re-enable fs-verity after remount. Existing sealed records must already measure successfully and deny mutation.

## What GREEN proves

GREEN proves clean same-device RW→RW remount persistence for the actual V41-composed recovery records: stable root identities, record inode/generation identities, record bytes, fs-verity digests, same-UID in-place mutation denial, and fresh generation-bound recovery admission. It also re-verifies all three payload leaves after remount.

## Non-claims

V42 is a clean-unmount proof. It does not prove unclean journal replay, simulated sudden device loss, literal physical power loss, controller/drive volatile-cache loss, torn sectors, privileged offline filesystem editing, kernel compromise, public-peer retrieval, Chain-2050 economic authority, deployment, or production activation.

The next separate lane after V42 is unclean `suspend --noflush` / journal-replay composition for the V41-sealed records.
