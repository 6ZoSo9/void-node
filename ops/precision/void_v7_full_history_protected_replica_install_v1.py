#!/usr/bin/env python3
# Source/CI generation for a create-only full-history V7 source replica.
# Privileged apply requires a separately root-custodied launcher/source tree.

import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_INSTALL_V1"
if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
    or _bootstrap_sys.flags.optimize != 0
    or not __debug__
):
    if __name__ == "__main__":
        print(_BOOTSTRAP_MARKER)
        print("status=HOLD")
        print("reason=python_isolated_unoptimized_mode_required")
        print("protected_filesystem_mutation=false")
        print("live_release_mutation=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_mode_required")

import argparse
import ctypes
import hashlib
import json
import os
import pathlib
import stat
import subprocess
import tempfile
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
MARKER = _BOOTSTRAP_MARKER

BASE_HEAD = "6011fc906a98cb005567f8dd1fa8a3ea184beb12"
BUILDER_REL = "ops/precision/void_v7_source_release_full_history_reseal_v1.py"
BUILDER_BLOB = "030182d544a92cd6c67868fa4c4f3e83188e4249"
V4_REL = "ops/precision/void_buy_void_v7_protected_substrate_install_v4.py"
V4_BLOB = "6e187a9a6e782df13ecd423fc80c82b759a8f6db"
ATOMIC_REL = "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_bootstrap_atomic_upgrade_v1.py"
ATOMIC_BLOB = "3fe1158a0fdf19fa4307c2a8122314b75ee36345"

SOURCE_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
SOURCE_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
SOURCE_PARENTS = (
    "5752b69a7253a44fd3fabe2964476174b3a80c40",
    "6b7fc90219676a96f5a2c34619e4cfdf3f002244",
)
REACHABLE_COMMITS = 17931

RUNTIME_UID = 1000
RUNTIME_GID = 1000
CANDIDATE = pathlib.Path("/home/zoso/Downloads/void-v7-full-history-candidate-6011fc")
LIVE_RELEASE = pathlib.Path("/opt/void-node-live/releases/" + SOURCE_HEAD)

INSTALL_PARENT = pathlib.Path("/opt")
TARGET_NAME = "void-v7-source-release-full-history-v1"
TARGET = INSTALL_PARENT / TARGET_NAME
STAGE_NAME = ".void-v7-source-release-full-history-v1.stage-v1"
STAGE = INSTALL_PARENT / STAGE_NAME

PLAN_SCHEMA = "void_v7_full_history_protected_replica_install_plan_v1"
PLAN_PREFIX = "voidv7fullhistoryreplicainstall1_"
CONFIRM_TOKEN = "INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY"

FIXED_GIT = "/usr/bin/git"
MAX_NODES = 250000
MAX_FILE_BYTES = 512 * 1024 * 1024
MAX_TOTAL_BYTES = 16 * 1024 * 1024 * 1024
COPY_CHUNK = 1024 * 1024
RENAME_NOREPLACE = 1

CANDIDATE_CONFIG = (
    "[core]\n"
    "\trepositoryformatversion = 0\n"
    "\tfilemode = true\n"
    "\tbare = false\n"
    "\tlogallrefupdates = true\n"
)

_WRITE_BOUNDARY_ENTERED = False
_PUBLICATION = "false"
_STAGE_RETAINED = False

class InstallError(RuntimeError):
    pass

def sha256_bytes(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw)
    return h.hexdigest()

def canonical(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("ascii")

def _metadata_identity(st: os.stat_result) -> tuple[int, int, int, int, int, int, int, int, int]:
    return (
        st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode, st.st_nlink,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )

def _git_env() -> dict[str, str]:
    return {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_ASKPASS": "/bin/false",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_PROTOCOL_FROM_USER": "0",
        "GIT_ALLOW_PROTOCOL": "",
        "GIT_PAGER": "",
    }

def _git_run(root: pathlib.Path, *args: str, allowed: tuple[int, ...] = (0,), timeout: int = 120) -> subprocess.CompletedProcess[bytes]:
    cp = subprocess.run(
        [
            FIXED_GIT,
            "-c", "safe.directory=" + os.fspath(root),
            "-c", "core.hooksPath=/dev/null",
            "-c", "core.fsmonitor=false",
            "-c", "core.untrackedCache=false",
            "-c", "submodule.recurse=false",
            "--no-replace-objects",
            "-C", os.fspath(root),
            *args,
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=_git_env(),
        timeout=timeout,
        check=False,
    )
    if cp.returncode not in allowed:
        raise InstallError("git_failed:" + (args[0] if args else "unknown"))
    if cp.returncode == 0 and cp.stderr:
        raise InstallError("git_stderr:" + (args[0] if args else "unknown"))
    return cp

def git_text(root: pathlib.Path, *args: str) -> str:
    try:
        return _git_run(root, *args).stdout.decode("utf-8", "strict").strip()
    except UnicodeDecodeError as exc:
        raise InstallError("git_output_not_utf8") from exc

def git_bytes(root: pathlib.Path, *args: str) -> bytes:
    return _git_run(root, *args).stdout

def git_ancestor(root: pathlib.Path, base: str, head: str) -> bool:
    cp = _git_run(root, "merge-base", "--is-ancestor", base, head, allowed=(0, 1))
    if cp.stdout or cp.stderr:
        raise InstallError("git_ancestor_output_invalid")
    return cp.returncode == 0

def verify_repository(expected_head: str) -> None:
    if len(expected_head) != 40 or any(ch not in "0123456789abcdef" for ch in expected_head):
        raise InstallError("expected_head_invalid")
    if git_text(ROOT, "rev-parse", "HEAD") != expected_head:
        raise InstallError("checkout_head_mismatch")
    if git_text(ROOT, "symbolic-ref", "--quiet", "--short", "HEAD") != "main":
        raise InstallError("checkout_branch_not_main")
    if git_text(ROOT, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise InstallError("checkout_not_clean")
    if git_text(ROOT, "rev-parse", "--is-shallow-repository") != "false":
        raise InstallError("checkout_shallow")
    if not git_ancestor(ROOT, BASE_HEAD, expected_head):
        raise InstallError("accepted_reseal_merge_not_ancestor")
    for rel, blob in {
        BUILDER_REL: BUILDER_BLOB,
        V4_REL: V4_BLOB,
        ATOMIC_REL: ATOMIC_BLOB,
    }.items():
        if git_text(ROOT, "rev-parse", "HEAD:" + rel) != blob:
            raise InstallError("dependency_blob_mismatch:" + rel)

def _read_regular_stable(path: pathlib.Path, label: str, maximum: int = MAX_FILE_BYTES) -> tuple[bytes, tuple[int, int, int, int, int, int, int, int, int]]:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 0
        or before.st_size > maximum
    ):
        raise InstallError(label + "_metadata_invalid:" + os.fspath(path))
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if _metadata_identity(opened) != _metadata_identity(before):
            raise InstallError(label + "_rebound:" + os.fspath(path))
        chunks: list[bytes] = []
        remaining = opened.st_size
        while remaining:
            part = os.read(fd, min(COPY_CHUNK, remaining))
            if not part:
                raise InstallError(label + "_short_read:" + os.fspath(path))
            chunks.append(part)
            remaining -= len(part)
        if os.read(fd, 1):
            raise InstallError(label + "_grew:" + os.fspath(path))
        after = os.fstat(fd)
        visible = path.lstat()
        if (
            _metadata_identity(after) != _metadata_identity(opened)
            or _metadata_identity(visible) != _metadata_identity(opened)
        ):
            raise InstallError(label + "_generation_changed:" + os.fspath(path))
        return b"".join(chunks), _metadata_identity(opened)
    finally:
        os.close(fd)

def _exact_candidate_git_layout(root: pathlib.Path, owner_uid: int, owner_gid: int) -> dict[str, str]:
    git_dir = root / ".git"
    if set(os.listdir(git_dir)) != {"HEAD", "config", "index", "info", "objects", "refs"}:
        raise InstallError("git_layout_invalid")
    if set(os.listdir(git_dir / "objects")) != {"info", "pack"}:
        raise InstallError("git_objects_layout_invalid")
    if os.listdir(git_dir / "objects" / "info"):
        raise InstallError("git_objects_info_not_empty")
    if os.listdir(git_dir / "info"):
        raise InstallError("git_info_not_empty")
    if set(os.listdir(git_dir / "refs")) != {"heads", "tags"}:
        raise InstallError("git_refs_layout_invalid")
    if set(os.listdir(git_dir / "refs" / "heads")) != {"main"}:
        raise InstallError("git_heads_layout_invalid")
    if os.listdir(git_dir / "refs" / "tags"):
        raise InstallError("git_tags_not_empty")
    packs = sorted(os.listdir(git_dir / "objects" / "pack"))
    if (
        len(packs) != 2
        or len([n for n in packs if n.endswith(".pack")]) != 1
        or len([n for n in packs if n.endswith(".idx")]) != 1
    ):
        raise InstallError("git_pack_layout_invalid")
    for p in (
        git_dir,
        git_dir / "objects",
        git_dir / "objects" / "info",
        git_dir / "objects" / "pack",
        git_dir / "info",
        git_dir / "refs",
        git_dir / "refs" / "heads",
        git_dir / "refs" / "tags",
    ):
        st = p.lstat()
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != owner_uid
            or st.st_gid != owner_gid
            or stat.S_IMODE(st.st_mode) & 0o022
        ):
            raise InstallError("git_directory_metadata_invalid:" + os.fspath(p))
    head, _ = _read_regular_stable(git_dir / "HEAD", "git_head", 256)
    config, _ = _read_regular_stable(git_dir / "config", "git_config", 4096)
    main_ref, _ = _read_regular_stable(git_dir / "refs" / "heads" / "main", "git_main_ref", 256)
    if head != b"ref: refs/heads/main\n":
        raise InstallError("git_head_content_invalid")
    if config.decode("utf-8", "strict") != CANDIDATE_CONFIG:
        raise InstallError("git_config_content_invalid")
    if main_ref != (SOURCE_HEAD + "\n").encode("ascii"):
        raise InstallError("git_main_ref_content_invalid")
    index, _ = _read_regular_stable(git_dir / "index", "git_index", MAX_FILE_BYTES)
    pack_name = next(n for n in packs if n.endswith(".pack"))
    idx_name = next(n for n in packs if n.endswith(".idx"))
    pack, _ = _read_regular_stable(git_dir / "objects" / "pack" / pack_name, "git_pack")
    idx, _ = _read_regular_stable(git_dir / "objects" / "pack" / idx_name, "git_pack_index")
    return {
        "config_sha256": sha256_bytes(config),
        "index_sha256": sha256_bytes(index),
        "pack_name": pack_name,
        "pack_sha256": sha256_bytes(pack),
        "pack_index_name": idx_name,
        "pack_index_sha256": sha256_bytes(idx),
    }

def _parse_tree_manifest(raw: bytes) -> dict[str, tuple[str, str]]:
    manifest: dict[str, tuple[str, str]] = {}
    for record in raw.split(b"\0"):
        if not record:
            continue
        try:
            meta, path_raw = record.split(b"\t", 1)
            mode_raw, type_raw, oid_raw = meta.split(b" ", 2)
            mode = mode_raw.decode("ascii")
            obj_type = type_raw.decode("ascii")
            oid = oid_raw.decode("ascii")
            rel = path_raw.decode("utf-8", "strict")
        except (ValueError, UnicodeDecodeError) as exc:
            raise InstallError("tree_manifest_parse_invalid") from exc
        parts = rel.split("/")
        if (
            mode not in ("100644", "100755")
            or obj_type != "blob"
            or len(oid) != 40
            or any(ch not in "0123456789abcdef" for ch in oid)
            or not rel
            or rel.startswith("/")
            or any(part in ("", ".", "..") for part in parts)
            or parts[0] == ".git"
            or rel in manifest
        ):
            raise InstallError("tree_manifest_entry_invalid:" + rel)
        manifest[rel] = (mode, oid)
    return manifest

def _verify_worktree(root: pathlib.Path) -> None:
    manifest = _parse_tree_manifest(
        git_bytes(root, "ls-tree", "-rz", "-r", "--full-tree", SOURCE_TREE)
    )
    expected_dirs: set[str] = set()
    for rel in manifest:
        parts = rel.split("/")
        for i in range(1, len(parts)):
            expected_dirs.add("/".join(parts[:i]))
    seen: set[str] = set()
    pending: list[tuple[pathlib.Path, str]] = [(root, "")]
    nodes = 0
    while pending:
        directory, prefix = pending.pop()
        for entry in sorted(os.scandir(directory), key=lambda e: e.name):
            if not prefix and entry.name == ".git":
                continue
            nodes += 1
            if nodes > MAX_NODES:
                raise InstallError("worktree_node_limit")
            child = directory / entry.name
            rel = entry.name if not prefix else prefix + "/" + entry.name
            st = child.lstat()
            if stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode):
                if rel not in expected_dirs:
                    raise InstallError("worktree_extra_directory:" + rel)
                pending.append((child, rel))
                continue
            expected = manifest.get(rel)
            if expected is None:
                raise InstallError("worktree_extra_path:" + rel)
            mode, oid = expected
            if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode):
                raise InstallError("worktree_nonregular:" + rel)
            actual_mode = "100755" if stat.S_IMODE(st.st_mode) & stat.S_IXUSR else "100644"
            if actual_mode != mode:
                raise InstallError("worktree_mode_mismatch:" + rel)
            raw, _ = _read_regular_stable(child, "worktree_file")
            if git_blob_sha1(raw) != oid:
                raise InstallError("worktree_blob_mismatch:" + rel)
            seen.add(rel)
    if seen != set(manifest):
        raise InstallError("worktree_missing_path")

def _content_digest(root: pathlib.Path, expected_uid: int, expected_gid: int, expected_root_mode: int | None) -> tuple[str, int, int]:
    root_abs = pathlib.Path(os.path.abspath(os.fspath(root)))
    if root_abs.resolve(strict=True) != root_abs:
        raise InstallError("tree_root_alias_forbidden")
    rst = root_abs.lstat()
    if (
        not stat.S_ISDIR(rst.st_mode)
        or stat.S_ISLNK(rst.st_mode)
        or rst.st_uid != expected_uid
        or rst.st_gid != expected_gid
        or (expected_root_mode is not None and stat.S_IMODE(rst.st_mode) != expected_root_mode)
    ):
        raise InstallError("tree_root_metadata_invalid")
    root_identity = _metadata_identity(rst)
    h = hashlib.sha256()
    nodes = 0
    total = 0
    pending: list[tuple[pathlib.Path, str]] = [(root_abs, "")]
    while pending:
        directory, prefix = pending.pop()
        before = directory.lstat()
        entries = sorted(os.scandir(directory), key=lambda e: e.name)
        after = directory.lstat()
        if _metadata_identity(before) != _metadata_identity(after):
            raise InstallError("tree_directory_changed:" + (prefix or "."))
        for entry in entries:
            nodes += 1
            if nodes > MAX_NODES:
                raise InstallError("tree_node_limit")
            child = directory / entry.name
            rel = entry.name if not prefix else prefix + "/" + entry.name
            st = child.lstat()
            if st.st_uid != expected_uid or st.st_gid != expected_gid:
                raise InstallError("tree_owner_invalid:" + rel)
            if stat.S_ISLNK(st.st_mode):
                raise InstallError("tree_symlink_forbidden:" + rel)
            if stat.S_ISDIR(st.st_mode):
                if stat.S_IMODE(st.st_mode) & 0o022:
                    raise InstallError("tree_directory_group_or_world_writable:" + rel)
                h.update(b"D\0" + rel.encode("utf-8") + b"\0")
                pending.append((child, rel))
            elif stat.S_ISREG(st.st_mode):
                if stat.S_IMODE(st.st_mode) & 0o022:
                    raise InstallError("tree_file_group_or_world_writable:" + rel)
                raw, _ = _read_regular_stable(child, "tree_file")
                total += len(raw)
                if total > MAX_TOTAL_BYTES:
                    raise InstallError("tree_total_bytes_limit")
                h.update(
                    b"F\0" + rel.encode("utf-8") + b"\0"
                    + str(len(raw)).encode("ascii") + b"\0"
                    + hashlib.sha256(raw).digest()
                )
            else:
                raise InstallError("tree_kind_invalid:" + rel)
    if _metadata_identity(root_abs.lstat()) != root_identity:
        raise InstallError("tree_root_generation_changed")
    return h.hexdigest(), nodes, total

def _verify_full_history_root(root: pathlib.Path, expected_uid: int, expected_gid: int, expected_root_mode: int | None) -> dict[str, Any]:
    if root.resolve(strict=True) != root:
        raise InstallError("full_root_alias_forbidden")
    git_identity = _exact_candidate_git_layout(root, expected_uid, expected_gid)
    if git_text(root, "rev-parse", "--is-shallow-repository") != "false":
        raise InstallError("full_root_shallow")
    if git_text(root, "rev-parse", "HEAD") != SOURCE_HEAD:
        raise InstallError("full_root_head_mismatch")
    if git_text(root, "rev-parse", "HEAD^{tree}") != SOURCE_TREE:
        raise InstallError("full_root_tree_mismatch")
    if git_text(root, "symbolic-ref", "--quiet", "--short", "HEAD") != "main":
        raise InstallError("full_root_branch_mismatch")
    raw_commit = git_text(root, "cat-file", "-p", SOURCE_HEAD)
    parents = tuple(line[7:] for line in raw_commit.splitlines() if line.startswith("parent "))
    if parents != SOURCE_PARENTS:
        raise InstallError("full_root_parent_set_mismatch")
    if int(git_text(root, "rev-list", "--count", SOURCE_HEAD)) != REACHABLE_COMMITS:
        raise InstallError("full_root_reachable_commit_count_mismatch")
    missing = git_text(root, "rev-list", "--objects", "--missing=print", SOURCE_HEAD)
    if any(line.startswith("?") for line in missing.splitlines()):
        raise InstallError("full_root_missing_object")
    fsck = _git_run(
        root, "fsck", "--full", "--strict", "--no-reflogs", "--no-progress", SOURCE_HEAD
    )
    if fsck.stdout or fsck.stderr:
        raise InstallError("full_root_fsck_output_nonempty")
    _verify_worktree(root)
    if git_text(root, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise InstallError("full_root_not_clean")
    digest, nodes, total = _content_digest(
        root, expected_uid, expected_gid, expected_root_mode
    )
    return {
        "path": os.fspath(root),
        "content_sha256": digest,
        "nodes": nodes,
        "regular_file_bytes": total,
        **git_identity,
    }

def verify_candidate() -> dict[str, Any]:
    if CANDIDATE != pathlib.Path(os.path.abspath(os.fspath(CANDIDATE))):
        raise InstallError("candidate_path_not_absolute_canonical")
    st = CANDIDATE.lstat()
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != RUNTIME_UID
        or st.st_gid != RUNTIME_GID
        or stat.S_IMODE(st.st_mode) != 0o700
    ):
        raise InstallError("candidate_root_metadata_invalid")
    return _verify_full_history_root(
        CANDIDATE, RUNTIME_UID, RUNTIME_GID, 0o700
    )

def _verify_live_shallow_release() -> dict[str, Any]:
    root = LIVE_RELEASE
    if root.resolve(strict=True) != root:
        raise InstallError("live_release_alias_forbidden")
    st = root.lstat()
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) != 0o555
    ):
        raise InstallError("live_release_root_metadata_invalid")
    shallow, _ = _read_regular_stable(root / ".git" / "shallow", "live_shallow", 256)
    if shallow != (SOURCE_HEAD + "\n").encode("ascii"):
        raise InstallError("live_shallow_content_mismatch")
    if git_text(root, "rev-parse", "--is-shallow-repository") != "true":
        raise InstallError("live_release_not_shallow")
    if git_text(root, "rev-parse", "HEAD") != SOURCE_HEAD:
        raise InstallError("live_release_head_mismatch")
    if git_text(root, "rev-parse", "HEAD^{tree}") != SOURCE_TREE:
        raise InstallError("live_release_tree_mismatch")
    if git_text(root, "symbolic-ref", "--quiet", "--short", "HEAD") != "main":
        raise InstallError("live_release_branch_mismatch")
    if git_text(root, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise InstallError("live_release_not_clean")
    for parent in SOURCE_PARENTS:
        cp = _git_run(root, "cat-file", "-e", parent + "^{commit}", allowed=(0, 1))
        if cp.returncode == 0:
            raise InstallError("live_release_parent_object_unexpectedly_present:" + parent)
    _verify_worktree(root)
    digest, nodes, total = _content_digest(root, 0, 0, 0o555)
    return {
        "path": os.fspath(root),
        "content_sha256": digest,
        "nodes": nodes,
        "regular_file_bytes": total,
        "shallow_sha256": sha256_bytes(shallow),
    }

def _ancestor_custody(path: pathlib.Path) -> tuple[tuple[str, int, int, int, int, int, int], ...]:
    rows: list[tuple[str, int, int, int, int, int, int]] = []
    current = path
    while True:
        st = current.lstat()
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or st.st_gid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
        ):
            raise InstallError("ancestor_custody_invalid:" + os.fspath(current))
        rows.append(
            (os.fspath(current), st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode, st.st_nlink)
        )
        if current == current.parent:
            break
        current = current.parent
    return tuple(rows)

def _target_state(candidate: dict[str, Any]) -> str:
    stage_present = STAGE.exists() or STAGE.is_symlink()
    target_present = TARGET.exists() or TARGET.is_symlink()
    if stage_present:
        return "HOLD_STAGE_PRESENT"
    if not target_present:
        return "READY"
    observed = _verify_full_history_root(TARGET, 0, 0, 0o555)
    if observed["content_sha256"] == candidate["content_sha256"]:
        return "GREEN"
    return "HOLD_TARGET_CONFLICT"

def collect_plan(expected_head: str) -> dict[str, Any]:
    verify_repository(expected_head)
    candidate = verify_candidate()
    live = _verify_live_shallow_release()
    ancestors = _ancestor_custody(INSTALL_PARENT)
    state = _target_state(candidate)
    body = {
        "schema": PLAN_SCHEMA,
        "version": 1,
        "expected_head": expected_head,
        "source_base_head": BASE_HEAD,
        "builder_blob": BUILDER_BLOB,
        "v4_blob": V4_BLOB,
        "atomic_reference_blob": ATOMIC_BLOB,
        "source_head": SOURCE_HEAD,
        "source_tree": SOURCE_TREE,
        "source_parents": list(SOURCE_PARENTS),
        "reachable_commits": REACHABLE_COMMITS,
        "candidate": candidate,
        "live_shallow_release": live,
        "install_parent_custody": [list(row) for row in ancestors],
        "target": os.fspath(TARGET),
        "stage": os.fspath(STAGE),
        "protected_state": state,
        "create_only": True,
        "live_release_mutation": False,
        "service_mutation": False,
        "credential_access": False,
        "signing": False,
        "transaction": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "funds_movement": False,
    }
    return {
        "body": body,
        "plan_id": PLAN_PREFIX + hashlib.sha256(canonical(body)).hexdigest(),
    }

def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("candidate_path=" + os.fspath(CANDIDATE))
    print("live_release_path=" + os.fspath(LIVE_RELEASE))
    print("protected_replica_target=" + os.fspath(TARGET))
    print("create_only=true")
    print("live_release_mutation=false")
    print("trusted_root_launcher_required=true")
    print("service_mutation=false")
    print("credential_access=false")
    print("transaction=false")
    print("funds_movement=false")

def plan(expected_head: str) -> None:
    result = collect_plan(expected_head)
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("plan_id=" + result["plan_id"])
    print("expected_head=" + expected_head)
    print("protected_state=" + body["protected_state"])
    print("candidate_content_sha256=" + body["candidate"]["content_sha256"])
    print("candidate_nodes=" + str(body["candidate"]["nodes"]))
    print("candidate_regular_file_bytes=" + str(body["candidate"]["regular_file_bytes"]))
    print("live_shallow_content_sha256=" + body["live_shallow_release"]["content_sha256"])
    print("source_head=" + SOURCE_HEAD)
    print("source_tree=" + SOURCE_TREE)
    print("reachable_commits=" + str(REACHABLE_COMMITS))
    print("create_only=true")
    print("filesystem_write=false")
    print("live_release_mutation=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")
    print(
        "next_action="
        + (
            "SEPARATELY_QUALIFY_FULL_HISTORY_PROTECTED_REPLICA_V1"
            if body["protected_state"] == "GREEN"
            else "SEPARATELY_AUTHORIZE_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY_APPLY"
        )
    )

def _require_privileged_source_custody() -> None:
    if os.geteuid() != 0 or os.getuid() != 0:
        raise InstallError("root_required_for_privileged_apply")
    source_root = pathlib.Path(os.path.abspath(os.fspath(ROOT)))
    if source_root.resolve(strict=True) != source_root:
        raise InstallError("privileged_source_root_alias_forbidden")
    pending = [source_root]
    checked = 0
    while pending:
        directory = pending.pop()
        st = directory.lstat()
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or st.st_gid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
        ):
            raise InstallError("privileged_source_directory_custody_invalid:" + os.fspath(directory))
        for entry in os.scandir(directory):
            checked += 1
            if checked > MAX_NODES:
                raise InstallError("privileged_source_node_limit")
            path = pathlib.Path(entry.path)
            pst = path.lstat()
            if pst.st_uid != 0 or pst.st_gid != 0:
                raise InstallError("privileged_source_owner_invalid:" + os.fspath(path))
            if stat.S_ISLNK(pst.st_mode):
                resolved = path.resolve(strict=True)
                if resolved != source_root and source_root not in resolved.parents:
                    raise InstallError("privileged_source_symlink_escape:" + os.fspath(path))
                continue
            if stat.S_IMODE(pst.st_mode) & 0o022:
                raise InstallError("privileged_source_writable:" + os.fspath(path))
            if stat.S_ISDIR(pst.st_mode):
                pending.append(path)
            elif not stat.S_ISREG(pst.st_mode):
                raise InstallError("privileged_source_kind_invalid:" + os.fspath(path))

def _copy_regular(src: pathlib.Path, dst: pathlib.Path, executable: bool) -> None:
    before = src.lstat()
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or before.st_nlink != 1:
        raise InstallError("copy_source_regular_invalid:" + os.fspath(src))
    sfd = os.open(src, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    dfd = None
    try:
        opened = os.fstat(sfd)
        if _metadata_identity(opened) != _metadata_identity(before):
            raise InstallError("copy_source_rebound:" + os.fspath(src))
        dfd = os.open(
            dst,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
            0o600,
        )
        remaining = opened.st_size
        while remaining:
            part = os.read(sfd, min(COPY_CHUNK, remaining))
            if not part:
                raise InstallError("copy_source_short_read:" + os.fspath(src))
            view = memoryview(part)
            while view:
                wrote = os.write(dfd, view)
                if wrote <= 0:
                    raise InstallError("copy_destination_short_write:" + os.fspath(dst))
                view = view[wrote:]
            remaining -= len(part)
        if os.read(sfd, 1):
            raise InstallError("copy_source_grew:" + os.fspath(src))
        after = os.fstat(sfd)
        visible = src.lstat()
        if (
            _metadata_identity(after) != _metadata_identity(opened)
            or _metadata_identity(visible) != _metadata_identity(opened)
        ):
            raise InstallError("copy_source_changed:" + os.fspath(src))
        os.fchown(dfd, 0, 0)
        os.fchmod(dfd, 0o555 if executable else 0o444)
        os.fsync(dfd)
    finally:
        if dfd is not None:
            os.close(dfd)
        os.close(sfd)

def _copy_candidate_to_stage(expected_candidate: dict[str, Any]) -> None:
    global _WRITE_BOUNDARY_ENTERED, _STAGE_RETAINED
    if STAGE.exists() or STAGE.is_symlink():
        raise InstallError("stage_preexisting")
    ancestors = _ancestor_custody(INSTALL_PARENT)
    STAGE.mkdir(mode=0o755)
    _WRITE_BOUNDARY_ENTERED = True
    _STAGE_RETAINED = True
    os.chown(STAGE, 0, 0)
    created_dirs: list[pathlib.Path] = [STAGE]
    nodes = 0
    total = 0

    def recurse(src_dir: pathlib.Path, dst_dir: pathlib.Path) -> None:
        nonlocal nodes, total
        before_dir = src_dir.lstat()
        for entry in sorted(os.scandir(src_dir), key=lambda e: e.name):
            nodes += 1
            if nodes > MAX_NODES:
                raise InstallError("copy_node_limit")
            src = src_dir / entry.name
            dst = dst_dir / entry.name
            st = src.lstat()
            if stat.S_ISLNK(st.st_mode):
                raise InstallError("copy_symlink_forbidden:" + os.fspath(src))
            if stat.S_ISDIR(st.st_mode):
                dst.mkdir(mode=0o755)
                os.chown(dst, 0, 0)
                created_dirs.append(dst)
                recurse(src, dst)
            elif stat.S_ISREG(st.st_mode):
                total += st.st_size
                if total > MAX_TOTAL_BYTES:
                    raise InstallError("copy_total_bytes_limit")
                _copy_regular(
                    src,
                    dst,
                    bool(stat.S_IMODE(st.st_mode) & stat.S_IXUSR),
                )
            else:
                raise InstallError("copy_kind_invalid:" + os.fspath(src))
        if _metadata_identity(src_dir.lstat()) != _metadata_identity(before_dir):
            raise InstallError("copy_source_directory_changed:" + os.fspath(src_dir))

    recurse(CANDIDATE, STAGE)
    for directory in sorted(created_dirs, key=lambda p: len(p.parts), reverse=True):
        os.chown(directory, 0, 0)
        os.chmod(directory, 0o555)
        fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    parent_fd = os.open(INSTALL_PARENT, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        os.fsync(parent_fd)
    finally:
        os.close(parent_fd)
    if _ancestor_custody(INSTALL_PARENT) != ancestors:
        raise InstallError("install_parent_generation_changed_during_stage")
    stage = _verify_full_history_root(STAGE, 0, 0, 0o555)
    if stage["content_sha256"] != expected_candidate["content_sha256"]:
        raise InstallError("stage_content_digest_mismatch")

def _rename_noreplace() -> None:
    global _PUBLICATION, _STAGE_RETAINED
    libc = ctypes.CDLL(None, use_errno=True)
    fn = getattr(libc, "renameat2", None)
    if fn is None:
        raise InstallError("renameat2_unavailable")
    fn.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    fn.restype = ctypes.c_int
    parent_fd = os.open(INSTALL_PARENT, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        if fn(
            parent_fd,
            STAGE_NAME.encode("ascii"),
            parent_fd,
            TARGET_NAME.encode("ascii"),
            RENAME_NOREPLACE,
        ) != 0:
            raise InstallError("rename_noreplace_failed:" + str(ctypes.get_errno()))
        _PUBLICATION = "true"
        _STAGE_RETAINED = False
        os.fsync(parent_fd)
    finally:
        os.close(parent_fd)

def _same_binding(now: dict[str, Any], planned: dict[str, Any]) -> bool:
    return (
        now["candidate"]["content_sha256"] == planned["candidate"]["content_sha256"]
        and now["candidate"]["config_sha256"] == planned["candidate"]["config_sha256"]
        and now["candidate"]["index_sha256"] == planned["candidate"]["index_sha256"]
        and now["candidate"]["pack_sha256"] == planned["candidate"]["pack_sha256"]
        and now["candidate"]["pack_index_sha256"] == planned["candidate"]["pack_index_sha256"]
        and now["live_shallow_release"]["content_sha256"]
        == planned["live_shallow_release"]["content_sha256"]
    )

def apply(expected_head: str, expected_plan_id: str, confirm: str) -> None:
    global _PUBLICATION
    print(MARKER)
    print("mode=apply")
    print("authority_boundary=PRE_MUTATION")
    print("protected_replica_mutation_possible=true")
    print("live_release_mutation=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("transaction=false")
    print("funds_movement=false")
    _bootstrap_sys.stdout.flush()

    if confirm != CONFIRM_TOKEN:
        raise InstallError("explicit_create_only_confirmation_required")
    if not expected_plan_id.startswith(PLAN_PREFIX):
        raise InstallError("expected_plan_id_invalid")
    _require_privileged_source_custody()
    planned = collect_plan(expected_head)
    if planned["plan_id"] != expected_plan_id:
        raise InstallError("expected_plan_id_mismatch")
    state = planned["body"]["protected_state"]
    if state == "GREEN":
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("protected_filesystem_mutation=false")
        print("live_release_mutation=false")
        return
    if state != "READY":
        raise InstallError("apply_state_not_ready:" + state)

    _copy_candidate_to_stage(planned["body"]["candidate"])

    rebound = collect_plan(expected_head)
    if rebound["body"]["protected_state"] != "HOLD_STAGE_PRESENT":
        raise InstallError("stage_state_not_visible_before_publication")
    if not _same_binding(rebound["body"], planned["body"]):
        raise InstallError("plan_binding_changed_before_publication")
    stage = _verify_full_history_root(STAGE, 0, 0, 0o555)
    if stage["content_sha256"] != planned["body"]["candidate"]["content_sha256"]:
        raise InstallError("stage_revalidation_failed")

    _rename_noreplace()

    final = collect_plan(expected_head)
    if final["body"]["protected_state"] != "GREEN":
        raise InstallError("final_protected_replica_not_green")
    if not _same_binding(final["body"], planned["body"]):
        raise InstallError("plan_binding_changed_after_publication")

    print(MARKER)
    print("mode=apply")
    print("status=PROTECTED_FULL_HISTORY_REPLICA_V1_GREEN")
    print("plan_id=" + expected_plan_id)
    print("publication=true")
    print("publication_state=create_only_rename_noreplace_verified")
    print("protected_replica_install_performed=true")
    print("live_release_mutation=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")
    print("next_action=SOURCE_REVIEW_V7_PROTECTED_SUBSTRATE_INSTALLER_FULL_HISTORY_REPLICA_BINDING")

def self_test() -> None:
    if len(SOURCE_PARENTS) != 2:
        raise AssertionError("source_parent_constant_count")
    if not PLAN_PREFIX.endswith("_"):
        raise AssertionError("plan_prefix_shape")
    libc = ctypes.CDLL(None)
    if getattr(libc, "renameat2", None) is None:
        raise AssertionError("renameat2_missing")
    with tempfile.TemporaryDirectory(prefix="void-v7-replica-install-self-test-") as td:
        p = pathlib.Path(td)
        (p / "a").mkdir()
        (p / "b").mkdir()
        (p / "a" / "x").write_text("a")
        fd = os.open(p, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
        try:
            fn = getattr(ctypes.CDLL(None, use_errno=True), "renameat2")
            fn.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
            fn.restype = ctypes.c_int
            if fn(fd, b"a", fd, b"c", RENAME_NOREPLACE) != 0:
                raise AssertionError("rename_noreplace_fixture_failed")
            if not (p / "c" / "x").is_file() or (p / "a").exists():
                raise AssertionError("rename_noreplace_fixture_state_invalid")
        finally:
            os.close(fd)
    print(MARKER + "_SELF_TEST_GREEN")
    print("create_only_target=true")
    print("live_release_mutation=false")
    print("full_history_candidate_reauthentication_required=true")
    print("live_shallow_runtime_cross_binding_required=true")
    print("root_owned_immutable_stage_required=true")
    print("rename_noreplace_publication_required=true")
    print("trusted_root_launcher_required=true")
    print("service_mutation=false")
    print("credential_access=false")
    print("transaction=false")
    print("funds_movement=false")

def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--expected-head", default="")
    parser.add_argument("--expected-plan-id", default="")
    parser.add_argument("--confirm", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if not args.expected_head:
        raise InstallError("expected_head_required")
    if args.plan:
        plan(args.expected_head)
        return 0
    if not args.expected_plan_id:
        raise InstallError("expected_plan_id_required")
    apply(args.expected_head, args.expected_plan_id, args.confirm)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (InstallError, OSError, subprocess.SubprocessError, KeyboardInterrupt) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc).replace("\n", "_")[:500])
        print("write_boundary_entered=" + str(_WRITE_BOUNDARY_ENTERED).lower())
        print("publication=" + _PUBLICATION)
        print("stage_retained_needs_inspection=" + str(_STAGE_RETAINED).lower())
        print("automatic_retry=false")
        print("live_release_mutation=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
