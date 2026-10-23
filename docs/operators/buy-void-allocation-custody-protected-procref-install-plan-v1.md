# Buy VOID custody protected process-reference source install plan V1

Marker: `VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_PLAN_V1`.

Status: **source-only protected-install planning; no install authority**.

This plan closes the source-design gap identified by the protected all-process
reference census: a later root execution must run only from exact reviewed bytes
installed under a protected root-owned `/opt` path, but this generation does
not install those bytes.

## Exact reviewed source

The plan accepts only the exact #3753 protected all-process census generation:

```text
repository=6ZoSo9/void-node
head=0fcd557319fbec6ffec78cb94a8fdeda41f67366
path=ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
git_blob_sha1=25c0e32ae85da4569fb9521a0812e10ab0fcede3
bytes=56180
sha256=d87dc3c539d32aff9722b802ec4b172441e98095a5bcc5cd5edac868572b4e0a
```

A future installer must materialize the exact Git-object bytes. Copying from a
mutable worktree is not authorized.

## Fixed protected destination

The future protected source location is exactly:

```text
/opt/void-buy-allocation-custody-procref-v1/
  void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
```

The planned fixed contract is:

```text
install_parent=/opt
protected_root=/opt/void-buy-allocation-custody-procref-v1
stage_path=/opt/.void-buy-allocation-custody-procref-v1.stage-v1

stage_parent=/opt
stage uid/gid=0/0
stage mode=0755
stage group/world writable=false
stage nlink=2
stage expected entry count=1
stage source name=void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
stage unexpected entries forbidden=true
stage directory=true
stage symlink=false
stage same mount as install parent=true
stage descriptor-relative creation required=true
stage parent descriptor retained through publication=true
stage descriptor retained through publication=true
stage direct child of install parent required=true
stage symlink-free ancestry required=true
stage revalidation before publication required=true

install_parent uid/gid=0/0
install_parent group/world writable=false

protected_root uid/gid=0/0
protected_root mode=0755
protected_root expected entry count=1
protected_root unexpected entries forbidden=true

protected_source uid/gid=0/0
protected_source mode=0444
protected_source nlink=1
protected_source regular_file=true
protected_source symlink=false

publication_syscall=renameat2
publication_flag=RENAME_NOREPLACE
ordinary_rename_publication_forbidden=true
```

These are future apply requirements, not observed host facts. The stage is
an exact root-owned mode-0755 direct child of /opt with nlink=2, no symlink
identity, the same mount as the retained install-parent descriptor, and exactly
one reviewed source entry. Mode 0755 is intentionally identical to the final
protected-root mode, so atomic directory publication does not require a
post-publication chmod. A future installer must create the stage
descriptor-relative to the retained parent, retain both parent and stage
descriptors through publication, and reject any ancestry/type/owner/mode/link/
mount or entry-set drift.

The initial target-absence check is not publication authority: a competing creator may win
after that check. The final publication must therefore use kernel-atomic
`renameat2(RENAME_NOREPLACE)` semantics and fail closed if the destination
exists. An ordinary replace-capable rename is forbidden.

## Required future apply ceremony

A separately reviewed installer must perform this order:

1. verify the exact reviewed Git-object bytes;
2. verify `/opt` root custody and mount identity;
3. require both protected target and stage names absent;
4. create the stage directory descriptor-relative to the retained /opt
   descriptor and require exact root:root, mode 0755, nlink 2, direct-directory,
   non-symlink, same-mount and symlink-free-direct-ancestry identity;
5. retain and revalidate both the install-parent and stage descriptors;
6. materialize the exact reviewed source bytes as the stage's only entry;
7. fsync the staged source and stage directory;
8. reverify stage-directory identity, the exact single-entry set, and staged
   source bytes/metadata/ancestry before publication;
9. publish with `renameat2(RENAME_NOREPLACE)`; the earlier absence check alone
   is not authority and an existing destination must make publication fail;
10. fsync the install parent;
11. reverify the installed root's exact single-entry set plus source bytes,
    metadata, and ancestry;
12. emit a content-addressed install receipt;
13. **stop before root census execution**.

The protected install receipt must receive separate external review before the
root all-process census is considered.

## Gates deliberately not bundled

The protected source install is separate from all of these:

```text
PROTECTED_INSTALL_RECEIPT_EXTERNAL_REVIEW
HOST_NAMESPACE_LEASE_EXTERNAL_REVIEW
LIVE_ROOT_ALL_PROCESS_CENSUS
SERVICE_QUIESCENCE_AT_USE
LIVE_NODE_BINARY_IDENTITY
ACCEPTED_ARCHIVE_BYTES_AT_USE
ROLLBACK_CRASH_RECOVERY_PROTOCOL
EXPLICIT_REPLACEMENT_APPLY_AUTHORIZATION
```

Installing the protected source must not implicitly authorize any of those
later operations.

## Source-only interface

The only executable mode in this generation is:

```bash
node tools/void-buy-allocation-custody-protected-procref-install-plan-v1.mjs --plan
```

There is no `--apply`, `--install`, or `--execute` mode. Invalid modes
HOLD.

The plan source imports only `node:crypto`; it imports no filesystem or child
process module and contains no host mutation primitive.

## Authority boundary

```text
source_plan_only=true
reviewed_source_identity_selected=true
mutable_worktree_copy_authorized=false
exact_git_object_materialization_required=true
create_only_install_required=true
target_absence_required_before_apply=true
stage_absence_required_before_apply=true
no_clobber_required=true
atomic_noreplace_publication_required=true
renameat2_rename_noreplace_required=true
absence_precheck_is_not_publication_authority=true
root_owned_same_filesystem_staging_required=true
stage_directory_exact_metadata_required=true
stage_descriptor_relative_creation_required=true
stage_parent_descriptor_retention_required=true
stage_descriptor_retention_required=true
stage_exact_entry_set_required=true
stage_same_mount_revalidation_required=true
stage_ancestry_revalidation_required=true
stage_revalidation_before_publication_required=true
source_file_fsync_required=true
stage_directory_fsync_required=true
install_parent_fsync_required=true
post_install_exact_byte_reverification_required=true
post_install_exact_entry_set_required=true
post_install_ancestry_reverification_required=true
install_receipt_required=true
install_receipt_external_review_required=true
root_execution_required_at_apply=true

protected_source_install_authorized=false
protected_source_installed=false
root_census_execution_authorized=false
privileged_all_process_census_executed=false
filesystem_write=false
permission_mutation=false
service_mutation=false
systemd_mutation=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
replacement_apply_authorized=false
funds_movement=false
```

This plan does not authorize sudo/root execution or any `/opt` mutation.

**PROTECT THE CORE.**
