# Buy VOID allocation-custody runtime V3 process-reference census V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROCESS_REFERENCE_CENSUS_V1`.

Status: **read-only current-UID process-reference diagnostic only**.

This successor is based on the exact filesystem-prestate census generation at
`bcf95a7b30cc2f62822f9322438146eca4b24e41`. It exists to satisfy the
existing replacement plan's requirement for a process-reference census without
silently promoting an unprivileged observation into all-process authority.

## Exact source inputs

The census binds:

- prestate-census source Git blob:
  `feb6508133a1feda9bda793646a5c949f1fdc7f0`;
- accepted archive-lock Git blob:
  `edb4ea2b833373ab387762e45ba7da4032c860f3`;
- accepted archive-lock SHA-256:
  `ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7`;
- fixed target:
  `/opt/void-buy-allocation-custody-runtime-v1`.

## Target identity

The target is observed metadata-only.

The census descriptor-walks the fixed legacy target, rejects special files,
cross-device entries and cross-mount directory substitutions, and builds a
bounded set of `(st_dev, st_ino)` identities for the root and descendants.

The target scan is limited to 4,096 entries and depth 64. Legacy regular-file
contents are not read. Symlink targets are not followed or read.

## Process scope

This generation is deliberately **unprivileged**.

It refuses UID 0 execution from a user-owned diagnostic source and scans only
processes whose procfs directory is owned by the caller's effective UID.

It never reads:

```text
/proc/<pid>/cmdline
/proc/<pid>/environ
```

It also never reads the pathname text behind `/proc/<pid>/fd/*`.

For each current-UID process it observes only:

- process generation from bounded `/proc/<pid>/stat`;
- `cwd`, `root` and `exe` by kernel dev/inode identity;
- open descriptors by kernel dev/inode identity;
- mapped-file dev/inode identities parsed from bounded `/proc/<pid>/maps`.

Mapped path text is ignored and never retained in the receipt.

A process whose PID generation changes, vanishes during its scan, has an
inaccessible required observation, or races an FD close makes that attempt
incomplete.

The current-UID PID set is sampled before and after each attempt. A changed PID
set is not accepted as clean evidence. Up to three immediate attempts may be
made to obtain one stable read-only window.

## Candidate versus proof

The strongest possible result in this generation is:

```text
current_uid_target_reference_absent_candidate=true
```

That requires one stable current-UID PID set, no incomplete process
observations, and zero target references through `cwd/root/exe/fd/maps`.

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

PID generation and before/after PID-set checks close obvious process-reuse and
enumeration races, but they do not freeze a live process's FD table or mapping
set. Therefore a clean user-process census is useful pre-install evidence but
is not permission to replace the target. A later separately reviewed privileged
all-process gate must run from a protected root-owned source and reobserve
references immediately at use before any root replacement ceremony can treat
process-reference absence as complete.

## Invocation

After source/CI qualification:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_runtime_v3_process_reference_census_v1.py \
  --census
```

Do not run this source with sudo. Root execution intentionally HOLDs.

## Authority boundary

```text
read_only=true
production_filesystem_write=false
root_execution_forbidden=true
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
