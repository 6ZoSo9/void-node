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
    "void_buy_void_epoch2_live_composition_native_protected_install_v5.py"
)
INSTALLER_SOURCE_GIT_BLOB_SHA1 = "2f1a834e378c3ae8062140079c43beb16fad9d14"

MARKER = "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V4"
MAX_NATIVE_OUTPUT_BYTES = 64 * 1024
SELF_TEST_TIMEOUT_SECONDS = 10


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


def _direct_source_bytes(path: pathlib.Path) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualificationError("installer_source_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > 2 * 1024 * 1024
    ):
        raise QualificationError("installer_source_metadata_invalid")
    raw = path.read_bytes()
    after = path.lstat()
    if not _same_stat(before, after):
        raise QualificationError("installer_source_changed")
    return raw


def _load_installer():
    raw = _direct_source_bytes(INSTALLER_SOURCE)
    if git_blob_sha1(raw) != INSTALLER_SOURCE_GIT_BLOB_SHA1:
        raise QualificationError("installer_source_blob_mismatch")
    module = types.ModuleType(
        "void_buy_void_epoch2_live_composition_native_protected_install_v4"
    )
    module.__file__ = str(INSTALLER_SOURCE)
    module.__package__ = ""
    code = compile(raw, str(INSTALLER_SOURCE), "exec", dont_inherit=True)
    exec(code, module.__dict__)
    return module


def _hash_file(path: pathlib.Path, expected_bytes: int) -> str:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualificationError("installed_file_unavailable:" + path.name) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size != expected_bytes
    ):
        raise QualificationError("installed_file_metadata_invalid:" + path.name)
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened_before = os.fstat(fd)
        if not _same_stat(before, opened_before):
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
        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
        ):
            raise QualificationError("installed_file_changed:" + path.name)
    finally:
        os.close(fd)
    return digest.hexdigest()


def _installed_snapshot(installer: Any, expected_head: str) -> dict[str, Any]:
    try:
        installer.accepted_lock()
        checkout = installer.checkout_snapshot(expected_head)
        git_tool = installer._file_snapshot(
            installer.FIXED_GIT,
            maximum_bytes=64 * 1024 * 1024,
            executable=True,
        )
        setpriv_tool = installer._file_snapshot(
            installer.FIXED_SETPRIV,
            maximum_bytes=64 * 1024 * 1024,
            executable=True,
        )
        node = installer.node_snapshot()
        policy = installer.build_policy(expected_head, node)
        state = installer.protected_state(policy)
    except Exception as exc:
        raise QualificationError("installed_generation_verification_failed") from exc

    if state != installer.GREEN_STATE:
        raise QualificationError("protected_upgrade_not_green")

    native_sha = _hash_file(installer.NATIVE_TARGET, installer.NATIVE_BYTES)
    runner_sha = _hash_file(installer.RUNNER_TARGET, installer.RUNNER_BYTES)
    policy_sha = _hash_file(installer.POLICY_TARGET, len(policy))

    predecessor_native_path = installer.PREDECESSOR_ROOT / installer.NATIVE_NAME
    predecessor_runner_path = installer.PREDECESSOR_ROOT / installer.RUNNER_NAME
    predecessor_policy_path = installer.PREDECESSOR_ROOT / installer.POLICY_NAME
    predecessor_native_sha = _hash_file(
        predecessor_native_path, installer.PREDECESSOR_NATIVE_BYTES
    )
    predecessor_runner_sha = _hash_file(
        predecessor_runner_path, installer.PREDECESSOR_RUNNER_BYTES
    )
    predecessor_policy_sha = _hash_file(
        predecessor_policy_path, installer.PREDECESSOR_POLICY_BYTES
    )

    if native_sha != installer.NATIVE_SHA256:
        raise QualificationError("installed_native_sha256_mismatch")
    if runner_sha != installer.RUNNER_SHA256:
        raise QualificationError("installed_runner_sha256_mismatch")
    if policy_sha != hashlib.sha256(policy).hexdigest():
        raise QualificationError("installed_policy_sha256_mismatch")
    if predecessor_native_sha != installer.PREDECESSOR_NATIVE_SHA256:
        raise QualificationError("predecessor_native_sha256_mismatch")
    if predecessor_runner_sha != installer.PREDECESSOR_RUNNER_SHA256:
        raise QualificationError("predecessor_runner_sha256_mismatch")
    if predecessor_policy_sha != installer.PREDECESSOR_POLICY_SHA256:
        raise QualificationError("predecessor_policy_sha256_mismatch")

    root = installer.INSTALL_ROOT.lstat()
    native = installer.NATIVE_TARGET.lstat()
    runner = installer.RUNNER_TARGET.lstat()
    policy_st = installer.POLICY_TARGET.lstat()
    predecessor_root = installer.PREDECESSOR_ROOT.lstat()
    predecessor_native = predecessor_native_path.lstat()
    predecessor_runner = predecessor_runner_path.lstat()
    predecessor_policy = predecessor_policy_path.lstat()

    def root_record(st: os.stat_result) -> dict[str, Any]:
        return {
            "dev": st.st_dev,
            "ino": st.st_ino,
            "uid": st.st_uid,
            "gid": st.st_gid,
            "mode": format(stat.S_IMODE(st.st_mode), "04o"),
            "mtime_ns": st.st_mtime_ns,
            "ctime_ns": st.st_ctime_ns,
        }

    def file_record(st: os.stat_result, digest: str) -> dict[str, Any]:
        return {
            **root_record(st),
            "nlink": st.st_nlink,
            "bytes": st.st_size,
            "sha256": digest,
        }

    return {
        "protected_state": state,
        "expected_head": expected_head,
        "checkout": checkout,
        "git_tool": git_tool,
        "setpriv_tool": setpriv_tool,
        "node": node,
        "install_root": root_record(root),
        "native": file_record(native, native_sha),
        "runner": file_record(runner, runner_sha),
        "policy": file_record(policy_st, policy_sha),
        "predecessor_root": root_record(predecessor_root),
        "predecessor_native": file_record(predecessor_native, predecessor_native_sha),
        "predecessor_runner": file_record(predecessor_runner, predecessor_runner_sha),
        "predecessor_policy": file_record(predecessor_policy, predecessor_policy_sha),
    }


def _native_snapshot_matches_stat(expected: dict[str, Any], st: os.stat_result) -> bool:
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
    *,
    _test_before_exec_hook: Any = None,
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
        digest = _hash_retained_fd(fd, opened_before.st_size)
        if (
            digest != expected_native.get("sha256")
            or digest != installer.NATIVE_SHA256
            or opened_before.st_size != installer.NATIVE_BYTES
        ):
            raise QualificationError("native_self_test_digest_mismatch")

        if _test_before_exec_hook is not None:
            _test_before_exec_hook()

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
                env={"PATH": "/usr/bin:/bin", "LANG": "C", "LC_ALL": "C"},
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
        if not _same_stat(opened_before, opened_after):
            raise QualificationError(
                "native_retained_generation_changed_during_execution"
            )
        if (
            not _same_stat(opened_after, visible_after)
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
        "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_SELF_TEST_GREEN",
        "fixed_self_path=true",
        "fixed_runner_path=true",
        "fixed_node_path=true",
        "root_owned_policy_required=true",
        "runner_sha256_policy_bound=true",
        "node_sha256_policy_bound=true",
        "expected_head_policy_bound=true",
        "runner_descriptor_retained=true",
        "node_descriptor_fexecve=true",
        "stdin_javascript_source_forbidden=true",
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
    first_output, first_sha = _run_native_self_test(installer, before["native"])
    middle = _installed_snapshot(installer, expected_head)
    second_output, second_sha = _run_native_self_test(installer, middle["native"])
    after = _installed_snapshot(installer, expected_head)

    if before != middle or middle != after:
        raise QualificationError("installed_generation_changed_during_qualification")
    if first_output != second_output or first_sha != second_sha:
        raise QualificationError("native_self_test_output_changed")

    return {
        "marker": MARKER,
        "version": 4,
        "read_only": True,
        "root_execution_required": True,
        "accepted_lock_id": installer.LOCK_ID,
        "candidate_id": installer.CANDIDATE_ID,
        "expected_head": expected_head,
        "protected_upgrade_verified": True,
        "installed_generation_stable": True,
        "predecessor_generation_retained": True,
        "predecessor_generation_stable": True,
        "node_generation_bound": True,
        "checkout_generation_bound": True,
        "git_generation_bound": True,
        "setpriv_generation_bound": True,
        "native_self_test_execution": True,
        "native_self_test_descriptor_bound": True,
        "native_self_test_stable": True,
        "native_self_test_sha256": first_sha,
        "native_sha256": installer.NATIVE_SHA256,
        "native_bytes": installer.NATIVE_BYTES,
        "runner_sha256": installer.RUNNER_SHA256,
        "runner_bytes": installer.RUNNER_BYTES,
        "policy_sha256": before["policy"]["sha256"],
        "predecessor_native_sha256": installer.PREDECESSOR_NATIVE_SHA256,
        "predecessor_native_bytes": installer.PREDECESSOR_NATIVE_BYTES,
        "predecessor_runner_sha256": installer.PREDECESSOR_RUNNER_SHA256,
        "predecessor_runner_bytes": installer.PREDECESSOR_RUNNER_BYTES,
        "predecessor_policy_sha256": installer.PREDECESSOR_POLICY_SHA256,
        "predecessor_policy_bytes": installer.PREDECESSOR_POLICY_BYTES,
        "node_sha256": before["node"]["sha256"],
        "node_bytes": before["node"]["bytes"],
        "runner_execution": False,
        "live_composition_execution": False,
        "credential_access": False,
        "private_key_access": False,
        "signing": False,
        "transaction": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "treasury_liquidity_action": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
        "next_action": "SEPARATELY_AUTHORIZE_EPOCH2_V6R2_NATIVE_LIVE_COMPOSITION_V3",
    }


def self_test() -> None:
    installer = _load_installer()
    assert installer.LOCK_ID.startswith("voidbuye2nativecandlock6r2_")
    assert installer.GREEN_STATE == (
        "EPOCH2_LIVE_COMPOSITION_V3_V6R2_GREEN_WITH_V4_PREDECESSOR"
    )
    assert installer.NATIVE_TARGET == pathlib.Path(
        "/opt/void-buy-void-epoch2-live-composition-v3/"
        "void_buy_void_epoch2_live_composition_native_preentry_v3"
    )
    assert installer.PREDECESSOR_ROOT == pathlib.Path(
        "/opt/.void-buy-void-epoch2-live-composition-v3.predecessor-v4"
    )
    assert installer.NATIVE_BYTES == 726_976
    assert installer.RUNNER_BYTES == 45_147
    assert installer.PREDECESSOR_NATIVE_BYTES == 722_880
    assert installer.PREDECESSOR_RUNNER_BYTES == 40_616
    assert installer.PREDECESSOR_POLICY_BYTES == 305


def plan() -> None:
    installer = _load_installer()
    print(MARKER)
    print("mode=plan")
    print("root_required_for_run=true")
    print("accepted_lock_id=" + installer.LOCK_ID)
    print("candidate_id=" + installer.CANDIDATE_ID)
    print("install_root=" + str(installer.INSTALL_ROOT))
    print("predecessor_root=" + str(installer.PREDECESSOR_ROOT))
    print("native_path=" + str(installer.NATIVE_TARGET))
    print("runner_path=" + str(installer.RUNNER_TARGET))
    print("policy_path=" + str(installer.POLICY_TARGET))
    print("exact_expected_head_required=true")
    print("installed_generation_verification_required=true")
    print("retained_predecessor_verification_required=true")
    print("node_generation_binding_required=true")
    print("checkout_generation_binding_required=true")
    print("double_native_self_test_required=true")
    print("descriptor_bound_native_self_test_required=true")
    print("native_self_test_execution=false")
    print("runner_execution=false")
    print("live_composition_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R2_NATIVE_INSTALLED_READ_ONLY_QUALIFICATION")


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
        "protected_upgrade_verified",
        "installed_generation_stable",
        "predecessor_generation_retained",
        "predecessor_generation_stable",
        "node_generation_bound",
        "checkout_generation_bound",
        "git_generation_bound",
        "setpriv_generation_bound",
        "native_self_test_execution",
        "native_self_test_descriptor_bound",
        "native_self_test_stable",
        "native_self_test_sha256",
        "native_sha256",
        "native_bytes",
        "runner_sha256",
        "runner_bytes",
        "policy_sha256",
        "predecessor_native_sha256",
        "predecessor_native_bytes",
        "predecessor_runner_sha256",
        "predecessor_runner_bytes",
        "predecessor_policy_sha256",
        "predecessor_policy_bytes",
        "node_sha256",
        "node_bytes",
        "runner_execution",
        "live_composition_execution",
        "credential_access",
        "private_key_access",
        "signing",
        "transaction",
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
        print("native_self_test_execution_state=unknown_or_partial")
        print("runner_execution=false")
        print("live_composition_execution=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
