# Buy VOID allocation-custody runtime V3 protected all-process reference census V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_V1`.

Status: **source/CI candidate only; protected source not installed; live privileged census not authorized**.

This successor follows the current host-scoped current-UID process-reference census at
`5bfd56c850513c7b416fe0b2f854ee9b12e764e4`.

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
parent_current_uid_head=5bfd56c850513c7b416fe0b2f854ee9b12e764e4
parent_current_uid_source_git_blob_sha1=ded737a228a627a241a84131113db6d3521f635c
prestate_head=836f5e704a603f67b77b2406aeec9174f640497e
prestate_source_git_blob_sha1=4d9c6e5809a5cc64454626760f71e60ed99354bc
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

- at most 32,768 descendants;
- maximum depth 64;
- direct, no-follow directory traversal;
- one filesystem and one Linux mount ID;
- directories, regular files and symlinks only;
- every regular file is descriptor-opened only to bind type, generation and the exact target mount ID;
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
A zombie TGID leader is **not** treated as dead while any surviving task remains
live. The bounded task inventory is inspected first; a zombie leader with a live
worker makes the process observation incomplete. Only a stable thread group in
which every task is zombie/dead can be classified as not live.

For ordinary live processes the census observes:

- bounded `/proc/<pid>/stat` before and after;
- a bounded `/proc/<pid>/task/<tid>` inventory (at most 65,536 TIDs per
  process and 262,144 total observed tasks per attempt);
- every TID's `stat` start-time generation before and after the observation;
- **per-thread** `cwd`, `root`, and open-descriptor tables by dev/inode
  identity, so a non-leader that unshares `CLONE_FS` or `CLONE_FILES`
  cannot hide a persistent target reference behind the TGID leader;
- process-level `exe` and mapped-file dev/inode identities from bounded
  `/proc/<pid>/maps`. Linux thread groups share the address-space/mm
  contract, while files/fs state is conservatively inspected per TID.

A candidate requires the complete TID set and each TID's start-time generation
to remain identical across the process observation. Task creation, exit, TID
reuse, unreadable task state, or per-thread observation ambiguity prevents a
clean result.

It never reads:

```text
/proc/<pid>/cmdline
/proc/<pid>/environ
```

It does not retain FD pathname text or mapped pathname text.

A vanished/reused PID or TID, inaccessible required observation, FD-close race,
PID-set change, task-set/generation change, or target-snapshot drift prevents a
clean observation. Up to three immediate read-only attempts are allowed.

## Host PID/mount namespace and retained procfs scope

A protected root-owned source is not by itself proof that `/proc` exposes the
host process universe. A root process can run inside a private PID namespace,
and a process sharing the host PID namespace can still run in a private mount
namespace that resolves a decoy `/opt` tree. Even with both host namespaces, a
chroot can retain host procfs while resolving absolute paths beneath a different
filesystem root, so the scanner's filesystem root must also match PID 1's root.

Therefore a real `--census` additionally requires two externally supplied,
separately reviewed namespace leases:

- expected host PID namespace `dev:ino`;
- expected host mount namespace `dev:ino`.

The source opens and retains one canonical `/proc` directory descriptor, then
requires, through that retained view:

- `self/ns/pid == 1/ns/pid == expected PID lease`;
- `self/ns/mnt == 1/ns/mnt == expected mount lease`;
- `self/root == 1/root` by kernel dev/inode identity;
- `/proc/1/root` is opened once to a retained host-root directory descriptor;
- the fixed `/opt/void-buy-allocation-custody-runtime-v1` path is walked
  descriptor-relative from that retained host-root FD rather than from the
  scanner's own `/`;
- the retained host-root dev/inode/mount identity is revalidated against
  `/proc/1/root` after the process scan;
- the retained mount is procfs;
- `hidepid` is absent or exactly `hidepid=0`;
- all PID/TID/stat/cwd/root/exe/fd/maps observations are descriptor-relative
  through the retained procfs view;
- target mount IDs are read through that same retained host procfs view;
- PID namespace, mount namespace, filesystem-root identity, proc visibility and
  retained procfs identity are revalidated after the process scan.

This closes the private-PID/private-mount false-clean class **only when the
expected lease values come from separately reviewed host evidence**. The census
does not authenticate the provenance of those lease strings itself and records:

```text
host_namespace_lease_provenance_authenticated_by_census=false
separately_reviewed_host_namespace_lease_required=true
```

Accordingly, passing arbitrary lease strings is not replacement authority.
A later ceremony must bind the expected leases to independent host evidence and
must still perform live-at-use revalidation.

## Observation is not replacement authority

Even a mechanically clean protected run under the supplied namespace leases
may set only the non-authoritative candidate:

```text
host_scoped_target_reference_absent_candidate=true
all_process_target_reference_absent_observed=false
```

Because the census does not authenticate lease provenance itself, it cannot
promote that candidate into the canonical all-process observation.

It still reports:

```text
all_process_reference_absence_proven=false
fd_table_stability_proven=false
mapping_set_stability_proven=false
task_inventory_generation_stability_required=true
per_thread_files_fs_reference_scan_required=true
host_pid_namespace_external_lease_required=true
host_pid_namespace_lease_verified=true
host_mount_namespace_external_lease_required=true
host_mount_namespace_lease_verified=true
host_filesystem_root_matches_pid1=true
host_filesystem_root_revalidated_after_census=true
retained_host_root_used=true
retained_host_root_revalidated_after_census=true
target_resolved_via_retained_host_root=true
complete_proc_visibility_verified=true
retained_procfs_view_used=true
retained_procfs_view_revalidated_after_census=true
target_resolved_in_host_mount_namespace=true
host_namespace_lease_provenance_authenticated_by_census=false
separately_reviewed_host_namespace_lease_required=true
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
- a synthetic **non-leader-only FD reference**, which must be detected even
  when the TGID leader has a clean FD/filesystem view;
- a zombie TGID leader with a surviving worker, which must remain incomplete
  rather than being classified as dead;
- bounded task-set/start-generation churn detection;
- PID-1 filesystem-root mismatch rejection for chroot/private-root execution;
- retained host-root target resolution, proving absolute `/opt/...` is
  resolved through the retained PID-1 root rather than the caller root;
- private PID-namespace and PID-lease mismatch rejection;
- private mount-namespace and mount-lease mismatch rejection;
- restricted `hidepid` procfs rejection;
- retained-procfs terminal scope revalidation;
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
host_scoped_target_reference_absent_candidate_only=true
all_process_target_reference_absent_observed=false
all_process_reference_absence_proven=false
fd_table_stability_proven=false
mapping_set_stability_proven=false
task_inventory_generation_stability_required=true
per_thread_files_fs_reference_scan_required=true
zombie_leader_live_worker_rejected=true
host_filesystem_root_matches_pid1=true
retained_host_root_used=true
retained_host_root_revalidated_after_census=true
target_resolved_via_retained_host_root=true
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
