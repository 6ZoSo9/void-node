#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import stat

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

LOCK_BLOB = "3cbbb8f923a3c1836d71dbdb1eb79f63669a4278"
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
EXACT_HEAD_REVIEW = 5637294073
LOCK_ID = (
    "voidbuycustodyprocrefinstallerlock2_"
    "bd8728be0b59bce3db0f559d0ebd01692f9a5844"
)
SOURCE_PR = 3808
WORKFLOW_ID = 394779866
WORKFLOW_NAME = "VOID Buy custody V3 protected all-process installer candidate v2"
WORKFLOW_EVENT = "pull_request"
FOCUSED_JOB_NAME = "prove"
REVIEW_AUTHOR = "6ZoSo9"
MAX_HOSTED_METADATA_BYTES = 2 * 1024 * 1024


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


def read_hosted_json(path: Path) -> object:
    st = path.lstat()
    assert stat.S_ISREG(st.st_mode), path
    assert not path.is_symlink(), path
    assert 1 <= st.st_size <= MAX_HOSTED_METADATA_BYTES, path
    raw = path.read_bytes()
    assert len(raw) == st.st_size, path
    return json.loads(raw.decode("utf-8"))


def validate_hosted_metadata(
    run: object,
    jobs_doc: object,
    review: object,
) -> None:
    assert isinstance(run, dict)
    assert run.get("id") == FOCUSED_RUN
    assert run.get("workflow_id") == WORKFLOW_ID
    assert run.get("name") == WORKFLOW_NAME
    assert run.get("path") == (
        ".github/workflows/"
        "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-candidate-v2.yml"
    )
    assert run.get("event") == WORKFLOW_EVENT
    assert run.get("status") == "completed"
    assert run.get("conclusion") == "success"
    assert run.get("head_sha") == INSTALLER_HEAD
    assert run.get("repository", {}).get("full_name") == "6ZoSo9/void-node"
    assert run.get("head_repository", {}).get("full_name") == "6ZoSo9/void-node"

    assert isinstance(jobs_doc, dict)
    jobs = jobs_doc.get("jobs")
    assert isinstance(jobs, list)
    matching_jobs = [
        row for row in jobs
        if isinstance(row, dict) and row.get("id") == FOCUSED_JOB
    ]
    assert len(matching_jobs) == 1
    job = matching_jobs[0]
    assert job.get("run_id") == FOCUSED_RUN
    assert job.get("name") == FOCUSED_JOB_NAME
    assert job.get("status") == "completed"
    assert job.get("conclusion") == "success"
    if "head_sha" in job:
        assert job.get("head_sha") == INSTALLER_HEAD
    run_url = str(job.get("run_url", ""))
    assert run_url.endswith("/actions/runs/" + str(FOCUSED_RUN))

    assert isinstance(review, dict)
    assert review.get("id") == EXACT_HEAD_REVIEW
    assert review.get("state") == "COMMENTED"
    assert review.get("commit_id") == INSTALLER_HEAD
    assert review.get("user", {}).get("login") == REVIEW_AUTHOR
    body = str(review.get("body", ""))
    assert INSTALLER_HEAD in body
    assert str(FOCUSED_RUN) in body
    assert str(FOCUSED_JOB) in body
    assert "FOCUSED V2 QUALIFICATION" in body


parser = argparse.ArgumentParser()
parser.add_argument("--hosted-metadata-dir", type=Path, required=True)
args = parser.parse_args()
hosted_dir = args.hosted_metadata_dir
run_metadata = read_hosted_json(hosted_dir / "run.json")
jobs_metadata = read_hosted_json(hosted_dir / "jobs.json")
review_metadata = read_hosted_json(hosted_dir / "review.json")


lock_raw = read_exact(LOCK, LOCK_BLOB)
installer_raw = read_exact(INSTALLER, INSTALLER_BLOB)
read_exact(INSTALLER_PROOF, INSTALLER_PROOF_BLOB)
read_exact(INSTALLER_DOC, INSTALLER_DOC_BLOB)
read_exact(INSTALLER_WORKFLOW, INSTALLER_WORKFLOW_BLOB)
read_exact(PLAN, PLAN_BLOB)
predecessor_lock_raw = read_exact(PREDECESSOR_LOCK, PREDECESSOR_LOCK_BLOB)

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
        "source_pr_number": SOURCE_PR,
        "workflow_id": WORKFLOW_ID,
        "workflow_name": WORKFLOW_NAME,
        "focused_run_expected_event": WORKFLOW_EVENT,
        "focused_run_expected_conclusion": "success",
        "focused_workflow_run": FOCUSED_RUN,
        "focused_job_id": FOCUSED_JOB,
        "focused_job_name": FOCUSED_JOB_NAME,
        "exact_head_review_id": EXACT_HEAD_REVIEW,
        "exact_head_review_commit": INSTALLER_HEAD,
        "exact_head_review_author": REVIEW_AUTHOR,
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

validate_hosted_metadata(run_metadata, jobs_metadata, review_metadata)

bad_run = copy.deepcopy(run_metadata)
assert isinstance(bad_run, dict)
bad_run["head_sha"] = "0" * 40
try:
    validate_hosted_metadata(bad_run, jobs_metadata, review_metadata)
except AssertionError:
    pass
else:
    raise AssertionError("wrong hosted run head was accepted")

bad_jobs = copy.deepcopy(jobs_metadata)
assert isinstance(bad_jobs, dict) and isinstance(bad_jobs.get("jobs"), list)
for row in bad_jobs["jobs"]:
    if isinstance(row, dict) and row.get("id") == FOCUSED_JOB:
        row["conclusion"] = "failure"
try:
    validate_hosted_metadata(run_metadata, bad_jobs, review_metadata)
except AssertionError:
    pass
else:
    raise AssertionError("failed hosted job was accepted")

bad_review = copy.deepcopy(review_metadata)
assert isinstance(bad_review, dict)
bad_review["commit_id"] = "f" * 40
try:
    validate_hosted_metadata(run_metadata, jobs_metadata, bad_review)
except AssertionError:
    pass
else:
    raise AssertionError("wrong review commit was accepted")

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
print("hosted_installer_run_bound=true")
print("hosted_installer_job_bound=true")
print("exact_head_review_bound=true")
print("hosted_installer_run_metadata_validated=true")
print("hosted_installer_job_metadata_validated=true")
print("exact_head_review_metadata_validated=true")
print("hosted_qualification_metadata_validated=true")
print("hosted_wrong_head_rejected=true")
print("hosted_failed_job_rejected=true")
print("hosted_wrong_review_commit_rejected=true")
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
