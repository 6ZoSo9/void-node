#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import socket
import subprocess
from typing import Any

MARKER = "VOID_GAMENETWORKINGSOCKETS_HOST_READINESS_V1"
MAX_SOURCE_BYTES = 8 * 1024 * 1024

FORBIDDEN_TOOL_NAMES = {
    "apt",
    "apt-get",
    "dnf",
    "pacman",
    "yum",
    "zypper",
    "curl",
    "wget",
}

def hold(message: str) -> RuntimeError:
    return RuntimeError(message)

def safe_file(path: Path) -> None:
    if not path.is_file() or path.is_symlink():
        raise hold(f"safe regular file required: {path}")
    if path.stat().st_size > MAX_SOURCE_BYTES:
        raise hold(f"source file too large: {path}")

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def tool_path(name: str, fixture: dict[str, Any] | None) -> str | None:
    if fixture is not None:
        value = fixture.get("tools", {}).get(name)
        if value is None:
            return None
        if not isinstance(value, str) or not value.startswith("/"):
            raise hold(f"invalid fixture tool path: {name}")
        return value
    return shutil.which(name)

def pkg_config_exists(name: str, fixture: dict[str, Any] | None) -> bool:
    if fixture is not None:
        value = fixture.get("pkg_config", {}).get(name, False)
        if not isinstance(value, bool):
            raise hold(f"invalid fixture pkg-config value: {name}")
        return value
    pkg = shutil.which("pkg-config")
    if not pkg:
        return False
    completed = subprocess.run(
        [pkg, "--exists", name],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=5,
    )
    return completed.returncode == 0

def inspect_transport(repo: Path) -> dict[str, Any]:
    node_core = repo / "src/node_core.ts"
    p2p_shim = repo / "src/p2p/p2p.ts"
    for path in (node_core, p2p_shim):
        safe_file(path)

    text = node_core.read_text(encoding="utf-8")
    required = {
        "node_net_import": 'import * as net from "node:net";',
        "tcp_server": "net.createServer",
        "tcp_dial": "net.createConnection",
        "four_byte_length_prefix": "writeUInt32BE(body.length, 0)",
        "max_message_bytes": "const MAX_MSG_BYTES = 64 * 1024;",
        "hello": 'type: "HELLO"',
        "peers": 'type: "PEERS"',
        "pub": 'type: "PUB"',
        "sub": 'type: "SUB"',
        "ed25519_signing": "crypto.sign(null",
        "ed25519_verification": "crypto.verify(null",
    }
    observed = {
        key: fragment in text
        for key, fragment in required.items()
    }

    return {
        "source_path": "src/node_core.ts",
        "source_sha256": sha256_file(node_core),
        "p2p_shim_path": "src/p2p/p2p.ts",
        "p2p_shim_sha256": sha256_file(p2p_shim),
        "required_observations": observed,
        "all_required_observations_present": all(observed.values()),
        "current_transport": "node_net_tcp",
        "frame_prefix_bytes": 4,
        "max_message_bytes": 65536,
        "wire_message_types": ["HELLO", "PEERS", "PUB", "SUB"],
        "message_signatures_are_transport_independent": True,
    }

def load_fixture(path: Path | None) -> dict[str, Any] | None:
    if path is None:
        return None
    safe_file(path)
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise hold("fixture must be an object")
    return value

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--fixture-json", type=Path)
    args = parser.parse_args()

    repo = args.repo.resolve()
    if not (repo / ".git").exists():
        raise hold(f"git worktree required: {repo}")
    output = args.output.resolve()
    if output.exists() or output.is_symlink():
        raise hold(f"output must not exist: {output}")
    if not output.parent.is_dir() or output.parent.is_symlink():
        raise hold(f"safe output parent required: {output.parent}")

    fixture = load_fixture(args.fixture_json)
    tools = {
        name: tool_path(name, fixture)
        for name in (
            "git",
            "cmake",
            "ninja",
            "make",
            "c++",
            "g++",
            "clang++",
            "pkg-config",
            "python3",
        )
    }
    for forbidden in FORBIDDEN_TOOL_NAMES:
        if forbidden in tools:
            raise hold(f"forbidden mutating/download tool in probe set: {forbidden}")

    compiler_ready = any(
        tools[name] is not None
        for name in ("c++", "g++", "clang++")
    )
    build_runner_ready = any(
        tools[name] is not None
        for name in ("ninja", "make")
    )
    core_ready = (
        tools["git"] is not None
        and tools["cmake"] is not None
        and compiler_ready
        and build_runner_ready
    )

    packages = {
        "libsodium": pkg_config_exists("libsodium", fixture),
        "protobuf": pkg_config_exists("protobuf", fixture),
        "openssl": pkg_config_exists("openssl", fixture),
    }

    transport = inspect_transport(repo)
    status = (
        "ready_for_local_dependency_build_probe"
        if core_ready and transport["all_required_observations_present"]
        else "missing_local_build_prerequisites"
    )

    result = {
        "marker": MARKER,
        "version": 1,
        "status": status,
        "hostname": (
            str(fixture.get("hostname"))
            if fixture is not None and fixture.get("hostname")
            else socket.gethostname()
        ),
        "platform": platform.system().lower(),
        "architecture": platform.machine(),
        "repo_realpath": str(repo),
        "tools": tools,
        "packages": packages,
        "transport_boundary": transport,
        "candidate_upstream": {
            "repository": "ValveSoftware/GameNetworkingSockets",
            "candidate_tag": "v1.5.1",
            "steam_client_required": False,
            "steam_datagram_relay_assumed": False,
            "automatic_source_download": False,
        },
        "next_phase": {
            "dependency_checkout_authorized": False,
            "package_install_authorized": False,
            "native_build_authorized": False,
            "network_listener_start_authorized": False,
            "external_connection_authorized": False,
            "service_restart_authorized": False,
            "deployment_authorized": False,
        },
        "authority": {
            "repo_write": False,
            "package_install": False,
            "source_download": False,
            "network_listener_start": False,
            "external_connection": False,
            "service_restart": False,
            "deployment": False,
            "key_or_credential_access": False,
            "steam_api_key_access": False,
            "steam_operator_token_access": False,
            "wallet_or_signer_access": False,
            "work_credit_write": False,
            "payment_execution": False,
            "money_movement": False,
        },
    }

    fd = os.open(
        output,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
        0o600,
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(result, handle, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
    except Exception:
        try:
            output.unlink(missing_ok=True)
        finally:
            raise

    print(json.dumps(result, indent=2, sort_keys=True))
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(json.dumps({
            "marker": MARKER,
            "ok": False,
            "hold": str(exc),
        }, indent=2, sort_keys=True))
        raise SystemExit(1)
