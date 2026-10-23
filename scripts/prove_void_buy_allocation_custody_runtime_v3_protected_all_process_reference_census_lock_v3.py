#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MARKER = (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V3"
)

SOURCE = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_reference_census_v1.py"
)
PROOF = (
    ROOT
    / "scripts/"
    "prove_void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_reference_census_lock_v3.py"
)
DOCUMENT = (
    ROOT
    / "docs/operators/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-reference-census-lock-v3.md"
)
LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-reference-census-lock-v3.json"
)

PARENT_HEAD = "cfae72e86e060ec797a86797d71f7be7aa019be8"
SOURCE_BLOB = "9738f14111fc03dffe9afb04f7bede73ceb13087"
SOURCE_BYTES = 74322
SOURCE_SHA256 = (
    "f3ef0593eae77825f730609b85da51af"
    "66168ba11f39848d052a91942e4cc335"
)

PARENT_CURRENT_UID_HEAD = "7736a3a5c53da37448c357a5d98e4dad09f3f617"
PARENT_CURRENT_UID_SOURCE_BLOB = "6bf476e3383b7b18966320df13b4041da9c8c11f"
PRESTATE_HEAD = "7736a3a5c53da37448c357a5d98e4dad09f3f617"
PRESTATE_SOURCE_BLOB = "e32ebd94ad09cd80e03489079e74657aab159d7a"
ARCHIVE_LOCK_BLOB = "edb4ea2b833373ab387762e45ba7da4032c860f3"
ARCHIVE_LOCK_SHA256 = (
    "ab96f16d93895b42c977fd26aef2c008"
    "115580e3ce31927275ed92986c86f8e7"
)


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
    proof_raw = PROOF.read_bytes()
    document_raw = DOCUMENT.read_bytes()
    lock_raw = LOCK.read_bytes()

    if git_blob(source_raw) != SOURCE_BLOB:
        hold("candidate_source_blob_mismatch")
    if len(source_raw) != SOURCE_BYTES:
        hold("candidate_source_bytes_mismatch")
    if hashlib.sha256(source_raw).hexdigest() != SOURCE_SHA256:
        hold("candidate_source_sha256_mismatch")
    source_text = require_ascii(source_raw, "candidate_source_non_ascii")
    require_ascii(proof_raw, "proof_non_ascii")
    require_ascii(document_raw, "document_non_ascii")

    try:
        lock = json.loads(lock_raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("lock_json_invalid:" + type(exc).__name__)

    if not isinstance(lock, dict):
        hold("lock_shape_invalid")
    if lock.get("schema") != (
        "void_buy_void_custody_runtime_v3_"
        "protected_all_process_reference_census_lock_v3"
    ):
        hold("lock_schema_invalid")
    if lock.get("marker") != MARKER or lock.get("version") != 3:
        hold("lock_identity_invalid")
    if lock.get("repository") != "6ZoSo9/void-node":
        hold("lock_repository_invalid")
    if lock.get("parent_source_head") != PARENT_HEAD:
        hold("parent_source_head_invalid")

    evidence = lock.get("candidate_evidence")
    if not isinstance(evidence, dict):
        hold("candidate_evidence_invalid")
    exact = {
        "source_path": (
            "ops/precision/"
            "void_buy_allocation_custody_runtime_v3_"
            "protected_all_process_reference_census_v1.py"
        ),
        "source_git_blob_sha1": SOURCE_BLOB,
        "source_bytes": SOURCE_BYTES,
        "source_ascii_only": True,
        "source_sha256": SOURCE_SHA256,
        "source_sha256_freshly_derived": True,
        "proof_path": (
            "scripts/"
            "prove_void_buy_allocation_custody_runtime_v3_"
            "protected_all_process_reference_census_lock_v3.py"
        ),
        "proof_git_blob_sha1": git_blob(proof_raw),
        "document_path": (
            "docs/operators/"
            "buy-void-allocation-custody-runtime-v3-"
            "protected-all-process-reference-census-lock-v3.md"
        ),
        "document_git_blob_sha1": git_blob(document_raw),
    }
    if evidence != exact:
        hold("candidate_evidence_mismatch")

    lineage = lock.get("lineage")
    if lineage != {
        "parent_current_uid_head": PARENT_CURRENT_UID_HEAD,
        "parent_current_uid_source_git_blob_sha1":
            PARENT_CURRENT_UID_SOURCE_BLOB,
        "prestate_head": PRESTATE_HEAD,
        "prestate_source_git_blob_sha1": PRESTATE_SOURCE_BLOB,
        "archive_lock_git_blob_sha1": ARCHIVE_LOCK_BLOB,
        "archive_lock_sha256": ARCHIVE_LOCK_SHA256,
    }:
        hold("lineage_mismatch")

    semantics = lock.get("bounded_source_semantics")
    if not isinstance(semantics, dict):
        hold("bounded_source_semantics_invalid")
    required_true = (
        "bounded_generation_stable_task_inventory_required",
        "per_thread_files_fs_reference_scan_required",
        "per_thread_host_mount_namespace_required",
        "private_task_mount_namespace_rejected",
        "task_mount_namespace_generation_stability_required",
        "retained_procfs_view_required",
        "retained_host_root_required",
        "zombie_leader_live_worker_rejected",
        "host_pid_namespace_external_lease_required",
        "host_mount_namespace_external_lease_required",
        "host_user_namespace_external_lease_required",
        "private_user_namespace_rejected",
        "host_user_namespace_lease_mismatch_rejected",
        "host_user_namespace_lease_revalidation_required",
        "live_at_use_reverification_required",
        "separately_reviewed_host_namespace_lease_required",
    )
    for key in required_true:
        if semantics.get(key) is not True:
            hold("required_semantic_not_true:" + key)

    required_false = (
        "host_namespace_lease_provenance_authenticated_by_census",
        "mount_namespace_reference_scan_performed",
        "mount_namespace_reference_absence_proven",
        "all_process_target_reference_absent_observed",
        "all_process_reference_absence_proven",
        "fd_table_stability_proven",
        "mapping_set_stability_proven",
        "process_reference_snapshot_race_free",
    )
    for key in required_false:
        if semantics.get(key) is not False:
            hold("required_semantic_not_false:" + key)

    protected = lock.get("protected_execution_contract")
    if protected != {
        "install_root": "/opt/void-buy-allocation-custody-procref-v1",
        "source_path": (
            "/opt/void-buy-allocation-custody-procref-v1/"
            "void_buy_allocation_custody_runtime_v3_"
            "protected_all_process_reference_census_v1.py"
        ),
        "root_execution_required": True,
        "root_owned_nonwritable_ancestry_required": True,
        "isolated_safe_path_python_required": True,
        "bytecode_write_disabled_required": True,
        "mutable_checkout_privileged_execution_rejected": True,
    }:
        hold("protected_execution_contract_invalid")

    hosted = lock.get("hosted_evidence")
    if hosted != {
        "workflow_run": 40018911504,
        "proof_job": 120638054198,
        "focused_workflow_success": True,
        "same_account_exact_head_review_no_findings": True,
        "live_host_census_executed": False,
    }:
        hold("hosted_evidence_invalid")

    predecessor = lock.get("predecessor_lock")
    if predecessor != {
        "pr": 3775,
        "version": 2,
        "source_git_blob_sha1":
            "25a0913606baa3303743f36a8c79f3c7a14ea159",
        "superseded_by_host_user_namespace_and_current_parent_repair": True,
    }:
        hold("predecessor_lock_invalid")

    if lock.get("candidate_source_accepted") is not True:
        hold("candidate_source_not_accepted")

    for key in (
        "protected_install_authorized",
        "protected_source_installed",
        "live_privileged_census_authorized",
        "live_privileged_census_executed",
        "service_mutation",
        "systemd_mutation",
        "install_target_selected",
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
        "RESTACK_REVIEW_PROTECTED_SOURCE_INSTALL_PLAN_PR3771"
    ):
        hold("next_gate_invalid")

    for required in (
        'PARENT_CURRENT_UID_HEAD = "7736a3a5c53da37448c357a5d98e4dad09f3f617"',
        'PARENT_CURRENT_UID_SOURCE_BLOB = "6bf476e3383b7b18966320df13b4041da9c8c11f"',
        'PRESTATE_SOURCE_BLOB = "e32ebd94ad09cd80e03489079e74657aab159d7a"',
        "def verify_user_namespace_lease_stats(",
        '"self/ns/user"',
        '"1/ns/user"',
        "expected_host_user_namespace_dev_ino",
        '"host_user_namespace_external_lease_required": True',
        '"host_user_namespace_lease_verified": True',
        '"host_namespace_lease_provenance_authenticated_by_census": False',
        '"mount_namespace_reference_absence_proven": False',
        '"all_process_reference_absence_proven": False',
        '"fd_table_stability_proven": False',
        '"mapping_set_stability_proven": False',
        '"process_reference_snapshot_race_free": False',
        '"replacement_apply_authorized": False',
    ):
        if required not in source_text:
            hold("source_semantic_marker_missing:" + required)

    for forbidden in (
        '"host_namespace_lease_provenance_authenticated_by_census": True',
        '"mount_namespace_reference_absence_proven": True',
        '"all_process_reference_absence_proven": True',
        '"replacement_apply_authorized": True',
        '"payment_acceptance": True',
        '"public_presale_activation": True',
        '"funds_movement": True',
    ):
        if forbidden in source_text:
            hold("source_forbidden_promotion:" + forbidden)

    print(MARKER + "_GREEN")
    print("parent_source_head=" + PARENT_HEAD)
    print("candidate_source_git_blob_exact=true")
    print("candidate_source_bytes_exact=true")
    print("candidate_source_ascii_only=true")
    print("candidate_source_sha256_exact=true")
    print("source_companion_blobs_exact=true")
    print("focused_source_run_bound=true")
    print("candidate_source_accepted=true")
    print("current_parent_lineage_bound=true")
    print("host_pid_namespace_external_lease_required=true")
    print("host_mount_namespace_external_lease_required=true")
    print("host_user_namespace_external_lease_required=true")
    print("private_user_namespace_rejected=true")
    print("host_user_namespace_lease_mismatch_rejected=true")
    print("host_user_namespace_lease_revalidation_required=true")
    print("host_namespace_lease_provenance_authenticated_by_census=false")
    print("separately_reviewed_host_namespace_lease_required=true")
    print("mount_namespace_reference_scan_performed=false")
    print("mount_namespace_reference_absence_proven=false")
    print("all_process_target_reference_absent_observed=false")
    print("all_process_reference_absence_proven=false")
    print("fd_table_stability_proven=false")
    print("mapping_set_stability_proven=false")
    print("process_reference_snapshot_race_free=false")
    print("live_at_use_reverification_required=true")
    print("protected_install_authorized=false")
    print("protected_source_installed=false")
    print("live_privileged_census_authorized=false")
    print("live_privileged_census_executed=false")
    print("replacement_apply_authorized=false")
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("production_gate_ready=false")
    print("funds_movement=false")
    print("next_gate=RESTACK_REVIEW_PROTECTED_SOURCE_INSTALL_PLAN_PR3771")


if __name__ == "__main__":
    try:
        main()
    except (Hold, OSError, ValueError, TypeError, UnicodeError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc)[:240])
        print("candidate_source_accepted=false")
        print("protected_install_authorized=false")
        print("replacement_apply_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)
