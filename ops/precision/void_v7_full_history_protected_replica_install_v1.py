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
import collections
import ctypes
import errno
import hashlib
import json
import os
import pathlib
import signal
import stat
import struct
import tempfile
import zlib
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
MARKER = _BOOTSTRAP_MARKER

BASE_HEAD = "6a577bc61bd95524597e534b37a531c5b60ee7c1"
BUILDER_REL = "ops/precision/void_v7_source_release_full_history_reseal_v1.py"
BUILDER_BLOB = "030182d544a92cd6c67868fa4c4f3e83188e4249"
V4_REL = "ops/precision/void_buy_void_v7_protected_substrate_install_v4.py"
V4_BLOB = "4448acb51cbc15d845550a55cd11c38f4185a7b3"
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

MAX_NODES = 250000
MAX_PACKS = 64
MAX_PACK_CACHE_OBJECTS = 256
MAX_PACK_CACHE_BYTES = 64 * 1024 * 1024
MAX_PACK_DELTA_DEPTH = 128
MAX_INDEX_BYTES = 64 * 1024 * 1024
MAX_INDEX_EXTENSIONS = 64
MAX_INDEX_PATH_BYTES = 4096
PACK_IDX_MAGIC = b"\xfftOc"
MAX_COPY_DEPTH = 128
MAX_FILE_BYTES = 512 * 1024 * 1024
MAX_GIT_OBJECT_BYTES = 128 * 1024 * 1024
MAX_PACK_ENTRY_BYTES = MAX_GIT_OBJECT_BYTES + 2 * 1024 * 1024
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

def _direct_git_root(root: pathlib.Path, label: str) -> pathlib.Path:
    root_abs = pathlib.Path(os.path.abspath(os.fspath(root)))
    try:
        if root_abs.resolve(strict=True) != root_abs:
            raise InstallError(label + "_root_alias_forbidden")
    except OSError as exc:
        raise InstallError(label + "_root_unavailable") from exc
    git_dir = root_abs / ".git"
    st = git_dir.lstat()
    if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
        raise InstallError(label + "_git_dir_invalid")
    if git_dir.resolve(strict=True) != git_dir:
        raise InstallError(label + "_git_dir_alias_forbidden")
    objects = git_dir / "objects"
    ost = objects.lstat()
    if not stat.S_ISDIR(ost.st_mode) or stat.S_ISLNK(ost.st_mode):
        raise InstallError(label + "_objects_dir_invalid")
    if objects.resolve(strict=True) != objects:
        raise InstallError(label + "_objects_dir_alias_forbidden")
    for path in (
        git_dir / "commondir",
        git_dir / "config.worktree",
        git_dir / "info" / "grafts",
        git_dir / "objects" / "info" / "alternates",
        git_dir / "objects" / "info" / "http-alternates",
    ):
        if path.exists() or path.is_symlink():
            raise InstallError(label + "_git_indirection_forbidden:" + path.name)
    return git_dir

def _direct_main_ref(root: pathlib.Path, label: str) -> str:
    git_dir = _direct_git_root(root, label)
    head, head_id = _read_regular_stable(git_dir / "HEAD", label + "_head", 4096)
    if head != b"ref: refs/heads/main\n":
        raise InstallError(label + "_head_not_main")
    ref_path = git_dir / "refs" / "heads" / "main"
    ref, ref_id = _read_regular_stable(ref_path, label + "_main_ref", 4096)
    if (
        len(ref) != 41
        or not ref.endswith(b"\n")
        or any(ch not in b"0123456789abcdef" for ch in ref[:-1])
    ):
        raise InstallError(label + "_main_ref_invalid")
    head2, head_id2 = _read_regular_stable(git_dir / "HEAD", label + "_head_terminal", 4096)
    ref2, ref_id2 = _read_regular_stable(ref_path, label + "_main_ref_terminal", 4096)
    if head2 != head or head_id2 != head_id or ref2 != ref or ref_id2 != ref_id:
        raise InstallError(label + "_ref_generation_changed")
    return ref[:-1].decode("ascii")

def _direct_blob_identity(path: pathlib.Path, expected_blob: str, label: str) -> None:
    _size, _sha256, observed, _identity = _stream_regular_hashes_stable(
        path, label, git_blob=True
    )
    if observed != expected_blob:
        raise InstallError(label + "_blob_mismatch")

def _git_tree_oid_from_worktree(root: pathlib.Path, label: str) -> str:
    nodes = 0
    total = 0
    root_before = root.lstat()
    if not stat.S_ISDIR(root_before.st_mode) or stat.S_ISLNK(root_before.st_mode):
        raise InstallError(label + "_worktree_root_invalid")
    root_identity = _metadata_identity(root_before)

    def walk(directory: pathlib.Path, depth: int) -> str:
        nonlocal nodes, total
        if depth > MAX_COPY_DEPTH:
            raise InstallError(label + "_worktree_depth_limit")
        before = directory.lstat()
        if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
            raise InstallError(label + "_worktree_directory_invalid")
        directory_identity = _metadata_identity(before)
        names: list[str] = []
        with os.scandir(directory) as scan:
            for entry in scan:
                nodes += 1
                if nodes > MAX_NODES:
                    raise InstallError(label + "_worktree_node_limit")
                names.append(entry.name)
        rows: list[tuple[bytes, bytes]] = []
        for name in names:
            if directory == root and name == ".git":
                gst = (directory / name).lstat()
                if not stat.S_ISDIR(gst.st_mode) or stat.S_ISLNK(gst.st_mode):
                    raise InstallError(label + "_git_dir_generation_invalid")
                continue
            try:
                raw_name = os.fsencode(name)
                raw_name.decode("utf-8", "strict")
            except UnicodeError as exc:
                raise InstallError(label + "_worktree_name_not_utf8") from exc
            if not raw_name or b"/" in raw_name or b"\0" in raw_name:
                raise InstallError(label + "_worktree_name_invalid")
            child = directory / name
            st = child.lstat()
            identity = _metadata_identity(st)
            if stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode):
                oid = walk(child, depth + 1)
                mode = b"40000"
                sort_key = raw_name + b"/"
            elif stat.S_ISREG(st.st_mode) and not stat.S_ISLNK(st.st_mode):
                if st.st_size > MAX_FILE_BYTES:
                    raise InstallError(label + "_worktree_file_size_limit")
                total += st.st_size
                if total > MAX_TOTAL_BYTES:
                    raise InstallError(label + "_worktree_total_bytes_limit")
                _n, _sha, oid, _id = _stream_regular_hashes_stable(
                    child, label + "_worktree_blob", git_blob=True
                )
                if oid is None:
                    raise InstallError(label + "_worktree_blob_missing")
                mode = b"100755" if stat.S_IMODE(st.st_mode) & stat.S_IXUSR else b"100644"
                sort_key = raw_name + b"\0"
            elif stat.S_ISLNK(st.st_mode):
                target_raw = os.fsencode(os.readlink(child))
                if len(target_raw) > MAX_FILE_BYTES:
                    raise InstallError(label + "_worktree_symlink_size_limit")
                if _metadata_identity(child.lstat()) != identity:
                    raise InstallError(label + "_worktree_symlink_generation_changed")
                oid = git_blob_sha1(target_raw)
                mode = b"120000"
                sort_key = raw_name + b"\0"
            else:
                raise InstallError(label + "_worktree_kind_invalid")
            rows.append((sort_key, mode + b" " + raw_name + b"\0" + bytes.fromhex(oid)))
        if _metadata_identity(directory.lstat()) != directory_identity:
            raise InstallError(label + "_worktree_directory_generation_changed")
        body = b"".join(row for _key, row in sorted(rows, key=lambda item: item[0]))
        h = hashlib.sha1()
        h.update(b"tree " + str(len(body)).encode("ascii") + b"\0")
        h.update(body)
        return h.hexdigest()

    oid = walk(root, 0)
    if _metadata_identity(root.lstat()) != root_identity:
        raise InstallError(label + "_worktree_root_generation_changed")
    return oid

def verify_repository(expected_head: str, expected_tree: str) -> None:
    for value, label in ((expected_head, "expected_head"), (expected_tree, "expected_tree")):
        if len(value) != 40 or any(ch not in "0123456789abcdef" for ch in value):
            raise InstallError(label + "_invalid")
    if _direct_main_ref(ROOT, "checkout") != expected_head:
        raise InstallError("checkout_head_mismatch")
    if (ROOT / ".git" / "shallow").exists() or (ROOT / ".git" / "shallow").is_symlink():
        raise InstallError("checkout_shallow")
    if _git_tree_oid_from_worktree(ROOT, "checkout") != expected_tree:
        raise InstallError("checkout_tree_mismatch")
    for rel, blob in {
        BUILDER_REL: BUILDER_BLOB,
        V4_REL: V4_BLOB,
        ATOMIC_REL: ATOMIC_BLOB,
    }.items():
        _direct_blob_identity(ROOT / rel, blob, "dependency:" + rel)

def _read_regular_stable(
    path: pathlib.Path,
    label: str,
    maximum: int,
) -> tuple[bytes, tuple[int, int, int, int, int, int, int, int, int]]:
    # Byte-returning reads are intentionally restricted to tightly capped
    # metadata leaves. Large regular files must use _stream_regular_hashes_stable.
    if maximum < 0 or maximum > 64 * 1024:
        raise InstallError(label + "_byte_read_limit_too_large")
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
        raw = bytearray()
        remaining = opened.st_size
        while remaining:
            part = os.read(fd, min(COPY_CHUNK, remaining))
            if not part:
                raise InstallError(label + "_short_read:" + os.fspath(path))
            raw.extend(part)
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
        return bytes(raw), _metadata_identity(opened)
    finally:
        os.close(fd)

def _stream_regular_hashes_stable(
    path: pathlib.Path,
    label: str,
    maximum: int = MAX_FILE_BYTES,
    *,
    git_blob: bool,
) -> tuple[
    int,
    str,
    str | None,
    tuple[int, int, int, int, int, int, int, int, int],
]:
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
        opened_identity = _metadata_identity(opened)
        if opened_identity != _metadata_identity(before):
            raise InstallError(label + "_rebound:" + os.fspath(path))
        sha256 = hashlib.sha256()
        blob_sha1 = hashlib.sha1() if git_blob else None
        if blob_sha1 is not None:
            blob_sha1.update(
                b"blob " + str(opened.st_size).encode("ascii") + b"\0"
            )
        remaining = opened.st_size
        while remaining:
            part = os.read(fd, min(COPY_CHUNK, remaining))
            if not part:
                raise InstallError(label + "_short_read:" + os.fspath(path))
            sha256.update(part)
            if blob_sha1 is not None:
                blob_sha1.update(part)
            remaining -= len(part)
        if os.read(fd, 1):
            raise InstallError(label + "_grew:" + os.fspath(path))
        after = os.fstat(fd)
        visible = path.lstat()
        if (
            _metadata_identity(after) != opened_identity
            or _metadata_identity(visible) != opened_identity
        ):
            raise InstallError(label + "_generation_changed:" + os.fspath(path))
        return (
            opened.st_size,
            sha256.hexdigest(),
            blob_sha1.hexdigest() if blob_sha1 is not None else None,
            opened_identity,
        )
    finally:
        os.close(fd)

def _pread_exact(fd: int, offset: int, size: int, label: str) -> bytes:
    if offset < 0 or size < 0:
        raise InstallError(label + "_range_invalid")
    out = bytearray()
    while len(out) < size:
        part = os.pread(fd, size - len(out), offset + len(out))
        if not part:
            raise InstallError(label + "_short_read")
        out.extend(part)
    return bytes(out)

def _sha1_fd_prefix(fd: int, size: int, label: str) -> bytes:
    if size < 0:
        raise InstallError(label + "_size_invalid")
    h = hashlib.sha1()
    offset = 0
    while offset < size:
        part = os.pread(fd, min(COPY_CHUNK, size - offset), offset)
        if not part:
            raise InstallError(label + "_short_read")
        h.update(part)
        offset += len(part)
    return h.digest()

def _open_stable_regular(path: pathlib.Path, label: str, maximum: int) -> tuple[int, tuple[int, int, int, int, int, int, int, int, int]]:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 0
        or before.st_size > maximum
    ):
        raise InstallError(label + "_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    opened = os.fstat(fd)
    identity = _metadata_identity(opened)
    if identity != _metadata_identity(before):
        os.close(fd)
        raise InstallError(label + "_rebound")
    return fd, identity

def _apply_git_delta(base: bytes, delta: bytes, label: str) -> bytes:
    def varint(pos: int) -> tuple[int, int]:
        value = 0
        shift = 0
        while True:
            if pos >= len(delta) or shift > 63:
                raise InstallError(label + "_delta_varint_invalid")
            byte = delta[pos]
            pos += 1
            value |= (byte & 0x7f) << shift
            if not (byte & 0x80):
                return value, pos
            shift += 7

    base_size, pos = varint(0)
    result_size, pos = varint(pos)
    if base_size != len(base) or result_size > MAX_GIT_OBJECT_BYTES:
        raise InstallError(label + "_delta_size_invalid")
    out = bytearray()
    while pos < len(delta):
        op = delta[pos]
        pos += 1
        if op & 0x80:
            offset = 0
            size = 0
            if op & 0x01:
                if pos >= len(delta): raise InstallError(label + "_delta_copy_truncated")
                offset |= delta[pos]; pos += 1
            if op & 0x02:
                if pos >= len(delta): raise InstallError(label + "_delta_copy_truncated")
                offset |= delta[pos] << 8; pos += 1
            if op & 0x04:
                if pos >= len(delta): raise InstallError(label + "_delta_copy_truncated")
                offset |= delta[pos] << 16; pos += 1
            if op & 0x08:
                if pos >= len(delta): raise InstallError(label + "_delta_copy_truncated")
                offset |= delta[pos] << 24; pos += 1
            if op & 0x10:
                if pos >= len(delta): raise InstallError(label + "_delta_copy_truncated")
                size |= delta[pos]; pos += 1
            if op & 0x20:
                if pos >= len(delta): raise InstallError(label + "_delta_copy_truncated")
                size |= delta[pos] << 8; pos += 1
            if op & 0x40:
                if pos >= len(delta): raise InstallError(label + "_delta_copy_truncated")
                size |= delta[pos] << 16; pos += 1
            if size == 0:
                size = 0x10000
            if offset < 0 or size < 0 or offset + size > len(base):
                raise InstallError(label + "_delta_copy_range_invalid")
            out.extend(base[offset:offset + size])
        elif op:
            if pos + op > len(delta):
                raise InstallError(label + "_delta_insert_truncated")
            out.extend(delta[pos:pos + op])
            pos += op
        else:
            raise InstallError(label + "_delta_opcode_zero")
        if len(out) > result_size:
            raise InstallError(label + "_delta_result_overflow")
    if len(out) != result_size:
        raise InstallError(label + "_delta_result_size_mismatch")
    return bytes(out)

class _PackReader:
    def __init__(self, pack_path: pathlib.Path, idx_path: pathlib.Path, label: str):
        self.pack_path = pack_path
        self.idx_path = idx_path
        self.label = label
        self.pack_fd = -1
        self.idx_fd = -1
        self.cache: collections.OrderedDict[str, tuple[str, bytes]] = collections.OrderedDict()
        self.cache_bytes = 0
        try:
            self.pack_fd, self.pack_identity = _open_stable_regular(
                pack_path, label + "_pack", MAX_FILE_BYTES
            )
            self.idx_fd, self.idx_identity = _open_stable_regular(
                idx_path, label + "_idx", MAX_INDEX_BYTES
            )
            self._load_index()
        except BaseException:
            self.close()
            raise

    def close(self) -> None:
        if self.idx_fd >= 0:
            os.close(self.idx_fd)
            self.idx_fd = -1
        if self.pack_fd >= 0:
            os.close(self.pack_fd)
            self.pack_fd = -1

    def _load_index(self) -> None:
        pack_size = os.fstat(self.pack_fd).st_size
        idx_size = os.fstat(self.idx_fd).st_size
        if pack_size < 32 or idx_size < 8 + 1024 + 40:
            raise InstallError(self.label + "_pack_or_index_too_small")
        if _pread_exact(self.idx_fd, 0, 4, self.label + "_idx_magic") != PACK_IDX_MAGIC:
            raise InstallError(self.label + "_idx_magic_invalid")
        if struct.unpack(">I", _pread_exact(self.idx_fd, 4, 4, self.label + "_idx_version"))[0] != 2:
            raise InstallError(self.label + "_idx_version_invalid")
        fanout_raw = _pread_exact(self.idx_fd, 8, 1024, self.label + "_idx_fanout")
        fanout = list(struct.unpack(">256I", fanout_raw))
        if any(fanout[i] > fanout[i + 1] for i in range(255)):
            raise InstallError(self.label + "_idx_fanout_invalid")
        count = fanout[-1]
        if count <= 0 or count > MAX_NODES:
            raise InstallError(self.label + "_idx_object_count_invalid")
        names_off = 8 + 1024
        names_raw = _pread_exact(self.idx_fd, names_off, count * 20, self.label + "_idx_names")
        oids = [names_raw[i * 20:(i + 1) * 20] for i in range(count)]
        if any(oids[i] >= oids[i + 1] for i in range(count - 1)):
            raise InstallError(self.label + "_idx_names_not_strictly_sorted")
        cumulative = 0
        cursor = 0
        for byte in range(256):
            while cursor < count and oids[cursor][0] <= byte:
                cursor += 1
            cumulative = cursor
            if fanout[byte] != cumulative:
                raise InstallError(self.label + "_idx_fanout_name_mismatch")
        crc_off = names_off + count * 20
        crcs = struct.unpack(
            ">" + "I" * count,
            _pread_exact(self.idx_fd, crc_off, count * 4, self.label + "_idx_crc")
        )
        off_off = crc_off + count * 4
        off32 = struct.unpack(
            ">" + "I" * count,
            _pread_exact(self.idx_fd, off_off, count * 4, self.label + "_idx_offsets")
        )
        large_count = sum(1 for value in off32 if value & 0x80000000)
        large_off = off_off + count * 4
        expected_idx_size = large_off + large_count * 8 + 40
        if idx_size != expected_idx_size:
            raise InstallError(self.label + "_idx_size_invalid")
        large = ()
        if large_count:
            large = struct.unpack(
                ">" + "Q" * large_count,
                _pread_exact(self.idx_fd, large_off, large_count * 8, self.label + "_idx_large_offsets")
            )
        pack_checksum = _pread_exact(self.idx_fd, idx_size - 40, 20, self.label + "_idx_pack_checksum")
        idx_checksum = _pread_exact(self.idx_fd, idx_size - 20, 20, self.label + "_idx_checksum")
        if _sha1_fd_prefix(self.idx_fd, idx_size - 20, self.label + "_idx_sha1") != idx_checksum:
            raise InstallError(self.label + "_idx_checksum_mismatch")
        pack_trailer = _pread_exact(self.pack_fd, pack_size - 20, 20, self.label + "_pack_trailer")
        if pack_checksum != pack_trailer:
            raise InstallError(self.label + "_idx_pack_checksum_mismatch")
        if _sha1_fd_prefix(self.pack_fd, pack_size - 20, self.label + "_pack_sha1") != pack_trailer:
            raise InstallError(self.label + "_pack_checksum_mismatch")
        canonical_stem = "pack-" + pack_trailer.hex()
        if (
            self.pack_path.name != canonical_stem + ".pack"
            or self.idx_path.name != canonical_stem + ".idx"
        ):
            raise InstallError(self.label + "_pack_filename_digest_mismatch")
        header = _pread_exact(self.pack_fd, 0, 12, self.label + "_pack_header")
        if header[:4] != b"PACK":
            raise InstallError(self.label + "_pack_magic_invalid")
        version, pack_count = struct.unpack(">II", header[4:12])
        if version not in (2, 3) or pack_count != count:
            raise InstallError(self.label + "_pack_header_invalid")
        offsets: list[int] = []
        for raw in off32:
            if raw & 0x80000000:
                index = raw & 0x7fffffff
                if index >= large_count:
                    raise InstallError(self.label + "_idx_large_offset_index_invalid")
                value = int(large[index])
            else:
                value = int(raw)
            if value < 12 or value >= pack_size - 20:
                raise InstallError(self.label + "_pack_object_offset_invalid")
            offsets.append(value)
        if len(set(offsets)) != count:
            raise InstallError(self.label + "_pack_object_offset_duplicate")
        self.oids = tuple(oid.hex() for oid in oids)
        self.offset_by_oid = {self.oids[i]: offsets[i] for i in range(count)}
        self.crc_by_oid = {self.oids[i]: crcs[i] for i in range(count)}
        self.oid_by_offset = {offsets[i]: self.oids[i] for i in range(count)}
        ordered_offsets = sorted(offsets)
        self.end_by_offset = {
            ordered_offsets[i]: (
                ordered_offsets[i + 1] if i + 1 < len(ordered_offsets) else pack_size - 20
            )
            for i in range(len(ordered_offsets))
        }

    def contains(self, oid: str) -> bool:
        return oid in self.offset_by_oid

    def _cache_put(self, oid: str, value: tuple[str, bytes]) -> None:
        size = len(value[1])
        if size > 4 * 1024 * 1024:
            return
        prior = self.cache.pop(oid, None)
        if prior is not None:
            self.cache_bytes -= len(prior[1])
        self.cache[oid] = value
        self.cache_bytes += size
        self.cache.move_to_end(oid)
        while (
            len(self.cache) > MAX_PACK_CACHE_OBJECTS
            or self.cache_bytes > MAX_PACK_CACHE_BYTES
        ):
            _old_oid, old_value = self.cache.popitem(last=False)
            self.cache_bytes -= len(old_value[1])

    @staticmethod
    def _entry_span(offset: int, end: int, label: str) -> int:
        span = end - offset
        if span <= 0 or span > MAX_PACK_ENTRY_BYTES:
            raise InstallError(label + "_pack_entry_size_limit")
        return span

    def read_object(self, oid: str, stack: tuple[str, ...] = ()) -> tuple[str, bytes]:
        cached = self.cache.get(oid)
        if cached is not None:
            self.cache.move_to_end(oid)
            return cached
        if oid in stack or len(stack) >= MAX_PACK_DELTA_DEPTH:
            raise InstallError(self.label + "_delta_cycle_or_depth")
        offset = self.offset_by_oid.get(oid)
        if offset is None:
            raise InstallError(self.label + "_object_missing:" + oid)
        end = self.end_by_offset[offset]
        entry_size = self._entry_span(offset, end, self.label)
        entry = _pread_exact(self.pack_fd, offset, entry_size, self.label + "_pack_entry")
        if (zlib.crc32(entry) & 0xffffffff) != self.crc_by_oid[oid]:
            raise InstallError(self.label + "_pack_entry_crc_mismatch")
        pos = 0
        first = entry[pos]
        pos += 1
        obj_type = (first >> 4) & 0x07
        declared = first & 0x0f
        shift = 4
        byte = first
        while byte & 0x80:
            if pos >= len(entry) or shift > 63:
                raise InstallError(self.label + "_pack_header_invalid")
            byte = entry[pos]
            pos += 1
            declared |= (byte & 0x7f) << shift
            shift += 7
        base_oid = None
        base_offset = None
        if obj_type == 6:
            if pos >= len(entry):
                raise InstallError(self.label + "_ofs_delta_base_missing")
            byte = entry[pos]
            pos += 1
            distance = byte & 0x7f
            while byte & 0x80:
                if pos >= len(entry):
                    raise InstallError(self.label + "_ofs_delta_base_truncated")
                byte = entry[pos]
                pos += 1
                distance = ((distance + 1) << 7) | (byte & 0x7f)
            base_offset = offset - distance
            if base_offset not in self.oid_by_offset:
                raise InstallError(self.label + "_ofs_delta_base_offset_invalid")
            base_oid = self.oid_by_offset[base_offset]
        elif obj_type == 7:
            if pos + 20 > len(entry):
                raise InstallError(self.label + "_ref_delta_base_truncated")
            base_oid = entry[pos:pos + 20].hex()
            pos += 20
            if base_oid not in self.offset_by_oid:
                raise InstallError(self.label + "_thin_pack_forbidden")
        if declared > MAX_GIT_OBJECT_BYTES:
            raise InstallError(self.label + "_pack_object_size_limit")
        comp = entry[pos:]
        dec = zlib.decompressobj()
        raw = dec.decompress(comp, MAX_GIT_OBJECT_BYTES + 1)
        if (
            len(raw) > MAX_GIT_OBJECT_BYTES
            or dec.unconsumed_tail
            or not dec.eof
            or dec.unused_data
            or len(raw) != declared
        ):
            raise InstallError(self.label + "_pack_decompression_invalid")
        type_names = {1: "commit", 2: "tree", 3: "blob", 4: "tag"}
        if obj_type in type_names:
            type_name = type_names[obj_type]
            data = raw
        elif obj_type in (6, 7):
            if base_oid is None:
                raise InstallError(self.label + "_delta_base_missing")
            base_type, base = self.read_object(base_oid, stack + (oid,))
            type_name = base_type
            data = _apply_git_delta(base, raw, self.label)
        else:
            raise InstallError(self.label + "_pack_object_type_invalid")
        h = hashlib.sha1()
        h.update(type_name.encode("ascii") + b" " + str(len(data)).encode("ascii") + b"\0")
        h.update(data)
        if h.hexdigest() != oid:
            raise InstallError(self.label + "_object_oid_mismatch:" + oid)
        value = (type_name, data)
        self._cache_put(oid, value)
        return value

    def revalidate(self) -> None:
        for path, fd, expected, label in (
            (self.pack_path, self.pack_fd, self.pack_identity, self.label + "_pack"),
            (self.idx_path, self.idx_fd, self.idx_identity, self.label + "_idx"),
        ):
            if (
                _metadata_identity(os.fstat(fd)) != expected
                or _metadata_identity(path.lstat()) != expected
            ):
                raise InstallError(label + "_generation_changed")

class _ObjectStore:
    def __init__(self, root: pathlib.Path, label: str, *, exact_pack_only: bool):
        self.root = root
        self.label = label
        self.objects = root / ".git" / "objects"
        self.loose: dict[str, pathlib.Path] = {}
        self.packs: list[_PackReader] = []
        names = []
        with os.scandir(self.objects) as scan:
            for entry in scan:
                names.append(entry.name)
                if len(names) > MAX_NODES:
                    raise InstallError(label + "_object_store_entry_limit")
        allowed = {"info", "pack"}
        for name in names:
            if name in allowed:
                continue
            if exact_pack_only:
                raise InstallError(label + "_loose_object_forbidden")
            if len(name) != 2 or any(ch not in "0123456789abcdef" for ch in name):
                raise InstallError(label + "_object_store_entry_invalid")
            directory = self.objects / name
            st = directory.lstat()
            if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
                raise InstallError(label + "_loose_directory_invalid")
            with os.scandir(directory) as scan:
                for entry in scan:
                    suffix = entry.name
                    if len(suffix) != 38 or any(ch not in "0123456789abcdef" for ch in suffix):
                        raise InstallError(label + "_loose_object_name_invalid")
                    oid = name + suffix
                    self.loose[oid] = directory / suffix
                    if len(self.loose) > MAX_NODES:
                        raise InstallError(label + "_loose_object_limit")
        pack_dir = self.objects / "pack"
        pack_entries = []
        with os.scandir(pack_dir) as scan:
            for entry in scan:
                pack_entries.append(entry.name)
                if len(pack_entries) > MAX_PACKS * 2:
                    raise InstallError(label + "_pack_entry_limit")
        stems: dict[str, set[str]] = {}
        for name in pack_entries:
            if not name.startswith("pack-"):
                raise InstallError(label + "_pack_name_invalid")
            if name.endswith(".pack"):
                stem = name[:-5]
                ext = "pack"
            elif name.endswith(".idx"):
                stem = name[:-4]
                ext = "idx"
            else:
                raise InstallError(label + "_pack_auxiliary_forbidden")
            digest = stem[5:]
            if len(digest) != 40 or any(ch not in "0123456789abcdef" for ch in digest):
                raise InstallError(label + "_pack_name_digest_invalid")
            stems.setdefault(stem, set()).add(ext)
        if exact_pack_only and len(stems) != 1:
            raise InstallError(label + "_single_pack_required")
        if len(stems) > MAX_PACKS:
            raise InstallError(label + "_pack_count_limit")
        try:
            for stem, exts in sorted(stems.items()):
                if exts != {"pack", "idx"}:
                    raise InstallError(label + "_pack_pair_incomplete")
                self.packs.append(_PackReader(
                    pack_dir / (stem + ".pack"),
                    pack_dir / (stem + ".idx"),
                    label + "_" + stem,
                ))
        except BaseException:
            self.close()
            raise

    def close(self) -> None:
        for pack in self.packs:
            pack.close()

    def all_oids(self) -> set[str]:
        out = set(self.loose)
        for pack in self.packs:
            for oid in pack.oids:
                if oid in out:
                    raise InstallError(self.label + "_duplicate_object_representation:" + oid)
                out.add(oid)
        return out

    def has_object(self, oid: str) -> bool:
        return oid in self.loose or any(pack.contains(oid) for pack in self.packs)

    def _read_loose(self, oid: str, path: pathlib.Path) -> tuple[str, bytes]:
        before = path.lstat()
        if (
            not stat.S_ISREG(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_nlink != 1
            or before.st_size < 0
            or before.st_size > MAX_FILE_BYTES
        ):
            raise InstallError(self.label + "_loose_metadata_invalid")
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
        try:
            opened = os.fstat(fd)
            identity = _metadata_identity(opened)
            if identity != _metadata_identity(before):
                raise InstallError(self.label + "_loose_rebound")
            dec = zlib.decompressobj()
            decoded = bytearray()
            remaining = opened.st_size
            while remaining:
                part = os.read(fd, min(COPY_CHUNK, remaining))
                if not part:
                    raise InstallError(self.label + "_loose_short_read")
                remaining -= len(part)
                try:
                    piece = dec.decompress(
                        part,
                        MAX_GIT_OBJECT_BYTES + 1 - len(decoded),
                    )
                except zlib.error as exc:
                    raise InstallError(self.label + "_loose_zlib_invalid") from exc
                decoded.extend(piece)
                if len(decoded) > MAX_GIT_OBJECT_BYTES or dec.unconsumed_tail:
                    raise InstallError(self.label + "_loose_object_size_limit")
            if os.read(fd, 1):
                raise InstallError(self.label + "_loose_grew")
            if not dec.eof or dec.unused_data or dec.unconsumed_tail:
                raise InstallError(self.label + "_loose_zlib_incomplete")
            if (
                _metadata_identity(os.fstat(fd)) != identity
                or _metadata_identity(path.lstat()) != identity
            ):
                raise InstallError(self.label + "_loose_generation_changed")
        finally:
            os.close(fd)
        raw = bytes(decoded)
        sep = raw.find(b"\0")
        if sep <= 0:
            raise InstallError(self.label + "_loose_header_invalid")
        header = raw[:sep]
        data = raw[sep + 1:]
        try:
            type_raw, size_raw = header.split(b" ", 1)
            type_name = type_raw.decode("ascii")
            size = int(size_raw.decode("ascii"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise InstallError(self.label + "_loose_header_parse_invalid") from exc
        if type_name not in ("commit", "tree", "blob", "tag") or size != len(data):
            raise InstallError(self.label + "_loose_header_semantic_invalid")
        h = hashlib.sha1()
        h.update(header + b"\0" + data)
        if h.hexdigest() != oid:
            raise InstallError(self.label + "_loose_oid_mismatch")
        return type_name, data

    def read_object(self, oid: str) -> tuple[str, bytes]:
        if len(oid) != 40 or any(ch not in "0123456789abcdef" for ch in oid):
            raise InstallError(self.label + "_object_oid_invalid")
        if oid in self.loose:
            return self._read_loose(oid, self.loose[oid])
        matches = [pack for pack in self.packs if pack.contains(oid)]
        if len(matches) != 1:
            raise InstallError(self.label + "_object_missing_or_ambiguous:" + oid)
        return matches[0].read_object(oid)

    def revalidate(self) -> None:
        for pack in self.packs:
            pack.revalidate()

def _parse_commit_object(data: bytes, label: str) -> tuple[str, tuple[str, ...]]:
    header = data.split(b"\n\n", 1)[0]
    tree = None
    parents: list[str] = []
    for line in header.splitlines():
        if line.startswith(b"tree "):
            if tree is not None:
                raise InstallError(label + "_commit_tree_duplicate")
            value = line[5:]
            if len(value) != 40 or any(ch not in b"0123456789abcdef" for ch in value):
                raise InstallError(label + "_commit_tree_invalid")
            tree = value.decode("ascii")
        elif line.startswith(b"parent "):
            value = line[7:]
            if len(value) != 40 or any(ch not in b"0123456789abcdef" for ch in value):
                raise InstallError(label + "_commit_parent_invalid")
            parents.append(value.decode("ascii"))
    if tree is None:
        raise InstallError(label + "_commit_tree_missing")
    return tree, tuple(parents)

def _parse_tree_object(data: bytes, label: str) -> tuple[tuple[str, str, str], ...]:
    out: list[tuple[str, str, str]] = []
    pos = 0
    previous_key: bytes | None = None
    while pos < len(data):
        space = data.find(b" ", pos)
        nul = data.find(b"\0", space + 1 if space >= 0 else pos)
        if space <= pos or nul < 0 or nul + 21 > len(data):
            raise InstallError(label + "_tree_record_invalid")
        mode_raw = data[pos:space]
        name_raw = data[space + 1:nul]
        oid = data[nul + 1:nul + 21].hex()
        pos = nul + 21
        try:
            mode = mode_raw.decode("ascii")
            name = name_raw.decode("utf-8", "strict")
        except UnicodeError as exc:
            raise InstallError(label + "_tree_record_encoding_invalid") from exc
        if (
            mode not in ("40000", "100644", "100755", "120000")
            or not name
            or name in (".", "..", ".git")
            or "/" in name
            or "\0" in name
        ):
            raise InstallError(label + "_tree_record_semantic_invalid")
        key = name_raw + (b"/" if mode == "40000" else b"\0")
        if previous_key is not None and previous_key >= key:
            raise InstallError(label + "_tree_order_invalid")
        previous_key = key
        out.append((mode, name, oid))
        if len(out) > MAX_NODES:
            raise InstallError(label + "_tree_entry_limit")
    return tuple(out)

def _flatten_tree_manifest(
    store: _ObjectStore,
    tree_oid: str,
) -> tuple[dict[str, tuple[str, str]], set[str]]:
    # Path expansion must not deduplicate by tree OID: the same tree may be
    # referenced at more than one path. Object-closure verification is handled
    # separately by _collect_tree_object_closure.
    manifest: dict[str, tuple[str, str]] = {}
    observed_objects: set[str] = set()
    stack: list[tuple[str, str, int]] = [(tree_oid, "", 0)]
    expanded = 0
    while stack:
        oid, prefix, depth = stack.pop()
        if depth > MAX_COPY_DEPTH:
            raise InstallError("tree_graph_depth_limit")
        obj_type, data = store.read_object(oid)
        if obj_type != "tree":
            raise InstallError("tree_graph_object_type_invalid")
        observed_objects.add(oid)
        entries = _parse_tree_object(data, "tree_graph")
        for mode, name, child_oid in reversed(entries):
            expanded += 1
            if expanded > MAX_NODES:
                raise InstallError("tree_graph_path_limit")
            rel = name if not prefix else prefix + "/" + name
            if mode == "40000":
                stack.append((child_oid, rel, depth + 1))
            else:
                child_type, _child_data = store.read_object(child_oid)
                if child_type != "blob":
                    raise InstallError("tree_graph_blob_type_invalid")
                observed_objects.add(child_oid)
                if rel in manifest:
                    raise InstallError("tree_graph_duplicate_path")
                manifest[rel] = (mode, child_oid)
    return manifest, observed_objects

def _collect_tree_object_closure(
    store: _ObjectStore,
    root_tree_oid: str,
    reachable: set[str],
    verified_trees: set[str],
) -> None:
    stack: list[tuple[str, int]] = [(root_tree_oid, 0)]
    while stack:
        oid, depth = stack.pop()
        if oid in verified_trees:
            continue
        if depth > MAX_COPY_DEPTH:
            raise InstallError("history_tree_depth_limit")
        obj_type, data = store.read_object(oid)
        if obj_type != "tree":
            raise InstallError("history_tree_type_invalid:" + oid)
        verified_trees.add(oid)
        reachable.add(oid)
        for mode, _name, child_oid in _parse_tree_object(data, "history_tree"):
            if mode == "40000":
                stack.append((child_oid, depth + 1))
            else:
                child_type, _child_data = store.read_object(child_oid)
                if child_type != "blob":
                    raise InstallError("history_blob_type_invalid:" + child_oid)
                reachable.add(child_oid)
            if len(reachable) > MAX_NODES:
                raise InstallError("history_object_count_limit")

def _verify_full_history_graph(store: _ObjectStore) -> tuple[dict[str, tuple[str, str]], int, int]:
    reachable: set[str] = set()
    commits: set[str] = set()
    verified_trees: set[str] = set()
    stack = [SOURCE_HEAD]

    top_manifest, _top_objects = _flatten_tree_manifest(store, SOURCE_TREE)
    _collect_tree_object_closure(
        store, SOURCE_TREE, reachable, verified_trees
    )

    while stack:
        oid = stack.pop()
        if oid in commits:
            continue
        obj_type, data = store.read_object(oid)
        if obj_type != "commit":
            raise InstallError("history_commit_type_invalid:" + oid)
        tree_oid, parents = _parse_commit_object(data, "history")
        if oid == SOURCE_HEAD and (
            tree_oid != SOURCE_TREE or parents != SOURCE_PARENTS
        ):
            raise InstallError("history_source_commit_binding_mismatch")
        commits.add(oid)
        reachable.add(oid)
        if len(commits) > REACHABLE_COMMITS:
            raise InstallError("history_commit_count_overflow")
        stack.extend(parents)
        _collect_tree_object_closure(
            store, tree_oid, reachable, verified_trees
        )
        if len(reachable) > MAX_NODES:
            raise InstallError("history_object_count_limit")

    if len(commits) != REACHABLE_COMMITS:
        raise InstallError("history_reachable_commit_count_mismatch")
    all_oids = store.all_oids()
    if reachable != all_oids:
        raise InstallError("history_object_closure_not_exact")
    store.revalidate()
    return top_manifest, len(commits), len(all_oids)

def _next_optional_index_extension(
    fd: int,
    offset: int,
    content_end: int,
    label: str,
) -> int:
    if offset < 0 or content_end < offset or content_end - offset < 8:
        raise InstallError(label + "_extension_header_truncated")
    header = _pread_exact(fd, offset, 8, label + "_extension_header")
    signature = header[:4]
    if not (0x41 <= signature[0] <= 0x5A):
        raise InstallError(label + "_required_extension_forbidden")
    payload_size = struct.unpack(">I", header[4:8])[0]
    next_offset = offset + 8 + payload_size
    if next_offset < offset or next_offset > content_end:
        raise InstallError(label + "_extension_size_invalid")
    return next_offset

def _read_index_manifest(path: pathlib.Path, label: str) -> dict[str, tuple[str, str]]:
    fd, identity = _open_stable_regular(path, label, MAX_INDEX_BYTES)
    try:
        size = os.fstat(fd).st_size
        if size < 32:
            raise InstallError(label + "_index_too_small")
        header = _pread_exact(fd, 0, 12, label + "_header")
        if header[:4] != b"DIRC":
            raise InstallError(label + "_magic_invalid")
        version, count = struct.unpack(">II", header[4:12])
        if version != 2 or count > MAX_NODES:
            raise InstallError(label + "_version_or_count_invalid")
        manifest: dict[str, tuple[str, str]] = {}
        offset = 12
        previous: bytes | None = None
        for _ in range(count):
            fixed = _pread_exact(fd, offset, 62, label + "_entry")
            fields = struct.unpack(">10I20sH", fixed)
            mode_value = fields[6]
            oid = fields[10].hex()
            flags = fields[11]
            if flags & 0xf000:
                raise InstallError(label + "_flags_invalid")
            name_limit = flags & 0x0fff
            name = bytearray()
            cursor = offset + 62
            while True:
                if len(name) > MAX_INDEX_PATH_BYTES:
                    raise InstallError(label + "_path_limit")
                byte = _pread_exact(fd, cursor, 1, label + "_path_byte")
                cursor += 1
                if byte == b"\0":
                    break
                name.extend(byte)
            if name_limit == 0x0fff:
                if len(name) < 0x0fff:
                    raise InstallError(label + "_path_length_sentinel_invalid")
            elif name_limit != len(name):
                raise InstallError(label + "_path_length_mismatch")
            try:
                rel = bytes(name).decode("utf-8", "strict")
            except UnicodeDecodeError as exc:
                raise InstallError(label + "_path_not_utf8") from exc
            if (
                not rel
                or rel.startswith("/")
                or rel.endswith("/")
                or any(part in ("", ".", "..", ".git") for part in rel.split("/"))
            ):
                raise InstallError(label + "_path_invalid")
            raw_name = bytes(name)
            if previous is not None and previous >= raw_name:
                raise InstallError(label + "_path_order_invalid")
            previous = raw_name
            if mode_value == 0o100644:
                mode = "100644"
            elif mode_value == 0o100755:
                mode = "100755"
            elif mode_value == 0o120000:
                mode = "120000"
            else:
                raise InstallError(label + "_entry_mode_invalid")
            if rel in manifest:
                raise InstallError(label + "_duplicate_path")
            manifest[rel] = (mode, oid)
            entry_len = 62 + len(name) + 1
            padded_len = (entry_len + 7) & ~7
            padding_len = padded_len - entry_len
            if padding_len:
                padding = _pread_exact(
                    fd, cursor, padding_len, label + "_padding"
                )
                if padding != b"\0" * padding_len:
                    raise InstallError(label + "_padding_nonzero")
            offset += padded_len
        content_end = size - 20
        extension_count = 0
        while offset < content_end:
            extension_count += 1
            if extension_count > MAX_INDEX_EXTENSIONS:
                raise InstallError(label + "_extension_count_limit")
            offset = _next_optional_index_extension(
                fd, offset, content_end, label
            )
        if offset != content_end:
            raise InstallError(label + "_extension_boundary_invalid")
        expected = _pread_exact(fd, content_end, 20, label + "_checksum")
        if _sha1_fd_prefix(fd, size - 20, label + "_sha1") != expected:
            raise InstallError(label + "_checksum_mismatch")
        if (
            _metadata_identity(os.fstat(fd)) != identity
            or _metadata_identity(path.lstat()) != identity
        ):
            raise InstallError(label + "_generation_changed")
        return manifest
    finally:
        os.close(fd)

def _verify_worktree_manifest(root: pathlib.Path, manifest: dict[str, tuple[str, str]]) -> None:
    expected_dirs: set[str] = set()
    for rel in manifest:
        parts = rel.split("/")
        for index in range(1, len(parts)):
            expected_dirs.add("/".join(parts[:index]))
    seen: set[str] = set()
    pending: list[tuple[pathlib.Path, str]] = [(root, "")]
    nodes = 0
    while pending:
        directory, prefix = pending.pop()
        with os.scandir(directory) as scan:
            for entry in scan:
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
                if mode in ("100644", "100755"):
                    if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode):
                        raise InstallError("worktree_nonregular:" + rel)
                    actual_mode = "100755" if stat.S_IMODE(st.st_mode) & stat.S_IXUSR else "100644"
                    if actual_mode != mode:
                        raise InstallError("worktree_mode_mismatch:" + rel)
                    _size, _sha256, observed, _identity = _stream_regular_hashes_stable(
                        child, "worktree_file", git_blob=True
                    )
                    if observed != oid:
                        raise InstallError("worktree_blob_mismatch:" + rel)
                elif mode == "120000":
                    if not stat.S_ISLNK(st.st_mode):
                        raise InstallError("worktree_symlink_kind_mismatch:" + rel)
                    target = os.fsencode(os.readlink(child))
                    if git_blob_sha1(target) != oid:
                        raise InstallError("worktree_symlink_blob_mismatch:" + rel)
                else:
                    raise InstallError("worktree_mode_unsupported:" + rel)
                seen.add(rel)
    if seen != set(manifest):
        raise InstallError("worktree_missing_path")

def _bounded_directory_names(
    path: pathlib.Path,
    label: str,
    limit: int,
) -> tuple[str, ...]:
    if limit < 0:
        raise InstallError(label + "_entry_limit_invalid")
    names: list[str] = []
    try:
        with os.scandir(path) as scan:
            for entry in scan:
                if len(names) >= limit:
                    raise InstallError(label + "_entry_limit")
                names.append(entry.name)
    except OSError as exc:
        raise InstallError(label + "_scandir_failed:" + os.fspath(path)) from exc
    return tuple(names)

def _require_exact_directory_names(
    path: pathlib.Path,
    expected: set[str],
    label: str,
) -> tuple[str, ...]:
    names = _bounded_directory_names(path, label, len(expected) + 1)
    if set(names) != expected or len(names) != len(expected):
        raise InstallError(label + "_layout_invalid")
    return names

def _exact_candidate_git_layout(root: pathlib.Path, owner_uid: int, owner_gid: int) -> dict[str, str]:
    git_dir = root / ".git"
    _require_exact_directory_names(
        git_dir, {"HEAD", "config", "index", "info", "objects", "refs"},
        "git",
    )
    _require_exact_directory_names(
        git_dir / "objects", {"info", "pack"}, "git_objects"
    )
    _require_exact_directory_names(
        git_dir / "objects" / "info", set(), "git_objects_info"
    )
    _require_exact_directory_names(git_dir / "info", set(), "git_info")
    _require_exact_directory_names(
        git_dir / "refs", {"heads", "tags"}, "git_refs"
    )
    _require_exact_directory_names(
        git_dir / "refs" / "heads", {"main"}, "git_heads"
    )
    _require_exact_directory_names(
        git_dir / "refs" / "tags", set(), "git_tags"
    )
    packs = sorted(
        _bounded_directory_names(
            git_dir / "objects" / "pack", "git_pack", 3
        )
    )
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
    index_size, index_sha256, _index_git_blob, _ = _stream_regular_hashes_stable(
        git_dir / "index", "git_index", git_blob=False
    )
    pack_name = next(n for n in packs if n.endswith(".pack"))
    idx_name = next(n for n in packs if n.endswith(".idx"))
    pack_size, pack_sha256, _pack_git_blob, _ = _stream_regular_hashes_stable(
        git_dir / "objects" / "pack" / pack_name,
        "git_pack",
        git_blob=False,
    )
    idx_size, idx_sha256, _idx_git_blob, _ = _stream_regular_hashes_stable(
        git_dir / "objects" / "pack" / idx_name,
        "git_pack_index",
        git_blob=False,
    )
    return {
        "config_sha256": sha256_bytes(config),
        "index_bytes": index_size,
        "index_sha256": index_sha256,
        "pack_name": pack_name,
        "pack_bytes": pack_size,
        "pack_sha256": pack_sha256,
        "pack_index_name": idx_name,
        "pack_index_bytes": idx_size,
        "pack_index_sha256": idx_sha256,
    }

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
        remaining_nodes = MAX_NODES - nodes
        names = sorted(
            _bounded_directory_names(
                directory, "tree_directory", remaining_nodes + 1
            )
        )
        if len(names) > remaining_nodes:
            raise InstallError("tree_node_limit")
        after = directory.lstat()
        if _metadata_identity(before) != _metadata_identity(after):
            raise InstallError("tree_directory_changed:" + (prefix or "."))
        nodes += len(names)
        for entry_name in names:
            child = directory / entry_name
            rel = entry_name if not prefix else prefix + "/" + entry_name
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
                file_size, file_sha256, _git_blob_oid, _ = _stream_regular_hashes_stable(
                    child, "tree_file", git_blob=False
                )
                total += file_size
                if total > MAX_TOTAL_BYTES:
                    raise InstallError("tree_total_bytes_limit")
                h.update(
                    b"F\0" + rel.encode("utf-8") + b"\0"
                    + str(file_size).encode("ascii") + b"\0"
                    + bytes.fromhex(file_sha256)
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
    if (root / ".git" / "shallow").exists() or (root / ".git" / "shallow").is_symlink():
        raise InstallError("full_root_shallow")
    if _direct_main_ref(root, "full_root") != SOURCE_HEAD:
        raise InstallError("full_root_head_mismatch")
    store = _ObjectStore(root, "full_root", exact_pack_only=True)
    try:
        commit_type, commit_data = store.read_object(SOURCE_HEAD)
        if commit_type != "commit":
            raise InstallError("full_root_head_type_invalid")
        tree_oid, parents = _parse_commit_object(commit_data, "full_root")
        if tree_oid != SOURCE_TREE or parents != SOURCE_PARENTS:
            raise InstallError("full_root_source_commit_binding_mismatch")
        manifest, commit_count, object_count = _verify_full_history_graph(store)
        if _read_index_manifest(root / ".git" / "index", "full_root_index") != manifest:
            raise InstallError("full_root_index_head_mismatch")
        _verify_worktree_manifest(root, manifest)
        digest, nodes, total = _content_digest(
            root, expected_uid, expected_gid, expected_root_mode
        )
        return {
            "path": os.fspath(root),
            "content_sha256": digest,
            "nodes": nodes,
            "regular_file_bytes": total,
            "reachable_commits": commit_count,
            "reachable_objects": object_count,
            "built_in_object_closure_verified": True,
            **git_identity,
        }
    finally:
        store.close()

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
    if _direct_main_ref(root, "live_release") != SOURCE_HEAD:
        raise InstallError("live_release_head_mismatch")
    store = _ObjectStore(root, "live_release", exact_pack_only=False)
    try:
        commit_type, commit_data = store.read_object(SOURCE_HEAD)
        if commit_type != "commit":
            raise InstallError("live_release_head_type_invalid")
        tree_oid, parents = _parse_commit_object(commit_data, "live_release")
        if tree_oid != SOURCE_TREE or parents != SOURCE_PARENTS:
            raise InstallError("live_release_source_commit_binding_mismatch")
        for parent in SOURCE_PARENTS:
            if store.has_object(parent):
                raise InstallError("live_release_parent_object_unexpectedly_present:" + parent)
        manifest, _tree_objects = _flatten_tree_manifest(store, SOURCE_TREE)
        if _read_index_manifest(root / ".git" / "index", "live_release_index") != manifest:
            raise InstallError("live_release_index_head_mismatch")
        _verify_worktree_manifest(root, manifest)
        store.revalidate()
        digest, nodes, total = _content_digest(root, 0, 0, 0o555)
        return {
            "path": os.fspath(root),
            "content_sha256": digest,
            "nodes": nodes,
            "regular_file_bytes": total,
            "shallow_sha256": sha256_bytes(shallow),
            "built_in_shallow_provenance_verified": True,
        }
    finally:
        store.close()

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

def collect_plan(expected_head: str, expected_tree: str) -> dict[str, Any]:
    verify_repository(expected_head, expected_tree)
    candidate = verify_candidate()
    live = _verify_live_shallow_release()
    ancestors = _ancestor_custody(INSTALL_PARENT)
    state = _target_state(candidate)
    body = {
        "schema": PLAN_SCHEMA,
        "version": 1,
        "expected_head": expected_head,
        "expected_tree": expected_tree,
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

def _runtime_uid_child_call(operation: str, expected_head: str = "", expected_tree: str = "") -> dict[str, Any]:
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
                    result: Any = collect_plan(expected_head, expected_tree)
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

def _collect_plan_for_apply(expected_head: str, expected_tree: str) -> dict[str, Any]:
    return _runtime_uid_child_call("collect_plan", expected_head, expected_tree)

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
    print("git_index_optional_extensions_bounded=true")
    print("git_index_required_extensions_rejected=true")
    print("pack_entry_span_bound_required=true")
    print("pack_cache_byte_budget_required=true")
    print("dynamic_git_provenance_authority_removed=true")
    print("built_in_pack_index_verification_required=true")
    print("built_in_full_history_object_closure_required=true")
    print("apply_plan_runtime_uid_drop_required=true")
    print("runtime_uid_child_no_new_privs_required=true")
    print("runtime_uid_child_capability_clear_required=true")
    print("runtime_uid_child_capability_status_zero_required=true")
    print("candidate_copy_descriptor_relative=true")
    print("candidate_copy_incremental_enumeration_required=true")
    print("candidate_copy_iterative_depth_bound_required=true")
    print("candidate_copy_operation_bound_node_budget_required=true")
    print("candidate_copy_operation_bound_byte_budget_required=true")
    print("candidate_copy_exact_planned_counts_required=true")
    print("large_file_authentication_streamed=true")
    print("byte_returning_reads_tiny_metadata_only=true")
    print("apply_root_dynamic_git_exec=false")
    print("dynamic_git_provenance_authority_removed=true")
    print("built_in_pack_index_verification_required=true")
    print("built_in_full_history_object_closure_required=true")
    print("trusted_expected_head_tree_pair_required=true")
    print("termination_signal_reconciliation_required=true")
    print("install_parent_publication_lease_required=true")
    print("git_index_head_equality_required=true")
    print("git_index_optional_extensions_bounded=true")
    print("git_index_required_extensions_rejected=true")
    print("git_index_v2_zero_padding_required=true")
    print("git_index_v2_name_length_sentinel_required=true")
    print("git_metadata_leaves_nonexecutable_required=true")
    print("private_stage_before_content_authentication=true")
    print("private_stage_git_verification_before_world_readable=true")
    print("private_stage_named_runtime_uid_acl_required=true")
    print("private_stage_acl_group_object_zero_required=true")
    print("runtime_uid_child_capability_clear_required=true")
    print("runtime_uid_child_capability_status_zero_required=true")
    print("candidate_copy_incremental_enumeration_required=true")
    print("candidate_copy_iterative_depth_bound_required=true")
    print("candidate_copy_operation_bound_node_budget_required=true")
    print("candidate_copy_operation_bound_byte_budget_required=true")
    print("candidate_copy_exact_planned_counts_required=true")
    print("candidate_utf8_path_components_required=true")
    print("candidate_receipt_safe_path_components_required=true")
    print("candidate_printable_path_components_required=true")
    print("terminal_reason_line_sanitization_required=true")
    print("terminal_reason_printable_sanitization_required=true")
    print("opened_generation_copy_budget_required=true")
    print("write_boundary_precedes_first_stage_mutation=true")
    print("service_mutation=false")
    print("credential_access=false")
    print("transaction=false")
    print("funds_movement=false")

def plan(expected_head: str, expected_tree: str) -> None:
    result = collect_plan(expected_head, expected_tree)
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("plan_id=" + result["plan_id"])
    print("expected_head=" + expected_head)
    print("expected_tree=" + expected_tree)
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
        out.append(ch if ch.isprintable() else "_")
    return "".join(out)

def _require_utf8_copy_component(name: str) -> None:
    try:
        raw = name.encode("utf-8", "strict")
        roundtrip = raw.decode("utf-8", "strict")
    except UnicodeError as exc:
        raise InstallError("copy_entry_name_not_utf8") from exc
    if roundtrip != name or name in ("", ".", "..") or "/" in name:
        raise InstallError("copy_entry_name_invalid")
    if not all(ch.isprintable() for ch in name):
        raise InstallError("copy_entry_name_control_forbidden")

def _copy_candidate_tree_iterative(
    src_root_fd: int,
    dst_root_fd: int,
    *,
    node_limit: int = MAX_NODES,
    depth_limit: int = MAX_COPY_DEPTH,
    total_limit: int = MAX_TOTAL_BYTES,
) -> tuple[int, int]:
    if node_limit < 0:
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

def _planned_candidate_copy_limits(
    expected_candidate: dict[str, Any],
) -> tuple[int, int]:
    if not isinstance(expected_candidate, dict):
        raise InstallError("planned_candidate_shape_invalid")
    nodes = expected_candidate.get("nodes")
    regular_file_bytes = expected_candidate.get("regular_file_bytes")
    if type(nodes) is not int or nodes < 0 or nodes > MAX_NODES:
        raise InstallError("planned_candidate_nodes_invalid")
    if (
        type(regular_file_bytes) is not int
        or regular_file_bytes < 0
        or regular_file_bytes > MAX_TOTAL_BYTES
    ):
        raise InstallError("planned_candidate_regular_file_bytes_invalid")
    return nodes, regular_file_bytes

def _copy_candidate_to_stage(expected_candidate: dict[str, Any]) -> None:
    global _WRITE_BOUNDARY_ENTERED, _STAGE_RETAINED

    if STAGE.exists() or STAGE.is_symlink():
        raise InstallError("stage_preexisting")

    planned_nodes, planned_regular_file_bytes = _planned_candidate_copy_limits(
        expected_candidate
    )
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
            node_limit=planned_nodes,
            depth_limit=MAX_COPY_DEPTH,
            total_limit=planned_regular_file_bytes,
        )
        if nodes != planned_nodes:
            raise InstallError("copy_planned_node_count_mismatch")
        if total != planned_regular_file_bytes:
            raise InstallError("copy_planned_regular_file_bytes_mismatch")
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

def apply(expected_head: str, expected_tree: str, expected_plan_id: str, confirm: str) -> None:
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
    planned = _collect_plan_for_apply(expected_head, expected_tree)
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

    rebound = _collect_plan_for_apply(expected_head, expected_tree)
    if rebound["body"]["protected_state"] != "HOLD_STAGE_PRESENT":
        raise InstallError("stage_state_not_visible_before_publication")
    if not _same_binding(rebound["body"], planned["body"]):
        raise InstallError("plan_binding_changed_before_publication")
    stage = _verify_stage_for_apply(
        planned["body"]["candidate"]["content_sha256"]
    )

    _revalidate_install_parent_after_stage(planned_ancestors)
    _rename_noreplace(planned_ancestors)

    final = _collect_plan_for_apply(expected_head, expected_tree)
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
        "c1\u009bcontrol",
        "zwj\u200dformat",
        "bidi\u202eoverride",
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
    unsafe_reason = (
        "prefix\rforged=true\u0085next\u009bcontrol\u200dformat"
        "\u202eoverride\u2028third\u2029fourth\nlast"
    )
    safe_reason = _receipt_safe_text(unsafe_reason)
    if any(not ch.isprintable() for ch in safe_reason):
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
    print("large_file_authentication_streamed=true")
    print("byte_returning_reads_tiny_metadata_only=true")
    print("candidate_utf8_path_components_required=true")
    print("candidate_receipt_safe_path_components_required=true")
    print("candidate_printable_path_components_required=true")
    print("terminal_reason_line_sanitization_required=true")
    print("terminal_reason_printable_sanitization_required=true")
    print("rename_noreplace_publication_required=true")
    print("trusted_root_launcher_required=true")
    with tempfile.TemporaryDirectory(prefix="void-v7-index-extension-self-test-") as td:
        ext_path = pathlib.Path(td) / "extensions.bin"
        ext_path.write_bytes(b"TREE" + struct.pack(">I", 3) + b"abc")
        ext_fd = os.open(ext_path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
        try:
            if _next_optional_index_extension(
                ext_fd, 0, 11, "self_test_index"
            ) != 11:
                raise AssertionError("optional_index_extension_not_consumed")
        finally:
            os.close(ext_fd)
        ext_path.write_bytes(b"link" + struct.pack(">I", 0))
        ext_fd = os.open(ext_path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
        try:
            try:
                _next_optional_index_extension(
                    ext_fd, 0, 8, "self_test_index"
                )
            except InstallError as exc:
                if str(exc) != "self_test_index_required_extension_forbidden":
                    raise
            else:
                raise AssertionError("required_index_extension_not_rejected")
        finally:
            os.close(ext_fd)
    print("git_index_optional_extensions_bounded=true")
    print("git_index_required_extensions_rejected=true")
    print("git_index_v2_zero_padding_required=true")
    print("git_index_v2_name_length_sentinel_required=true")
    assert _PackReader._entry_span(
        12, 12 + MAX_PACK_ENTRY_BYTES, "self_test_pack"
    ) == MAX_PACK_ENTRY_BYTES
    try:
        _PackReader._entry_span(
            12, 12 + MAX_PACK_ENTRY_BYTES + 1, "self_test_pack"
        )
    except InstallError as exc:
        assert str(exc) == "self_test_pack_pack_entry_size_limit"
    else:
        raise AssertionError("oversized_pack_entry_span_not_rejected")

    cache_probe = object.__new__(_PackReader)
    cache_probe.cache = collections.OrderedDict()
    cache_probe.cache_bytes = 0
    original_cache_budget = MAX_PACK_CACHE_BYTES
    globals()["MAX_PACK_CACHE_BYTES"] = 8
    try:
        cache_probe._cache_put("a", ("blob", b"123456"))
        cache_probe._cache_put("b", ("blob", b"abcdef"))
        if tuple(cache_probe.cache) != ("b",) or cache_probe.cache_bytes != 6:
            raise AssertionError("pack_cache_byte_budget_eviction_invalid")
    finally:
        globals()["MAX_PACK_CACHE_BYTES"] = original_cache_budget
    print("pack_entry_span_bound_required=true")
    print("pack_cache_byte_budget_required=true")
    print("dynamic_git_provenance_authority_removed=true")
    print("built_in_pack_index_verification_required=true")
    print("built_in_full_history_object_closure_required=true")
    print("trusted_expected_head_tree_pair_required=true")
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
    parser.add_argument("--expected-tree", default="")
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
    if not args.expected_tree:
        raise InstallError("expected_tree_required")
    if args.plan:
        plan(args.expected_head, args.expected_tree)
        return 0
    if not args.expected_plan_id:
        raise InstallError("expected_plan_id_required")
    _install_termination_signal_handlers()
    apply(args.expected_head, args.expected_tree, args.expected_plan_id, args.confirm)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (
        InstallError,
        OSError,
        UnicodeError,
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
