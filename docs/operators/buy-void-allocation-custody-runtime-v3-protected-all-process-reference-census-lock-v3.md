# Buy VOID allocation-custody runtime V3 protected all-process reference census lock V3

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V3`.

Status: **exact repaired source acceptance only; protected source not installed; live privileged census not authorized**.

## Accepted source

This lock accepts the exact repaired protected all-process source at:

```text
parent_source_head=cfae72e86e060ec797a86797d71f7be7aa019be8
source_git_blob_sha1=9738f14111fc03dffe9afb04f7bede73ceb13087
source_bytes=74322
source_sha256=f3ef0593eae77825f730609b85da51af66168ba11f39848d052a91942e4cc335
```

The source is ASCII-only and the V3 proof freshly recomputes its SHA-256 from
the exact parent-tree bytes.

The repaired lineage is:

```text
parent_current_uid_head=7736a3a5c53da37448c357a5d98e4dad09f3f617
parent_current_uid_source_git_blob_sha1=6bf476e3383b7b18966320df13b4041da9c8c11f
prestate_head=7736a3a5c53da37448c357a5d98e4dad09f3f617
prestate_source_git_blob_sha1=e32ebd94ad09cd80e03489079e74657aab159d7a
archive_lock_git_blob_sha1=edb4ea2b833373ab387762e45ba7da4032c860f3
archive_lock_sha256=ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7
```

## V3 repair over V2

Draft #3775 / lock V2 accepted the earlier source blob
`25a0913606baa3303743f36a8c79f3c7a14ea159`.

That earlier source already bound host PID and mount namespace leases, retained
procfs and PID-1 root, full task inventory, per-thread fd/cwd/root scanning,
private task mount-namespace rejection, and the existing fail-closed authority
fields.

V3 accepts a distinct successor rather than silently reassigning V2.

The successor additionally requires:

```text
host_user_namespace_external_lease_required=true
private_user_namespace_rejected=true
host_user_namespace_lease_mismatch_rejected=true
host_user_namespace_lease_revalidation_required=true
```

A real census must receive an externally reviewed host user-namespace
`dev:ino` lease and require, through the retained procfs view:

```text
self/ns/user == 1/ns/user == expected host user-namespace lease
```

That identity is revalidated after the census alongside the PID and mount
namespace leases.

The census still does **not** authenticate the provenance of any namespace
lease itself:

```text
host_namespace_lease_provenance_authenticated_by_census=false
separately_reviewed_host_namespace_lease_required=true
```

## Remaining reference limits

The source remains deliberately non-authorizing.

It still records:

```text
mount_namespace_reference_scan_performed=false
mount_namespace_reference_absence_proven=false
all_process_target_reference_absent_observed=false
all_process_reference_absence_proven=false
fd_table_stability_proven=false
mapping_set_stability_proven=false
process_reference_snapshot_race_free=false
live_at_use_reverification_required=true
```

The per-task host mount-namespace requirement rejects private task mount
namespaces, but the source does not claim exhaustive enumeration of all mount
objects in the verified host mount namespace.

## Hosted source evidence

The repaired source is bound to focused run:

```text
workflow_run=40018911504
proof_job=120638054198
focused_workflow_success=true
live_host_census_executed=false
```

This is source/CI evidence only.

## Protected execution contract remains future work

The eventual protected source remains fixed at:

```text
/opt/void-buy-allocation-custody-procref-v1/
  void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
```

Future execution requires root, direct root-owned/non-group-world-writable
ancestry, isolated safe-path Python and bytecode writes disabled. Mutable
checkout privileged execution remains rejected.

This lock does **not** install that source and does not authorize a live root
census.

## Next gate

An existing protected-source installation plan already exists as Draft #3771,
but it predates this repaired source.

The next gate is therefore:

```text
RESTACK_REVIEW_PROTECTED_SOURCE_INSTALL_PLAN_PR3771
```

Do not install the old accepted V2 source.

## Authority boundary

V3 accepts source bytes only. It keeps all of these false:

```text
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

**PROTECT THE CORE.**
