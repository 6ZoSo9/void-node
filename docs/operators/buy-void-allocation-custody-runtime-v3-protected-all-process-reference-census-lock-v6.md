# Buy VOID custody V3 protected all-process reference census lock v6

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V6`.

Status: **exact frozen-parent source acceptance only; not installed; no live root census authority**.

## Accepted source generation

This lock accepts only the frozen protected-source generation at:

```text
source_head=9bec0035b4085af82f51ec0e481d49c94ceb84b4
```

The accepted protected census source is:

```text
path=ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
git_blob_sha1=33a7221cad37aec70474b97b26c2b10e2ef60f66
bytes=74322
sha256=d5b91c7efa048eb40601d162185563a29916f1ff22a23638c7da5f330b92beba
ascii_only=true
```

Companion source-generation blobs are exact:

```text
proof=8160466f6fe336c020db6a5acc5828b92cb730ea
document=1af3074ee4415b4ef1b313b6d0e0950576140d8b
workflow=1efc89a43ed5d44c2a8ea3d19f25edb6599be409
```

Hosted source evidence is exact:

```text
workflow_run=40045783559
proof_job=120727057081
same_account_review_id=5635876666
focused_workflow_success=true
live_host_census_executed=false
```

## Frozen lineage

The accepted protected source binds:

```text
parent_current_uid_head=95d1d10f41e00848b9c7e58da8d3fdf975ada3da
parent_current_uid_source_git_blob_sha1=4de1cb35a43045a0d9568b3bf4c10904c3653d34
prestate_head=97ddf23065b56fef3bf16c5c96092a0b100042a1
prestate_source_git_blob_sha1=e32ebd94ad09cd80e03489079e74657aab159d7a
archive_lock_git_blob_sha1=edb4ea2b833373ab387762e45ba7da4032c860f3
archive_lock_sha256=ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7
```

The current source is a lineage-only successor of the previously reviewed
protected all-process generation. Its scanner, procfs/namespace protections,
retained host-root logic, all-task/per-thread coverage, target handling and
authority fields are unchanged apart from the frozen parent/prestate identity.

## Historical v5 preservation

Historical v5 remains immutable evidence and is not rewritten.

Its exact predecessor identity is:

```text
version=5
lock_git_blob_sha1=61f7852661e0d07cc3ab242b4c78843747676607
source_git_blob_sha1=f2288b01fa37d6facf7cc223db2604f9bc30fd57
historical_lock_preserved=true
superseded_for_current_source_acceptance=true
```

Hosted CI for v6 must fetch the historical v5 branch and verify that exact Git
object and its false authority boundary. No v5 file is silently repinned.

## Preserved source boundary

The accepted source requires:

- bounded generation-stable task inventory;
- per-thread filesystem-reference scanning;
- every live task to remain in the reviewed host mount namespace;
- host PID, mount and user namespace leases;
- retained and revalidated procfs;
- retained and revalidated PID-1 host filesystem root;
- private task mount namespace rejection;
- zombie-leader/live-worker rejection;
- live-at-use reverification.

The accepted source still does **not** prove:

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

Those false fields are part of the accepted contract, not temporary omissions
that the lock may reinterpret.

## Protected execution contract

Any future protected installation remains fixed to:

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

v6 accepts the reviewed source bytes only:

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

The next gate remains a **new current-source protected install-plan successor**.
That future plan must remain separately reviewed and cannot infer live-host or
replacement authority from this source lock.

**PROTECT THE CORE.**
