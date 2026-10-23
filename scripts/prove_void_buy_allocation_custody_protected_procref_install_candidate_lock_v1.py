#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MARKER = "VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_CANDIDATE_LOCK_V1"

SOURCE = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_protected_procref_install_candidate_v1.py"
)
SOURCE_PROOF = (
    ROOT
    / "scripts/"
    "prove_void_buy_allocation_custody_protected_procref_install_candidate_v1.py"
)
SOURCE_DOCUMENT = (
    ROOT
    / "docs/operators/"
    "buy-void-allocation-custody-protected-procref-install-candidate-v1.md"
)
SOURCE_WORKFLOW = (
    ROOT
    / ".github/workflows/"
    "buy-void-allocation-custody-protected-procref-install-candidate-v1.yml"
)
LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-allocation-custody-protected-procref-install-candidate-lock-v1.json"
)
INSTALL_PLAN = (
    ROOT
    / "tools/"
    "void-buy-allocation-custody-protected-procref-install-plan-v1.mjs"
)
ACCEPTED_SOURCE_LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-reference-census-lock-v4.json"
)

PARENT_HEAD = "55fce8163f1f5f253fbdf06ff7166ccef87dc8f4"
SOURCE_BLOB = "467bed6ef835bc84eb5b6f8cb53b0fbfb1b1f686"
SOURCE_BYTES = 41900
SOURCE_SHA256 = (
    "0b84ae0abeb1e791ec41b2a4c5fe46f10bf20cca"
    "d4fb214cc6c51fd8cd89bee1"
)
SOURCE_PROOF_BLOB = "3faa229d3235c20536ba98b8461fff346d111f89"
SOURCE_DOCUMENT_BLOB = "0aa1454fcb876fab303f286b548e1814d298afe5"
SOURCE_WORKFLOW_BLOB = "522e25ff52897da99300ec324087a09844dc433e"
LOCK_BLOB = "c5a72c36d4825c89c3332b75c938508f93ee01e4"
INSTALL_PLAN_BLOB = "a2431fffbee7be4de2ee1152b70e5fcccafd40c9"
ACCEPTED_SOURCE_LOCK_BLOB = "29a5d9325468897c9b99d22d4a0376547a5e865e"

HOSTED_RUN = 40034125623
HOSTED_JOB = 120689301981
REVIEW_ID = 5635140037


class Hold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise Hold(reason)


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def require_ascii(raw: bytes, code: str) -> str:
    try:
        return raw.decode("ascii")
    except UnicodeDecodeError:
        hold(code)


def main() -> None:
    source_raw = SOURCE.read_bytes()
    proof_raw = SOURCE_PROOF.read_bytes()
    document_raw = SOURCE_DOCUMENT.read_bytes()
    workflow_raw = SOURCE_WORKFLOW.read_bytes()
    lock_raw = LOCK.read_bytes()
    install_plan_raw = INSTALL_PLAN.read_bytes()
    source_lock_raw = ACCEPTED_SOURCE_LOCK.read_bytes()

    if git_blob(source_raw) != SOURCE_BLOB:
        hold("installer_source_blob_mismatch")
    if len(source_raw) != SOURCE_BYTES:
        hold("installer_source_bytes_mismatch")
    if hashlib.sha256(source_raw).hexdigest() != SOURCE_SHA256:
        hold("installer_source_sha256_mismatch")
    source_text = require_ascii(source_raw, "installer_source_non_ascii")

    if git_blob(proof_raw) != SOURCE_PROOF_BLOB:
        hold("installer_proof_blob_mismatch")
    if git_blob(document_raw) != SOURCE_DOCUMENT_BLOB:
        hold("installer_document_blob_mismatch")
    if git_blob(workflow_raw) != SOURCE_WORKFLOW_BLOB:
        hold("installer_workflow_blob_mismatch")
    if git_blob(lock_raw) != LOCK_BLOB:
        hold("acceptance_lock_blob_mismatch")
    if git_blob(install_plan_raw) != INSTALL_PLAN_BLOB:
        hold("install_plan_blob_mismatch")
    if git_blob(source_lock_raw) != ACCEPTED_SOURCE_LOCK_BLOB:
        hold("accepted_source_lock_blob_mismatch")

    try:
        lock = json.loads(lock_raw.decode("utf-8"))
        accepted_source_lock = json.loads(source_lock_raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("json_invalid:" + type(exc).__name__)

    if not isinstance(lock, dict):
        hold("lock_shape_invalid")
    if lock.get("schema") != (
        "void_buy_void_custody_protected_procref_install_candidate_lock_v1"
    ):
        hold("lock_schema_invalid")
    if (
        lock.get("marker") != MARKER
        or lock.get("version") != 1
        or lock.get("repository") != "6ZoSo9/void-node"
        or lock.get("parent_candidate_head") != PARENT_HEAD
    ):
        hold("lock_identity_invalid")
    if lock.get("lock_id") != (
        "voidbuycustodyprocrefinstalllock1_" + SOURCE_BLOB
    ):
        hold("lock_id_invalid")

    hosted = lock.get("hosted_evidence")
    if hosted != {
        "workflow_run": HOSTED_RUN,
        "proof_job": HOSTED_JOB,
        "focused_workflow_success": True,
        "same_account_exact_head_review_no_findings": True,
        "same_account_review_id": REVIEW_ID,
        "live_protected_install_executed": False,
        "live_root_census_executed": False,
    }:
        hold("hosted_evidence_invalid")

    evidence = lock.get("candidate_evidence")
    if evidence != {
        "source_path": (
            "ops/precision/"
            "void_buy_allocation_custody_protected_procref_install_candidate_v1.py"
        ),
        "source_git_blob_sha1": SOURCE_BLOB,
        "source_bytes": SOURCE_BYTES,
        "source_ascii_only": True,
        "source_sha256": SOURCE_SHA256,
        "source_sha256_freshly_derived": True,
        "proof_path": (
            "scripts/"
            "prove_void_buy_allocation_custody_protected_procref_install_candidate_v1.py"
        ),
        "proof_git_blob_sha1": SOURCE_PROOF_BLOB,
        "document_path": (
            "docs/operators/"
            "buy-void-allocation-custody-protected-procref-install-candidate-v1.md"
        ),
        "document_git_blob_sha1": SOURCE_DOCUMENT_BLOB,
        "workflow_path": (
            ".github/workflows/"
            "buy-void-allocation-custody-protected-procref-install-candidate-v1.yml"
        ),
        "workflow_git_blob_sha1": SOURCE_WORKFLOW_BLOB,
    }:
        hold("candidate_evidence_mismatch")

    lineage = lock.get("lineage")
    if lineage != {
        "install_plan_head": "2ba266ddec0e17154db1a8511a0a29d5db2174f6",
        "install_plan_git_blob_sha1": INSTALL_PLAN_BLOB,
        "accepted_protected_source_lock_head":
            "77728fa6781b82b98caeaacbf54cfca40a4bc249",
        "accepted_protected_source_lock_git_blob_sha1":
            ACCEPTED_SOURCE_LOCK_BLOB,
        "accepted_protected_source_head":
            "0eb763d8ecba723f5a80cccb24a297fbf5a010b7",
        "accepted_protected_source_git_blob_sha1":
            "2f22f0cf3e5c5ed56c2a31f0862f087cdbbe41a9",
        "accepted_protected_source_sha256":
            "79810ed2afa60d2e544e0f6f48ff8189"
            "dd26d5aaeb65208bfb1f562fda467a1c",
    }:
        hold("lineage_mismatch")

    if (
        not isinstance(accepted_source_lock, dict)
        or accepted_source_lock.get("candidate_source_accepted") is not True
        or accepted_source_lock.get("candidate_evidence", {}).get(
            "source_git_blob_sha1"
        )
        != "2f22f0cf3e5c5ed56c2a31f0862f087cdbbe41a9"
        or accepted_source_lock.get("protected_install_authorized") is not False
    ):
        hold("accepted_protected_source_lock_invalid")

    semantics = lock.get("bounded_candidate_semantics")
    if not isinstance(semantics, dict):
        hold("bounded_candidate_semantics_invalid")
    for key in (
        "production_apply_cli_present",
        "apply_guard_precedes_host_access",
        "nonexistent_source_candidate_not_read_by_apply_guard_test",
        "python_no_bytecode_mode_required",
        "create_only_publication_required",
        "renameat2_rename_noreplace_required",
        "install_parent_descriptor_retained_required",
        "install_parent_mount_id_revalidation_required",
        "stage_descriptor_retained_through_publication",
        "stage_path_revalidated_before_publication",
        "stage_substitution_rejected",
        "foreign_stage_cleanup_refused",
        "exact_stage_generation_cleanup_required",
        "post_publication_target_bound_to_retained_stage",
        "post_publication_exact_reverification_required",
        "truthful_host_write_failure_classification",
        "content_addressed_install_receipt_required",
        "install_receipt_external_review_required",
    ):
        if semantics.get(key) is not True:
            hold("required_semantic_not_true:" + key)
    for key in (
        "production_apply_reachable",
        "production_apply_authorized",
        "root_census_execution_authorized",
        "replacement_apply_authorized",
    ):
        if semantics.get(key) is not False:
            hold("required_semantic_not_false:" + key)

    required_source_markers = (
        "PRODUCTION_APPLY_AUTHORIZED = False",
        "production_apply_cli_present=true",
        "production_apply_reachable=false",
        "stage_descriptor_retained_through_publication=true",
        "stage_substitution_rejected=true",
        "foreign_stage_cleanup_refused=true",
        "production_host_write_performed=",
        "published_needs_inspection",
    )
    for marker in required_source_markers:
        if marker not in source_text:
            hold("installer_source_marker_missing:" + marker)

    if lock.get("installer_candidate_accepted") is not True:
        hold("installer_candidate_not_accepted")
    for key in (
        "protected_install_authorized",
        "protected_source_installed",
        "root_census_execution_authorized",
        "live_privileged_census_authorized",
        "live_privileged_census_executed",
        "filesystem_write",
        "permission_mutation",
        "service_mutation",
        "systemd_mutation",
        "existing_target_replaced",
        "replacement_apply_authorized",
        "runtime_integration",
        "payment_acceptance",
        "public_presale_activation",
        "production_gate_ready",
        "funds_movement",
    ):
        if lock.get(key) is not False:
            hold("forbidden_authority:" + key)

    if lock.get("next_gate") != (
        "DISTINCT_PROTECTED_INSTALL_APPLY_AUTHORIZATION_"
        "REQUIRES_EXPLICIT_SEPARATE_OPERATOR_AUTHORITY"
    ):
        hold("next_gate_invalid")

    print(MARKER + "_GREEN")
    print("installer_source_git_blob_exact=true")
    print("installer_source_bytes_exact=true")
    print("installer_source_ascii_only=true")
    print("installer_source_sha256_exact=true")
    print("installer_companion_blobs_exact=true")
    print("focused_installer_run_bound=true")
    print("exact_head_review_bound=true")
    print("current_install_plan_lineage_bound=true")
    print("accepted_protected_source_lock_bound=true")
    print("installer_candidate_accepted=true")
    print("production_apply_cli_present=true")
    print("production_apply_reachable=false")
    print("production_apply_authorized=false")
    print("stage_descriptor_retained_through_publication=true")
    print("stage_path_revalidated_before_publication=true")
    print("stage_substitution_rejected=true")
    print("foreign_stage_cleanup_refused=true")
    print("truthful_host_write_failure_classification=true")
    print("protected_install_authorized=false")
    print("protected_source_installed=false")
    print("root_census_execution_authorized=false")
    print("live_privileged_census_authorized=false")
    print("live_privileged_census_executed=false")
    print("replacement_apply_authorized=false")
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("production_gate_ready=false")
    print("funds_movement=false")
    print(
        "next_gate="
        "DISTINCT_PROTECTED_INSTALL_APPLY_AUTHORIZATION_"
        "REQUIRES_EXPLICIT_SEPARATE_OPERATOR_AUTHORITY"
    )


if __name__ == "__main__":
    main()
