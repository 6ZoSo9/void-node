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
import errno
import hashlib
import json
import os
import pathlib
import signal
import stat
import struct
import subprocess
import tempfile
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
MARKER = _BOOTSTRAP_MARKER

BASE_HEAD = "e99772502c80fefafef3b6a836a408b66ddded76"
BUILDER_REL = "ops/precision/void_v7_source_release_full_history_reseal_v1.py"
BUILDER_BLOB = "030182d544a92cd6c67868fa4c4f3e83188e4249"
V4_REL = "ops/precision/void_buy_void_v7_protected_substrate_install_v4.py"
V4_BLOB = "94112afa2f805e0a6ce881a490c1c64e31e0413e"
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
PR_SET_NO_NEW_PRIVS = 38
PR_CAP_AMBIENT = 47
PR_CAP_AMBIENT_CLEAR_ALL = 4
LINUX_CAPABILITY_VERSION_3 = 0x20080522
SYS_CAPSET_X86_64 = 126
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
MAX_COPY_DEPTH = 128
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

class TerminationSignal(InstallError):
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

POSIX_ACL_XATTR_VERSION = 0x0002
POSIX_ACL_ACCESS_XATTR = "system.posix_acl_access"
POSIX_ACL_DEFAULT_XATTR = "system.posix_acl_default"
ACL_USER_OBJ = 0x01
ACL_USER = 0x02
ACL_GROUP_OBJ = 0x04
ACL_MASK = 0x10
ACL_OTHER = 0x20
ACL_UNDEFINED_ID = 0xFFFFFFFF

def _runtime_uid_read_acl_blob(owner_perm: int, runtime_perm: int) -> bytes:
    if owner_perm not in range(8) or runtime_perm not in range(8):
        raise InstallError("private_stage_acl_permission_invalid")
    entries = (
        (ACL_USER_OBJ, owner_perm, ACL_UNDEFINED_ID),
        (ACL_USER, runtime_perm, RUNTIME_UID),
        (ACL_GROUP_OBJ, 0, ACL_UNDEFINED_ID),
        (ACL_MASK, runtime_perm, ACL_UNDEFINED_ID),
        (ACL_OTHER, 0, ACL_UNDEFINED_ID),
    )
    return struct.pack("<I", POSIX_ACL_XATTR_VERSION) + b"".join(
        struct.pack("<HHI", tag, perm, ident) for tag, perm, ident in entries
    )

def _remove_default_acl_if_present_fd(fd: int, label: str) -> None:
    try:
        os.removexattr(fd, POSIX_ACL_DEFAULT_XATTR)
    except OSError as exc:
        if exc.errno != errno.ENODATA:
            raise InstallError(label + "_default_acl_remove_failed:" + str(exc.errno)) from exc

def _set_runtime_uid_read_acl_fd(
    fd: int,
    owner_perm: int,
    runtime_perm: int,
    label: str,
    *,
    directory: bool,
) -> None:
    st = os.fstat(fd)
    expected_private_mode = owner_perm << 6
    if (
        st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) != expected_private_mode
        or (directory and not stat.S_ISDIR(st.st_mode))
        or (not directory and not stat.S_ISREG(st.st_mode))
    ):
        raise InstallError(label + "_private_metadata_invalid")
    if directory:
        _remove_default_acl_if_present_fd(fd, label)
    blob = _runtime_uid_read_acl_blob(owner_perm, runtime_perm)
    try:
        os.setxattr(fd, POSIX_ACL_ACCESS_XATTR, blob)
    except (OSError, TypeError) as exc:
        raise InstallError(
            label + "_access_acl_set_failed:" + str(getattr(exc, "errno", "type"))
        ) from exc
    try:
        observed = os.getxattr(fd, POSIX_ACL_ACCESS_XATTR)
    except (OSError, TypeError) as exc:
        raise InstallError(
            label + "_access_acl_readback_failed:" + str(getattr(exc, "errno", "type"))
        ) from exc
    if observed != blob:
        raise InstallError(label + "_access_acl_readback_mismatch")
    after = os.fstat(fd)
    expected_acl_mode = (owner_perm << 6) | (runtime_perm << 3)
    if (
        after.st_uid != 0
        or after.st_gid != 0
        or stat.S_IMODE(after.st_mode) != expected_acl_mode
    ):
        raise InstallError(label + "_access_acl_mode_projection_invalid")
    os.fsync(fd)

def _verify_runtime_uid_read_acl_fd(
    fd: int,
    owner_perm: int,
    runtime_perm: int,
    label: str,
    *,
    directory: bool,
) -> None:
    st = os.fstat(fd)
    expected_acl_mode = (owner_perm << 6) | (runtime_perm << 3)
    if (
        st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) != expected_acl_mode
        or (directory and not stat.S_ISDIR(st.st_mode))
        or (not directory and not stat.S_ISREG(st.st_mode))
    ):
        raise InstallError(label + "_acl_metadata_invalid")
    expected = _runtime_uid_read_acl_blob(owner_perm, runtime_perm)
    try:
        observed = os.getxattr(fd, POSIX_ACL_ACCESS_XATTR)
    except (OSError, TypeError) as exc:
        raise InstallError(
            label + "_access_acl_missing:" + str(getattr(exc, "errno", "type"))
        ) from exc
    if observed != expected:
        raise InstallError(label + "_access_acl_mismatch")

def _remove_runtime_uid_read_acl_fd(
    fd: int,
    owner_perm: int,
    runtime_perm: int,
    label: str,
    *,
    directory: bool,
) -> None:
    _verify_runtime_uid_read_acl_fd(
        fd, owner_perm, runtime_perm, label, directory=directory
    )
    try:
        os.removexattr(fd, POSIX_ACL_ACCESS_XATTR)
    except (OSError, TypeError) as exc:
        raise InstallError(
            label + "_access_acl_remove_failed:" + str(getattr(exc, "errno", "type"))
        ) from exc
    try:
        os.getxattr(fd, POSIX_ACL_ACCESS_XATTR)
    except TypeError as exc:
        raise InstallError(label + "_access_acl_postremove_probe_failed:type") from exc
    except OSError as exc:
        if exc.errno != errno.ENODATA:
            raise InstallError(label + "_access_acl_postremove_probe_failed:" + str(exc.errno)) from exc
    else:
        raise InstallError(label + "_access_acl_postremove_still_present")

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
    git_leaf_paths = (
        git_dir / "HEAD",
        git_dir / "config",
        git_dir / "index",
        git_dir / "refs" / "heads" / "main",
        git_dir / "objects" / "pack" / next(n for n in packs if n.endswith(".pack")),
        git_dir / "objects" / "pack" / next(n for n in packs if n.endswith(".idx")),
    )
    for leaf in git_leaf_paths:
        st = leaf.lstat()
        if (
            not stat.S_ISREG(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_nlink != 1
            or st.st_uid != owner_uid
            or st.st_gid != owner_gid
            or stat.S_IMODE(st.st_mode) & 0o022
            or stat.S_IMODE(st.st_mode) & 0o111
        ):
            raise InstallError("git_regular_leaf_metadata_invalid:" + os.fspath(leaf))

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
    _git_run(root, "diff-index", "--cached", "--quiet", SOURCE_HEAD, "--")
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
    _git_run(root, "diff-index", "--cached", "--quiet", SOURCE_HEAD, "--")
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

def _revalidate_install_parent_after_stage(
    expected: tuple[tuple[str, int, int, int, int, int, int], ...]
) -> None:
    observed = _ancestor_custody(INSTALL_PARENT)
    if len(observed) != len(expected) or not expected:
        raise InstallError("install_parent_ancestor_shape_changed")
    for index, (before, after) in enumerate(zip(expected, observed)):
        if before[:6] != after[:6]:
            raise InstallError("install_parent_ancestor_identity_changed:" + before[0])
        if index == 0:
            if after[6] not in (before[6], before[6] + 1):
                raise InstallError("install_parent_stage_link_count_transition_invalid")
        elif after[6] != before[6]:
            raise InstallError("install_parent_ancestor_link_count_changed:" + before[0])

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

class _CapabilityHeader(ctypes.Structure):
    _fields_ = [
        ("version", ctypes.c_uint32),
        ("pid", ctypes.c_int),
    ]

class _CapabilityData(ctypes.Structure):
    _fields_ = [
        ("effective", ctypes.c_uint32),
        ("permitted", ctypes.c_uint32),
        ("inheritable", ctypes.c_uint32),
    ]

def _proc_self_status_security_fields() -> dict[str, str]:
    try:
        raw = pathlib.Path("/proc/self/status").read_bytes()
    except OSError as exc:
        raise InstallError("runtime_uid_child_status_unavailable") from exc
    if len(raw) > 256 * 1024:
        raise InstallError("runtime_uid_child_status_too_large")
    try:
        text = raw.decode("ascii", "strict")
    except UnicodeDecodeError as exc:
        raise InstallError("runtime_uid_child_status_not_ascii") from exc
    wanted = {
        "CapInh", "CapPrm", "CapEff", "CapAmb", "NoNewPrivs",
    }
    found: dict[str, str] = {}
    for line in text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        if key not in wanted:
            continue
        if key in found:
            raise InstallError("runtime_uid_child_status_field_duplicate:" + key)
        found[key] = value.strip()
    if set(found) != wanted:
        raise InstallError("runtime_uid_child_status_fields_missing")
    return found

def _clear_runtime_child_capabilities(
    libc: Any,
    prctl: Any,
) -> dict[str, str]:
    machine = os.uname().machine
    if machine != "x86_64":
        raise InstallError("runtime_uid_child_capset_arch_unsupported:" + machine)

    if prctl(PR_CAP_AMBIENT, PR_CAP_AMBIENT_CLEAR_ALL, 0, 0, 0) != 0:
        err = ctypes.get_errno()
        raise InstallError(
            "runtime_uid_child_ambient_clear_failed:"
            + str(err if err is not None else "unknown")
        )

    header = _CapabilityHeader(
        version=LINUX_CAPABILITY_VERSION_3,
        pid=0,
    )
    data = (_CapabilityData * 2)()
    syscall = getattr(libc, "syscall", None)
    if syscall is None:
        raise InstallError("runtime_uid_child_syscall_unavailable")
    syscall.restype = ctypes.c_long
    if syscall(
        SYS_CAPSET_X86_64,
        ctypes.byref(header),
        ctypes.byref(data),
    ) != 0:
        err = ctypes.get_errno()
        raise InstallError(
            "runtime_uid_child_capset_failed:"
            + str(err if err is not None else "unknown")
        )

    fields = _proc_self_status_security_fields()
    for key in ("CapInh", "CapPrm", "CapEff", "CapAmb"):
        value = fields[key]
        if not value or any(ch not in "0123456789abcdefABCDEF" for ch in value):
            raise InstallError("runtime_uid_child_capability_field_invalid:" + key)
        if int(value, 16) != 0:
            raise InstallError("runtime_uid_child_capability_not_zero:" + key)
    if fields["NoNewPrivs"] != "1":
        raise InstallError("runtime_uid_child_no_new_privs_status_invalid")
    return fields

def _drop_runtime_child_privileges() -> dict[str, str]:
    libc = ctypes.CDLL(None, use_errno=True)
    prctl = getattr(libc, "prctl", None)
    if prctl is None:
        raise InstallError("runtime_uid_child_prctl_unavailable")
    prctl.argtypes = [
        ctypes.c_int,
        ctypes.c_ulong,
        ctypes.c_ulong,
        ctypes.c_ulong,
        ctypes.c_ulong,
    ]
    prctl.restype = ctypes.c_int
    if prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0:
        err = ctypes.get_errno()
        raise InstallError(
            "runtime_uid_child_no_new_privs_failed:"
            + str(err if err is not None else "unknown")
        )
    os.setgroups([])
    os.setgid(RUNTIME_GID)
    os.setuid(RUNTIME_UID)
    if (
        os.getresuid() != (RUNTIME_UID, RUNTIME_UID, RUNTIME_UID)
        or os.getresgid() != (RUNTIME_GID, RUNTIME_GID, RUNTIME_GID)
        or os.getgroups() != []
    ):
        raise InstallError("runtime_uid_child_identity_drop_incomplete")
    return _clear_runtime_child_capabilities(libc, prctl)

def _runtime_uid_child_call(operation: str, expected_head: str = "") -> dict[str, Any]:
    if os.geteuid() != 0 or os.getuid() != 0:
        raise InstallError("root_required_for_runtime_uid_child")
    read_fd, write_fd = os.pipe()
    pid = os.fork()
    if pid == 0:
        try:
            os.close(read_fd)
            _drop_runtime_child_privileges()
            try:
                if operation == "collect_plan":
                    result: Any = collect_plan(expected_head)
                elif operation == "verify_stage_private":
                    if os.access(STAGE, os.W_OK, effective_ids=True):
                        raise InstallError("runtime_uid_private_stage_writable")
                    if not os.access(
                        STAGE, os.R_OK | os.X_OK, effective_ids=True
                    ):
                        raise InstallError("runtime_uid_private_stage_not_readable")
                    result = _verify_full_history_root(
                        STAGE, 0, 0, 0o750
                    )
                elif operation == "verify_stage":
                    if os.access(STAGE, os.W_OK, effective_ids=True):
                        raise InstallError("runtime_uid_final_stage_writable")
                    result = _verify_full_history_root(STAGE, 0, 0, 0o555)
                else:
                    raise InstallError("runtime_uid_child_operation_invalid")
                payload = json.dumps(
                    {"ok": True, "result": result},
                    sort_keys=True,
                    separators=(",", ":"),
                ).encode("utf-8")
            except BaseException as exc:
                payload = json.dumps(
                    {
                        "ok": False,
                        "error": type(exc).__name__ + ":" + str(exc),
                    },
                    sort_keys=True,
                    separators=(",", ":"),
                ).encode("utf-8")
            if len(payload) > 8 * 1024 * 1024:
                os._exit(7)
            view = memoryview(payload)
            while view:
                wrote = os.write(write_fd, view)
                if wrote <= 0:
                    os._exit(8)
                view = view[wrote:]
            os.close(write_fd)
            os._exit(0)
        except BaseException:
            os._exit(9)

    os.close(write_fd)
    chunks: list[bytes] = []
    total = 0
    waited = False
    try:
        while True:
            part = os.read(read_fd, 64 * 1024)
            if not part:
                break
            total += len(part)
            if total > 8 * 1024 * 1024:
                raise InstallError("runtime_uid_child_output_too_large")
            chunks.append(part)
        waited_pid, status = os.waitpid(pid, 0)
        waited = True
        if (
            waited_pid != pid
            or not os.WIFEXITED(status)
            or os.WEXITSTATUS(status) != 0
        ):
            raise InstallError("runtime_uid_child_failed")
    except BaseException:
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        if not waited:
            try:
                os.waitpid(pid, 0)
            except ChildProcessError:
                pass
        raise
    finally:
        os.close(read_fd)

    try:
        envelope = json.loads(b"".join(chunks))
    except json.JSONDecodeError as exc:
        raise InstallError("runtime_uid_child_json_invalid") from exc
    if not isinstance(envelope, dict) or envelope.get("ok") is not True:
        raise InstallError(
            "runtime_uid_child_hold:" + str(envelope.get("error", "unknown"))
        )
    result = envelope.get("result")
    if not isinstance(result, dict):
        raise InstallError("runtime_uid_child_result_invalid")
    return result

def _collect_plan_for_apply(expected_head: str) -> dict[str, Any]:
    return _runtime_uid_child_call("collect_plan", expected_head)

def _verify_private_stage_for_apply(expected_content_sha256: str) -> dict[str, Any]:
    result = _runtime_uid_child_call("verify_stage_private")
    if result.get("content_sha256") != expected_content_sha256:
        raise InstallError("private_stage_git_verified_digest_mismatch")
    return result

def _verify_stage_for_apply(expected_content_sha256: str) -> dict[str, Any]:
    result = _runtime_uid_child_call("verify_stage")
    if result.get("content_sha256") != expected_content_sha256:
        raise InstallError("stage_content_digest_mismatch")
    return result

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
    print("apply_plan_runtime_uid_drop_required=true")
    print("runtime_uid_child_no_new_privs_required=true")
    print("runtime_uid_child_capability_clear_required=true")
    print("runtime_uid_child_capability_status_zero_required=true")
    print("candidate_copy_descriptor_relative=true")
    print("candidate_copy_incremental_enumeration_required=true")
    print("candidate_copy_iterative_depth_bound_required=true")
    print("apply_root_dynamic_git_exec=false")
    print("termination_signal_reconciliation_required=true")
    print("install_parent_publication_lease_required=true")
    print("git_index_head_equality_required=true")
    print("git_metadata_leaves_nonexecutable_required=true")
    print("private_stage_before_content_authentication=true")
    print("private_stage_git_verification_before_world_readable=true")
    print("private_stage_named_runtime_uid_acl_required=true")
    print("private_stage_acl_group_object_zero_required=true")
    print("runtime_uid_child_capability_clear_required=true")
    print("runtime_uid_child_capability_status_zero_required=true")
    print("candidate_copy_incremental_enumeration_required=true")
    print("candidate_copy_iterative_depth_bound_required=true")
    print("candidate_utf8_path_components_required=true")
    print("opened_generation_copy_budget_required=true")
    print("write_boundary_precedes_first_stage_mutation=true")
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
    if body["protected_state"] == "GREEN":
        next_action = "SEPARATELY_QUALIFY_FULL_HISTORY_PROTECTED_REPLICA_V1"
    elif body["protected_state"] == "READY":
        next_action = "SEPARATELY_AUTHORIZE_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY_APPLY"
    else:
        next_action = "HOLD_INSPECT_PROTECTED_REPLICA_STATE"
    print("next_action=" + next_action)

def _require_privileged_source_custody() -> None:
    if os.geteuid() != 0 or os.getuid() != 0:
        raise InstallError("root_required_for_privileged_apply")
    source_root = pathlib.Path(os.path.abspath(os.fspath(ROOT)))
    if source_root.resolve(strict=True) != source_root:
        raise InstallError("privileged_source_root_alias_forbidden")

    ancestors: list[tuple[pathlib.Path, tuple[int, int, int, int, int, int, int, int, int]]] = []
    current = source_root
    while True:
        st = current.lstat()
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or st.st_gid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
        ):
            raise InstallError("privileged_source_ancestor_custody_invalid:" + os.fspath(current))
        ancestors.append((current, _metadata_identity(st)))
        if current == current.parent:
            break
        current = current.parent

    for path, expected in ancestors:
        if _metadata_identity(path.lstat()) != expected:
            raise InstallError("privileged_source_ancestor_generation_changed:" + os.fspath(path))

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

    for path, expected in ancestors:
        if _metadata_identity(path.lstat()) != expected:
            raise InstallError("privileged_source_ancestor_generation_changed_terminal:" + os.fspath(path))

def _copy_regular_at(
    src_dir_fd: int,
    dst_dir_fd: int,
    name: str,
    expected_source: tuple[int, int, int, int, int, int, int, int, int],
    remaining_budget: int,
) -> int:
    before = os.stat(name, dir_fd=src_dir_fd, follow_symlinks=False)
    if _metadata_identity(before) != expected_source:
        raise InstallError("copy_source_generation_changed_before_open:" + name)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 0
        or before.st_size > MAX_FILE_BYTES
        or before.st_size > remaining_budget
    ):
        if before.st_size > remaining_budget:
            raise InstallError("copy_total_bytes_limit")
        raise InstallError("copy_source_regular_invalid:" + name)
    sfd = os.open(
        name,
        os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW,
        dir_fd=src_dir_fd,
    )
    dfd = None
    try:
        opened = os.fstat(sfd)
        if _metadata_identity(opened) != expected_source:
            raise InstallError("copy_source_rebound:" + name)
        dfd = os.open(
            name,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
            0o600,
            dir_fd=dst_dir_fd,
        )
        remaining = opened.st_size
        while remaining:
            part = os.read(sfd, min(COPY_CHUNK, remaining))
            if not part:
                raise InstallError("copy_source_short_read:" + name)
            view = memoryview(part)
            while view:
                wrote = os.write(dfd, view)
                if wrote <= 0:
                    raise InstallError("copy_destination_short_write:" + name)
                view = view[wrote:]
            remaining -= len(part)
        if os.read(sfd, 1):
            raise InstallError("copy_source_grew:" + name)
        after = os.fstat(sfd)
        visible = os.stat(name, dir_fd=src_dir_fd, follow_symlinks=False)
        if (
            _metadata_identity(after) != expected_source
            or _metadata_identity(visible) != expected_source
        ):
            raise InstallError("copy_source_changed:" + name)
        os.fchown(dfd, 0, 0)
        os.fchmod(
            dfd,
            0o500 if (stat.S_IMODE(opened.st_mode) & stat.S_IXUSR) else 0o400,
        )
        os.fsync(dfd)
        return opened.st_size
    finally:
        if dfd is not None:
            os.close(dfd)
        os.close(sfd)

def _prepare_private_stage_for_runtime_verification() -> None:
    pending: list[pathlib.Path] = [STAGE]
    directories: list[pathlib.Path] = []
    files: list[pathlib.Path] = []
    while pending:
        directory = pending.pop()
        directories.append(directory)
        for entry in os.scandir(directory):
            path = pathlib.Path(entry.path)
            st = path.lstat()
            if stat.S_ISLNK(st.st_mode):
                raise InstallError("stage_prepare_symlink_forbidden:" + os.fspath(path))
            if st.st_uid != 0 or st.st_gid != 0:
                raise InstallError("stage_prepare_owner_invalid:" + os.fspath(path))
            if stat.S_ISDIR(st.st_mode):
                pending.append(path)
            elif stat.S_ISREG(st.st_mode):
                files.append(path)
            else:
                raise InstallError("stage_prepare_kind_invalid:" + os.fspath(path))

    for path in files:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
        try:
            private_mode = stat.S_IMODE(os.fstat(fd).st_mode)
            if private_mode == 0o400:
                _set_runtime_uid_read_acl_fd(
                    fd, 0o4, 0o4, "stage_prepare_file", directory=False
                )
            elif private_mode == 0o500:
                _set_runtime_uid_read_acl_fd(
                    fd, 0o5, 0o5, "stage_prepare_exec", directory=False
                )
            else:
                raise InstallError(
                    "stage_prepare_private_file_mode_invalid:" + os.fspath(path)
                )
        finally:
            os.close(fd)

    for directory in sorted(directories, key=lambda p: len(p.parts), reverse=True):
        fd = os.open(
            directory,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        )
        try:
            if stat.S_IMODE(os.fstat(fd).st_mode) != 0o700:
                raise InstallError(
                    "stage_prepare_private_directory_mode_invalid:"
                    + os.fspath(directory)
                )
            _set_runtime_uid_read_acl_fd(
                fd, 0o7, 0o5, "stage_prepare_directory", directory=True
            )
        finally:
            os.close(fd)

def _seal_verified_stage_for_publication() -> None:
    pending: list[pathlib.Path] = [STAGE]
    directories: list[pathlib.Path] = []
    files: list[pathlib.Path] = []
    while pending:
        directory = pending.pop()
        directories.append(directory)
        for entry in os.scandir(directory):
            path = pathlib.Path(entry.path)
            st = path.lstat()
            if stat.S_ISLNK(st.st_mode):
                raise InstallError("stage_seal_symlink_forbidden:" + os.fspath(path))
            if st.st_uid != 0 or st.st_gid != 0:
                raise InstallError("stage_seal_owner_invalid:" + os.fspath(path))
            if stat.S_ISDIR(st.st_mode):
                pending.append(path)
            elif stat.S_ISREG(st.st_mode):
                files.append(path)
            else:
                raise InstallError("stage_seal_kind_invalid:" + os.fspath(path))

    for path in files:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
        try:
            verification_mode = stat.S_IMODE(os.fstat(fd).st_mode)
            if verification_mode == 0o440:
                _remove_runtime_uid_read_acl_fd(
                    fd, 0o4, 0o4, "stage_seal_file", directory=False
                )
                os.fchmod(fd, 0o444)
            elif verification_mode == 0o550:
                _remove_runtime_uid_read_acl_fd(
                    fd, 0o5, 0o5, "stage_seal_exec", directory=False
                )
                os.fchmod(fd, 0o555)
            else:
                raise InstallError(
                    "stage_seal_verification_file_mode_invalid:" + os.fspath(path)
                )
            os.fsync(fd)
        finally:
            os.close(fd)

    for directory in sorted(directories, key=lambda p: len(p.parts), reverse=True):
        fd = os.open(
            directory,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        )
        try:
            if stat.S_IMODE(os.fstat(fd).st_mode) != 0o750:
                raise InstallError(
                    "stage_seal_verification_directory_invalid:"
                    + os.fspath(directory)
                )
            _remove_runtime_uid_read_acl_fd(
                fd, 0o7, 0o5, "stage_seal_directory", directory=True
            )
            os.fchmod(fd, 0o555)
            os.fsync(fd)
        finally:
            os.close(fd)

_RECEIPT_LINE_SEPARATORS = frozenset(("\u0085", "\u2028", "\u2029"))

def _receipt_safe_text(value: str, limit: int = 500) -> str:
    out: list[str] = []
    for ch in value[:limit]:
        code = ord(ch)
        if code < 0x20 or code == 0x7F or ch in _RECEIPT_LINE_SEPARATORS:
            out.append("_")
        else:
            out.append(ch)
    return "".join(out)

def _require_utf8_copy_component(name: str) -> None:
    try:
        raw = name.encode("utf-8", "strict")
        roundtrip = raw.decode("utf-8", "strict")
    except UnicodeError as exc:
        raise InstallError("copy_entry_name_not_utf8") from exc
    if roundtrip != name or name in ("", ".", "..") or "/" in name:
        raise InstallError("copy_entry_name_invalid")
    if any(
        ord(ch) < 0x20
        or ord(ch) == 0x7F
        or ch in _RECEIPT_LINE_SEPARATORS
        for ch in name
    ):
        raise InstallError("copy_entry_name_control_forbidden")

def _copy_candidate_tree_iterative(
    src_root_fd: int,
    dst_root_fd: int,
    *,
    node_limit: int = MAX_NODES,
    depth_limit: int = MAX_COPY_DEPTH,
    total_limit: int = MAX_TOTAL_BYTES,
) -> tuple[int, int]:
    if node_limit < 1:
        raise InstallError("copy_node_limit_invalid")
    if depth_limit < 0:
        raise InstallError("copy_depth_limit_invalid")
    if total_limit < 0:
        raise InstallError("copy_total_bytes_limit_invalid")

    nodes = 0
    total = 0
    stack: list[dict[str, Any]] = []
    root_iter = os.scandir(src_root_fd)
    stack.append({
        "src_fd": src_root_fd,
        "dst_fd": dst_root_fd,
        "label": ".",
        "depth": 0,
        "source_before": _metadata_identity(os.fstat(src_root_fd)),
        "iterator": root_iter,
        "owned": False,
    })

    try:
        while stack:
            frame = stack[-1]
            iterator = frame["iterator"]
            try:
                entry = next(iterator)
            except StopIteration:
                iterator.close()
                frame["iterator"] = None
                if (
                    _metadata_identity(os.fstat(frame["src_fd"]))
                    != frame["source_before"]
                ):
                    raise InstallError(
                        "copy_source_directory_changed:" + frame["label"]
                    )
                if frame["owned"]:
                    os.fchown(frame["dst_fd"], 0, 0)
                    os.fchmod(frame["dst_fd"], 0o700)
                    os.fsync(frame["dst_fd"])
                    os.close(frame["dst_fd"])
                    frame["dst_fd"] = -1
                    os.close(frame["src_fd"])
                    frame["src_fd"] = -1
                stack.pop()
                continue

            # os.scandir(fd) yields one entry at a time. Charge the global
            # budget immediately; no directory-wide name list is retained.
            nodes += 1
            if nodes > node_limit:
                raise InstallError("copy_node_limit")
            name = entry.name
            _require_utf8_copy_component(name)

            st = os.stat(name, dir_fd=frame["src_fd"], follow_symlinks=False)
            child_label = frame["label"] + "/" + name
            if stat.S_ISLNK(st.st_mode):
                raise InstallError("copy_symlink_forbidden:" + child_label)

            if stat.S_ISDIR(st.st_mode):
                child_depth = frame["depth"] + 1
                if child_depth > depth_limit:
                    raise InstallError("copy_depth_limit")

                child_src = -1
                child_dst = -1
                child_iter: Any = None
                transferred = False
                try:
                    child_src = os.open(
                        name,
                        os.O_RDONLY
                        | os.O_DIRECTORY
                        | os.O_CLOEXEC
                        | os.O_NOFOLLOW,
                        dir_fd=frame["src_fd"],
                    )
                    opened = os.fstat(child_src)
                    if _metadata_identity(opened) != _metadata_identity(st):
                        raise InstallError(
                            "copy_source_directory_rebound:" + child_label
                        )
                    os.mkdir(name, 0o700, dir_fd=frame["dst_fd"])
                    child_dst = os.open(
                        name,
                        os.O_RDONLY
                        | os.O_DIRECTORY
                        | os.O_CLOEXEC
                        | os.O_NOFOLLOW,
                        dir_fd=frame["dst_fd"],
                    )
                    os.fchown(child_dst, 0, 0)
                    os.fchmod(child_dst, 0o700)
                    child_iter = os.scandir(child_src)
                    stack.append({
                        "src_fd": child_src,
                        "dst_fd": child_dst,
                        "label": child_label,
                        "depth": child_depth,
                        "source_before": _metadata_identity(opened),
                        "iterator": child_iter,
                        "owned": True,
                    })
                    transferred = True
                finally:
                    if not transferred:
                        if child_iter is not None:
                            child_iter.close()
                        if child_dst >= 0:
                            os.close(child_dst)
                        if child_src >= 0:
                            os.close(child_src)
                continue

            if stat.S_ISREG(st.st_mode):
                copied = _copy_regular_at(
                    frame["src_fd"],
                    frame["dst_fd"],
                    name,
                    _metadata_identity(st),
                    total_limit - total,
                )
                total += copied
                if total > total_limit:
                    raise InstallError("copy_total_bytes_limit")
                continue

            raise InstallError("copy_kind_invalid:" + child_label)
    finally:
        for frame in reversed(stack):
            iterator = frame.get("iterator")
            if iterator is not None:
                try:
                    iterator.close()
                except OSError:
                    pass
            if frame.get("owned"):
                dst_fd = frame.get("dst_fd", -1)
                src_fd = frame.get("src_fd", -1)
                if isinstance(dst_fd, int) and dst_fd >= 0:
                    try:
                        os.close(dst_fd)
                    except OSError:
                        pass
                if isinstance(src_fd, int) and src_fd >= 0:
                    try:
                        os.close(src_fd)
                    except OSError:
                        pass

    return nodes, total

def _copy_candidate_to_stage(expected_candidate: dict[str, Any]) -> None:
    global _WRITE_BOUNDARY_ENTERED, _STAGE_RETAINED

    if STAGE.exists() or STAGE.is_symlink():
        raise InstallError("stage_preexisting")

    ancestors = _ancestor_custody(INSTALL_PARENT)
    candidate_before = CANDIDATE.lstat()
    if (
        not stat.S_ISDIR(candidate_before.st_mode)
        or stat.S_ISLNK(candidate_before.st_mode)
        or candidate_before.st_uid != RUNTIME_UID
        or candidate_before.st_gid != RUNTIME_GID
        or stat.S_IMODE(candidate_before.st_mode) != 0o700
    ):
        raise InstallError("copy_candidate_root_metadata_invalid")

    candidate_fd = os.open(
        CANDIDATE,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    parent_fd = os.open(
        INSTALL_PARENT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    stage_fd = -1
    try:
        if _metadata_identity(os.fstat(candidate_fd)) != _metadata_identity(candidate_before):
            raise InstallError("copy_candidate_root_rebound")
        parent_before = os.fstat(parent_fd)
        # Conservative truth boundary: from this point onward reconciliation
        # must inspect stage/target even if the first mutating syscall fails or
        # a catchable signal lands immediately after the kernel creates STAGE.
        _WRITE_BOUNDARY_ENTERED = True
        os.mkdir(STAGE_NAME, 0o700, dir_fd=parent_fd)
        _STAGE_RETAINED = True
        stage_fd = os.open(
            STAGE_NAME,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=parent_fd,
        )
        os.fchown(stage_fd, 0, 0)
        os.fchmod(stage_fd, 0o700)

        nodes, total = _copy_candidate_tree_iterative(
            candidate_fd,
            stage_fd,
            node_limit=MAX_NODES,
            depth_limit=MAX_COPY_DEPTH,
            total_limit=MAX_TOTAL_BYTES,
        )
        candidate_after = CANDIDATE.lstat()
        if (
            _metadata_identity(os.fstat(candidate_fd)) != _metadata_identity(candidate_before)
            or _metadata_identity(candidate_after) != _metadata_identity(candidate_before)
        ):
            raise InstallError("copy_candidate_root_generation_changed")

        os.fchown(stage_fd, 0, 0)
        os.fchmod(stage_fd, 0o700)
        os.fsync(stage_fd)

        private_digest, _private_nodes, _private_bytes = _content_digest(
            STAGE, 0, 0, 0o700
        )
        if private_digest != expected_candidate["content_sha256"]:
            raise InstallError("private_stage_content_digest_mismatch")

        # Do not expose copied bytes to world-readability until the exact
        # staged Git generation is authenticated under the runtime identity.
        # UID/GID 1000 receives read/search only on root-owned stage bytes it
        # already supplied; no write bit is granted.
        _prepare_private_stage_for_runtime_verification()
        private_verified = _verify_private_stage_for_apply(
            expected_candidate["content_sha256"]
        )
        if private_verified.get("content_sha256") != expected_candidate["content_sha256"]:
            raise InstallError("private_stage_git_binding_mismatch")

        _seal_verified_stage_for_publication()
        final_private_digest, _final_nodes, _final_bytes = _content_digest(
            STAGE, 0, 0, 0o555
        )
        if final_private_digest != expected_candidate["content_sha256"]:
            raise InstallError("sealed_stage_content_digest_mismatch")
        os.fsync(parent_fd)

        if _metadata_identity(os.fstat(parent_fd)) != _metadata_identity(parent_before):
            # Creating the stage legitimately changes parent timestamps/link count,
            # so only stable custody fields are compared below.
            after = os.fstat(parent_fd)
            if (
                after.st_dev != parent_before.st_dev
                or after.st_ino != parent_before.st_ino
                or after.st_uid != parent_before.st_uid
                or after.st_gid != parent_before.st_gid
                or stat.S_IMODE(after.st_mode) != stat.S_IMODE(parent_before.st_mode)
            ):
                raise InstallError("install_parent_identity_changed_during_stage")
    finally:
        if stage_fd >= 0:
            os.close(stage_fd)
        os.close(parent_fd)
        os.close(candidate_fd)

    _revalidate_install_parent_after_stage(ancestors)

    _verify_stage_for_apply(expected_candidate["content_sha256"])

def _rename_noreplace(
    expected_ancestors: tuple[tuple[str, int, int, int, int, int, int], ...]
) -> None:
    global _PUBLICATION, _STAGE_RETAINED
    _revalidate_install_parent_after_stage(expected_ancestors)
    libc = ctypes.CDLL(None, use_errno=True)
    fn = getattr(libc, "renameat2", None)
    if fn is None:
        raise InstallError("renameat2_unavailable")
    fn.argtypes = [
        ctypes.c_int, ctypes.c_char_p,
        ctypes.c_int, ctypes.c_char_p,
        ctypes.c_uint,
    ]
    fn.restype = ctypes.c_int
    parent_fd = os.open(
        INSTALL_PARENT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    try:
        row = expected_ancestors[0]
        opened = os.fstat(parent_fd)
        if (
            opened.st_dev,
            opened.st_ino,
            opened.st_uid,
            opened.st_gid,
            opened.st_mode,
        ) != row[1:6]:
            raise InstallError("install_parent_descriptor_identity_mismatch")
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
        after = os.fstat(parent_fd)
        if (
            after.st_dev,
            after.st_ino,
            after.st_uid,
            after.st_gid,
            after.st_mode,
        ) != row[1:6]:
            raise InstallError("install_parent_descriptor_generation_changed")
    finally:
        os.close(parent_fd)
    _revalidate_install_parent_after_stage(expected_ancestors)

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
    if (
        not expected_plan_id.startswith(PLAN_PREFIX)
        or len(expected_plan_id) != len(PLAN_PREFIX) + 64
        or any(ch not in "0123456789abcdef" for ch in expected_plan_id[len(PLAN_PREFIX):])
    ):
        raise InstallError("expected_plan_id_invalid")
    _require_privileged_source_custody()
    planned = _collect_plan_for_apply(expected_head)
    if planned["plan_id"] != expected_plan_id:
        raise InstallError("expected_plan_id_mismatch")
    raw_ancestors = planned["body"].get("install_parent_custody")
    if (
        not isinstance(raw_ancestors, list)
        or not raw_ancestors
        or any(not isinstance(row, list) or len(row) != 7 for row in raw_ancestors)
    ):
        raise InstallError("planned_install_parent_custody_invalid")
    planned_ancestors = tuple(tuple(row) for row in raw_ancestors)
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

    rebound = _collect_plan_for_apply(expected_head)
    if rebound["body"]["protected_state"] != "HOLD_STAGE_PRESENT":
        raise InstallError("stage_state_not_visible_before_publication")
    if not _same_binding(rebound["body"], planned["body"]):
        raise InstallError("plan_binding_changed_before_publication")
    stage = _verify_stage_for_apply(
        planned["body"]["candidate"]["content_sha256"]
    )

    _revalidate_install_parent_after_stage(planned_ancestors)
    _rename_noreplace(planned_ancestors)

    final = _collect_plan_for_apply(expected_head)
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

def _termination_signal_handler(signum: int, _frame: Any) -> None:
    raise TerminationSignal("termination_signal:" + str(signum))

def _install_termination_signal_handlers() -> None:
    signal.signal(signal.SIGTERM, _termination_signal_handler)
    signal.signal(signal.SIGHUP, _termination_signal_handler)
    signal.signal(signal.SIGQUIT, _termination_signal_handler)

def _reconcile_publication_receipt() -> None:
    global _PUBLICATION, _STAGE_RETAINED
    if not _WRITE_BOUNDARY_ENTERED:
        return
    target_exists = TARGET.exists() and not TARGET.is_symlink()
    stage_exists = STAGE.exists() and not STAGE.is_symlink()
    if target_exists and not stage_exists:
        _PUBLICATION = "true"
        _STAGE_RETAINED = False
    elif stage_exists and not target_exists:
        _PUBLICATION = "false"
        _STAGE_RETAINED = True
    else:
        _PUBLICATION = "unknown"
        _STAGE_RETAINED = stage_exists

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
    acl = _runtime_uid_read_acl_blob(0o7, 0o5)
    if len(acl) != 44:
        raise AssertionError("runtime_uid_acl_blob_size_invalid")
    version = struct.unpack_from("<I", acl, 0)[0]
    entries = tuple(
        struct.unpack_from("<HHI", acl, 4 + index * 8)
        for index in range(5)
    )
    if version != POSIX_ACL_XATTR_VERSION:
        raise AssertionError("runtime_uid_acl_version_invalid")
    if entries != (
        (ACL_USER_OBJ, 0o7, ACL_UNDEFINED_ID),
        (ACL_USER, 0o5, RUNTIME_UID),
        (ACL_GROUP_OBJ, 0, ACL_UNDEFINED_ID),
        (ACL_MASK, 0o5, ACL_UNDEFINED_ID),
        (ACL_OTHER, 0, ACL_UNDEFINED_ID),
    ):
        raise AssertionError("runtime_uid_acl_entries_invalid")
    try:
        _require_utf8_copy_component("\udcff")
    except InstallError as exc:
        if str(exc) != "copy_entry_name_not_utf8":
            raise
    else:
        raise AssertionError("invalid_utf8_copy_component_not_rejected")
    for unsafe_component in (
        "line\nbreak",
        "carriage\rreturn",
        "unit\x1fseparator",
        "delete\x7fchar",
        "nel\u0085separator",
        "unicode\u2028line",
        "unicode\u2029paragraph",
    ):
        try:
            _require_utf8_copy_component(unsafe_component)
        except InstallError as exc:
            if str(exc) != "copy_entry_name_control_forbidden":
                raise
        else:
            raise AssertionError("receipt_unsafe_copy_component_not_rejected")
    unsafe_reason = "prefix\rforged=true\u0085next\u2028third\u2029fourth\nlast"
    safe_reason = _receipt_safe_text(unsafe_reason)
    if any(
        ord(ch) < 0x20
        or ord(ch) == 0x7F
        or ch in _RECEIPT_LINE_SEPARATORS
        for ch in safe_reason
    ):
        raise AssertionError("receipt_reason_sanitizer_failed")
    with tempfile.TemporaryDirectory(prefix="void-v7-acl-self-test-") as acl_td:
        acl_path = pathlib.Path(acl_td) / "probe"
        acl_path.write_bytes(b"x")
        os.chmod(acl_path, 0o400)
        acl_fd = os.open(acl_path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
        try:
            acl_blob = _runtime_uid_read_acl_blob(0o4, 0o4)
            os.setxattr(acl_fd, POSIX_ACL_ACCESS_XATTR, acl_blob)
            if os.getxattr(acl_fd, POSIX_ACL_ACCESS_XATTR) != acl_blob:
                raise AssertionError("runtime_uid_acl_xattr_roundtrip_invalid")
            if stat.S_IMODE(os.fstat(acl_fd).st_mode) != 0o440:
                raise AssertionError("runtime_uid_acl_mode_projection_invalid")
            os.removexattr(acl_fd, POSIX_ACL_ACCESS_XATTR)
        finally:
            os.close(acl_fd)
    print("root_owned_immutable_stage_required=true")
    print("private_stage_named_runtime_uid_acl_required=true")
    print("private_stage_acl_xattr_roundtrip_required=true")
    print("private_stage_acl_group_object_zero_required=true")
    print("runtime_uid_child_capability_clear_required=true")
    print("runtime_uid_child_capability_status_zero_required=true")
    print("candidate_copy_incremental_enumeration_required=true")
    print("candidate_copy_iterative_depth_bound_required=true")
    print("candidate_utf8_path_components_required=true")
    print("candidate_receipt_safe_path_components_required=true")
    print("terminal_reason_line_sanitization_required=true")
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
    _install_termination_signal_handlers()
    apply(args.expected_head, args.expected_plan_id, args.confirm)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (
        InstallError,
        OSError,
        UnicodeError,
        subprocess.SubprocessError,
        KeyboardInterrupt,
    ) as exc:
        try:
            _reconcile_publication_receipt()
        except BaseException:
            globals()["_PUBLICATION"] = "unknown"
        print(MARKER)
        print("status=HOLD")
        print("reason=" + _receipt_safe_text(str(exc)))
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
