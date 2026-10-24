# Buy VOID V7 fs-verity capability census V1

Marker: `VOID_BUY_VOID_V7_FSVERITY_CAPABILITY_CENSUS_V1`.

Status: **source-only read-only census**. This lane does not enable fs-verity, create or replace files, mutate mounts, install a launcher/runtime, run protected V4 apply, or grant economic authority.

## Why this census exists

The V7 trusted-root launcher source now requires Linux fs-verity on every privileged file that can affect pre-V4 execution:

- launcher ELF;
- root policy;
- landed V4 installer;
- static Python executable;
- stdlib ZIP.

Before designing the later host installer, VOID needs actual Precision evidence about the filesystem backing `/opt` and kernel fs-verity support.

This census deliberately does **not** test capability by enabling verity on a temporary file. Such a test would mutate the filesystem and belongs to a separately reviewed/authorized host lane.

## Privilege boundary

Run this census only as the ordinary Precision user.

**Do not run the checkout script through sudo/root.**

V1 explicitly rejects UID/EUID 0. That avoids recreating the privileged first-instruction problem that the trusted-root launcher is intended to close.

Before mount selection, V1 requires `/opt` itself to be a real directory at its canonical absolute path. A symlinked or aliased `/opt` is HOLD; V1 does not follow it to a different filesystem. The target directory inode generation is snapshotted before the probes and revalidated after them, alongside the terminal mountinfo row.

The census uses:

- bounded direct reads of `/proc/self/mountinfo`, `/proc/filesystems`, and readable kernel-config sources;
- bounded streaming decompression for `/proc/config.gz`: at most `MAX_CONFIG_BYTES + 1` output is materialized, expansion past the 4 MiB limit is rejected, malformed DEFLATE is normalized to HOLD, and decompression memory exhaustion is normalized to HOLD;
- no subprocesses;
- no shell;
- no unbounded gzip decompression or traceback-only malformed-DEFLATE path;
- no ioctl calls;
- no file creation;
- no write-capable file descriptors;
- no mount/permission mutation.

For ext4 only, V1 attempts a direct `O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK` read of the mounted block device's superblock and checks:

- `/opt` is a canonical real directory, not a symlink/alias;
- the target directory generation remains unchanged through the probe;
- among longest-prefix mountinfo rows, the selected visible row's `major:minor` matches the canonical target directory's `st_dev`;
- if multiple longest-prefix rows still match that same device, selection is ambiguous and the census HOLDS rather than guessing mount order;
- the resolved block device's major/minor matches mountinfo's mounted-device `major:minor`;
- the opened descriptor's `st_rdev` still matches that same mounted-device number;
- ext4 magic `0xEF53`;
- incompatible-feature `EXTENTS` bit `0x0040`;
- read-only-compatible `VERITY` bit `0x8000`;
- a terminal re-read of `/proc/self/mountinfo` still selects the identical `/opt` mount row after the kernel/device probes.

Any target-path generation drift, visible-mount ambiguity, target/mount device-number mismatch, block-device drift, or mount-generation drift is HOLD.

If the ordinary user cannot read the block device, the census reports HOLD. **That HOLD must not be worked around with sudo against the ordinary checkout.** The missing privileged feature observation must later be performed only through a separately reviewed trusted first-instruction host lane.

V1 reports btrfs/f2fs as documented fs-verity filesystem classes, but the authoritative V1 feature-bit admission is intentionally ext4-only. Non-ext4 targets HOLD for a successor filesystem-specific proof rather than receiving inferred GREEN.

## Linux fs-verity semantics bound by the later host design

The later installer must preserve the kernel requirements that:

1. `FS_IOC_ENABLE_VERITY` is performed on an O_RDONLY file descriptor;
2. no writable descriptor or writable mmap may remain for that inode;
3. failed enablement changes nothing;
4. successful enablement makes file contents read-only and verified on reads;
5. `FS_IOC_MEASURE_VERITY` returns an fs-verity digest, which is distinct from VOID's ordinary full-file SHA-256 and must not replace it.

For ext4, the filesystem itself must have the `verity` RO_COMPAT feature enabled. This census reads that bit directly when the underlying block device is safely readable without privilege.

## Operator flow

From the canonical Precision checkout:

```bash
cd /home/zoso/dev/void-node

/usr/bin/python3 -I -B   ops/precision/void_buy_void_v7_fsverity_capability_census_v1.py   --plan

/usr/bin/python3 -I -B   ops/precision/void_buy_void_v7_fsverity_capability_census_v1.py   --run
```

The run is expected to produce one of two states.

### GREEN

GREEN means V1 directly observed all of its conservative ext4 requirements:

- designated Precision hostname;
- ordinary-user execution;
- canonical non-symlink `/opt` target with stable inode generation;
- unambiguous visible mount row bound to the target directory's `st_dev`;
- writable `/opt` mount;
- explicit ext4 `dax=never`, proving DAX is disabled for candidate verity files;
- observed kernel `CONFIG_FS_VERITY` support from a bounded kernel-config read/decompression path;
- mounted ext4 driver present;
- readable underlying block device;
- valid ext4 superblock;
- extents feature enabled;
- ext4 verity RO_COMPAT feature enabled;
- mounted-device major/minor remained bound;
- terminal `/opt` mount generation remained unchanged.

GREEN is capability evidence only. It is not installation or apply authority.

DAX handling is intentionally fail-closed. On ext4, no DAX mount option means the kernel default `dax=inode`, which follows the persistent per-inode `FS_XFLAG_DAX` policy. This V1 census does not issue `FS_IOC_FSGETXATTR` or any other ioctl, so it cannot prove that inherited inode DAX is disabled. Therefore both the default/no-option case and explicit `dax=inode` HOLD. Legacy `dax` and `dax=always` also HOLD because they force DAX. Only explicit `dax=never` proves the no-DAX prerequisite required by this census.

### HOLD

HOLD is expected when evidence is incomplete.

In particular, if:

```text
ext4_source_device_status != ok
```

the next action is:

```text
HOLD_PRIVILEGED_FEATURE_PROBE_REQUIRES_TRUSTED_FIRST_INSTRUCTION
```

Do not substitute `sudo python3 ... --run`.

## Output authority

Every plan/run path states false authority for:

- filesystem writes;
- block-device writes;
- mount mutation;
- permission mutation;
- fs-verity enablement;
- protected host installation;
- protected V4 apply;
- service mutation;
- credential/private-key access;
- signing;
- transactions;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

PROTECT THE CORE.
