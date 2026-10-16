#!/usr/bin/env python3
from __future__ import annotations

import ast
import os
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = "ops/precision/void_buy_void_user_manager_credential_query_protected_replace_v2.py"
LOCK = "ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json"

EXPECTED = {
    SOURCE: "f7357202b4401d76a056462c646099c5fc82d62c",
    LOCK: "b73415ce8fc95ff2d49cbde97a15d701ad5b7937",
}


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
        },
        timeout=120,
        check=True,
    )


def git_blob(path: str) -> str:
    return run(
        "/usr/bin/git",
        "--no-replace-objects",
        "-C",
        str(ROOT),
        "rev-parse",
        "HEAD:" + path,
    ).stdout.strip()


for path, expected in EXPECTED.items():
    assert git_blob(path) == expected, "blob_drift:" + path

source = (ROOT / SOURCE).read_text(encoding="utf-8")
tree = ast.parse(source, filename=SOURCE)

imports = {
    node.names[0].name
    for node in ast.walk(tree)
    if isinstance(node, ast.Import) and node.names
}
from_imports = {
    node.module or ""
    for node in ast.walk(tree)
    if isinstance(node, ast.ImportFrom)
}
assert "subprocess" not in imports
assert "subprocess" not in from_imports

for needle in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V2",
    "voidbuyumqcredelflock2_",
    "c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54",
    "67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c",
    "7b968a20f1507215477f43a59c5d82b9e9adca918ce5f2df566292d8380b4cb1",
    "af02d006176db1a16eee52625751736c63af3bd1b250b46f81f200359fb48718",
    "CREDENTIAL_QUERY_V1_GREEN_READY_FOR_V2",
    "CREDENTIAL_QUERY_V2_GREEN_WITH_V1_PREDECESSOR",
    "ATOMIC_EXCHANGE_ACCEPTED_CREDENTIAL_QUERY_V1_TO_V2",
    "ATOMIC_EXCHANGE_ROLLBACK_CREDENTIAL_QUERY_V2_TO_V1",
    "RENAME_EXCHANGE",
    "RENAME_NOREPLACE",
    "STAGED_STATE",
    "EXCHANGED_STATE",
    "ROLLBACK_PENDING_STATE",
    "_open_locked_install_root",
    "replacement_operation_in_progress",
    "_unlink_owned_name",
    "created_stage_identity",
    "foreign_stage_cleanup_rejected=true",
    "current_invocation_stage_inode_bound=true",
    "operation_directory_lock_required=true",
    "crash_state_classifier_complete=true",
    "apply_crash_resume_supported=true",
    "rollback_crash_resume_supported=true",
    "v1_predecessor_retained=true",
    "query_execution=false",
    "credential_contents_read=false",
):
    assert needle in source, needle

for forbidden in (
    "systemctl",
    "service restart",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "private_key",
    "wallet",
):
    assert forbidden not in source, forbidden

self_test = run(
    "/usr/bin/python3", "-I", "-B", str(ROOT / SOURCE), "--self-test"
).stdout
for line in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V2_SELF_TEST_GREEN",
    "renameat2_exchange_available=true",
    "preexec_replacement=false",
    "v1_predecessor_preserved_after_success=true",
    "automatic_failure_rollback=true",
    "foreign_stage_cleanup_rejected=true",
    "current_invocation_stage_inode_bound=true",
    "operation_directory_lock_required=true",
    "crash_state_classifier_complete=true",
    "apply_crash_resume_supported=true",
    "rollback_crash_resume_supported=true",
    "query_execution=false",
    "credential_contents_read=false",
):
    assert line in self_test.splitlines(), line

source_plan = run(
    "/usr/bin/python3", "-I", "-B", str(ROOT / SOURCE), "--source-plan"
).stdout
for line in (
    "accepted_lock_id=voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "preexec_replacement=false",
    "v1_predecessor_preserved_after_success=true",
    "query_atomic_exchange_required=true",
    "operation_directory_lock_required=true",
    "crash_state_classification_required=true",
    "apply_crash_resume_supported=true",
    "rollback_crash_resume_supported=true",
    "query_execution=false",
    "credential_contents_read=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "transaction=false",
    "funds_movement=false",
):
    assert line in source_plan.splitlines(), line

print("VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V2_PROOF_GREEN")
print("source_blob=f7357202b4401d76a056462c646099c5fc82d62c")
print("accepted_lock_blob=b73415ce8fc95ff2d49cbde97a15d701ad5b7937")
print("accepted_lock_id=voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54")
print("preexec_replacement=false")
print("v1_predecessor_preserved_after_success=true")
print("query_atomic_exchange_required=true")
print("automatic_failure_rollback=true")
print("foreign_stage_cleanup_rejected=true")
print("current_invocation_stage_inode_bound=true")
print("operation_directory_lock_required=true")
print("crash_state_classifier_complete=true")
print("apply_crash_resume_supported=true")
print("rollback_crash_resume_supported=true")
print("query_execution=false")
print("credential_contents_read=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("transaction=false")
print("funds_movement=false")
