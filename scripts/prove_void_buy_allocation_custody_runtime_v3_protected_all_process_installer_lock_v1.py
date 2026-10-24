#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v1.json"
)
INSTALLER = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v1.py"
)
INSTALLER_PROOF = (
    ROOT
    / "scripts/"
    "prove_void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v1.py"
)
INSTALLER_DOC = (
    ROOT
    / "docs/operators/"
    "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-candidate-v1.md"
)
INSTALLER_WORKFLOW = (
    ROOT
    / ".github/workflows/"
    "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-candidate-v1.yml"
)
PLAN = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_protected_all_process_install_plan_v1.py"
)

LOCK_BLOB = "a1e1f4887787b408d313e73360966f93a63b2b58"
INSTALLER_HEAD = "395249d8eab96adbdf5b15c6654326bd827aa1a0"
PLAN_HEAD = "06395abde20620b99808f62fe0d90a3f2e05528e"
INSTALLER_BLOB = "9dd33f38fe4c89a5d2beacbc535380346eaea83b"
INSTALLER_BYTES = 38420
INSTALLER_SHA256 = (
    "e956c90ad9680680d0734466b632a58a4145ad74c8962e9e8960b186caeced01"
)
INSTALLER_PROOF_BLOB = "9b6552be11dd48b40e2c6445b1336fc8634be713"
INSTALLER_DOC_BLOB = "af5d3dd79050ef47de01a5d02e05656c6ee9540c"
INSTALLER_WORKFLOW_BLOB = "84b3f07a3737b56a4d3a9e47013b431bb529b959"
PLAN_BLOB = "0fef4e6f76738dd474ea775985b1facdd922bb54"
FOCUSED_RUN = 40050661105
FOCUSED_JOB = 120742369422
EXACT_HEAD_REVIEW = 5636218305
LOCK_ID = (
    "voidbuycustodyprocrefinstallerlock1_"
    "9dd33f38fe4c89a5d2beacbc535380346eaea83b"
)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def read_exact(path: Path, expected_blob: str) -> bytes:
    raw = path.read_bytes()
    assert git_blob(raw) == expected_blob, path
    return raw


lock_raw = read_exact(LOCK, LOCK_BLOB)
installer_raw = read_exact(INSTALLER, INSTALLER_BLOB)
read_exact(INSTALLER_PROOF, INSTALLER_PROOF_BLOB)
read_exact(INSTALLER_DOC, INSTALLER_DOC_BLOB)
read_exact(INSTALLER_WORKFLOW, INSTALLER_WORKFLOW_BLOB)
read_exact(PLAN, PLAN_BLOB)

assert len(installer_raw) == INSTALLER_BYTES
assert sha256(installer_raw) == INSTALLER_SHA256
assert installer_raw.isascii()

lock = json.loads(lock_raw.decode("utf-8"))
assert lock["schema"] == (
    "void_buy_void_custody_runtime_v3_protected_all_process_installer_lock_v1"
)
assert lock["marker"] == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V1"
)
assert lock["version"] == 1
assert lock["repository"] == "6ZoSo9/void-node"
assert lock["parent_installer_head"] == INSTALLER_HEAD
assert lock["parent_plan_head"] == PLAN_HEAD
assert lock["lock_id"] == LOCK_ID

evidence = lock["installer_candidate_evidence"]
assert evidence == {
    "source_path": (
        "ops/precision/"
        "void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v1.py"
    ),
    "source_git_blob_sha1": INSTALLER_BLOB,
    "source_bytes": INSTALLER_BYTES,
    "source_sha256": INSTALLER_SHA256,
    "proof_path": (
        "scripts/"
        "prove_void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v1.py"
    ),
    "proof_git_blob_sha1": INSTALLER_PROOF_BLOB,
    "document_path": (
        "docs/operators/"
        "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-candidate-v1.md"
    ),
    "document_git_blob_sha1": INSTALLER_DOC_BLOB,
    "workflow_path": (
        ".github/workflows/"
        "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-candidate-v1.yml"
    ),
    "workflow_git_blob_sha1": INSTALLER_WORKFLOW_BLOB,
    "focused_workflow_run": FOCUSED_RUN,
    "focused_job_id": FOCUSED_JOB,
    "exact_head_review_id": EXACT_HEAD_REVIEW,
}

assert lock["parent_plan_evidence"] == {
    "source_path": (
        "ops/precision/"
        "void_buy_allocation_custody_runtime_v3_protected_all_process_install_plan_v1.py"
    ),
    "source_git_blob_sha1": PLAN_BLOB,
    "install_target_selected": True,
    "protected_install_authorized": False,
}

assert lock["candidate_installer_source_accepted"] is True
assert lock["install_target_selected"] is True

for key in (
    "protected_installer_first_entry_installed",
    "protected_installer_first_entry_verified",
    "protected_install_authorized",
    "protected_source_installed",
    "live_privileged_census_authorized",
    "live_privileged_census_executed",
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
    assert lock[key] is False, key

source = installer_raw.decode("ascii")
for required in (
    "PROTECTED_FIRST_ENTRY_REQUIRED = True",
    "DIRECT_APPLY_CLI = False",
    "def install_accepted_source_create_only_after_protected_first_entry()",
    "accepted = verify_repository_inputs()",
    "len(accepted) != ACCEPTED_SOURCE_BYTES",
    "sha256(accepted) != ACCEPTED_SOURCE_SHA256",
    "git_blob(accepted) != ACCEPTED_SOURCE_GIT_BLOB",
    "parent=INSTALL_PARENT",
    "install_name=INSTALL_NAME",
    "stage_name=STAGE_NAME",
    "source_name=SOURCE_NAME",
    "expected_uid=0",
    "expected_gid=0",
    "require_root_parent=True",
    "class StageGenerationUnknownError(InstallError)",
    '"possible_residual_stage":',
    '"stage_generation_unknown_hold_required": True',
    '"retry_after_unknown_stage_requires_operator_inspection": True',
    '"protected_install_authorized": False',
    '"protected_source_installed": False',
    '"live_privileged_census_authorized": False',
    '"replacement_apply_authorized": False',
    '"payment_acceptance": False',
    '"public_presale_activation": False',
    '"funds_movement": False',
):
    assert required in source, required

for forbidden in (
    'group.add_argument("--apply"',
    'parser.add_argument("--apply"',
):
    assert forbidden not in source, forbidden

print(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V1_PROOF_GREEN"
)
print("lock_exact=true")
print("installer_source_exact=true")
print("installer_source_ascii_only=true")
print("installer_source_bytes=38420")
print("installer_source_sha256=" + INSTALLER_SHA256)
print("hosted_installer_run_bound=true")
print("hosted_installer_job_bound=true")
print("exact_head_review_bound=true")
print("fixed_least_authority_entrypoint_bound=true")
print("direct_apply_cli_absent=true")
print("stage_generation_unknown_hold_bound=true")
print("possible_residual_stage_boundary_bound=true")
print("install_target_selected=true")
print("candidate_installer_source_accepted=true")
print("protected_installer_first_entry_installed=false")
print("protected_installer_first_entry_verified=false")
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
