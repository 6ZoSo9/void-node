# DataNet POSIX admission capability v1

Marker: `VOID_DATANET_POSIX_ADMISSION_CAPABILITY_V1`

Status: Linux source/proof only. This lane selects and falsifies one candidate kernel primitive for the #1352 V23 root+K pre-allocation exclusion requirement. It performs no DataNet payload publication, reservation, cold-remount claim, Chain-2050 mutation, or economic action.

## Candidate primitive

Use a traditional process-associated POSIX record lock (`F_SETLK`, exposed by Python `fcntl.lockf(..., LOCK_EX|LOCK_NB)`) on byte `[0,1)` of one already-created regular capability inode.

For quota key `K`, the capability leaf is exactly:

`.void-datanet-admission-<lowercase_hex64(K)>.lock.v1`

It lives directly beneath the already bound store root but does **not** use the V27 payload prefix `datanet-<K>-`; therefore it is not S0, S1, S2, or payload occupancy.

The capability leaf must exist before contender admission begins. Contenders never create, replace, rename, unlink, truncate, or write it. They open it relative to the bound root with `O_RDWR|O_CLOEXEC|O_NOFOLLOW` and require:

- exact expected root `(st_dev,st_ino)`;
- exact expected capability-file `(st_dev,st_ino)`;
- regular file;
- current UID;
- exactly one link;
- exact mode `0600`;
- exact size zero; and
- open-FD identity equal to the no-follow namespace identity.

The same root and capability inode identities are revalidated immediately after lock acquisition.

## Why not `flock` / OFD locking

The selected V23 experiment requires the admission capability not to ride a duplicated, fork-inherited, `SCM_RIGHTS`-transferred, procfs-reopened, or `pidfd_getfd`-copied open-file description. BSD `flock` and Linux OFD locks are open-file-description based, which is the wrong ownership model for that claim.

Traditional POSIX record locks are process-associated. A copied descriptor in another process does not carry the holder's lock ownership, and holder process death releases the lock even while such copied descriptors remain open.

There is an important Linux/POSIX caveat: closing any descriptor in the **holder process** that refers to the locked inode can release that process's record locks on the inode. Therefore an eventual holder must own exactly one capability FD, must not duplicate it, must not open another descriptor for the same capability inode while locked, and must not expose it to unrelated holder-process code. This proof does not claim hostile same-UID or same-process isolation.

## Focused proof

`scripts/prove_datanet_posix_admission_capability_v1.py` proves nine bounded groups on Linux:

1. exact K-derived capability naming outside the V27 payload namespace;
2. eight simultaneous same-K contenders yield exactly one acquisition and seven BUSY/HOLD results;
3. distinct K values use distinct precreated capability inodes and can be held independently;
4. an `SCM_RIGHTS` copy does not own the lock, and the original holder's SIGKILL releases it while the copy stays open;
5. a procfs-reopened FD has the same non-transfer/crash-release behavior;
6. a `pidfd_getfd` copy has the same non-transfer/crash-release behavior;
7. a fork child retaining the inherited numeric FD does not retain the parent's POSIX lock after parent death;
8. wrong root identity, wrong capability inode, wrong mode, and extra hard-link state fail closed; and
9. a final fresh acquisition succeeds with no stale reusable capability state.

The GitHub workflow executes the proof on an Ubuntu 24.04 x86_64 runner against the exact pull-request head. x86_64 is explicit because this source uses Linux syscall number 438 for `pidfd_getfd` in the proof harness.

## What this does not prove

A green run is **not** V23 acceptance. It does not yet prove the full 20/21-process E0/R0 topology, exact payload I/O ledger, observer completeness, full-capacity reservation, `O_TMPFILE` allocation, create-only S0/S1 publication, EEXIST revalidation, cold remount, power loss, or public-peer retrieval.

In particular, this lane proves only that the candidate process-owned exclusion primitive has the required same-K uniqueness, crash-release, and cross-process non-transfer semantics under the hosted Linux kernel. The next composition must keep the lock holder as the actual mutation supervisor; using a short-lived helper to acquire this POSIX lock for a different process would release the lock when the helper exits and is therefore invalid.

No local lock or capability receipt becomes Chain-2050 authority, payment authority, fulfillment authority, inventory authority, settlement authority, or permanent content-valid state.
