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

MARKER = "VOID_REALMS_TRISCALE_ATOMIC_CONVERSION_HOST_READINESS_V1"
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

    triscale = inspect_text(
        repo / "src/game/void_realms_triscale_building_v1.ts",
        [
            "materializeVoidRealmsTriScaleBuildStateV1",
            "occupancyRootForPlacementsV1",
            "enumeratePlacementMicrocellKeysV1",
        ],
    )
    conversion = inspect_text(
        repo / "src/game/void_realms_triscale_atomic_subdivide_merge_v1.ts",
        [
            "planVoidRealmsTriScaleSubdivisionV1",
            "planVoidRealmsTriScaleMergeV1",
            "material_units_delta: 0",
            "transient_overlap_allowed: false",
        ],
    )
    luanti = inspect_text(
        repo / "integrations/luanti/void_realms_triscale_convert/init.lua",
        [
            "conversion_preview",
            "material_units_delta = 0",
            "occupancy_root_must_remain_equal = true",
            "world_mutation = false",
        ],
    )

    luanti_bins = {
        name: shutil.which(name)
        for name in ("luanti", "luantiserver", "minetest", "minetestserver")
    }
    source_ready = all(
        item["all_observed"] for item in (triscale, conversion, luanti)
    )

    result = {
        "marker": MARKER,
        "version": 1,
        "status": (
            "source_contract_ready_for_atomic_conversion_bridge_plan"
            if source_ready
            else "source_contract_incomplete"
        ),
        "hostname": socket.gethostname(),
        "repo_realpath": str(repo),
        "stacked_parent_commit": "86d448ca1e3ca40433a6660624026e7be3d627d8",
        "stacked_parent_pr": 952,
        "luanti_runtime_present": any(luanti_bins.values()),
        "luanti_binaries": luanti_bins,
        "boundaries": {
            "triscale_parent": triscale,
            "atomic_conversion_contract": conversion,
            "luanti_preview_adapter": luanti,
        },
        "conversion_math": {
            "standard_to_medium": 8,
            "standard_to_small": 64,
            "medium_to_small": 8,
            "material_units_delta": 0,
            "occupancy_root_must_remain_equal": True,
        },
        "next_gate": {
            "authoritative_bridge_implemented": False,
            "gameplay_state_commit_authorized": False,
            "world_mutation_authorized": False,
            "inventory_mutation_authorized": False,
            "server_start_authorized": False,
            "deployment_authorized": False,
        },
        "authority": {
            "repo_write": False,
            "world_mutation": False,
            "inventory_mutation": False,
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
