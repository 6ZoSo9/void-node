# Buy VOID custody protected proc-ref installer candidate lock V1

Marker: `VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_CANDIDATE_LOCK_V1`.

Status: **disabled installer candidate accepted; protected installation not authorized**.

This lock accepts the exact source/CI-qualified installer candidate from Draft
#3785. It does not install anything and does not make the candidate's
`--apply` path reachable.

## Exact accepted candidate

```text
parent_candidate_head=55fce8163f1f5f253fbdf06ff7166ccef87dc8f4
source_path=ops/precision/void_buy_allocation_custody_protected_procref_install_candidate_v1.py
source_git_blob_sha1=467bed6ef835bc84eb5b6f8cb53b0fbfb1b1f686
source_bytes=41900
source_ascii_only=true
source_sha256=0b84ae0abeb1e791ec41b2a4c5fe46f10bf20ccad4fb214cc6c51fd8cd89bee1
proof_git_blob_sha1=3faa229d3235c20536ba98b8461fff346d111f89
document_git_blob_sha1=0aa1454fcb876fab303f286b548e1814d298afe5
workflow_git_blob_sha1=522e25ff52897da99300ec324087a09844dc433e
```

## Hosted qualification

```text
workflow_run=40034125623
proof_job=120689301981
focused_workflow_success=true
same_account_exact_head_review_id=5635140037
live_protected_install_executed=false
live_root_census_executed=false
```

The review is same-account technical review, not an independent external
principal.

The focused run proves:

- exact four-file installer-candidate scope;
- compile and disposable self-test success;
- independent source-boundary proof success;
- exact stage descriptor retained through
  `renameat2(RENAME_NOREPLACE)`;
- stage pathname rebound to the retained stage descriptor immediately before
  publication;
- substituted-stage rejection;
- foreign substituted stage cleanup refusal;
- exact created-stage cleanup;
- post-publication target bound to the retained stage generation;
- truthful pre/post-publication host-write classification;
- explicit `--apply --source-file /nonexistent/never-read` HOLD before
  source/root/`/opt` access.

## Preserved lineage

The accepted disabled installer remains bound to:

```text
install_plan_head=2ba266ddec0e17154db1a8511a0a29d5db2174f6
install_plan_git_blob=a2431fffbee7be4de2ee1152b70e5fcccafd40c9

accepted_protected_source_lock_head=77728fa6781b82b98caeaacbf54cfca40a4bc249
accepted_protected_source_lock_blob=29a5d9325468897c9b99d22d4a0376547a5e865e

accepted_protected_source_head=0eb763d8ecba723f5a80cccb24a297fbf5a010b7
accepted_protected_source_blob=2f22f0cf3e5c5ed56c2a31f0862f087cdbbe41a9
accepted_protected_source_sha256=79810ed2afa60d2e544e0f6f48ff8189dd26d5aaeb65208bfb1f562fda467a1c
```

## What acceptance means

This lock accepts **implementation bytes only**.

The accepted candidate still contains:

```text
production_apply_cli_present=true
production_apply_reachable=false
production_apply_authorized=false
```

Its hard-disabled apply guard precedes source-path validation, root checks,
candidate reads, `/opt` opens, stage creation, writes, fsync and publication.

The implementation has been reviewed as a future algorithm, but accepting it
does not flip that guard.

## Authority remains false

```text
installer_candidate_accepted=true

protected_install_authorized=false
protected_source_installed=false
root_census_execution_authorized=false
live_privileged_census_authorized=false
live_privileged_census_executed=false
filesystem_write=false
permission_mutation=false
service_mutation=false
systemd_mutation=false
existing_target_replaced=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

The next gate is a **distinct** protected-install apply-authorization
generation. That gate requires explicit separate operator authority; this lock
is not that authority.

Even after a future protected install, the resulting install receipt must
receive separate external review before any privileged all-process census is
considered.

**PROTECT THE CORE.**
