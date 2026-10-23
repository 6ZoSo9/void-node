#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCK = (
    ROOT
    / "ops/security/"
      "buy-void-allocation-custody-runtime-v3-"
      "protected-all-process-reference-census-lock-v2.json"
)
SOURCE = (
    ROOT
    / "ops/precision/"
      "void_buy_allocation_custody_runtime_v3_"
      "protected_all_process_reference_census_v1.py"
)
SOURCE_PROOF = (
    ROOT
    / "scripts/"
      "prove_void_buy_allocation_custody_runtime_v3_"
      "protected_all_process_reference_census_v1.py"
)
SOURCE_DOC = (
    ROOT
    / "docs/operators/"
      "buy-void-allocation-custody-runtime-v3-"
      "protected-all-process-reference-census-v1.md"
)
SOURCE_WORKFLOW = (
    ROOT
    / ".github/workflows/"
      "buy-void-allocation-custody-runtime-v3-"
      "protected-all-process-reference-census-v1.yml"
)

LOCK_BLOB = "ebf23705c6e40865bafea6087cc8f83dffb8ff46"
SOURCE_BLOB = "25a0913606baa3303743f36a8c79f3c7a14ea159"
SOURCE_BYTES = 70661
SOURCE_PROOF_BLOB = "3f9e30ddd89f36b37f6d7f9754f95f7d190d4da3"
SOURCE_DOC_BLOB = "6424b96d89a4109a42ed73b3dc8c88b78e9589d4"
SOURCE_WORKFLOW_BLOB = "74dadcfb40b2eab81260dd58b9783085f3cba8fe"
PARENT_HEAD = "3d7b8041f90b92d66d8de43cd0b28e98cbf194be"
FOCUSED_RUN = 40015277813
FOCUSED_JOB = 120625660577

MARKER = (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V2_PROOF"
)


class Hold(Exception):
    pass


def need(ok: bool, reason: str) -> None:
    if not ok:
        raise Hold(reason)


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


def strict_json(raw: bytes) -> object:
    def pairs(items: list[tuple[str, object]]) -> dict[str, object]:
        out: dict[str, object] = {}
        for key, value in items:
            if key in out:
                raise Hold("duplicate_json_key:" + key)
            out[key] = value
        return out

    def constant(value: str) -> object:
        raise Hold("nonfinite_json_constant:" + value)

    try:
        text = raw.decode("utf-8", "strict")
        return json.loads(
            text,
            object_pairs_hook=pairs,
            parse_constant=constant,
        )
    except UnicodeError as exc:
        raise Hold("lock_utf8_invalid") from exc
    except json.JSONDecodeError as exc:
        raise Hold("lock_json_invalid") from exc


def main() -> None:
    lock_raw = LOCK.read_bytes()
    source_raw = SOURCE.read_bytes()
    source_proof_raw = SOURCE_PROOF.read_bytes()
    source_doc_raw = SOURCE_DOC.read_bytes()
    source_workflow_raw = SOURCE_WORKFLOW.read_bytes()

    need(git_blob(lock_raw) == LOCK_BLOB, "lock_blob_mismatch")
    need(git_blob(source_raw) == SOURCE_BLOB, "source_blob_mismatch")
    need(len(source_raw) == SOURCE_BYTES, "source_byte_count_mismatch")
    need(source_raw.isascii(), "source_non_ascii")
    need(git_blob(source_proof_raw) == SOURCE_PROOF_BLOB, "source_proof_blob_mismatch")
    need(git_blob(source_doc_raw) == SOURCE_DOC_BLOB, "source_doc_blob_mismatch")
    need(
        git_blob(source_workflow_raw) == SOURCE_WORKFLOW_BLOB,
        "source_workflow_blob_mismatch",
    )

    value = strict_json(lock_raw)
    need(type(value) is dict, "lock_shape_invalid")
    lock = value

    need(
        lock.get("schema")
        == "void_buy_void_custody_runtime_v3_protected_all_process_reference_census_lock_v2"
        and lock.get("marker")
        == "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V2"
        and lock.get("version") == 2
        and lock.get("repository") == "6ZoSo9/void-node",
        "lock_identity_invalid",
    )
    need(
        lock.get("lock_id")
        == "voidbuycustodyallprocreflock2_" + SOURCE_BLOB,
        "lock_id_invalid",
    )
    need(lock.get("parent_source_head") == PARENT_HEAD, "parent_source_head_invalid")
    need(
        lock.get("hosted_evidence")
        == {
            "workflow_run": FOCUSED_RUN,
            "proof_job": FOCUSED_JOB,
            "focused_workflow_success": True,
            "exact_head_code_review_no_findings": True,
            "live_host_census_executed": False,
        },
        "hosted_evidence_invalid",
    )

    candidate = lock.get("candidate_evidence")
    need(
        candidate
        == {
            "source_path":
                "ops/precision/"
                "void_buy_allocation_custody_runtime_v3_"
                "protected_all_process_reference_census_v1.py",
            "source_git_blob_sha1": SOURCE_BLOB,
            "source_bytes": SOURCE_BYTES,
            "source_ascii_only": True,
            "source_sha256_freshly_derived": False,
            "source_sha256_diagnostic_only": True,
            "proof_path":
                "scripts/"
                "prove_void_buy_allocation_custody_runtime_v3_"
                "protected_all_process_reference_census_v1.py",
            "proof_git_blob_sha1": SOURCE_PROOF_BLOB,
            "document_path":
                "docs/operators/"
                "buy-void-allocation-custody-runtime-v3-"
                "protected-all-process-reference-census-v1.md",
            "document_git_blob_sha1": SOURCE_DOC_BLOB,
            "workflow_path":
                ".github/workflows/"
                "buy-void-allocation-custody-runtime-v3-"
                "protected-all-process-reference-census-v1.yml",
            "workflow_git_blob_sha1": SOURCE_WORKFLOW_BLOB,
        },
        "candidate_evidence_invalid",
    )

    need(
        lock.get("lineage")
        == {
            "parent_current_uid_head":
                "5bfd56c850513c7b416fe0b2f854ee9b12e764e4",
            "parent_current_uid_source_git_blob_sha1":
                "ded737a228a627a241a84131113db6d3521f635c",
            "prestate_head":
                "836f5e704a603f67b77b2406aeec9174f640497e",
            "prestate_source_git_blob_sha1":
                "4d9c6e5809a5cc64454626760f71e60ed99354bc",
            "archive_lock_git_blob_sha1":
                "edb4ea2b833373ab387762e45ba7da4032c860f3",
            "archive_lock_sha256":
                "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7",
        },
        "lineage_invalid",
    )

    expected_semantics = {
        "bounded_generation_stable_task_inventory_required": True,
        "per_thread_files_fs_reference_scan_required": True,
        "per_thread_host_mount_namespace_required": True,
        "private_task_mount_namespace_rejected": True,
        "task_mount_namespace_generation_stability_required": True,
        "retained_procfs_view_required": True,
        "retained_host_root_required": True,
        "zombie_leader_live_worker_rejected": True,
        "host_namespace_lease_provenance_authenticated_by_census": False,
        "mount_namespace_reference_scan_performed": False,
        "mount_namespace_reference_absence_proven": False,
        "all_process_target_reference_absent_observed": False,
        "all_process_reference_absence_proven": False,
        "fd_table_stability_proven": False,
        "mapping_set_stability_proven": False,
        "process_reference_snapshot_race_free": False,
        "live_at_use_reverification_required": True,
    }
    need(
        lock.get("bounded_source_semantics") == expected_semantics,
        "bounded_source_semantics_invalid",
    )

    need(
        lock.get("protected_execution_contract")
        == {
            "install_root": "/opt/void-buy-allocation-custody-procref-v1",
            "source_path":
                "/opt/void-buy-allocation-custody-procref-v1/"
                "void_buy_allocation_custody_runtime_v3_"
                "protected_all_process_reference_census_v1.py",
            "root_execution_required": True,
            "root_owned_nonwritable_ancestry_required": True,
            "isolated_safe_path_python_required": True,
            "bytecode_write_disabled_required": True,
            "mutable_checkout_privileged_execution_rejected": True,
        },
        "protected_execution_contract_invalid",
    )

    need(lock.get("candidate_source_accepted") is True, "candidate_source_not_accepted")
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
        need(lock.get(key) is False, "forbidden_authority:" + key)

    need(
        lock.get("next_gate") == "REVIEW_CREATE_ONLY_PROTECTED_SOURCE_INSTALL_PLAN_V2",
        "next_gate_invalid",
    )

    source_text = source_raw.decode("ascii")
    for required in (
        'PROTECTED_ROOT = Path("/opt/void-buy-allocation-custody-procref-v1")',
        "per_thread_files_fs_reference_scan_required",
        "per_thread_host_mount_namespace_required",
        "task_mount_namespace_generation_stability_required",
        "private_task_mount_namespace_rejected",
        "retained_procfs_view_required",
        "retained_host_root_used",
        '"host_namespace_lease_provenance_authenticated_by_census": False',
        '"mount_namespace_reference_scan_performed": False',
        '"mount_namespace_reference_absence_proven": False',
        '"all_process_target_reference_absent_observed": False',
        '"all_process_reference_absence_proven": False',
        '"fd_table_stability_proven": False',
        '"mapping_set_stability_proven": False',
        '"process_reference_snapshot_race_free": False',
        '"replacement_apply_authorized": False',
    ):
        need(required in source_text, "source_semantic_marker_missing:" + required)

    for forbidden in (
        '"all_process_target_reference_absent_observed": True',
        '"all_process_reference_absence_proven": True',
        '"mount_namespace_reference_absence_proven": True',
        '"replacement_apply_authorized": True',
        "payment_acceptance=true",
        "public_presale_activation=true",
        "funds_movement=true",
    ):
        need(forbidden not in source_text, "source_forbidden_promotion:" + forbidden)

    diagnostic_sha256 = hashlib.sha256(source_raw).hexdigest()

    print(MARKER + "_GREEN")
    print("parent_source_head=" + PARENT_HEAD)
    print("candidate_source_git_blob_exact=true")
    print("candidate_source_bytes_exact=true")
    print("candidate_source_ascii_only=true")
    print("source_companion_blobs_exact=true")
    print("hosted_focused_run_bound=true")
    print("exact_head_code_review_no_findings_bound=true")
    print("candidate_source_accepted=true")
    print("source_sha256_freshly_derived=false")
    print("source_sha256_diagnostic_only=true")
    print("bounded_generation_stable_task_inventory_required=true")
    print("per_thread_files_fs_reference_scan_required=true")
    print("per_thread_host_mount_namespace_required=true")
    print("private_task_mount_namespace_rejected=true")
    print("task_mount_namespace_generation_stability_required=true")
    print("host_namespace_lease_provenance_authenticated_by_census=false")
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
    print("candidate_source_sha256=" + diagnostic_sha256)


if __name__ == "__main__":
    try:
        main()
    except (Hold, OSError, ValueError, TypeError, UnicodeError, RecursionError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc)[:240])
        print("candidate_source_accepted=false")
        print("protected_install_authorized=false")
        print("replacement_apply_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)
