#!/usr/bin/env python3
# Read-only service/socket quiescence census for a future V3 custody runtime install.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_SERVICE_QUIESCENCE_CENSUS_V1"
if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
    or _bootstrap_sys.flags.optimize != 0
    or not __debug__
):
    if __name__ == "__main__":
        print(_BOOTSTRAP_MARKER)
        print("status=HOLD")
        print("reason=python_isolated_unoptimized_mode_required")
        print("service_mutation=false")
        print("production_read_only=true")
        print("production_filesystem_write=false")
        print("self_test_temporary_filesystem_write=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_mode_required")

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_custody_runtime_v3_service_quiescence_census_v1"
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

ARCHIVE_LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-install-archive-lock-v3.json"
)
ARCHIVE_LOCK_GIT_BLOB = "edb4ea2b833373ab387762e45ba7da4032c860f3"
ARCHIVE_LOCK_SHA256 = (
    "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"
)
BOOTSTRAP_POLICY_REL = "tools/void-buy-allocation-custody-service-bootstrap-plan-v1.mjs"
BOOTSTRAP_POLICY_BLOB = "63eb0aa4e4211869284d389839e71e23554d62b1"
SOCKET_POLICY_REL = (
    "tools/void-buy-allocation-custody-socket-runtime-directory-policy-v1.mjs"
)
SOCKET_POLICY_BLOB = "9d4b97a822b50c525722f0decae9205a9aebeb4a"

UNIT = "void-buy-allocation-custody-v1.service"
SYSTEMCTL = Path("/usr/bin/systemctl")
RUNTIME_DIR = Path("/run/void-allocation-custody-v1")
SOCKET_PATH = RUNTIME_DIR / "custody.sock"
SERVICE_USER = "void-buy-custody"
SERVICE_GROUP = "void-buy-custody"
IPC_GROUP = "void-buy-custody-ipc"

SYSTEMCTL_PROPERTIES = (
    "Id",
    "LoadState",
    "ActiveState",
    "SubState",
    "UnitFileState",
    "MainPID",
    "ControlPID",
    "FragmentPath",
    "NeedDaemonReload",
)
MAX_REPO_FILE = 2 * 1024 * 1024
MAX_SYSTEMCTL_OUTPUT = 64 * 1024


class CensusHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise CensusHold("custody_runtime_v3_service_quiescence_" + reason)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


def canonical(value: object) -> bytes:
    return (
        json.dumps(
            value,
            sort_keys=True,
            ensure_ascii=True,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")


def _generation(
    st: os.stat_result,
) -> tuple[int, int, int, int, int, int, int, int, int]:
    return (
        st.st_dev,
        st.st_ino,
        st.st_uid,
        st.st_gid,
        st.st_mode,
        st.st_nlink,
        st.st_size,
        st.st_mtime_ns,
        st.st_ctime_ns,
    )


def read_bound_regular(path: Path, maximum: int = MAX_REPO_FILE) -> bytes:
    absolute = Path(os.path.abspath(os.fspath(path)))
    if not absolute.is_absolute() or "\x00" in str(absolute):
        hold("repo_path_invalid")
    before = os.stat(absolute, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_size < 1
        or before.st_size > maximum
    ):
        hold("repo_file_shape_invalid:" + absolute.name)
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    fd = os.open(absolute, flags)
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("repo_file_rebound:" + absolute.name)
        raw = bytearray()
        while len(raw) < opened.st_size:
            chunk = os.read(fd, min(65536, opened.st_size - len(raw)))
            if not chunk:
                hold("repo_file_short_read:" + absolute.name)
            raw.extend(chunk)
        if os.read(fd, 1):
            hold("repo_file_grew:" + absolute.name)
        after = os.fstat(fd)
        visible = os.stat(absolute, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("repo_file_generation_changed:" + absolute.name)
        return bytes(raw)
    finally:
        os.close(fd)


def verify_inputs() -> dict[str, Any]:
    lock_raw = read_bound_regular(ROOT / ARCHIVE_LOCK_REL, 128 * 1024)
    if git_blob(lock_raw) != ARCHIVE_LOCK_GIT_BLOB:
        hold("archive_lock_blob_mismatch")
    if sha256(lock_raw) != ARCHIVE_LOCK_SHA256:
        hold("archive_lock_sha256_mismatch")
    try:
        lock = json.loads(lock_raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("archive_lock_json_invalid:" + type(exc).__name__)
    if (
        type(lock) is not dict
        or lock.get("archive_candidate_accepted") is not True
        or lock.get("immutable_root_install") is not False
        or lock.get("install_target_selected") is not False
        or lock.get("existing_target_replaced") is not False
        or lock.get("runtime_integration") is not False
        or lock.get("payment_acceptance") is not False
        or lock.get("public_presale_activation") is not False
        or lock.get("funds_movement") is not False
    ):
        hold("archive_lock_authority_invalid")

    bootstrap_raw = read_bound_regular(ROOT / BOOTSTRAP_POLICY_REL)
    socket_raw = read_bound_regular(ROOT / SOCKET_POLICY_REL)
    if git_blob(bootstrap_raw) != BOOTSTRAP_POLICY_BLOB:
        hold("bootstrap_policy_blob_mismatch")
    if git_blob(socket_raw) != SOCKET_POLICY_BLOB:
        hold("socket_policy_blob_mismatch")

    bootstrap_text = bootstrap_raw.decode("utf-8")
    socket_text = socket_raw.decode("utf-8")
    for needle in (
        'unit_name_candidate: "void-buy-allocation-custody-v1.service"',
        'systemd_manager: "system"',
        "socket_unit_needed: false",
    ):
        if needle not in bootstrap_text:
            hold("bootstrap_policy_semantic_marker_missing")
    for needle in (
        'service_user: "void-buy-custody"',
        'service_group: "void-buy-custody"',
        'ipc_group: "void-buy-custody-ipc"',
        'runtime_directory_path: "/run/void-allocation-custody-v1"',
        'socket_path: "/run/void-allocation-custody-v1/custody.sock"',
        'socket_mode: "0660"',
    ):
        if needle not in socket_text:
            hold("socket_policy_semantic_marker_missing")
    return lock


def verify_systemctl_binary() -> dict[str, Any]:
    st = os.stat(SYSTEMCTL, follow_symlinks=False)
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
    ):
        hold("systemctl_binary_custody_invalid")
    return {
        "path": str(SYSTEMCTL),
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "dev": st.st_dev,
        "ino": st.st_ino,
    }


def parse_systemctl_show(raw: str) -> dict[str, str]:
    if not isinstance(raw, str) or len(raw.encode("utf-8")) > MAX_SYSTEMCTL_OUTPUT:
        hold("systemctl_output_invalid")
    result: dict[str, str] = {}
    for line in raw.splitlines():
        if not line:
            continue
        if "=" not in line:
            hold("systemctl_output_line_invalid")
        key, value = line.split("=", 1)
        if key not in SYSTEMCTL_PROPERTIES or key in result:
            hold("systemctl_output_property_invalid:" + key)
        result[key] = value
    if set(result) != set(SYSTEMCTL_PROPERTIES):
        hold("systemctl_output_properties_incomplete")
    if result["Id"] != UNIT:
        hold("systemctl_unit_id_mismatch")
    for key in ("MainPID", "ControlPID"):
        if not result[key].isdigit():
            hold("systemctl_pid_invalid:" + key)
    if result["NeedDaemonReload"] not in ("yes", "no"):
        hold("systemctl_need_daemon_reload_invalid")
    return result


def systemctl_show() -> tuple[dict[str, str], dict[str, Any]]:
    binary = verify_systemctl_binary()
    command = [
        str(SYSTEMCTL),
        "--system",
        "show",
        UNIT,
        "--no-pager",
        *("--property=" + key for key in SYSTEMCTL_PROPERTIES),
    ]
    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        timeout=8,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "SYSTEMD_PAGER": "cat",
            "SYSTEMD_COLORS": "0",
        },
    )
    if len(completed.stderr.encode("utf-8")) > MAX_SYSTEMCTL_OUTPUT:
        hold("systemctl_stderr_too_large")
    if completed.returncode != 0:
        hold("systemctl_show_failed:" + str(completed.returncode))
    return parse_systemctl_show(completed.stdout), binary


def observe_path(path: Path, expected: str) -> dict[str, Any]:
    try:
        st = os.stat(path, follow_symlinks=False)
    except FileNotFoundError:
        return {"path": str(path), "state": "absent"}
    if stat.S_ISLNK(st.st_mode):
        hold(expected + "_symlink_forbidden")
    if expected == "runtime_dir":
        if not stat.S_ISDIR(st.st_mode):
            hold("runtime_dir_wrong_type")
        kind = "directory"
    elif expected == "socket":
        if not stat.S_ISSOCK(st.st_mode):
            hold("socket_path_wrong_type")
        kind = "socket"
    else:
        hold("path_observation_kind_invalid")
    return {
        "path": str(path),
        "state": "present",
        "kind": kind,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "dev": st.st_dev,
        "ino": st.st_ino,
    }


def classify(
    properties: dict[str, str],
    runtime_dir: dict[str, Any],
    socket_path: dict[str, Any],
) -> dict[str, Any]:
    main_pid = int(properties["MainPID"])
    control_pid = int(properties["ControlPID"])
    inactive_observed = (
        properties["ActiveState"] == "inactive"
        and properties["SubState"] in ("dead", "exited")
        and main_pid == 0
        and control_pid == 0
    )
    unit_absent_observed = (
        properties["LoadState"] == "not-found"
        and inactive_observed
    )
    socket_absent_observed = socket_path["state"] == "absent"
    runtime_directory_absent_observed = runtime_dir["state"] == "absent"
    daemon_reload_clear_observed = properties["NeedDaemonReload"] == "no"
    unit_state_safe_observed = properties["UnitFileState"] in (
        "",
        "disabled",
        "static",
        "masked",
    )
    quiescence_candidate = (
        inactive_observed
        and socket_absent_observed
        and runtime_directory_absent_observed
        and daemon_reload_clear_observed
        and unit_state_safe_observed
    )
    return {
        "unit_name": UNIT,
        "load_state": properties["LoadState"],
        "active_state": properties["ActiveState"],
        "sub_state": properties["SubState"],
        "unit_file_state": properties["UnitFileState"],
        "main_pid": main_pid,
        "control_pid": control_pid,
        "fragment_path": properties["FragmentPath"],
        "need_daemon_reload": properties["NeedDaemonReload"],
        "unit_absent_observed": unit_absent_observed,
        "service_inactive_observed": inactive_observed,
        "socket_absent_observed": socket_absent_observed,
        "runtime_directory_absent_observed": runtime_directory_absent_observed,
        "daemon_reload_clear_observed": daemon_reload_clear_observed,
        "unit_state_safe_observed": unit_state_safe_observed,
        "runtime_directory": runtime_dir,
        "socket_path": socket_path,
        "service_quiescence_candidate": quiescence_candidate,
        "service_quiescence_proven": False,
        "live_process_binding_checked": False,
    }


def census() -> dict[str, Any]:
    lock = verify_inputs()
    properties, systemctl_binary = systemctl_show()
    runtime_dir = observe_path(RUNTIME_DIR, "runtime_dir")
    socket_path = observe_path(SOCKET_PATH, "socket")
    service = classify(properties, runtime_dir, socket_path)
    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "archive_lock": {
            "git_blob_sha1": ARCHIVE_LOCK_GIT_BLOB,
            "sha256": ARCHIVE_LOCK_SHA256,
            "archive_candidate_accepted": lock["archive_candidate_accepted"],
        },
        "policy": {
            "bootstrap_plan_git_blob_sha1": BOOTSTRAP_POLICY_BLOB,
            "socket_runtime_policy_git_blob_sha1": SOCKET_POLICY_BLOB,
            "systemd_manager": "system",
            "unit_name": UNIT,
            "runtime_directory": str(RUNTIME_DIR),
            "socket_path": str(SOCKET_PATH),
            "service_user": SERVICE_USER,
            "service_group": SERVICE_GROUP,
            "ipc_group": IPC_GROUP,
        },
        "systemctl_binary": systemctl_binary,
        "service_observation": service,
        "read_only": True,
        "filesystem_write": False,
        "systemd_show_only": True,
        "systemd_mutation": False,
        "daemon_reload": False,
        "service_start": False,
        "service_stop": False,
        "service_restart": False,
        "socket_connect": False,
        "socket_unlink": False,
        "process_environment_read": False,
        "process_arguments_read": False,
        "request_history_read": False,
        "custody_data_read": False,
        "credential_access": False,
        "wallet_or_signer_access": False,
        "install_target_selected": False,
        "existing_target_replaced": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
    }
    return {
        **body,
        "census_id": "voidbuycustodyquiescence1_" + sha256(canonical(body)),
    }


def self_test() -> None:
    verify_inputs()
    absent = {
        "path": str(SOCKET_PATH),
        "state": "absent",
    }
    runtime_absent = {
        "path": str(RUNTIME_DIR),
        "state": "absent",
    }
    quiet = parse_systemctl_show(
        "\n".join([
            "Id=" + UNIT,
            "LoadState=not-found",
            "ActiveState=inactive",
            "SubState=dead",
            "UnitFileState=",
            "MainPID=0",
            "ControlPID=0",
            "FragmentPath=",
            "NeedDaemonReload=no",
            "",
        ])
    )
    classified = classify(quiet, runtime_absent, absent)
    if (
        classified["unit_absent_observed"] is not True
        or classified["service_inactive_observed"] is not True
        or classified["socket_absent_observed"] is not True
        or classified["service_quiescence_candidate"] is not True
        or classified["service_quiescence_proven"] is not False
    ):
        hold("self_test_quiet_state_invalid")

    loaded = dict(quiet)
    loaded["LoadState"] = "loaded"
    loaded["UnitFileState"] = "disabled"
    loaded_result = classify(loaded, runtime_absent, absent)
    if loaded_result["service_quiescence_candidate"] is not True:
        hold("self_test_loaded_inactive_candidate_invalid")

    enabled = dict(loaded)
    enabled["UnitFileState"] = "enabled"
    if classify(
        enabled,
        runtime_absent,
        absent,
    )["service_quiescence_candidate"] is not False:
        hold("self_test_enabled_unit_candidate_accepted")

    reload_pending = dict(loaded)
    reload_pending["NeedDaemonReload"] = "yes"
    if classify(
        reload_pending,
        runtime_absent,
        absent,
    )["service_quiescence_candidate"] is not False:
        hold("self_test_pending_daemon_reload_candidate_accepted")

    runtime_present = {
        "path": str(RUNTIME_DIR),
        "state": "present",
        "kind": "directory",
        "uid": 994,
        "gid": 981,
        "mode": "0750",
        "dev": 1,
        "ino": 2,
    }
    if classify(
        loaded,
        runtime_present,
        absent,
    )["service_quiescence_candidate"] is not False:
        hold("self_test_lingering_runtime_directory_candidate_accepted")

    active = dict(loaded)
    active["ActiveState"] = "active"
    active["SubState"] = "running"
    active["MainPID"] = "123"
    active_result = classify(active, runtime_absent, absent)
    if active_result["service_quiescence_candidate"] is not False:
        hold("self_test_active_service_accepted")

    socket_present = {
        "path": str(SOCKET_PATH),
        "state": "present",
        "kind": "socket",
        "uid": 123,
        "gid": 456,
        "mode": "0660",
        "dev": 1,
        "ino": 2,
    }
    socket_result = classify(quiet, runtime_absent, socket_present)
    if socket_result["service_quiescence_candidate"] is not False:
        hold("self_test_present_socket_accepted")

    with tempfile.TemporaryDirectory(
        prefix="void-custody-quiescence-selftest-"
    ) as tmp:
        base = Path(tmp)
        link = base / "runtime"
        link.symlink_to(base)
        try:
            observe_path(link, "runtime_dir")
        except CensusHold as exc:
            if "runtime_dir_symlink_forbidden" not in str(exc):
                raise
        else:
            hold("self_test_runtime_symlink_accepted")

    print(MARKER + "_SELF_TEST_GREEN")
    print("archive_lock_exact=true")
    print("bootstrap_policy_exact=true")
    print("socket_runtime_policy_exact=true")
    print("canonical_system_unit_bound=true")
    print("canonical_socket_path_bound=true")
    print("systemctl_show_only=true")
    print("inactive_service_candidate_classified=true")
    print("enabled_unit_rejected=true")
    print("pending_daemon_reload_rejected=true")
    print("lingering_runtime_directory_rejected=true")
    print("active_service_rejected=true")
    print("present_socket_rejected=true")
    print("service_quiescence_proven=false")
    print("live_process_binding_checked=false")
    print("production_read_only=true")
    print("production_filesystem_write=false")
    print("self_test_temporary_filesystem_write=true")
    print("systemd_mutation=false")
    print("daemon_reload=false")
    print("service_start=false")
    print("service_stop=false")
    print("service_restart=false")
    print("socket_connect=false")
    print("socket_unlink=false")
    print("request_history_read=false")
    print("custody_data_read=false")
    print("credential_access=false")
    print("wallet_or_signer_access=false")
    print("install_target_selected=false")
    print("existing_target_replaced=false")
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--census", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0
    if args.census:
        print(json.dumps(census(), sort_keys=True, separators=(",", ":")))
        return 0
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main(_bootstrap_sys.argv[1:]))
    except (
        CensusHold,
        OSError,
        subprocess.SubprocessError,
        ValueError,
    ) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("production_read_only=true")
        print("production_filesystem_write=false")
        print(
            "self_test_temporary_filesystem_write="
            + ("true" if "--self-test" in _bootstrap_sys.argv[1:] else "false")
        )
        print("systemd_mutation=false")
        print("service_start=false")
        print("service_stop=false")
        print("service_restart=false")
        print("runtime_integration=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
