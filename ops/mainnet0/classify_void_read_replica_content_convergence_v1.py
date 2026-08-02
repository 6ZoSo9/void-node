#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


class Hold(RuntimeError):
    pass


def required_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise Hold(f"manifest field is missing or invalid: {field}")
    return value.strip()


def classify(
    local_manifest: dict[str, Any],
    remote_manifest: dict[str, Any],
) -> dict[str, Any]:
    local_release_id = required_text(
        local_manifest.get("release_id"),
        "local.release_id",
    )
    remote_release_id = required_text(
        remote_manifest.get("release_id"),
        "remote.release_id",
    )
    local_content_root = required_text(
        local_manifest.get("content_root_sha256"),
        "local.content_root_sha256",
    )
    remote_content_root = required_text(
        remote_manifest.get("content_root_sha256"),
        "remote.content_root_sha256",
    )

    content_converged = local_content_root == remote_content_root
    release_id_converged = local_release_id == remote_release_id

    return {
        "schema": "void-read-replica-content-convergence-v1",
        "status": (
            "content_converged"
            if content_converged
            else "content_diverged"
        ),
        "content_converged": content_converged,
        "release_id_converged": release_id_converged,
        "local_release_id": local_release_id,
        "remote_release_id": remote_release_id,
        "local_content_root_sha256": local_content_root,
        "remote_content_root_sha256": remote_content_root,
        "release_id_difference_is_metadata_only": (
            content_converged and not release_id_converged
        ),
        "safe_to_treat_replica_content_as_current": content_converged,
    }


def read_manifest(path: Path) -> dict[str, Any]:
    if not path.is_file() or path.is_symlink():
        raise Hold(f"manifest is not a safe regular file: {path}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise Hold(f"manifest is not a JSON object: {path}")
    return value


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--local-manifest", type=Path, required=True)
    parser.add_argument("--remote-manifest", type=Path, required=True)
    args = parser.parse_args()
    result = classify(
        read_manifest(args.local_manifest),
        read_manifest(args.remote_manifest),
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["content_converged"] else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Hold as exc:
        print(json.dumps({
            "ok": False,
            "hold": str(exc),
        }, indent=2, sort_keys=True))
        raise SystemExit(1)
