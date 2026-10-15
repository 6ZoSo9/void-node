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
REPLACE_SOURCE = (
    ROOT / "ops/precision/void_buy_void_user_manager_query_protected_replace_v6.py"
)
REPLACE_SOURCE_GIT_BLOB_SHA1 = "dd4f1a9d83d95a70f2190d4b64afd14d0fabcbcf"
V4_PARSER_SOURCE = ROOT / "tools/void-buy-allocation-custody-host-evidence-v4.mjs"
V4_PARSER_GIT_BLOB_SHA1 = "223a8acf32f8c7961d61222b83c0db17075f86c6"

MARKER = "VOID_BUY_VOID_USER_MANAGER_QUERY_LIVE_QUALIFICATION_V6"
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
ZERO_HEX = "0000000000000000"

TRUE_KEYS = frozenset(
    {
        "manager_peer_authenticated",
        "same_private_fd_used_for_query",
        "sanitized_loader_environment",
        "libsystemd_fixed_path_verified",
        "libsystemd_retained_fd_load",
        "libsystemd_symbol_provenance_verified",
        "capability_bounding_set_kernel_match",
        "process_nonbounding_capabilities_zero",
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
    "PrivateUsers",
    "CapabilityBoundingSet",
    "AmbientCapabilities",
    "KernelCapInh",
    "KernelCapPrm",
    "KernelCapEff",
    "KernelCapBnd",
    "KernelCapAmb",
    "KernelNoNewPrivs",
    "capability_bounding_set_kernel_match",
    "process_nonbounding_capabilities_zero",
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
HEX_KEYS = (
    "CapabilityBoundingSet",
    "AmbientCapabilities",
    "KernelCapInh",
    "KernelCapPrm",
    "KernelCapEff",
    "KernelCapBnd",
    "KernelCapAmb",
)


class QualificationError(RuntimeError):
    pass


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _direct_source_bytes(path: pathlib.Path) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualificationError("dependency_source_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
    ):
        raise QualificationError("dependency_source_not_direct_single_link")
    raw = path.read_bytes()
    after = path.lstat()
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


def _module_from_authenticated_source(raw: bytes, source_path: pathlib.Path):
    module = types.ModuleType("void_buy_void_user_manager_query_protected_replace_v6")
    module.__file__ = str(source_path)
    module.__package__ = ""
    code = compile(raw, str(source_path), "exec", dont_inherit=True)
    exec(code, module.__dict__)
    return module


def _load_replacement():
    raw = _direct_source_bytes(REPLACE_SOURCE)
    if git_blob_sha1(raw) != REPLACE_SOURCE_GIT_BLOB_SHA1:
        raise QualificationError("replacement_source_blob_mismatch")
    parser_raw = _direct_source_bytes(V4_PARSER_SOURCE)
    if git_blob_sha1(parser_raw) != V4_PARSER_GIT_BLOB_SHA1:
        raise QualificationError("v4_parser_source_blob_mismatch")
    module = _module_from_authenticated_source(raw, REPLACE_SOURCE)
    lock = module.accepted_lock()
    if module.GREEN_STATE != "V6_GREEN_WITH_V1_V2_PREDECESSORS":
        raise QualificationError("replacement_green_state_contract_mismatch")
    if lock.get("lock_id") != (
        "voidbuyumqelflock6_cede427c177e309cf23364b9092f3cbba63be405ad6458cc0c8ef93bc09abd77"
    ):
        raise QualificationError("corrected_v6_lock_id_mismatch")
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

    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
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
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
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


def installed_generation_snapshot(replacement: Any) -> dict[str, Any]:
    try:
        state = replacement._base_state()
    except Exception as exc:
        raise QualificationError("protected_v6_generation_invalid") from exc
    if state != replacement.GREEN_STATE:
        raise QualificationError("protected_v6_generation_not_green")

    return {
        "install_root": str(replacement.INSTALL_ROOT),
        "protected_state": state,
        "preexec": _installed_file_snapshot(
            replacement.PREEXEC_TARGET,
            expected_bytes=replacement.PREEXEC_BYTES,
            expected_sha256=replacement.PREEXEC_SHA256,
        ),
        "query_v6": _installed_file_snapshot(
            replacement.QUERY_TARGET,
            expected_bytes=replacement.V6_QUERY_BYTES,
            expected_sha256=replacement.V6_QUERY_SHA256,
        ),
        "predecessor_v1": _installed_file_snapshot(
            replacement.V1_PREDECESSOR_TARGET,
            expected_bytes=replacement.V1_QUERY_BYTES,
            expected_sha256=replacement.V1_QUERY_SHA256,
        ),
        "predecessor_v2": _installed_file_snapshot(
            replacement.V2_PREDECESSOR_TARGET,
            expected_bytes=replacement.INSTALLED_V2_QUERY_BYTES,
            expected_sha256=replacement.INSTALLED_V2_QUERY_SHA256,
        ),
    }


def _positive_integer(raw: str, key: str) -> int:
    if not raw or not raw.isascii() or not raw.isdigit() or raw.startswith("0"):
        raise QualificationError("native_integer_invalid:" + key)
    value = int(raw)
    if value <= 0 or value > 0x7FFF_FFFF_FFFF_FFFF:
        raise QualificationError("native_integer_invalid:" + key)
    return value


def _hex64(raw: str, key: str) -> str:
    if len(raw) != 16 or any(ch not in "0123456789abcdef" for ch in raw):
        raise QualificationError("native_hex_invalid:" + key)
    return raw


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
    for key in HEX_KEYS:
        _hex64(out[key], key)

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
    if out["NoNewPrivileges"] != "yes" or out["KernelNoNewPrivs"] != "1":
        raise QualificationError("runtime_no_new_privileges_invalid")
    if out["PrivateUsers"] != "no":
        raise QualificationError("runtime_private_users_invalid")
    if (
        out["AmbientCapabilities"] != ZERO_HEX
        or out["KernelCapInh"] != ZERO_HEX
        or out["KernelCapPrm"] != ZERO_HEX
        or out["KernelCapEff"] != ZERO_HEX
        or out["KernelCapAmb"] != ZERO_HEX
    ):
        raise QualificationError("runtime_active_capability_state_invalid")
    if out["KernelCapBnd"] != out["CapabilityBoundingSet"]:
        raise QualificationError("runtime_projected_bounding_set_mismatch")

    return out


def run_authenticated_query(replacement: Any) -> tuple[dict[str, str], str]:
    if os.geteuid() != 0:
        raise QualificationError("root_required_for_live_query")

    env = {"PATH": "/usr/bin:/bin", "LANG": "C", "LC_ALL": "C"}
    try:
        completed = subprocess.run(
            [
                str(replacement.PREEXEC_TARGET),
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
        "capability_bounding_set": native["CapabilityBoundingSet"],
        "kernel_cap_bnd": native["KernelCapBnd"],
    }


def collect() -> dict[str, Any]:
    if os.geteuid() != 0:
        raise QualificationError("root_required_for_live_query")

    replacement = _load_replacement()
    before = installed_generation_snapshot(replacement)
    first, first_sha = run_authenticated_query(replacement)
    middle = installed_generation_snapshot(replacement)
    second, second_sha = run_authenticated_query(replacement)
    after = installed_generation_snapshot(replacement)

    if before != middle or middle != after:
        raise QualificationError("installed_generation_changed_during_qualification")

    first_identity = _stable_identity(first)
    second_identity = _stable_identity(second)
    if first_identity != second_identity:
        raise QualificationError("authenticated_runtime_generation_changed")
    if first != second:
        raise QualificationError("authenticated_native_evidence_changed")

    return {
        "marker": MARKER,
        "version": 6,
        "read_only": True,
        "root_execution_required": True,
        "protected_v6_generation_verified": True,
        "v1_predecessor_verified": True,
        "v2_predecessor_verified": True,
        "accepted_lock_id": replacement.LOCK_ID,
        "installed_generation_stable": True,
        "authenticated_private_manager_peer": True,
        "same_authenticated_connection_unit_query": True,
        "runtime_user_manager_identity_verified": True,
        "runtime_user_manager_cgroup_bound": True,
        "runtime_main_pid_kernel_bound": True,
        "private_users_false_verified": True,
        "kernel_active_capabilities_zero_verified": True,
        "cap_last_cap_projection_contract_verified": True,
        "configured_kernel_bounding_set_equal_verified": True,
        "manager_and_service_pidfds_retained_by_native_query": True,
        "manager_and_service_generation_reverified_by_native_query": True,
        "double_authenticated_query_stable": True,
        "native_output_sha256_first": first_sha,
        "native_output_sha256_second": second_sha,
        **first_identity,
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
        "next_action": "BIND_V6_AUTHENTICATED_MAINPID_IN_REQUEST_ROOT_CENSUS_SUCCESSOR",
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
        "PrivateUsers": "no",
        "CapabilityBoundingSet": "000001ffffffffff",
        "AmbientCapabilities": ZERO_HEX,
        "KernelCapInh": ZERO_HEX,
        "KernelCapPrm": ZERO_HEX,
        "KernelCapEff": ZERO_HEX,
        "KernelCapBnd": "000001ffffffffff",
        "KernelCapAmb": ZERO_HEX,
        "KernelNoNewPrivs": "1",
        "capability_bounding_set_kernel_match": "true",
        "process_nonbounding_capabilities_zero": "true",
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
    replacement = _load_replacement()
    assert replacement.LOCK_ID == (
        "voidbuyumqelflock6_cede427c177e309cf23364b9092f3cbba63be405ad6458cc0c8ef93bc09abd77"
    )
    assert replacement.V6_QUERY_SHA256 == (
        "e791944bfa025a510d3693093668d71a9d122de8c581a924a1b45b4331ab43a6"
    )
    assert replacement.INSTALLED_V2_QUERY_SHA256 == (
        "d11304cb35be20dd4775677a2d5bf41c09f0f0b7a747ec7a8fea952e4bc8639c"
    )

    parsed = parse_native_output(synthetic_native_output())
    assert parsed["PrivateUsers"] == "no"
    assert parsed["KernelCapBnd"] == parsed["CapabilityBoundingSet"]
    assert _stable_identity(parsed)["service_start_ticks"] == "998877"

    adversaries = (
        ("PrivateUsers=no", "PrivateUsers=yes"),
        ("KernelCapEff=" + ZERO_HEX, "KernelCapEff=0000000000000001"),
        (
            "KernelCapBnd=000001ffffffffff",
            "KernelCapBnd=000000ffffffffff",
        ),
        (
            "manager_peer_authenticated=true",
            "manager_peer_authenticated=false",
        ),
        (
            "capability_bounding_set_kernel_match=true",
            "capability_bounding_set_kernel_match=false",
        ),
    )
    for old, new in adversaries:
        bad = synthetic_native_output().replace(old, new)
        try:
            parse_native_output(bad)
        except QualificationError:
            pass
        else:
            raise AssertionError("native adversary accepted: " + old)


def plan() -> None:
    replacement = _load_replacement()
    print(MARKER)
    print("mode=plan")
    print("root_required_for_run=true")
    print("fixed_preexec=" + str(replacement.PREEXEC_TARGET))
    print("fixed_query=" + str(replacement.QUERY_TARGET))
    print("fixed_v1_predecessor=" + str(replacement.V1_PREDECESSOR_TARGET))
    print("fixed_v2_predecessor=" + str(replacement.V2_PREDECESSOR_TARGET))
    print("accepted_lock_id=" + replacement.LOCK_ID)
    print("protected_v6_generation_verification_required=true")
    print("v1_predecessor_verification_required=true")
    print("v2_predecessor_verification_required=true")
    print("double_authenticated_query_required=true")
    print("private_users_false_required=true")
    print("kernel_active_capabilities_zero_required=true")
    print("cap_last_cap_projection_contract_required=true")
    print("configured_kernel_bounding_set_equality_required=true")
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
    print("next_action=SEPARATELY_AUTHORIZE_V6_READ_ONLY_LIVE_QUALIFICATION")


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
        "protected_v6_generation_verified",
        "v1_predecessor_verified",
        "v2_predecessor_verified",
        "accepted_lock_id",
        "installed_generation_stable",
        "authenticated_private_manager_peer",
        "same_authenticated_connection_unit_query",
        "runtime_user_manager_identity_verified",
        "runtime_user_manager_cgroup_bound",
        "runtime_main_pid_kernel_bound",
        "private_users_false_verified",
        "kernel_active_capabilities_zero_verified",
        "cap_last_cap_projection_contract_verified",
        "configured_kernel_bounding_set_equal_verified",
        "double_authenticated_query_stable",
        "manager_pid",
        "manager_start_ticks",
        "main_pid",
        "service_start_ticks",
        "control_group",
        "capability_bounding_set",
        "kernel_cap_bnd",
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
