#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import stat
import subprocess
import sys
import types
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
INSTALLER_SOURCE = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v1.py"
)
INSTALLER_SOURCE_GIT_BLOB_SHA1 = "df3c27c57e0d413c7487189f1ddf6c141004d67c"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V1"
)
MAX_BOOTSTRAP_OUTPUT_BYTES = 64 * 1024
SELF_TEST_TIMEOUT_SECONDS = 10


class QualificationError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def _same_stat(left: os.stat_result, right: os.stat_result) -> bool:
    return (
        left.st_dev == right.st_dev
        and left.st_ino == right.st_ino
        and left.st_mode == right.st_mode
        and left.st_uid == right.st_uid
        and left.st_gid == right.st_gid
        and left.st_nlink == right.st_nlink
        and left.st_size == right.st_size
        and left.st_mtime_ns == right.st_mtime_ns
        and left.st_ctime_ns == right.st_ctime_ns
    )


def _direct_source_bytes(path: pathlib.Path, maximum: int = 2 * 1024 * 1024) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualificationError("installer_source_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise QualificationError("installer_source_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise QualificationError("installer_source_rebound")
        raw = bytearray()
        while len(raw) < before.st_size:
            chunk = os.read(fd, min(1024 * 1024, before.st_size - len(raw)))
            if not chunk:
                raise QualificationError("installer_source_short_read")
            raw.extend(chunk)
        if os.read(fd, 1):
            raise QualificationError("installer_source_grew")
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise QualificationError("installer_source_changed")
    finally:
        os.close(fd)
    return bytes(raw)


def _load_installer():
    raw = _direct_source_bytes(INSTALLER_SOURCE)
    if git_blob_sha1(raw) != INSTALLER_SOURCE_GIT_BLOB_SHA1:
        raise QualificationError("installer_source_blob_mismatch")
    module = types.ModuleType(
        "void_buy_void_epoch2_dormant_first_entry_"
        "protected_install_bootstrap_install_v1"
    )
    module.__file__ = str(INSTALLER_SOURCE)
    module.__package__ = ""
    code = compile(raw, str(INSTALLER_SOURCE), "exec", dont_inherit=True)
    exec(code, module.__dict__)
    return module


def _hash_exact_file(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_mode: int,
) -> dict[str, Any]:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualificationError("installed_file_unavailable:" + path.name) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_size != expected_bytes
    ):
        raise QualificationError("installed_file_metadata_invalid:" + path.name)
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise QualificationError("installed_file_rebound:" + path.name)
        digest = hashlib.sha256()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise QualificationError("installed_file_short_read:" + path.name)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise QualificationError("installed_file_grew:" + path.name)
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise QualificationError("installed_file_changed:" + path.name)
    finally:
        os.close(fd)
    observed = digest.hexdigest()
    if observed != expected_sha256:
        raise QualificationError("installed_file_sha256_mismatch:" + path.name)
    return {
        "dev": before.st_dev,
        "ino": before.st_ino,
        "uid": before.st_uid,
        "gid": before.st_gid,
        "mode": format(stat.S_IMODE(before.st_mode), "04o"),
        "nlink": before.st_nlink,
        "bytes": before.st_size,
        "mtime_ns": before.st_mtime_ns,
        "ctime_ns": before.st_ctime_ns,
        "sha256": observed,
    }


def _dir_record(path: pathlib.Path, *, exact_mode: int) -> dict[str, Any]:
    try:
        st = path.lstat()
    except OSError as exc:
        raise QualificationError("installed_directory_unavailable:" + path.name) from exc
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) != exact_mode
        or (st.st_mode & 0o022) != 0
    ):
        raise QualificationError("installed_directory_invalid:" + path.name)
    return {
        "dev": st.st_dev,
        "ino": st.st_ino,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "nlink": st.st_nlink,
        "mtime_ns": st.st_mtime_ns,
        "ctime_ns": st.st_ctime_ns,
    }


def installed_snapshot(installer: Any, expected_head: str) -> dict[str, Any]:
    try:
        installer.accepted_lock(expected_head)
        checkout = installer.checkout_snapshot(expected_head)
        git_tool = installer._tool_snapshot(
            installer.FIXED_GIT,
            executable=True,
            maximum_bytes=64 * 1024 * 1024,
        )
        python = installer.python_snapshot()
        policy = installer.build_policy(python)
        state = installer.protected_state(policy)
    except Exception as exc:
        raise QualificationError("installed_generation_verification_failed") from exc
    if state != installer.GREEN_STATE:
        raise QualificationError("protected_bootstrap_not_green")

    root = _dir_record(installer.INSTALL_ROOT, exact_mode=0o755)
    bin_dir = _dir_record(installer.INSTALL_ROOT / installer.BIN_DIR, exact_mode=0o755)
    bootstrap = _hash_exact_file(
        installer.BOOTSTRAP_TARGET,
        expected_bytes=installer.BOOTSTRAP_BYTES,
        expected_sha256=installer.BOOTSTRAP_SHA256,
        expected_mode=0o555,
    )
    policy_record = _hash_exact_file(
        installer.POLICY_TARGET,
        expected_bytes=len(policy),
        expected_sha256=sha256(policy),
        expected_mode=0o444,
    )
    return {
        "protected_state": state,
        "expected_head": expected_head,
        "checkout": checkout,
        "git_tool": git_tool,
        "python": python,
        "root": root,
        "bin_dir": bin_dir,
        "bootstrap": bootstrap,
        "policy": policy_record,
    }


def _bootstrap_snapshot_matches_stat(expected: dict[str, Any], st: os.stat_result) -> bool:
    return (
        expected.get("dev") == st.st_dev
        and expected.get("ino") == st.st_ino
        and expected.get("uid") == st.st_uid
        and expected.get("gid") == st.st_gid
        and expected.get("mode") == format(stat.S_IMODE(st.st_mode), "04o")
        and expected.get("nlink") == st.st_nlink
        and expected.get("bytes") == st.st_size
        and expected.get("mtime_ns") == st.st_mtime_ns
        and expected.get("ctime_ns") == st.st_ctime_ns
    )


def _hash_retained_fd(fd: int, expected_bytes: int) -> str:
    os.lseek(fd, 0, os.SEEK_SET)
    digest = hashlib.sha256()
    remaining = expected_bytes
    while remaining:
        chunk = os.read(fd, min(1024 * 1024, remaining))
        if not chunk:
            raise QualificationError("bootstrap_retained_fd_short_read")
        digest.update(chunk)
        remaining -= len(chunk)
    if os.read(fd, 1):
        raise QualificationError("bootstrap_retained_fd_grew")
    os.lseek(fd, 0, os.SEEK_SET)
    return digest.hexdigest()


def _run_bootstrap_self_test(
    installer: Any,
    expected_bootstrap: dict[str, Any],
) -> tuple[str, str]:
    if os.geteuid() != 0:
        raise QualificationError("root_required_for_installed_qualification")

    path = installer.BOOTSTRAP_TARGET
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise QualificationError("bootstrap_self_test_path_unavailable") from exc
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened_before = os.fstat(fd)
        if (
            not _same_stat(visible_before, opened_before)
            or not _bootstrap_snapshot_matches_stat(expected_bootstrap, opened_before)
        ):
            raise QualificationError("bootstrap_self_test_generation_mismatch")
        digest = _hash_retained_fd(fd, opened_before.st_size)
        if (
            digest != expected_bootstrap.get("sha256")
            or digest != installer.BOOTSTRAP_SHA256
            or opened_before.st_size != installer.BOOTSTRAP_BYTES
        ):
            raise QualificationError("bootstrap_self_test_digest_mismatch")

        try:
            completed = subprocess.run(
                [f"/proc/self/fd/{fd}", "--self-test"],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env={
                    "PATH": "/usr/bin:/bin",
                    "HOME": "/nonexistent",
                    "LANG": "C",
                    "LC_ALL": "C",
                    "TZ": "UTC",
                },
                pass_fds=(fd,),
                timeout=SELF_TEST_TIMEOUT_SECONDS,
                check=False,
                close_fds=True,
            )
        except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
            raise QualificationError("bootstrap_self_test_execution_failed") from exc

        opened_after = os.fstat(fd)
        try:
            visible_after = path.lstat()
        except OSError as exc:
            raise QualificationError("bootstrap_self_test_visible_path_unavailable") from exc
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
            or not _bootstrap_snapshot_matches_stat(expected_bootstrap, visible_after)
        ):
            raise QualificationError("bootstrap_generation_changed_during_self_test")
    finally:
        os.close(fd)

    if completed.returncode != 0:
        raise QualificationError(
            "bootstrap_self_test_nonzero_exit:" + str(completed.returncode)
        )
    if completed.stderr != "":
        raise QualificationError("bootstrap_self_test_unexpected_stderr")
    encoded = completed.stdout.encode("utf-8")
    if len(encoded) < 1 or len(encoded) > MAX_BOOTSTRAP_OUTPUT_BYTES:
        raise QualificationError("bootstrap_self_test_output_invalid")
    required = {
        "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V1_SELF_TEST_GREEN",
        "static_native_first_instruction_required=true",
        "exact_installer_snapshot_compile_bound=true",
        "sealed_installer_memfd_required=true",
        "fixed_python_policy_bound=true",
        "caller_stdin_must_be_devnull=true",
        "strict_plan_apply_argv=true",
        "child_environment_closed=true",
        "direct_root_python_authoritative=false",
        "protected_install_authorized=false",
        "funds_movement=false",
    }
    lines = set(completed.stdout.splitlines())
    missing = sorted(required - lines)
    if missing:
        raise QualificationError("bootstrap_self_test_marker_missing:" + missing[0])
    return completed.stdout, "sha256:" + sha256(encoded)


def collect(expected_head: str) -> dict[str, Any]:
    if os.geteuid() != 0:
        raise QualificationError("root_required_for_installed_qualification")
    installer = _load_installer()

    before = installed_snapshot(installer, expected_head)
    first_output, first_sha = _run_bootstrap_self_test(
        installer, before["bootstrap"]
    )
    middle = installed_snapshot(installer, expected_head)
    second_output, second_sha = _run_bootstrap_self_test(
        installer, middle["bootstrap"]
    )
    after = installed_snapshot(installer, expected_head)

    if before != middle or middle != after:
        raise QualificationError("installed_generation_changed_during_qualification")
    if first_output != second_output or first_sha != second_sha:
        raise QualificationError("bootstrap_self_test_output_changed")

    return {
        "marker": MARKER,
        "version": 1,
        "read_only": True,
        "root_execution_required": True,
        "accepted_lock_id": installer.LOCK_ID,
        "candidate_id": installer.CANDIDATE_ID,
        "candidate_source_head": installer.CANDIDATE_MERGE,
        "expected_head": expected_head,
        "protected_bootstrap_verified": True,
        "installed_generation_stable": True,
        "checkout_generation_bound": True,
        "git_generation_bound": True,
        "python_generation_bound": True,
        "bootstrap_self_test_execution": True,
        "bootstrap_self_test_descriptor_bound": True,
        "bootstrap_self_test_stable": True,
        "bootstrap_self_test_sha256": first_sha,
        "bootstrap_sha256": installer.BOOTSTRAP_SHA256,
        "bootstrap_bytes": installer.BOOTSTRAP_BYTES,
        "policy_sha256": before["policy"]["sha256"],
        "policy_bytes": before["policy"]["bytes"],
        "installer_source_git_blob_sha1": INSTALLER_SOURCE_GIT_BLOB_SHA1,
        "bootstrap_execution_mode": "self_test_only",
        "protected_installer_plan_execution": False,
        "protected_installer_apply": False,
        "live_execution": False,
        "credential_access": False,
        "private_key_access": False,
        "signing": False,
        "transaction": False,
        "rpc_call": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "treasury_liquidity_action": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
        "next_action":
            "SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
            "PROTECTED_BOOTSTRAP_INSTALLER_PLAN_V1",
    }


def self_test() -> None:
    installer = _load_installer()
    assert installer.LOCK_ID.startswith("voidbuye2bootstraplock1_")
    assert installer.CANDIDATE_ID.startswith("voidbuye2bootstrapcand1_")
    assert installer.BOOTSTRAP_BYTES == 731_072
    assert installer.GREEN_STATE == "PROTECTED_BOOTSTRAP_ROOT_GREEN"
    assert installer.INSTALL_ROOT == pathlib.Path(
        "/opt/void-buy-void-epoch2-dormant-first-entry-"
        "protected-install-bootstrap-v1"
    )
    print(MARKER + "_SELF_TEST_GREEN")
    print("installer_source_blob_bound=true")
    print("accepted_bootstrap_lock_bound=true")
    print("exact_installed_root_required=true")
    print("root_python_policy_binding_required=true")
    print("double_bootstrap_self_test_required=true")
    print("descriptor_bound_bootstrap_self_test_required=true")
    print("protected_installer_plan_execution=false")
    print("protected_installer_apply=false")
    print("credential_access=false")
    print("transaction=false")
    print("funds_movement=false")


def plan() -> None:
    installer = _load_installer()
    print(MARKER)
    print("mode=plan")
    print("root_required_for_run=true")
    print("accepted_lock_id=" + installer.LOCK_ID)
    print("candidate_id=" + installer.CANDIDATE_ID)
    print("candidate_source_head=" + installer.CANDIDATE_MERGE)
    print("install_root=" + str(installer.INSTALL_ROOT))
    print("bootstrap_path=" + str(installer.BOOTSTRAP_TARGET))
    print("policy_path=" + str(installer.POLICY_TARGET))
    print("exact_expected_head_required=true")
    print("installed_generation_verification_required=true")
    print("checkout_generation_binding_required=true")
    print("python_generation_binding_required=true")
    print("double_bootstrap_self_test_required=true")
    print("descriptor_bound_bootstrap_self_test_required=true")
    print("bootstrap_self_test_execution=false")
    print("protected_installer_plan_execution=false")
    print("protected_installer_apply=false")
    print("live_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print(
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_BOOTSTRAP_INSTALLED_READ_ONLY_QUALIFICATION_V1"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--run", action="store_true")
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.plan:
        plan()
        return 0
    if not args.expected_head:
        raise QualificationError("expected_head_required")

    result = collect(args.expected_head)
    print(MARKER)
    for key in (
        "read_only",
        "root_execution_required",
        "accepted_lock_id",
        "candidate_id",
        "candidate_source_head",
        "expected_head",
        "protected_bootstrap_verified",
        "installed_generation_stable",
        "checkout_generation_bound",
        "git_generation_bound",
        "python_generation_bound",
        "bootstrap_self_test_execution",
        "bootstrap_self_test_descriptor_bound",
        "bootstrap_self_test_stable",
        "bootstrap_self_test_sha256",
        "bootstrap_sha256",
        "bootstrap_bytes",
        "policy_sha256",
        "policy_bytes",
        "installer_source_git_blob_sha1",
        "bootstrap_execution_mode",
        "protected_installer_plan_execution",
        "protected_installer_apply",
        "live_execution",
        "credential_access",
        "private_key_access",
        "signing",
        "transaction",
        "rpc_call",
        "payment_acceptance",
        "public_presale_activation",
        "wc_void_market_activation",
        "treasury_liquidity_action",
        "funds_movement",
        "production_host_evidence_authority",
        "next_action",
    ):
        value = result[key]
        print(f"{key}={str(value).lower() if isinstance(value, bool) else value}")
    print(
        "result_json="
        + json.dumps(result, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except QualificationError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("bootstrap_self_test_execution_state=unknown_or_partial")
        print("protected_installer_plan_execution=false")
        print("protected_installer_apply=false")
        print("live_execution=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("treasury_liquidity_action=false")
        print("funds_movement=false")
        raise SystemExit(2)
