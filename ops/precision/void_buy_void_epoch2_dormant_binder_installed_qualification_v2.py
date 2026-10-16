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
INSTALLER_SOURCE = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
INSTALLER_SOURCE_GIT_BLOB_SHA1 = "f3d6b1559be7490303cf36338c4bfa38fdaa390a"

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLED_QUALIFICATION_V2"
SELF_TEST_TIMEOUT_SECONDS = 10
MAX_NATIVE_OUTPUT_BYTES = 64 * 1024
EXPECTED_NEXT_ACTION = (
    "SEPARATELY_AUTHORIZE_EPOCH2_V3R_DORMANT_CANDIDATE_LIVE_BINDING"
)


class QualificationError(RuntimeError):
    pass


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def _same_stat(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_mode == b.st_mode
        and a.st_nlink == b.st_nlink
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
    )


def _read_source(path: pathlib.Path) -> bytes:
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise QualificationError("installer_source_unavailable") from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_nlink != 1
        or visible_before.st_size < 1
        or visible_before.st_size > 2 * 1024 * 1024
    ):
        raise QualificationError("installer_source_metadata_invalid")
    try:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    except OSError as exc:
        raise QualificationError("installer_source_open_failed") from exc
    try:
        opened_before = os.fstat(fd)
        if not _same_stat(visible_before, opened_before):
            raise QualificationError("installer_source_rebound")
        chunks: list[bytes] = []
        remaining = visible_before.st_size
        while remaining:
            chunk = os.read(fd, min(256 * 1024, remaining))
            if not chunk:
                raise QualificationError("installer_source_short_read")
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise QualificationError("installer_source_grew")
        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
        ):
            raise QualificationError("installer_source_changed")
    finally:
        os.close(fd)
    return b"".join(chunks)


def _load_installer() -> Any:
    raw = _read_source(INSTALLER_SOURCE)
    if git_blob_sha1(raw) != INSTALLER_SOURCE_GIT_BLOB_SHA1:
        raise QualificationError("installer_source_blob_mismatch")
    module = types.ModuleType(
        "void_buy_void_epoch2_dormant_binder_native_protected_install_v2"
    )
    module.__file__ = str(INSTALLER_SOURCE)
    module.__package__ = ""
    try:
        code = compile(raw, str(INSTALLER_SOURCE), "exec", dont_inherit=True)
        exec(code, module.__dict__)
    except Exception as exc:
        raise QualificationError("installer_source_execution_failed") from exc
    return module


def _root_metadata(st: os.stat_result) -> dict[str, Any]:
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


def _file_snapshot(
    root_fd: int,
    name: str,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_mode: int,
) -> dict[str, Any]:
    try:
        visible_before = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
    except OSError as exc:
        raise QualificationError("installed_file_unavailable:" + name) from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_uid != 0
        or visible_before.st_gid != 0
        or stat.S_IMODE(visible_before.st_mode) != expected_mode
        or visible_before.st_nlink != 1
        or visible_before.st_size != expected_bytes
    ):
        raise QualificationError("installed_file_metadata_invalid:" + name)

    try:
        fd = os.open(
            name,
            os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=root_fd,
        )
    except OSError as exc:
        raise QualificationError("installed_file_open_failed:" + name) from exc
    try:
        opened_before = os.fstat(fd)
        if not _same_stat(visible_before, opened_before):
            raise QualificationError("installed_file_rebound:" + name)
        digest = hashlib.sha256()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise QualificationError("installed_file_short_read:" + name)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise QualificationError("installed_file_grew:" + name)
        opened_after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
        ):
            raise QualificationError("installed_file_changed:" + name)
    finally:
        os.close(fd)

    actual_sha256 = digest.hexdigest()
    if actual_sha256 != expected_sha256:
        raise QualificationError("installed_file_sha256_mismatch:" + name)
    return {
        **_root_metadata(visible_after),
        "sha256": actual_sha256,
    }


def _installed_snapshot(installer: Any, expected_head: str) -> dict[str, Any]:
    try:
        installer._verify_checkout(expected_head)
        lock = installer.accepted_lock(expected_head)
        state = installer.protected_state()
    except Exception as exc:
        raise QualificationError("installed_generation_verification_failed") from exc

    if lock.get("lock_id") != installer.LOCK_ID:
        raise QualificationError("accepted_lock_id_mismatch")
    if state != installer.GREEN_STATE:
        raise QualificationError("protected_install_not_green")

    root = installer.INSTALL_ROOT
    try:
        visible_before = root.lstat()
        root_fd = os.open(
            root,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        )
    except OSError as exc:
        raise QualificationError("installed_root_open_failed") from exc

    try:
        opened_before = os.fstat(root_fd)
        if (
            not stat.S_ISDIR(opened_before.st_mode)
            or stat.S_ISLNK(opened_before.st_mode)
            or opened_before.st_uid != 0
            or opened_before.st_gid != 0
            or stat.S_IMODE(opened_before.st_mode) != 0o755
            or not _same_stat(visible_before, opened_before)
        ):
            raise QualificationError("installed_root_metadata_invalid")

        try:
            entries = sorted(os.listdir(root_fd))
        except OSError as exc:
            raise QualificationError("installed_root_list_failed") from exc
        if entries != sorted((installer.NATIVE_NAME, installer.BINDER_NAME)):
            raise QualificationError("installed_root_entries_invalid")

        native = _file_snapshot(
            root_fd,
            installer.NATIVE_NAME,
            expected_bytes=installer.NATIVE_BYTES,
            expected_sha256=installer.NATIVE_SHA256,
            expected_mode=0o555,
        )
        binder = _file_snapshot(
            root_fd,
            installer.BINDER_NAME,
            expected_bytes=installer.BINDER_BYTES,
            expected_sha256=installer.BINDER_SHA256,
            expected_mode=0o444,
        )

        opened_after = os.fstat(root_fd)
        visible_after = root.lstat()
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
        ):
            raise QualificationError("installed_root_changed")
    finally:
        os.close(root_fd)

    return {
        "expected_head": expected_head,
        "accepted_lock_id": installer.LOCK_ID,
        "candidate_id": installer.CANDIDATE_ID,
        "protected_state": state,
        "install_root": _root_metadata(visible_after),
        "native": native,
        "binder": binder,
    }


def _native_snapshot_matches_stat(
    expected: dict[str, Any],
    st: os.stat_result,
) -> bool:
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
            raise QualificationError("native_retained_fd_short_read")
        digest.update(chunk)
        remaining -= len(chunk)
    if os.read(fd, 1):
        raise QualificationError("native_retained_fd_grew")
    os.lseek(fd, 0, os.SEEK_SET)
    return digest.hexdigest()


def _run_native_self_test(
    installer: Any,
    expected_native: dict[str, Any],
) -> tuple[str, str]:
    if os.geteuid() != 0:
        raise QualificationError("root_required_for_installed_qualification")

    try:
        visible_before = installer.NATIVE_TARGET.lstat()
        fd = os.open(
            installer.NATIVE_TARGET,
            os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW,
        )
    except OSError as exc:
        raise QualificationError("native_self_test_open_failed") from exc

    try:
        opened_before = os.fstat(fd)
        if (
            not _same_stat(visible_before, opened_before)
            or not _native_snapshot_matches_stat(expected_native, opened_before)
        ):
            raise QualificationError("native_self_test_generation_mismatch")
        digest = _hash_retained_fd(fd, installer.NATIVE_BYTES)
        if digest != installer.NATIVE_SHA256:
            raise QualificationError("native_self_test_digest_mismatch")

        exec_path = "/proc/self/fd/" + str(fd)
        try:
            completed = subprocess.run(
                [exec_path, "--self-test"],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="strict",
                env={
                    "PATH": "/usr/bin:/bin",
                    "LANG": "C",
                    "LC_ALL": "C",
                },
                cwd="/",
                timeout=SELF_TEST_TIMEOUT_SECONDS,
                check=False,
                close_fds=True,
                pass_fds=(fd,),
            )
        except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
            raise QualificationError("native_self_test_execution_failed") from exc

        opened_after = os.fstat(fd)
        try:
            visible_after = installer.NATIVE_TARGET.lstat()
        except OSError as exc:
            raise QualificationError(
                "native_visible_generation_changed_during_execution"
            ) from exc
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
            or not _native_snapshot_matches_stat(expected_native, visible_after)
        ):
            raise QualificationError(
                "native_visible_generation_changed_during_execution"
            )
    finally:
        os.close(fd)

    if completed.returncode != 0:
        raise QualificationError(
            "native_self_test_nonzero_exit:" + str(completed.returncode)
        )
    if completed.stderr != "":
        raise QualificationError("native_self_test_unexpected_stderr")

    encoded = completed.stdout.encode("utf-8")
    if len(encoded) < 1 or len(encoded) > MAX_NATIVE_OUTPUT_BYTES:
        raise QualificationError("native_self_test_output_invalid")
    required = {
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V2_SELF_TEST_GREEN",
        "native_first_instruction=true",
        "fixed_self_path=true",
        "fixed_binder_path=true",
        "binder_exact_sha256_bound=true",
        "binder_git_blob_provenance_bound=true",
        "node_policy_sha256_bound=true",
        "binder_descriptor_retained=true",
        "node_descriptor_fexecve=true",
        "private_parent_proof_channel=true",
        "caller_stdin_javascript_forbidden=true",
        "loader_environment_sanitized=true",
        "failure_truth_boundary_test_modes=true",
        "credential_content_access=false",
        "transaction=false",
        "public_presale_activation=false",
        "funds_movement=false",
    }
    lines = set(completed.stdout.splitlines())
    missing = sorted(required - lines)
    if missing:
        raise QualificationError("native_self_test_marker_missing:" + missing[0])

    return completed.stdout, "sha256:" + hashlib.sha256(encoded).hexdigest()


def collect(expected_head: str) -> dict[str, Any]:
    if os.geteuid() != 0:
        raise QualificationError("root_required_for_installed_qualification")
    installer = _load_installer()

    before = _installed_snapshot(installer, expected_head)
    first_output, first_sha = _run_native_self_test(
        installer,
        before["native"],
    )
    middle = _installed_snapshot(installer, expected_head)
    second_output, second_sha = _run_native_self_test(
        installer,
        middle["native"],
    )
    after = _installed_snapshot(installer, expected_head)

    if before != middle or middle != after:
        raise QualificationError("installed_generation_changed_during_qualification")
    if first_output != second_output or first_sha != second_sha:
        raise QualificationError("native_self_test_output_changed")

    return {
        "marker": MARKER,
        "version": 2,
        "read_only": True,
        "root_execution_required": True,
        "accepted_lock_id": installer.LOCK_ID,
        "candidate_id": installer.CANDIDATE_ID,
        "expected_head": expected_head,
        "protected_install_verified": True,
        "installed_generation_stable": True,
        "retained_stage_custody_source_bound": True,
        "native_self_test_execution": True,
        "native_self_test_descriptor_bound": True,
        "native_self_test_stable": True,
        "native_self_test_sha256": first_sha,
        "native_sha256": installer.NATIVE_SHA256,
        "native_bytes": installer.NATIVE_BYTES,
        "binder_git_blob_sha1": installer.BINDER_GIT_BLOB_SHA1,
        "binder_sha256": installer.BINDER_SHA256,
        "binder_bytes": installer.BINDER_BYTES,
        "binder_execution": False,
        "live_binding_execution": False,
        "credential_access": False,
        "private_key_access": False,
        "signing": False,
        "transaction": False,
        "payment_acceptance": False,
        "customer_safe_to_pay": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "treasury_liquidity_action": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
        "next_action": EXPECTED_NEXT_ACTION,
    }


def self_test() -> None:
    installer = _load_installer()
    assert installer.INSTALL_ROOT == pathlib.Path(
        "/opt/void-buy-void-epoch2-dormant-v3r-binding-v2"
    )
    assert installer.NATIVE_TARGET.parent == installer.INSTALL_ROOT
    assert installer.BINDER_TARGET.parent == installer.INSTALL_ROOT
    assert installer.GREEN_STATE == "DORMANT_BINDER_NATIVE_PAIR_GREEN"
    assert installer.LOCK_ID == (
        "voidbuye2dormantbinderlock3_"
        "a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a"
    )
    assert installer.CANDIDATE_ID == (
        "voidbuye2dormantbindercand2_"
        "8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"
    )
    assert installer.NATIVE_BYTES == 726_976
    assert installer.BINDER_BYTES == 39_391
    assert installer.NATIVE_SHA256 == (
        "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
    )
    assert installer.BINDER_SHA256 == (
        "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e"
    )
    assert installer.BINDER_GIT_BLOB_SHA1 == (
        "9c29eb4716077e459b9154f39d0f30cf2e56729f"
    )


def plan() -> None:
    installer = _load_installer()
    print(MARKER)
    print("mode=plan")
    print("root_required_for_run=true")
    print("expected_head_required=true")
    print("accepted_lock_id=" + installer.LOCK_ID)
    print("candidate_id=" + installer.CANDIDATE_ID)
    print("install_root=" + str(installer.INSTALL_ROOT))
    print("native_path=" + str(installer.NATIVE_TARGET))
    print("binder_path=" + str(installer.BINDER_TARGET))
    print("protected_install_verification_required=true")
    print("installed_generation_stability_required=true")
    print("retained_stage_custody_source_required=true")
    print("double_native_self_test_required=true")
    print("descriptor_bound_native_self_test_required=true")
    print("native_self_test_execution=false")
    print("binder_execution=false")
    print("live_binding_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("customer_safe_to_pay=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print(
        "next_action="
        "SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_BINDER_INSTALLED_READ_ONLY_QUALIFICATION_V2"
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
        print(MARKER + "_SELF_TEST_GREEN")
        print("installer_source_blob_bound=true")
        print("binder_execution=false")
        print("transaction=false")
        print("funds_movement=false")
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
        "expected_head",
        "protected_install_verified",
        "installed_generation_stable",
        "retained_stage_custody_source_bound",
        "native_self_test_execution",
        "native_self_test_descriptor_bound",
        "native_self_test_stable",
        "native_self_test_sha256",
        "native_sha256",
        "native_bytes",
        "binder_git_blob_sha1",
        "binder_sha256",
        "binder_bytes",
        "binder_execution",
        "live_binding_execution",
        "credential_access",
        "private_key_access",
        "signing",
        "transaction",
        "payment_acceptance",
        "customer_safe_to_pay",
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
        + json.dumps(
            result,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except QualificationError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("native_self_test_execution_state=unknown_or_partial")
        print("binder_execution=false")
        print("live_binding_execution=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("payment_acceptance=false")
        print("customer_safe_to_pay=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
