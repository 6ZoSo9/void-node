#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import socket
import stat
import subprocess
import sys
import urllib.parse
import urllib.request
from typing import Any

STATE_ROOT = Path("/home/zoso/.local/share/void-read-replica-v1")
RELEASES = STATE_ROOT / "releases"
CURRENT = STATE_ROOT / "current"
CURRENT_DISCOVERY = (
    CURRENT
    / "public-site/.well-known/void-agent-work.json"
)
PUBLIC_ECONOMIC_DESCRIPTOR = Path(
    "/home/zoso/.local/state/"
    "void-agent-public-economic-loop-v1/source/"
    "void-agent-work.json"
)

REPO = Path("/home/zoso/dev/void-node")
MIRROR = Path("/home/zoso/dev/void-first-contact-github-pages-v1")
PAID_WORK = Path(
    "/home/zoso/.local/state/void-ai-agent-paid-work-intake-v1/data"
)
PUBLIC_ECONOMIC_LOOP = Path(
    "/home/zoso/.local/state/"
    "void-agent-public-economic-loop-v1/agent-economic-loop"
)

SOURCE_SPECS = [
    ("public-site/work", MIRROR / "work", "tree"),
    (
        "public-site/work/agent-economic-loop",
        PUBLIC_ECONOMIC_LOOP,
        "json-tree",
    ),
    (
        "public-site/.well-known/void-agent-work.json",
        MIRROR / ".well-known/void-agent-work.json",
        "public-discovery",
    ),
    ("paid-work/submissions", PAID_WORK / "submissions", "json-tree"),
    ("paid-work/reviews", PAID_WORK / "reviews", "json-tree"),
    ("paid-work/entitlements", PAID_WORK / "entitlements", "json-tree"),
    ("wc", REPO / "data_a/wc_v1", "wc-jsonl"),
    ("datanet", REPO / "data_a/datanet_v1", "safe-tree"),
]

SENSITIVE_COMPONENT = re.compile(
    r"(?:^|[-_.])(?:private|secret|password|passwd|mnemonic|seed|keystore)(?:$|[-_.])",
    re.IGNORECASE,
)
SENSITIVE_SUFFIXES = {
    ".key", ".p12", ".pfx", ".jks", ".kdb", ".sqlite-wal",
}
SKIP_NAMES = {
    ".env", ".env.local", ".env.production", ".DS_Store",
}
SKIP_SUFFIXES = {
    ".lock", ".sock", ".tmp", ".swp", ".bak", ".pid",
}
PUBLIC_PEM_NAMES = {
    "public-key.pem",
    "service-public-key.pem",
}


class Hold(RuntimeError):
    pass


def now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def stamp() -> str:
    return now().strftime("%Y%m%dT%H%M%SZ")


def iso_now() -> str:
    return now().strftime("%Y-%m-%dT%H:%M:%SZ")


def run(argv: list[str], timeout: int = 120) -> dict[str, Any]:
    try:
        completed = subprocess.run(
            argv,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
            check=False,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        return {
            "returncode": completed.returncode,
            "stdout": completed.stdout.decode("utf-8", "replace"),
            "stderr": completed.stderr.decode("utf-8", "replace"),
        }
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout or b""
        stderr = exc.stderr or b""
        if isinstance(stdout, str):
            stdout = stdout.encode()
        if isinstance(stderr, str):
            stderr = stderr.encode()
        return {
            "returncode": 124,
            "stdout": stdout.decode("utf-8", "replace"),
            "stderr": stderr.decode("utf-8", "replace") + f"\nTIMEOUT after {timeout}s",
        }


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_relative(relative: Path) -> bool:
    if relative.is_absolute():
        return False
    for part in relative.parts:
        if part in {"", ".", ".."}:
            return False
        if part in SKIP_NAMES:
            return False
        if part.startswith(".") and part != ".well-known":
            return False
        if SENSITIVE_COMPONENT.search(part):
            return False
    name = relative.name
    suffix = relative.suffix.lower()
    if suffix in SKIP_SUFFIXES or suffix in SENSITIVE_SUFFIXES:
        return False
    if suffix == ".pem" and name not in PUBLIC_PEM_NAMES:
        return False
    return True


def copy_file(source: Path, target: Path) -> dict[str, Any]:
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    target.chmod(0o444)
    return {
        "path": str(target),
        "bytes": target.stat().st_size,
        "sha256": sha256_file(target),
    }


def iter_files(root: Path):
    for current, dirs, names in os.walk(root):
        dirs[:] = sorted(
            directory
            for directory in dirs
            if safe_relative((Path(current) / directory).relative_to(root))
        )
        for name in sorted(names):
            path = Path(current) / name
            try:
                if not path.is_file():
                    continue
                relative = path.relative_to(root)
            except Exception:
                continue
            if safe_relative(relative):
                yield path, relative



def walk_values(value: Any):
    yield value
    if isinstance(value, dict):
        for item in value.values():
            yield from walk_values(item)
    elif isinstance(value, list):
        for item in value:
            yield from walk_values(item)


def valid_discovery_json(raw: bytes, source: str) -> dict[str, Any]:
    try:
        value = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise Hold(
            f"public discovery source returned invalid JSON: "
            f"source={source} error={exc}"
        )
    if not isinstance(value, dict):
        raise Hold(
            f"public discovery source is not a JSON object: {source}"
        )
    text = json.dumps(value, sort_keys=True).lower()
    if "void" not in text or "work" not in text:
        raise Hold(
            f"public discovery source lacks VOID work markers: {source}"
        )
    return value


def static_discovery_candidates() -> list[Path]:
    candidates = [
        PUBLIC_ECONOMIC_DESCRIPTOR,
        MIRROR / ".well-known/void-agent-work.json",
        MIRROR / "work/.well-known/void-agent-work.json",
        MIRROR / "work/void-agent-work.json",
        MIRROR / "work/void-agent-work-v1.json",
        MIRROR / "work/agent-work-v1.json",
        CURRENT_DISCOVERY,
    ]
    discovered = []
    if MIRROR.is_dir():
        for path in MIRROR.rglob("*.json"):
            name = path.name.lower()
            if (
                "agent" in name
                and "work" in name
                and path not in candidates
            ):
                discovered.append(path)
    return candidates + sorted(discovered)


def public_discovery_bases() -> list[str]:
    pointer = MIRROR / "work/live-v1.json"
    bases: list[str] = []
    if pointer.is_file():
        try:
            value = json.loads(
                pointer.read_text(encoding="utf-8")
            )
        except Exception:
            value = None
        if value is not None:
            for item in walk_values(value):
                if not (
                    isinstance(item, str)
                    and item.startswith("https://")
                ):
                    continue
                parsed = urllib.parse.urlparse(item)
                if not parsed.netloc:
                    continue
                base = urllib.parse.urlunparse(
                    (
                        parsed.scheme,
                        parsed.netloc,
                        "",
                        "",
                        "",
                        "",
                    )
                ).rstrip("/")
                if base not in bases:
                    bases.append(base)
    return bases


def descriptor_task_count(value: Any) -> int:
    found = set()
    for item in walk_values(value):
        if not isinstance(item, dict):
            continue
        identifier = None
        for key in (
            "task_id",
            "taskId",
            "work_id",
            "workId",
            "job_id",
            "jobId",
        ):
            candidate = item.get(key)
            if (
                isinstance(candidate, str)
                and candidate.strip()
            ):
                identifier = candidate.strip()
                break
        if not identifier:
            continue
        informative = any(
            key in item
            for key in (
                "title",
                "name",
                "description",
                "award_wc",
                "fixed_award_wc",
                "proof_requirements",
                "submission_schema",
                "operator_approval_required",
            )
        )
        if informative:
            found.add(identifier)
    return len(found)


def local_discovery_candidates() -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    seen: set[Path] = set()

    for path in static_discovery_candidates():
        try:
            resolved = path.resolve()
        except Exception:
            resolved = path
        if resolved in seen or not path.is_file():
            continue
        seen.add(resolved)

        raw = path.read_bytes()
        try:
            value = valid_discovery_json(
                raw,
                str(path),
            )
        except Hold:
            continue

        task_count = descriptor_task_count(value)

        found.append({
            "path": path,
            "raw": raw,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "task_count": task_count,
        })

    return found


def fetch_public_discovery() -> tuple[bytes, str]:
    local = local_discovery_candidates()
    if local:
        distinct = {
            item["sha256"]
            for item in local
        }
        if len(distinct) != 1:
            detail = [
                {
                    "path": str(item["path"]),
                    "sha256": item["sha256"],
                    "task_count": item["task_count"],
                }
                for item in local
            ]
            raise Hold(
                "valid local public-discovery candidates disagree: "
                + json.dumps(detail, sort_keys=True)
            )
        selected = local[0]
        return (
            selected["raw"],
            str(selected["path"]),
        )

    fetch_errors = []
    for base in public_discovery_bases():
        url = base + "/.well-known/void-agent-work.json"
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent":
                    "VOID-read-replica-publisher-v2/1.0"
            },
            method="GET",
        )
        try:
            with urllib.request.urlopen(
                request,
                timeout=12,
            ) as response:
                raw = response.read(2 * 1024 * 1024)
                if not (
                    200 <= int(response.status) < 300
                ):
                    raise Hold(
                        "public discovery HTTP status "
                        f"{response.status}: {url}"
                    )
                valid_discovery_json(raw, url)
                return raw, url
        except Exception as exc:
            fetch_errors.append(
                f"{url}: {type(exc).__name__}: {exc}"
            )

    raise Hold(
        "public discovery source unavailable; "
        + " | ".join(fetch_errors)
    )



def make_existing_release_ancestors_writable(
    release: Path,
    target: Path,
) -> list[tuple[Path, int]]:
    try:
        target.relative_to(release)
    except ValueError as exc:
        raise Hold(
            f"target is outside release root: {target}"
        ) from exc

    saved: list[tuple[Path, int]] = []
    current = target.parent

    while current != release:
        try:
            current.relative_to(release)
        except ValueError as exc:
            raise Hold(
                f"ancestor escaped release root: {current}"
            ) from exc

        if current.exists():
            if not current.is_dir():
                raise Hold(
                    f"release ancestor is not a directory: {current}"
                )
            mode = stat.S_IMODE(
                current.stat().st_mode
            )
            saved.append((current, mode))
            writable = mode | stat.S_IWUSR | stat.S_IXUSR
            if writable != mode:
                current.chmod(writable)

        current = current.parent

    return saved


def restore_release_ancestor_modes(
    saved: list[tuple[Path, int]],
) -> None:
    errors = []
    for path, mode in reversed(saved):
        try:
            if path.exists():
                path.chmod(mode)
        except Exception as exc:
            errors.append(
                f"{path}: {type(exc).__name__}: {exc}"
            )
    if errors:
        raise Hold(
            "could not restore release ancestor modes: "
            + " | ".join(errors)
        )


def copy_source(
    release: Path,
    destination: str,
    source: Path,
    mode: str,
) -> dict[str, Any]:
    target_root = release / destination
    result = {
        "destination": destination,
        "source": str(source),
        "mode": mode,
        "present": source.exists(),
        "files": 0,
        "bytes": 0,
        "skipped": 0,
    }

    if mode == "public-discovery":
        raw, origin = fetch_public_discovery()
        target_root.parent.mkdir(
            parents=True,
            exist_ok=True,
        )
        target_root.write_bytes(raw)
        target_root.chmod(0o444)
        result.update({
            "source": origin,
            "present": True,
            "files": 1,
            "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(),
        })
        return result

    if not source.exists():
        return result

    if mode == "file":
        if not source.is_file():
            raise Hold(f"expected file source: {source}")
        copied = copy_file(source, target_root)
        result["files"] = 1
        result["bytes"] = copied["bytes"]
        return result

    if not source.is_dir():
        raise Hold(f"expected directory source: {source}")

    saved_ancestor_modes = (
        make_existing_release_ancestors_writable(
            release,
            target_root,
        )
    )
    copy_error = None
    restore_error = None

    try:
        target_root.mkdir(parents=True, exist_ok=True)
        target_root.chmod(0o755)

        for path, relative in iter_files(source):
            if mode == "json-tree" and path.suffix.lower() != ".json":
                result["skipped"] += 1
                continue
            if mode == "wc-jsonl":
                if path.parent != source or path.suffix.lower() != ".jsonl":
                    result["skipped"] += 1
                    continue
            copied = copy_file(
                path,
                target_root / relative,
            )
            result["files"] += 1
            result["bytes"] += copied["bytes"]

        for current, directories, _names in os.walk(
            target_root,
            topdown=False,
        ):
            current_path = Path(current)
            for directory in directories:
                (current_path / directory).chmod(0o555)
            current_path.chmod(0o555)
    except Exception as exc:
        copy_error = exc
    finally:
        try:
            restore_release_ancestor_modes(
                saved_ancestor_modes
            )
        except Exception as exc:
            restore_error = exc

    if copy_error is not None:
        if restore_error is not None:
            raise Hold(
                "nested source copy and ancestor-mode "
                "restoration both failed: "
                f"copy={type(copy_error).__name__}: "
                f"{copy_error}; "
                f"restore={type(restore_error).__name__}: "
                f"{restore_error}"
            ) from copy_error
        raise copy_error

    if restore_error is not None:
        raise restore_error

    return result


def repository_state() -> dict[str, Any]:
    if not (REPO / ".git").exists():
        return {"present": False}
    def git(*args: str) -> str:
        result = run(["git", "-C", str(REPO), *args], timeout=40)
        if result["returncode"] != 0:
            raise Hold(
                f"git {' '.join(args)} failed: "
                f"{result['stderr'].strip() or result['stdout'].strip()}"
            )
        return result["stdout"].strip()

    head = git("rev-parse", "HEAD")
    branch = git("branch", "--show-current")
    remote = git(
        "rev-parse",
        "refs/remotes/origin/main",
    )
    status_result = run(
        [
            "git", "-C", str(REPO), "status",
            "--porcelain=v1", "-z", "--untracked-files=all",
        ],
        timeout=30,
    )
    dirty = [item for item in status_result["stdout"].split("\0") if item]
    return {
        "present": True,
        "head": head,
        "branch": branch,
        "remote_main_head": remote,
        "clean": not dirty,
        "exact_main": branch == "main" and head == remote and not dirty,
    }


def build_manifest(release: Path, source_summary: list[dict[str, Any]]) -> dict[str, Any]:
    rows = []
    files = []
    total_bytes = 0
    for current, dirs, names in os.walk(release):
        dirs.sort()
        names.sort()
        for name in names:
            path = Path(current) / name
            relative = path.relative_to(release)
            if relative.parts[0] == "meta":
                continue
            size = path.stat().st_size
            digest = sha256_file(path)
            total_bytes += size
            rows.append(f"{relative}\t{size}\t{digest}")
            files.append({
                "path": str(relative),
                "bytes": size,
                "sha256": digest,
            })
    rows.sort()
    files.sort(key=lambda item: item["path"])
    content_root = hashlib.sha256(
        ("\n".join(rows) + ("\n" if rows else "")).encode("utf-8")
    ).hexdigest()
    release_id = f"{stamp()}-{content_root[:16]}"
    return {
        "schema": "void-read-replica-release-v1",
        "release_id": release_id,
        "generated_at": iso_now(),
        "publisher_hostname": socket.gethostname(),
        "publisher_repo": repository_state(),
        "transport": "tailscale_ssh_rsync_v1",
        "integrity": "sha256_file_manifest_and_content_root_v1",
        "content_root_sha256": content_root,
        "file_count": len(files),
        "total_bytes": total_bytes,
        "source_summary": source_summary,
        "files": files,
        "authority": {
            "read_only_replica": True,
            "canonical_writer": False,
            "paid_work_writer": False,
            "wc_writer": False,
            "void_settlement": False,
            "wallet_transaction": False,
        },
    }


def verify_release(release: Path) -> dict[str, Any]:
    manifest_path = release / "meta/manifest-v1.json"
    if not manifest_path.is_file():
        raise Hold(f"manifest missing: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    rows = []
    for item in manifest.get("files", []):
        relative = Path(str(item.get("path") or ""))
        if not safe_relative(relative):
            raise Hold(f"unsafe manifest path: {relative}")
        path = release / relative
        if not path.is_file():
            raise Hold(f"manifest file missing: {relative}")
        size = path.stat().st_size
        digest = sha256_file(path)
        if size != item.get("bytes") or digest != item.get("sha256"):
            raise Hold(f"manifest mismatch: {relative}")
        rows.append(f"{relative}\t{size}\t{digest}")
    rows.sort()
    root = hashlib.sha256(
        ("\n".join(rows) + ("\n" if rows else "")).encode("utf-8")
    ).hexdigest()
    if root != manifest.get("content_root_sha256"):
        raise Hold(
            f"content root mismatch: "
            f"expected={manifest.get('content_root_sha256')} actual={root}"
        )
    return manifest


def atomic_symlink(target_name: str, link: Path) -> None:
    temporary = link.parent / f".{link.name}.tmp-{os.getpid()}"
    try:
        temporary.unlink()
    except FileNotFoundError:
        pass
    temporary.symlink_to(target_name)
    os.replace(temporary, link)



def retention_error(
    operation: str,
    path: Path,
    exc: BaseException,
) -> dict[str, str]:
    return {
        "operation": operation,
        "path": str(path),
        "error_type": type(exc).__name__,
        "error": str(exc),
    }


def direct_release_child(
    path: Path,
    releases_root: Path,
    *,
    allow_hidden: bool = False,
) -> None:
    if not path.is_absolute() or not releases_root.is_absolute():
        raise Hold("release paths must be absolute")
    if path.parent != releases_root:
        raise Hold(f"release is not a direct child: {path}")
    if path.name in {"", ".", ".."}:
        raise Hold(f"invalid release name: {path.name!r}")
    if path.name.startswith(".") and not allow_hidden:
        raise Hold(f"hidden release is not prunable: {path}")


def inspect_owned_release_tree(
    root: Path,
    releases_root: Path,
    *,
    expected_uid: int | None = None,
    expected_device: int | None = None,
    allow_hidden: bool = False,
) -> list[tuple[Path, int, int, int]]:
    """Return directory identity/mode rows after a no-symlink tree proof."""
    direct_release_child(
        root,
        releases_root,
        allow_hidden=allow_hidden,
    )
    uid = os.getuid() if expected_uid is None else expected_uid
    releases_state = releases_root.lstat()
    device = (
        releases_state.st_dev
        if expected_device is None
        else expected_device
    )
    if not stat.S_ISDIR(releases_state.st_mode):
        raise Hold(f"releases root is not a directory: {releases_root}")
    if releases_state.st_uid != uid:
        raise Hold(f"releases root is not publisher-owned: {releases_root}")
    if releases_state.st_dev != device:
        raise Hold(f"releases root device changed: {releases_root}")
    root_state = root.lstat()
    if stat.S_ISLNK(root_state.st_mode):
        raise Hold(f"release root is a symlink: {root}")
    if not stat.S_ISDIR(root_state.st_mode):
        raise Hold(f"release root is not a directory: {root}")
    if root_state.st_uid != uid:
        raise Hold(f"release root is not publisher-owned: {root}")
    if root_state.st_dev != device:
        raise Hold(f"release root changed device: {root}")

    directories: list[tuple[Path, int, int, int]] = []
    for current, child_directories, names in os.walk(
        root,
        topdown=True,
        followlinks=False,
    ):
        current_path = Path(current)
        entries = [current_path]
        entries.extend(current_path / name for name in child_directories)
        entries.extend(current_path / name for name in names)
        for path in entries:
            state = path.lstat()
            if stat.S_ISLNK(state.st_mode):
                raise Hold(f"symlink inside release tree: {path}")
            if state.st_uid != uid:
                raise Hold(f"foreign-owned release entry: {path}")
            if state.st_dev != device:
                raise Hold(f"cross-device release entry: {path}")
            if not (
                stat.S_ISDIR(state.st_mode)
                or stat.S_ISREG(state.st_mode)
            ):
                raise Hold(f"special file inside release tree: {path}")
        current_state = current_path.lstat()
        if not stat.S_ISDIR(current_state.st_mode):
            raise Hold(f"release tree entry is not a directory: {current_path}")
        directories.append((
            current_path,
            current_state.st_dev,
            current_state.st_ino,
            stat.S_IMODE(current_state.st_mode),
        ))
    return directories


def restore_directory_modes(
    rows: list[tuple[Path, int, int, int]],
) -> list[dict[str, str]]:
    errors = []
    for path, device, inode, mode in reversed(rows):
        try:
            state = path.lstat()
            if (
                stat.S_ISDIR(state.st_mode)
                and state.st_dev == device
                and state.st_ino == inode
            ):
                path.chmod(mode)
        except FileNotFoundError:
            continue
        except Exception as exc:
            errors.append(retention_error("restore_mode", path, exc))
    return errors


def remove_read_only_tree(
    root: Path,
    *,
    releases_root: Path | None = None,
    allow_hidden: bool = False,
) -> dict[str, Any]:
    """Delete one proven release tree without following or replacing links."""
    parent = RELEASES if releases_root is None else releases_root
    if not root.exists():
        return {"path": str(root), "removed": False, "already_absent": True}

    rows = inspect_owned_release_tree(
        root,
        parent,
        allow_hidden=allow_hidden,
    )
    changed: list[tuple[Path, int, int, int]] = []
    try:
        for path, device, inode, mode in rows:
            state = path.lstat()
            if (
                not stat.S_ISDIR(state.st_mode)
                or state.st_dev != device
                or state.st_ino != inode
            ):
                raise Hold(f"release directory identity changed: {path}")
            writable = mode | stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR
            if writable != mode:
                path.chmod(writable)
                changed.append((path, device, inode, mode))

        def onerror(_function, failed_path, exc_info):
            error = exc_info[1]
            if isinstance(error, FileNotFoundError):
                return
            raise error

        shutil.rmtree(root, onerror=onerror)
    except Exception:
        restore_directory_modes(changed)
        raise

    if root.exists() or root.is_symlink():
        restore_directory_modes(changed)
        raise Hold(f"release tree still exists after removal: {root}")
    return {
        "path": str(root),
        "removed": True,
        "directory_mode_change_count": len(changed),
    }


def current_release_target(releases_root: Path, current: Path) -> Path:
    releases_state = releases_root.lstat()
    if current.parent != releases_root.parent:
        raise Hold(f"current pointer is outside state root: {current}")
    current_state = current.lstat()
    if not stat.S_ISLNK(current_state.st_mode):
        raise Hold(f"current pointer is not a symlink: {current}")
    if current_state.st_uid != os.getuid():
        raise Hold(f"current pointer is not publisher-owned: {current}")
    if current_state.st_dev != releases_state.st_dev:
        raise Hold(f"current pointer changed device: {current}")
    raw_target = os.readlink(current)
    if Path(raw_target).is_absolute():
        raise Hold(f"current pointer target is absolute: {raw_target}")
    target = Path(os.path.abspath(current.parent / raw_target))
    direct_release_child(target, releases_root)
    target_state = target.lstat()
    if not stat.S_ISDIR(target_state.st_mode):
        raise Hold(f"current release target is not a directory: {target}")
    if target_state.st_uid != os.getuid():
        raise Hold(f"current release target is not publisher-owned: {target}")
    if target_state.st_dev != releases_state.st_dev:
        raise Hold(f"current release target changed device: {target}")
    return target


def acquire_publisher_lock(state_root: Path):
    lock_path = state_root / ".publisher.lock"
    root_state = state_root.lstat()
    if not stat.S_ISDIR(root_state.st_mode):
        raise Hold(f"state root is not a directory: {state_root}")
    if root_state.st_uid != os.getuid():
        raise Hold(f"state root is not publisher-owned: {state_root}")
    flags = os.O_RDWR | os.O_CREAT
    flags |= getattr(os, "O_CLOEXEC", 0)
    flags |= getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(lock_path, flags, 0o600)
    try:
        lock_state = os.fstat(descriptor)
        if not stat.S_ISREG(lock_state.st_mode):
            raise Hold(f"publisher lock is not a regular file: {lock_path}")
        if lock_state.st_uid != os.getuid():
            raise Hold(f"publisher lock is not publisher-owned: {lock_path}")
        if lock_state.st_dev != root_state.st_dev:
            raise Hold(f"publisher lock changed device: {lock_path}")
        os.fchmod(descriptor, 0o600)
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise Hold("another read-replica publisher is active") from exc
        return os.fdopen(descriptor, "r+", encoding="utf-8")
    except Exception:
        os.close(descriptor)
        raise


def _prune_releases(keep: int = 5) -> dict[str, Any]:
    if not isinstance(keep, int) or isinstance(keep, bool) or keep < 1:
        raise Hold(f"retention keep must be a positive integer: {keep!r}")

    current_target = current_release_target(RELEASES, CURRENT)
    candidates = []
    skipped = []
    for path in RELEASES.iterdir():
        if path.name.startswith("."):
            continue
        try:
            state = path.lstat()
            direct_release_child(path, RELEASES)
            if stat.S_ISLNK(state.st_mode):
                raise Hold(f"release candidate is a symlink: {path}")
            if not stat.S_ISDIR(state.st_mode):
                raise Hold(f"release candidate is not a directory: {path}")
            if state.st_uid != os.getuid():
                raise Hold(f"release candidate is not publisher-owned: {path}")
            if state.st_dev != RELEASES.lstat().st_dev:
                raise Hold(f"release candidate changed device: {path}")
            candidates.append((state.st_mtime_ns, path))
        except FileNotFoundError:
            continue
        except Exception as exc:
            skipped.append(retention_error("inventory", path, exc))

    releases = [
        path
        for _mtime, path in sorted(
            candidates,
            key=lambda item: (item[0], item[1].name),
            reverse=True,
        )
    ]
    if current_target not in releases:
        raise Hold("current release is absent from the retention inventory")

    protected = {current_target}
    for release in releases:
        if len(protected) >= keep:
            break
        protected.add(release)

    blocked = list(skipped)
    delete_candidates = [
        release for release in releases if release not in protected
    ]
    for release in delete_candidates:
        try:
            inspect_owned_release_tree(release, RELEASES)
        except FileNotFoundError:
            continue
        except Exception as exc:
            blocked.append(retention_error("preflight", release, exc))

    removed = []
    if not blocked:
        for release in delete_candidates:
            try:
                if current_release_target(RELEASES, CURRENT) != current_target:
                    raise Hold("current release changed during retention")
                removed.append(remove_read_only_tree(release))
            except FileNotFoundError:
                continue
            except Exception as exc:
                blocked.append(retention_error("remove", release, exc))
                break

    return {
        "schema": "void-read-replica-retention-v1",
        "status": "degraded" if blocked else "ok",
        "keep": keep,
        "current_release": current_target.name,
        "inventory_count": len(releases),
        "protected_releases": sorted(path.name for path in protected),
        "removed": removed,
        "blocked": blocked,
        "publication_blocked": False,
    }


def prune_releases(keep: int = 5) -> dict[str, Any]:
    """Bound retention failures to housekeeping and return auditable state."""
    try:
        return _prune_releases(keep)
    except Exception as exc:
        return {
            "schema": "void-read-replica-retention-v1",
            "status": "degraded",
            "keep": keep,
            "current_release": None,
            "inventory_count": None,
            "protected_releases": [],
            "removed": [],
            "blocked": [retention_error("retention", RELEASES, exc)],
            "publication_blocked": False,
        }


def push_release(release: Path, remote: str) -> dict[str, Any]:
    release_id = release.name
    remote_root = "/home/zoso/.local/share/void-read-replica-v1"
    incoming = f"{remote_root}/incoming/{release_id}"
    rsync = run(
        [
            "rsync", "-a", "--delete",
            "--chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r",
            f"{release}/",
            f"{remote}:{incoming}/",
        ],
        timeout=300,
    )
    if rsync["returncode"] != 0:
        raise Hold(
            f"rsync to replica failed:\n"
            f"{rsync['stdout']}\n{rsync['stderr']}"
        )
    activate = run(
        [
            "ssh",
            "-o", "BatchMode=yes",
            "-o", "ConnectTimeout=8",
            remote,
            "/usr/bin/python3",
            "/home/zoso/.local/bin/activate_void_read_replica_release_v1.py",
            "--incoming", incoming,
            "--release-id", release_id,
        ],
        timeout=180,
    )
    if activate["returncode"] != 0:
        raise Hold(
            f"remote activation failed:\n"
            f"{activate['stdout']}\n{activate['stderr']}"
        )
    try:
        value = json.loads(activate["stdout"])
    except Exception as exc:
        raise Hold(f"remote activation returned non-JSON: {exc}")
    if value.get("release_id") != release_id or value.get("activated") is not True:
        raise Hold(f"remote activation result invalid: {value}")
    return {
        "remote": remote,
        "rsync_stdout": rsync["stdout"],
        "rsync_stderr": rsync["stderr"],
        "activation": value,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--push-to", default="")
    args = parser.parse_args()

    STATE_ROOT.mkdir(parents=True, exist_ok=True)
    RELEASES.mkdir(parents=True, exist_ok=True)
    publisher_lock = acquire_publisher_lock(STATE_ROOT)
    staging = RELEASES / f".staging-{stamp()}-{os.getpid()}"

    try:
        staging.mkdir(parents=True, exist_ok=False)
        staging.chmod(0o755)
        source_summary = [
            copy_source(staging, destination, source, mode)
            for destination, source, mode in SOURCE_SPECS
        ]
        required = {
            "public-site/work",
            "public-site/work/agent-economic-loop",
            "public-site/.well-known/void-agent-work.json",
            "paid-work/submissions",
            "paid-work/reviews",
            "paid-work/entitlements",
            "wc",
            "datanet",
        }
        present = {
            item["destination"]
            for item in source_summary
            if item["present"]
        }
        missing = sorted(required - present)
        if missing:
            raise Hold(f"required source roots missing: {missing}")

        meta = staging / "meta"
        meta.mkdir(parents=True, exist_ok=True)
        manifest = build_manifest(staging, source_summary)
        release_id = manifest["release_id"]
        manifest_path = meta / "manifest-v1.json"
        manifest_path.write_text(
            json.dumps(manifest, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        manifest_path.chmod(0o444)
        manifest_sha = sha256_file(manifest_path)
        (meta / "manifest-v1.json.sha256").write_text(
            f"{manifest_sha}  manifest-v1.json\n",
            encoding="utf-8",
        )
        (meta / "manifest-v1.json.sha256").chmod(0o444)
        status = {
            "schema": "void-read-replica-status-v1",
            "release_id": release_id,
            "generated_at": manifest["generated_at"],
            "content_root_sha256": manifest["content_root_sha256"],
            "file_count": manifest["file_count"],
            "total_bytes": manifest["total_bytes"],
            "publisher_hostname": manifest["publisher_hostname"],
            "read_only_replica": True,
        }
        (meta / "status-v1.json").write_text(
            json.dumps(status, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        (meta / "status-v1.json").chmod(0o444)

        final = RELEASES / release_id
        if final.exists():
            remove_read_only_tree(staging, allow_hidden=True)
        else:
            os.replace(staging, final)
        verified = verify_release(final)
        atomic_symlink(f"releases/{release_id}", CURRENT)

        pushed = None
        if args.push_to:
            pushed = push_release(final, args.push_to)
        retention = prune_releases()

        print(json.dumps({
            "ok": True,
            "release_id": release_id,
            "release_path": str(final),
            "manifest_sha256": manifest_sha,
            "content_root_sha256": verified["content_root_sha256"],
            "file_count": verified["file_count"],
            "total_bytes": verified["total_bytes"],
            "push": pushed,
            "retention": retention,
            "retention_degraded": retention["status"] != "ok",
            "canonical_data_mutated": False,
            "paid_work_state_mutated": False,
        }, indent=2, sort_keys=True))
        return 0
    except Exception:
        if staging.exists():
            try:
                remove_read_only_tree(staging, allow_hidden=True)
            except Exception:
                pass
        raise
    finally:
        fcntl.flock(publisher_lock.fileno(), fcntl.LOCK_UN)
        publisher_lock.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Hold as exc:
        print(json.dumps({
            "ok": False,
            "hold": str(exc),
            "canonical_data_mutated": False,
            "paid_work_state_mutated": False,
        }, indent=2, sort_keys=True), file=sys.stderr)
        raise SystemExit(1)
