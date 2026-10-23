# Buy VOID allocation-custody runtime V3 process-reference census V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROCESS_REFERENCE_CENSUS_V1`.

Status: **read-only current-UID process-reference diagnostic only**.

This successor is based on the exact filesystem-prestate census generation at
`97ddf23065b56fef3bf16c5c96092a0b100042a1`. It exists to satisfy the
existing replacement plan's requirement for a process-reference census without
silently promoting an unprivileged observation into all-process authority.

## Exact source inputs

The census binds:

- prestate-census source Git blob:
  `e32ebd94ad09cd80e03489079e74657aab159d7a`;
- accepted archive-lock Git blob:
  `edb4ea2b833373ab387762e45ba7da4032c860f3`;
- accepted archive-lock SHA-256:
  `ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7`;
- fixed target:
  `/opt/void-buy-allocation-custody-runtime-v1`.

## Target identity

The target is observed metadata-only.

The census descriptor-walks the fixed legacy target, rejects special files,
cross-device entries, cross-mount directory substitutions, and same-filesystem
file bind mounts. Regular files are opened metadata-only through retained
`O_NOFOLLOW|O_NONBLOCK` descriptors so their Linux mount IDs and generations
are checked without reading file bodies. It builds a bounded set of
`(st_dev, st_ino)` identities for the root and descendants.

The target scan is limited to 32,768 entries and depth 64, matching the current
qualified prestate generation and covering the observed legacy-tree scale while
remaining bounded. Legacy regular-file contents are not read. Symlink targets
are not followed or read.

Each target traversal derives a deterministic metadata-only `snapshot_id`
over the root generation plus every relative path/type/dev/inode/UID/GID/mode/
link-count/size/mtime/ctime record. No file body or symlink target text enters
that snapshot. The receipt's top-level target identity is copied from the
selected process attempt's **before** snapshot; it is never produced by a later
unbound target rescan.

## Process scope

This generation is deliberately **unprivileged**.

It refuses UID 0 execution from a user-owned diagnostic source and classifies
the current-UID process set from the **effective UID slot** in bounded
`/proc/<pid>/status`, not from proc-directory ownership. The four UID slots are
re-read after each process reference scan; a credential change or vanished
status makes that process observation non-clean.

A clean current-UID candidate requires two externally reviewed namespace
`dev:ino` leases: the host PID namespace and the host mount namespace. The
census opens canonical `/proc` once and retains that directory descriptor for
the complete attempt. Through that retained descriptor it reads only
`self/ns/pid` and `self/ns/mnt`, and requires those identities to match the
supplied PID- and mount-namespace leases before resolving the fixed `/opt`
target.

The census intentionally does **not** dereference `/proc/1/ns/pid` or
`/proc/1/ns/mnt`: those links are ptrace-gated on ordinary Linux hosts and an
unprivileged diagnostic must not require PID-1 ptrace authority. The provenance
that the supplied leases are truly host namespace identities is therefore a
separate trusted operator/reviewer input and is not authenticated by this
census itself. A private PID or mount namespace still fails closed when its
self namespace identity differs from the supplied host lease.

The same retained procfs view identifies the procfs mount, rejects restricted
`hidepid` views, and performs PID enumeration plus all process observations
descriptor-relatively. It revalidates both self-namespace identities against
the supplied leases, the retained procfs descriptor, visibility contract, and
terminal visible `/proc` identity after the process scan. A clean receipt
therefore binds the target snapshot to the supplied host-mount lease while
keeping lease provenance outside this unprivileged source.

It never reads:

```text
/proc/<pid>/cmdline
/proc/<pid>/environ
```

It also never reads the pathname text behind `/proc/<pid>/fd/*`.

For each current-UID process it observes only:

- four UID slots from bounded `/proc/<pid>/status`, with the effective slot
  selecting the current-UID set;
- process generation from bounded `/proc/<pid>/stat`;
- `cwd`, `root` and `exe` by kernel dev/inode identity;
- open descriptors by kernel dev/inode identity;
- mapped-file dev/inode identities parsed from bounded `/proc/<pid>/maps`.

Mapped path text is ignored and never retained in the receipt.

A process whose PID generation changes, vanishes during its scan, has an
inaccessible required observation, or races an FD close makes that attempt
incomplete.

Each attempt also snapshots the complete target metadata/inode tree before
process enumeration and rescans it afterward. A changed target `snapshot_id`
makes that attempt non-clean even if no process reference was observed. The
current-UID PID set is likewise sampled before and after each attempt. A changed
PID set is not accepted as clean evidence. Up to three immediate attempts may
be made to obtain one stable read-only window.

## Candidate versus proof

The strongest possible result in this generation is:

```text
current_uid_target_reference_absent_candidate=true
```

That requires one unchanged target snapshot across the attempt, one stable
current-UID PID set, no incomplete process observations, zero target references
through `cwd/root/exe/fd/maps`, verified external host PID- and mount-namespace
leases, unrestricted procfs visibility, host-mount resolution of the target,
and terminal revalidation of the retained procfs view and both namespace
leases.

These **always remain false**:

```text
all_process_reference_absence_proven=false
privileged_all_process_scan=false
custody_principal_process_scan_performed=false
fd_table_stability_proven=false
mapping_set_stability_proven=false
replacement_apply_authorized=false
```

And this remains mandatory:

```text
live_at_use_reverification_required=true
```

Target before/after rescans close stale-target-set acceptance for additions,
removals and inode/metadata replacement across an attempt. PID generation and
before/after PID-set checks close obvious process-reuse and enumeration races,
but none of those checks freezes a live process's FD table or mapping set.
Therefore a clean user-process census is useful pre-install evidence but
is not permission to replace the target. A later separately reviewed privileged
all-process gate must run from a protected root-owned source and reobserve
references immediately at use before any root replacement ceremony can treat
process-reference absence as complete.

## Invocation

After source/CI qualification, isolated no-bytecode mode is mandatory; omitting
`-B` HOLDs before ordinary imports so a successful production receipt cannot
silently permit Python bytecode-cache writes:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_runtime_v3_process_reference_census_v1.py \
  --census \
  --expected-host-pid-namespace-dev-ino '<PID_NS_DEV>:<PID_NS_INO>' \
  --expected-host-mount-namespace-dev-ino '<MNT_NS_DEV>:<MNT_NS_INO>'
```

Do not run this source with sudo. Root execution intentionally HOLDs.

## Authority boundary

```text
read_only=true
proc_status_effective_uid_classification=true
process_uid_slots_stable_during_reference_scan=true
host_pid_namespace_external_lease_required=true
host_pid_namespace_lease_verified=true
host_pid_namespace_lease_revalidated_after_census=true
pid1_namespace_direct_read=false
host_mount_namespace_external_lease_required=true
host_mount_namespace_lease_verified=true
host_mount_namespace_lease_revalidated_after_census=true
pid1_mount_namespace_direct_read=false
host_namespace_lease_provenance_authenticated_by_census=false
target_resolved_in_host_mount_namespace=true
complete_proc_visibility_verified=true
proc_visibility_revalidated_after_census=true
retained_procfs_view_used=true
retained_procfs_view_revalidated_after_census=true
production_filesystem_write=false
root_execution_forbidden=true
python_no_bytecode_mode_required=true
target_snapshot_stable_required=true
regular_file_mount_id_checked=true
receipt_target_bound_to_selected_attempt=true
fd_table_stability_proven=false
mapping_set_stability_proven=false
live_at_use_reverification_required=true
process_environment_read=false
process_arguments_read=false
proc_cmdline_read=false
proc_environ_read=false
proc_fd_target_text_read=false
proc_maps_path_text_retained=false
all_process_reference_absence_proven=false
privileged_all_process_scan=false
custody_principal_process_scan_performed=false
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

This census composes later with the separate service-quiescence and filesystem
prestate evidence. It does not replace either one.

**PROTECT THE CORE.**
