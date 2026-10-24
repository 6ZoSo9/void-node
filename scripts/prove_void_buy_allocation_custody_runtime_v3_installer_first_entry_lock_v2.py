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
    "buy-void-allocation-custody-runtime-v3-installer-first-entry-lock-v2.json"
)
SOURCE = (
    ROOT
    / "native/"
    "void_buy_allocation_custody_runtime_v3_installer_first_entry_source_v2.c"
)
SOURCE_PROOF = (
    ROOT
    / "scripts/"
    "prove_void_buy_allocation_custody_runtime_v3_installer_first_entry_source_v2.py"
)
SOURCE_DOC = (
    ROOT
    / "docs/operators/"
    "buy-void-allocation-custody-runtime-v3-installer-first-entry-source-v2.md"
)
SOURCE_WORKFLOW = (
    ROOT
    / ".github/workflows/"
    "buy-void-allocation-custody-runtime-v3-installer-first-entry-source-v2.yml"
)
INSTALLER_LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v2.json"
)

LOCK_BLOB = "36d6c4a5ff825993371f109ee86a77b601e12d07"
SOURCE_HEAD = "5ed63b70d89209201be903a5a92f9c5d760fd763"
INSTALLER_LOCK_HEAD = "3ad8c6f87fc9edfbffe196c42cf3aea99fdc9797"
SOURCE_BLOB = "d7693320783bcd0e3a2c4ef6c4afd86123e3688e"
SOURCE_BYTES = 20952
SOURCE_SHA256 = (
    "d9cc46aeb3fe5d945fdadf0c0cddbc9991b51ed9c4328b4d32c45a7825248974"
)
SOURCE_PROOF_BLOB = "3d2fce2dba70f63dc3b8894fa3f120baf0584c3c"
SOURCE_DOC_BLOB = "a64253df5d88ddf5ef44ed230026d94a98f295f6"
SOURCE_WORKFLOW_BLOB = "0e267c9603906b85dc2688379400ab41cd65df8a"
INSTALLER_LOCK_BLOB = "486a6f6e1e2c594e60d6f9fe3fa32b03175630ae"
PREDECESSOR_HEAD = "86e2e5c92f87a74985e4f96617b4d013c252e237"
PREDECESSOR_BLOB = "1bbe19704a3d1f89b8fe1bfc3759e202ba85594c"
FOCUSED_RUN = 40079868431
FOCUSED_JOB = 120830989728
OPERATOR_REVIEW = 5638151673
CODEX_COMMENT = 6382080747
CODEX_AUTHOR = "chatgpt-codex-connector[bot]"
LOCK_ID = "voidbuycustodyfirstentrylock2_" + SOURCE_BLOB


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
source_raw = read_exact(SOURCE, SOURCE_BLOB)
read_exact(SOURCE_PROOF, SOURCE_PROOF_BLOB)
read_exact(SOURCE_DOC, SOURCE_DOC_BLOB)
read_exact(SOURCE_WORKFLOW, SOURCE_WORKFLOW_BLOB)
installer_lock_raw = read_exact(INSTALLER_LOCK, INSTALLER_LOCK_BLOB)

if len(sys.argv) != 3 or sys.argv[1] != "--hosted-evidence":
    raise SystemExit("hosted_evidence_receipt_required")

hosted = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert hosted == {
    "schema": "void_buy_void_first_entry_v2_hosted_evidence_v1",
    "repository": "6ZoSo9/void-node",
    "run_id": FOCUSED_RUN,
    "run_head_sha": SOURCE_HEAD,
    "run_workflow_path": (
        ".github/workflows/"
        "buy-void-allocation-custody-runtime-v3-installer-first-entry-source-v2.yml"
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
    "operator_review_commit": SOURCE_HEAD,
    "operator_review_author": "6ZoSo9",
    "operator_review_state": "COMMENTED",
    "operator_review_independent": False,
    "codex_comment_id": CODEX_COMMENT,
    "codex_comment_author": CODEX_AUTHOR,
    "codex_review_commit": SOURCE_HEAD,
    "codex_has_findings": False,
    "codex_has_unresolved_findings": False,
    "codex_status": "completed",
    "authenticated_via_github_api": True,
}

assert len(source_raw) == SOURCE_BYTES
assert sha256(source_raw) == SOURCE_SHA256
assert source_raw.isascii()

lock = json.loads(lock_raw.decode("utf-8"))
assert lock["schema"] == (
    "void_buy_void_custody_runtime_v3_installer_first_entry_lock_v2"
)
assert lock["marker"] == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALLER_FIRST_ENTRY_LOCK_V2"
)
assert lock["version"] == 2
assert lock["repository"] == "6ZoSo9/void-node"
assert lock["parent_first_entry_head"] == SOURCE_HEAD
assert lock["parent_installer_lock_head"] == INSTALLER_LOCK_HEAD
assert lock["lock_id"] == LOCK_ID

evidence = lock["first_entry_source_evidence"]
assert evidence == {
    "source_path": (
        "native/"
        "void_buy_allocation_custody_runtime_v3_installer_first_entry_source_v2.c"
    ),
    "source_git_blob_sha1": SOURCE_BLOB,
    "source_bytes": SOURCE_BYTES,
    "source_sha256": SOURCE_SHA256,
    "proof_path": (
        "scripts/"
        "prove_void_buy_allocation_custody_runtime_v3_installer_first_entry_source_v2.py"
    ),
    "proof_git_blob_sha1": SOURCE_PROOF_BLOB,
    "document_path": (
        "docs/operators/"
        "buy-void-allocation-custody-runtime-v3-installer-first-entry-source-v2.md"
    ),
    "document_git_blob_sha1": SOURCE_DOC_BLOB,
    "workflow_path": (
        ".github/workflows/"
        "buy-void-allocation-custody-runtime-v3-installer-first-entry-source-v2.yml"
    ),
    "workflow_git_blob_sha1": SOURCE_WORKFLOW_BLOB,
    "focused_workflow_run": FOCUSED_RUN,
    "focused_job_id": FOCUSED_JOB,
    "operator_review_id": OPERATOR_REVIEW,
    "operator_review_expected_commit": SOURCE_HEAD,
    "operator_review_independent": False,
    "independent_codex_comment_id": CODEX_COMMENT,
    "independent_codex_expected_author": CODEX_AUTHOR,
    "independent_codex_expected_commit": SOURCE_HEAD,
    "hosted_metadata_authentication_required": True,
}

assert lock["accepted_installer_lock_evidence"] == {
    "path": (
        "ops/security/"
        "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v2.json"
    ),
    "git_blob_sha1": INSTALLER_LOCK_BLOB,
    "candidate_installer_source_accepted": True,
    "protected_install_authorized": False,
    "protected_source_installed": False,
}
assert lock["predecessor_first_entry_evidence"] == {
    "historical_head": PREDECESSOR_HEAD,
    "source_path": (
        "native/"
        "void_buy_allocation_custody_runtime_v3_installer_first_entry_source_v1.c"
    ),
    "source_git_blob_sha1": PREDECESSOR_BLOB,
    "historical_bytes_reused_as_v2": False,
}

for key in (
    "first_entry_native_source_accepted",
    "descriptor_bound_source_capture_accepted",
    "source_fifo_nonblocking_rejection_accepted",
    "captured_source_compile_binding_accepted",
    "predecessor_lineage_bound",
    "accepted_installer_lock_v2_bound",
):
    assert lock[key] is True, key

for key in (
    "python_runtime_identity_selected",
    "first_entry_candidate_derived",
    "first_entry_candidate_accepted",
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

installer_lock = json.loads(installer_lock_raw.decode("utf-8"))
assert installer_lock["marker"] == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V2"
)
assert installer_lock["candidate_installer_source_accepted"] is True
assert installer_lock["protected_installer_first_entry_installed"] is False
assert installer_lock["protected_install_authorized"] is False
assert installer_lock["protected_source_installed"] is False
assert installer_lock["replacement_apply_authorized"] is False
assert installer_lock["funds_movement"] is False

source = source_raw.decode("ascii")
for required in (
    '#define VOID_OPERATION "--install-accepted-protected-census-source"',
    '"INSTALL_ACCEPTED_VOID_CUSTODY_PROTECTED_PROCREF_SOURCE_V2_CREATE_ONLY"',
    "static int open_leaf_nofollow_nonblocking(const char *path)",
    "O_RDONLY|O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC",
    "static int open_verified_regular(",
    "path_fd = open_leaf_nofollow_nonblocking(VOID_FIRST_ENTRY_BIN);",
    "n['install_accepted_source_create_only_after_protected_first_entry']()",
    "close_untrusted_descriptors();",
    "prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)",
    "fexecve(VOID_PYTHON_FD, child_argv, child_env)",
):
    assert required in source, required

for forbidden in (
    "rename(",
    "renameat(",
    "renameat2(",
    "unlink(",
    "unlinkat(",
    "chmod(",
    "fchmod(",
    "chown(",
    "fchown(",
    "system(",
    "popen(",
):
    assert forbidden not in source, forbidden

print(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "INSTALLER_FIRST_ENTRY_LOCK_V2_PROOF_GREEN"
)
print("lock_exact=true")
print("first_entry_source_exact=true")
print("first_entry_source_ascii_only=true")
print("first_entry_source_bytes=20952")
print("first_entry_source_sha256=" + SOURCE_SHA256)
print("hosted_metadata_authenticated=true")
print("focused_source_run_bound=true")
print("focused_source_job_bound=true")
print("operator_review_same_account_only=true")
print("independent_codex_review_bound=true")
print("accepted_installer_lock_v2_bound=true")
print("predecessor_first_entry_lineage_bound=true")
print("descriptor_bound_source_capture_accepted=true")
print("source_fifo_nonblocking_rejection_accepted=true")
print("captured_source_compile_binding_accepted=true")
print("native_publication_primitives_absent=true")
print("first_entry_native_source_accepted=true")
print("python_runtime_identity_selected=false")
print("first_entry_candidate_derived=false")
print("first_entry_candidate_accepted=false")
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
