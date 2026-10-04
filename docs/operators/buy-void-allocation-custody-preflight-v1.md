# Buy VOID allocation custody preflight v1

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_V1`

Status: **designated-host read-only preflight; production HOLD**.

## Purpose

This gate qualifies one necessary filesystem condition for the canonical Buy
VOID allocation authority stack introduced by #2433, #2442, #2446, and the
allocation publication writer.

It asks a narrow question:

> Do the existing allocation ledger root and protected high-water root resolve
> to two path-disjoint local block-storage mount/device domains?

A GREEN answer is useful evidence, but it is deliberately **not** sufficient to
claim independent rollback-resistant custody.

## Read-only observation

The preflight reads only:

- the two already-existing root directory metadata records;
- `/proc/self/mountinfo`; and
- the current hostname when a designated hostname is supplied.

It does not create either root, create files, mount/unmount storage, modify
permissions, write a ledger/high-water, restart a service, access credentials or
wallets, sign or broadcast transactions, activate Buy VOID/WC/VOID, or move
funds.

Each root must be:

- an exact absolute real path;
- a direct non-symlink directory;
- owned by the current runtime UID;
- non-writable by group/other; and
- resolvable to its longest matching Linux mount-info record.

## Storage-domain requirements

The first version accepts only local filesystem classes:

- `ext4`;
- `xfs`; or
- `btrfs`.

The mount source must be a `/dev/...` device path.

The ledger and high-water roots must differ in all of:

- directory device identity (`stat.dev`);
- mount ID;
- major:minor device identity; and
- mount source.

The roots must also be path-disjoint: neither may contain the other.

NFS, overlay, tmpfs, ambiguous/non-device mount sources, shared mount IDs,
shared block-device identities, and aliased/symlink roots HOLD.

## Why GREEN is still not independent custody

Two distinct local devices do not prove that an administrator, hypervisor,
snapshot manager, backup system, RAID/controller layer, cloud-volume policy, or
host-wide rollback procedure cannot revert both domains together.

Therefore even the GREEN result reports:

```text
distinct_local_storage_domains_proven=true
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
```

The next gate remains:

`designated_host_snapshot_backup_and_rollback_independence_qualification`

That later gate must bind the actual host/storage policy and prove the
high-water cannot be silently rolled back with the ordinary allocation ledger
domain. This preflight does not invent that evidence.

## Relationship to the allocation writer

The allocation publication writer remains the parent lane. It already proves
logical crash recovery, redundant publication intent, deterministic dual-root
locking, and the reviewed single-root mid-publication recovery schedules.

This preflight does not mount that writer into the runtime and does not promote
its authority flags. It only makes the remaining host-custody HOLD executable
and falsifiable.

## Usage

```bash
node tools/void-buy-void-allocation-custody-preflight-v1.mjs \
  --ledger-root /absolute/private/ledger-root \
  --high-water-root /absolute/private/high-water-root \
  --expected-hostname HOST
```

A GREEN result is:

`DISTINCT_LOCAL_STORAGE_DOMAINS_GREEN_NOT_AUTHORIZED`

It is not permission to activate anything.

## Proof

```bash
node scripts/prove_buy_void_allocation_custody_preflight_v1.mjs
node tools/void-buy-void-allocation-custody-preflight-v1.mjs --help
git diff --check
```

The proof covers:

- longest-prefix mount resolution;
- escaped mount points;
- two distinct local device domains;
- shared `stat.dev` HOLD;
- shared mount-ID HOLD;
- shared major:minor HOLD;
- shared mount-source HOLD;
- NFS/overlay/tmpfs HOLD;
- non-device mount source HOLD;
- root ancestry HOLD;
- malformed mountinfo rejection;
- designated-host mismatch HOLD;
- symlink alias HOLD; and
- a real temporary same-host fixture that cannot claim independent custody.

## Authority boundary

```text
designated_host_read_only_preflight=true
proc_mountinfo_read=true
filesystem_metadata_read=true
source_mutation=false
filesystem_write=false
mount_mutation=false
storage_bootstrap=false
runtime_integration=false
payment_acceptance=false
inventory_mutation=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_broadcast=false
public_presale_activation=false
market_activation=false
funds_movement=false
```
