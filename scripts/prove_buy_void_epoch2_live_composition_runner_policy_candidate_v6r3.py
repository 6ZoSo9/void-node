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
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_CANDIDATE_V6R3"
SCHEMA = "void_buy_void_epoch2_live_composition_runner_policy_candidate_v6r3"
VERSION = 1
CANDIDATE_PREFIX = "voidbuye2runnerpolcand6r3_"

RUNNER_REL = "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"
RUNNER = ROOT / RUNNER_REL
RUNNER_GIT_BLOB_SHA1 = "2fa028824d71a22f4d228cdb7fcda738bce7b409"
RUNNER_INSTALL_MODE = "0444"

NATIVE_SOURCE_REL = "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c"
NATIVE_SOURCE = ROOT / NATIVE_SOURCE_REL
NATIVE_SOURCE_GIT_BLOB_SHA1 = "5021727f1def1ec11f870d735cab65acc1701a5e"
NATIVE_BINARY_SHA256 = "85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
NATIVE_BINARY_BYTES = 726_976

V6R2_LOCK_REL = "ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json"
V6R2_LOCK = ROOT / V6R2_LOCK_REL
V6R2_LOCK_GIT_BLOB_SHA1 = "bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b"
V6R2_LOCK_ID = (
    "voidbuye2nativecandlock6r2_"
    "ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417"
)
V6R2_CANDIDATE_ID = (
    "voidbuye2nativecand6r2_"
    "5d643422fb1c53686edd9386d6a65f000d9f399538bf94cca98b232fdfb15e8d"
)

RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
RUNTIME_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
SOURCE_BASELINE_HEAD = "0ada7fde0d90c3946b10693f4621cbd690bfcde6"
SOURCE_BASELINE_TREE = "9e930fba9aacfafb5b163767302786cd7f31c81e"
SOURCE_BASELINE_ADDED_PATH_COUNT = 15
POLICY_SCHEMA = "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3"

MAX_RUNNER_BYTES = 4 * 1024 * 1024
MAX_LOCK_BYTES = 128 * 1024
MAX_SOURCE_BYTES = 1024 * 1024
MAX_REPORT_BYTES = 256 * 1024


class CandidateError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def exact_file(path: Path, maximum: int, label: str) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise CandidateError(label + "_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise CandidateError(label + "_metadata_invalid")
    try:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    except OSError as exc:
        raise CandidateError(label + "_open_failed") from exc
    try:
        opened = os.fstat(fd)
        if (
            opened.st_dev != before.st_dev
            or opened.st_ino != before.st_ino
            or opened.st_mode != before.st_mode
            or opened.st_uid != before.st_uid
            or opened.st_gid != before.st_gid
            or opened.st_nlink != before.st_nlink
            or opened.st_size != before.st_size
        ):
            raise CandidateError(label + "_rebound")
        chunks: list[bytes] = []
        remaining = before.st_size
        while remaining:
            chunk = os.read(fd, min(64 * 1024, remaining))
            if not chunk:
                raise CandidateError(label + "_short_read")
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise CandidateError(label + "_grew")
        after = os.fstat(fd)
        visible = path.lstat()
        for field in (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
            "st_size", "st_mtime_ns", "st_ctime_ns",
        ):
            if getattr(opened, field) != getattr(after, field):
                raise CandidateError(label + "_changed_during_read")
            if getattr(after, field) != getattr(visible, field):
                raise CandidateError(label + "_visible_generation_changed")
        return b"".join(chunks)
    finally:
        os.close(fd)


def accepted_v6r2_native() -> dict[str, object]:
    lock_raw = exact_file(V6R2_LOCK, MAX_LOCK_BYTES, "v6r2_lock")
    if git_blob_sha1(lock_raw) != V6R2_LOCK_GIT_BLOB_SHA1:
        raise CandidateError("v6r2_lock_blob_mismatch")
    try:
        lock = json.loads(lock_raw)
    except json.JSONDecodeError as exc:
        raise CandidateError("v6r2_lock_json_invalid") from exc
    if not isinstance(lock, dict):
        raise CandidateError("v6r2_lock_shape_invalid")
    required = {
        "lock_id": V6R2_LOCK_ID,
        "candidate_accepted": True,
        "native_binary_identity_accepted": True,
        "runner_identity_accepted": True,
        "protected_install_authorized": False,
        "live_execution_authorized": False,
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
    }
    for key, expected in required.items():
        if lock.get(key) != expected:
            raise CandidateError("v6r2_lock_field_mismatch:" + key)
    report = lock.get("candidate_report")
    if not isinstance(report, dict):
        raise CandidateError("v6r2_candidate_report_missing")
    if (
        report.get("candidate_id") != V6R2_CANDIDATE_ID
        or report.get("native_source_git_blob_sha1") != NATIVE_SOURCE_GIT_BLOB_SHA1
        or report.get("native_binary_sha256") != NATIVE_BINARY_SHA256
        or report.get("native_binary_bytes") != NATIVE_BINARY_BYTES
    ):
        raise CandidateError("v6r2_native_identity_mismatch")
    return {
        "accepted_lock_id": V6R2_LOCK_ID,
        "accepted_candidate_id": V6R2_CANDIDATE_ID,
        "native_source_git_blob_sha1": NATIVE_SOURCE_GIT_BLOB_SHA1,
        "native_binary_sha256": NATIVE_BINARY_SHA256,
        "native_binary_bytes": NATIVE_BINARY_BYTES,
        "binary_identity_reused": True,
        "binary_rebuild_required": False,
    }


def run_runner_mode(mode: str) -> str:
    node = shutil.which("node")
    if not node:
        raise CandidateError("node_unavailable")
    env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
    }
    try:
        completed = subprocess.run(
            [node, str(RUNNER), mode],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
            env=env,
            cwd=str(ROOT),
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
        raise CandidateError("runner_mode_execution_failed:" + mode) from exc
    if completed.returncode != 0:
        raise CandidateError("runner_mode_nonzero:" + mode)
    if completed.stderr != "":
        raise CandidateError("runner_mode_stderr:" + mode)
    if len(completed.stdout.encode("utf-8")) > 256 * 1024:
        raise CandidateError("runner_mode_output_too_large:" + mode)
    return completed.stdout


def validate_runner_transcripts(self_test: str, plan: str) -> None:
    self_lines = set(self_test.splitlines())
    for line in (
        "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V4_SELF_TEST_GREEN",
        "runtime_policy_head_preserved=true",
        "source_checkout_head_runtime_observed=true",
        "source_runtime_ancestry_required=true",
        "source_runtime_actual_object_ancestry_required=true",
        "tracked_source_checkout_exact_required=true",
        "source_runtime_dependency_blob_equality_required=true",
        "source_runtime_complete_dependency_set_bound=true",
        "nested_source_runtime_dependency_drift_rejected=true",
        "authenticated_closure_synthetic_namespace=true",
        "authenticated_closure_namespace_absent_required=true",
        "root_qualification_user_checkout_file_namespace=false",
        "root_qualification_dependency_closure_git_object_bound=true",
        "root_checkout_dependency_path_reads_forbidden=true",
        "root_qualification_closure_path_contract_bound=true",
        "qualifier_closure_unprivileged_git_read_required=true",
        "untracked_paths_enumerated=false",
        "untracked_paths_source_authority=false",
        "transaction=false",
        "funds_movement=false",
    ):
        if line not in self_lines:
            raise CandidateError("runner_self_test_marker_missing:" + line)

    plan_lines = set(plan.splitlines())
    for line in (
        "mode=plan",
        "source_generation=v4_source_runtime_compatibility",
        "runtime_expected_head=" + RUNTIME_HEAD,
        "source_checkout_head_runtime_observed=true",
        "source_checkout_tree_runtime_observed=true",
        "source_runtime_ancestry_required=true",
        "source_runtime_actual_object_ancestry_required=true",
        "tracked_source_checkout_exact_required=true",
        "runtime_source_dependency_blob_equality_required=true",
        "root_qualification_dependency_closure_git_object_bound=true",
        "root_checkout_dependency_path_reads_forbidden=true",
        "root_qualification_closure_path_contract_bound=true",
        "untracked_paths_enumerated=false",
        "credential_content_access=false",
        "private_key_access=false",
        "nontransaction_signature=false",
        "transaction=false",
        "rpc_call=false",
        "filesystem_write=false",
        "host_mutation=false",
        "service_mutation=false",
        "payment_acceptance=false",
        "public_presale_activation=false",
        "wc_void_market_activation=false",
        "funds_movement=false",
        "production_host_evidence_authority=false",
    ):
        if line not in plan_lines:
            raise CandidateError("runner_plan_marker_missing:" + line)


def derive_report() -> dict[str, Any]:
    runner_raw = exact_file(RUNNER, MAX_RUNNER_BYTES, "runner_v4")
    if git_blob_sha1(runner_raw) != RUNNER_GIT_BLOB_SHA1:
        raise CandidateError("runner_v4_blob_mismatch")
    native_source_raw = exact_file(
        NATIVE_SOURCE, MAX_SOURCE_BYTES, "native_v3_source"
    )
    if git_blob_sha1(native_source_raw) != NATIVE_SOURCE_GIT_BLOB_SHA1:
        raise CandidateError("native_v3_source_blob_mismatch")

    accepted_native = accepted_v6r2_native()
    self_test = run_runner_mode("--self-test")
    plan = run_runner_mode("--plan")
    validate_runner_transcripts(self_test, plan)

    body: dict[str, Any] = {
        "schema": SCHEMA,
        "version": VERSION,
        "marker": MARKER,
        "status": "candidate_only_unaccepted",
        "runtime_head": RUNTIME_HEAD,
        "runtime_tree": RUNTIME_TREE,
        "source_compatibility": {
            "precision_baseline_head": SOURCE_BASELINE_HEAD,
            "precision_baseline_tree": SOURCE_BASELINE_TREE,
            "precision_baseline_add_only_path_count": SOURCE_BASELINE_ADDED_PATH_COUNT,
            "current_source_head_runtime_observed": True,
            "current_source_tree_runtime_observed": True,
            "runtime_ancestor_required": True,
            "actual_object_ancestry_required": True,
            "tracked_checkout_exact_required": True,
            "runtime_source_dependency_blob_equality_required": True,
            "untracked_paths_enumerated": False,
            "untracked_paths_source_authority": False,
        },
        "runner": {
            "path": RUNNER_REL,
            "git_blob_sha1": RUNNER_GIT_BLOB_SHA1,
            "sha256": sha256(runner_raw),
            "bytes": len(runner_raw),
            "install_mode": RUNNER_INSTALL_MODE,
            "self_test_stdout_sha256": sha256(self_test.encode("utf-8")),
            "plan_stdout_sha256": sha256(plan.encode("utf-8")),
        },
        "native_reuse": accepted_native,
        "policy_template": {
            "schema": POLICY_SCHEMA,
            "runtime_expected_head": RUNTIME_HEAD,
            "runner_sha256": sha256(runner_raw),
            "runner_bytes": len(runner_raw),
            "node_identity_derived_on_protected_host": True,
            "policy_identity_derived_on_protected_host": True,
            "source_head_must_not_replace_runtime_expected_head": True,
        },
        "authority": {
            "source_only_candidate": True,
            "candidate_report_filesystem_write": True,
            "candidate_accepted": False,
            "protected_install_authorized": False,
            "live_execution_authorized": False,
            "credential_access_authorized": False,
            "private_key_access_authorized": False,
            "signing_authorized": False,
            "transaction_authorized": False,
            "rpc_call_authorized": False,
            "payment_acceptance_authorized": False,
            "public_presale_activation_authorized": False,
            "wc_void_market_activation_authorized": False,
            "treasury_liquidity_action_authorized": False,
            "funds_movement_authorized": False,
            "production_host_evidence_authority": False,
        },
        "next_gate": (
            "void_buy_void_epoch2_live_composition_"
            "runner_policy_candidate_lock_v6r3"
        ),
    }
    return {
        **body,
        "candidate_id": CANDIDATE_PREFIX + sha256(canonical(body)),
    }


def validate_report(report: object) -> dict[str, Any]:
    if not isinstance(report, dict):
        raise CandidateError("candidate_report_not_object")
    if report.get("schema") != SCHEMA or report.get("version") != VERSION:
        raise CandidateError("candidate_report_schema_invalid")
    if report.get("marker") != MARKER:
        raise CandidateError("candidate_report_marker_invalid")
    if report.get("status") != "candidate_only_unaccepted":
        raise CandidateError("candidate_report_status_invalid")
    if report.get("runtime_head") != RUNTIME_HEAD:
        raise CandidateError("candidate_runtime_head_invalid")
    source_compat = report.get("source_compatibility")
    if not isinstance(source_compat, dict):
        raise CandidateError("candidate_source_compatibility_missing")
    expected_source_compat = {
        "precision_baseline_head": SOURCE_BASELINE_HEAD,
        "precision_baseline_tree": SOURCE_BASELINE_TREE,
        "precision_baseline_add_only_path_count": SOURCE_BASELINE_ADDED_PATH_COUNT,
        "current_source_head_runtime_observed": True,
        "current_source_tree_runtime_observed": True,
        "runtime_ancestor_required": True,
        "actual_object_ancestry_required": True,
        "tracked_checkout_exact_required": True,
        "runtime_source_dependency_blob_equality_required": True,
        "untracked_paths_enumerated": False,
        "untracked_paths_source_authority": False,
    }
    if source_compat != expected_source_compat:
        raise CandidateError("candidate_source_compatibility_invalid")

    runner = report.get("runner")
    if not isinstance(runner, dict):
        raise CandidateError("candidate_runner_missing")
    current_runner = exact_file(RUNNER, MAX_RUNNER_BYTES, "runner_v4")
    if (
        runner.get("path") != RUNNER_REL
        or runner.get("git_blob_sha1") != RUNNER_GIT_BLOB_SHA1
        or runner.get("sha256") != sha256(current_runner)
        or runner.get("bytes") != len(current_runner)
        or runner.get("install_mode") != RUNNER_INSTALL_MODE
    ):
        raise CandidateError("candidate_runner_identity_invalid")

    native = report.get("native_reuse")
    if not isinstance(native, dict):
        raise CandidateError("candidate_native_reuse_missing")
    if (
        native.get("accepted_lock_id") != V6R2_LOCK_ID
        or native.get("accepted_candidate_id") != V6R2_CANDIDATE_ID
        or native.get("native_binary_sha256") != NATIVE_BINARY_SHA256
        or native.get("native_binary_bytes") != NATIVE_BINARY_BYTES
        or native.get("binary_identity_reused") is not True
        or native.get("binary_rebuild_required") is not False
    ):
        raise CandidateError("candidate_native_reuse_invalid")

    policy = report.get("policy_template")
    if not isinstance(policy, dict):
        raise CandidateError("candidate_policy_template_missing")
    if (
        policy.get("schema") != POLICY_SCHEMA
        or policy.get("runtime_expected_head") != RUNTIME_HEAD
        or policy.get("runner_sha256") != sha256(current_runner)
        or policy.get("runner_bytes") != len(current_runner)
        or policy.get("node_identity_derived_on_protected_host") is not True
        or policy.get("policy_identity_derived_on_protected_host") is not True
        or policy.get("source_head_must_not_replace_runtime_expected_head")
        is not True
    ):
        raise CandidateError("candidate_policy_template_invalid")

    authority = report.get("authority")
    if not isinstance(authority, dict):
        raise CandidateError("candidate_authority_missing")
    if (
        authority.get("source_only_candidate") is not True
        or authority.get("candidate_report_filesystem_write") is not True
    ):
        raise CandidateError("candidate_positive_authority_invalid")
    for key, value in authority.items():
        if key in ("source_only_candidate", "candidate_report_filesystem_write"):
            continue
        if value is not False:
            raise CandidateError("candidate_authority_overclaim:" + key)

    cid = report.get("candidate_id")
    material = dict(report)
    material.pop("candidate_id", None)
    expected = CANDIDATE_PREFIX + sha256(canonical(material))
    if cid != expected:
        raise CandidateError("candidate_id_content_binding_invalid")
    return report


def write_create_only(path: Path, raw: bytes) -> None:
    if not path.is_absolute():
        raise CandidateError("output_path_not_absolute")
    if path.exists() or path.is_symlink():
        raise CandidateError("output_already_exists")
    path.parent.mkdir(parents=True, exist_ok=True)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC
    fd = os.open(path, flags, 0o600)
    try:
        view = memoryview(raw)
        while view:
            written = os.write(fd, view)
            if written <= 0:
                raise CandidateError("output_write_failed")
            view = view[written:]
        os.fsync(fd)
    finally:
        os.close(fd)


def self_test() -> None:
    first = validate_report(derive_report())
    second = validate_report(derive_report())
    if canonical(first) != canonical(second):
        raise CandidateError("candidate_report_not_deterministic")
    print(MARKER + "_SELF_TEST_GREEN")
    print("runner_v4_exact_blob_bound=true")
    print("runner_v4_self_test_green=true")
    print("runner_v4_plan_green=true")
    print("v6r2_native_identity_reused=true")
    print("native_binary_rebuild_required=false")
    print("runtime_policy_head_preserved=true")
    print("current_source_head_runtime_observed=true")
    print("source_runtime_ancestry_required=true")
    print("source_runtime_actual_object_ancestry_required=true")
    print("tracked_source_checkout_exact_required=true")
    print("runtime_source_dependency_blob_equality_required=true")
    print("untracked_paths_source_authority=false")
    print("policy_identity_deferred_to_protected_host=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("funds_movement_authorized=false")


def derive(output: Path) -> None:
    report = validate_report(derive_report())
    raw = canonical(report) + b"\n"
    if len(raw) > MAX_REPORT_BYTES:
        raise CandidateError("candidate_report_too_large")
    write_create_only(output, raw)
    print(MARKER + "_DERIVE_GREEN")
    print("candidate_id=" + str(report["candidate_id"]))
    print("runner_git_blob_sha1=" + RUNNER_GIT_BLOB_SHA1)
    print("runner_sha256=" + str(report["runner"]["sha256"]))
    print("runner_bytes=" + str(report["runner"]["bytes"]))
    print("native_sha256=" + NATIVE_BINARY_SHA256)
    print("native_bytes=" + str(NATIVE_BINARY_BYTES))
    print("v6r2_native_identity_reused=true")
    print("native_binary_rebuild_required=false")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("funds_movement_authorized=false")


def verify(path: Path) -> None:
    raw = exact_file(path, MAX_REPORT_BYTES, "candidate_report")
    try:
        report = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise CandidateError("candidate_report_json_invalid") from exc
    validate_report(report)
    print(MARKER + "_VERIFY_GREEN")
    print("candidate_id=" + str(report["candidate_id"]))
    print("runner_sha256=" + str(report["runner"]["sha256"]))
    print("native_sha256=" + NATIVE_BINARY_SHA256)
    print("candidate_accepted=false")
    print("live_execution_authorized=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--derive", metavar="ABSOLUTE_OUTPUT")
    mode.add_argument("--verify", metavar="CANDIDATE_JSON")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.derive:
        derive(Path(args.derive))
        return 0
    verify(Path(args.verify))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CandidateError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("candidate_accepted=false")
        print("protected_install_authorized=false")
        print("live_execution_authorized=false")
        print("credential_access_authorized=false")
        print("private_key_access_authorized=false")
        print("signing_authorized=false")
        print("transaction_authorized=false")
        print("payment_acceptance_authorized=false")
        print("public_presale_activation_authorized=false")
        print("wc_void_market_activation_authorized=false")
        print("funds_movement_authorized=false")
        raise SystemExit(2)
