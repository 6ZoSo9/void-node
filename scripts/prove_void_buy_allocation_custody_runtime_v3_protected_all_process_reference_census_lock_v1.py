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
      "protected-all-process-reference-census-lock-v1.json"
)
SOURCE = (
    ROOT
    / "ops/precision/"
      "void_buy_allocation_custody_runtime_v3_"
      "protected_all_process_reference_census_v1.py"
)

LOCK_BLOB = "3eacfe0dec5144ba8c1e4c743bf3e8025f58f88a"
SOURCE_BLOB = "0567991abb05c121722d47485ab9e7410b8b8126"
SOURCE_BYTES = 31062
PARENT_HEAD = "7792fd3227c36cd7d19906f8966cd7244209cc3a"
FOCUSED_RUN = 39978717924
FOCUSED_JOB = 120500057374


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


lock_raw = LOCK.read_bytes()
source_raw = SOURCE.read_bytes()

assert git_blob(lock_raw) == LOCK_BLOB
assert git_blob(source_raw) == SOURCE_BLOB
assert len(source_raw) == SOURCE_BYTES
assert source_raw.isascii()

lock = json.loads(lock_raw.decode("utf-8"))
assert type(lock) is dict
assert lock["schema"] == (
    "void_buy_void_custody_runtime_v3_"
    "protected_all_process_reference_census_lock_v1"
)
assert lock["marker"] == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V1"
)
assert lock["version"] == 1
assert lock["repository"] == "6ZoSo9/void-node"
assert lock["parent_source_head"] == PARENT_HEAD
assert lock["hosted_evidence"] == {
    "workflow_run": FOCUSED_RUN,
    "proof_job": FOCUSED_JOB,
    "focused_workflow_success": True,
    "live_host_census_executed": False,
}

candidate = lock["candidate_evidence"]
assert candidate["source_path"] == (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_reference_census_v1.py"
)
assert candidate["source_git_blob_sha1"] == SOURCE_BLOB
assert candidate["source_bytes"] == SOURCE_BYTES
assert candidate["source_ascii_only"] is True
assert candidate["source_sha256_freshly_derived"] is False
assert candidate["proof_git_blob_sha1"] == (
    "83f5d15dce02fb9d3d4c21d9cb3d29526b179ae6"
)
assert candidate["document_git_blob_sha1"] == (
    "5b01353cedcbb0b7385b4b2f77e8aba69f5212fe"
)
assert candidate["workflow_git_blob_sha1"] == (
    "c668107c2a0faeacf09d8685d1dd8de45006220f"
)

lineage = lock["lineage"]
assert lineage == {
    "parent_current_uid_head":
        "a42153631b0523fcefca12b9ed40a9a743c2fadd",
    "parent_current_uid_source_git_blob_sha1":
        "86c493d7acbe539fe898024474ed3c8815760603",
    "prestate_head":
        "bcf95a7b30cc2f62822f9322438146eca4b24e41",
    "prestate_source_git_blob_sha1":
        "feb6508133a1feda9bda793646a5c949f1fdc7f0",
    "archive_lock_git_blob_sha1":
        "edb4ea2b833373ab387762e45ba7da4032c860f3",
    "archive_lock_sha256":
        "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7",
}

contract = lock["protected_execution_contract"]
assert contract == {
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
}

assert lock["candidate_source_accepted"] is True

for key in (
    "protected_install_authorized",
    "protected_source_installed",
    "live_privileged_census_authorized",
    "live_privileged_census_executed",
    "all_process_reference_absence_proven",
    "fd_table_stability_proven",
    "mapping_set_stability_proven",
    "process_reference_snapshot_race_free",
    "python_runtime_closure_verified",
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
    assert lock[key] is False, key

assert lock["live_at_use_reverification_required"] is True

source_text = source_raw.decode("ascii")
for required in (
    'PROTECTED_ROOT = Path("/opt/void-buy-allocation-custody-procref-v1")',
    "root_execution_required",
    "protected_source_fixed_path_required",
    "protected_source_ancestor_custody_invalid",
    "protected_source_leaf_custody_invalid",
    "all_process_reference_absence_proven",
    "fd_table_stability_proven",
    "mapping_set_stability_proven",
    "process_reference_snapshot_race_free",
    "live_at_use_reverification_required",
    "replacement_apply_authorized",
):
    assert required in source_text, required

for forbidden in (
    "service_start=true",
    "replacement_apply_authorized=true",
    "payment_acceptance=true",
    "public_presale_activation=true",
    "funds_movement=true",
):
    assert forbidden not in source_text, forbidden

print(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V1_PROOF_GREEN"
)
print("candidate_source_git_blob_exact=true")
print("candidate_source_bytes_exact=true")
print("candidate_source_ascii_only=true")
print("hosted_focused_run_bound=true")
print("protected_execution_contract_bound=true")
print("candidate_source_accepted=true")
print("source_sha256_freshly_derived=false")
print("protected_install_authorized=false")
print("protected_source_installed=false")
print("live_privileged_census_authorized=false")
print("live_privileged_census_executed=false")
print("all_process_reference_absence_proven=false")
print("fd_table_stability_proven=false")
print("mapping_set_stability_proven=false")
print("process_reference_snapshot_race_free=false")
print("live_at_use_reverification_required=true")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
print("candidate_source_sha256=" + hashlib.sha256(source_raw).hexdigest())
