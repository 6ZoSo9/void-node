# DataNet V35 clean cold remount durability on ext4 v1

## Scope

V35 is a proof-only stacked descendant of exact accepted V34/#1494 head `996af0a48a06c77231c9fbf884f74829fc909c27`.

It does not change the V34 campaign, recovery protocol, publication topology, payload ledger, or process census. V34 remains the accepted 27-lifetime / peak-9 / 960 MiB campaign with durable sequence:

`ARMED → CLAIMED → S1 → CLOSED`

V35 closes one previously open boundary only: **clean unmount/remount durability on the same explicit ext4 block devices**.

## Storage experiment

For each Node 22/24/26 job, the workflow:

1. Creates separate E0 and R0 ext4 images.
2. Attaches each image to an explicit loop device with `losetup` and retains those exact loop devices for the whole proof.
3. Mounts both devices read-write and runs the exact accepted V34 campaign unchanged.
4. Requires V34 GREEN with 27 total lifetimes, peak 9, 15,372 payload calls, 960 MiB completed I/O, and the existing five-file evidence package.
5. Calls `sync`, cleanly unmounts both filesystems, and keeps both loop devices attached.
6. Remounts the exact same loop devices read-only.
7. Requires the post-remount mount sources and root identities to equal the pre-unmount values.
8. Runs a fresh process of the accepted V34 source-distinct final verifier against the read-only remounts.
9. Requires the parsed post-remount final-verifier receipt to equal the pre-remount V34 final-verifier receipt exactly.

That fresh verifier re-reads all three payload leaves, observes their ext4 inode generations, and revalidates the R0 `ARMED`, `CLAIMED`, and `CLOSED` durable records.

## Source binding

The V35 control pins all 17 files introduced or changed by V34/#1494 to their exact Git blob identities at `996af0a48a06c77231c9fbf884f74829fc909c27`.

The workflow also executes the accepted V34 static gate before V35's own static wall, so changes to V34's accepted transitive V31/V32/V33 dependencies fail closed.

## What GREEN proves

A GREEN V35 receipt means:

- the exact accepted V34 campaign completed before unmount;
- E0 and R0 were cleanly unmounted;
- each filesystem was remounted from the exact same explicit loop block device;
- both post-remount filesystems were read-only;
- both root identities remained stable;
- a fresh accepted V34 final verifier re-read all three payload leaves and all recovery records successfully;
- the pre- and post-remount final-verifier receipts were equal;
- no production runtime was touched.

## Explicit non-claims

V35 does **not** prove:

- physical power-loss or sudden device-loss survival;
- hostile same-UID deletion or ext4 generation rewriting;
- FIEMAP or retained-image provenance;
- public-peer retrieval;
- Chain-2050 or economic authority;
- deployment or production runtime activation.

A clean unmount/remount is intentionally weaker than an actual power-loss boundary. V35 must not be cited as evidence of power-loss durability.
