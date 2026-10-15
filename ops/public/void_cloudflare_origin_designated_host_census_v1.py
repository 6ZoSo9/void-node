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
    info = path.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_size < 0 or info.st_size > maximum:
        raise CensusError(f"bounded_read_metadata_invalid:{path.name}")
    data = path.read_bytes()
    if len(data) != info.st_size or len(data) > maximum:
        raise CensusError(f"bounded_read_size_invalid:{path.name}")
    return data

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
        data = read_bounded(resolved, MAX_SOURCE_BYTES)
    except (OSError, CensusError):
        return result
    result["entry_present"] = True
    result["running_git_blob_sha1"] = git_blob_sha1(data)
    result["running_sha256"] = sha256_bytes(data)
    result["matches_reviewed_blob"] = result["running_git_blob_sha1"] == expected_blob
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

def historical_user_tunnel_snapshot() -> dict[str, Any]:
    result = {
        "query_observed": False,
        "loaded": None,
        "active_running": None,
        "retired_candidate_observed": False,
    }
    try:
        user = pwd.getpwnam(EXPECTED_USER)
    except KeyError:
        return result
    runuser = next((p for p in RUNUSER_CANDIDATES if p.exists()), None)
    if runuser is None or not ENV.exists():
        return result
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
    ]
    try:
        code, stdout, _ = run_read_only(runuser, args, allow_failure=True)
        values = parse_key_values(stdout.decode("utf-8", "strict")) if stdout else {}
    except (CensusError, UnicodeDecodeError):
        return result
    result["query_observed"] = True
    result["loaded"] = code == 0 and values.get("LoadState") == "loaded"
    pid_text = values.get("MainPID", "")
    pid = int(pid_text) if pid_text.isdigit() else 0
    active = (
        code == 0
        and values.get("LoadState") == "loaded"
        and values.get("ActiveState") == "active"
        and values.get("SubState") == "running"
        and pid > 0
    )
    result["active_running"] = active
    result["retired_candidate_observed"] = not active
    return result

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

def listener_set(rows: list[dict[str, Any]], pid: int) -> dict[str, Any]:
    pattern = re.compile(rf"(^|[^0-9])pid={pid}([^0-9]|$)")
    owned = [row for row in rows if pid > 0 and pattern.search(str(row["process"]))]
    locals_ = [str(row["local"]) for row in owned]
    ipv4 = []
    for local in locals_:
        match = re.fullmatch(r"127\.0\.0\.1:([1-9][0-9]*)", local)
        if match:
            ipv4.append(int(match.group(1)))
    exact = len(owned) == 1 and len(ipv4) == 1
    return {
        "owned_tcp_listener_count": len(owned),
        "observed_ipv4_loopback_ports": sorted(ipv4),
        "exact_single_ipv4_loopback_listener": exact,
        "listener_port": ipv4[0] if exact else None,
        "additional_or_ipv6_listener_observed": len(owned) != len(ipv4),
    }

def cloudflared_config_path(pid: int) -> pathlib.Path | None:
    argv = read_proc_cmdline(pid)
    if not argv:
        return None
    values: list[str] = []
    for index, arg in enumerate(argv):
        if arg == "--config" and index + 1 < len(argv):
            values.append(argv[index + 1])
        elif arg.startswith("--config="):
            values.append(arg.split("=", 1)[1])
    if len(values) != 1:
        return None
    candidate = pathlib.Path(values[0])
    if not candidate.is_absolute() or "\x00" in values[0]:
        return None
    try:
        resolved = candidate.resolve(strict=True)
    except OSError:
        return None
    return resolved if resolved == candidate else None

def file_custody(path_value: pathlib.Path | None, owner_uid: int | None) -> dict[str, Any]:
    result = {
        "path_observed": path_value is not None,
        "path_sha256": sha256_bytes(str(path_value).encode("utf-8")) if path_value else None,
        "regular_nonsymlink": False,
        "owner_uid_matches": False,
        "group_other_bits_zero": False,
        "nlink_one": False,
        "parent_real_directory": False,
        "parent_owner_uid_matches": False,
        "parent_group_other_bits_zero": False,
        "custody_shape_observed": False,
    }
    if path_value is None or not isinstance(owner_uid, int) or owner_uid < 1:
        return result
    try:
        info = path_value.lstat()
        parent = path_value.parent
        parent_info = parent.lstat()
    except OSError:
        return result
    result["regular_nonsymlink"] = stat.S_ISREG(info.st_mode) and not stat.S_ISLNK(info.st_mode)
    result["owner_uid_matches"] = info.st_uid == owner_uid
    result["group_other_bits_zero"] = stat.S_IMODE(info.st_mode) & 0o077 == 0
    result["nlink_one"] = info.st_nlink == 1
    try:
        result["parent_real_directory"] = (
            stat.S_ISDIR(parent_info.st_mode)
            and not stat.S_ISLNK(parent_info.st_mode)
            and parent.resolve(strict=True) == parent
        )
    except OSError:
        result["parent_real_directory"] = False
    result["parent_owner_uid_matches"] = parent_info.st_uid == owner_uid
    result["parent_group_other_bits_zero"] = stat.S_IMODE(parent_info.st_mode) & 0o077 == 0
    result["custody_shape_observed"] = all([
        result["regular_nonsymlink"],
        result["owner_uid_matches"],
        result["group_other_bits_zero"],
        result["nlink_one"],
        result["parent_real_directory"],
        result["parent_owner_uid_matches"],
        result["parent_group_other_bits_zero"],
    ])
    return result

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
    if value in SENSITIVE_PATHS:
        return value
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
    for raw_line in raw.splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue
        indent = len(raw_line) - len(raw_line.lstrip(" "))
        line = raw_line.strip()
        if line.startswith("credentials-file:"):
            scalar = yaml_scalar(line.split(":", 1)[1])
            if scalar is None:
                raise CensusError("tunnel_credentials_path_invalid")
            credentials.append(scalar)
            continue
        if line.startswith("- hostname:"):
            if current is not None:
                rules.append(current)
            scalar = yaml_scalar(line.split(":", 1)[1])
            if scalar is None:
                raise CensusError("tunnel_hostname_invalid")
            current = {
                "hostname": scalar,
                "path": None,
                "service": None,
                "http_host_header": None,
                "disable_chunked_encoding": None,
            }
            in_origin = False
            continue
        if current is None:
            continue
        if indent == 4 and line.startswith("path:"):
            current["path"] = yaml_scalar(line.split(":", 1)[1])
            in_origin = False
        elif indent == 4 and line.startswith("service:"):
            current["service"] = yaml_scalar(line.split(":", 1)[1])
            in_origin = False
        elif indent == 4 and line == "originRequest:":
            in_origin = True
        elif in_origin and indent == 6 and line.startswith("httpHostHeader:"):
            current["http_host_header"] = yaml_scalar(line.split(":", 1)[1])
        elif in_origin and indent == 6 and line.startswith("disableChunkedEncoding:"):
            scalar = yaml_scalar(line.split(":", 1)[1])
            current["disable_chunked_encoding"] = scalar == "true"
    if current is not None:
        rules.append(current)
    if len(credentials) != 1:
        raise CensusError("tunnel_credentials_path_ambiguous")
    credential_path = pathlib.Path(credentials[0])
    if not credential_path.is_absolute() or "\x00" in credentials[0]:
        raise CensusError("tunnel_credentials_path_invalid")
    try:
        credential_resolved = credential_path.resolve(strict=True)
    except OSError:
        credential_resolved = credential_path
    sensitive: list[dict[str, Any]] = []
    ordinary_seed_rules = 0
    for rule in rules:
        if rule["hostname"] != PUBLIC_HOSTNAME:
            continue
        canonical_path = canonical_sensitive_path(rule["path"])
        if canonical_path is None:
            ordinary_seed_rules += 1
            continue
        service = rule["service"]
        match = re.fullmatch(r"http://127\.0\.0\.1:([1-9][0-9]*)", service or "")
        sensitive.append({
            "path": canonical_path,
            "adapter_port": int(match.group(1)) if match else None,
            "http_host_header_bound": rule["http_host_header"] == PUBLIC_HOSTNAME,
            "disable_chunked_encoding": rule["disable_chunked_encoding"] is True,
        })
    unique_paths = [row["path"] for row in sensitive]
    ports = [row["adapter_port"] for row in sensitive]
    shape = (
        len(sensitive) == len(SENSITIVE_PATHS)
        and sorted(unique_paths) == sorted(SENSITIVE_PATHS)
        and len(set(unique_paths)) == len(unique_paths)
        and all(isinstance(port, int) for port in ports)
        and len(set(ports)) == 1
        and all(row["http_host_header_bound"] for row in sensitive)
        and all(row["disable_chunked_encoding"] for row in sensitive)
    )
    return {
        "credential_path": credential_resolved,
        "sensitive_route_shape_observed": shape,
        "sensitive_adapter_port": ports[0] if shape else None,
        "ordinary_seed_route_count": ordinary_seed_rules,
        "ordinary_routes_preserved_candidate": ordinary_seed_rules > 0,
    }

def tunnel_config_snapshot(pid: int, cloudflared_uid: int | None) -> dict[str, Any]:
    result = {
        "config_path_observed": False,
        "config_sha256": None,
        "config_custody": file_custody(None, cloudflared_uid),
        "credentials_custody": file_custody(None, cloudflared_uid),
        "sensitive_route_shape_observed": False,
        "sensitive_adapter_port": None,
        "ordinary_routes_preserved_candidate": False,
        "config_text_read": False,
        "credential_contents_read": False,
    }
    config = cloudflared_config_path(pid)
    result["config_path_observed"] = config is not None
    result["config_custody"] = file_custody(config, cloudflared_uid)
    if config is None:
        return result
    try:
        data = read_bounded(config, MAX_CONFIG_BYTES)
        parsed = parse_tunnel_config(data.decode("utf-8", "strict"))
    except (OSError, CensusError, UnicodeDecodeError):
        return result
    result["config_text_read"] = True
    result["config_sha256"] = sha256_bytes(data)
    result["sensitive_route_shape_observed"] = parsed["sensitive_route_shape_observed"]
    result["sensitive_adapter_port"] = parsed["sensitive_adapter_port"]
    result["ordinary_routes_preserved_candidate"] = parsed["ordinary_routes_preserved_candidate"]
    result["credentials_custody"] = file_custody(
        parsed["credential_path"], cloudflared_uid
    )
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
    if not result["historical_user_tunnel"]["query_observed"]:
        return "HISTORICAL_USER_TUNNEL_QUERY_HOLD"
    if result["historical_user_tunnel"]["active_running"] is True:
        return "HISTORICAL_USER_TUNNEL_RETIREMENT_PLAN_REQUIRED"
    if not all(result["services"][name]["active_running"] for name in SYSTEM_UNITS):
        return "PROTECTED_SYSTEM_SERVICES_NOT_ACTIVE"
    if not result["service_identity_shape_observed"]:
        return "SERVICE_IDENTITY_OR_CAPABILITY_HOLD"
    if not result["listener_shape_observed"]:
        return "LISTENER_OWNERSHIP_HOLD"
    if not result["tunnel"]["private_custody_shape_observed"]:
        return "TUNNEL_PRIVATE_CUSTODY_HOLD"
    if not result["tunnel"]["sensitive_route_shape_observed"]:
        return "TUNNEL_SENSITIVE_ROUTE_HOLD"
    if not result["tunnel"]["adapter_route_matches_listener"]:
        return "TUNNEL_ADAPTER_PORT_BINDING_HOLD"
    if not result["nftables"]["table_present"]:
        return "NFTABLES_INSTALL_PLAN_REQUIRED"
    return "EXACT_NFT_AND_CLOUDFLARE_CONTROL_PLANE_EVIDENCE_REQUIRED"

def collect() -> dict[str, Any]:
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
        and all(services[name].get("all_capability_sets_empty") is True for name in SYSTEM_UNITS)
        and all(services[name].get("cap_net_admin") is False for name in SYSTEM_UNITS)
    )
    listener_shape = (
        ss_visible
        and services["adapter"]["listeners"]["exact_single_ipv4_loopback_listener"]
        and services["dispatcher"]["listeners"]["exact_single_ipv4_loopback_listener"]
    )
    tunnel = tunnel_config_snapshot(
        int(services["cloudflared"].get("main_pid") or 0),
        services["cloudflared"].get("effective_uid"),
    )
    tunnel["private_custody_shape_observed"] = (
        tunnel["config_custody"]["custody_shape_observed"]
        and tunnel["credentials_custody"]["custody_shape_observed"]
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
        "process_command_line_access": True,
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
        and historical["retired_candidate_observed"]
        and all(services[name]["active_running"] for name in SYSTEM_UNITS)
        and generations_stable
        and identity_shape
        and checkout["all_match"]
        and services["adapter"]["source"]["matches_reviewed_blob"]
        and services["dispatcher"]["source"]["matches_reviewed_blob"]
        and services["cloudflared"]["process"]["comm_is_cloudflared"]
        and services["cloudflared"]["process"]["executable_regular"]
        and services["cloudflared"]["process"]["executable_root_owned"]
        and services["cloudflared"]["process"]["executable_group_world_writable"] is False
        and listener_shape
        and tunnel["private_custody_shape_observed"]
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
    config = parse_tunnel_config(
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
    )
    assert config["sensitive_route_shape_observed"] is True
    assert config["sensitive_adapter_port"] == 4311
    assert config["ordinary_routes_preserved_candidate"] is True
    rows = parse_ss(
        'LISTEN 0 511 127.0.0.1:4311 0.0.0.0:* users:(("node",pid=123,fd=20))\n'
    )
    listener = listener_set(rows, 123)
    assert listener["exact_single_ipv4_loopback_listener"] is True
    assert listener["listener_port"] == 4311
    print(f"{MARKER}_SELF_TEST_GREEN")
    print("all_five_capability_sets_checked=true")
    print("permitted_capability_negative_proven=true")
    print("sensitive_route_parser_exact=true")
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
        ("process_command_line_access", "true"),
        ("raw_process_command_line_output", "false"),
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
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.plan:
        plan()
        return 0
    result = collect()
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
