# Buy VOID custody V3 protected all-process source lock V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_SOURCE_LOCK_V1`.

Status: **exact source-candidate acceptance only; protected installation and root execution remain unauthorized**.

This lock accepts the source/CI-qualified protected all-process reference census
at exact head `0fcd557319fbec6ffec78cb94a8fdeda41f67366`.

Accepted candidate identity:

```text
candidate_id=voidbuycustodyallprocrefsrc1_a6b4c0cf23953b3d92cbc5d92423d21d0be70d7b1337c033bc852f52b661ec67
source_blob=25c0e32ae85da4569fb9521a0812e10ab0fcede3
proof_blob=5fa8111245a875ce28a615f1ffd365f9c997de88
document_blob=f23d4e19b786db42feee5c7134fdc42719df395f
workflow_blob=7acc4af6ad0b88806fb9666602ed7dbb24c3c23c
focused_run=40000362945
focused_job=120574560030
```

The lock also preserves the exact current-UID parent, prestate source, and V3
archive-lock lineage carried by the candidate.

Acceptance means only that these exact reviewed source bytes are the candidate
eligible for a later separately reviewed protected-path installation plan.

It does **not** mean the fixed path under
`/opt/void-buy-allocation-custody-procref-v1` exists, that Python/runtime
closure has been qualified, that either externally reviewed namespace lease
exists, or that a live privileged census may run.

These remain false:

```text
protected_source_installed=false
protected_execution_authorized=false
root_execution_authorized=false
live_privileged_census_executed=false
host_namespace_lease_provenance_authenticated=false
host_scoped_target_reference_absent_candidate_accepted=false
all_process_target_reference_absent_observed=false
all_process_reference_absence_proven=false
python_runtime_closure_verified=false
replacement_authorized=false
replacement_apply_authorized=false
existing_target_replaced=false
service_mutation=false
systemd_mutation=false
filesystem_write=false
permission_mutation=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

Correct next ordering is: accepted source identity → source-only protected
create-only install plan → separately authorized protected installation →
installed read-only qualification → separately authorized root census.

**PROTECT THE CORE.**
