#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
PARENT_HEAD = "105b9417d4a89a6a461554f6e2fd785cc5907401"

ARCHIVE_TOOL = "tools/void-buy-allocation-custody-runtime-install-archive-v3.py"
ARCHIVE_TOOL_BLOB = "2d46a4aa08599552f47c28ab6954f31a9d5669ea"
ARCHIVE_PROOF = "scripts/prove_void_buy_allocation_custody_runtime_install_archive_v3.py"
ARCHIVE_PROOF_BLOB = "eb656dc44e8f67e0fdbaf230941b300e037283e7"
ARCHIVE_DOC = "docs/architecture/buy-void-allocation-custody-runtime-install-archive-v3.md"
ARCHIVE_DOC_BLOB = "2dd46d7577624ce4b318296437860807d8f84c76"
ARCHIVE_WORKFLOW = ".github/workflows/buy-void-allocation-custody-runtime-install-archive-v3.yml"
ARCHIVE_WORKFLOW_BLOB = "781c472ad9db73c28870a685fe952066d0ffe8e1"
BUNDLE_LOCK = "ops/security/buy-void-allocation-custody-runtime-bundle-lock-v3.json"
BUNDLE_LOCK_BLOB = "9e371ebc4ba1dcf494e55823eddb8a183c31d69f"

LOCK = "ops/security/buy-void-allocation-custody-runtime-install-archive-lock-v3.json"
SELF = "scripts/prove_void_buy_allocation_custody_runtime_install_archive_lock_v3.py"
DOC = "docs/architecture/buy-void-allocation-custody-runtime-install-archive-lock-v3.md"
WORKFLOW = ".github/workflows/buy-void-allocation-custody-runtime-install-archive-lock-v3.yml"

ARCHIVE_ID = (
    "voidbuycustodyarchive3_"
    "0b1c997cb4649be6b6eaf161712230ad3ee1a0b69720133d3adc4875bae322cb"
)
ARCHIVE_BYTES = 266240
ARCHIVE_SHA256 = "5c77db938bcfd353e72628088f1e02c4b22d73814cbae555b9c13ce3ba3a95d1"
HOSTED_RUN = 39941043471
CROSS_NODE_JOB = 120372580801
ARTIFACTS = {22: 12496465410, 24: 12495941936, 26: 12496271348}
EXPECTED_DELTA = sorted([DOC, LOCK, SELF, WORKFLOW])

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_install_archive_v3",
    ROOT / ARCHIVE_TOOL,
)
assert spec is not None and spec.loader is not None
archive_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive_module)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    prefix = b"blob " + str(len(data)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + data).hexdigest()


def git(args: list[str]) -> str:
    return subprocess.run(
        ["/usr/bin/git", "--no-replace-objects", "-C", str(ROOT), *args],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
        },
    ).stdout.strip()


def read(relative: str, maximum: int = 2 * 1024 * 1024) -> bytes:
    return archive_module.read_bound_regular(ROOT / relative, maximum)


def verify_branch() -> None:
    git(["cat-file", "-e", PARENT_HEAD + "^{commit}"])
    git(["merge-base", "--is-ancestor", PARENT_HEAD, "HEAD"])

    exact_parent = {
        ARCHIVE_TOOL: ARCHIVE_TOOL_BLOB,
        ARCHIVE_PROOF: ARCHIVE_PROOF_BLOB,
        ARCHIVE_DOC: ARCHIVE_DOC_BLOB,
        ARCHIVE_WORKFLOW: ARCHIVE_WORKFLOW_BLOB,
        BUNDLE_LOCK: BUNDLE_LOCK_BLOB,
    }
    for relative, expected in exact_parent.items():
        actual = git(["rev-parse", "HEAD:" + relative])
        assert actual == expected, ("parent_source_blob_drift", relative, actual, expected)
        assert git_blob(read(relative)) == expected, ("readback_blob_drift", relative)

    changed = sorted(
        line for line in git(["diff", "--name-only", PARENT_HEAD, "HEAD", "--"]).splitlines()
        if line
    )
    assert changed == EXPECTED_DELTA, ("archive_lock_scope_drift", changed)

    status = sorted(
        line for line in git(["diff", "--name-status", PARENT_HEAD, "HEAD", "--"]).splitlines()
        if line
    )
    expected_status = sorted("A\t" + relative for relative in EXPECTED_DELTA)
    assert status == expected_status, ("archive_lock_delta_not_add_only", status)

    git(["diff", "--check", PARENT_HEAD, "HEAD", "--"])


def derive_archive() -> bytes:
    raw, record = archive_module.source_archive()
    assert record["marker"] == archive_module.MARKER
    assert record["schema"] == archive_module.SCHEMA
    assert record["version"] == 3
    assert record["archive_candidate_id"] == ARCHIVE_ID
    assert len(raw) == ARCHIVE_BYTES
    assert sha256(raw) == ARCHIVE_SHA256

    inspected = archive_module.inspect_archive_bytes(raw)
    assert inspected["archive_candidate_id"] == ARCHIVE_ID
    assert inspected["archive_bytes"] == ARCHIVE_BYTES
    assert inspected["archive_sha256"] == ARCHIVE_SHA256
    assert inspected["runtime_files_exact"] == 10
    assert inspected["archive_candidate_accepted"] is False
    assert inspected["immutable_root_install"] is False
    assert inspected["install_target_selected"] is False
    assert inspected["existing_target_replaced"] is False
    assert inspected["node_binary_identity_verified"] is False
    assert inspected["runtime_integration"] is False
    assert inspected["payment_acceptance"] is False
    assert inspected["public_presale_activation"] is False
    assert inspected["production_gate_ready"] is False
    assert inspected["funds_movement"] is False
    return raw


def expected_lock() -> dict[str, Any]:
    return {
        "schema": "void_buy_void_custody_runtime_install_archive_lock_v3",
        "marker": "VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_LOCK_V3",
        "version": 3,
        "repository": "6ZoSo9/void-node",
        "archive_source_head": PARENT_HEAD,
        "archive_hosted_evidence": {
            "workflow_run": HOSTED_RUN,
            "node22_artifact_id": ARTIFACTS[22],
            "node24_artifact_id": ARTIFACTS[24],
            "node26_artifact_id": ARTIFACTS[26],
            "cross_node_compare_job_id": CROSS_NODE_JOB,
            "cross_node_byte_identity_verified": True,
        },
        "archive_evidence": {
            "archive_candidate_id": ARCHIVE_ID,
            "bytes": ARCHIVE_BYTES,
            "sha256": ARCHIVE_SHA256,
            "derivation_tool_path": ARCHIVE_TOOL,
            "derivation_tool_git_blob_sha1": ARCHIVE_TOOL_BLOB,
            "archive_proof_path": ARCHIVE_PROOF,
            "archive_proof_git_blob_sha1": ARCHIVE_PROOF_BLOB,
            "archive_document_path": ARCHIVE_DOC,
            "archive_document_git_blob_sha1": ARCHIVE_DOC_BLOB,
            "archive_workflow_path": ARCHIVE_WORKFLOW,
            "archive_workflow_git_blob_sha1": ARCHIVE_WORKFLOW_BLOB,
            "accepted_runtime_bundle_lock_path": BUNDLE_LOCK,
            "accepted_runtime_bundle_lock_git_blob_sha1": BUNDLE_LOCK_BLOB,
            "runtime_files_exact": 10,
            "deterministic_ustar": True,
            "unnamed_tmpfile_staging": True,
            "atomic_create_only_link_publication": True,
            "failure_cleanup_unlink_not_used": True,
        },
        "archive_candidate_accepted": True,
        "immutable_root_install": False,
        "install_target_selected": False,
        "existing_target_replaced": False,
        "node_binary_identity_verified": False,
        "request_root_selected": False,
        "shared_directory_selected": False,
        "service_unit_installed": False,
        "service_started": False,
        "service_restarted": False,
        "runtime_integration": False,
        "reserve_method_enabled": False,
        "recover_method_enabled": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "production_gate_ready": False,
        "funds_movement": False,
    }


def verify() -> bytes:
    verify_branch()
    derive_archive()
    expected = (
        json.dumps(expected_lock(), indent=2, ensure_ascii=True) + "\n"
    ).encode("utf-8")
    actual = read(LOCK, 128 * 1024)
    assert actual == expected, "archive_acceptance_lock_not_exact"
    return expected


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=False)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--derive", action="store_true")
    args = parser.parse_args(argv)

    lock_bytes = verify()
    if args.derive:
        sys.stdout.buffer.write(lock_bytes)
        return 0

    print("VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_LOCK_V3_GREEN")
    print("archive_candidate_id=" + ARCHIVE_ID)
    print("archive_bytes=" + str(ARCHIVE_BYTES))
    print("archive_sha256=" + ARCHIVE_SHA256)
    print("hosted_run=" + str(HOSTED_RUN))
    print("cross_node_compare_job=" + str(CROSS_NODE_JOB))
    print("archive_candidate_accepted=true")
    print("runtime_files_exact=10")
    print("deterministic_ustar=true")
    print("unnamed_tmpfile_staging=true")
    print("atomic_create_only_link_publication=true")
    print("failure_cleanup_unlink_not_used=true")
    print("immutable_root_install=false")
    print("install_target_selected=false")
    print("existing_target_replaced=false")
    print("node_binary_identity_verified=false")
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("production_gate_ready=false")
    print("funds_movement=false")
    print("lock_sha256=" + sha256(lock_bytes))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
