#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import stat
import subprocess
import types
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v6.py"
)
INSTALLER_SOURCE = ROOT / INSTALLER_REL
INSTALLER_SOURCE_GIT_BLOB_SHA1 = "63e1c973978cfcb67105010e4145f01552673bc3"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6"
)
MAX_INSTALLER_SOURCE_BYTES = 2 * 1024 * 1024
MAX_BOOTSTRAP_OUTPUT_BYTES = 128 * 1024
SELF_TEST_TIMEOUT_SECONDS = 15

REQUIRED_SELF_TEST_LINES = frozenset(
    {
        "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V6_SELF_TEST_GREEN",
        "static_native_first_instruction_required=true",
        "complete_source_generation_compile_bound=true",
        "runtime_expected_head_strict_hex_required=true",
        "runtime_expected_head_forwarded_to_authenticated_child=true",
        "native_raw_checkout_gate_before_installer_child=true",
        "sealed_input_and_tool_memfds_required=true",
        "private_live_native_parent_proof_required=true",
        "fixed_python_and_git_host_policy_bound=true",
        "caller_stdin_must_be_devnull=true",
        "strict_plan_apply_argv=true",
        "child_environment_closed=true",
        "python_site_startup_disabled=true",
        "direct_root_python_authoritative=false",
        "protected_install_authorized=false",
        "funds_movement=false",
    }
)


class QualifyError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def _same_stat(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_mode == b.st_mode
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_nlink == b.st_nlink
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
    )


def _direct_source_bytes(path: pathlib.Path) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualifyError("installer_source_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > MAX_INSTALLER_SOURCE_BYTES
    ):
        raise QualifyError("installer_source_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise QualifyError("installer_source_rebound")
        data = bytearray()
        remaining = before.st_size
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise QualifyError("installer_source_short_read")
            data.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise QualifyError("installer_source_grew")
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise QualifyError("installer_source_changed")
    finally:
        os.close(fd)
    return bytes(data)


def _load_installer():
    raw = _direct_source_bytes(INSTALLER_SOURCE)
    if git_blob_sha1(raw) != INSTALLER_SOURCE_GIT_BLOB_SHA1:
        raise QualifyError("installer_source_blob_mismatch")
    module = types.ModuleType(
        "void_buy_void_epoch2_dormant_first_entry_"
        "protected_install_bootstrap_install_v6"
    )
    module.__file__ = str(INSTALLER_SOURCE)
    module.__package__ = ""
    code = compile(raw, str(INSTALLER_SOURCE), "exec", dont_inherit=True)
    exec(code, module.__dict__)
    return module


def _record(st: os.stat_result) -> dict[str, Any]:
    return {
        "dev": st.st_dev,
        "ino": st.st_ino,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "nlink": st.st_nlink,
        "bytes": st.st_size,
        "mtime_ns": st.st_mtime_ns,
        "ctime_ns": st.st_ctime_ns,
    }


def _snapshot_path(
    path: pathlib.Path,
    *,
    expected_mode: int,
    expected_uid: int,
    expected_gid: int,
    expected_bytes: int | None = None,
    expected_sha256: str | None = None,
    expected_git_blob: str | None = None,
) -> dict[str, Any]:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualifyError("installed_path_unavailable:" + path.name) from exc
    if stat.S_ISLNK(before.st_mode):
        raise QualifyError("installed_path_symlink:" + path.name)
    if (
        before.st_uid != expected_uid
        or before.st_gid != expected_gid
        or stat.S_IMODE(before.st_mode) != expected_mode
    ):
        raise QualifyError("installed_path_metadata_invalid:" + path.name)
    if expected_bytes is None:
        if not stat.S_ISDIR(before.st_mode):
            raise QualifyError("installed_directory_required:" + path.name)
        return _record(before)
    if (
        not stat.S_ISREG(before.st_mode)
        or before.st_nlink != 1
        or before.st_size != expected_bytes
    ):
        raise QualifyError("installed_file_metadata_invalid:" + path.name)
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise QualifyError("installed_file_rebound:" + path.name)
        digest = hashlib.sha256()
        data = bytearray()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise QualifyError("installed_file_short_read:" + path.name)
            digest.update(chunk)
            data.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise QualifyError("installed_file_grew:" + path.name)
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise QualifyError("installed_file_changed:" + path.name)
    finally:
        os.close(fd)
    observed_sha = digest.hexdigest()
    observed_blob = git_blob_sha1(bytes(data))
    if expected_sha256 is not None and observed_sha != expected_sha256:
        raise QualifyError("installed_file_sha256_mismatch:" + path.name)
    if expected_git_blob is not None and observed_blob != expected_git_blob:
        raise QualifyError("installed_file_git_blob_mismatch:" + path.name)
    result = _record(before)
    result["sha256"] = observed_sha
    result["git_blob_sha1"] = observed_blob
    return result


def _installed_snapshot(installer: Any, expected_head: str) -> dict[str, Any]:
    checkout = installer.checkout_snapshot(expected_head)
    lock = installer.accepted_lock(expected_head)
    python = installer._tool_snapshot(
        installer.FIXED_PYTHON,
        installer.MAX_PYTHON_BYTES,
    )
    git_tool = installer._tool_snapshot(
        installer.FIXED_GIT,
        installer.MAX_GIT_BYTES,
    )
    policy = installer.build_policy(python, git_tool)
    manifest = installer._git_object(
        expected_head,
        installer.MANIFEST_REL,
        installer.MANIFEST_GIT_BLOB_SHA1,
    )
    state = installer.protected_state(policy, manifest)
    if state != installer.GREEN_STATE:
        raise QualifyError("protected_bootstrap_v6_not_green")

    root = installer.INSTALL_ROOT
    bin_path = root / installer.BIN_DIR
    bootstrap_path = bin_path / installer.BOOTSTRAP_NAME
    manifest_path = root / installer.MANIFEST_NAME
    policy_path = root / installer.POLICY_NAME

    try:
        root_entries = tuple(sorted(os.listdir(root)))
        bin_entries = tuple(sorted(os.listdir(bin_path)))
    except OSError as exc:
        raise QualifyError("installed_root_listing_failed") from exc
    if root_entries != tuple(
        sorted((installer.BIN_DIR, installer.MANIFEST_NAME, installer.POLICY_NAME))
    ):
        raise QualifyError("installed_root_entries_invalid")
    if bin_entries != (installer.BOOTSTRAP_NAME,):
        raise QualifyError("installed_bin_entries_invalid")

    return {
        "expected_head": expected_head,
        "checkout": checkout,
        "lock_id": lock["lock_id"],
        "candidate_id": installer.CANDIDATE_ID,
        "python": python,
        "git_tool": git_tool,
        "protected_state": state,
        "root": _snapshot_path(
            root,
            expected_mode=0o755,
            expected_uid=0,
            expected_gid=0,
        ),
        "bin": _snapshot_path(
            bin_path,
            expected_mode=0o755,
            expected_uid=0,
            expected_gid=0,
        ),
        "bootstrap": _snapshot_path(
            bootstrap_path,
            expected_mode=0o555,
            expected_uid=0,
            expected_gid=0,
            expected_bytes=installer.BOOTSTRAP_BYTES,
            expected_sha256=installer.BOOTSTRAP_SHA256,
            expected_git_blob=installer.BOOTSTRAP_GIT_BLOB_SHA1,
        ),
        "manifest": _snapshot_path(
            manifest_path,
            expected_mode=0o444,
            expected_uid=0,
            expected_gid=0,
            expected_bytes=installer.MANIFEST_BYTES,
            expected_sha256=installer.MANIFEST_SHA256,
            expected_git_blob=installer.MANIFEST_GIT_BLOB_SHA1,
        ),
        "policy": _snapshot_path(
            policy_path,
            expected_mode=0o444,
            expected_uid=0,
            expected_gid=0,
            expected_bytes=len(policy),
            expected_sha256=sha256(policy),
            expected_git_blob=None,
        ),
        "policy_sha256": sha256(policy),
        "policy_bytes": len(policy),
        "manifest_sha256": sha256(manifest),
        "manifest_bytes": len(manifest),
    }


def _run_bootstrap_self_test(
    installer: Any,
    expected_bootstrap: dict[str, Any],
) -> tuple[str, str]:
    path = installer.INSTALL_ROOT / installer.BIN_DIR / installer.BOOTSTRAP_NAME
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise QualifyError("bootstrap_self_test_path_unavailable") from exc
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened_before = os.fstat(fd)
        if not _same_stat(visible_before, opened_before):
            raise QualifyError("bootstrap_self_test_rebound")
        if _record(opened_before) != {
            key: expected_bootstrap[key]
            for key in (
                "dev", "ino", "uid", "gid", "mode",
                "nlink", "bytes", "mtime_ns", "ctime_ns"
            )
        }:
            raise QualifyError("bootstrap_self_test_generation_mismatch")

        digest = hashlib.sha256()
        os.lseek(fd, 0, os.SEEK_SET)
        remaining = opened_before.st_size
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise QualifyError("bootstrap_self_test_short_read")
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise QualifyError("bootstrap_self_test_grew")
        if digest.hexdigest() != installer.BOOTSTRAP_SHA256:
            raise QualifyError("bootstrap_self_test_digest_mismatch")
        os.lseek(fd, 0, os.SEEK_SET)

        executable = f"/proc/self/fd/{fd}"
        try:
            cp = subprocess.run(
                [executable, "--self-test"],
                executable=executable,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
                timeout=SELF_TEST_TIMEOUT_SECONDS,
                env={
                    "PATH": "/usr/bin:/bin",
                    "HOME": "/nonexistent",
                    "LANG": "C",
                    "LC_ALL": "C",
                    "TZ": "UTC",
                },
                pass_fds=(fd,),
                close_fds=True,
            )
        except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
            raise QualifyError("bootstrap_self_test_execution_failed") from exc

        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
        ):
            raise QualifyError("bootstrap_generation_changed_during_self_test")
    finally:
        os.close(fd)

    if cp.returncode != 0:
        raise QualifyError("bootstrap_self_test_nonzero_exit:" + str(cp.returncode))
    if cp.stderr != "":
        raise QualifyError("bootstrap_self_test_unexpected_stderr")
    encoded = cp.stdout.encode("utf-8")
    if len(encoded) < 1 or len(encoded) > MAX_BOOTSTRAP_OUTPUT_BYTES:
        raise QualifyError("bootstrap_self_test_output_invalid")
    lines = set(cp.stdout.splitlines())
    missing = sorted(REQUIRED_SELF_TEST_LINES - lines)
    if missing:
        raise QualifyError("bootstrap_self_test_marker_missing:" + missing[0])
    return cp.stdout, "sha256:" + hashlib.sha256(encoded).hexdigest()


def collect(expected_head: str) -> dict[str, Any]:
    if os.geteuid() != 0:
        raise QualifyError("root_required_for_installed_qualification")
    installer = _load_installer()

    before = _installed_snapshot(installer, expected_head)
    first_output, first_sha = _run_bootstrap_self_test(
        installer,
        before["bootstrap"],
    )
    middle = _installed_snapshot(installer, expected_head)
    second_output, second_sha = _run_bootstrap_self_test(
        installer,
        middle["bootstrap"],
    )
    after = _installed_snapshot(installer, expected_head)

    if before != middle or middle != after:
        raise QualifyError("installed_generation_changed_during_qualification")
    if first_output != second_output or first_sha != second_sha:
        raise QualifyError("bootstrap_self_test_output_changed")

    return {
        "version": 6,
        "read_only": True,
        "root_execution_required": True,
        "expected_head": expected_head,
        "installer_source_git_blob_sha1": INSTALLER_SOURCE_GIT_BLOB_SHA1,
        "accepted_lock_id": installer.LOCK_ID,
        "candidate_id": installer.CANDIDATE_ID,
        "protected_state": before["protected_state"],
        "installed_identity_green": True,
        "policy_generation_green": True,
        "python_generation_bound": True,
        "git_generation_bound": True,
        "checkout_generation_bound": True,
        "installed_generation_stable": True,
        "bootstrap_descriptor_bound_self_test": True,
        "bootstrap_self_test_execution": True,
        "bootstrap_self_test_count": 2,
        "bootstrap_self_test_stable": True,
        "bootstrap_self_test_sha256": first_sha,
        "bootstrap_sha256": installer.BOOTSTRAP_SHA256,
        "bootstrap_bytes": installer.BOOTSTRAP_BYTES,
        "bootstrap_git_blob_sha1": installer.BOOTSTRAP_GIT_BLOB_SHA1,
        "manifest_sha256": installer.MANIFEST_SHA256,
        "manifest_bytes": installer.MANIFEST_BYTES,
        "manifest_git_blob_sha1": installer.MANIFEST_GIT_BLOB_SHA1,
        "policy_sha256": before["policy_sha256"],
        "policy_bytes": before["policy_bytes"],
        "python_sha256": before["python"]["sha256"],
        "python_bytes": before["python"]["bytes"],
        "git_sha256": before["git_tool"]["sha256"],
        "git_bytes": before["git_tool"]["bytes"],
        "bootstrap_execution_beyond_self_test": False,
        "inner_installer_execution": False,
        "protected_installer_apply": False,
        "filesystem_write": False,
        "service_mutation": False,
        "systemd_mutation": False,
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
        "next_action": (
            "SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
            "PROTECTED_INSTALLER_BOOTSTRAP_V6_PLAN"
        ),
    }


def plan() -> None:
    installer = _load_installer()
    print(MARKER)
    print("mode=plan")
    print("root_required_for_run=true")
    print("installer_source_git_blob_sha1=" + INSTALLER_SOURCE_GIT_BLOB_SHA1)
    print("accepted_lock_id=" + installer.LOCK_ID)
    print("candidate_id=" + installer.CANDIDATE_ID)
    print("install_root=" + str(installer.INSTALL_ROOT))
    print(
        "bootstrap_path="
        + str(installer.INSTALL_ROOT / installer.BIN_DIR / installer.BOOTSTRAP_NAME)
    )
    print("manifest_path=" + str(installer.INSTALL_ROOT / installer.MANIFEST_NAME))
    print("policy_path=" + str(installer.INSTALL_ROOT / installer.POLICY_NAME))
    print("exact_expected_head_required=true")
    print("installed_root_verification_required=true")
    print("python_and_git_policy_binding_required=true")
    print("before_middle_after_stability_required=true")
    print("double_descriptor_bound_bootstrap_self_test_required=true")
    print("bootstrap_self_test_execution=false")
    print("bootstrap_execution_beyond_self_test=false")
    print("inner_installer_execution=false")
    print("protected_installer_apply=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
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
        "PROTECTED_BOOTSTRAP_V6_INSTALLED_READ_ONLY_QUALIFICATION"
    )


def source_plan() -> None:
    installer = _load_installer()
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("read_only=true")
    print("installer_source_git_blob_sha1=" + INSTALLER_SOURCE_GIT_BLOB_SHA1)
    print("accepted_lock_id=" + installer.LOCK_ID)
    print("candidate_id=" + installer.CANDIDATE_ID)
    print("double_descriptor_bound_bootstrap_self_test_required=true")
    print("bootstrap_execution_beyond_self_test=false")
    print("inner_installer_execution=false")
    print("protected_installer_apply=false")
    print("filesystem_write=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("funds_movement=false")


def self_test() -> None:
    installer = _load_installer()
    assert installer.LOCK_ID.startswith("voidbuye2dormantbootstraplock3_")
    assert installer.CANDIDATE_ID.startswith("voidbuye2dormantbootstrapcand3_")
    assert installer.BOOTSTRAP_BYTES == 874_608
    assert installer.MANIFEST_BYTES == 2382
    assert installer.POLICY_SCHEMA.endswith("BOOTSTRAP_POLICY_V6")
    assert REQUIRED_SELF_TEST_LINES
    print(MARKER + "_SELF_TEST_GREEN")
    print("installer_source_blob_bound=true")
    print("accepted_bootstrap_v6_lock_bound=true")
    print("installed_three_file_root_required=true")
    print("python_and_git_policy_binding_required=true")
    print("double_descriptor_bound_bootstrap_self_test_required=true")
    print("before_middle_after_stability_required=true")
    print("bootstrap_execution_beyond_self_test=false")
    print("inner_installer_execution=false")
    print("protected_installer_apply=false")
    print("filesystem_write=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("funds_movement=false")


def emit(result: dict[str, Any]) -> None:
    print(MARKER)
    for key in (
        "read_only",
        "root_execution_required",
        "expected_head",
        "installer_source_git_blob_sha1",
        "accepted_lock_id",
        "candidate_id",
        "protected_state",
        "installed_identity_green",
        "policy_generation_green",
        "python_generation_bound",
        "git_generation_bound",
        "checkout_generation_bound",
        "installed_generation_stable",
        "bootstrap_descriptor_bound_self_test",
        "bootstrap_self_test_execution",
        "bootstrap_self_test_count",
        "bootstrap_self_test_stable",
        "bootstrap_self_test_sha256",
        "bootstrap_sha256",
        "bootstrap_bytes",
        "bootstrap_git_blob_sha1",
        "manifest_sha256",
        "manifest_bytes",
        "manifest_git_blob_sha1",
        "policy_sha256",
        "policy_bytes",
        "python_sha256",
        "python_bytes",
        "git_sha256",
        "git_bytes",
        "bootstrap_execution_beyond_self_test",
        "inner_installer_execution",
        "protected_installer_apply",
        "filesystem_write",
        "service_mutation",
        "systemd_mutation",
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


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--run", action="store_true")
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if args.plan:
        plan()
        return 0
    if not args.expected_head:
        raise QualifyError("expected_head_required")
    emit(collect(args.expected_head))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except QualifyError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("read_only=true")
        print("filesystem_write=false")
        print("bootstrap_self_test_execution_state=unknown_or_partial_if_started")
        print("bootstrap_execution_beyond_self_test=false")
        print("inner_installer_execution=false")
        print("protected_installer_apply=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
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
        raise SystemExit(2)
