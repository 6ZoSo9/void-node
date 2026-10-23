# Buy VOID custody V3 protected all-process reference census lock v5

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V5`.

Status: **exact current-parent source acceptance only; not installed; no live root census authority**.

## Accepted current source generation

This lock accepts only protected-source PR #3789 at exact head:

```text
a8188279c4b4d48399fc0442a55c21769ad75a9a
```

The accepted protected census source is:

```text
path=ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
git_blob_sha1=f2288b01fa37d6facf7cc223db2604f9bc30fd57
bytes=74322
sha256=5a8c447e5288960e510888e5af38e80b1014503d522bfb27bc77a31e213633ce
```

Companion source-generation blobs are exact:

```text
proof=cc322e3fa9396cf82cae15e1beede49259b44dd7
document=ef1edde41785e35ee4be74c0d7a9c757894ecec3
workflow=ad46011fe95eff6afb29f4ce7a88aba7ac8de91b
```

Hosted source evidence is exact:

```text
workflow_run=40037714216
proof_job=120701158486
same_account_review_id=5635389789
focused_workflow_success=true
live_host_census_executed=false
```

## Current lineage

The accepted source itself binds:

```text
parent_current_uid_head=9c95a400add17d7cc45866f4129602755f2f92ac
parent_current_uid_source_git_blob_sha1=6bf476e3383b7b18966320df13b4041da9c8c11f
prestate_head=836f5e704a603f67b77b2406aeec9174f640497e
prestate_source_git_blob_sha1=e32ebd94ad09cd80e03489079e74657aab159d7a
archive_lock_git_blob_sha1=edb4ea2b833373ab387762e45ba7da4032c860f3
archive_lock_sha256=ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7
```

The source-generation change from the historical accepted v4 source is lineage-only.
The protected census scanner, procfs/namespace checks, retained host-root logic,
thread/task census, target snapshot handling, race limitations and authority
fields are unchanged.

## Historical v4 preservation

Historical v4 remains immutable evidence and is not copied or rewritten into
this branch.

Its exact identity is recorded as:

```text
version=4
lock_git_blob_sha1=29a5d9325468897c9b99d22d4a0376547a5e865e
source_git_blob_sha1=2f22f0cf3e5c5ed56c2a31f0862f087cdbbe41a9
historical_lock_preserved=true
superseded_for_current_source_acceptance=true
```

Hosted CI for v5 must materialize that exact historical Git object from its
historical branch and independently verify its identity and accepted-source
status. The historical file is intentionally not added to the current-parent
branch.

## Preserved semantic boundary

The accepted source still requires bounded process/task inventory, per-thread
filesystem-reference scanning, host PID/mount/user namespace leases, retained
procfs and PID-1 root descriptors, rejection of private task mount namespaces,
and live-at-use reverification.

It still **does not** prove:

```text
host_namespace_lease_provenance_authenticated_by_census=false
mount_namespace_reference_scan_performed=false
mount_namespace_reference_absence_proven=false
all_process_target_reference_absent_observed=false
all_process_reference_absence_proven=false
fd_table_stability_proven=false
mapping_set_stability_proven=false
process_reference_snapshot_race_free=false
```

Those false fields are part of the accepted source contract.

## Protected execution contract

A future protected installation, if separately authorized, remains fixed to:

```text
install_root=/opt/void-buy-allocation-custody-procref-v1
source_path=/opt/void-buy-allocation-custody-procref-v1/void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
root_execution_required=true
root_owned_nonwritable_ancestry_required=true
isolated_safe_path_python_required=true
bytecode_write_disabled_required=true
mutable_checkout_privileged_execution_rejected=true
```

This lock does not perform or authorize that installation.

## Authority boundary

The v5 lock accepts source bytes only:

```text
candidate_source_accepted=true
protected_install_authorized=false
protected_source_installed=false
live_privileged_census_authorized=false
live_privileged_census_executed=false
service_mutation=false
systemd_mutation=false
install_target_selected=false
existing_target_replaced=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

The next gate is a **new current-source protected install-plan successor**.
Historical #3771 and downstream installer candidates remain evidence for older
source generations and are not silently reused as authority for v5.

**PROTECT THE CORE.**
