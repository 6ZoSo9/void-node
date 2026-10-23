# Buy VOID allocation-custody runtime V3 protected all-process reference census V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_V1`.

Status: **source/CI candidate only; protected source not installed; live privileged census not authorized**.

This successor follows the exact current-UID process-reference census at
`a42153631b0523fcefca12b9ed40a9a743c2fadd`.

Its purpose is to define the missing all-process observation boundary required
by the existing custody replacement plan without making the mutable repository
checkout executable as root.

## Fixed protected execution path

A real `--census` is accepted only from:

```text
/opt/void-buy-allocation-custody-procref-v1/
  void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
```

Production admission requires:

- real/effective UID and GID 0;
- isolated, safe-path, unoptimized Python with bytecode writes disabled;
- fixed source pathname exactly equal to the path above;
- filesystem root, `/opt`, protected source directory and source leaf all
  root-owned/root-grouped;
- no group/world write bit anywhere in that admitted ancestry;
- source leaf a direct regular file, single link, bounded size;
- before/open/after source generation stability.

Therefore this repository copy, Downloads copies and other user-owned paths
must HOLD under root rather than execute a privileged procfs census.

This generation does not install that protected path.

## Exact lineage

The source records:

```text
parent_current_uid_head=a42153631b0523fcefca12b9ed40a9a743c2fadd
parent_current_uid_source_git_blob_sha1=86c493d7acbe539fe898024474ed3c8815760603
prestate_head=bcf95a7b30cc2f62822f9322438146eca4b24e41
prestate_source_git_blob_sha1=feb6508133a1feda9bda793646a5c949f1fdc7f0
archive_lock_git_blob_sha1=edb4ea2b833373ab387762e45ba7da4032c860f3
archive_lock_sha256=ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7
```

These lineage records do not themselves install or authenticate a future
protected copy. A separate install receipt must bind the exact accepted source
bytes at the fixed root-owned path before live use.

## Target scope

The fixed target remains:

```text
/opt/void-buy-allocation-custody-runtime-v1
```

The census builds a bounded metadata-only target snapshot:

- at most 4,096 descendants;
- maximum depth 64;
- direct, no-follow directory traversal;
- one filesystem and one Linux mount ID;
- directories, regular files and symlinks only;
- no regular-file content read;
- no symlink-target text read;
- canonical metadata digest and device/inode identity set.

The target snapshot is repeated after every process observation attempt. Target
root identity, mount ID, metadata digest and identity count must remain stable
for an attempt to qualify.

## All-process procfs scope

A protected live run enumerates all numeric `/proc/<pid>` entries, bounded to
32,768 PIDs.

Kernel threads are identified from the proc stat flags and skipped explicitly.
Stable zombies/dead tasks are classified separately.

For ordinary live processes the census observes:

- bounded `/proc/<pid>/stat` before and after;
- `cwd`, `root` and `exe` by dev/inode identity;
- open descriptors by dev/inode identity, bounded to 65,536 descriptors;
- mapped-file dev/inode identities from bounded `/proc/<pid>/maps`.

It never reads:

```text
/proc/<pid>/cmdline
/proc/<pid>/environ
```

It does not retain FD pathname text or mapped pathname text.

A vanished/reused PID, inaccessible required observation, FD-close race, PID-set
change or target-snapshot drift prevents a clean observation. Up to three
immediate read-only attempts are allowed.

## Observation is not replacement authority

Even a clean protected run may set only:

```text
all_process_target_reference_absent_observed=true
```

It still reports:

```text
all_process_reference_absence_proven=false
fd_table_stability_proven=false
mapping_set_stability_proven=false
process_reference_snapshot_race_free=false
live_at_use_reverification_required=true
python_runtime_closure_verified=false
replacement_apply_authorized=false
```

The reason is fundamental: enumerating procfs does not freeze another live
process's FD table or mappings. A separately reviewed replacement executor must
reobserve the protected census immediately at use under its own fail-closed
service/process transition boundary.

## CI boundary

CI may run only `--self-test`.

Synthetic tests cover:

- clean all-process classification;
- explicit kernel-thread handling;
- target-reference rejection;
- PID-set drift rejection;
- target-snapshot drift rejection;
- non-root protected-source rejection;
- mocked-root execution from the checkout rejected by fixed-path admission;
- metadata-only target snapshot fixtures.

CI does not install anything beneath `/opt`, execute a root census, stop a
service, inspect a live host's other users, or grant replacement authority.

## Authority boundary

```text
protected_source_installed=false
live_privileged_census_executed=false
production_read_only=true
production_filesystem_write=false
proc_cmdline_read=false
proc_environ_read=false
proc_fd_target_text_read=false
proc_maps_path_text_retained=false
all_process_reference_absence_proven=false
fd_table_stability_proven=false
mapping_set_stability_proven=false
process_reference_snapshot_race_free=false
live_at_use_reverification_required=true
python_runtime_closure_verified=false
service_mutation=false
systemd_mutation=false
install_target_selected=false
existing_target_replaced=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

Installing the protected census source, running it as root, or composing it into
a replacement executor are separate authority gates.

**PROTECT THE CORE.**
