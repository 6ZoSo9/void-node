#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import types
import json
import os
import pathlib
import stat
import subprocess
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
INSTALLER_SOURCE = (
    ROOT / "ops/precision/void_buy_void_user_manager_query_protected_install_v1.py"
)
INSTALLER_SOURCE_GIT_BLOB_SHA1 = "2ec35012283f729aac073735ac37cde3464c81a4"
V3_PARSER_SOURCE = ROOT / "tools/void-buy-allocation-custody-host-evidence-v3.mjs"
V3_PARSER_GIT_BLOB_SHA1 = "eae92c7dd060b4d6139543463b5fbd2f8564585b"

MARKER = "VOID_BUY_VOID_USER_MANAGER_QUERY_LIVE_QUALIFICATION_V1"
NATIVE_MARKER = "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V1_GREEN"
RUNTIME_UID = 1000
RUNTIME_GID = 1000
RUNTIME_UNIT = "void-node-live.service"
EXPECTED_CONTROL_GROUP = (
    "/user.slice/user-1000.slice/user@1000.service/app.slice/"
    "void-node-live.service"
)
MAX_NATIVE_OUTPUT_BYTES = 64 * 1024
QUERY_TIMEOUT_SECONDS = 10

TRUE_KEYS = frozenset(
    {
        "manager_peer_authenticated",
        "same_private_fd_used_for_query",
        "sanitized_loader_environment",
        "libsystemd_fixed_path_verified",
        "libsystemd_retained_fd_load",
        "libsystemd_symbol_provenance_verified",
        "service_pidfd_retained",
        "manager_pidfd_retained",
        "runtime_main_pid_kernel_bound",
        "manager_generation_reverified",
        "service_generation_reverified",
    }
)
FALSE_KEYS = frozenset(
    {
        "host_mutation",
        "payment_acceptance",
        "public_presale_activation",
        "funds_movement",
    }
)
EXACT_KEYS = (
    "runtime_uid",
    "manager_pid",
    "manager_gid",
    "manager_start_ticks",
    "manager_peer_authenticated",
    "same_private_fd_used_for_query",
    "sanitized_loader_environment",
    "libsystemd_fixed_path_verified",
    "libsystemd_retained_fd_load",
    "libsystemd_symbol_provenance_verified",
    "runtime_service_unit",
    "LoadState",
    "ActiveState",
    "SubState",
    "User",
    "Group",
    "MainPID",
    "ControlGroup",
    "NoNewPrivileges",
    "CapabilityBoundingSet",
    "AmbientCapabilities",
    "service_ppid",
    "service_start_ticks",
    "service_pidfd_retained",
    "manager_pidfd_retained",
    "runtime_main_pid_kernel_bound",
    "manager_generation_reverified",
    "service_generation_reverified",
    "host_mutation",
    "payment_acceptance",
    "public_presale_activation",
    "funds_movement",
)
INTEGER_KEYS = (
    "runtime_uid",
    "manager_pid",
    "manager_gid",
    "manager_start_ticks",
    "MainPID",
    "service_ppid",
    "service_start_ticks",
)


class QualificationError(RuntimeError):
    pass


def git_blob_sha1(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _direct_source_bytes(path: pathlib.Path) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualificationError("dependency_source_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
    ):
        raise QualificationError("dependency_source_not_direct_single_link")
    raw = path.read_bytes()
    try:
        after = path.lstat()
    except OSError as exc:
        raise QualificationError("dependency_source_changed") from exc
    if (
        before.st_dev != after.st_dev
        or before.st_ino != after.st_ino
        or before.st_mode != after.st_mode
        or before.st_uid != after.st_uid
        or before.st_gid != after.st_gid
        or before.st_nlink != after.st_nlink
        or before.st_size != after.st_size
        or before.st_mtime_ns != after.st_mtime_ns
        or before.st_ctime_ns != after.st_ctime_ns
    ):
        raise QualificationError("dependency_source_changed")
    return raw


def _module_from_authenticated_source(
    raw: bytes,
    source_path: pathlib.Path,
):
    module = types.ModuleType(
        "void_buy_void_user_manager_query_protected_install_v1"
    )
    module.__file__ = str(source_path)
    module.__package__ = ""
    code = compile(raw, str(source_path), "exec", dont_inherit=True)
    exec(code, module.__dict__)
    return module


def _load_installer():
    raw = _direct_source_bytes(INSTALLER_SOURCE)
    if git_blob_sha1(raw) != INSTALLER_SOURCE_GIT_BLOB_SHA1:
        raise QualificationError("installer_source_blob_mismatch")
    parser_raw = _direct_source_bytes(V3_PARSER_SOURCE)
    if git_blob_sha1(parser_raw) != V3_PARSER_GIT_BLOB_SHA1:
        raise QualificationError("v3_parser_source_blob_mismatch")

    module = _module_from_authenticated_source(raw, INSTALLER_SOURCE)
    module.accepted_lock()
    return module


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


def _installed_file_snapshot(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
) -> dict[str, Any]:
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise QualificationError("installed_file_unavailable:" + path.name) from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_uid != 0
        or visible_before.st_gid != 0
        or stat.S_IMODE(visible_before.st_mode) != 0o555
        or visible_before.st_nlink != 1
        or visible_before.st_size != expected_bytes
    ):
        raise QualificationError("installed_file_metadata_invalid:" + path.name)

    try:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    except OSError as exc:
        raise QualificationError("installed_file_open_failed:" + path.name) from exc
    try:
        opened_before = os.fstat(fd)
        if not _same_stat(visible_before, opened_before):
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
        if not _same_stat(opened_before, opened_after) or not _same_stat(
            opened_after, visible_after
        ):
            raise QualificationError("installed_file_changed:" + path.name)
    finally:
        os.close(fd)

    if digest.hexdigest() != expected_sha256:
        raise QualificationError("installed_file_sha256_mismatch:" + path.name)
    return {
        "dev": visible_after.st_dev,
        "ino": visible_after.st_ino,
        "uid": visible_after.st_uid,
        "gid": visible_after.st_gid,
        "mode": format(stat.S_IMODE(visible_after.st_mode), "04o"),
        "nlink": visible_after.st_nlink,
        "size": visible_after.st_size,
        "mtime_ns": visible_after.st_mtime_ns,
        "ctime_ns": visible_after.st_ctime_ns,
        "sha256": "sha256:" + expected_sha256,
    }


def installed_pair_snapshot(installer: Any) -> dict[str, Any]:
    installer._trusted_root_directory(pathlib.Path("/"))
    installer._trusted_root_directory(pathlib.Path("/opt"))
    installer._trusted_root_directory(installer.INSTALL_ROOT, exact_mode=0o755)
    return {
        "install_root": str(installer.INSTALL_ROOT),
        "preexec": _installed_file_snapshot(
            installer.PREEXEC_TARGET,
            expected_bytes=installer.PREEXEC_BYTES,
            expected_sha256=installer.PREEXEC_SHA256,
        ),
        "query": _installed_file_snapshot(
            installer.QUERY_TARGET,
            expected_bytes=installer.QUERY_BYTES,
            expected_sha256=installer.QUERY_SHA256,
        ),
    }


def _positive_integer(raw: str, key: str) -> int:
    if not raw or not raw.isascii() or not raw.isdigit() or raw.startswith("0"):
        raise QualificationError("native_integer_invalid:" + key)
    value = int(raw)
    if value <= 0 or value > 0x7FFF_FFFF_FFFF_FFFF:
        raise QualificationError("native_integer_invalid:" + key)
    return value


def parse_native_output(text: str) -> dict[str, str]:
    if (
        not isinstance(text, str)
        or len(text.encode("utf-8")) < 2
        or len(text.encode("utf-8")) > MAX_NATIVE_OUTPUT_BYTES
        or "\x00" in text
    ):
        raise QualificationError("native_output_invalid")

    lines = text.split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    if not lines or lines.pop(0) != NATIVE_MARKER:
        raise QualificationError("native_marker_invalid")

    out: dict[str, str] = {}
    allowed = set(EXACT_KEYS)
    for line in lines:
        at = line.find("=")
        if at <= 0:
            raise QualificationError("native_output_invalid")
        key = line[:at]
        value = line[at + 1 :]
        if key not in allowed or key in out:
            raise QualificationError("native_output_shape_invalid")
        out[key] = value
    if set(out) != allowed or len(out) != len(EXACT_KEYS):
        raise QualificationError("native_output_shape_invalid")

    for key in TRUE_KEYS:
        if out[key] != "true":
            raise QualificationError("native_truth_invalid:" + key)
    for key in FALSE_KEYS:
        if out[key] != "false":
            raise QualificationError("native_non_authority_invalid:" + key)
    for key in INTEGER_KEYS:
        _positive_integer(out[key], key)

    if int(out["runtime_uid"]) != RUNTIME_UID:
        raise QualificationError("runtime_uid_mismatch")
    if int(out["manager_gid"]) != RUNTIME_GID:
        raise QualificationError("manager_gid_mismatch")
    if out["runtime_service_unit"] != RUNTIME_UNIT:
        raise QualificationError("runtime_unit_mismatch")
    if out["LoadState"] != "loaded":
        raise QualificationError("runtime_load_state_invalid")
    if out["ActiveState"] != "active" or out["SubState"] != "running":
        raise QualificationError("runtime_active_state_invalid")
    if out["User"] != "" or out["Group"] != "":
        raise QualificationError("runtime_implicit_user_identity_invalid")
    if int(out["service_ppid"]) != int(out["manager_pid"]):
        raise QualificationError("runtime_direct_parent_invalid")
    if out["ControlGroup"] != EXPECTED_CONTROL_GROUP:
        raise QualificationError("runtime_control_group_invalid")
    if out["NoNewPrivileges"] != "yes":
        raise QualificationError("runtime_no_new_privileges_invalid")
    if out["CapabilityBoundingSet"] != "" or out["AmbientCapabilities"] != "":
        raise QualificationError("runtime_capability_set_invalid")
    return out


def run_authenticated_query(installer: Any) -> tuple[dict[str, str], str]:
    if os.geteuid() != 0:
        raise QualificationError("root_required_for_live_query")
    env = {
        "PATH": "/usr/bin:/bin",
        "LANG": "C",
        "LC_ALL": "C",
    }
    try:
        completed = subprocess.run(
            [
                str(installer.PREEXEC_TARGET),
                "--uid",
                str(RUNTIME_UID),
                "--unit",
                RUNTIME_UNIT,
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
            env=env,
            cwd="/",
            timeout=QUERY_TIMEOUT_SECONDS,
            check=False,
            close_fds=True,
        )
    except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
        raise QualificationError("authenticated_query_execution_failed") from exc
    if completed.returncode != 0:
        raise QualificationError(
            "authenticated_query_nonzero_exit:" + str(completed.returncode)
        )
    if completed.stderr != "":
        raise QualificationError("authenticated_query_unexpected_stderr")
    parsed = parse_native_output(completed.stdout)
    return parsed, "sha256:" + sha256(completed.stdout.encode("utf-8"))


def _stable_identity(native: dict[str, str]) -> dict[str, Any]:
    return {
        "runtime_uid": int(native["runtime_uid"]),
        "manager_pid": int(native["manager_pid"]),
        "manager_gid": int(native["manager_gid"]),
        "manager_start_ticks": native["manager_start_ticks"],
        "main_pid": int(native["MainPID"]),
        "service_ppid": int(native["service_ppid"]),
        "service_start_ticks": native["service_start_ticks"],
        "control_group": native["ControlGroup"],
    }


def collect() -> dict[str, Any]:
    installer = _load_installer()
    before = installed_pair_snapshot(installer)
    first, first_sha = run_authenticated_query(installer)
    middle = installed_pair_snapshot(installer)
    second, second_sha = run_authenticated_query(installer)
    after = installed_pair_snapshot(installer)

    if before != middle or middle != after:
        raise QualificationError("installed_pair_changed_during_qualification")
    first_identity = _stable_identity(first)
    second_identity = _stable_identity(second)
    if first_identity != second_identity:
        raise QualificationError("authenticated_runtime_generation_changed")
    if first != second:
        raise QualificationError("authenticated_native_evidence_changed")

    identity = first_identity
    return {
        "marker": MARKER,
        "version": 1,
        "read_only": True,
        "root_execution_required": True,
        "protected_install_verified": True,
        "accepted_lock_id": installer.LOCK_ID,
        "installed_pair_stable": True,
        "authenticated_private_manager_peer": True,
        "same_authenticated_connection_unit_query": True,
        "runtime_user_manager_identity_verified": True,
        "runtime_user_manager_cgroup_bound": True,
        "runtime_main_pid_kernel_bound": True,
        "manager_and_service_pidfds_retained_by_native_query": True,
        "manager_and_service_generation_reverified_by_native_query": True,
        "double_authenticated_query_stable": True,
        "native_output_sha256_first": first_sha,
        "native_output_sha256_second": second_sha,
        **identity,
        "query_execution": True,
        "host_mutation": False,
        "filesystem_write": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "external_network_calls": False,
        "credential_access": False,
        "private_key_access": False,
        "wallet_or_signer_access": False,
        "rpc_call": False,
        "transaction_signing": False,
        "transaction_broadcast": False,
        "request_or_payment_contents_read": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
        "next_action": "BIND_AUTHENTICATED_MAINPID_IN_REQUEST_ROOT_CENSUS",
    }


def synthetic_native_output() -> str:
    values = {
        "runtime_uid": "1000",
        "manager_pid": "2693",
        "manager_gid": "1000",
        "manager_start_ticks": "1409",
        "manager_peer_authenticated": "true",
        "same_private_fd_used_for_query": "true",
        "sanitized_loader_environment": "true",
        "libsystemd_fixed_path_verified": "true",
        "libsystemd_retained_fd_load": "true",
        "libsystemd_symbol_provenance_verified": "true",
        "runtime_service_unit": RUNTIME_UNIT,
        "LoadState": "loaded",
        "ActiveState": "active",
        "SubState": "running",
        "User": "",
        "Group": "",
        "MainPID": "4242",
        "ControlGroup": EXPECTED_CONTROL_GROUP,
        "NoNewPrivileges": "yes",
        "CapabilityBoundingSet": "",
        "AmbientCapabilities": "",
        "service_ppid": "2693",
        "service_start_ticks": "998877",
        "service_pidfd_retained": "true",
        "manager_pidfd_retained": "true",
        "runtime_main_pid_kernel_bound": "true",
        "manager_generation_reverified": "true",
        "service_generation_reverified": "true",
        "host_mutation": "false",
        "payment_acceptance": "false",
        "public_presale_activation": "false",
        "funds_movement": "false",
    }
    return NATIVE_MARKER + "\n" + "".join(
        key + "=" + values[key] + "\n" for key in EXACT_KEYS
    )


def self_test() -> None:
    installer = _load_installer()
    assert installer.PREEXEC_TARGET == pathlib.Path(
        "/opt/void-buy-void-user-manager-query-v1/"
        "void_buy_void_user_manager_private_unit_query_preexec_v1"
    )
    parsed = parse_native_output(synthetic_native_output())
    assert parsed["manager_peer_authenticated"] == "true"
    assert parsed["MainPID"] == "4242"
    assert _stable_identity(parsed)["service_start_ticks"] == "998877"

    bad = synthetic_native_output().replace(
        "manager_peer_authenticated=true",
        "manager_peer_authenticated=false",
    )
    try:
        parse_native_output(bad)
    except QualificationError as exc:
        assert str(exc) == "native_truth_invalid:manager_peer_authenticated"
    else:
        raise AssertionError("unauthenticated manager peer must hold")

    extra = synthetic_native_output() + "unexpected=value\n"
    try:
        parse_native_output(extra)
    except QualificationError:
        pass
    else:
        raise AssertionError("extra native field must hold")


def plan() -> None:
    installer = _load_installer()
    print(MARKER)
    print("mode=plan")
    print("root_required_for_run=true")
    print("fixed_preexec=" + str(installer.PREEXEC_TARGET))
    print("fixed_query=" + str(installer.QUERY_TARGET))
    print("accepted_lock_id=" + installer.LOCK_ID)
    print("installed_pair_verification_required=true")
    print("double_authenticated_query_required=true")
    print("same_authenticated_connection_unit_query_required=true")
    print("runtime_main_pid_kernel_binding_required=true")
    print("query_execution=false")
    print("host_mutation=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("external_network_calls=false")
    print("credential_access=false")
    print("wallet_or_signer_access=false")
    print("request_or_payment_contents_read=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("next_action=SEPARATELY_AUTHORIZE_READ_ONLY_LIVE_QUALIFICATION")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--run", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print(MARKER + "_SELF_TEST_GREEN")
        return 0
    if args.plan:
        plan()
        return 0

    result = collect()
    print(MARKER)
    for key in (
        "read_only",
        "root_execution_required",
        "protected_install_verified",
        "installed_pair_stable",
        "authenticated_private_manager_peer",
        "same_authenticated_connection_unit_query",
        "runtime_user_manager_identity_verified",
        "runtime_user_manager_cgroup_bound",
        "runtime_main_pid_kernel_bound",
        "double_authenticated_query_stable",
        "manager_pid",
        "manager_start_ticks",
        "main_pid",
        "service_start_ticks",
        "control_group",
        "query_execution",
        "host_mutation",
        "filesystem_write",
        "service_mutation",
        "systemd_mutation",
        "external_network_calls",
        "credential_access",
        "wallet_or_signer_access",
        "request_or_payment_contents_read",
        "payment_acceptance",
        "public_presale_activation",
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
        print("query_execution_state=unknown_or_partial")
        print("host_mutation=false")
        print("filesystem_write=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("external_network_calls=false")
        print("credential_access=false")
        print("wallet_or_signer_access=false")
        print("request_or_payment_contents_read=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
