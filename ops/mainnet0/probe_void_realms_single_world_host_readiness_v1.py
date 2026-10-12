#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
from typing import Any

MARKER = "VOID_REALMS_SINGLE_WORLD_HOST_READINESS_V1"
MAX_FILE_BYTES = 32 * 1024 * 1024

def hold(message: str) -> RuntimeError:
    return RuntimeError(message)

def safe_file(path: Path) -> None:
    if not path.is_file() or path.is_symlink():
        raise hold(f"safe regular file required: {path}")
    if path.stat().st_size > MAX_FILE_BYTES:
        raise hold(f"file exceeds inspection bound: {path}")

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def inspect_text(path: Path, fragments: list[str]) -> dict[str, Any]:
    safe_file(path)
    text = path.read_text(encoding="utf-8", errors="strict")
    observed = {fragment: fragment in text for fragment in fragments}
    return {
        "path": str(path),
        "sha256": sha256_file(path),
        "bytes": path.stat().st_size,
        "observed": observed,
        "all_observed": all(observed.values()),
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    repo = args.repo.resolve()
    if not (repo / ".git").exists():
        raise hold(f"git worktree required: {repo}")

    output = args.output.resolve()
    if output.exists() or output.is_symlink():
        raise hold(f"output must not exist: {output}")
    if not output.parent.is_dir() or output.parent.is_symlink():
        raise hold(f"safe output parent required: {output.parent}")

    cid = inspect_text(
        repo / "src/util/cid.ts",
        ["cidForJson", "stableStringify", "sha256"],
    )
    node_core = inspect_text(
        repo / "src/node_core.ts",
        [
            "void/blob.announce",
            "enqueueBlobFetch",
            "getBlob",
            "putBlob",
            "validateBlockForAppend",
        ],
    )
    world_core = inspect_text(
        repo / "src/game/void_realms_single_canonical_world_region_checkpoint_handoff_v1.ts",
        [
            "materializeVoidRealmsWorldManifestV1",
            "materializeVoidRealmsRegionCheckpointV1",
            "materializeVoidRealmsWorldCheckpointV1",
            "planVoidRealmsPlayerRegionHandoffV1",
            "materializeVoidRealmsReplicaAdvertisementV1",
        ],
    )
    luanti_mod = inspect_text(
        repo / "integrations/luanti/void_realms_world/init.lua",
        [
            'core.register_chatcommand("voidworld"',
            "publish_sanitized_status",
            "gameplay_authority = false",
        ],
    )

    luanti_bins = {
        name: shutil.which(name)
        for name in ("luanti", "luantiserver", "minetest", "minetestserver")
    }
    runtime_present = any(value is not None for value in luanti_bins.values())
    source_ready = all(
        item["all_observed"]
        for item in (cid, node_core, world_core, luanti_mod)
    )

    result = {
        "marker": MARKER,
        "version": 1,
        "status": (
            "source_contract_ready_for_private_single_region_plan"
            if source_ready
            else "source_contract_incomplete"
        ),
        "hostname": socket.gethostname(),
        "repo_realpath": str(repo),
        "luanti_runtime_present": runtime_present,
        "luanti_binaries": luanti_bins,
        "boundaries": {
            "content_addressing": cid,
            "node_public_object_transport": node_core,
            "single_world_contract": world_core,
            "luanti_status_surface": luanti_mod,
        },
        "next_gate": {
            "upstream_download_authorized": False,
            "package_install_authorized": False,
            "world_creation_authorized": False,
            "server_start_authorized": False,
            "listener_start_authorized": False,
            "external_connection_authorized": False,
            "checkpoint_signing_authorized": False,
            "gameplay_mutation_authorized": False,
            "deployment_authorized": False,
        },
        "authority": {
            "repo_write": False,
            "world_creation": False,
            "region_assignment": False,
            "checkpoint_signing": False,
            "handoff_acceptance": False,
            "gameplay_state_commit": False,
            "network_listener_start": False,
            "external_connection": False,
            "server_start": False,
            "deployment": False,
            "work_credit_write": False,
            "wallet_or_signer_access": False,
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
