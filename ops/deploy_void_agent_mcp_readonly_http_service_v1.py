#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import http.client
import json
import os
import re
import shlex
import shutil
import signal
import socket
import stat
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

MARKER = "VOID_AGENT_MCP_READONLY_HTTP_SERVICE_PACKAGE_DEPLOYER_V1"
SELF_TEST_MARKER = "VOID_AGENT_MCP_READONLY_HTTP_SERVICE_PACKAGE_DEPLOYER_SELF_TEST_V1"
CONFIRMATION = "deployVoidAgentMcpReadonlyHttpServiceV1"
SERVICE_NAME = "void-agent-mcp-readonly-http-v1.service"
SERVICE_MARKER = "VOID_AGENT_MCP_READONLY_HTTP_SYSTEMD_SERVICE_V1"
ENV_MARKER = "VOID_AGENT_MCP_READONLY_HTTP_ENV_V1"
LISTENER_HOST = "127.0.0.1"
LISTENER_PATH = "/mcp"
DEFAULT_PORT = 4114
DEFAULT_GATEWAY = "http://127.0.0.1:4112"
DISCOVERY_PATH = "/.well-known/void-agent-discovery.json"
SUBMISSION_PATH = "/__void/agents/paid-work/submissions/v1"
EXPECTED_TOOLS = [
    "void_bootstrap_network",
    "void_prepare_paid_work_submission",
    "void_probe_paid_work",
]
EXPECTED_RESOURCES = [
    "void://agent/capability-status",
    "void://agent/service-catalog",
    "void://mainnet0/discovery",
]

HOME = Path.home()
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
UNIT_TEMPLATE = PACKAGE_ROOT / "ops/systemd/void-agent-mcp-readonly-http-v1.service.in"
ENV_TEMPLATE = PACKAGE_ROOT / "ops/systemd/void-agent-mcp-readonly-http-v1.env.example"
SYSTEMD_USER_ROOT = HOME / ".config/systemd/user"
CONFIG_ROOT = HOME / ".config/void"
DATA_ROOT = HOME / ".local/share/void-agent-mcp-readonly-http-v1"
RELEASES_ROOT = DATA_ROOT / "releases"
CURRENT_LINK = DATA_ROOT / "current"
UNIT_PATH = SYSTEMD_USER_ROOT / SERVICE_NAME
ENV_PATH = CONFIG_ROOT / "void-agent-mcp-readonly-http-v1.env"
RECEIPTS_ROOT = HOME / "void-mcp-bridge-build-receipts"


class Hold(RuntimeError):
    pass


def hold(message: str) -> None:
    raise Hold(message)


def run(
    args: list[str],
    *,
    cwd: Path | None = None,
    check: bool = True,
    capture: bool = False,
) -> subprocess.CompletedProcess[str]:
    print(f"+ {shlex.join(args)}", flush=True)
    result = subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.STDOUT if capture else None,
        check=False,
    )
    if capture and result.stdout:
        print(result.stdout, end="" if result.stdout.endswith("\\n") else "\\n", flush=True)
    if check and result.returncode != 0:
        hold(f"command failed ({result.returncode}): {shlex.join(args)}")
    return result


def capture(args: list[str], *, cwd: Path | None = None, check: bool = True) -> str:
    return (run(args, cwd=cwd, check=check, capture=True).stdout or "").strip()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_regular(path: Path, label: str) -> None:
    try:
        metadata = path.lstat()
    except FileNotFoundError:
        hold(f"{label} missing: {path}")
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        hold(f"{label} must be a regular non-symlink file: {path}")


def atomic_write(path: Path, payload: bytes, mode: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    try:
        os.write(descriptor, payload)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
    os.chmod(temporary, mode)
    os.replace(temporary, path)
    os.chmod(path, mode)


def atomic_symlink(target: Path, link: Path) -> None:
    link.parent.mkdir(parents=True, exist_ok=True)
    temporary = link.with_name(f".{link.name}.tmp-{os.getpid()}")
    temporary.unlink(missing_ok=True)
    os.symlink(str(target), temporary)
    os.replace(temporary, link)


def systemd_quote(value: str) -> str:
    if any(item in value for item in ("\\n", "\\r", "\\x00")):
        hold("systemd value contains a forbidden control character")
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def render_environment(current: Path, gateway: str, port: int) -> bytes:
    values = {
        "VOID_MCP_REPO_ROOT": str(current),
        "VOID_MCP_BASE_URL": gateway,
        "VOID_MCP_HTTP_HOST": LISTENER_HOST,
        "VOID_MCP_HTTP_PORT": str(port),
        "VOID_MCP_HTTP_ALLOWED_HOSTS": "127.0.0.1,localhost",
        "VOID_MCP_HTTP_ALLOWED_ORIGINS": "127.0.0.1,localhost",
        "VOID_MCP_HTTP_MAX_REQUEST_BYTES": "65536",
        "VOID_MCP_HTTP_MAX_CONCURRENT_REQUESTS": "8",
        "VOID_MCP_TIMEOUT_MS": "10000",
        "VOID_MCP_MAX_RESPONSE_BYTES": "1048576",
    }
    lines = [f"# {ENV_MARKER}"]
    lines.extend(f"{key}={systemd_quote(value)}" for key, value in values.items())
    lines.append("")
    payload = "\\n".join(lines).encode("utf-8")
    if b"VOID_MCP_TOKEN_FILE" in payload or b"VOID_MCP_ALLOW_SUBMIT" in payload:
        hold("rendered environment contains mutation configuration")
    return payload


def render_unit(node: str, current: Path, environment_path: Path) -> bytes:
    template = UNIT_TEMPLATE.read_text(encoding="utf-8")
    rendered = (
        template.replace("@NODE_PATH@", node)
        .replace("@CURRENT_RELEASE@", str(current))
        .replace("@ENVIRONMENT_FILE@", str(environment_path))
    )
    if "@" in rendered:
        hold("unit template retained an unresolved placeholder")
    active = [
        line.strip()
        for line in rendered.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    required = [
        "NoNewPrivileges=true",
        "PrivateTmp=true",
        "ProtectSystem=strict",
        "ProtectHome=read-only",
        "RestrictAddressFamilies=AF_INET AF_UNIX",
        "UMask=0077",
        "UnsetEnvironment=VOID_MCP_TOKEN_FILE",
        "Environment=VOID_MCP_ALLOW_SUBMIT=0",
    ]
    missing = [item for item in required if item not in active]
    if missing:
        hold(f"unit template lost required directives: {missing}")
    if any(line.startswith("PrivateDevices=") for line in active):
        hold("PrivateDevices must remain omitted for user-manager compatibility")
    forbidden = ["0.0.0.0", "VOID_MCP_ALLOW_SUBMIT=1", "VOID_MCP_TOKEN_FILE="]
    for item in forbidden:
        if item in rendered:
            hold(f"unit template contains forbidden fragment: {item}")
    return rendered.encode("utf-8")


def parse_proc_tcp(path: Path, port: int) -> list[dict[str, str]]:
    try:
        lines = path.read_text(encoding="ascii").splitlines()[1:]
    except OSError:
        return []
    wanted = f"{port:04X}"
    result: list[dict[str, str]] = []
    for raw in lines:
        fields = raw.split()
        if len(fields) < 10 or ":" not in fields[1]:
            continue
        address_hex, port_hex = fields[1].rsplit(":", 1)
        if port_hex.upper() != wanted or fields[3] != "0A":
            continue
        result.append(
            {
                "table": str(path),
                "address_hex": address_hex,
                "port_hex": port_hex,
                "state": fields[3],
                "inode": fields[9],
            }
        )
    return result


def process_socket_inodes(pid: int) -> set[str]:
    result: set[str] = set()
    fd_dir = Path(f"/proc/{pid}/fd")
    if not fd_dir.is_dir():
        return result
    for path in fd_dir.iterdir():
        try:
            target = os.readlink(path)
        except OSError:
            continue
        match = re.fullmatch(r"socket:\[(\d+)\]", target)
        if match:
            result.add(match.group(1))
    return result


def exact_listener(pid: int, port: int) -> dict[str, Any] | None:
    entries = parse_proc_tcp(Path("/proc/net/tcp"), port) + parse_proc_tcp(
        Path("/proc/net/tcp6"), port
    )
    inodes = process_socket_inodes(pid)
    owned = [entry for entry in entries if entry["inode"] in inodes]
    if len(owned) != 1:
        return None
    entry = owned[0]
    if entry["table"] != "/proc/net/tcp" or entry["address_hex"] != "0100007F":
        return None
    try:
        with socket.create_connection((LISTENER_HOST, port), timeout=0.5):
            pass
    except OSError:
        return None
    return {"pid": pid, "entry": entry, "process_socket_inodes": sorted(inodes)}


def validate_gateway(origin: str) -> dict[str, Any]:
    parsed = urlparse(origin)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost"}:
        hold("gateway origin must be loopback HTTP")
    if parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        hold("gateway origin must not contain a path, query, or fragment")
    port = parsed.port or 80

    def request(path: str) -> tuple[int, dict[str, str], bytes]:
        connection = http.client.HTTPConnection(parsed.hostname, port, timeout=5)
        try:
            connection.request("GET", path, headers={"Accept": "application/json"})
            response = connection.getresponse()
            body = response.read(1024 * 1024 + 1)
            if len(body) > 1024 * 1024:
                hold("gateway response exceeded 1 MiB")
            return (
                response.status,
                {key.lower(): value for key, value in response.getheaders()},
                body,
            )
        finally:
            connection.close()

    status, headers, body = request(DISCOVERY_PATH)
    if status != 200 or "json" not in headers.get("content-type", "").lower():
        hold("gateway discovery contract failed")
    try:
        discovery = json.loads(body)
    except json.JSONDecodeError as error:
        hold(f"gateway discovery JSON invalid: {error}")
    if not isinstance(discovery, dict) or discovery.get("marker") != "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1":
        hold("gateway discovery marker mismatch")

    submission_status, submission_headers, _ = request(SUBMISSION_PATH)
    allowed = {
        item.strip().upper()
        for item in submission_headers.get("allow", "").split(",")
        if item.strip()
    }
    if submission_status != 405 or "POST" not in allowed:
        hold("gateway submission-route GET contract failed")
    return {
        "origin": origin,
        "discovery_status": status,
        "submission_get_status": submission_status,
        "submission_allow": sorted(allowed),
    }


def service_state() -> dict[str, str]:
    text = capture(
        [
            "systemctl",
            "--user",
            "show",
            SERVICE_NAME,
            "-p",
            "LoadState",
            "-p",
            "ActiveState",
            "-p",
            "SubState",
            "-p",
            "UnitFileState",
            "-p",
            "FragmentPath",
            "-p",
            "MainPID",
            "-p",
            "Result",
            "-p",
            "ExecMainStatus",
            "-p",
            "NRestarts",
            "-p",
            "InvocationID",
        ],
        check=False,
    )
    result: dict[str, str] = {}
    for line in text.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            result[key] = value
    return result


def wait_ready(port: int, timeout: float = 30.0) -> tuple[dict[str, str], dict[str, Any]]:
    deadline = time.monotonic() + timeout
    last_state: dict[str, str] = {}
    while time.monotonic() < deadline:
        last_state = service_state()
        pid = int(last_state.get("MainPID", "0") or "0")
        if (
            last_state.get("ActiveState") == "active"
            and last_state.get("SubState") == "running"
            and pid > 0
        ):
            proof = exact_listener(pid, port)
            if proof is not None:
                return last_state, proof
        time.sleep(0.25)
    hold(f"service did not reach direct-socket readiness: {last_state}")


def write_client_script(path: Path, url: str) -> None:
    source = r'''import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

const endpoint = new URL(__URL__);
const eras = [
  ["legacy", "2025-11-25", "legacy"],
  ["modern", "2026-07-28", { pin: "2026-07-28" }],
];
const expectedTools = __TOOLS__;
const expectedResources = __RESOURCES__;
const results = {};
for (const [name, expectedProtocol, mode] of eras) {
  const client = new Client(
    { name: `void-mcp-service-package-${name}`, version: "1.0.0" },
    { versionNegotiation: { mode } },
  );
  await client.connect(new StreamableHTTPClientTransport(endpoint));
  const negotiated = client.getNegotiatedProtocolVersion();
  const tools = (await client.listTools()).tools.map((item) => item.name).sort();
  const resources = (await client.listResources()).resources.map((item) => item.uri).sort();
  if (negotiated !== expectedProtocol) throw new Error(`${name}: protocol mismatch`);
  if (JSON.stringify(tools) !== JSON.stringify(expectedTools)) throw new Error(`${name}: tool mismatch`);
  if (JSON.stringify(resources) !== JSON.stringify(expectedResources)) throw new Error(`${name}: resource mismatch`);
  if (tools.includes("void_submit_paid_work")) throw new Error(`${name}: submit tool registered`);
  await client.close();
  results[name] = { negotiated, tools, resources };
}
console.log(JSON.stringify({
  marker: "VOID_AGENT_MCP_READONLY_HTTP_SERVICE_PACKAGE_CLIENT_V1",
  exact_green: true,
  ...results,
  submit_tool_registered: false,
  network_submission_performed: false,
  credential_access: false,
}));
'''
    source = source.replace("__URL__", json.dumps(url))
    source = source.replace("__TOOLS__", json.dumps(EXPECTED_TOOLS))
    source = source.replace("__RESOURCES__", json.dumps(EXPECTED_RESOURCES))
    path.write_text(source, encoding="utf-8")
    path.chmod(0o600)


def verify_client(release: Path, port: int) -> dict[str, Any]:
    script = release / "integrations/mcp/.void-mcp-service-package-client-v1.mjs"
    if script.exists() or script.is_symlink():
        hold(f"temporary client script already exists: {script}")
    try:
        write_client_script(script, f"http://{LISTENER_HOST}:{port}{LISTENER_PATH}")
        text = capture(["node", str(script)], cwd=release)
        value = json.loads(text)
    finally:
        script.unlink(missing_ok=True)
    if value.get("exact_green") is not True:
        hold("official MCP client verification did not report exact-green")
    return value


def self_test(repo_root: Path) -> None:
    require_regular(UNIT_TEMPLATE, "systemd unit template")
    require_regular(ENV_TEMPLATE, "environment example")
    unit = render_unit(
        "/usr/bin/node",
        Path("/home/example/.local/share/void-agent-mcp-readonly-http-v1/current"),
        Path("/home/example/.config/void/void-agent-mcp-readonly-http-v1.env"),
    ).decode("utf-8")
    environment = render_environment(
        Path("/home/example/.local/share/void-agent-mcp-readonly-http-v1/current"),
        DEFAULT_GATEWAY,
        DEFAULT_PORT,
    ).decode("utf-8")
    if SERVICE_MARKER not in unit or ENV_MARKER not in environment:
        hold("rendered package markers are missing")
    if re.fullmatch(r"socket:\[(\d+)\]", "socket:[18942849]") is None:
        hold("socket inode regex self-test failed")
    if "PrivateDevices=" in unit:
        hold("PrivateDevices unexpectedly present")
    if "VOID_MCP_TOKEN_FILE=" in unit or "VOID_MCP_TOKEN_FILE" in environment:
        hold("token-file configuration unexpectedly present")
    if "Environment=VOID_MCP_ALLOW_SUBMIT=0" not in unit:
        hold("submit-disable environment is missing")
    if repo_root.is_dir():
        required = [
            repo_root / "integrations/mcp/src/http.ts",
            repo_root / "integrations/mcp/src/http-server.ts",
            repo_root / "integrations/mcp/src/http-config.ts",
            repo_root / "scripts/prove_void_agent_mcp_bridge_v1.ts",
        ]
        missing = [str(path) for path in required if not path.is_file()]
        if missing:
            hold(f"repository is missing merged MCP HTTP source: {missing}")
    print(f"{SELF_TEST_MARKER}=PASS", flush=True)
    print("private_devices_omitted=true", flush=True)
    print("socket_inode_regex_self_test=PASS", flush=True)
    print("submission_default_disabled=true", flush=True)
    print("token_file_configuration_absent=true", flush=True)
    print("external_network_listener=false", flush=True)
    print("deployment=false", flush=True)


def save_file(path: Path) -> tuple[bytes | None, int | None]:
    if not path.exists() and not path.is_symlink():
        return None, None
    require_regular(path, "managed file")
    return path.read_bytes(), stat.S_IMODE(path.stat().st_mode)


def restore_file(path: Path, data: bytes | None, mode: int | None) -> None:
    if data is None:
        path.unlink(missing_ok=True)
    else:
        atomic_write(path, data, mode or 0o600)


def rollback(
    *,
    previous_current: Path | None,
    previous_unit: bytes | None,
    previous_unit_mode: int | None,
    previous_env: bytes | None,
    previous_env_mode: int | None,
    previous_active: bool,
    previous_enabled: bool,
) -> None:
    print("rollback=START", file=sys.stderr, flush=True)
    try:
        run(["systemctl", "--user", "stop", SERVICE_NAME], check=False)
        if not previous_enabled:
            run(["systemctl", "--user", "disable", SERVICE_NAME], check=False)
        if previous_current is None:
            CURRENT_LINK.unlink(missing_ok=True)
        else:
            atomic_symlink(previous_current, CURRENT_LINK)
        restore_file(UNIT_PATH, previous_unit, previous_unit_mode)
        restore_file(ENV_PATH, previous_env, previous_env_mode)
        run(["systemctl", "--user", "daemon-reload"], check=False)
        if previous_enabled and previous_unit is not None:
            run(["systemctl", "--user", "enable", SERVICE_NAME], check=False)
        if previous_active and previous_unit is not None:
            run(["systemctl", "--user", "restart", SERVICE_NAME], check=False)
        else:
            run(["systemctl", "--user", "reset-failed", SERVICE_NAME], check=False)
        print("rollback=PASS", file=sys.stderr, flush=True)
    except Exception as error:
        print(f"rollback=FAILED error={type(error).__name__}:{error}", file=sys.stderr, flush=True)


def write_receipt(value: dict[str, Any]) -> Path:
    RECEIPTS_ROOT.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(RECEIPTS_ROOT, 0o700)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = RECEIPTS_ROOT / f"void-agent-mcp-readonly-http-service-package-v1-deployment-{stamp}.json"
    payload = (json.dumps(value, indent=2, sort_keys=True) + "\\n").encode("utf-8")
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        os.write(descriptor, payload)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
    os.chmod(path, 0o600)
    return path


def deploy(repo_root: Path, gateway: str, port: int) -> None:
    for name in ("git", "node", "npm", "npx", "systemctl", "journalctl"):
        if shutil.which(name) is None:
            hold(f"required command not found: {name}")
    if not 1024 <= port <= 65535:
        hold("listener port must be between 1024 and 65535")
    if capture(["git", "rev-parse", "--is-inside-work-tree"], cwd=repo_root) != "true":
        hold("repo root is not a Git worktree")
    if capture(["git", "status", "--porcelain=v1", "--untracked-files=all"], cwd=repo_root):
        hold("repo root must be clean")
    commit = capture(["git", "rev-parse", "HEAD"], cwd=repo_root)
    gateway_proof = validate_gateway(gateway)
    node_path = shutil.which("node")
    assert node_path is not None

    previous_state = service_state()
    previous_active = previous_state.get("ActiveState") == "active"
    previous_enabled = previous_state.get("UnitFileState") == "enabled"
    previous_current = CURRENT_LINK.resolve() if CURRENT_LINK.is_symlink() else None
    previous_unit, previous_unit_mode = save_file(UNIT_PATH)
    previous_env, previous_env_mode = save_file(ENV_PATH)

    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    release = RELEASES_ROOT / f"{commit[:12]}-{stamp}"
    mutated = False
    try:
        RELEASES_ROOT.mkdir(parents=True, exist_ok=True, mode=0o700)
        run(["git", "worktree", "add", "--detach", str(release), commit], cwd=repo_root)
        run(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], cwd=release)
        run(["npm", "--prefix", "integrations/mcp", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], cwd=release)
        run(["npm", "--prefix", "integrations/mcp", "run", "check"], cwd=release)
        run(["npx", "--no-install", "tsx", "scripts/prove_void_agent_mcp_bridge_v1.ts"], cwd=release)
        run(["npx", "--no-install", "tsc", "-p", "tsconfig.build.json", "--pretty", "false"], cwd=release)
        if capture(["git", "status", "--porcelain=v1", "--untracked-files=all"], cwd=release):
            hold("release worktree became dirty during build")

        environment_payload = render_environment(CURRENT_LINK, gateway, port)
        unit_payload = render_unit(node_path, CURRENT_LINK, ENV_PATH)
        atomic_write(ENV_PATH, environment_payload, 0o600)
        atomic_write(UNIT_PATH, unit_payload, 0o644)
        atomic_symlink(release, CURRENT_LINK)
        mutated = True

        analyze = shutil.which("systemd-analyze")
        if analyze:
            run([analyze, "--user", "verify", str(UNIT_PATH)])
        run(["systemctl", "--user", "daemon-reload"])
        run(["systemctl", "--user", "enable", SERVICE_NAME])
        run(["systemctl", "--user", "restart", SERVICE_NAME])
        state, listener = wait_ready(port)
        if state.get("UnitFileState") != "enabled":
            hold("service is not enabled after activation")
        client = verify_client(release, port)
        if capture(["git", "status", "--porcelain=v1", "--untracked-files=all"], cwd=release):
            hold("release worktree became dirty after client verification")

        receipt = write_receipt(
            {
                "marker": "VOID_AGENT_MCP_READONLY_HTTP_SERVICE_PACKAGE_DEPLOYMENT_RECEIPT_V1",
                "version": 1,
                "exact_green": True,
                "deployed_commit": commit,
                "release": str(release),
                "current": str(CURRENT_LINK),
                "unit": str(UNIT_PATH),
                "unit_sha256": sha256_file(UNIT_PATH),
                "environment": str(ENV_PATH),
                "environment_sha256": sha256_file(ENV_PATH),
                "service_state": state,
                "listener": listener,
                "gateway": gateway_proof,
                "client": client,
                "authority": {
                    "deployment": True,
                    "new_user_service_activation": True,
                    "existing_void_node_service_restart": False,
                    "external_network_listener": False,
                    "reverse_proxy_configuration": False,
                    "live_credential_access": False,
                    "live_paid_work_submission": False,
                    "network_paid_work_submission_performed": False,
                    "payment_execution": False,
                    "paid_work_execution": False,
                    "wc_ledger_write": False,
                    "void_settlement": False,
                    "wallet_or_signer_access": False,
                    "transaction_broadcast": False,
                    "git_commit": False,
                    "git_push": False,
                    "pull_request": False,
                },
            }
        )
        print(f"receipt={receipt}", flush=True)
        print("service_active=true", flush=True)
        print("service_enabled=true", flush=True)
        print("persistent_listener_started=true", flush=True)
        print("persistent_listener_loopback_only=true", flush=True)
        print("submit_tool_registered=false", flush=True)
        print("external_network_listener=false", flush=True)
        print("live_credential_access=false", flush=True)
        print("live_paid_work_submission=false", flush=True)
        print("payment_execution=false", flush=True)
        print("paid_work_execution=false", flush=True)
        print("wc_ledger_write=false", flush=True)
        print("void_settlement=false", flush=True)
        print(f"{MARKER}=PASS", flush=True)
    except Exception:
        if mutated:
            rollback(
                previous_current=previous_current,
                previous_unit=previous_unit,
                previous_unit_mode=previous_unit_mode,
                previous_env=previous_env,
                previous_env_mode=previous_env_mode,
                previous_active=previous_active,
                previous_enabled=previous_enabled,
            )
        if release.exists():
            run(["git", "worktree", "remove", "--force", str(release)], cwd=repo_root, check=False)
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy or self-test the VOID Agent MCP read-only HTTP user-service package V1.")
    parser.add_argument("--repo-root", default=str(PACKAGE_ROOT))
    parser.add_argument("--gateway-origin", default=DEFAULT_GATEWAY)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--confirm")
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = Path(args.repo_root).expanduser().resolve()
    if args.self_test:
        self_test(repo_root)
        return
    if args.confirm != CONFIRMATION:
        hold(f"exact confirmation required: --confirm {CONFIRMATION}")
    print(f"{MARKER}=START", flush=True)
    print("deployment=true", flush=True)
    print("persistent_listener_requested=true", flush=True)
    print("listener_scope=127.0.0.1_only", flush=True)
    print("live_credential_access=false", flush=True)
    print("live_paid_work_submission=false", flush=True)
    print("payment_execution=false", flush=True)
    print("paid_work_execution=false", flush=True)
    print("wc_ledger_write=false", flush=True)
    print("void_settlement=false", flush=True)
    deploy(repo_root, args.gateway_origin, args.port)


if __name__ == "__main__":
    try:
        main()
    except Hold as error:
        print(f"HOLD: {error}", file=sys.stderr, flush=True)
        raise SystemExit(1)
    except Exception as error:
        print(f"HOLD: unexpected failure: {type(error).__name__}: {error}", file=sys.stderr, flush=True)
        raise SystemExit(1)
