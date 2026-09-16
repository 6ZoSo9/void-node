# DataNet V38 recovery-record generation identity on ext4 v1

## Scope

V38 is a proof-only stacked descendant of exact accepted V37/#1497 head `6efa4a2343db24c3bf8acbdc20fccd4928ed0c3e`.

It does not modify the accepted V34 campaign, V35 cold-remount proof, V36 sudden-device-loss recovery, V37 FIEMAP/raw-image provenance proof, recovery-record format, publication topology, or production runtime. The preserved campaign remains `ARMED → CLAIMED → S1 → CLOSED`, 27 total lifetimes, peak 9, 15,372 payload calls, and 960 MiB completed payload I/O.

V38 closes one narrower proof boundary: **generation-bound identity for the three durable recovery records, including adversarial same-UID exact-byte replacement controls**.

## Why generation is needed

The accepted V34 final verifier authenticates the recovery-record names, canonical bytes, hashes, ownership, link count, and mode. It does not include each recovery record's inode number or ext4 `i_generation` in its final receipt.

That creates a precise negative-control opportunity: an actor with the same UID and directory write access can delete a record and recreate the same pathname with the same canonical bytes, mode, size, owner, and hash. A content-only verifier can remain GREEN even though the file object was replaced.

V38 binds each of `ARMED`, `CLAIMED`, and `CLOSED` to `(device, inode, ext4 i_generation)` in addition to the accepted V34 census/hash oracle.

## Generation experiment

For each Node 22/24/26 job, V38:

1. Runs the exact accepted V34 durable-recovery campaign on ext4 behind loop + device-mapper devices.
2. Uses the accepted V34 restart census and final-verifier hashes as the independent oracle for the exact three R0 recovery records.
3. Opens each exact record with `O_NOFOLLOW`, requires accepted identity/size/mode/link/hash agreement, and reads ext4 `i_generation` with the existing observation-only GETVERSION primitive.
4. Captures the three generation identities before simulated sudden device loss.
5. Performs the accepted V36 `dmsetup suspend --noflush` crash-image capture and journal-replay recovery sequence.
6. On the recovered read-only filesystem, requires all three record `(device, inode, generation)` tuples and hashes to be unchanged.
7. Only after the clean recovery receipt is captured, remounts the disposable recovered R0 test image read-write and performs same-UID exact-byte replacement controls.
8. Recreates all three record pathnames with byte-identical contents, `0600`, one link, the same UID, the same size, and the same SHA-256.
9. For `CLOSED`, requires bounded delete/recreate churn to obtain reuse of the original inode number and then requires a different ext4 generation.
10. Attempts `EXT4_IOC_SETVERSION` on each recreated record with the old generation and requires `ENOTTY` while `metadata_csum` is enabled; the generation must remain unchanged after the rejected forgery attempt.
11. Requires the V38 generation binding to reject every recreated record. The same-inode control must be rejected specifically because the generation changed.
12. Runs the accepted V34 content verifier after all three substitutions and requires its receipt to remain byte-for-byte equal to the pre-mutation receipt. This is an intentional blind-control demonstrating that the new generation binding closes a real seam rather than duplicating an existing content check.

## What GREEN proves

A GREEN V38 receipt proves, within this Linux/ext4 simulation:

- all three durable recovery records retain exact inode-generation identity across the accepted simulated sudden-loss + journal-replay recovery;
- same-UID deletion/recreation with identical bytes, hash, name, owner, size, mode, and link count is detected by the V38 identity binding;
- when the same inode number is reused, the changed ext4 generation independently distinguishes the replacement;
- with `metadata_csum` enabled on the tested filesystem, same-owner `EXT4_IOC_SETVERSION` attempts used by the control are rejected with `ENOTTY` and do not restore the old generation;
- the prior content verifier can intentionally remain GREEN after exact-byte replacement, proving that generation identity adds non-redundant evidence;
- accepted V36 recovery remains GREEN before the destructive controls begin;
- accepted V37 source is pinned exactly and its own workflow is expected to rerun on the V38 head;
- no production runtime is touched.

## Explicit non-claims

V38 does **not** prove arbitrary same-UID mutation resistance. It specifically tests deletion/recreation of the three accepted recovery-record files and a SETVERSION forgery attempt on the tested ext4 shape.

It does not prove literal physical power loss, controller/drive volatile-cache loss, firmware behavior, torn sectors, offline privileged filesystem editing, kernel compromise, public-peer retrieval, Chain-2050/economic authority, deployment, or production activation.

Accordingly, V38 should be cited as **generation-bound recovery-record identity plus same-UID exact-byte replacement controls layered onto accepted V36/V37 evidence**, not as a general hostile-host or hardware power-loss certification.
