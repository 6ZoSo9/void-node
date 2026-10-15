#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import socket
import stat
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit

MARKER = "VOID_PUBLIC_EARN_DESIGNATED_HOST_CENSUS_V1"
EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
TABLE_FAMILY = "inet"
TABLE_NAME = "void_public_earn_edge_v1"
ROOT = pathlib.Path(__file__).resolve().parents[2]

UNITS = {
    "dispatcher": "void-public-443-proxy-v2-dispatch-v1.service",
    "earn_edge": "void-public-earn-proxy-v2-edge-v1.service",
    "gateway": "void-public-earn-gateway-v1.service",
}

SOURCE_BLOBS = {
    "dispatcher": {
        "path": "ops/public/void-public-443-proxy-v2-dispatcher-v1.mjs",
        "git_blob_sha1": "bc39f84d3a2d70d26b54b9280ba5f0e23d7c7824",
    },
    "earn_edge": {
        "path": "ops/public/void-public-earn-proxy-v2-edge-v1.mjs",
        "git_blob_sha1": "38da7cb2da07fb172c67080d4eebbfbb39d26d08",
    },
    "gateway": {
        "path": "ops/public/public-seed-adapter-v1.mjs",
        "git_blob_sha1": "140796d809a13171f0186a226bade1b4d82f406d",
    },
    "policy": {
        "path": "tools/void-public-earn-loopback-isolation-policy-v1.mjs",
        "git_blob_sha1": "a87ecb2a8bd053aba3c6753f0677e2c524e7e24f",
    },
}

SYSTEMCTL = pathlib.Path("/usr/bin/systemctl")
SS = pathlib.Path("/usr/bin/ss")
GIT = pathlib.Path("/usr/bin/git")
NFT_CANDIDATES = (
    pathlib.Path("/usr/sbin/nft"),
    pathlib.Path("/usr/bin/nft"),
)
MAX_COMMAND_BYTES = 2 * 1024 * 1024
MAX_PROC_BYTES = 1024 * 1024
MAX_NFT_BYTES = 2 * 1024 * 1024
CAP_NET_ADMIN_BIT = 12


class CensusError(RuntimeError):
    pass


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha1(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("utf-8")
    return hashlib.sha1(header + data).hexdigest()


def safe_env(uid: int | None = None) -> dict[str, str]:
    env = {
        "PATH": "/usr/sbin:/usr/bin:/sbin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "SYSTEMD_PAGER": "cat",
        "SYSTEMD_COLORS": "0",
        "PAGER": "cat",
        "NO_COLOR": "1",
    }
    if uid is not None and uid >= 0:
        env["XDG_RUNTIME_DIR"] = f"/run/user/{uid}"
        env["DBUS_SESSION_BUS_ADDRESS"] = f"unix:path=/run/user/{uid}/bus"
    return env


def command_identity(path: pathlib.Path) -> dict[str, Any]:
    try:
        resolved = path.resolve(strict=True)
        info = resolved.stat()
    except OSError as exc:
        raise CensusError(f"command_unavailable:{path}") from exc
    if not stat.S_ISREG(info.st_mode) or not (info.st_mode & 0o111):
        raise CensusError(f"command_not_executable:{path}")
    return {
        "path": str(resolved),
        "dev": info.st_dev,
        "ino": info.st_ino,
        "size": info.st_size,
        "mtime_ns": info.st_mtime_ns,
    }


def run_read_only(
    executable: pathlib.Path,
    args: list[str],
    *,
    allow_failure: bool = False,
    timeout: int = 10,
) -> tuple[int, bytes, bytes]:
    before = command_identity(executable)
    result = subprocess.run(
        [before["path"], *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=safe_env(),
        timeout=timeout,
        check=False,
    )
    if len(result.stdout) > MAX_COMMAND_BYTES or len(result.stderr) > MAX_COMMAND_BYTES:
        raise CensusError("command_output_too_large")
    after = command_identity(executable)
    if before != after:
        raise CensusError(f"command_changed_during_read:{executable}")
    if result.returncode != 0 and not allow_failure:
        raise CensusError(f"command_failed:{executable.name}")
    return result.returncode, result.stdout, result.stderr


def parse_key_value_lines(raw: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in raw.splitlines():
        if not line:
            continue
        if "=" not in line:
            raise CensusError("key_value_row_malformed")
        key, value = line.split("=", 1)
        if not key or key in values:
            raise CensusError("key_value_row_duplicate_or_empty")
        values[key] = value
    return values


def parse_proc_status(raw: str) -> dict[str, Any]:
    values: dict[str, str] = {}
    for line in raw.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        values[key] = value.strip()
    uid_values = values.get("Uid", "").split()
    gid_values = values.get("Gid", "").split()
    if len(uid_values) != 4 or len(gid_values) != 4:
        raise CensusError("proc_status_identity_missing")
    if not all(part.isdigit() for part in [*uid_values, *gid_values]):
        raise CensusError("proc_status_identity_invalid")
    cap_eff = values.get("CapEff", "")
    if not re.fullmatch(r"[0-9a-fA-F]+", cap_eff):
        raise CensusError("proc_status_cap_eff_invalid")
    no_new_privs = values.get("NoNewPrivs")
    if no_new_privs not in {"0", "1"}:
        raise CensusError("proc_status_no_new_privs_invalid")
    effective_uid = int(uid_values[1])
    effective_gid = int(gid_values[1])
    caps = int(cap_eff, 16)
    return {
        "effective_uid": effective_uid,
        "effective_gid": effective_gid,
        "no_new_privileges": no_new_privs == "1",
        "cap_net_admin": bool(caps & (1 << CAP_NET_ADMIN_BIT)),
    }


def parse_proc_start_ticks(raw: bytes | str) -> int:
    text = raw.decode("utf-8", "strict") if isinstance(raw, bytes) else raw
    closing = text.rfind(")")
    if closing < 2 or closing + 2 >= len(text):
        raise CensusError("proc_stat_malformed")
    tail = text[closing + 2 :].split()
    # After the command field, tail[0] is field 3 (state); starttime is field 22.
    if len(tail) < 20 or not re.fullmatch(r"[1-9][0-9]*", tail[19]):
        raise CensusError("proc_stat_start_ticks_invalid")
    ticks = int(tail[19])
    if ticks < 1:
        raise CensusError("proc_stat_start_ticks_invalid")
    return ticks


def read_proc_start_ticks(pid: int) -> int:
    if not isinstance(pid, int) or pid < 1:
        raise CensusError("proc_stat_pid_invalid")
    try:
        raw = read_bounded(pathlib.Path(f"/proc/{pid}/stat"), 64 * 1024)
    except OSError as exc:
        raise CensusError(f"proc_stat_unavailable:{pid}") from exc
    return parse_proc_start_ticks(raw)


def same_process_generation(
    expected_pid: int,
    expected_start_ticks: int | None,
    observed: dict[str, Any],
) -> bool:
    return (
        expected_pid > 0
        and isinstance(expected_start_ticks, int)
        and expected_start_ticks > 0
        and observed.get("active_running") is True
        and observed.get("main_pid") == expected_pid
        and observed.get("start_ticks") == expected_start_ticks
    )



def parse_port(value: str | None) -> int | None:
    if value is None or not re.fullmatch(r"[1-9][0-9]*", value):
        return None
    port = int(value)
    return port if 1024 <= port <= 65535 else None


def loopback_url_port(value: str | None) -> int | None:
    if not value:
        return None
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    if (
        parsed.scheme != "http"
        or parsed.hostname != "127.0.0.1"
        or not parsed.port
        or parsed.username
        or parsed.password
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
    ):
        return None
    return parsed.port if 1024 <= parsed.port <= 65535 else None


def parse_ss_listeners(raw: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for raw_line in raw.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 5 or parts[0] != "LISTEN":
            raise CensusError("ss_listener_row_malformed")
        process_text = " ".join(parts[5:]) if len(parts) > 5 else ""
        rows.append(
            {
                "local": parts[3],
                "peer": parts[4],
                "process": process_text,
            }
        )
    return rows


def listener_binding(rows: list[dict[str, Any]], port: int | None, pid: int) -> dict[str, Any]:
    if port is None or pid < 1:
        return {
            "expected_port": port,
            "candidate_count": 0,
            "exact_ipv4_loopback_owned": False,
        }
    suffix = f":{port}"
    candidates = [row for row in rows if str(row.get("local", "")).endswith(suffix)]
    pid_pattern = re.compile(rf"(^|[^0-9])pid={pid}([^0-9]|$)")
    exact = [
        row for row in candidates
        if row.get("local") == f"127.0.0.1:{port}"
        and pid_pattern.search(str(row.get("process", "")))
    ]
    return {
        "expected_port": port,
        "candidate_count": len(candidates),
        "exact_ipv4_loopback_owned": len(candidates) == 1 and len(exact) == 1,
    }


def owned_ipv4_loopback_ports(rows: list[dict[str, Any]], pid: int) -> list[int]:
    if pid < 1:
        return []
    pid_pattern = re.compile(rf"(^|[^0-9])pid={pid}([^0-9]|$)")
    ports: set[int] = set()
    for row in rows:
        local = str(row.get("local", ""))
        match = re.fullmatch(r"127\.0\.0\.1:([1-9][0-9]*)", local)
        if not match or not pid_pattern.search(str(row.get("process", ""))):
            continue
        port = int(match.group(1))
        if 1024 <= port <= 65535:
            ports.add(port)
    return sorted(ports)


def read_bounded(path: pathlib.Path, maximum: int = MAX_PROC_BYTES) -> bytes:
    data = path.read_bytes()
    if len(data) > maximum:
        raise CensusError(f"file_too_large:{path.name}")
    return data


def process_source(pid: int, expected_blob: str) -> dict[str, Any]:
    del expected_blob
    try:
        exe = pathlib.Path(os.path.realpath(f"/proc/{pid}/exe"))
    except OSError:
        return {
            "node_executable": False,
            "entry_present": False,
            "git_blob_sha1": None,
            "sha256": None,
            "matches_reviewed_blob": False,
            "running_entry_source_binding_observed": False,
        }
    node_executable = exe.name in {"node", "nodejs"}
    return {
        "node_executable": node_executable,
        "entry_present": False,
        "git_blob_sha1": None,
        "sha256": None,
        "matches_reviewed_blob": False,
        "running_entry_source_binding_observed": False,
    }


def service_generation_snapshot(unit: str) -> dict[str, Any]:
    code, stdout, _stderr = run_read_only(
        SYSTEMCTL,
        [
            "show",
            unit,
            "--no-pager",
            "--property=LoadState",
            "--property=ActiveState",
            "--property=SubState",
            "--property=MainPID",
        ],
        allow_failure=True,
    )
    values = parse_key_value_lines(stdout.decode("utf-8", "strict")) if stdout else {}
    pid_text = values.get("MainPID", "")
    pid = int(pid_text) if pid_text.isdigit() else 0
    active_running = (
        code == 0
        and values.get("LoadState") == "loaded"
        and values.get("ActiveState") == "active"
        and values.get("SubState") == "running"
        and pid > 0
    )
    try:
        start_ticks = read_proc_start_ticks(pid) if active_running else None
    except CensusError:
        start_ticks = None
    return {
        "active_running": active_running,
        "main_pid": pid,
        "start_ticks": start_ticks,
    }


def service_snapshot(role: str) -> dict[str, Any]:
    unit = UNITS[role]
    props = [
        "LoadState",
        "ActiveState",
        "SubState",
        "MainPID",
        "NoNewPrivileges",
        "CapabilityBoundingSet",
    ]
    code, stdout, _stderr = run_read_only(
        SYSTEMCTL,
        ["show", unit, "--no-pager", *[f"--property={p}" for p in props]],
        allow_failure=True,
    )
    values = parse_key_value_lines(stdout.decode("utf-8", "strict")) if stdout else {}
    loaded = code == 0 and values.get("LoadState") == "loaded"
    pid_text = values.get("MainPID", "")
    pid = int(pid_text) if pid_text.isdigit() else 0
    snapshot: dict[str, Any] = {
        "unit": unit,
        "loaded": loaded,
        "active_running": loaded
        and values.get("ActiveState") == "active"
        and values.get("SubState") == "running"
        and pid > 0,
        "main_pid": pid,
        "process_start_ticks": None,
        "systemd_no_new_privileges": values.get("NoNewPrivileges") == "yes",
    }
    if not snapshot["active_running"]:
        snapshot.update(
            {
                "effective_uid": None,
                "effective_gid": None,
                "no_new_privileges": False,
                "cap_net_admin": None,
                "source": {
                    "node_executable": False,
                    "entry_present": False,
                    "git_blob_sha1": None,
                    "sha256": None,
                    "matches_reviewed_blob": False,
                    "running_entry_source_binding_observed": False,
                },
            }
        )
        return snapshot
    try:
        start_ticks = read_proc_start_ticks(pid)
        status = parse_proc_status(
            read_bounded(pathlib.Path(f"/proc/{pid}/status")).decode("utf-8", "strict")
        )
    except (OSError, UnicodeDecodeError, CensusError):
        start_ticks = None
        status = {
            "effective_uid": None,
            "effective_gid": None,
            "no_new_privileges": False,
            "cap_net_admin": None,
        }
    snapshot["process_start_ticks"] = start_ticks
    snapshot.update(status)
    snapshot["source"] = process_source(pid, SOURCE_BLOBS[role]["git_blob_sha1"])
    return snapshot


def state_metadata(path_value: str | None, edge_uid: int | None) -> dict[str, Any]:
    if not path_value or not os.path.isabs(path_value) or "\x00" in path_value:
        return {
            "configured": False,
            "path_sha256": None,
            "parent": None,
            "file": None,
            "custody_shape_observed": False,
        }
    path_obj = pathlib.Path(path_value)
    result: dict[str, Any] = {
        "configured": True,
        "path_sha256": sha256_bytes(path_value.encode("utf-8")),
        "parent": None,
        "file": None,
        "custody_shape_observed": False,
    }
    try:
        parent = path_obj.parent.lstat()
        file_stat = path_obj.lstat()
    except OSError:
        return result
    parent_meta = {
        "is_directory": stat.S_ISDIR(parent.st_mode),
        "is_symlink": stat.S_ISLNK(parent.st_mode),
        "uid": parent.st_uid,
        "gid": parent.st_gid,
        "mode_octal": oct(stat.S_IMODE(parent.st_mode)),
        "group_other_bits_zero": (stat.S_IMODE(parent.st_mode) & 0o077) == 0,
    }
    file_meta = {
        "is_regular": stat.S_ISREG(file_stat.st_mode),
        "is_symlink": stat.S_ISLNK(file_stat.st_mode),
        "nlink": file_stat.st_nlink,
        "uid": file_stat.st_uid,
        "gid": file_stat.st_gid,
        "mode_octal": oct(stat.S_IMODE(file_stat.st_mode)),
        "group_other_bits_zero": (stat.S_IMODE(file_stat.st_mode) & 0o077) == 0,
    }
    result["parent"] = parent_meta
    result["file"] = file_meta
    result["custody_shape_observed"] = (
        edge_uid is not None
        and parent_meta["is_directory"]
        and not parent_meta["is_symlink"]
        and parent_meta["uid"] == edge_uid
        and parent_meta["group_other_bits_zero"]
        and file_meta["is_regular"]
        and not file_meta["is_symlink"]
        and file_meta["nlink"] == 1
        and file_meta["uid"] == edge_uid
        and file_meta["group_other_bits_zero"]
    )
    return result


def nft_snapshot() -> dict[str, Any]:
    executable = next((path for path in NFT_CANDIDATES if path.exists()), None)
    if executable is None:
        return {
            "command_present": False,
            "table_present": False,
            "json_sha256": None,
            "json_bytes": 0,
            "nftables_ruleset_live_verified": False,
        }
    code, stdout, _stderr = run_read_only(
        executable,
        ["-j", "list", "table", TABLE_FAMILY, TABLE_NAME],
        allow_failure=True,
    )
    if code != 0 or not stdout or len(stdout) > MAX_NFT_BYTES:
        return {
            "command_present": True,
            "table_present": False,
            "json_sha256": None,
            "json_bytes": 0,
            "nftables_ruleset_live_verified": False,
        }
    try:
        parsed = json.loads(stdout)
        if not isinstance(parsed, dict) or not isinstance(parsed.get("nftables"), list):
            raise ValueError("shape")
    except (json.JSONDecodeError, ValueError):
        return {
            "command_present": True,
            "table_present": False,
            "json_sha256": None,
            "json_bytes": 0,
            "nftables_ruleset_live_verified": False,
        }
    return {
        "command_present": True,
        "table_present": True,
        "json_sha256": sha256_bytes(stdout),
        "json_bytes": len(stdout),
        "nftables_ruleset_live_verified": False,
    }


def reviewed_checkout_blobs() -> dict[str, Any]:
    rows: dict[str, Any] = {}
    all_match = True
    for role, evidence in SOURCE_BLOBS.items():
        target = ROOT / evidence["path"]
        try:
            data = read_bounded(target, 4 * 1024 * 1024)
            blob = git_blob_sha1(data)
            match = blob == evidence["git_blob_sha1"]
        except (OSError, CensusError):
            blob = None
            match = False
        rows[role] = {
            "path": evidence["path"],
            "expected_git_blob_sha1": evidence["git_blob_sha1"],
            "observed_git_blob_sha1": blob,
            "matches_reviewed_blob": match,
        }
        all_match = all_match and match
    return {"all_match": all_match, "files": rows}


def checkout_head() -> str | None:
    try:
        code, stdout, _stderr = run_read_only(
            GIT,
            ["-C", str(ROOT), "rev-parse", "HEAD"],
            allow_failure=True,
        )
    except CensusError:
        return None
    value = stdout.decode("ascii", "strict").strip() if code == 0 else ""
    return value if re.fullmatch(r"[0-9a-f]{40}", value) else None


def derive_topology(services: dict[str, dict[str, Any]]) -> dict[str, Any]:
    uids = [
        services[name].get("effective_uid")
        for name in ("dispatcher", "earn_edge", "gateway")
    ]
    uids_valid = all(isinstance(uid, int) and uid > 0 for uid in uids)
    return {
        "topology_configuration_observed": False,
        "non_secret_topology_evidence_required": True,
        "dispatcher_listen_port": None,
        "dispatcher_earn_edge_target_port": None,
        "earn_edge_listen_port": None,
        "earn_edge_gateway_target_port": None,
        "shared_gateway_port": None,
        "dedicated_gateway_port": None,
        "dispatcher_target_matches_edge_listener": False,
        "edge_target_matches_dedicated_gateway": False,
        "service_uids_pairwise_distinct": uids_valid and len(set(uids)) == 3,
        "all_service_uids_nonroot": uids_valid,
        "all_no_new_privileges": all(
            services[name].get("no_new_privileges") is True
            for name in ("dispatcher", "earn_edge", "gateway")
        ),
        "all_cap_net_admin_absent": all(
            services[name].get("cap_net_admin") is False
            for name in ("dispatcher", "earn_edge", "gateway")
        ),
        "all_reviewed_source_blobs_match": False,
        "running_entry_source_binding_observed": False,
    }


def collect() -> dict[str, Any]:
    hostname = socket.gethostname()
    services = {role: service_snapshot(role) for role in UNITS}
    try:
        _code, ss_out, _ss_err = run_read_only(SS, ["-H", "-ltnp"], allow_failure=False)
        listeners = parse_ss_listeners(ss_out.decode("utf-8", "strict"))
        ss_visible = True
    except (CensusError, UnicodeDecodeError):
        listeners = []
        ss_visible = False

    for role, service in services.items():
        service["observed_ipv4_loopback_ports"] = owned_ipv4_loopback_ports(
            listeners,
            int(service.get("main_pid") or 0),
        )

    topology = derive_topology(services)
    for role, port_key in (
        ("dispatcher", "dispatcher_listen_port"),
        ("earn_edge", "earn_edge_listen_port"),
        ("gateway", "shared_gateway_port"),
    ):
        services[role]["listener"] = listener_binding(
            listeners,
            topology[port_key],
            int(services[role].get("main_pid") or 0),
        )
    services["gateway"]["dedicated_listener"] = listener_binding(
        listeners,
        topology["dedicated_gateway_port"],
        int(services["gateway"].get("main_pid") or 0),
    )

    state = state_metadata(
        None,
        services["earn_edge"].get("effective_uid"),
    )
    nft = nft_snapshot()
    checkout_blobs = reviewed_checkout_blobs()

    generation_stable = True
    for role, service in services.items():
        final_generation = service_generation_snapshot(UNITS[role])
        service["generation_after"] = final_generation
        service["generation_stable"] = same_process_generation(
            int(service.get("main_pid") or 0),
            service.get("process_start_ticks"),
            final_generation,
        )
        generation_stable = generation_stable and service["generation_stable"]

    policy_candidate_observed = (
        hostname == EXPECTED_HOSTNAME
        and os.geteuid() == 0
        and ss_visible
        and all(services[name].get("active_running") for name in services)
        and generation_stable
        and topology["topology_configuration_observed"]
        and topology["dispatcher_target_matches_edge_listener"]
        and topology["edge_target_matches_dedicated_gateway"]
        and topology["service_uids_pairwise_distinct"]
        and topology["all_service_uids_nonroot"]
        and topology["all_no_new_privileges"]
        and topology["all_cap_net_admin_absent"]
        and topology["all_reviewed_source_blobs_match"]
        and checkout_blobs["all_match"]
        and services["earn_edge"]["listener"]["exact_ipv4_loopback_owned"]
        and services["gateway"]["listener"]["exact_ipv4_loopback_owned"]
        and services["gateway"]["dedicated_listener"]["exact_ipv4_loopback_owned"]
        and state["custody_shape_observed"]
        and nft["table_present"]
    )

    observed_at_utc = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    return {
        "marker": MARKER,
        "version": 1,
        "observed_at_utc": observed_at_utc,
        "read_only": True,
        "service_mutation": False,
        "systemd_mutation": False,
        "network_mutation": False,
        "nftables_mutation": False,
        "funnel_mutation": False,
        "credential_access": False,
        "process_environment_access": False,
        "process_command_line_access": False,
        "non_secret_topology_evidence_required": True,
        "wallet_or_signer_access": False,
        "private_key_access": False,
        "transaction_construction": False,
        "transaction_signing": False,
        "transaction_broadcast": False,
        "work_credit_write": False,
        "presale_activation": False,
        "funds_movement": False,
        "host": {
            "hostname_matches_precision": hostname == EXPECTED_HOSTNAME,
            "expected_hostname": EXPECTED_HOSTNAME,
            "effective_uid": os.geteuid(),
            "complete_privileged_visibility": os.geteuid() == 0,
        },
        "source_checkout_head": checkout_head(),
        "reviewed_checkout_blobs": checkout_blobs,
        "reviewed_source_blobs": SOURCE_BLOBS,
        "services": services,
        "topology": topology,
        "ss_process_visibility_observed": ss_visible,
        "all_service_process_generations_stable": generation_stable,
        "rate_state": state,
        "nftables": nft,
        "policy_candidate_observed": policy_candidate_observed,
        "nftables_ruleset_live_verified": False,
        "old_direct_publication_cutover_verified": False,
        "funnel_to_dispatcher_trust_proven": False,
        "local_transport_trust_proven": False,
        "runtime_integration": False,
        "live_host_acceptance_claimed": False,
        "next_action": (
            "EXACT_NFT_AND_PUBLICATION_VERIFIER_REQUIRED"
            if policy_candidate_observed
            else "NON_SECRET_TOPOLOGY_EVIDENCE_REQUIRED"
        ),
    }


def write_create_only(path: pathlib.Path, payload: bytes) -> None:
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    fd = os.open(path, flags, 0o600)
    try:
        view = memoryview(payload)
        written = 0
        while written < len(view):
            count = os.write(fd, view[written:])
            if count <= 0:
                raise CensusError("evidence_output_short_write")
            written += count
        info = os.fstat(fd)
        if info.st_size != len(payload) or (stat.S_IMODE(info.st_mode) & 0o077) != 0:
            raise CensusError("evidence_output_metadata_invalid")
        os.fsync(fd)
    finally:
        os.close(fd)


def self_test() -> None:
    status = parse_proc_status(
        "Name:\tnode\n"
        "Uid:\t1201\t1202\t1203\t1204\n"
        "Gid:\t1301\t1302\t1303\t1304\n"
        "CapEff:\t0000000000000000\n"
        "NoNewPrivs:\t1\n"
    )
    assert status["effective_uid"] == 1202
    assert status["effective_gid"] == 1302
    assert status["no_new_privileges"] is True
    assert status["cap_net_admin"] is False

    stat_tail = ["S", *(["0"] * 18), "424242"]
    stat_line = "77 (node worker) " + " ".join(stat_tail)
    assert parse_proc_start_ticks(stat_line) == 424242
    assert same_process_generation(
        77,
        424242,
        {"active_running": True, "main_pid": 77, "start_ticks": 424242},
    ) is True
    assert same_process_generation(
        77,
        424242,
        {"active_running": True, "main_pid": 77, "start_ticks": 424243},
    ) is False
    assert same_process_generation(
        77,
        424242,
        {"active_running": True, "main_pid": 78, "start_ticks": 424242},
    ) is False

    status_cap = parse_proc_status(
        "Uid:\t1\t2\t3\t4\n"
        "Gid:\t5\t6\t7\t8\n"
        f"CapEff:\t{1 << CAP_NET_ADMIN_BIT:016x}\n"
        "NoNewPrivs:\t0\n"
    )
    assert status_cap["cap_net_admin"] is True
    assert status_cap["no_new_privileges"] is False


    rows = parse_ss_listeners(
        'LISTEN 0 511 127.0.0.1:4999 0.0.0.0:* users:(("node",pid=77,fd=20))\n'
    )
    binding = listener_binding(rows, 4999, 77)
    assert binding["exact_ipv4_loopback_owned"] is True
    assert listener_binding(rows, 4999, 78)["exact_ipv4_loopback_owned"] is False
    assert owned_ipv4_loopback_ports(rows, 77) == [4999]
    assert owned_ipv4_loopback_ports(rows, 78) == []

    assert parse_port("1024") == 1024
    assert parse_port("65535") == 65535
    assert parse_port("0") is None
    assert parse_port("443") is None
    assert loopback_url_port("http://127.0.0.1:4999") == 4999
    assert loopback_url_port("http://localhost:4999") is None

    blob = git_blob_sha1(b"abc")
    assert re.fullmatch(r"[0-9a-f]{40}", blob)
    assert len(sha256_bytes(b"abc")) == 64

    synthetic = {
        "dispatcher": {
            "effective_uid": 1201,
            "no_new_privileges": True,
            "cap_net_admin": False,
            "source": {"matches_reviewed_blob": False},
        },
        "earn_edge": {
            "effective_uid": 1202,
            "no_new_privileges": True,
            "cap_net_admin": False,
            "source": {"matches_reviewed_blob": False},
        },
        "gateway": {
            "effective_uid": 1203,
            "no_new_privileges": True,
            "cap_net_admin": False,
            "source": {"matches_reviewed_blob": False},
        },
    }
    topology = derive_topology(synthetic)
    assert topology["topology_configuration_observed"] is False
    assert topology["non_secret_topology_evidence_required"] is True
    assert topology["dispatcher_target_matches_edge_listener"] is False
    assert topology["edge_target_matches_dedicated_gateway"] is False
    assert topology["service_uids_pairwise_distinct"] is True
    assert topology["all_reviewed_source_blobs_match"] is False
    assert topology["running_entry_source_binding_observed"] is False

    print(f"{MARKER}_SELF_TEST_GREEN")
    print("process_environment_access=false")
    print("process_command_line_access=false")
    print("non_secret_topology_evidence_required=true")
    print("private_key_content_access=false")
    print("nftables_ruleset_live_verified=false")
    print("process_generation_stability_required=true")
    print("pid_reuse_or_restart_fails_candidate=true")
    print("live_host_acceptance_claimed=false")


def plan() -> None:
    print(MARKER)
    for key, value in (
        ("mode", "--plan"),
        ("read_only", "true"),
        ("service_mutation", "false"),
        ("systemd_mutation", "false"),
        ("network_mutation", "false"),
        ("nftables_mutation", "false"),
        ("funnel_mutation", "false"),
        ("credential_access", "false"),
        ("wallet_or_signer_access", "false"),
        ("private_key_access", "false"),
        ("transaction_construction", "false"),
        ("transaction_signing", "false"),
        ("transaction_broadcast", "false"),
        ("work_credit_write", "false"),
        ("presale_activation", "false"),
        ("funds_movement", "false"),
        ("process_environment_access", "false"),
        ("process_command_line_access", "false"),
        ("non_secret_topology_evidence_required", "true"),
        ("nftables_raw_output_printed", "false"),
        ("rate_state_contents_read", "false"),
        ("live_host_acceptance_claimed", "false"),
    ):
        print(f"{key}={value}")
    print("canonical_units=" + ",".join(UNITS.values()))
    print("nftables_table=" + TABLE_FAMILY + ":" + TABLE_NAME)
    print("next_action=RUN_READ_ONLY_CENSUS_FOR_HOLD_EVIDENCE")


def main() -> int:
    parser = argparse.ArgumentParser(add_help=True)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--run", action="store_true")
    parser.add_argument("--output")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.plan:
        if args.output:
            raise CensusError("--output is valid only with --run")
        plan()
        return 0

    result = collect()
    payload = (json.dumps(result, sort_keys=True, separators=(",", ":")) + "\n").encode(
        "utf-8"
    )
    if args.output:
        write_create_only(pathlib.Path(args.output), payload)
        print(MARKER)
        print("mode=--run")
        print("read_only=true")
        print("evidence_output_created=true")
        print("evidence_sha256=" + sha256_bytes(payload))
        print("policy_candidate_observed=" + str(result["policy_candidate_observed"]).lower())
        print("live_host_acceptance_claimed=false")
        print("next_action=" + result["next_action"])
    else:
        sys.stdout.buffer.write(payload)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CensusError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("live_host_acceptance_claimed=false")
        raise SystemExit(2)
