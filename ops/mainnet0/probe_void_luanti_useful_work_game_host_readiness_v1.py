#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
from typing import Any

MARKER = "VOID_LUANTI_USEFUL_WORK_GAME_HOST_READINESS_V1"
MAX_FILE_BYTES = 16 * 1024 * 1024

def fail(message: str) -> RuntimeError:
    return RuntimeError(message)

def safe_file(path: Path) -> None:
    if not path.is_file() or path.is_symlink():
        raise fail(f"safe regular file required: {path}")
    if path.stat().st_size > MAX_FILE_BYTES:
        raise fail(f"file exceeds inspection bound: {path}")

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def safe_version(command: str | None) -> dict[str, Any]:
    if not command:
        return {"path": None, "version_output": None}
    completed = subprocess.run(
        [command, "--version"],
        check=False,
        capture_output=True,
        text=True,
        timeout=5,
    )
    output = (completed.stdout or completed.stderr).strip()
    return {
        "path": command,
        "returncode": completed.returncode,
        "version_output": output[:2048],
    }

def find_game_candidates() -> list[dict[str, Any]]:
    roots = [
        Path.home() / ".luanti/games",
        Path.home() / ".minetest/games",
        Path("/usr/share/luanti/games"),
        Path("/usr/share/minetest/games"),
        Path("/usr/local/share/luanti/games"),
        Path("/usr/local/share/minetest/games"),
    ]
    found: list[dict[str, Any]] = []
    for root in roots:
        if not root.is_dir() or root.is_symlink():
            continue
        for child in sorted(root.iterdir()):
            if not child.is_dir() or child.is_symlink():
                continue
            game_conf = child / "game.conf"
            if not game_conf.is_file() or game_conf.is_symlink():
                continue
            text = game_conf.read_text(encoding="utf-8", errors="replace")
            lower = f"{child.name}\n{text}".lower()
            if "mineclonia" not in lower and "mineclone" not in lower:
                continue
            found.append({
                "directory": str(child.resolve()),
                "game_conf_sha256": sha256_file(game_conf),
                "name": child.name,
            })
    return found

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    repo = args.repo.resolve()
    if not (repo / ".git").exists():
        raise fail(f"git worktree required: {repo}")

    output = args.output.resolve()
    if output.exists() or output.is_symlink():
        raise fail(f"output must not exist: {output}")
    if not output.parent.is_dir() or output.parent.is_symlink():
        raise fail(f"safe output parent required: {output.parent}")

    required_repo_paths = [
        "tools/void_public_earn_no_node_client_v1.mjs",
        "ops/mainnet0/wc-public-earning-participant-v1.sh",
        "src/economic/agent_paid_work_wc_earning_adapter_v1.ts",
        "integrations/luanti/void_work/mod.conf",
        "integrations/luanti/void_work/init.lua",
    ]
    repo_files: dict[str, Any] = {}
    for item in required_repo_paths:
        path = repo / item
        safe_file(path)
        repo_files[item] = {
            "sha256": sha256_file(path),
            "bytes": path.stat().st_size,
        }

    binaries = {
        name: safe_version(shutil.which(name))
        for name in (
            "luanti",
            "luantiserver",
            "minetest",
            "minetestserver",
        )
    }
    runtime_present = any(
        value["path"] is not None
        for value in binaries.values()
    )

    games = find_game_candidates()
    status = (
        "ready_for_private_server_smoke_test_plan"
        if runtime_present
        else "missing_local_luanti_runtime"
    )

    result = {
        "marker": MARKER,
        "version": 1,
        "status": status,
        "hostname": socket.gethostname(),
        "repo_realpath": str(repo),
        "repo_files": repo_files,
        "runtime_binaries": binaries,
        "mineclonia_candidates": games,
        "mineclonia_present": len(games) > 0,
        "foundation": {
            "working_title": "VOID Realms",
            "server_mod_present": True,
            "external_worker_companion_required": True,
            "server_mod_runs_player_compute": False,
            "upstream_download_authorized": False,
            "package_install_authorized": False,
            "server_start_authorized": False,
            "worker_start_authorized": False,
        },
        "authority": {
            "repo_write": False,
            "upstream_download": False,
            "upstream_fork": False,
            "package_install": False,
            "server_start": False,
            "network_listener_start": False,
            "external_connection": False,
            "worker_start": False,
            "work_execution": False,
            "work_credit_write": False,
            "wallet_or_signer_access": False,
            "payment_execution": False,
            "deployment": False,
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
