#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
import pathlib
import pwd
import re
import socket
import stat
import subprocess
import sys
from typing import Any

MARKER = "VOID_BUY_VOID_REQUEST_ROOT_RUNTIME_TOPOLOGY_CENSUS_V1"
EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
EXPECTED_USER = "zoso"
RUNTIME_UNIT = "void-node-live.service"
NODE_HOST = "127.0.0.1"
NODE_PORT = 4100
PARENT_STATUS_PATH = "/__void/operator/buy-void-runtime-v1/status"
CONFIRMED_CLOSEOUT_STATUS_PATH = (
    "/__void/operator/buy-void-confirmed-closeout-v1/status"
)
DEFAULT_REQUEST_RELATIVE = pathlib.Path(
    ".runtime/public-buy-void-requests-v1"
)
HISTORICAL_REPO_RELATIVE = pathlib.Path("dev/void-node")
REQUESTS_NAME = "requests.jsonl"
OPERATOR_EVENTS_NAME = "operator-events.jsonl"
LEDGER_ROOT = pathlib.Path("/var/lib/void-allocation-ledger-v1")
CUSTODY_ROOT = pathlib.Path("/var/lib/void-allocation-custody-v1")
SYSTEMCTL = pathlib.Path("/usr/bin/systemctl")
SS = pathlib.Path("/usr/bin/ss")
MAX_COMMAND_BYTES = 1024 * 1024
MAX_HTTP_BYTES = 256 * 1024
HTTP_TIMEOUT_SECONDS = 3
MAX_PROC_BYTES = 256 * 1024
MAX_REQUESTS_BYTES = 64 * 1024 * 1024
MAX_OPERATOR_EVENTS_BYTES = 64 * 1024 * 1024


class CensusError(RuntimeError):
    pass


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def safe_user_env(uid: int) -> dict[str, str]:
    try:
        home = pwd.getpwuid(uid).pw_dir
    except KeyError as exc:
        raise CensusError("observer_user_identity_unavailable") from exc
    return {
        "PATH": "/usr/bin:/bin",
        "HOME": home,
        "LANG": "C",
        "LC_ALL": "C",
        "SYSTEMD_PAGER": "cat",
        "SYSTEMD_COLORS": "0",
        "PAGER": "cat",
        "NO_COLOR": "1",
        "XDG_RUNTIME_DIR": f"/run/user/{uid}",
        "DBUS_SESSION_BUS_ADDRESS": f"unix:path=/run/user/{uid}/bus",
    }


def command_identity(path: pathlib.Path) -> tuple[str, int, int, int, int]:
    try:
        resolved = path.resolve(strict=True)
        info = resolved.stat()
    except OSError as exc:
        raise CensusError(f"command_unavailable:{path}") from exc
    if not stat.S_ISREG(info.st_mode) or not (info.st_mode & 0o111):
        raise CensusError(f"command_not_executable:{path}")
    return (
        str(resolved),
        info.st_dev,
        info.st_ino,
        info.st_size,
        info.st_mtime_ns,
    )


def run_systemctl(
    args: list[str],
    *,
    user_manager: bool,
    allow_failure: bool = False,
) -> tuple[int, str]:
    identity_before = command_identity(SYSTEMCTL)
    uid = os.geteuid()
    command = [identity_before[0]]
    if user_manager:
        command.append("--user")
    command.extend(args)
    result = subprocess.run(
        command,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=safe_user_env(uid),
        timeout=10,
        check=False,
    )
    if len(result.stdout) > MAX_COMMAND_BYTES or len(result.stderr) > MAX_COMMAND_BYTES:
        raise CensusError("systemctl_output_too_large")
    identity_after = command_identity(SYSTEMCTL)
    if identity_before != identity_after:
        raise CensusError("systemctl_identity_changed_during_read")
    if result.returncode != 0 and not allow_failure:
        raise CensusError("systemctl_read_failed")
    try:
        return result.returncode, result.stdout.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise CensusError("systemctl_output_not_utf8") from exc


def parse_listener_rows(raw: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for raw_line in raw.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 5 or parts[0] != "LISTEN":
            raise CensusError("ss_listener_row_malformed")
        rows.append({
            "local": parts[3],
            "process": " ".join(parts[5:]) if len(parts) > 5 else "",
        })
    return rows


def runtime_http_listener_binding(pid: int) -> dict[str, Any]:
    before = command_identity(SS)
    result = subprocess.run(
        [before[0], "-H", "-ltnp"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=safe_user_env(os.geteuid()),
        timeout=10,
        check=False,
    )
    after = command_identity(SS)
    if before != after:
        raise CensusError("ss_identity_changed_during_read")
    if (
        result.returncode != 0
        or len(result.stdout) > MAX_COMMAND_BYTES
        or len(result.stderr) > MAX_COMMAND_BYTES
    ):
        return {
            "observed": False,
            "candidate_count": 0,
            "owned_by_runtime_pid": False,
            "loopback_listener_observed": False,
        }
    try:
        rows = parse_listener_rows(result.stdout.decode("utf-8", "strict"))
    except (UnicodeDecodeError, CensusError):
        return {
            "observed": False,
            "candidate_count": 0,
            "owned_by_runtime_pid": False,
            "loopback_listener_observed": False,
        }
    suffix = f":{NODE_PORT}"
    candidates = [row for row in rows if str(row.get("local", "")).endswith(suffix)]
    pid_pattern = re.compile(rf"(^|[^0-9])pid={pid}([^0-9]|$)")
    owned = [
        row for row in candidates
        if pid > 0 and pid_pattern.search(str(row.get("process", "")))
    ]
    loopback = [
        row for row in owned
        if row.get("local") in {
            f"127.0.0.1:{NODE_PORT}",
            f"[::1]:{NODE_PORT}",
            f"::1:{NODE_PORT}",
        }
    ]
    return {
        "observed": True,
        "candidate_count": len(candidates),
        "owned_by_runtime_pid": len(candidates) == 1 and len(owned) == 1,
        "loopback_listener_observed": len(candidates) == 1 and len(loopback) == 1,
    }


def parse_key_values(raw: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in raw.splitlines():
        if not line:
            continue
        if "=" not in line:
            raise CensusError("systemctl_row_malformed")
        key, value = line.split("=", 1)
        if not key or key in values:
            raise CensusError("systemctl_row_duplicate")
        values[key] = value
    return values


def service_snapshot(*, user_manager: bool) -> dict[str, Any]:
    props = [
        "LoadState",
        "ActiveState",
        "SubState",
        "MainPID",
        "FragmentPath",
        "WorkingDirectory",
    ]
    code, raw = run_systemctl(
        [
            "show",
            RUNTIME_UNIT,
            "--no-pager",
            *[f"--property={prop}" for prop in props],
        ],
        user_manager=user_manager,
        allow_failure=True,
    )
    values = parse_key_values(raw) if raw else {}
    pid_text = values.get("MainPID", "")
    pid = int(pid_text) if pid_text.isdigit() else 0
    loaded = code == 0 and values.get("LoadState") == "loaded"
    active = (
        loaded
        and values.get("ActiveState") == "active"
        and values.get("SubState") == "running"
        and pid > 0
    )
    fragment = values.get("FragmentPath", "")
    working = values.get("WorkingDirectory", "")
    return {
        "manager": "user" if user_manager else "system",
        "loaded": loaded,
        "active_running": active,
        "main_pid": pid,
        "fragment_path_present": bool(fragment),
        "fragment_path_sha256": sha256_text(fragment) if fragment else None,
        "working_directory_present": bool(working),
        "working_directory_sha256": sha256_text(working) if working else None,
    }


def read_bounded(path: pathlib.Path, maximum: int = MAX_PROC_BYTES) -> bytes:
    data = path.read_bytes()
    if len(data) > maximum:
        raise CensusError(f"file_too_large:{path.name}")
    return data


def parse_proc_start_ticks(raw: bytes | str) -> int:
    text = raw.decode("utf-8", "strict") if isinstance(raw, bytes) else raw
    closing = text.rfind(")")
    if closing < 2:
        raise CensusError("proc_stat_malformed")
    tail = text[closing + 2 :].split()
    if len(tail) < 20 or not re.fullmatch(r"[1-9][0-9]*", tail[19]):
        raise CensusError("proc_stat_start_ticks_invalid")
    return int(tail[19])


def read_process_generation(pid: int) -> dict[str, Any]:
    if pid < 1:
        return {
            "observed": False,
            "pid": pid,
            "start_ticks": None,
            "cwd": None,
            "exe": None,
        }
    try:
        start_ticks = parse_proc_start_ticks(
            read_bounded(pathlib.Path(f"/proc/{pid}/stat"), 64 * 1024)
        )
        cwd = os.path.realpath(f"/proc/{pid}/cwd")
        exe = os.path.realpath(f"/proc/{pid}/exe")
    except (OSError, CensusError, UnicodeDecodeError):
        return {
            "observed": False,
            "pid": pid,
            "start_ticks": None,
            "cwd": None,
            "exe": None,
        }
    return {
        "observed": True,
        "pid": pid,
        "start_ticks": start_ticks,
        "cwd": cwd,
        "exe": exe,
    }


def same_process_generation(
    first_service: dict[str, Any],
    first_process: dict[str, Any],
    second_service: dict[str, Any],
    second_process: dict[str, Any],
) -> bool:
    return (
        first_service.get("active_running") is True
        and second_service.get("active_running") is True
        and first_process.get("observed") is True
        and second_process.get("observed") is True
        and first_service.get("main_pid") == second_service.get("main_pid")
        and first_process.get("pid") == second_process.get("pid")
        and first_process.get("start_ticks") == second_process.get("start_ticks")
        and first_process.get("cwd") == second_process.get("cwd")
        and first_process.get("exe") == second_process.get("exe")
    )


def direct_path_metadata(path: pathlib.Path) -> dict[str, Any]:
    try:
        info = path.lstat()
    except OSError:
        return {
            "exists": False,
            "kind": None,
            "uid": None,
            "gid": None,
            "mode": None,
            "dev": None,
            "ino": None,
            "nlink": None,
            "size": None,
            "direct": None,
        }
    mode = stat.S_IMODE(info.st_mode)
    if stat.S_ISDIR(info.st_mode):
        kind = "directory"
    elif stat.S_ISREG(info.st_mode):
        kind = "regular"
    elif stat.S_ISLNK(info.st_mode):
        kind = "symlink"
    else:
        kind = "other"
    try:
        direct = pathlib.Path(os.path.realpath(path)) == path.absolute()
    except OSError:
        direct = False
    return {
        "exists": True,
        "kind": kind,
        "uid": info.st_uid,
        "gid": info.st_gid,
        "mode": f"{mode:04o}",
        "dev": info.st_dev,
        "ino": info.st_ino,
        "nlink": info.st_nlink,
        "size": info.st_size,
        "direct": direct,
    }


def path_overlap(left: pathlib.Path, right: pathlib.Path) -> bool:
    left_abs = left.absolute()
    right_abs = right.absolute()
    return (
        left_abs == right_abs
        or left_abs in right_abs.parents
        or right_abs in left_abs.parents
    )


def request_root_candidate(path: pathlib.Path, runtime_uid: int) -> dict[str, Any]:
    directory = direct_path_metadata(path)
    requests = direct_path_metadata(path / REQUESTS_NAME)
    operator = direct_path_metadata(path / OPERATOR_EVENTS_NAME)
    directory_mode = directory.get("mode")
    directory_owner_private = (
        directory.get("exists") is True
        and directory.get("kind") == "directory"
        and directory.get("direct") is True
        and directory.get("uid") == runtime_uid
        and directory_mode == "0700"
    )

    def leaf_ok(
        value: dict[str, Any],
        *,
        minimum_size: int,
        maximum_size: int,
    ) -> bool:
        if (
            value.get("exists") is not True
            or value.get("kind") != "regular"
            or value.get("direct") is not True
            or value.get("uid") != runtime_uid
            or value.get("nlink") != 1
            or not isinstance(value.get("size"), int)
            or value.get("size") < minimum_size
            or value.get("size") > maximum_size
        ):
            return False
        try:
            mode = int(str(value.get("mode")), 8)
        except ValueError:
            return False
        return mode == 0o600

    requests_size_qualified = (
        isinstance(requests.get("size"), int)
        and 1 <= requests["size"] <= MAX_REQUESTS_BYTES
    )
    operator_events_size_qualified = (
        isinstance(operator.get("size"), int)
        and 0 <= operator["size"] <= MAX_OPERATOR_EVENTS_BYTES
    )

    overlaps_protected = (
        path_overlap(path, LEDGER_ROOT)
        or path_overlap(path, CUSTODY_ROOT)
    )
    qualified = (
        directory_owner_private
        and leaf_ok(
            requests,
            minimum_size=1,
            maximum_size=MAX_REQUESTS_BYTES,
        )
        and leaf_ok(
            operator,
            minimum_size=0,
            maximum_size=MAX_OPERATOR_EVENTS_BYTES,
        )
        and not overlaps_protected
    )
    return {
        "path_sha256": sha256_text(str(path.absolute())),
        "exists": directory.get("exists") is True,
        "directory_kind": directory.get("kind"),
        "directory_uid": directory.get("uid"),
        "directory_gid": directory.get("gid"),
        "directory_mode": directory.get("mode"),
        "directory_direct": directory.get("direct"),
        "requests_exists": requests.get("exists") is True,
        "requests_kind": requests.get("kind"),
        "requests_uid": requests.get("uid"),
        "requests_gid": requests.get("gid"),
        "requests_mode": requests.get("mode"),
        "requests_nlink": requests.get("nlink"),
        "requests_size_qualified": requests_size_qualified,
        "operator_events_exists": operator.get("exists") is True,
        "operator_events_kind": operator.get("kind"),
        "operator_events_uid": operator.get("uid"),
        "operator_events_gid": operator.get("gid"),
        "operator_events_mode": operator.get("mode"),
        "operator_events_nlink": operator.get("nlink"),
        "operator_events_size_qualified": operator_events_size_qualified,
        "overlaps_protected_storage": overlaps_protected,
        "metadata_qualified": qualified,
        "directory_dev": directory.get("dev"),
        "directory_ino": directory.get("ino"),
    }


def same_candidate_inode(
    first: dict[str, Any],
    second: dict[str, Any],
) -> bool:
    return (
        first.get("exists") is True
        and second.get("exists") is True
        and first.get("directory_dev") is not None
        and first.get("directory_dev") == second.get("directory_dev")
        and first.get("directory_ino") == second.get("directory_ino")
    )


def bounded_local_json(path: str) -> dict[str, Any]:
    result = {
        "observed": False,
        "http_status": None,
        "body": None,
    }
    connection = http.client.HTTPConnection(
        NODE_HOST,
        NODE_PORT,
        timeout=HTTP_TIMEOUT_SECONDS,
    )
    try:
        connection.request(
            "GET",
            path,
            headers={
                "Accept": "application/json",
                "Connection": "close",
                "User-Agent":
                    "void-buy-void-request-root-runtime-topology-census-v1",
            },
        )
        response = connection.getresponse()
        result["http_status"] = response.status
        raw = response.read(MAX_HTTP_BYTES + 1)
        if len(raw) > MAX_HTTP_BYTES:
            return result
        if response.status != 200:
            return result
        parsed = json.loads(raw.decode("utf-8", "strict"))
        if not isinstance(parsed, dict):
            return result
        result["observed"] = True
        result["body"] = parsed
        return result
    except (
        OSError,
        TimeoutError,
        UnicodeDecodeError,
        json.JSONDecodeError,
        http.client.HTTPException,
    ):
        return result
    finally:
        connection.close()


def classify_parent_status(observation: dict[str, Any]) -> dict[str, Any]:
    body = observation.get("body")
    if not isinstance(body, dict):
        return {
            "observed": False,
            "marker_ok": False,
            "routes_ok": False,
            "enabled": False,
            "root_dir_source": None,
            "root_dir_sha256": None,
            "payment_keyed_full_runtime_present": False,
            "payment_keyed_full_runtime_enabled": False,
            "payment_keyed_full_runtime_apply_enabled": False,
            "payment_keyed_full_runtime_policy_configured": False,
            "payment_keyed_root_fingerprint_present": False,
        }
    routes = body.get("routes")
    keyed = body.get("payment_keyed_full_runtime")
    root_dir = body.get("root_dir")
    return {
        "observed": observation.get("observed") is True,
        "marker_ok": body.get("marker") == "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1",
        "routes_ok": (
            isinstance(routes, dict)
            and routes.get("status") == PARENT_STATUS_PATH
            and routes.get("command") == "/__void/operator/buy-void-runtime-v1/command"
        ),
        "enabled": body.get("enabled") is True,
        "root_dir_source": body.get("root_dir_source")
        if body.get("root_dir_source") in {
            "server_default",
            "VOID_BUY_VOID_RUNTIME_DIR",
        }
        else None,
        "root_dir_sha256": sha256_text(root_dir)
        if isinstance(root_dir, str) and os.path.isabs(root_dir)
        else None,
        "payment_keyed_full_runtime_present": isinstance(keyed, dict),
        "payment_keyed_full_runtime_enabled":
            isinstance(keyed, dict) and keyed.get("enabled") is True,
        "payment_keyed_full_runtime_apply_enabled":
            isinstance(keyed, dict) and keyed.get("apply_enabled") is True,
        "payment_keyed_full_runtime_policy_configured":
            isinstance(keyed, dict) and keyed.get("policy_configured") is True,
        "payment_keyed_root_fingerprint_present":
            isinstance(keyed, dict)
            and isinstance(keyed.get("root_dir_fingerprint_sha256"), str)
            and re.fullmatch(
                r"[0-9a-f]{64}",
                keyed.get("root_dir_fingerprint_sha256", ""),
            ) is not None,
    }


def classify_confirmed_closeout_status(
    observation: dict[str, Any],
    cwd_candidate_path: pathlib.Path,
    historical_candidate_path: pathlib.Path,
) -> dict[str, Any]:
    body = observation.get("body")
    base = {
        "observed": False,
        "marker_ok": False,
        "request_dir_source": None,
        "request_dir_sha256": None,
        "matches_cwd_default_candidate": False,
        "matches_historical_default_candidate": False,
        "server_default_observed": False,
        "explicit_override_observed": False,
    }
    if not isinstance(body, dict):
        return base
    request_dir = body.get("request_dir")
    source = body.get("request_dir_source")
    if (
        body.get("marker") != "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1"
        or not isinstance(request_dir, str)
        or not os.path.isabs(request_dir)
    ):
        return base
    base.update(
        {
            "observed": True,
            "marker_ok": True,
            "request_dir_source": source
            if source in {"server_default", "VOID_BUY_REQUEST_DIR"}
            else None,
            "request_dir_sha256": sha256_text(str(pathlib.Path(request_dir))),
            "matches_cwd_default_candidate":
                pathlib.Path(request_dir) == cwd_candidate_path,
            "matches_historical_default_candidate":
                pathlib.Path(request_dir) == historical_candidate_path,
            "server_default_observed": source == "server_default",
            "explicit_override_observed": source == "VOID_BUY_REQUEST_DIR",
        }
    )
    return base


def self_test() -> None:
    stat_tail = ["S", *(["0"] * 18), "424242"]
    stat_line = "99 (void node worker) " + " ".join(stat_tail)
    assert parse_proc_start_ticks(stat_line) == 424242
    first_service = {"active_running": True, "main_pid": 99}
    first_process = {
        "observed": True,
        "pid": 99,
        "start_ticks": 424242,
        "cwd": "/tmp/a",
        "exe": "/usr/bin/node",
    }
    assert same_process_generation(
        first_service,
        first_process,
        dict(first_service),
        dict(first_process),
    )
    changed = dict(first_process)
    changed["start_ticks"] = 424243
    assert not same_process_generation(
        first_service,
        first_process,
        dict(first_service),
        changed,
    )
    listener_rows = parse_listener_rows(
        'LISTEN 0 511 127.0.0.1:4100 0.0.0.0:* users:(("node",pid=99,fd=20))\n'
    )
    assert listener_rows[0]["local"] == "127.0.0.1:4100"
    assert "pid=99" in listener_rows[0]["process"]

    status = classify_confirmed_closeout_status(
        {
            "observed": True,
            "body": {
                "marker": "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1",
                "request_dir": "/tmp/root/.runtime/public-buy-void-requests-v1",
                "request_dir_source": "server_default",
            },
        },
        pathlib.Path("/tmp/root/.runtime/public-buy-void-requests-v1"),
        pathlib.Path("/tmp/other/.runtime/public-buy-void-requests-v1"),
    )
    assert status["observed"] is True
    assert status["server_default_observed"] is True
    assert status["matches_cwd_default_candidate"] is True
    assert status["matches_historical_default_candidate"] is False
    print(f"{MARKER}_SELF_TEST_GREEN")
    print("process_environment_access=false")
    print("request_payment_contents_read=false")
    print("loopback_get_only=true")
    print("runtime_mutation=false")


def plan() -> None:
    print(MARKER)
    for key, value in (
        ("mode", "--plan"),
        ("read_only", "true"),
        ("sudo_required", "false"),
        ("filesystem_write", "false"),
        ("service_mutation", "false"),
        ("systemd_mutation", "false"),
        ("mount_mutation", "false"),
        ("permission_mutation", "false"),
        ("network_calls_external", "false"),
        ("loopback_get_only", "true"),
        ("process_environment_access", "false"),
        ("request_payment_contents_read", "false"),
        ("credential_access", "false"),
        ("private_key_access", "false"),
        ("wallet_or_signer_access", "false"),
        ("transaction_construction", "false"),
        ("transaction_signing", "false"),
        ("transaction_broadcast", "false"),
        ("chain2050_mutation", "false"),
        ("public_presale_activation", "false"),
        ("funds_movement", "false"),
    ):
        print(f"{key}={value}")
    print(f"runtime_unit={RUNTIME_UNIT}")
    print(f"node_loopback={NODE_HOST}:{NODE_PORT}")
    print("next_action=RUN_READ_ONLY_REQUEST_ROOT_TOPOLOGY_CENSUS")


def collect() -> dict[str, Any]:
    if os.geteuid() == 0:
        raise CensusError("ordinary_user_required")
    hostname = socket.gethostname()
    uid = os.geteuid()
    try:
        account = pwd.getpwuid(uid)
    except KeyError as exc:
        raise CensusError("observer_user_identity_unavailable") from exc

    user_before = service_snapshot(user_manager=True)
    system_service = service_snapshot(user_manager=False)
    process_before = read_process_generation(
        int(user_before.get("main_pid") or 0)
    )

    cwd = process_before.get("cwd")
    if not isinstance(cwd, str) or not os.path.isabs(cwd):
        cwd_candidate_path = pathlib.Path("/nonexistent/void-request-root-candidate")
    else:
        cwd_candidate_path = pathlib.Path(cwd) / DEFAULT_REQUEST_RELATIVE
    historical_candidate_path = (
        pathlib.Path(account.pw_dir)
        / HISTORICAL_REPO_RELATIVE
        / DEFAULT_REQUEST_RELATIVE
    )

    cwd_candidate = request_root_candidate(cwd_candidate_path, uid)
    historical_candidate = request_root_candidate(
        historical_candidate_path,
        uid,
    )
    candidate_same_inode = same_candidate_inode(
        cwd_candidate,
        historical_candidate,
    )

    listener_binding = runtime_http_listener_binding(
        int(user_before.get("main_pid") or 0)
    )
    parent_raw = bounded_local_json(PARENT_STATUS_PATH)
    closeout_raw = bounded_local_json(CONFIRMED_CLOSEOUT_STATUS_PATH)
    parent_status = classify_parent_status(parent_raw)
    closeout_status = classify_confirmed_closeout_status(
        closeout_raw,
        cwd_candidate_path,
        historical_candidate_path,
    )

    user_after = service_snapshot(user_manager=True)
    process_after = read_process_generation(
        int(user_after.get("main_pid") or 0)
    )
    generation_stable = same_process_generation(
        user_before,
        process_before,
        user_after,
        process_after,
    )

    metadata_candidates = [
        cwd_candidate.get("metadata_qualified") is True,
        historical_candidate.get("metadata_qualified") is True,
    ]
    if candidate_same_inode:
        candidate_count = 1 if any(metadata_candidates) else 0
    else:
        candidate_count = sum(1 for value in metadata_candidates if value)

    status_matches_qualified_candidate = (
        closeout_status["observed"] is True
        and (
            (
                closeout_status["matches_cwd_default_candidate"]
                and cwd_candidate.get("metadata_qualified") is True
            )
            or (
                closeout_status["matches_historical_default_candidate"]
                and historical_candidate.get("metadata_qualified") is True
            )
        )
    )
    live_path_qualified = (
        hostname == EXPECTED_HOSTNAME
        and account.pw_name == EXPECTED_USER
        and uid == 1000
        and user_before.get("active_running") is True
        and system_service.get("active_running") is False
        and generation_stable
        and listener_binding.get("owned_by_runtime_pid") is True
        and status_matches_qualified_candidate
    )

    return {
        "marker": MARKER,
        "version": 1,
        "mode": "read_only",
        "sudo_used": False,
        "filesystem_write": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "mount_mutation": False,
        "permission_mutation": False,
        "external_network_calls": False,
        "loopback_get_only": True,
        "process_environment_access": False,
        "request_payment_contents_read": False,
        "credential_access": False,
        "private_key_access": False,
        "wallet_or_signer_access": False,
        "transaction_construction": False,
        "transaction_signing": False,
        "transaction_broadcast": False,
        "chain2050_mutation": False,
        "public_presale_activation": False,
        "funds_movement": False,
        "host": {
            "hostname_matches_precision": hostname == EXPECTED_HOSTNAME,
            "ordinary_user_observer": uid != 0,
            "effective_user_is_zoso": account.pw_name == EXPECTED_USER,
            "effective_uid": uid,
        },
        "runtime_user_service": {
            key: value
            for key, value in user_before.items()
            if key not in {"main_pid"}
        },
        "runtime_system_service": {
            key: value
            for key, value in system_service.items()
            if key not in {"main_pid"}
        },
        "runtime_http_listener": listener_binding,
        "runtime_process": {
            "observed": process_before.get("observed") is True,
            "start_ticks_present":
                isinstance(process_before.get("start_ticks"), int),
            "cwd_sha256": sha256_text(cwd)
            if isinstance(cwd, str) and cwd
            else None,
            "cwd_matches_historical_repo":
                isinstance(cwd, str)
                and pathlib.Path(cwd)
                == pathlib.Path(account.pw_dir) / HISTORICAL_REPO_RELATIVE,
            "exe_basename":
                pathlib.Path(str(process_before.get("exe"))).name
                if process_before.get("exe")
                else None,
            "generation_stable": generation_stable,
        },
        "cwd_default_request_root_candidate": cwd_candidate,
        "historical_default_request_root_candidate": historical_candidate,
        "candidate_roots_same_inode": candidate_same_inode,
        "metadata_qualified_candidate_count": candidate_count,
        "parent_runtime_status": parent_status,
        "confirmed_closeout_status": closeout_status,
        "request_root_status_matches_metadata_candidate":
            status_matches_qualified_candidate,
        "request_root_live_path_qualified": live_path_qualified,
        "request_root_override_absence_proven":
            closeout_status["server_default_observed"] is True
            and live_path_qualified,
        "runtime_integration": False,
        "payment_acceptance": False,
        "production_gate_ready": False,
        "next_action": (
            "REQUEST_ROOT_QUALIFIED_FOR_CUSTODY_INSTALL_PLAN"
            if live_path_qualified
            else (
                "REQUEST_ROOT_STATUS_BINDING_REQUIRED"
                if candidate_count >= 1
                and closeout_status["observed"] is False
                else "REQUEST_ROOT_METADATA_HOLD"
            )
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--plan", action="store_true")
    group.add_argument("--run", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.plan:
        plan()
        return 0

    result = collect()
    print(MARKER)
    for key in (
        "mode",
        "sudo_used",
        "filesystem_write",
        "service_mutation",
        "systemd_mutation",
        "mount_mutation",
        "permission_mutation",
        "external_network_calls",
        "loopback_get_only",
        "process_environment_access",
        "request_payment_contents_read",
        "credential_access",
        "private_key_access",
        "wallet_or_signer_access",
        "transaction_construction",
        "transaction_signing",
        "transaction_broadcast",
        "chain2050_mutation",
        "public_presale_activation",
        "funds_movement",
    ):
        print(f"{key}={str(result[key]).lower() if isinstance(result[key], bool) else result[key]}")

    host = result["host"]
    print("hostname_matches_precision=" + str(host["hostname_matches_precision"]).lower())
    print("effective_user_is_zoso=" + str(host["effective_user_is_zoso"]).lower())

    user_service = result["runtime_user_service"]
    system_service = result["runtime_system_service"]
    process = result["runtime_process"]
    print("runtime_user_service_active=" + str(user_service["active_running"]).lower())
    print("runtime_system_service_active=" + str(system_service["active_running"]).lower())
    listener = result["runtime_http_listener"]
    print("runtime_http_listener_observed=" + str(listener["observed"]).lower())
    print("runtime_http_listener_candidate_count=" + str(listener["candidate_count"]))
    print("runtime_http_listener_owned_by_runtime_pid=" + str(listener["owned_by_runtime_pid"]).lower())
    print("runtime_http_loopback_listener_observed=" + str(listener["loopback_listener_observed"]).lower())
    print("runtime_process_generation_stable=" + str(process["generation_stable"]).lower())
    print("runtime_cwd_matches_historical_repo=" + str(process["cwd_matches_historical_repo"]).lower())
    print("runtime_exe_basename=" + str(process["exe_basename"]))

    cwd_candidate = result["cwd_default_request_root_candidate"]
    historical = result["historical_default_request_root_candidate"]
    print("cwd_default_candidate_exists=" + str(cwd_candidate["exists"]).lower())
    print("cwd_default_candidate_metadata_qualified=" + str(cwd_candidate["metadata_qualified"]).lower())
    print("historical_default_candidate_exists=" + str(historical["exists"]).lower())
    print("historical_default_candidate_metadata_qualified=" + str(historical["metadata_qualified"]).lower())
    print("candidate_roots_same_inode=" + str(result["candidate_roots_same_inode"]).lower())
    print("metadata_qualified_candidate_count=" + str(result["metadata_qualified_candidate_count"]))

    parent = result["parent_runtime_status"]
    print("parent_runtime_status_observed=" + str(parent["observed"]).lower())
    print("parent_runtime_status_marker_ok=" + str(parent["marker_ok"]).lower())
    print("parent_runtime_enabled=" + str(parent["enabled"]).lower())
    print("payment_keyed_full_runtime_present=" + str(parent["payment_keyed_full_runtime_present"]).lower())
    print("payment_keyed_full_runtime_enabled=" + str(parent["payment_keyed_full_runtime_enabled"]).lower())
    print("payment_keyed_full_runtime_apply_enabled=" + str(parent["payment_keyed_full_runtime_apply_enabled"]).lower())
    print("payment_keyed_full_runtime_policy_configured=" + str(parent["payment_keyed_full_runtime_policy_configured"]).lower())

    closeout = result["confirmed_closeout_status"]
    print("confirmed_closeout_status_observed=" + str(closeout["observed"]).lower())
    print("confirmed_closeout_server_default_observed=" + str(closeout["server_default_observed"]).lower())
    print("confirmed_closeout_explicit_override_observed=" + str(closeout["explicit_override_observed"]).lower())
    print("confirmed_closeout_matches_cwd_default=" + str(closeout["matches_cwd_default_candidate"]).lower())
    print("confirmed_closeout_matches_historical_default=" + str(closeout["matches_historical_default_candidate"]).lower())

    print("request_root_status_matches_metadata_candidate=" + str(result["request_root_status_matches_metadata_candidate"]).lower())
    print("request_root_live_path_qualified=" + str(result["request_root_live_path_qualified"]).lower())
    print("request_root_override_absence_proven=" + str(result["request_root_override_absence_proven"]).lower())
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("production_gate_ready=false")
    print("next_action=" + str(result["next_action"]))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CensusError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("production_gate_ready=false")
        raise SystemExit(2)
