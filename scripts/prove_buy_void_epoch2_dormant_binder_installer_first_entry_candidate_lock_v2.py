#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
    "CANDIDATE_LOCK_V2"
)
LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-"
    "candidate-lock-v2.json"
)
LOCK_BLOB = "227c2fa449abf1387925373c706ecd07775d5898"
LOCK_ID = (
    "voidbuye2dormantfirstentrylock2_"
    "89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543"
)

CANDIDATE_MERGE = "3a38da1e53ac52374aae4182d24ad4c245dfe504"
CANDIDATE_TREE = "4a25e5cb001667920b1b5715679c7cce99bd68fe"
LOCK_BASE = "c39cb83038174dc37967b9c29c624a9dcc4e1db7"

CANDIDATE_REL = (
    "scripts/"
    "prove_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_candidate_v2.py"
)
CANDIDATE_BLOB = "de2f487c625cf96c812cb6d4246d3d036a589e89"
CANDIDATE_WORKFLOW_REL = (
    ".github/workflows/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-v2.yml"
)
CANDIDATE_WORKFLOW_BLOB = "2bb8366afa1305fbd058745feb27941dafa0e055"
CANDIDATE_DOC_REL = (
    "docs/operators/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-v2.md"
)
CANDIDATE_DOC_BLOB = "630f8b770e34dced3d7b341a85a33f6313a9bcba"

LAUNCHER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_v2.c"
)
LAUNCHER_BLOB = "86dc09e52402c04fb6e4b30a7fcf695833808ca3"
LAUNCHER_PROOF_REL = (
    "scripts/"
    "prove_buy_void_epoch2_dormant_binder_installer_first_entry_v2.py"
)
LAUNCHER_PROOF_BLOB = "a6574e2d52f267d4a595c8cad0004d4797fd6f93"
LAUNCHER_WORKFLOW_REL = (
    ".github/workflows/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-v2.yml"
)
LAUNCHER_WORKFLOW_BLOB = "4169a50df2b278776e046a8516be92aa3e56cdfc"

INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
INSTALLER_BLOB = "f3d6b1559be7490303cf36338c4bfa38fdaa390a"

NATIVE_LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
)
NATIVE_LOCK_BLOB = "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1"
NATIVE_DERIVER_REL = (
    "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v2.py"
)
NATIVE_DERIVER_BLOB = "f97cb8aff642f2f3e138fe8e087eece22223b934"

HISTORICAL_LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-"
    "candidate-lock-v1.json"
)
HISTORICAL_LOCK_BLOB = "f8ff6fbb855aecafc329cd60622cf3af782745a3"
HISTORICAL_LOCK_ID = (
    "voidbuye2dormantfirstentrylock1_"
    "bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85"
)

EXPECTED_REPORT_BYTES = 6131
EXPECTED_REPORT_SHA256 = (
    "2eafc4dc83d7d59fbd5e1d7a7fa809661c72e3387ae83e7f3badae78780da6ac"
)
EXPECTED_REPORT_GIT_BLOB = "ec94d8238028a32dbf8a03ac72fc5ce7120607b7"
EXPECTED_CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand2_"
    "b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b"
)
EXPECTED_BINARY_BYTES = 731_072
EXPECTED_BINARY_SHA256 = (
    "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
)
EXPECTED_BINARY_GIT_BLOB = "798907b18c73ee2cc1dea0fe05b36f27ab4137a7"

EXPECTED_SCOPE = tuple(sorted((
    ".github/workflows/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v2.yml",
    "docs/operators/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v2.md",
    LOCK_REL,
    "scripts/"
    "prove_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_candidate_lock_v2.py"
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

FALSE_AUTHORITY = (
    "protected_install_authorized",
    "precision_install_authorized",
    "native_or_binder_live_execution_authorized",
    "credential_access_authorized",
    "private_key_access_authorized",
    "signing_authorized",
    "transaction_authorized",
    "payment_acceptance_authorized",
    "public_presale_activation_authorized",
    "wc_void_market_activation_authorized",
    "treasury_liquidity_action_authorized",
    "funds_movement_authorized",
    "production_host_evidence_authority",
)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
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
) -> subprocess.CompletedProcess[bytes]:
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


def direct(path: Path, maximum: int) -> bytes:
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
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
        "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
    ):
        if getattr(before, field) != getattr(after, field):
            raise AssertionError("file_changed:" + str(path) + ":" + field)
    if len(raw) != before.st_size:
        raise AssertionError("file_read_drift:" + str(path))
    return raw


def verify_repository() -> None:
    git(["merge-base", "--is-ancestor", CANDIDATE_MERGE, "HEAD"])
    git(["merge-base", "--is-ancestor", LOCK_BASE, "HEAD"])
    if git(["rev-parse", CANDIDATE_MERGE + "^{tree}"]) != CANDIDATE_TREE:
        raise AssertionError("candidate_tree_drift")

    expected_blobs = {
        CANDIDATE_REL: CANDIDATE_BLOB,
        CANDIDATE_WORKFLOW_REL: CANDIDATE_WORKFLOW_BLOB,
        CANDIDATE_DOC_REL: CANDIDATE_DOC_BLOB,
        LAUNCHER_REL: LAUNCHER_BLOB,
        LAUNCHER_PROOF_REL: LAUNCHER_PROOF_BLOB,
        LAUNCHER_WORKFLOW_REL: LAUNCHER_WORKFLOW_BLOB,
        INSTALLER_REL: INSTALLER_BLOB,
        NATIVE_LOCK_REL: NATIVE_LOCK_BLOB,
        NATIVE_DERIVER_REL: NATIVE_DERIVER_BLOB,
        HISTORICAL_LOCK_REL: HISTORICAL_LOCK_BLOB,
    }
    for relative, expected in expected_blobs.items():
        at_merge = git(["rev-parse", CANDIDATE_MERGE + ":" + relative])
        if at_merge != expected:
            raise AssertionError("candidate_dependency_blob_drift:" + relative)
        at_head = git(["rev-parse", "HEAD:" + relative])
        if at_head != expected:
            raise AssertionError("lock_branch_dependency_blob_drift:" + relative)

    changed = tuple(sorted(
        line for line in
        git(["diff", "--name-only", LOCK_BASE, "HEAD", "--"]).splitlines()
        if line
    ))
    if changed != EXPECTED_SCOPE:
        raise AssertionError(
            "lock_branch_scope_drift:"
            + json.dumps(changed, separators=(",", ":"))
        )
    if git(["status", "--porcelain=v1", "--untracked-files=all"]) != "":
        raise AssertionError("worktree_dirty")


def verify_lock() -> dict:
    raw = direct(ROOT / LOCK_REL, 128 * 1024)
    if git_blob(raw) != LOCK_BLOB:
        raise AssertionError("committed_lock_blob_mismatch")
    value = json.loads(raw.decode("utf-8", "strict"))

    if set(value) != {
        "schema", "marker", "version", "repository", "candidate_merge",
        "candidate_tree", "candidate_hosted_evidence", "candidate_report",
        "superseded_v1_lock_id", "superseded_v1_lock_install_authority",
        "candidate_accepted", "launcher_binary_identity_accepted",
        "runtime_head_contract_accepted", "canonical_main_candidate_authority",
        "protected_install_authorized", "precision_install_authorized",
        "native_or_binder_live_execution_authorized",
        "credential_access_authorized", "private_key_access_authorized",
        "signing_authorized", "transaction_authorized",
        "payment_acceptance_authorized",
        "public_presale_activation_authorized",
        "wc_void_market_activation_authorized",
        "treasury_liquidity_action_authorized",
        "funds_movement_authorized", "production_host_evidence_authority",
        "next_gate", "lock_id",
    }:
        raise AssertionError("lock_top_level_keys_invalid")

    required = {
        "schema":
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
            "candidate_lock_v2",
        "marker":
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
            "CANDIDATE_LOCK_V2",
        "version": 2,
        "repository": "6ZoSo9/void-node",
        "candidate_merge": CANDIDATE_MERGE,
        "candidate_tree": CANDIDATE_TREE,
        "superseded_v1_lock_id": HISTORICAL_LOCK_ID,
        "superseded_v1_lock_install_authority": False,
        "candidate_accepted": True,
        "launcher_binary_identity_accepted": True,
        "runtime_head_contract_accepted": True,
        "canonical_main_candidate_authority": True,
        "next_gate":
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
            "materializer_v2",
        "lock_id": LOCK_ID,
    }
    for key, expected in required.items():
        if value.get(key) != expected:
            raise AssertionError("lock_field_mismatch:" + key)
    for key in FALSE_AUTHORITY:
        if value.get(key) is not False:
            raise AssertionError("lock_authority_overclaim:" + key)

    hosted = value.get("candidate_hosted_evidence")
    expected_hosted = {
        "workflow_run": 39040013478,
        "source_proof_job": 117417380031,
        "derive_job_a": 117417454570,
        "derive_job_b": 117417454542,
        "derive_job_c": 117417454444,
        "artifact_a": 12102779578,
        "artifact_b": 12103855658,
        "artifact_c": 12103243146,
        "compare_job": 117417559244,
        "three_report_byte_identity_verified": True,
        "three_binary_byte_identity_verified": True,
        "independent_rederivation_verified": True,
    }
    if hosted != expected_hosted:
        raise AssertionError("hosted_evidence_mismatch")

    report = value.get("candidate_report")
    if not isinstance(report, dict):
        raise AssertionError("candidate_report_missing")
    report_required = {
        "bytes": EXPECTED_REPORT_BYTES,
        "sha256": EXPECTED_REPORT_SHA256,
        "git_blob_sha1": EXPECTED_REPORT_GIT_BLOB,
        "candidate_id": EXPECTED_CANDIDATE_ID,
        "candidate_script_git_blob_sha1": CANDIDATE_BLOB,
        "candidate_workflow_git_blob_sha1": CANDIDATE_WORKFLOW_BLOB,
        "candidate_doc_git_blob_sha1": CANDIDATE_DOC_BLOB,
        "repository_head": CANDIDATE_MERGE,
        "repository_tree": CANDIDATE_TREE,
        "launcher_source_git_blob_sha1": LAUNCHER_BLOB,
        "launcher_source_sha256":
            "46dc71674c115d20e43e56217eeb9f6e9486d143a601cc94347f031b42f827c3",
        "launcher_proof_git_blob_sha1": LAUNCHER_PROOF_BLOB,
        "launcher_workflow_git_blob_sha1": LAUNCHER_WORKFLOW_BLOB,
        "installer_source_git_blob_sha1": INSTALLER_BLOB,
        "installer_source_sha256":
            "602d7fbc256d346b3f80adc93e3b20a39403be5158e944e23456851764a954b9",
        "installer_source_bytes": 57255,
        "accepted_native_lock_id":
            "voidbuye2dormantbinderlock3_"
            "a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a",
        "accepted_native_lock_git_blob_sha1": NATIVE_LOCK_BLOB,
        "accepted_native_candidate_id":
            "voidbuye2dormantbindercand2_"
            "8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d",
        "accepted_native_binary_sha256":
            "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c",
        "accepted_native_binary_bytes": 726976,
        "runtime_expected_head_compile_bound": False,
        "runtime_expected_head_strict_lowercase_hex": True,
        "runtime_expected_head_forwarded_unchanged": True,
        "repository_head_not_embedded_in_launcher": True,
        "frozen_child_launcher_path_compatible": True,
        "compile_bound_confirmation":
            "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY",
        "launcher_binary_sha256": EXPECTED_BINARY_SHA256,
        "launcher_binary_bytes": EXPECTED_BINARY_BYTES,
        "launcher_binary_git_blob_sha1": EXPECTED_BINARY_GIT_BLOB,
        "two_builds_byte_identical": True,
        "static_no_interp": True,
        "dynamic_needed_absent": True,
        "self_test_green": True,
        "sealed_launcher_source_snapshot": True,
        "toolchain_revalidated_after_build": True,
        "semantic_report_validation_fail_closed": True,
    }
    if report != report_required:
        raise AssertionError("candidate_report_projection_mismatch")

    body = dict(value)
    body.pop("lock_id")
    derived = "voidbuye2dormantfirstentrylock2_" + sha256(canonical(body))
    if derived != LOCK_ID:
        raise AssertionError("derived_lock_id_mismatch")

    historical_raw = direct(ROOT / HISTORICAL_LOCK_REL, 128 * 1024)
    if git_blob(historical_raw) != HISTORICAL_LOCK_BLOB:
        raise AssertionError("historical_lock_blob_mismatch")
    historical = json.loads(historical_raw.decode("utf-8", "strict"))
    if historical.get("lock_id") != HISTORICAL_LOCK_ID:
        raise AssertionError("historical_lock_id_mismatch")
    if historical.get("candidate_accepted") is not True:
        raise AssertionError("historical_lock_acceptance_missing")
    for key in FALSE_AUTHORITY:
        if historical.get(key) is not False:
            raise AssertionError("historical_lock_authority_overclaim:" + key)

    return value


def rederive_candidate() -> None:
    with tempfile.TemporaryDirectory(prefix="void-e2-first-entry-lock-v2-") as td:
        root = Path(td)
        worktree = root / "worktree"
        output = root / "out"
        added = False
        try:
            run([
                "/usr/bin/git", "--no-replace-objects", "-C", os.fspath(ROOT),
                "worktree", "add", "--detach", os.fspath(worktree),
                CANDIDATE_MERGE,
            ], timeout=60)
            added = True
            run([
                "/usr/bin/python3", "-I", "-B",
                os.fspath(worktree / CANDIDATE_REL),
                "--derive-dir", os.fspath(output),
            ], cwd=worktree, timeout=300)

            report_raw = direct(output / "candidate-v2.json", 128 * 1024)
            binary = direct(output / "installer-first-entry-v2", 2 * 1024 * 1024)

            if len(report_raw) != EXPECTED_REPORT_BYTES:
                raise AssertionError("candidate_report_bytes_mismatch")
            if sha256(report_raw) != EXPECTED_REPORT_SHA256:
                raise AssertionError("candidate_report_sha256_mismatch")
            if git_blob(report_raw) != EXPECTED_REPORT_GIT_BLOB:
                raise AssertionError("candidate_report_git_blob_mismatch")
            if len(binary) != EXPECTED_BINARY_BYTES:
                raise AssertionError("candidate_binary_bytes_mismatch")
            if sha256(binary) != EXPECTED_BINARY_SHA256:
                raise AssertionError("candidate_binary_sha256_mismatch")
            if git_blob(binary) != EXPECTED_BINARY_GIT_BLOB:
                raise AssertionError("candidate_binary_git_blob_mismatch")

            report = json.loads(report_raw.decode("utf-8", "strict"))
            if report.get("candidate_id") != EXPECTED_CANDIDATE_ID:
                raise AssertionError("candidate_id_mismatch")
            if report.get("repository_head") != CANDIDATE_MERGE:
                raise AssertionError("candidate_head_mismatch")
            if report.get("repository_tree") != CANDIDATE_TREE:
                raise AssertionError("candidate_tree_mismatch")

            binding = report.get("compile_binding")
            if not isinstance(binding, dict):
                raise AssertionError("compile_binding_missing")
            if binding.get("runtime_expected_head_compile_bound") is not False:
                raise AssertionError("runtime_head_compile_binding_regressed")
            if binding.get("runtime_expected_head_strict_lowercase_hex") is not True:
                raise AssertionError("runtime_head_admission_missing")
            if binding.get("runtime_expected_head_forwarded_unchanged") is not True:
                raise AssertionError("runtime_head_forwarding_missing")
            if binding.get("repository_head_not_embedded_in_launcher") is not True:
                raise AssertionError("repository_head_embedded_in_launcher")

            authority = report.get("authority")
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
                run([
                    "/usr/bin/git", "--no-replace-objects", "-C", os.fspath(ROOT),
                    "worktree", "remove", "--force", os.fspath(worktree),
                ], timeout=60)


def self_test() -> None:
    if len(LOCK_ID) != len("voidbuye2dormantfirstentrylock2_") + 64:
        raise AssertionError("lock_id_length_invalid")
    if len(CANDIDATE_MERGE) != 40 or len(CANDIDATE_TREE) != 40:
        raise AssertionError("candidate_identity_length_invalid")
    if EXPECTED_BINARY_BYTES != 731072:
        raise AssertionError("binary_bytes_invalid")
    print(MARKER + "_SELF_TEST_GREEN")
    print("canonical_main_candidate_required=true")
    print("runtime_expected_head_compile_bound=false")
    print("runtime_expected_head_strict_lowercase_hex=true")
    print("runtime_expected_head_forwarded_unchanged=true")
    print("repository_head_not_embedded_in_launcher=true")
    print("superseded_v1_lock_install_authority=false")
    print("candidate_accepted=true")
    print("protected_install_authorized=false")
    print("precision_install_authorized=false")
    print("funds_movement_authorized=false")


def verify() -> None:
    verify_repository()
    verify_lock()
    rederive_candidate()
    print(MARKER + "_GREEN")
    print("canonical_main_candidate_rederived=true")
    print("canonical_hosted_evidence_bound=true")
    print("three_report_byte_identity_verified=true")
    print("three_binary_byte_identity_verified=true")
    print("independent_rederivation_verified=true")
    print("runtime_head_contract_accepted=true")
    print("superseded_v1_lock_preserved=true")
    print("superseded_v1_lock_install_authority=false")
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
        "next_gate=void_buy_void_epoch2_dormant_binder_installer_"
        "first_entry_materializer_v2"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        verify()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
