# Buy VOID allocation-custody protected all-process reference census lock V4

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V4`.

Status: **current protected-source acceptance only; not installed; live privileged census not authorized**.

## Why V4 exists

Historical lock V3 accepted source blob:

```text
9738f14111fc03dffe9afb04f7bede73ceb13087
```

That lock remains immutable historical evidence. The protected source was later
restacked to current #3752/#3745 lineage, so V3 must not be repinned in place.

V4 accepts the distinct current source generation at exact parent:

```text
parent_source_head=0eb763d8ecba723f5a80cccb24a297fbf5a010b7
source_git_blob_sha1=2f22f0cf3e5c5ed56c2a31f0862f087cdbbe41a9
source_bytes=74322
source_sha256=79810ed2afa60d2e544e0f6f48ff8189dd26d5aaeb65208bfb1f562fda467a1c
```

The source is ASCII-only. The V4 proof freshly recomputes its Git blob, byte
count and SHA-256 from the exact parent-tree bytes.

V4 also pins the exact current source-generation companions:

```text
source proof blob   551102b148d3b2e0b0f5a83d67ace9f69549c918
source document     1dd0939cd5d0390a13aff54996f9c65ba253eebd
source workflow     23b004aa89b94fd8037b7f82ab1148f174454d05
```

## Current lineage

```text
parent current-UID head
  acace7d9051126b07f71ecf1a50fdeaf64a0c24f
parent current-UID source blob
  ded737a228a627a241a84131113db6d3521f635c

prestate head
  836f5e704a603f67b77b2406aeec9174f640497e
prestate source blob
  4d9c6e5809a5cc64454626760f71e60ed99354bc

accepted archive lock blob
  edb4ea2b833373ab387762e45ba7da4032c860f3
accepted archive lock SHA-256
  ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7
```

## Hosted evidence

Current protected source qualification:

```text
workflow_run=40025806500
proof_job=120661580734
focused_workflow_success=true
live_host_census_executed=false
```

Exact-head same-account source review:

```text
review_id=5634824509
```

That review is technical same-account review, not distinct-principal external
approval.

## Preserved protected-source boundaries

The accepted source still requires:

- root execution only from a fixed protected installation path;
- root-owned, non-group/world-writable ancestry;
- isolated safe-path Python with bytecode writes disabled;
- mutable-checkout privileged execution rejection;
- externally reviewed host PID namespace lease;
- externally reviewed host mount namespace lease;
- externally reviewed host user namespace lease;
- retained procfs view and retained PID-1 filesystem root;
- generation-stable all-task census;
- per-thread file-system references and host mount namespace checks;
- live-at-use reverification.

The source does **not** authenticate namespace-lease provenance itself.

These remain false:

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

## Historical V3 preservation

V4 requires the exact historical V3 lock blob:

```text
e66742be948ae418cbdca75542db263050930c15
```

and requires that V3 still records its accepted historical source blob
`9738f14111fc03dffe9afb04f7bede73ceb13087`.

V4 supersedes V3 only for **current-source acceptance**. It does not rewrite or
invalidate the historical receipt.

## No execution or install authority

V4 accepts source bytes only. It does not install the protected source and does
not authorize a root census.

All of these remain false:

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

The next source-only gate is to restack/review the existing protected-source
installation plan in Draft #3771 against this V4 current-source acceptance.
That is not permission to install it.

**PROTECT THE CORE.**
