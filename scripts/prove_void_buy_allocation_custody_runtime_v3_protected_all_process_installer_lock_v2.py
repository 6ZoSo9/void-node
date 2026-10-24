#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v2.json"
)
INSTALLER = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v2.py"
)
INSTALLER_PROOF = (
    ROOT
    / "scripts/"
    "prove_void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v2.py"
)
INSTALLER_DOC = (
    ROOT
    / "docs/operators/"
    "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-candidate-v2.md"
)
INSTALLER_WORKFLOW = (
    ROOT
    / ".github/workflows/"
    "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-candidate-v2.yml"
)
PLAN = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_protected_all_process_install_plan_v1.py"
)
PREDECESSOR_LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v1.json"
)

LOCK_BLOB = "486a6f6e1e2c594e60d6f9fe3fa32b03175630ae"
INSTALLER_HEAD = "0eb7d49b10681ee7b29298ca325902671121ef5a"
PLAN_HEAD = "06395abde20620b99808f62fe0d90a3f2e05528e"
INSTALLER_BLOB = "bd8728be0b59bce3db0f559d0ebd01692f9a5844"
INSTALLER_BYTES = 46939
INSTALLER_SHA256 = (
    "75934d38e5b89eed904be7738c82de6cd586ac11afc28e075cc44a4e7fb9d715"
)
INSTALLER_PROOF_BLOB = "a8c3847b34da4fa05a50f741625b2171a1e34548"
INSTALLER_DOC_BLOB = "ba1609aa65e7ef8dfaa8326f9c6a3c589528af6d"
INSTALLER_WORKFLOW_BLOB = "80efb530a09c89b81a23c639309f0aee6633ab90"
PLAN_BLOB = "0fef4e6f76738dd474ea775985b1facdd922bb54"
PREDECESSOR_LOCK_BLOB = "a1e1f4887787b408d313e73360966f93a63b2b58"
FOCUSED_RUN = 40073107466
FOCUSED_JOB = 120810613302
OPERATOR_REVIEW = 5637294073
INDEPENDENT_CODEX_COMMENT = 6381355558
INDEPENDENT_CODEX_AUTHOR = "chatgpt-codex-connector[bot]"
LOCK_ID = (
    "voidbuycustodyprocrefinstallerlock2_"
    "bd8728be0b59bce3db0f559d0ebd01692f9a5844"
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
predecessor_lock_raw = read_exact(PREDECESSOR_LOCK, PREDECESSOR_LOCK_BLOB)

if len(sys.argv) != 3 or sys.argv[1] != "--hosted-evidence":
    raise SystemExit("hosted_evidence_receipt_required")
hosted_path = Path(sys.argv[2])
hosted = json.loads(hosted_path.read_text(encoding="utf-8"))
assert hosted == {
    "schema": "void_buy_void_installer_v2_hosted_evidence_v1",
    "repository": "6ZoSo9/void-node",
    "run_id": FOCUSED_RUN,
    "run_head_sha": INSTALLER_HEAD,
    "run_workflow_path": (
        ".github/workflows/"
        "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-candidate-v2.yml"
    ),
    "run_event": "pull_request",
    "run_status": "completed",
    "run_conclusion": "success",
    "job_id": FOCUSED_JOB,
    "job_run_id": FOCUSED_RUN,
    "job_name": "prove",
    "job_status": "completed",
    "job_conclusion": "success",
    "operator_review_id": OPERATOR_REVIEW,
    "operator_review_commit": INSTALLER_HEAD,
    "operator_review_author": "6ZoSo9",
    "operator_review_state": "COMMENTED",
    "operator_review_independent": False,
    "codex_comment_id": INDEPENDENT_CODEX_COMMENT,
    "codex_comment_author": INDEPENDENT_CODEX_AUTHOR,
    "codex_review_commit": INSTALLER_HEAD,
    "codex_has_findings": False,
    "codex_has_unresolved_findings": False,
    "codex_status": "completed",
    "authenticated_via_github_api": True,
}

assert len(installer_raw) == INSTALLER_BYTES
assert sha256(installer_raw) == INSTALLER_SHA256
assert installer_raw.isascii()

lock = json.loads(lock_raw.decode("utf-8"))
assert lock == {
    "schema": "void_buy_void_custody_runtime_v3_protected_all_process_installer_lock_v2",
    "marker": "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V2",
    "version": 2,
    "repository": "6ZoSo9/void-node",
    "parent_installer_head": INSTALLER_HEAD,
    "parent_plan_head": PLAN_HEAD,
    "lock_id": LOCK_ID,
    "installer_candidate_evidence": {
        "source_path": (
            "ops/precision/"
            "void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v2.py"
        ),
        "source_git_blob_sha1": INSTALLER_BLOB,
        "source_bytes": INSTALLER_BYTES,
        "source_sha256": INSTALLER_SHA256,
        "proof_path": (
            "scripts/"
            "prove_void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v2.py"
        ),
        "proof_git_blob_sha1": INSTALLER_PROOF_BLOB,
        "document_path": (
            "docs/operators/"
            "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-candidate-v2.md"
        ),
        "document_git_blob_sha1": INSTALLER_DOC_BLOB,
        "workflow_path": (
            ".github/workflows/"
            "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-candidate-v2.yml"
        ),
        "workflow_git_blob_sha1": INSTALLER_WORKFLOW_BLOB,
        "focused_workflow_run": FOCUSED_RUN,
        "focused_job_id": FOCUSED_JOB,
        "operator_review_id": OPERATOR_REVIEW,
        "operator_review_expected_commit": INSTALLER_HEAD,
        "operator_review_independent": False,
        "independent_codex_comment_id": INDEPENDENT_CODEX_COMMENT,
        "independent_codex_expected_author": INDEPENDENT_CODEX_AUTHOR,
        "independent_codex_expected_commit": INSTALLER_HEAD,
        "hosted_metadata_authentication_required": True,
    },
    "predecessor_lock_evidence": {
        "path": (
            "ops/security/"
            "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v1.json"
        ),
        "git_blob_sha1": PREDECESSOR_LOCK_BLOB,
        "historical_candidate_installer_source_accepted": True,
        "historical_protected_install_authorized": False,
    },
    "parent_plan_evidence": {
        "source_path": (
            "ops/precision/"
            "void_buy_allocation_custody_runtime_v3_protected_all_process_install_plan_v1.py"
        ),
        "source_git_blob_sha1": PLAN_BLOB,
        "install_target_selected": True,
        "protected_install_authorized": False,
    },
    "candidate_installer_source_accepted": True,
    "ctypes_free_builtin_voidfs_boundary_accepted": True,
    "voidfs_preloaded_cache_rejection_accepted": True,
    "repository_input_fifo_nonblocking_accepted": True,
    "install_target_selected": True,
    "protected_installer_first_entry_installed": False,
    "protected_installer_first_entry_verified": False,
    "protected_install_authorized": False,
    "protected_source_installed": False,
    "live_privileged_census_authorized": False,
    "live_privileged_census_executed": False,
    "service_mutation": False,
    "systemd_mutation": False,
    "existing_target_replaced": False,
    "replacement_apply_authorized": False,
    "runtime_integration": False,
    "payment_acceptance": False,
    "public_presale_activation": False,
    "production_gate_ready": False,
    "funds_movement": False,
}

predecessor = json.loads(predecessor_lock_raw.decode("utf-8"))
assert predecessor["marker"] == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V1"
)
assert predecessor["candidate_installer_source_accepted"] is True
assert predecessor["protected_install_authorized"] is False
assert predecessor["protected_source_installed"] is False
assert predecessor["replacement_apply_authorized"] is False
assert predecessor["funds_movement"] is False

source = installer_raw.decode("ascii")
for required in (
    "PROTECTED_FIRST_ENTRY_REQUIRED = True",
    "DIRECT_APPLY_CLI = False",
    "def install_accepted_source_create_only_after_protected_first_entry()",
    "def _require_builtin_voidfs()",
    'if "_voidfs" in _bootstrap_sys.modules:',
    'raise InstallError("voidfs_preloaded_module_forbidden")',
    'importlib.machinery.BuiltinImporter.find_spec("_voidfs")',
    "importlib.util.module_from_spec(spec)",
    "spec.loader.exec_module(module)",
    "def _voidfs_rename_noreplace(",
    "rename_fn: Callable[[int, str, str], None] = _voidfs_rename_noreplace",
    "os.O_NONBLOCK",
    "class StageGenerationUnknownError(InstallError)",
    "self.possible_residual_stage = True",
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
    "import ctypes",
    "ctypes.",
    '__import__("ctypes")',
    "CDLL",
    "renameat2",
    "dlopen",
    "dlsym",
    "libc.",
):
    assert forbidden not in source, forbidden

bridge = source.split(
    "def _voidfs_rename_noreplace(", 1
)[1].split("def _stat_nofollow_at", 1)[0]
assert "os.rename(" not in bridge
assert "_fixture_rename_noreplace" not in bridge

fixed_entry = source.split(
    "def install_accepted_source_create_only_after_protected_first_entry()", 1
)[1].split("def source_plan()", 1)[0]
assert "rename_fn=" not in fixed_entry
assert "_fixture_rename_noreplace" not in fixed_entry

print(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V2_PROOF_GREEN"
)
print("lock_exact=true")
print("installer_source_exact=true")
print("installer_source_ascii_only=true")
print("installer_source_bytes=46939")
print("installer_source_sha256=" + INSTALLER_SHA256)
print("hosted_metadata_authenticated=true")
print("hosted_installer_run_bound=true")
print("hosted_installer_job_bound=true")
print("operator_review_same_account_only=true")
print("independent_codex_review_bound=true")
print("exact_head_review_bound=true")
print("predecessor_lock_bound=true")
print("fixed_least_authority_entrypoint_bound=true")
print("direct_apply_cli_absent=true")
print("ctypes_free_builtin_voidfs_boundary_bound=true")
print("voidfs_preloaded_cache_rejection_bound=true")
print("sys_modules_shadow_regression_hosted=true")
print("repository_input_fifo_nonblocking_bound=true")
print("ordinary_rename_fallback_absent=true")
print("fixed_entrypoint_bridge_override_absent=true")
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
