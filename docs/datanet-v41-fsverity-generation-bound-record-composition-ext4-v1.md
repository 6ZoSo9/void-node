# DataNet V41 fs-verity + generation-bound recovery-record composition v1

V41 is a proof-only descendant of technically accepted V40/#1500 at exact head `9d05c65ce2033d5dbea664674b08a9592262b6b4`. It composes V40's ext4 fs-verity primitive with V39's actual generation-bound `ARMED -> CLAIMED -> S1 -> CLOSED` recovery-record path while preserving V39's accepted process topology and publication ordering.

## Composition rule

V39's `(dev:ino, i_generation)` binding remains the pathname-replacement detector. V41 adds fs-verity only after each record's writable phase has completed, so same-inode writes are rejected by the kernel on the still-read-write ext4 filesystem.

The sealing points are intentionally different for the three durable records:

1. **ARMED** — the V39 Node publisher finishes S0 publication, performs its accepted postpublication readback, finalizes ARMED, closes the writable record FD, and emits the publication receipt. The already-counted H0 collector process then enables fs-verity on that exact ARMED inode before its admission read.
2. **CLAIMED** — V39's Python create-only path observes `i_generation`, writes/fsyncs canonical CLAIMED bytes and performs the V39 readback. V41 does not retain the creator's writable FD. After every writable/readback FD closes, the same claimant process reopens the exact inode read-only, enables fs-verity, measures SHA-256 and retains only the sealed read-only FD across the existing Python-to-Node exec. This completes before `claim_h1()` returns and therefore before S1 payload allocation.
3. **CLOSED** — the V39 Node publisher completes S1 publication and its accepted postpublication readback, finalizes CLOSED and closes the writable FD. The already-counted final-verifier process then enables fs-verity on the exact CLOSED inode before any final V41 admission of ARMED/CLAIMED/CLOSED.

CLOSED sealing is therefore **after creation/postpublication readback and before final admission**. V41 does not claim that fs-verity enablement is atomic with CLOSED creation.

## Required invariants

For the exact V41 campaign:

- ext4 images are created with the `verity` superblock feature and remain mounted read-write during the record mutation controls;
- V39's 17 external `EXT4_IOC_GETVERSION` observations and zero SETVERSION operations remain unchanged;
- exactly three successful `FS_IOC_ENABLE_VERITY` operations occur: ARMED, CLAIMED and CLOSED;
- final admission requires all three records to return a SHA-256 `FS_IOC_MEASURE_VERITY` digest;
- each V41 record admission requires same-UID `O_WRONLY`, `O_RDWR` and truncate attempts to fail with `EPERM` while the filesystem itself is read-write;
- record bytes, `(dev:ino)` and embedded `i_generation` stay bound exactly as in V39;
- the V39 Node adapter and link-generation helper are reused unchanged;
- the accepted campaign remains 21 role + 6 helper = 27 lifetimes, peak 9, 15,372 payload calls and 960 MiB completed payload I/O;
- the generation-replacement control remains outside the measured campaign trace and proves that fs-verity does not prevent unlink/path replacement, while V39 generation binding rejects a byte-identical same-inode-reuse replacement.

The initial exact syscall hypothesis is three successful verity-enable ioctls and nine successful verity-measure ioctls. That count is an acceptance condition only if the first exact-head trace confirms it; it must not be adjusted to a different number without reviewing the trace and explaining the additional or missing admission.

## Non-claims

V41 does not claim fs-verity prevents unlink or pathname replacement. It does not prove privileged offline filesystem-edit resistance, kernel-compromise resistance, literal physical power loss, controller/drive volatile-cache loss, public-peer retrieval, Chain-2050 economic authority, deployment or production activation.

No key, wallet, signer, transaction, treasury, liquidity or funds action is part of this proof.
