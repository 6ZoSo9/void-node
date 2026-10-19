#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json"
)
LOCK = ROOT / LOCK_REL
LOCK_BASE = "9eebcd1bb15ea0b853c3c7cfe0ffd8dd60030a30"
CANDIDATE_MERGE = LOCK_BASE
CANDIDATE_TREE = "edff3fcf5b23763c6afe86ba3eb6ba1c92a79bee"
EXPECTED_LOCK_ID = (
    "voidbuye2dormantfirstentrylock1_"
    "bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85"
)
EXPECTED_LOCK_BLOB = "f8ff6fbb855aecafc329cd60622cf3af782745a3"

CANDIDATE_REL = (
    "scripts/"
    "prove_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_v1.py"
)
CANDIDATE_WORKFLOW_REL = (
    ".github/workflows/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-v1.yml"
)
CANDIDATE_DOC_REL = (
    "docs/operators/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-v1.md"
)

EXPECTED_REPORT_BYTES = 5400
EXPECTED_REPORT_SHA256 = (
    "a345e861b81cd19288b71122bd353a1d586d070febfc87933ed8181c0d3abebe"
)
EXPECTED_REPORT_GIT_BLOB_SHA1 = "3a2fe37452a35621d738713b5e4b51391f5c4400"
EXPECTED_CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand1_"
    "b7109c847373114e2d5e044928ecc4e30c65ef446880d70d9ec57d5853ad3736"
)
EXPECTED_BINARY_SHA256 = (
    "4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a"
)
EXPECTED_BINARY_BYTES = 731072
EXPECTED_BINARY_GIT_BLOB_SHA1 = "eb66ce5313a8c0b01639ebec79564111d55163c4"

EXPECTED_BLOBS = {
    CANDIDATE_REL: "1d15fccf256571c382a09d99c8545d5b24ad2077",
    CANDIDATE_WORKFLOW_REL: "852d2ce248003eca2092f63504ece9c6918e42d1",
    CANDIDATE_DOC_REL: "34d161aeb851982e52d026f4e96026a6f50d02e1",
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1.c":
        "5f1195d0c0a328be4334ad5b7f6e32b150776cab",
    "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py":
        "f3d6b1559be7490303cf36338c4bfa38fdaa390a",
    "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json":
        "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1",
    "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v2.py":
        "f97cb8aff642f2f3e138fe8e087eece22223b934",
}

EXPECTED_SCOPE = tuple(sorted((
    ".github/workflows/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.yml",
    "docs/operators/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.md",
    LOCK_REL,
    "scripts/"
    "prove_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_lock_v1.py",
)))

ENV = {
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
}


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("utf-8")


def run(
    argv: list[str],
    *,
    cwd: Path = ROOT,
    timeout: int = 300,
) -> subprocess.CompletedProcess:
    cp = subprocess.run(
        argv,
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=ENV,
        check=False,
        timeout=timeout,
    )
    if cp.returncode != 0:
        raise AssertionError(
            "command_failed:"
            + repr(argv)
            + ":"
            + cp.stderr.decode("utf-8", "replace")[-5000:]
        )
    return cp


def git(args: list[str], *, cwd: Path = ROOT) -> str:
    return run(
        ["/usr/bin/git", "--no-replace-objects", "-C", os.fspath(cwd), *args],
        cwd=cwd,
        timeout=60,
    ).stdout.decode("utf-8", "strict").strip()


def direct_file(path: Path, maximum: int) -> bytes:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise AssertionError("file_metadata_invalid:" + str(path))
    raw = path.read_bytes()
    after = path.lstat()
    for field in (
        "st_dev",
        "st_ino",
        "st_mode",
        "st_uid",
        "st_gid",
        "st_nlink",
        "st_size",
        "st_mtime_ns",
        "st_ctime_ns",
    ):
        if getattr(before, field) != getattr(after, field):
            raise AssertionError("file_changed:" + str(path) + ":" + field)
    if len(raw) != before.st_size:
        raise AssertionError("file_read_drift:" + str(path))
    return raw


def verify_repository() -> None:
    git(["merge-base", "--is-ancestor", LOCK_BASE, "HEAD"])
    if git(["rev-parse", CANDIDATE_MERGE + "^{tree}"]) != CANDIDATE_TREE:
        raise AssertionError("candidate_tree_drift")

    for relative, expected in EXPECTED_BLOBS.items():
        actual = git(["rev-parse", CANDIDATE_MERGE + ":" + relative])
        if actual != expected:
            raise AssertionError("candidate_dependency_blob_drift:" + relative)
        head_actual = git(["rev-parse", "HEAD:" + relative])
        if head_actual != expected:
            raise AssertionError("lock_branch_dependency_blob_drift:" + relative)

    changed = tuple(sorted(
        line
        for line in git(["diff", "--name-only", LOCK_BASE, "HEAD", "--"]).splitlines()
        if line
    ))
    if changed != EXPECTED_SCOPE:
        raise AssertionError(
            "lock_branch_scope_drift:"
            + json.dumps(changed, separators=(",", ":"))
        )
    if git(["status", "--porcelain=v1", "--untracked-files=all"]) != "":
        raise AssertionError("worktree_dirty")


def expected_body() -> dict:
    return {
        "schema":
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_lock_v1",
        "marker":
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CANDIDATE_LOCK_V1",
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "candidate_merge": CANDIDATE_MERGE,
        "candidate_tree": CANDIDATE_TREE,
        "candidate_hosted_evidence": {
            "workflow_run": 38976884616,
            "source_proof_job": 117228356239,
            "derive_job_a": 117228465638,
            "derive_job_b": 117228465478,
            "derive_job_c": 117228465525,
            "artifact_a": 12078904521,
            "artifact_b": 12079600783,
            "artifact_c": 12079510968,
            "compare_job": 117228626981,
            "three_report_byte_identity_verified": True,
            "three_binary_byte_identity_verified": True,
            "independent_rederivation_verified": True,
        },
        "candidate_report": {
            "bytes": EXPECTED_REPORT_BYTES,
            "sha256": EXPECTED_REPORT_SHA256,
            "git_blob_sha1": EXPECTED_REPORT_GIT_BLOB_SHA1,
            "candidate_id": EXPECTED_CANDIDATE_ID,
            "candidate_script_git_blob_sha1": EXPECTED_BLOBS[CANDIDATE_REL],
            "candidate_workflow_git_blob_sha1":
                EXPECTED_BLOBS[CANDIDATE_WORKFLOW_REL],
            "candidate_doc_git_blob_sha1": EXPECTED_BLOBS[CANDIDATE_DOC_REL],
            "repository_head": CANDIDATE_MERGE,
            "repository_tree": CANDIDATE_TREE,
            "launcher_source_git_blob_sha1": EXPECTED_BLOBS[
                "ops/precision/"
                "void_buy_void_epoch2_dormant_binder_installer_first_entry_v1.c"
            ],
            "launcher_source_sha256":
                "d5dd4d9fefd2522e0c917824bc3bd53189c63481d7502ff6c532e67d149983fc",
            "installer_source_git_blob_sha1": EXPECTED_BLOBS[
                "ops/precision/"
                "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
            ],
            "installer_source_sha256":
                "602d7fbc256d346b3f80adc93e3b20a39403be5158e944e23456851764a954b9",
            "installer_source_bytes": 57255,
            "accepted_native_lock_id":
                "voidbuye2dormantbinderlock3_"
                "a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a",
            "accepted_native_lock_git_blob_sha1": EXPECTED_BLOBS[
                "ops/security/"
                "buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
            ],
            "accepted_native_candidate_id":
                "voidbuye2dormantbindercand2_"
                "8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d",
            "accepted_native_binary_sha256":
                "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c",
            "accepted_native_binary_bytes": 726976,
            "compile_bound_expected_head": CANDIDATE_MERGE,
            "compile_bound_confirmation":
                "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY",
            "launcher_binary_sha256": EXPECTED_BINARY_SHA256,
            "launcher_binary_bytes": EXPECTED_BINARY_BYTES,
            "launcher_binary_git_blob_sha1": EXPECTED_BINARY_GIT_BLOB_SHA1,
            "two_builds_byte_identical": True,
            "static_no_interp": True,
            "dynamic_needed_absent": True,
            "self_test_green": True,
            "sealed_launcher_source_snapshot": True,
            "toolchain_revalidated_after_build": True,
            "semantic_report_validation_fail_closed": True,
        },
        "candidate_accepted": True,
        "launcher_binary_identity_accepted": True,
        "protected_install_authorized": False,
        "precision_install_authorized": False,
        "native_or_binder_live_execution_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False,
        "treasury_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
        "production_host_evidence_authority": False,
        "next_gate":
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1",
    }


def verify_committed_lock() -> None:
    raw = direct_file(LOCK, 128 * 1024)
    if git_blob_sha1(raw) != EXPECTED_LOCK_BLOB:
        raise AssertionError("committed_lock_blob_mismatch")
    value = json.loads(raw)
    body = expected_body()
    derived = (
        "voidbuye2dormantfirstentrylock1_"
        + sha256(canonical(body))
    )
    if derived != EXPECTED_LOCK_ID:
        raise AssertionError("expected_lock_id_internal_mismatch")
    if value != {**body, "lock_id": derived}:
        raise AssertionError("committed_lock_content_mismatch")


def rederive_candidate_at_merge() -> None:
    with tempfile.TemporaryDirectory(prefix="void-e2-first-entry-lock-v1-") as td:
        temp = Path(td)
        worktree = temp / "candidate-worktree"
        out = temp / "candidate-output"
        added = False
        try:
            run(
                [
                    "/usr/bin/git",
                    "--no-replace-objects",
                    "-C",
                    os.fspath(ROOT),
                    "worktree",
                    "add",
                    "--detach",
                    os.fspath(worktree),
                    CANDIDATE_MERGE,
                ],
                timeout=60,
            )
            added = True
            candidate = worktree / CANDIDATE_REL
            run(
                [
                    "/usr/bin/python3",
                    "-I",
                    "-B",
                    os.fspath(candidate),
                    "--derive-dir",
                    os.fspath(out),
                ],
                cwd=worktree,
                timeout=300,
            )
            report = direct_file(out / "candidate-v1.json", 128 * 1024)
            binary = direct_file(out / "installer-first-entry-v1", 2 * 1024 * 1024)

            if len(report) != EXPECTED_REPORT_BYTES:
                raise AssertionError("candidate_report_bytes_mismatch")
            if sha256(report) != EXPECTED_REPORT_SHA256:
                raise AssertionError("candidate_report_sha256_mismatch")
            if git_blob_sha1(report) != EXPECTED_REPORT_GIT_BLOB_SHA1:
                raise AssertionError("candidate_report_git_blob_mismatch")
            if len(binary) != EXPECTED_BINARY_BYTES:
                raise AssertionError("candidate_binary_bytes_mismatch")
            if sha256(binary) != EXPECTED_BINARY_SHA256:
                raise AssertionError("candidate_binary_sha256_mismatch")
            if git_blob_sha1(binary) != EXPECTED_BINARY_GIT_BLOB_SHA1:
                raise AssertionError("candidate_binary_git_blob_mismatch")

            value = json.loads(report)
            if value.get("candidate_id") != EXPECTED_CANDIDATE_ID:
                raise AssertionError("candidate_id_mismatch")
            if value.get("repository_head") != CANDIDATE_MERGE:
                raise AssertionError("candidate_head_mismatch")
            if value.get("repository_tree") != CANDIDATE_TREE:
                raise AssertionError("candidate_tree_mismatch")
            authority = value.get("authority")
            if not isinstance(authority, dict):
                raise AssertionError("candidate_authority_missing")
            if authority.get("source_only_candidate") is not True:
                raise AssertionError("candidate_source_only_truth_missing")
            if authority.get("candidate_report_filesystem_write") is not True:
                raise AssertionError("candidate_report_write_truth_missing")
            for key, flag in authority.items():
                if key in (
                    "source_only_candidate",
                    "candidate_report_filesystem_write",
                ):
                    continue
                if flag is not False:
                    raise AssertionError("candidate_authority_overclaim:" + key)
        finally:
            if added:
                subprocess.run(
                    [
                        "/usr/bin/git",
                        "--no-replace-objects",
                        "-C",
                        os.fspath(ROOT),
                        "worktree",
                        "remove",
                        "--force",
                        os.fspath(worktree),
                    ],
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    env=ENV,
                    check=False,
                    timeout=60,
                )


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    verify_repository()
    verify_committed_lock()
    rederive_candidate_at_merge()

    print(
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_"
        "INSTALLER_FIRST_ENTRY_CANDIDATE_LOCK_V1_GREEN"
    )
    print("lock_id=" + EXPECTED_LOCK_ID)
    print("candidate_merge=" + CANDIDATE_MERGE)
    print("candidate_tree=" + CANDIDATE_TREE)
    print("candidate_report_sha256=" + EXPECTED_REPORT_SHA256)
    print("candidate_report_git_blob_sha1=" + EXPECTED_REPORT_GIT_BLOB_SHA1)
    print("candidate_id=" + EXPECTED_CANDIDATE_ID)
    print("launcher_binary_sha256=" + EXPECTED_BINARY_SHA256)
    print("launcher_binary_bytes=" + str(EXPECTED_BINARY_BYTES))
    print("launcher_binary_git_blob_sha1=" + EXPECTED_BINARY_GIT_BLOB_SHA1)
    print("candidate_merge_rederived=true")
    print("hosted_three_report_identity_bound=true")
    print("hosted_three_binary_identity_bound=true")
    print("hosted_independent_rederivation_bound=true")
    print("accepted_native_lock_v3_bound=true")
    print("compile_bound_expected_head=true")
    print("compile_bound_confirmation=true")
    print("candidate_accepted=true")
    print("launcher_binary_identity_accepted=true")
    print("protected_install_authorized=false")
    print("precision_install_authorized=false")
    print("native_or_binder_live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement_authorized=false")
    print("production_host_evidence_authority=false")
    print(
        "next_gate="
        "void_buy_void_epoch2_dormant_binder_"
        "installer_first_entry_protected_install_v1"
    )


if __name__ == "__main__":
    main()
