# DataNet V44 fs-verity raw corruption detection on ext4 v1

V44 is a proof-only descendant of technically accepted V43/#1503 exact head `10db8d1f64d8b665b2b568d67270ef3e4019516c`.

It does not alter accepted V41–V43 behavior. V44 tests a complementary property of the already-sealed V3 recovery records: whether fs-verity detects an offline raw data-block corruption that bypasses normal filesystem write permissions.

## Experiment

For each Node 22/24/26 job:

1. Create disposable E0/R0 ext4 filesystems with the `verity` feature and run the accepted V41 campaign unchanged.
2. Sync while R0 remains mounted and use FIEMAP **without the SYNC flag** on the sealed `CLOSED` record.
3. Bind the exact file `(dev:ino,i_generation)`, metadata, SHA-256, fs-verity root digest, and data extent.
4. Read the backing image at the returned physical data extent and require those raw bytes to equal the accepted sealed record bytes before mutation.
5. Cleanly unmount and detach the loop devices.
6. Copy the intact R0 backing image as a private comparison oracle, then flip exactly one byte at file logical offset zero by writing directly to the raw backing-image physical extent. No filesystem pathname write is used.
7. Require bytewise image comparison to show exactly one changed byte at the expected physical offset.
8. Reattach the mutated image to the exact same loop-device path and mount it read-write.
9. Before attempting a protected data read, require the `CLOSED` pathname to retain the exact inode number, ext4 generation, size, owner, mode, link count, and measured fs-verity SHA-256 root digest.
10. Require direct `pread()` of the corrupted sealed record to fail with `EIO`.
11. Require the **actual V41 recovery-record admission reader** to fail with `EIO` on the same corrupted record.
12. Require normal same-UID O_WRONLY/O_RDWR/truncate attempts to remain denied with `EPERM`.

## Interpretation

This separates replacement detection from content-integrity detection:

- V39/V41 generation binding detects pathname replacement even when bytes are identical.
- V44 keeps the same inode and generation but changes one data byte underneath ext4. The fs-verity root digest remains the same because the descriptor/verity metadata is not modified, while the protected read detects that the data no longer hashes to that root and returns `EIO`.

## Non-claims

V44 mutates one mapped data byte only. It does not prove behavior for corruption of the fs-verity Merkle tree or descriptor itself, arbitrary offline metadata edits, kernel compromise, literal physical power loss, controller/drive cache loss, public-peer retrieval, Chain-2050 economic authority, deployment, or production activation.
