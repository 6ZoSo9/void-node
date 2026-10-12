#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from typing import Any

PRECISION = "zoso@100.122.245.125"
REMOTE_PUBLISHER = (
    "/home/zoso/.local/bin/"
    "publish_void_read_replica_snapshot_v1.py"
)
REMOTE_RELEASE_ROOT = (
    "/home/zoso/.local/share/"
    "void-read-replica-v1/releases"
)

LOCAL_ROOT = Path(
    "/home/zoso/.local/share/void-read-replica-v1"
)
LOCAL_INCOMING = LOCAL_ROOT / "incoming"
LOCAL_CURRENT = LOCAL_ROOT / "current"
LOCAL_ACTIVATOR = Path(
    "/home/zoso/.local/bin/"
    "activate_void_read_replica_release_v1.py"
)

SSH_OPTIONS = [
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=8",
    "-o", "ServerAliveInterval=4",
    "-o", "ServerAliveCountMax=2",
    "-o", "StrictHostKeyChecking=accept-new",
]


class Hold(RuntimeError):
    pass


def run(
    argv: list[str],
    *,
    timeout: int = 300,
) -> dict[str, Any]:
    try:
        completed = subprocess.run(
            argv,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
            check=False,
            env={
                **os.environ,
                "PYTHONDONTWRITEBYTECODE": "1",
            },
        )
        return {
            "argv": argv,
            "returncode": completed.returncode,
            "stdout": completed.stdout.decode(
                "utf-8",
                "replace",
            ),
            "stderr": completed.stderr.decode(
                "utf-8",
                "replace",
            ),
        }
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout or b""
        stderr = exc.stderr or b""
        if isinstance(stdout, str):
            stdout = stdout.encode()
        if isinstance(stderr, str):
            stderr = stderr.encode()
        return {
            "argv": argv,
            "returncode": 124,
            "stdout": stdout.decode("utf-8", "replace"),
            "stderr": stderr.decode("utf-8", "replace")
            + f"\nTIMEOUT after {timeout}s",
        }


def checked(
    argv: list[str],
    *,
    timeout: int = 300,
) -> dict[str, Any]:
    result = run(argv, timeout=timeout)
    if result["returncode"] != 0:
        raise Hold(
            f"command failed: {' '.join(argv)}\n"
            f"stdout:\n{result['stdout']}\n"
            f"stderr:\n{result['stderr']}"
        )
    return result


def read_current_manifest() -> dict[str, Any] | None:
    try:
        release = LOCAL_CURRENT.resolve()
    except Exception:
        return None
    path = release / "meta/manifest-v1.json"
    if not path.is_file():
        return None
    try:
        value = json.loads(
            path.read_text(encoding="utf-8")
        )
    except Exception:
        return None
    return value if isinstance(value, dict) else None



def make_tree_owner_writable(root: Path) -> None:
    if not root.exists():
        return
    for current, directories, names in os.walk(
        root,
        topdown=False,
        followlinks=False,
    ):
        current_path = Path(current)
        for name in names:
            path = current_path / name
            try:
                if path.is_symlink():
                    continue
                path.chmod(0o600)
            except FileNotFoundError:
                continue
        for directory in directories:
            path = current_path / directory
            try:
                if path.is_symlink():
                    continue
                path.chmod(0o700)
            except FileNotFoundError:
                continue
        try:
            current_path.chmod(0o700)
        except FileNotFoundError:
            continue


def remove_read_only_tree(root: Path) -> None:
    if not root.exists():
        return
    make_tree_owner_writable(root)
    shutil.rmtree(root)

def remote_publish() -> dict[str, Any]:
    command = [
        "ssh",
        *SSH_OPTIONS,
        PRECISION,
        "/usr/bin/python3",
        REMOTE_PUBLISHER,
    ]
    result = checked(command, timeout=900)
    try:
        value = json.loads(result["stdout"])
    except Exception as exc:
        raise Hold(
            f"remote publisher returned non-JSON: {exc}"
        )
    if value.get("ok") is not True:
        raise Hold(
            f"remote publisher did not report success: {value}"
        )
    required = (
        "release_id",
        "content_root_sha256",
        "manifest_sha256",
        "file_count",
        "total_bytes",
    )
    missing = [
        key for key in required
        if value.get(key) in (None, "")
    ]
    if missing:
        raise Hold(
            f"remote publisher result missing: {missing}"
        )
    return value


def pull_release(
    remote: dict[str, Any],
) -> dict[str, Any]:
    release_id = str(remote["release_id"])
    content_root = str(
        remote["content_root_sha256"]
    )
    current = read_current_manifest()
    if (
        current is not None
        and current.get("content_root_sha256")
        == content_root
    ):
        local_release_id = current.get("release_id")
        return {
            "skipped_same_content": True,
            "content_converged": True,
            "release_id_converged": (
                local_release_id == release_id
            ),
            "release_id": local_release_id,
            "local_release_id": local_release_id,
            "remote_release_id": release_id,
            "content_root_sha256": content_root,
            "activated": False,
            "rsync_performed": False,
        }

    LOCAL_INCOMING.mkdir(
        parents=True,
        exist_ok=True,
    )
    incoming = LOCAL_INCOMING / release_id
    if incoming.exists():
        remove_read_only_tree(incoming)
    incoming.mkdir(parents=True, exist_ok=False)

    remote_source = (
        f"{PRECISION}:{REMOTE_RELEASE_ROOT}/"
        f"{release_id}/"
    )
    command = [
        "rsync",
        "-a",
        "--delete",
        "--partial",
        "--human-readable",
        "-e",
        "ssh " + " ".join(SSH_OPTIONS),
    ]
    try:
        current_release = LOCAL_CURRENT.resolve()
    except Exception:
        current_release = None
    if current_release is not None:
        command.append(
            f"--link-dest={current_release}"
        )
    command.extend([
        remote_source,
        f"{incoming}/",
    ])

    rsync = run(command, timeout=900)
    if rsync["returncode"] != 0:
        make_tree_owner_writable(incoming)
        shutil.rmtree(incoming, ignore_errors=True)
        raise Hold(
            f"replica pull rsync failed:\n"
            f"{rsync['stdout']}\n{rsync['stderr']}"
        )

    activate = checked(
        [
            "/usr/bin/python3",
            str(LOCAL_ACTIVATOR),
            "--incoming", str(incoming),
            "--release-id", release_id,
        ],
        timeout=180,
    )
    try:
        activation = json.loads(
            activate["stdout"]
        )
    except Exception as exc:
        raise Hold(
            f"local activation returned non-JSON: {exc}"
        )
    if (
        activation.get("activated") is not True
        or activation.get("release_id") != release_id
        or activation.get("content_root_sha256")
        != content_root
    ):
        raise Hold(
            f"local activation result invalid: {activation}"
        )

    return {
        "skipped_same_content": False,
        "content_converged": True,
        "release_id_converged": True,
        "release_id": release_id,
        "local_release_id": release_id,
        "remote_release_id": release_id,
        "content_root_sha256": content_root,
        "activated": True,
        "rsync_performed": True,
        "rsync_stdout": rsync["stdout"],
        "rsync_stderr": rsync["stderr"],
        "activation": activation,
    }


def main() -> int:
    if not LOCAL_ACTIVATOR.is_file():
        raise Hold(
            f"local activator missing: {LOCAL_ACTIVATOR}"
        )
    remote = remote_publish()
    pulled = pull_release(remote)
    print(json.dumps({
        "ok": True,
        "replication_direction": "nimo_pull_from_precision_v1",
        "remote": remote,
        "pull": pulled,
        "canonical_source_mutated": False,
        "paid_work_source_mutated": False,
        "canonical_wc_ledger_mutated": False,
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Hold as exc:
        print(json.dumps({
            "ok": False,
            "hold": str(exc),
            "replication_direction":
                "nimo_pull_from_precision_v1",
            "canonical_source_mutated": False,
            "paid_work_source_mutated": False,
            "canonical_wc_ledger_mutated": False,
        }, indent=2, sort_keys=True), file=sys.stderr)
        raise SystemExit(1)
