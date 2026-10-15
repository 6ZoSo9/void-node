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
from datetime import datetime, timezone
from typing import Any

MARKER = "VOID_PUBLIC_EARN_LEGACY_CUTOVER_CENSUS_V1"
EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
GATEWAY_UNIT = "void-public-earn-gateway-v1.service"
TUNNEL_UNIT = "void-public-seed-named-tunnel-v1.service"
EXPECTED_GATEWAY_SOURCE_BLOB = "140796d809a13171f0186a226bade1b4d82f406d"
LEGACY_SHARED_PORT = 4122
SYSTEMCTL = pathlib.Path("/usr/bin/systemctl")
SS = pathlib.Path("/usr/bin/ss")
MAX_COMMAND_BYTES = 2 * 1024 * 1024
MAX_PROC_BYTES = 1024 * 1024
MAX_CONFIG_BYTES = 1024 * 1024

class CensusError(RuntimeError):
    pass

def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()

def safe_user_env() -> dict[str, str]:
    uid = os.geteuid()
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
    resolved = path.resolve(strict=True)
    info = resolved.stat()
    if not stat.S_ISREG(info.st_mode) or not info.st_mode & 0o111:
        raise CensusError(f"command_not_executable:{path}")
    return (str(resolved), info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns)

def run_read_only(path: pathlib.Path, args: list[str], *, allow_failure: bool = False) -> tuple[int, bytes, bytes]:
    before = command_identity(path)
    result = subprocess.run(
        [before[0], *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=safe_user_env(),
        timeout=10,
        check=False,
    )
    if len(result.stdout) > MAX_COMMAND_BYTES or len(result.stderr) > MAX_COMMAND_BYTES:
        raise CensusError("command_output_too_large")
    after = command_identity(path)
    if before != after:
        raise CensusError(f"command_changed_during_read:{path}")
    if result.returncode != 0 and not allow_failure:
        raise CensusError(f"command_failed:{path.name}")
    return result.returncode, result.stdout, result.stderr

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
    tail = text[closing + 2:].split()
    if len(tail) < 20 or not re.fullmatch(r"[1-9][0-9]*", tail[19]):
        raise CensusError("proc_stat_start_ticks_invalid")
    return int(tail[19])

def read_start_ticks(pid: int) -> int | None:
    if pid < 1:
        return None
    try:
        return parse_proc_start_ticks(read_bounded(pathlib.Path(f"/proc/{pid}/stat"), 64 * 1024))
    except (OSError, CensusError, UnicodeDecodeError):
        return None

def unit_snapshot(unit: str) -> dict[str, Any]:
    code, stdout, _stderr = run_read_only(
        SYSTEMCTL,
        [
            "--user", "show", unit, "--no-pager",
            "--property=LoadState",
            "--property=ActiveState",
            "--property=SubState",
            "--property=MainPID",
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
        "unit": unit,
        "loaded": code == 0 and values.get("LoadState") == "loaded",
        "active_running": active,
        "main_pid": pid,
        "start_ticks": read_start_ticks(pid) if active else None,
    }

def same_generation(first: dict[str, Any], second: dict[str, Any]) -> bool:
    return (
        first.get("active_running") is True
        and second.get("active_running") is True
        and first.get("main_pid") == second.get("main_pid")
        and isinstance(first.get("start_ticks"), int)
        and first.get("start_ticks") == second.get("start_ticks")
    )

def empty_gateway_status() -> dict[str, Any]:
    return {
        "status_observed": False,
        "marker_matches_public_earn_gateway": False,
        "mutation_ingress_status_observed": False,
        "dedicated_mutation_mode_observed": False,
        "shared_legacy_mode_observed": False,
    }


def classify_gateway_status_payload(parsed: Any) -> dict[str, Any]:
    result = empty_gateway_status()
    if not isinstance(parsed, dict):
        return result
    result["status_observed"] = True
    result["marker_matches_public_earn_gateway"] = (
        parsed.get("marker") == "VOID_PUBLIC_EARN_GATEWAY_V1"
    )
    ingress = parsed.get("mutation_ingress")
    if isinstance(ingress, dict):
        result["mutation_ingress_status_observed"] = True
        result["dedicated_mutation_mode_observed"] = (
            ingress.get("mode") == "dedicated_loopback"
            and ingress.get("dedicated_loopback_configured") is True
            and ingress.get("shared_listener_mutations_enabled") is False
            and ingress.get("dedicated_listener_host_public") is False
            and ingress.get("local_transport_trust_proven") is False
        )
        result["shared_legacy_mode_observed"] = (
            ingress.get("mode") == "shared_legacy_hold"
            and ingress.get("dedicated_loopback_configured") is False
            and ingress.get("shared_listener_mutations_enabled") is True
        )
    return result


def read_gateway_status_4122() -> dict[str, Any]:
    result = empty_gateway_status()
    connection = http.client.HTTPConnection(
        "127.0.0.1",
        LEGACY_SHARED_PORT,
        timeout=3,
    )
    try:
        connection.request(
            "GET",
            "/__void/public-earn-gateway-v1/status.json",
            headers={
                "Accept": "application/json",
                "User-Agent": "void-public-earn-legacy-cutover-census-v1",
                "Connection": "close",
            },
        )
        response = connection.getresponse()
        if response.status != 200:
            response.read(256 * 1024 + 1)
            return result
        raw = response.read(256 * 1024 + 1)
        if len(raw) > 256 * 1024:
            return result
        parsed = json.loads(raw.decode("utf-8", "strict"))
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
    return classify_gateway_status_payload(parsed)

def running_source_blob(pid: int) -> str | None:
    if pid < 1:
        return None
    try:
        cmdline = read_bounded(pathlib.Path(f"/proc/{pid}/cmdline"))
        cwd = pathlib.Path(os.path.realpath(f"/proc/{pid}/cwd"))
        exe = pathlib.Path(os.path.realpath(f"/proc/{pid}/exe"))
        if exe.name not in {"node", "nodejs"}:
            return None
        args = [x for x in cmdline.split(b"\0") if x]
        if len(args) < 2:
            return None
        arg = args[1].decode("utf-8", "strict")
        candidate = pathlib.Path(arg)
        if not candidate.is_absolute():
            candidate = cwd / candidate
        resolved = candidate.resolve(strict=True)
        if not resolved.is_file():
            return None
        return git_blob_sha1(read_bounded(resolved, 4 * 1024 * 1024))
    except (OSError, CensusError, UnicodeDecodeError):
        return None

def listener_4122_owned(pid: int) -> tuple[bool, int]:
    code, stdout, _stderr = run_read_only(SS, ["-H", "-ltnp"], allow_failure=True)
    if code != 0:
        return False, 0
    candidates = []
    for line in stdout.decode("utf-8", "strict").splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 5 or parts[0] != "LISTEN":
            continue
        local = parts[3]
        if local.endswith(f":{LEGACY_SHARED_PORT}"):
            candidates.append(" ".join(parts[5:]) if len(parts) > 5 else "")
    pid_pattern = re.compile(rf"(^|[^0-9])pid={pid}([^0-9]|$)")
    owned = len(candidates) == 1 and pid > 0 and pid_pattern.search(candidates[0]) is not None
    return owned, len(candidates)

def parse_cloudflared_config_path(pid: int) -> pathlib.Path | None:
    if pid < 1:
        return None
    try:
        raw = read_bounded(pathlib.Path(f"/proc/{pid}/cmdline"))
    except OSError:
        return None
    args = [x.decode("utf-8", "strict") for x in raw.split(b"\0") if x]
    for index, arg in enumerate(args):
        if arg == "--config" and index + 1 < len(args):
            candidate = pathlib.Path(args[index + 1])
            if candidate.is_absolute():
                try:
                    resolved = candidate.resolve(strict=True)
                    if resolved.is_file():
                        return resolved
                except OSError:
                    return None
        if arg.startswith("--config="):
            candidate = pathlib.Path(arg.split("=", 1)[1])
            if candidate.is_absolute():
                try:
                    resolved = candidate.resolve(strict=True)
                    if resolved.is_file():
                        return resolved
                except OSError:
                    return None
    return None

def classify_tunnel_config(path: pathlib.Path | None) -> dict[str, Any]:
    result = {
        "config_observed": False,
        "config_sha256": None,
        "status_routes_direct_4122": False,
        "mutation_routes_direct_4122": False,
        "seed_hostname_rule_observed": False,
    }
    if path is None:
        return result
    try:
        raw = read_bounded(path, MAX_CONFIG_BYTES)
        text = raw.decode("utf-8", "strict")
    except (OSError, CensusError, UnicodeDecodeError):
        return result
    result["config_observed"] = True
    result["config_sha256"] = sha256_bytes(raw)

    current_hostname = None
    current_path = None
    rules: list[tuple[str | None, str | None, str]] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line.startswith("- hostname:"):
            current_hostname = line.split(":", 1)[1].strip().strip('"').strip("'")
            current_path = None
        elif line.startswith("hostname:"):
            current_hostname = line.split(":", 1)[1].strip().strip('"').strip("'")
        elif line.startswith("path:"):
            current_path = line.split(":", 1)[1].strip().strip('"').strip("'")
        elif line.startswith("service:"):
            service = line.split(":", 1)[1].strip().strip('"').strip("'")
            rules.append((current_hostname, current_path, service))
            current_path = None

    for hostname, path_expr, service in rules:
        if hostname == "seed.nullfeed.org":
            result["seed_hostname_rule_observed"] = True
        if hostname != "seed.nullfeed.org" or service != "http://127.0.0.1:4122":
            continue
        expr = path_expr or ""
        if "wc/public-earning-pilot-v1" in expr and "status" in expr:
            result["status_routes_direct_4122"] = True
        if (
            "wc/public-earning-pilot-v1" in expr
            and ("claim-ticket" in expr or "submit-result" in expr)
        ):
            result["mutation_routes_direct_4122"] = True
    return result

def collect() -> dict[str, Any]:
    hostname = socket.gethostname()
    effective_uid = os.geteuid()
    try:
        effective_user = pwd.getpwuid(effective_uid).pw_name
    except KeyError:
        effective_user = None

    gateway_before = unit_snapshot(GATEWAY_UNIT)
    tunnel_before = unit_snapshot(TUNNEL_UNIT)

    gateway_blob = running_source_blob(int(gateway_before.get("main_pid") or 0))
    owned_4122, listener_count_4122 = listener_4122_owned(
        int(gateway_before.get("main_pid") or 0)
    )
    gateway_status = (
        read_gateway_status_4122()
        if gateway_before["active_running"] and owned_4122
        else empty_gateway_status()
    )

    config_path = parse_cloudflared_config_path(int(tunnel_before.get("main_pid") or 0))
    tunnel_routes = classify_tunnel_config(config_path)

    gateway_after = unit_snapshot(GATEWAY_UNIT)
    tunnel_after = unit_snapshot(TUNNEL_UNIT)
    gateway_stable = same_generation(gateway_before, gateway_after) if gateway_before["active_running"] else not gateway_after["active_running"]
    tunnel_stable = same_generation(tunnel_before, tunnel_after) if tunnel_before["active_running"] else not tunnel_after["active_running"]

    tunnel_route_classification_complete = (
        not tunnel_before["active_running"]
        or tunnel_routes["config_observed"]
    )
    legacy_cutover_required = bool(
        gateway_before["active_running"]
        or tunnel_before["active_running"]
        or listener_count_4122
        or tunnel_routes["mutation_routes_direct_4122"]
    )

    for item in (gateway_before, tunnel_before, gateway_after, tunnel_after):
        item.pop("main_pid", None)
        item.pop("start_ticks", None)

    return {
        "marker": MARKER,
        "version": 1,
        "observed_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "read_only": True,
        "host": {
            "hostname_matches_precision": hostname == EXPECTED_HOSTNAME,
            "ordinary_user_observer": effective_uid != 0,
            "effective_user_is_zoso": effective_user == "zoso",
        },
        "service_mutation": False,
        "systemd_mutation": False,
        "network_mutation": False,
        "tunnel_mutation": False,
        "credential_content_access": False,
        "gateway": {
            "unit": GATEWAY_UNIT,
            "active_running": gateway_before["active_running"],
            "generation_stable": gateway_stable,
            "listener_4122_candidate_count": listener_count_4122,
            "listener_4122_owned": owned_4122,
            "shared_listener_4122_observed": owned_4122,
            **gateway_status,
            "running_source_git_blob_sha1": gateway_blob,
            "running_source_matches_ready_2993": gateway_blob == EXPECTED_GATEWAY_SOURCE_BLOB,
        },
        "tunnel": {
            "unit": TUNNEL_UNIT,
            "active_running": tunnel_before["active_running"],
            "generation_stable": tunnel_stable,
            **tunnel_routes,
        },
        "legacy_cutover_required": legacy_cutover_required,
        "tunnel_route_classification_complete": tunnel_route_classification_complete,
        "mutation_route_removal_required": tunnel_routes["mutation_routes_direct_4122"],
        "status_route_preservation_required": tunnel_routes["status_routes_direct_4122"],
        "system_gateway_4122_conflict": bool(listener_count_4122),
        "safe_to_stage_system_gateway_on_4122_while_legacy_running": False if listener_count_4122 else True,
        "live_cutover_authorized": False,
        "next_action": (
            "TUNNEL_CONFIG_OBSERVATION_HOLD"
            if not tunnel_route_classification_complete
            else (
                "PLAN_LEGACY_TO_PROTECTED_CUTOVER"
                if legacy_cutover_required
                else "PLAN_PROTECTED_INSTALL_WITHOUT_LEGACY_CUTOVER"
            )
        ),
    }

def self_test() -> None:
    assert same_generation(
        {"active_running": True, "main_pid": 5, "start_ticks": 10},
        {"active_running": True, "main_pid": 5, "start_ticks": 10},
    )
    assert not same_generation(
        {"active_running": True, "main_pid": 5, "start_ticks": 10},
        {"active_running": True, "main_pid": 5, "start_ticks": 11},
    )
    assert not same_generation(
        {"active_running": True, "main_pid": 5, "start_ticks": 10},
        {"active_running": True, "main_pid": 6, "start_ticks": 10},
    )
    dedicated = classify_gateway_status_payload({
        "marker": "VOID_PUBLIC_EARN_GATEWAY_V1",
        "mutation_ingress": {
            "mode": "dedicated_loopback",
            "dedicated_loopback_configured": True,
            "shared_listener_mutations_enabled": False,
            "dedicated_listener_host_public": False,
            "local_transport_trust_proven": False,
        },
    })
    assert dedicated["status_observed"] is True
    assert dedicated["mutation_ingress_status_observed"] is True
    assert dedicated["dedicated_mutation_mode_observed"] is True
    assert dedicated["shared_legacy_mode_observed"] is False

    old_status = classify_gateway_status_payload({
        "marker": "VOID_PUBLIC_EARN_GATEWAY_V1",
    })
    assert old_status["status_observed"] is True
    assert old_status["mutation_ingress_status_observed"] is False
    assert old_status["dedicated_mutation_mode_observed"] is False

    synthetic = """tunnel: x
ingress:
  - hostname: seed.nullfeed.org
    path: ^/wc/public-earning-pilot-v1/(status|claim-ticket|submit-result)$
    service: http://127.0.0.1:4122
  - service: http_status:404
"""
    import tempfile
    with tempfile.TemporaryDirectory(prefix="void-public-earn-legacy-census-") as tmp:
        p = pathlib.Path(tmp) / "config.yml"
        p.write_text(synthetic, encoding="utf-8")
        result = classify_tunnel_config(p)
    assert result["status_routes_direct_4122"] is True
    assert result["mutation_routes_direct_4122"] is True
    print(f"{MARKER}_SELF_TEST_GREEN")
    print("tunnel_credential_path_output=false")
    print("process_environment_access=false")
    print("process_environment_output=false")
    print("loopback_status_get_only=true")
    print("live_cutover_authorized=false")

def plan() -> None:
    print(MARKER)
    for key, value in (
        ("mode", "--plan"),
        ("read_only", "true"),
        ("precision_hostname_required", "true"),
        ("ordinary_zoso_user_manager_required", "true"),
        ("service_mutation", "false"),
        ("systemd_mutation", "false"),
        ("network_mutation", "false"),
        ("tunnel_mutation", "false"),
        ("credential_content_access", "false"),
        ("process_environment_access", "false"),
        ("process_environment_output", "false"),
        ("loopback_status_get_only", "true"),
        ("tunnel_credential_path_output", "false"),
        ("live_cutover_authorized", "false"),
    ):
        print(f"{key}={value}")
    print(f"gateway_unit={GATEWAY_UNIT}")
    print(f"tunnel_unit={TUNNEL_UNIT}")
    print(f"legacy_shared_port={LEGACY_SHARED_PORT}")
    print("next_action=RUN_READ_ONLY_LEGACY_CUTOVER_CENSUS")

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
    print(json.dumps(collect(), sort_keys=True, separators=(",", ":")))
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CensusError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("live_cutover_authorized=false")
        raise SystemExit(2)
