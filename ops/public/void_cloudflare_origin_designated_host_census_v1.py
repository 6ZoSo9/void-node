#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import pwd
import re
import socket
import stat
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any

MARKER = "VOID_CLOUDFLARE_ORIGIN_DESIGNATED_HOST_CENSUS_V1"
EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
EXPECTED_USER = "zoso"
PUBLIC_HOSTNAME = "seed.nullfeed.org"
SYSTEM_UNITS = {
    "cloudflared": "void-public-seed-named-tunnel-v1.service",
    "adapter": "void-cloudflare-origin-proxy-v2-adapter-v1.service",
    "dispatcher": "void-public-443-proxy-v2-dispatch-v1.service",
}
HISTORICAL_USER_UNIT = "void-public-seed-named-tunnel-v1.service"
SOURCE_BLOBS = {
    "adapter": {
        "path": "ops/public/void-cloudflare-origin-proxy-v2-adapter-v1.mjs",
        "git_blob_sha1": "dd62dde9433f2fd4d0dbd5c499d0f50eeaa6d398",
    },
    "dispatcher": {
        "path": "ops/public/void-public-443-proxy-v2-dispatcher-v1.mjs",
        "git_blob_sha1": "bc39f84d3a2d70d26b54b9280ba5f0e23d7c7824",
    },
    "policy": {
        "path": "tools/void-cloudflare-origin-loopback-isolation-policy-v1.mjs",
        "git_blob_sha1": "13f78dfef5634f4ff9f930d6d2be9a29447674cd",
    },
}
REVIEWED_FRONTDOOR_SOURCE = {
    "path": "ops/public/void-public-frontdoor-v1.mjs",
    "git_blob_sha1": "176f4a99c42ac3432d5797efaebf851cc0503737",
    "bind": "127.0.0.1",
    "port": 8083,
}
ORDINARY_FRONTDOOR_SERVICE = (
    f"http://{REVIEWED_FRONTDOOR_SOURCE['bind']}:"
    f"{REVIEWED_FRONTDOOR_SOURCE['port']}"
)
GLOBAL_CATCHALL_SERVICE = "http_status:404"
SENSITIVE_PATHS = (
    "/__void/agents/paid-work/credential-requests/v1",
    "/wc/public-earning-pilot-v1/claim-ticket",
    "/wc/public-earning-pilot-v1/submit-result",
)
ROOT = pathlib.Path(__file__).resolve().parents[2]
SYSTEMCTL = pathlib.Path("/usr/bin/systemctl")
RUNUSER_CANDIDATES = (
    pathlib.Path("/usr/sbin/runuser"),
    pathlib.Path("/usr/bin/runuser"),
)
ENV = pathlib.Path("/usr/bin/env")
SS = pathlib.Path("/usr/bin/ss")
GIT = pathlib.Path("/usr/bin/git")
NFT_CANDIDATES = (
    pathlib.Path("/usr/sbin/nft"),
    pathlib.Path("/usr/bin/nft"),
)
MAX_COMMAND_BYTES = 2 * 1024 * 1024
MAX_PROC_BYTES = 1024 * 1024
MAX_CONFIG_BYTES = 1024 * 1024
MAX_SOURCE_BYTES = 4 * 1024 * 1024
TABLE_FAMILY = "inet"
TABLE_NAME = "void_cloudflare_origin_edge_v1"

class CensusError(RuntimeError):
    pass

def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()

def safe_root_env() -> dict[str, str]:
    return {
        "PATH": "/usr/sbin:/usr/bin:/sbin:/bin",
        "LANG": "C",
        "LC_ALL": "C",
        "SYSTEMD_PAGER": "cat",
        "SYSTEMD_COLORS": "0",
        "PAGER": "cat",
        "NO_COLOR": "1",
    }

def command_identity(path: pathlib.Path) -> tuple[str, int, int, int, int]:
    resolved = path.resolve(strict=True)
    info = resolved.stat()
    if (
        not stat.S_ISREG(info.st_mode)
        or not info.st_mode & 0o111
        or info.st_uid != 0
        or stat.S_IMODE(info.st_mode) & 0o022
    ):
        raise CensusError(f"command_identity_untrusted:{path.name}")
    return (str(resolved), info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns)

def run_read_only(
    path: pathlib.Path,
    args: list[str],
    *,
    env: dict[str, str] | None = None,
    allow_failure: bool = False,
    timeout: int = 10,
) -> tuple[int, bytes, bytes]:
    before = command_identity(path)
    result = subprocess.run(
        [before[0], *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=safe_root_env() if env is None else env,
        timeout=timeout,
        check=False,
    )
    if len(result.stdout) > MAX_COMMAND_BYTES or len(result.stderr) > MAX_COMMAND_BYTES:
        raise CensusError(f"command_output_too_large:{path.name}")
    after = command_identity(path)
    if before != after:
        raise CensusError(f"command_changed_during_read:{path.name}")
    if result.returncode != 0 and not allow_failure:
        raise CensusError(f"command_failed:{path.name}")
    return result.returncode, result.stdout, result.stderr

def read_bounded(path: pathlib.Path, maximum: int) -> bytes:
    if not isinstance(maximum, int) or maximum < 1:
        raise CensusError("bounded_read_limit_invalid")
    try:
        with path.open("rb", buffering=0) as handle:
            data = handle.read(maximum + 1)
    except OSError as exc:
        raise CensusError(f"bounded_read_unavailable:{path.name}") from exc
    if len(data) > maximum:
        raise CensusError(f"bounded_read_size_invalid:{path.name}")
    return data

def read_regular_descriptor_bound(
    path: pathlib.Path,
    maximum: int,
) -> tuple[bytes, bool]:
    try:
        visible_before = path.lstat()
        if (
            not stat.S_ISREG(visible_before.st_mode)
            or stat.S_ISLNK(visible_before.st_mode)
            or visible_before.st_size < 1
            or visible_before.st_size > maximum
        ):
            return b"", False
        fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
        try:
            opened = os.fstat(fd)
            if (
                opened.st_dev != visible_before.st_dev
                or opened.st_ino != visible_before.st_ino
                or opened.st_size != visible_before.st_size
            ):
                return b"", False
            chunks: list[bytes] = []
            remaining = opened.st_size
            while remaining:
                chunk = os.read(fd, min(65536, remaining))
                if not chunk:
                    return b"", False
                chunks.append(chunk)
                remaining -= len(chunk)
            after = os.fstat(fd)
            visible_after = path.lstat()
        finally:
            os.close(fd)
    except OSError:
        return b"", False
    stable = (
        after.st_dev == opened.st_dev
        and after.st_ino == opened.st_ino
        and after.st_size == opened.st_size
        and after.st_mtime_ns == opened.st_mtime_ns
        and after.st_ctime_ns == opened.st_ctime_ns
        and visible_after.st_dev == after.st_dev
        and visible_after.st_ino == after.st_ino
        and visible_after.st_size == after.st_size
        and visible_after.st_mtime_ns == after.st_mtime_ns
        and visible_after.st_ctime_ns == after.st_ctime_ns
    )
    return b"".join(chunks), stable

def parse_key_values(raw: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in raw.splitlines():
        if not line:
            continue
        if "=" not in line:
            raise CensusError("systemctl_row_malformed")
        key, value = line.split("=", 1)
        if not key or key in out:
            raise CensusError("systemctl_row_duplicate")
        out[key] = value
    return out

def parse_proc_start_ticks(raw: bytes | str) -> int:
    text = raw.decode("utf-8", "strict") if isinstance(raw, bytes) else raw
    closing = text.rfind(")")
    if closing < 2:
        raise CensusError("proc_stat_malformed")
    tail = text[closing + 2 :].split()
    if len(tail) < 20 or not re.fullmatch(r"[1-9][0-9]*", tail[19]):
        raise CensusError("proc_stat_start_ticks_invalid")
    return int(tail[19])

def read_proc_start_ticks(pid: int) -> int | None:
    if pid < 1:
        return None
    try:
        return parse_proc_start_ticks(
            read_bounded(pathlib.Path(f"/proc/{pid}/stat"), 64 * 1024)
        )
    except (OSError, CensusError, UnicodeDecodeError):
        return None

def parse_proc_status(raw: str) -> dict[str, Any]:
    values: dict[str, str] = {}
    for line in raw.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        values[key] = value.strip()
    uid = values.get("Uid", "").split()
    gid = values.get("Gid", "").split()
    if len(uid) != 4 or len(gid) != 4 or not all(v.isdigit() for v in [*uid, *gid]):
        raise CensusError("proc_status_identity_invalid")
    caps: dict[str, int] = {}
    for source, target in (
        ("CapEff", "effective"),
        ("CapPrm", "permitted"),
        ("CapInh", "inheritable"),
        ("CapAmb", "ambient"),
        ("CapBnd", "bounding"),
    ):
        raw_cap = values.get(source, "")
        if not re.fullmatch(r"[0-9a-fA-F]+", raw_cap):
            raise CensusError(f"proc_status_{source.lower()}_invalid")
        caps[target] = int(raw_cap, 16)
    nnp = values.get("NoNewPrivs")
    if nnp not in {"0", "1"}:
        raise CensusError("proc_status_no_new_privileges_invalid")
    return {
        "effective_uid": int(uid[1]),
        "effective_gid": int(gid[1]),
        "no_new_privileges": nnp == "1",
        "capabilities_effective_empty": caps["effective"] == 0,
        "capabilities_permitted_empty": caps["permitted"] == 0,
        "capabilities_inheritable_empty": caps["inheritable"] == 0,
        "capabilities_ambient_empty": caps["ambient"] == 0,
        "capabilities_bounding_empty": caps["bounding"] == 0,
        "all_capability_sets_empty": all(value == 0 for value in caps.values()),
        "cap_net_admin": bool(caps["effective"] & (1 << 12)),
    }

def process_comm(pid: int) -> str | None:
    try:
        raw = read_bounded(pathlib.Path(f"/proc/{pid}/comm"), 4096)
        value = raw.decode("utf-8", "strict").strip()
        return value if value else None
    except (OSError, CensusError, UnicodeDecodeError):
        return None

def read_proc_cmdline(pid: int) -> list[str] | None:
    try:
        raw = read_bounded(pathlib.Path(f"/proc/{pid}/cmdline"), MAX_PROC_BYTES)
        if not raw.endswith(b"\0"):
            return None
        return [part.decode("utf-8", "strict") for part in raw.split(b"\0") if part]
    except (OSError, CensusError, UnicodeDecodeError):
        return None

def process_source(pid: int, expected_blob: str) -> dict[str, Any]:
    result = {
        "node_executable": False,
        "entry_present": False,
        "running_git_blob_sha1": None,
        "running_sha256": None,
        "matches_reviewed_blob": False,
        "retained_descriptor_generation_stable": False,
        "root_owned_nonwritable_source": False,
    }
    argv = read_proc_cmdline(pid)
    if not argv or len(argv) < 2:
        return result
    try:
        exe = pathlib.Path(os.path.realpath(f"/proc/{pid}/exe"))
        cwd = pathlib.Path(os.path.realpath(f"/proc/{pid}/cwd"))
    except OSError:
        return result
    if exe.name not in {"node", "nodejs"}:
        return result
    result["node_executable"] = True
    candidate = pathlib.Path(argv[1])
    if not candidate.is_absolute():
        candidate = cwd / candidate
    try:
        resolved = candidate.resolve(strict=True)
        visible_before = resolved.lstat()
        if (
            not stat.S_ISREG(visible_before.st_mode)
            or stat.S_ISLNK(visible_before.st_mode)
            or visible_before.st_size < 1
            or visible_before.st_size > MAX_SOURCE_BYTES
        ):
            return result
        fd = os.open(
            resolved,
            os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0),
        )
        try:
            opened = os.fstat(fd)
            if (
                opened.st_dev != visible_before.st_dev
                or opened.st_ino != visible_before.st_ino
                or opened.st_size != visible_before.st_size
            ):
                return result
            data = b""
            remaining = opened.st_size
            while remaining:
                chunk = os.read(fd, min(65536, remaining))
                if not chunk:
                    return result
                data += chunk
                remaining -= len(chunk)
            after = os.fstat(fd)
            visible_after = resolved.lstat()
        finally:
            os.close(fd)
    except OSError:
        return result
    stable = (
        after.st_dev == opened.st_dev
        and after.st_ino == opened.st_ino
        and after.st_size == opened.st_size
        and after.st_mtime_ns == opened.st_mtime_ns
        and after.st_ctime_ns == opened.st_ctime_ns
        and visible_after.st_dev == after.st_dev
        and visible_after.st_ino == after.st_ino
        and visible_after.st_size == after.st_size
        and visible_after.st_mtime_ns == after.st_mtime_ns
        and visible_after.st_ctime_ns == after.st_ctime_ns
    )
    result["entry_present"] = True
    result["retained_descriptor_generation_stable"] = stable
    result["root_owned_nonwritable_source"] = (
        opened.st_uid == 0 and stat.S_IMODE(opened.st_mode) & 0o022 == 0
    )
    result["running_git_blob_sha1"] = git_blob_sha1(data)
    result["running_sha256"] = sha256_bytes(data)
    result["matches_reviewed_blob"] = (
        stable
        and result["root_owned_nonwritable_source"]
        and result["running_git_blob_sha1"] == expected_blob
    )
    return result

def cloudflared_executable(pid: int) -> dict[str, Any]:
    result = {
        "comm_is_cloudflared": process_comm(pid) == "cloudflared",
        "executable_regular": False,
        "executable_root_owned": False,
        "executable_group_world_writable": None,
        "executable_path_sha256": None,
    }
    try:
        path_value = os.path.realpath(f"/proc/{pid}/exe")
        target = pathlib.Path(path_value)
        info = target.stat()
    except OSError:
        return result
    result["executable_regular"] = stat.S_ISREG(info.st_mode)
    result["executable_root_owned"] = info.st_uid == 0
    result["executable_group_world_writable"] = bool(stat.S_IMODE(info.st_mode) & 0o022)
    result["executable_path_sha256"] = sha256_bytes(path_value.encode("utf-8"))
    return result

def system_unit_snapshot(role: str) -> dict[str, Any]:
    unit = SYSTEM_UNITS[role]
    props = [
        "LoadState", "ActiveState", "SubState", "MainPID",
        "NoNewPrivileges", "CapabilityBoundingSet", "AmbientCapabilities",
        "User", "Group",
    ]
    code, stdout, _ = run_read_only(
        SYSTEMCTL,
        ["show", unit, "--no-pager", *[f"--property={p}" for p in props]],
        allow_failure=True,
    )
    values = parse_key_values(stdout.decode("utf-8", "strict")) if stdout else {}
    pid_text = values.get("MainPID", "")
    pid = int(pid_text) if pid_text.isdigit() else 0
    active = (
        code == 0
        and values.get("LoadState") == "loaded"
        and values.get("ActiveState") == "active"
        and values.get("SubState") == "running"
        and pid > 0
    )
    out: dict[str, Any] = {
        "unit": unit,
        "loaded": code == 0 and values.get("LoadState") == "loaded",
        "active_running": active,
        "main_pid": pid,
        "process_start_ticks": read_proc_start_ticks(pid) if active else None,
        "systemd_no_new_privileges": values.get("NoNewPrivileges") == "yes",
        "systemd_capability_bounding_set_empty": values.get("CapabilityBoundingSet") == "",
        "systemd_ambient_capabilities_empty": values.get("AmbientCapabilities") == "",
        "configured_user": values.get("User") or None,
        "configured_group": values.get("Group") or None,
    }
    if active:
        try:
            out.update(
                parse_proc_status(
                    read_bounded(pathlib.Path(f"/proc/{pid}/status"), MAX_PROC_BYTES)
                    .decode("utf-8", "strict")
                )
            )
        except (OSError, CensusError, UnicodeDecodeError):
            out.update({
                "effective_uid": None,
                "effective_gid": None,
                "no_new_privileges": False,
                "capabilities_effective_empty": False,
                "capabilities_permitted_empty": False,
                "capabilities_inheritable_empty": False,
                "capabilities_ambient_empty": False,
                "capabilities_bounding_empty": False,
                "all_capability_sets_empty": False,
                "cap_net_admin": None,
            })
    else:
        out.update({
            "effective_uid": None,
            "effective_gid": None,
            "no_new_privileges": False,
            "capabilities_effective_empty": False,
            "capabilities_permitted_empty": False,
            "capabilities_inheritable_empty": False,
            "capabilities_ambient_empty": False,
            "capabilities_bounding_empty": False,
            "all_capability_sets_empty": False,
            "cap_net_admin": None,
        })
    if role in SOURCE_BLOBS:
        out["source"] = process_source(pid, SOURCE_BLOBS[role]["git_blob_sha1"]) if active else {
            "node_executable": False,
            "entry_present": False,
            "running_git_blob_sha1": None,
            "running_sha256": None,
            "matches_reviewed_blob": False,
        }
    elif role == "cloudflared":
        out["process"] = cloudflared_executable(pid) if active else {
            "comm_is_cloudflared": False,
            "executable_regular": False,
            "executable_root_owned": False,
            "executable_group_world_writable": None,
            "executable_path_sha256": None,
        }
    return out

def system_generation(unit: str) -> dict[str, Any]:
    code, stdout, _ = run_read_only(
        SYSTEMCTL,
        [
            "show", unit, "--no-pager",
            "--property=LoadState", "--property=ActiveState",
            "--property=SubState", "--property=MainPID",
        ],
        allow_failure=True,
    )
    values = parse_key_values(stdout.decode("utf-8", "strict")) if stdout else {}
    pid_text = values.get("MainPID", "")
    pid = int(pid_text) if pid_text.isdigit() else 0
    active = (
        code == 0
        and values.get("LoadState") == "loaded"
        and values.get("ActiveState") == "active"
        and values.get("SubState") == "running"
        and pid > 0
    )
    return {
        "active_running": active,
        "main_pid": pid,
        "start_ticks": read_proc_start_ticks(pid) if active else None,
    }

def same_generation(first: dict[str, Any], second: dict[str, Any]) -> bool:
    return (
        first.get("active_running") is True
        and second.get("active_running") is True
        and first.get("main_pid") == second.get("main_pid")
        and isinstance(first.get("process_start_ticks"), int)
        and first.get("process_start_ticks") == second.get("start_ticks")
    )

def classify_historical_user_tunnel_query(
    code: int,
    values: dict[str, str],
) -> dict[str, Any]:
    result = {
        "query_observed": False,
        "query_authenticated": False,
        "authority": "untrusted_user_bus_shape_only",
        "reported_loaded": None,
        "reported_active_running": None,
        "reported_unit_file_state": None,
        "retired_candidate_observed": False,
        "retirement_verified": False,
    }
    if "LoadState" not in values or "ActiveState" not in values:
        return result
    result["query_observed"] = True
    result["reported_loaded"] = (
        code == 0 and values.get("LoadState") == "loaded"
    )
    result["reported_unit_file_state"] = values.get("UnitFileState") or None
    pid_text = values.get("MainPID", "")
    pid = int(pid_text) if pid_text.isdigit() else 0
    result["reported_active_running"] = (
        code == 0
        and values.get("LoadState") == "loaded"
        and values.get("ActiveState") == "active"
        and values.get("SubState") == "running"
        and pid > 0
    )
    return result

def historical_user_tunnel_snapshot() -> dict[str, Any]:
    empty = classify_historical_user_tunnel_query(1, {})
    try:
        user = pwd.getpwnam(EXPECTED_USER)
    except KeyError:
        return empty
    runuser = next((p for p in RUNUSER_CANDIDATES if p.exists()), None)
    if runuser is None or not ENV.exists():
        return empty
    try:
        command_identity(ENV)
        command_identity(SYSTEMCTL)
    except CensusError:
        return empty
    args = [
        "-u", EXPECTED_USER, "--", str(ENV), "-i",
        "PATH=/usr/bin:/bin",
        f"HOME={user.pw_dir}",
        "LANG=C", "LC_ALL=C",
        f"XDG_RUNTIME_DIR=/run/user/{user.pw_uid}",
        f"DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/{user.pw_uid}/bus",
        "SYSTEMD_PAGER=cat", "SYSTEMD_COLORS=0", "NO_COLOR=1",
        str(SYSTEMCTL), "--user", "show", HISTORICAL_USER_UNIT, "--no-pager",
        "--property=LoadState", "--property=ActiveState",
        "--property=SubState", "--property=MainPID",
        "--property=UnitFileState",
    ]
    try:
        code, stdout, _ = run_read_only(runuser, args, allow_failure=True)
        values = parse_key_values(stdout.decode("utf-8", "strict")) if stdout else {}
    except (CensusError, UnicodeDecodeError):
        return empty
    return classify_historical_user_tunnel_query(code, values)

def parse_ss(raw: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 5 or parts[0] != "LISTEN":
            raise CensusError("ss_listener_row_malformed")
        rows.append({
            "local": parts[3],
            "peer": parts[4],
            "process": " ".join(parts[5:]) if len(parts) > 5 else "",
        })
    return rows

def listener_process_pids(process: str) -> set[int]:
    if not isinstance(process, str) or not process:
        return set()
    return {
        int(value)
        for value in re.findall(
            r"(?:^|[^A-Za-z0-9_])pid=([1-9][0-9]*)(?=[^0-9]|$)",
            process,
        )
    }

def listener_set(rows: list[dict[str, Any]], pid: int) -> dict[str, Any]:
    pid_sets = [
        (row, listener_process_pids(str(row["process"])))
        for row in rows
    ]
    owned = [
        (row, pids)
        for row, pids in pid_sets
        if pid > 0 and pid in pids
    ]
    locals_ = [str(row["local"]) for row, _pids in owned]
    ipv4 = []
    for local in locals_:
        match = re.fullmatch(r"127\.0\.0\.1:([1-9][0-9]*)", local)
        if match:
            ipv4.append(int(match.group(1)))
    exclusive_process_owner = bool(owned) and all(
        pids == {pid} for _row, pids in owned
    )
    additional_process_owner_observed = any(
        bool(pids - {pid}) for _row, pids in owned
    )
    exact = (
        len(owned) == 1
        and len(ipv4) == 1
        and exclusive_process_owner
    )
    return {
        "owned_tcp_listener_count": len(owned),
        "observed_ipv4_loopback_ports": sorted(ipv4),
        "exclusive_process_owner": exclusive_process_owner,
        "additional_process_owner_observed": additional_process_owner_observed,
        "exact_single_ipv4_loopback_listener": exact,
        "listener_port": ipv4[0] if exact else None,
        "additional_or_ipv6_listener_observed": len(owned) != len(ipv4),
    }

def operator_tunnel_config_path(raw: str | None) -> pathlib.Path:
    if raw is None or not os.path.isabs(raw) or "\x00" in raw:
        raise CensusError("operator_tunnel_config_path_invalid")
    candidate = pathlib.Path(raw)
    try:
        resolved = candidate.resolve(strict=True)
    except OSError as exc:
        raise CensusError("operator_tunnel_config_path_unavailable") from exc
    if resolved != candidate:
        raise CensusError("operator_tunnel_config_path_not_canonical")
    return resolved

def empty_file_custody(path_value: pathlib.Path | None) -> dict[str, Any]:
    return {
        "path_observed": path_value is not None,
        "path_sha256": sha256_bytes(str(path_value).encode("utf-8")) if path_value else None,
        "regular_nonsymlink": False,
        "owner_uid_matches": False,
        "group_other_bits_zero": False,
        "nlink_one": False,
        "parent_real_directory": False,
        "parent_owner_uid_matches": False,
        "parent_group_other_bits_zero": False,
        "generation_stable": False,
        "metadata_descriptor_only": False,
        "contents_read": False,
        "custody_shape_observed": False,
    }

def same_file_stat(first: os.stat_result, second: os.stat_result) -> bool:
    return (
        first.st_dev == second.st_dev
        and first.st_ino == second.st_ino
        and first.st_mode == second.st_mode
        and first.st_uid == second.st_uid
        and first.st_gid == second.st_gid
        and first.st_nlink == second.st_nlink
        and first.st_size == second.st_size
        and first.st_mtime_ns == second.st_mtime_ns
        and first.st_ctime_ns == second.st_ctime_ns
    )

def same_directory_stat(first: os.stat_result, second: os.stat_result) -> bool:
    return (
        first.st_dev == second.st_dev
        and first.st_ino == second.st_ino
        and first.st_mode == second.st_mode
        and first.st_uid == second.st_uid
        and first.st_gid == second.st_gid
        and first.st_nlink == second.st_nlink
        and first.st_mtime_ns == second.st_mtime_ns
        and first.st_ctime_ns == second.st_ctime_ns
    )

def descriptor_bound_file_custody(
    path_value: pathlib.Path | None,
    owner_uid: int | None,
    *,
    maximum: int | None = None,
    read_contents: bool = False,
) -> tuple[bytes, dict[str, Any]]:
    result = empty_file_custody(path_value)
    if path_value is None or not isinstance(owner_uid, int) or owner_uid < 1:
        return b"", result
    if read_contents and (not isinstance(maximum, int) or maximum < 1):
        return b"", result
    if not read_contents and not hasattr(os, "O_PATH"):
        return b"", result

    parent = path_value.parent
    parent_fd: int | None = None
    file_fd: int | None = None
    data = b""
    try:
        visible_before = path_value.lstat()
        parent_before = parent.lstat()
        if (
            not stat.S_ISREG(visible_before.st_mode)
            or stat.S_ISLNK(visible_before.st_mode)
            or not stat.S_ISDIR(parent_before.st_mode)
            or stat.S_ISLNK(parent_before.st_mode)
        ):
            return b"", result
        if path_value.resolve(strict=True) != path_value:
            return b"", result
        if parent.resolve(strict=True) != parent:
            return b"", result
        if read_contents and (
            visible_before.st_size < 1
            or visible_before.st_size > maximum
        ):
            return b"", result

        parent_flags = (
            getattr(os, "O_PATH", os.O_RDONLY)
            | getattr(os, "O_DIRECTORY", 0)
            | getattr(os, "O_NOFOLLOW", 0)
        )
        parent_fd = os.open(parent, parent_flags)
        parent_opened = os.fstat(parent_fd)
        if not same_directory_stat(parent_before, parent_opened):
            return b"", result

        file_flags = (
            os.O_RDONLY
            if read_contents
            else getattr(os, "O_PATH")
        ) | getattr(os, "O_NOFOLLOW", 0)
        file_fd = os.open(path_value.name, file_flags, dir_fd=parent_fd)
        opened = os.fstat(file_fd)
        if not same_file_stat(visible_before, opened):
            return b"", result

        if read_contents:
            chunks: list[bytes] = []
            remaining = opened.st_size
            while remaining:
                chunk = os.read(file_fd, min(65536, remaining))
                if not chunk:
                    return b"", result
                chunks.append(chunk)
                remaining -= len(chunk)
            data = b"".join(chunks)

        after = os.fstat(file_fd)
        parent_after = os.fstat(parent_fd)
        visible_after = path_value.lstat()
        parent_visible_after = parent.lstat()
        path_canonical_after = path_value.resolve(strict=True) == path_value
        parent_canonical_after = parent.resolve(strict=True) == parent
    except OSError:
        return b"", result
    finally:
        if file_fd is not None:
            os.close(file_fd)
        if parent_fd is not None:
            os.close(parent_fd)

    stable = (
        same_file_stat(opened, after)
        and same_file_stat(after, visible_after)
        and same_directory_stat(parent_opened, parent_after)
        and same_directory_stat(parent_after, parent_visible_after)
        and path_canonical_after
        and parent_canonical_after
    )
    result["regular_nonsymlink"] = (
        stat.S_ISREG(opened.st_mode) and not stat.S_ISLNK(opened.st_mode)
    )
    result["owner_uid_matches"] = opened.st_uid == owner_uid
    result["group_other_bits_zero"] = stat.S_IMODE(opened.st_mode) & 0o077 == 0
    result["nlink_one"] = opened.st_nlink == 1
    result["parent_real_directory"] = (
        stat.S_ISDIR(parent_opened.st_mode)
        and not stat.S_ISLNK(parent_opened.st_mode)
        and parent_canonical_after
    )
    result["parent_owner_uid_matches"] = parent_opened.st_uid == owner_uid
    result["parent_group_other_bits_zero"] = (
        stat.S_IMODE(parent_opened.st_mode) & 0o077 == 0
    )
    result["generation_stable"] = stable
    result["metadata_descriptor_only"] = not read_contents
    result["contents_read"] = read_contents and stable
    result["custody_shape_observed"] = stable and all([
        result["regular_nonsymlink"],
        result["owner_uid_matches"],
        result["group_other_bits_zero"],
        result["nlink_one"],
        result["parent_real_directory"],
        result["parent_owner_uid_matches"],
        result["parent_group_other_bits_zero"],
    ])
    return (data if stable else b""), result

def yaml_scalar(raw: str) -> str | None:
    value = raw.strip()
    if not value:
        return None
    if value.startswith('"') and value.endswith('"') and len(value) >= 2:
        inner = value[1:-1]
        return inner if '\\' not in inner and '"' not in inner else None
    if value.startswith("'") and value.endswith("'") and len(value) >= 2:
        inner = value[1:-1]
        return inner if "'" not in inner else None
    if any(ch in value for ch in "{}[]#"):
        return None
    return value

def canonical_sensitive_path(value: str | None) -> str | None:
    if value is None:
        return None
    for expected in SENSITIVE_PATHS:
        if value == "^" + expected + "$":
            return expected
    return None

def parse_tunnel_config(raw: str) -> dict[str, Any]:
    if "\x00" in raw or "\t" in raw:
        raise CensusError("tunnel_config_noncanonical")
    credentials: list[str] = []
    rules: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    in_origin = False
    ingress_seen = False
    in_ingress = False

    def begin_rule() -> dict[str, Any]:
        return {
            "hostname": None,
            "path": None,
            "service": None,
            "http_host_header": None,
            "disable_chunked_encoding": None,
            "_origin_request_seen": False,
        }

    for raw_line in raw.splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue
        indent = len(raw_line) - len(raw_line.lstrip(" "))
        line = raw_line.strip()
        if line == "ingress:":
            if indent != 0:
                raise CensusError("tunnel_ingress_noncanonical_indent")
            if ingress_seen:
                raise CensusError("tunnel_ingress_duplicate")
            if current is not None:
                rules.append(current)
                current = None
            ingress_seen = True
            in_ingress = True
            in_origin = False
            continue

        if indent == 0:
            if current is not None:
                rules.append(current)
                current = None
            in_ingress = False
            in_origin = False
            if line.startswith("credentials-file:"):
                scalar = yaml_scalar(line.split(":", 1)[1])
                if scalar is None:
                    raise CensusError("tunnel_credentials_path_invalid")
                credentials.append(scalar)
            continue

        if line.startswith("credentials-file:"):
            raise CensusError("tunnel_credentials_path_noncanonical_indent")
        if not in_ingress:
            continue

        if indent == 2 and line.startswith("- "):
            if current is not None:
                rules.append(current)
            current = begin_rule()
            in_origin = False
            if line.startswith("- hostname:"):
                scalar = yaml_scalar(line.split(":", 1)[1])
                if scalar is None:
                    raise CensusError("tunnel_hostname_invalid")
                current["hostname"] = scalar
            elif line.startswith("- service:"):
                scalar = yaml_scalar(line.split(":", 1)[1])
                if scalar is None:
                    raise CensusError("tunnel_service_invalid")
                current["service"] = scalar
            elif line.startswith("- path:"):
                scalar = yaml_scalar(line.split(":", 1)[1])
                if scalar is None:
                    raise CensusError("tunnel_path_invalid")
                current["path"] = scalar
            else:
                raise CensusError("tunnel_rule_list_item_invalid")
            continue

        if current is None:
            continue

        # originRequest child fields are valid only while that exact
        # four-space mapping remains the active parent. Any sibling transition
        # ends the scope before a later six-space field can be credited.
        if in_origin and indent <= 4:
            in_origin = False

        if indent == 4 and line.startswith("hostname:"):
            if current["hostname"] is not None:
                raise CensusError("tunnel_rule_duplicate_hostname")
            scalar = yaml_scalar(line.split(":", 1)[1])
            if scalar is None:
                raise CensusError("tunnel_hostname_invalid")
            current["hostname"] = scalar
            in_origin = False
        elif indent == 4 and line.startswith("path:"):
            if current["path"] is not None:
                raise CensusError("tunnel_rule_duplicate_path")
            scalar = yaml_scalar(line.split(":", 1)[1])
            if scalar is None:
                raise CensusError("tunnel_path_invalid")
            current["path"] = scalar
            in_origin = False
        elif indent == 4 and line.startswith("service:"):
            if current["service"] is not None:
                raise CensusError("tunnel_rule_duplicate_service")
            scalar = yaml_scalar(line.split(":", 1)[1])
            if scalar is None:
                raise CensusError("tunnel_service_invalid")
            current["service"] = scalar
            in_origin = False
        elif indent == 4 and line == "originRequest:":
            if current["_origin_request_seen"]:
                raise CensusError("tunnel_rule_duplicate_origin_request")
            current["_origin_request_seen"] = True
            in_origin = True
        elif in_origin and indent == 6 and line.startswith("httpHostHeader:"):
            if current["http_host_header"] is not None:
                raise CensusError("tunnel_rule_duplicate_http_host_header")
            scalar = yaml_scalar(line.split(":", 1)[1])
            if scalar is None:
                raise CensusError("tunnel_rule_http_host_header_invalid")
            current["http_host_header"] = scalar
        elif in_origin and indent == 6 and line.startswith("disableChunkedEncoding:"):
            if current["disable_chunked_encoding"] is not None:
                raise CensusError("tunnel_rule_duplicate_chunked_encoding")
            scalar = yaml_scalar(line.split(":", 1)[1])
            if scalar not in {"true", "false"}:
                raise CensusError("tunnel_rule_chunked_encoding_invalid")
            current["disable_chunked_encoding"] = scalar == "true"

    if current is not None:
        rules.append(current)
    if not ingress_seen:
        raise CensusError("tunnel_ingress_missing")
    if len(credentials) != 1:
        raise CensusError("tunnel_credentials_path_ambiguous")
    credential_path = pathlib.Path(credentials[0])
    if not credential_path.is_absolute() or "\x00" in credentials[0]:
        raise CensusError("tunnel_credentials_path_invalid")
    if os.path.normpath(credentials[0]) != credentials[0]:
        raise CensusError("tunnel_credentials_path_not_canonical")

    sensitive: list[dict[str, Any]] = []
    public_other: list[tuple[int, dict[str, Any]]] = []
    wildcard_public: list[tuple[int, dict[str, Any]]] = []
    hostless: list[tuple[int, dict[str, Any]]] = []
    public_hostname_noncanonical = False

    for index, rule in enumerate(rules):
        hostname = rule["hostname"]
        if hostname is None:
            hostless.append((index, rule))
            continue
        if not isinstance(hostname, str):
            continue
        if hostname.casefold() == PUBLIC_HOSTNAME.casefold():
            if hostname != PUBLIC_HOSTNAME:
                public_hostname_noncanonical = True
            canonical_path = canonical_sensitive_path(rule["path"])
            if canonical_path is None:
                public_other.append((index, rule))
                continue
            service = rule["service"]
            match = re.fullmatch(r"http://127\.0\.0\.1:([1-9][0-9]*)", service or "")
            sensitive.append({
                "index": index,
                "path": canonical_path,
                "adapter_port": int(match.group(1)) if match else None,
                "http_host_header_bound": rule["http_host_header"] == PUBLIC_HOSTNAME,
                "disable_chunked_encoding": rule["disable_chunked_encoding"] is True,
            })
            continue
        if (
            hostname.startswith("*.")
            and PUBLIC_HOSTNAME.casefold().endswith(hostname[1:].casefold())
        ):
            wildcard_public.append((index, rule))

    unique_paths = [row["path"] for row in sensitive]
    ports = [row["adapter_port"] for row in sensitive]
    base_shape = (
        not public_hostname_noncanonical
        and len(sensitive) == len(SENSITIVE_PATHS)
        and sorted(unique_paths) == sorted(SENSITIVE_PATHS)
        and len(set(unique_paths)) == len(unique_paths)
        and all(isinstance(port, int) for port in ports)
        and len(set(ports)) == 1
        and all(row["http_host_header_bound"] for row in sensitive)
        and all(row["disable_chunked_encoding"] for row in sensitive)
    )
    sensitive_port = ports[0] if base_shape else None
    adapter_service = (
        f"http://127.0.0.1:{sensitive_port}"
        if isinstance(sensitive_port, int)
        else None
    )

    ordinary_seed_rules = [
        (index, rule)
        for index, rule in public_other
        if rule.get("path") is None and isinstance(rule.get("service"), str)
    ]
    ordinary_index = (
        ordinary_seed_rules[0][0]
        if len(ordinary_seed_rules) == 1
        else None
    )
    sensitive_precede_ordinary = (
        isinstance(ordinary_index, int)
        and len(sensitive) == len(SENSITIVE_PATHS)
        and all(row["index"] < ordinary_index for row in sensitive)
    )
    wildcard_shadow_absent = (
        isinstance(ordinary_index, int)
        and all(index > ordinary_index for index, _rule in wildcard_public)
    )
    global_catchall_last = (
        len(hostless) == 1
        and hostless[0][0] == len(rules) - 1
        and hostless[0][1].get("path") is None
        and hostless[0][1].get("service") == GLOBAL_CATCHALL_SERVICE
    )
    exact_public_rule_set = (
        len(public_other) == 1
        and len(ordinary_seed_rules) == 1
    )
    ordinary_frontdoor_target_bound = (
        len(ordinary_seed_rules) == 1
        and ordinary_seed_rules[0][1].get("service")
        == ORDINARY_FRONTDOOR_SERVICE
    )
    extra_adapter_seed_rule = any(
        adapter_service is not None and rule.get("service") == adapter_service
        for _index, rule in public_other
    )
    first_match_order_verified = (
        sensitive_precede_ordinary
        and wildcard_shadow_absent
        and global_catchall_last
    )
    ordinary_preserved = (
        exact_public_rule_set
        and ordinary_frontdoor_target_bound
        and first_match_order_verified
    )
    shape = (
        base_shape
        and ordinary_preserved
        and not extra_adapter_seed_rule
    )

    return {
        "credential_path": credential_path,
        "sensitive_route_shape_observed": shape,
        "sensitive_adapter_port": sensitive_port if shape else None,
        "extra_adapter_seed_rule_observed": extra_adapter_seed_rule,
        "ordinary_seed_route_count": len(ordinary_seed_rules),
        "ordinary_routes_preserved_candidate": ordinary_preserved,
        "ordinary_frontdoor_target_bound": ordinary_frontdoor_target_bound,
        "first_match_order_verified": first_match_order_verified,
        "global_catchall_last": global_catchall_last,
        "global_catchall_http_status_404_bound": global_catchall_last,
        "public_hostname_wildcard_shadow_absent": wildcard_shadow_absent,
    }

def tunnel_config_snapshot(
    config: pathlib.Path,
    cloudflared_uid: int | None,
) -> dict[str, Any]:
    result = {
        "config_path_observed": False,
        "config_sha256": None,
        "config_generation_stable": False,
        "config_custody": empty_file_custody(None),
        "credentials_custody": empty_file_custody(None),
        "sensitive_route_shape_observed": False,
        "sensitive_adapter_port": None,
        "ordinary_routes_preserved_candidate": False,
        "config_text_read": False,
        "credential_contents_read": False,
    }
    result["config_path_observed"] = True
    data, config_custody = descriptor_bound_file_custody(
        config,
        cloudflared_uid,
        maximum=MAX_CONFIG_BYTES,
        read_contents=True,
    )
    result["config_custody"] = config_custody
    if (
        not config_custody["generation_stable"]
        or not config_custody["custody_shape_observed"]
        or not config_custody["contents_read"]
    ):
        return result
    try:
        parsed = parse_tunnel_config(data.decode("utf-8", "strict"))
    except (CensusError, UnicodeDecodeError):
        return result
    result["config_generation_stable"] = True
    result["config_text_read"] = True
    result["config_sha256"] = sha256_bytes(data)
    result["sensitive_route_shape_observed"] = parsed["sensitive_route_shape_observed"]
    result["sensitive_adapter_port"] = parsed["sensitive_adapter_port"]
    result["ordinary_routes_preserved_candidate"] = parsed["ordinary_routes_preserved_candidate"]
    _credential_bytes, credential_custody = descriptor_bound_file_custody(
        parsed["credential_path"],
        cloudflared_uid,
        read_contents=False,
    )
    result["credentials_custody"] = credential_custody
    result["credential_contents_read"] = False
    return result

def nft_snapshot() -> dict[str, Any]:
    result = {
        "table_present": False,
        "json_sha256": None,
        "rule_count": None,
        "exact_ruleset_verified": False,
    }
    executable = next((p for p in NFT_CANDIDATES if p.exists()), None)
    if executable is None:
        return result
    try:
        code, stdout, _ = run_read_only(
            executable,
            ["-j", "list", "table", TABLE_FAMILY, TABLE_NAME],
            allow_failure=True,
        )
        if code != 0 or not stdout:
            return result
        parsed = json.loads(stdout.decode("utf-8", "strict"))
        if not isinstance(parsed, dict) or not isinstance(parsed.get("nftables"), list):
            return result
    except (CensusError, UnicodeDecodeError, json.JSONDecodeError):
        return result
    rules = [
        item["rule"]
        for item in parsed["nftables"]
        if isinstance(item, dict) and isinstance(item.get("rule"), dict)
    ]
    result["table_present"] = True
    result["json_sha256"] = sha256_bytes(stdout)
    result["rule_count"] = len(rules)
    return result

def reviewed_checkout_blobs() -> dict[str, Any]:
    files: dict[str, Any] = {}
    all_match = True
    for role, row in SOURCE_BLOBS.items():
        path = ROOT / row["path"]
        try:
            data = read_bounded(path, MAX_SOURCE_BYTES)
            observed = git_blob_sha1(data)
        except (OSError, CensusError):
            observed = None
        match = observed == row["git_blob_sha1"]
        files[role] = {
            "path": row["path"],
            "expected_git_blob_sha1": row["git_blob_sha1"],
            "observed_git_blob_sha1": observed,
            "matches_reviewed_blob": match,
        }
        all_match = all_match and match
    return {"all_match": all_match, "files": files}

def checkout_head() -> str | None:
    try:
        code, stdout, _ = run_read_only(
            GIT, ["-C", str(ROOT), "rev-parse", "HEAD"], allow_failure=True
        )
    except CensusError:
        return None
    value = stdout.decode("ascii", "strict").strip() if code == 0 else ""
    return value if re.fullmatch(r"[0-9a-f]{40}", value) else None

def next_action(result: dict[str, Any]) -> str:
    if not result["host"]["hostname_matches_precision"] or not result["host"]["complete_privileged_visibility"]:
        return "PRECISION_ROOT_READ_ONLY_CENSUS_REQUIRED"
    if not result["reviewed_checkout_blobs"]["all_match"]:
        return "REVIEWED_SOURCE_BLOB_HOLD"
    if not result["historical_user_tunnel"]["query_observed"]:
        return "HISTORICAL_USER_TUNNEL_QUERY_HOLD"
    if result["historical_user_tunnel"]["reported_active_running"] is True:
        return "HISTORICAL_USER_TUNNEL_REPORTED_ACTIVE_HOLD"
    if not result["historical_user_tunnel"]["query_authenticated"]:
        return "HISTORICAL_USER_TUNNEL_AUTHORITY_HOLD"
    if not result["historical_user_tunnel"]["retirement_verified"]:
        return "HISTORICAL_USER_TUNNEL_RETIREMENT_STATE_HOLD"
    if not all(result["services"][name]["active_running"] for name in SYSTEM_UNITS):
        return "PROTECTED_SYSTEM_SERVICES_NOT_ACTIVE"
    if not result["all_service_process_generations_stable"]:
        return "SERVICE_PROCESS_GENERATION_HOLD"
    if not result["service_identity_shape_observed"]:
        return "SERVICE_IDENTITY_OR_CAPABILITY_HOLD"
    if not result["services"]["cloudflared"]["process"]["comm_is_cloudflared"]:
        return "CLOUDFLARED_PROCESS_IDENTITY_HOLD"
    if not (
        result["services"]["adapter"]["source"]["matches_reviewed_blob"]
        and result["services"]["dispatcher"]["source"]["matches_reviewed_blob"]
    ):
        return "RUNNING_SOURCE_CUSTODY_HOLD"
    if not result["listener_shape_observed"]:
        return "LISTENER_OWNERSHIP_HOLD"
    if not result["tunnel"]["private_custody_shape_observed"]:
        return "TUNNEL_PRIVATE_CUSTODY_HOLD"
    if not result["tunnel"]["config_generation_stable"]:
        return "TUNNEL_CONFIG_GENERATION_HOLD"
    if not result["tunnel"]["sensitive_route_shape_observed"]:
        return "TUNNEL_SENSITIVE_ROUTE_HOLD"
    if not result["tunnel"]["ordinary_routes_preserved_candidate"]:
        return "ORDINARY_TUNNEL_ROUTE_PRESERVATION_HOLD"
    if not result["tunnel"]["adapter_route_matches_listener"]:
        return "TUNNEL_ADAPTER_PORT_BINDING_HOLD"
    if not result["nftables"]["table_present"]:
        return "NFTABLES_INSTALL_PLAN_REQUIRED"
    return "EXACT_NFT_AND_CLOUDFLARE_CONTROL_PLANE_EVIDENCE_REQUIRED"

def collect(tunnel_config: pathlib.Path) -> dict[str, Any]:
    if os.geteuid() != 0:
        raise CensusError("root_read_visibility_required")
    hostname = socket.gethostname()
    services = {role: system_unit_snapshot(role) for role in SYSTEM_UNITS}
    historical = historical_user_tunnel_snapshot()
    try:
        _, ss_out, _ = run_read_only(SS, ["-H", "-ltnp"], allow_failure=False)
        listeners = parse_ss(ss_out.decode("utf-8", "strict"))
        ss_visible = True
    except (CensusError, UnicodeDecodeError):
        listeners = []
        ss_visible = False
    for role in ("adapter", "dispatcher"):
        services[role]["listeners"] = listener_set(
            listeners, int(services[role].get("main_pid") or 0)
        )
    uids = [services[name].get("effective_uid") for name in SYSTEM_UNITS]
    gids = [services[name].get("effective_gid") for name in SYSTEM_UNITS]
    identity_shape = (
        all(isinstance(value, int) and value > 0 for value in [*uids, *gids])
        and len(set(uids)) == 3
        and len(set(gids)) == 3
        and all(services[name].get("no_new_privileges") is True for name in SYSTEM_UNITS)
        and all(services[name].get("systemd_no_new_privileges") is True for name in SYSTEM_UNITS)
        and all(services[name].get("systemd_capability_bounding_set_empty") is True for name in SYSTEM_UNITS)
        and all(services[name].get("systemd_ambient_capabilities_empty") is True for name in SYSTEM_UNITS)
        and all(services[name].get("all_capability_sets_empty") is True for name in SYSTEM_UNITS)
        and all(services[name].get("cap_net_admin") is False for name in SYSTEM_UNITS)
    )
    listener_shape = (
        ss_visible
        and services["adapter"]["listeners"]["exact_single_ipv4_loopback_listener"]
        and services["dispatcher"]["listeners"]["exact_single_ipv4_loopback_listener"]
    )
    tunnel = tunnel_config_snapshot(
        tunnel_config,
        services["cloudflared"].get("effective_uid"),
    )
    tunnel["private_custody_shape_observed"] = (
        tunnel["config_custody"]["custody_shape_observed"]
        and tunnel["config_custody"]["generation_stable"]
        and tunnel["credentials_custody"]["custody_shape_observed"]
        and tunnel["credentials_custody"]["generation_stable"]
        and tunnel["credentials_custody"]["metadata_descriptor_only"]
        and tunnel["credential_contents_read"] is False
    )
    adapter_port = services["adapter"]["listeners"]["listener_port"]
    tunnel["adapter_route_matches_listener"] = (
        isinstance(adapter_port, int)
        and tunnel["sensitive_adapter_port"] == adapter_port
    )
    nft = nft_snapshot()
    checkout = reviewed_checkout_blobs()
    generations_stable = True
    for role, service in services.items():
        after = system_generation(SYSTEM_UNITS[role])
        service["generation_after"] = after
        service["generation_stable"] = same_generation(service, after)
        generations_stable = generations_stable and service["generation_stable"]
    result: dict[str, Any] = {
        "marker": MARKER,
        "version": 1,
        "observed_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "read_only": True,
        "filesystem_write": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "nftables_mutation": False,
        "tunnel_mutation": False,
        "dns_mutation": False,
        "network_mutation": False,
        "process_environment_access": False,
        "cloudflared_process_command_line_access": False,
        "node_runtime_command_line_access": True,
        "raw_process_command_line_output": False,
        "tunnel_config_text_output": False,
        "credential_content_access": False,
        "wallet_or_signer_access": False,
        "transaction_construction": False,
        "transaction_signing": False,
        "transaction_broadcast": False,
        "work_credit_write": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
        "host": {
            "hostname_matches_precision": hostname == EXPECTED_HOSTNAME,
            "expected_hostname": EXPECTED_HOSTNAME,
            "complete_privileged_visibility": os.geteuid() == 0,
        },
        "source_checkout_head": checkout_head(),
        "reviewed_checkout_blobs": checkout,
        "historical_user_tunnel": historical,
        "services": services,
        "ss_process_visibility_observed": ss_visible,
        "service_identity_shape_observed": identity_shape,
        "listener_shape_observed": listener_shape,
        "all_service_process_generations_stable": generations_stable,
        "tunnel": tunnel,
        "nftables": nft,
        "cloudflare_worker_route_absence_proven": False,
        "pseudo_ipv4_mode_off_proven": False,
        "nftables_ruleset_live_verified": False,
        "adapter_dispatcher_target_verified": False,
        "cloudflared_uid_isolation_proven": False,
        "dispatcher_exclusive_reachability_proven": False,
        "local_transport_trust_proven": False,
        "runtime_integration": False,
        "external_acceptance": False,
    }
    result["local_metadata_candidate_observed"] = (
        result["host"]["hostname_matches_precision"]
        and historical["retirement_verified"]
        and all(services[name]["active_running"] for name in SYSTEM_UNITS)
        and generations_stable
        and identity_shape
        and checkout["all_match"]
        and services["adapter"]["source"]["matches_reviewed_blob"]
        and services["adapter"]["source"]["retained_descriptor_generation_stable"]
        and services["adapter"]["source"]["root_owned_nonwritable_source"]
        and services["dispatcher"]["source"]["matches_reviewed_blob"]
        and services["dispatcher"]["source"]["retained_descriptor_generation_stable"]
        and services["dispatcher"]["source"]["root_owned_nonwritable_source"]
        and services["cloudflared"]["process"]["comm_is_cloudflared"]
        and services["cloudflared"]["process"]["executable_regular"]
        and services["cloudflared"]["process"]["executable_root_owned"]
        and services["cloudflared"]["process"]["executable_group_world_writable"] is False
        and listener_shape
        and tunnel["private_custody_shape_observed"]
        and tunnel["config_generation_stable"]
        and tunnel["sensitive_route_shape_observed"]
        and tunnel["ordinary_routes_preserved_candidate"]
        and tunnel["adapter_route_matches_listener"]
        and nft["table_present"]
    )
    result["next_action"] = next_action(result)
    return result

def self_test() -> None:
    status = parse_proc_status(
        "Uid:\t1001 1001 1001 1001\n"
        "Gid:\t1002 1002 1002 1002\n"
        "CapInh:\t0000000000000000\n"
        "CapPrm:\t0000000000000000\n"
        "CapEff:\t0000000000000000\n"
        "CapBnd:\t0000000000000000\n"
        "CapAmb:\t0000000000000000\n"
        "NoNewPrivs:\t1\n"
    )
    assert status["all_capability_sets_empty"] is True
    assert status["no_new_privileges"] is True
    assert status["cap_net_admin"] is False
    permitted = parse_proc_status(
        "Uid:\t1001 1001 1001 1001\n"
        "Gid:\t1002 1002 1002 1002\n"
        "CapInh:\t0000000000000000\n"
        "CapPrm:\t0000000000000080\n"
        "CapEff:\t0000000000000000\n"
        "CapBnd:\t0000000000000000\n"
        "CapAmb:\t0000000000000000\n"
        "NoNewPrivs:\t1\n"
    )
    assert permitted["capabilities_permitted_empty"] is False
    config_text = (
        "tunnel: opaque\n"
        "credentials-file: /run/void-cloudflared/private/credentials.json\n"
        "ingress:\n"
        "  - hostname: seed.nullfeed.org\n"
        "    path: ^/__void/agents/paid-work/credential-requests/v1$\n"
        "    service: http://127.0.0.1:4311\n"
        "    originRequest:\n"
        "      httpHostHeader: seed.nullfeed.org\n"
        "      disableChunkedEncoding: true\n"
        "  - hostname: seed.nullfeed.org\n"
        "    path: ^/wc/public-earning-pilot-v1/claim-ticket$\n"
        "    service: http://127.0.0.1:4311\n"
        "    originRequest:\n"
        "      httpHostHeader: seed.nullfeed.org\n"
        "      disableChunkedEncoding: true\n"
        "  - hostname: seed.nullfeed.org\n"
        "    path: ^/wc/public-earning-pilot-v1/submit-result$\n"
        "    service: http://127.0.0.1:4311\n"
        "    originRequest:\n"
        "      httpHostHeader: seed.nullfeed.org\n"
        "      disableChunkedEncoding: true\n"
        "  - hostname: seed.nullfeed.org\n"
        "    service: http://127.0.0.1:8083\n"
        "  - service: http_status:404\n"
    )
    config = parse_tunnel_config(config_text)
    assert config["sensitive_route_shape_observed"] is True
    assert config["sensitive_adapter_port"] == 4311
    assert config["ordinary_routes_preserved_candidate"] is True
    assert config["first_match_order_verified"] is True
    assert config["global_catchall_last"] is True
    assert config["public_hostname_wildcard_shadow_absent"] is True
    assert canonical_sensitive_path(SENSITIVE_PATHS[0]) is None
    assert canonical_sensitive_path("^" + SENSITIVE_PATHS[0] + "$") == SENSITIVE_PATHS[0]

    ordinary_rule = (
        "  - hostname: seed.nullfeed.org\n"
        "    service: http://127.0.0.1:8083\n"
    )
    shadowed_text = config_text.replace(ordinary_rule, "", 1).replace(
        "ingress:\n",
        "ingress:\n" + ordinary_rule,
        1,
    )
    shadowed = parse_tunnel_config(shadowed_text)
    assert shadowed["sensitive_route_shape_observed"] is False
    assert shadowed["first_match_order_verified"] is False

    wildcard_shadow = parse_tunnel_config(
        config_text.replace(
            "ingress:\n",
            "ingress:\n"
            '  - hostname: "*.nullfeed.org"\n'
            "    service: http://127.0.0.1:8084\n",
            1,
        )
    )
    assert wildcard_shadow["sensitive_route_shape_observed"] is False
    assert wildcard_shadow["public_hostname_wildcard_shadow_absent"] is False

    missing_catchall = parse_tunnel_config(
        config_text.replace("  - service: http_status:404\n", "", 1)
    )
    assert missing_catchall["sensitive_route_shape_observed"] is False
    assert missing_catchall["global_catchall_last"] is False
    rows = parse_ss(
        'LISTEN 0 511 127.0.0.1:4311 0.0.0.0:* users:(("node",pid=123,fd=20))\n'
    )
    listener = listener_set(rows, 123)
    assert listener["exclusive_process_owner"] is True
    assert listener["additional_process_owner_observed"] is False
    assert listener["exact_single_ipv4_loopback_listener"] is True
    assert listener["listener_port"] == 4311
    shared_rows = parse_ss(
        'LISTEN 0 511 127.0.0.1:4311 0.0.0.0:* users:(("node",pid=123,fd=20),("other",pid=124,fd=21))\n'
    )
    shared_listener = listener_set(shared_rows, 123)
    assert shared_listener["exclusive_process_owner"] is False
    assert shared_listener["additional_process_owner_observed"] is True
    assert shared_listener["exact_single_ipv4_loopback_listener"] is False
    assert shared_listener["listener_port"] is None
    print(f"{MARKER}_SELF_TEST_GREEN")
    print("all_five_capability_sets_checked=true")
    print("permitted_capability_negative_proven=true")
    print("sensitive_route_parser_exact=true")
    print("sensitive_path_regex_anchor_required=true")
    print("shared_listener_process_rejected=true")
    print("cloudflare_first_match_order_verified=true")
    print("cloudflare_global_catchall_required=true")
    print("cloudflare_wildcard_shadow_rejected=true")
    print("credential_contents_read=false")
    print("process_environment_access=false")
    print("live_acceptance_claimed=false")

def plan() -> None:
    print(MARKER)
    for key, value in (
        ("mode", "--plan"),
        ("read_only", "true"),
        ("root_read_visibility_required", "true"),
        ("precision_hostname_required", "true"),
        ("historical_zoso_user_tunnel_query", "read_only"),
        ("process_environment_access", "false"),
        ("cloudflared_process_command_line_access", "false"),
        ("node_runtime_command_line_access", "true"),
        ("raw_process_command_line_output", "false"),
        ("tunnel_config_path", "operator_reviewed_absolute_path_required"),
        ("tunnel_config_text_output", "false"),
        ("credential_content_access", "false"),
        ("filesystem_write", "false"),
        ("service_mutation", "false"),
        ("systemd_mutation", "false"),
        ("nftables_mutation", "false"),
        ("tunnel_mutation", "false"),
        ("dns_mutation", "false"),
        ("network_mutation", "false"),
        ("payment_acceptance", "false"),
        ("public_presale_activation", "false"),
        ("funds_movement", "false"),
        ("cloudflare_control_plane_evidence", "separate_required"),
        ("nftables_exact_rule_verification", "separate_required"),
        ("adapter_dispatcher_target_verification", "separate_required"),
        ("live_acceptance_claimed", "false"),
    ):
        print(f"{key}={value}")
    print("next_action=RUN_READ_ONLY_DESIGNATED_HOST_CENSUS")

def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--plan", action="store_true")
    group.add_argument("--run", action="store_true")
    parser.add_argument("--tunnel-config")
    args = parser.parse_args()
    if args.tunnel_config is not None and not args.run:
        raise CensusError("tunnel_config_argument_run_only")
    if args.self_test:
        self_test()
        return 0
    if args.plan:
        plan()
        return 0
    result = collect(operator_tunnel_config_path(args.tunnel_config))
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CensusError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("live_acceptance_claimed=false")
        raise SystemExit(2)
