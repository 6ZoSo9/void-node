# DataNet V40 fs-verity recovery-record immutability on ext4 v1

V40 is a proof-only descendant of technically accepted #1499 at exact head `d14dabd01e9292feb3f737387b69258447898507`.

## Question

V39 binds each V3 recovery record to its exact ext4 inode identity and `i_generation`, which detects pathname replacement even when an inode number is reused. V40 tests the complementary primitive needed for same-inode mutation resistance: can ext4 `fs-verity` make a completed recovery-record inode permanently read-only while preserving the V39 identity/generation binding?

## Proof shape

The test filesystem is a disposable ext4 image created with the `verity` feature. Three V3-sized canonical record-shaped files (`ARMED`, `CLAIMED`, `CLOSED`) are created by the unprivileged runner user.

For every record V40 requires:

1. exact inode identity and ext4 generation are observed before sealing;
2. enabling fs-verity while the creator still has a writable FD is rejected;
3. after all writable FDs close, `FS_IOC_ENABLE_VERITY` succeeds through an `O_RDONLY` FD using SHA-256 and a 4096-byte verity block size;
4. `FS_IOC_MEASURE_VERITY` returns a SHA-256 fs-verity digest;
5. on the still-read-write ext4 mount, same-UID `O_WRONLY`, `O_RDWR`, and truncate attempts are rejected and the bytes/digest remain unchanged;
6. after a clean unmount and remount of the same loop device **read-write**, identity, ext4 generation, file SHA-256, and fs-verity digest are unchanged, and the same mutation attempts remain rejected.

The read-write remount is intentional: write denial must come from fs-verity, not from a read-only mount.

## Non-claims

V40 does not claim that fs-verity prevents unlink/path replacement. That is the separate seam V39 generation binding detects. V40 also does not yet compose fs-verity into the actual V39 `ARMED -> CLAIMED -> S1 -> CLOSED` path, does not claim arbitrary hostile-host resistance, does not prove literal physical power-loss survival, and does not touch production runtime, keys, wallets, transactions, or funds.

If this primitive is exact-green, the next lane is composition: close/reopen completed V3 records read-only, enable fs-verity, measure/bind the digest, and preserve the accepted V39 sequencing and topology.
