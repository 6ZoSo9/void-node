#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import fcntl
import hashlib
import json
import os
import pathlib
import re
import stat
import sys
import tempfile
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
LOCK_REL = "ops/security/buy-void-user-manager-credential-query-elf-lock-v3r.json"
LOCK_PATH = ROOT / LOCK_REL
LOCK_GIT_BLOB_SHA1 = "c4870f3178aebc9a0bb6557562f663b8480cfefa"
LOCK_ID = (
    "voidbuyumqcredelflock3r_"
    "8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34"
)

MARKER = "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V3R"
OPT_ROOT = pathlib.Path("/opt")
INSTALL_ROOT = OPT_ROOT / "void-buy-void-user-manager-credential-query-v1"

PREEXEC_NAME = "void_buy_void_user_manager_private_credential_unit_query_preexec_v1"
QUERY_NAME = "void_buy_void_user_manager_private_credential_unit_query_v1"
V1_PREDECESSOR_NAME = (
    "void_buy_void_user_manager_private_credential_unit_query_v1."
    "predecessor-lock-v1"
)
V2_PREDECESSOR_NAME = (
    "void_buy_void_user_manager_private_credential_unit_query_v1."
    "predecessor-lock-v2"
)
STAGING_NAME = (
    ".void_buy_void_user_manager_private_credential_unit_query_v3.stage"
)

PREEXEC_TARGET = INSTALL_ROOT / PREEXEC_NAME
QUERY_TARGET = INSTALL_ROOT / QUERY_NAME
V1_PREDECESSOR_TARGET = INSTALL_ROOT / V1_PREDECESSOR_NAME
V2_PREDECESSOR_TARGET = INSTALL_ROOT / V2_PREDECESSOR_NAME
STAGING_TARGET = INSTALL_ROOT / STAGING_NAME

PREEXEC_BYTES = 706504
PREEXEC_SHA256 = (
    "67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c"
)
V1_QUERY_BYTES = 43064
V1_QUERY_SHA256 = (
    "7b968a20f1507215477f43a59c5d82b9e9adca918ce5f2df566292d8380b4cb1"
)
V1_LOCK_ID = (
    "voidbuyumqcredelflock1_"
    "65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c"
)
V2_QUERY_BYTES = 47160
V2_QUERY_SHA256 = (
    "af02d006176db1a16eee52625751736c63af3bd1b250b46f81f200359fb48718"
)
V2_LOCK_ID = (
    "voidbuyumqcredelflock2_"
    "c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54"
)
V2_LOCK_REL = "ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json"
V2_LOCK_PATH = ROOT / V2_LOCK_REL
V2_LOCK_GIT_BLOB_SHA1 = "b73415ce8fc95ff2d49cbde97a15d701ad5b7937"

V3_QUERY_BYTES = 47160
V3_QUERY_SHA256 = (
    "d60e5719a4d785dbfaca90074ed3313ef9e0cae84c3f933af44d7faf84763923"
)
V3_QUERY_SOURCE_BLOB = "0d0e9546aea6e7346f5b35559bcdd8e7788900fe"
V3_CANDIDATE_ID = (
    "voidbuyumqcredelfcand3_"
    "b5c405437bd40582908e097a6f021bd575315d018a9d8457af6549458cbe0922"
)
V3_CANDIDATE_METADATA_GIT_BLOB = "8892892149203a027872034cbe4521c147d03e46"

CONFIRM_APPLY = (
    "ATOMIC_EXCHANGE_ACCEPTED_CREDENTIAL_QUERY_V2_TO_V3"
)
CONFIRM_ROLLBACK = (
    "ATOMIC_EXCHANGE_ROLLBACK_CREDENTIAL_QUERY_V3_TO_V2"
)

FORBIDDEN_APPLY_ENV = (
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "LD_AUDIT",
    "LD_DEBUG",
    "GLIBC_TUNABLES",
    "PYTHONPATH",
    "PYTHONHOME",
)
MAX_READ_CHUNK = 1024 * 1024
RENAME_NOREPLACE = 1
RENAME_EXCHANGE = 2

READY_STATE = "CREDENTIAL_QUERY_V2_GREEN_WITH_V1_PREDECESSOR_READY_FOR_V3"
STAGED_STATE = "CREDENTIAL_QUERY_V3_STAGE_READY_WITH_V2_V1"
EXCHANGED_STATE = "CREDENTIAL_QUERY_V3_EXCHANGED_PENDING_V2_PREDECESSOR"
GREEN_STATE = "CREDENTIAL_QUERY_V3_GREEN_WITH_V1_V2_PREDECESSORS"
ROLLBACK_PENDING_STATE = "CREDENTIAL_QUERY_V2_ROLLBACK_PENDING_V3_CLEANUP"
PRIVATE_PENDING_STATE = "CREDENTIAL_QUERY_V3_PRIVATE_PENDING_RECOVERY_REQUIRED"
PRIVATE_PENDING_RE = re.compile(
    r"^\." + re.escape(STAGING_NAME) + r"\.pending\.[0-9]+$"
)


class ReplaceError(RuntimeError):
    pass


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def _same_file_identity(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_mode == b.st_mode
        and a.st_nlink == b.st_nlink
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
    )


def _inode_identity(st: os.stat_result) -> tuple[int, int]:
    return (st.st_dev, st.st_ino)


def _path_inode(path: pathlib.Path) -> tuple[int, int]:
    try:
        st = path.lstat()
    except OSError as exc:
        raise ReplaceError("path_identity_unavailable:" + str(path)) from exc
    if stat.S_ISLNK(st.st_mode):
        raise ReplaceError("path_identity_symlink:" + str(path))
    return _inode_identity(st)


def _require_owned_path(
    path: pathlib.Path, created_identity: tuple[int, int]
) -> None:
    if _path_inode(path) != created_identity:
        raise ReplaceError("created_inode_ownership_mismatch:" + path.name)


def _unlink_owned_name(
    dir_fd: int, name: str, created_identity: tuple[int, int]
) -> bool:
    try:
        st = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise ReplaceError("owned_cleanup_stat_failed:" + name) from exc
    if stat.S_ISLNK(st.st_mode) or _inode_identity(st) != created_identity:
        return False
    os.unlink(name, dir_fd=dir_fd)
    os.fsync(dir_fd)
    return True


def _direct_repo_bytes(path: pathlib.Path) -> bytes:
    st = path.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_nlink != 1
    ):
        raise ReplaceError("repository_lock_not_direct_single_link_file")
    return path.read_bytes()



def accepted_lock() -> dict[str, Any]:
    raw = _direct_repo_bytes(LOCK_PATH)
    if git_blob_sha1(raw) != LOCK_GIT_BLOB_SHA1:
        raise ReplaceError("accepted_lock_blob_mismatch")
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ReplaceError("accepted_lock_json_invalid") from exc
    if not isinstance(value, dict):
        raise ReplaceError("accepted_lock_shape_invalid")

    required = {
        "schema": "void_buy_void_user_manager_credential_query_elf_lock_v3_repaired",
        "marker": "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V3_REPAIRED",
        "version": 3,
        "repository": "6ZoSo9/void-node",
        "v2_predecessor_lock_id": V2_LOCK_ID,
        "v2_predecessor_lock_git_blob_sha1": V2_LOCK_GIT_BLOB_SHA1,
        "candidate_accepted": True,
        "replacement_authorized": False,
        "live_query_authorized": False,
        "credential_contents_read": False,
        "complete_host_evidence_collector": False,
        "production_host_evidence_authority": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "transaction": False,
        "funds_movement": False,
        "lock_id": LOCK_ID,
    }
    for key, expected in required.items():
        if value.get(key) != expected:
            raise ReplaceError("accepted_lock_field_mismatch:" + key)

    evidence = value.get("candidate_evidence")
    if not isinstance(evidence, dict):
        raise ReplaceError("accepted_lock_evidence_missing")
    expected_evidence = {
        "metadata_git_blob_sha1": V3_CANDIDATE_METADATA_GIT_BLOB,
        "candidate_id": V3_CANDIDATE_ID,
        "preexec_binary_sha256": PREEXEC_SHA256,
        "preexec_binary_bytes": PREEXEC_BYTES,
        "query_binary_sha256": V3_QUERY_SHA256,
        "query_binary_bytes": V3_QUERY_BYTES,
        "credential_query_source_git_blob_sha1": V3_QUERY_SOURCE_BLOB,
        "complete_native_toolchain_closure_bound": True,
        "candidate_metadata_exact_rederivation_required": True,
    }
    for key, expected in expected_evidence.items():
        if evidence.get(key) != expected:
            raise ReplaceError(
                "accepted_lock_candidate_field_mismatch:" + key
            )

    predecessor_raw = _direct_repo_bytes(V2_LOCK_PATH)
    if git_blob_sha1(predecessor_raw) != V2_LOCK_GIT_BLOB_SHA1:
        raise ReplaceError("v2_predecessor_lock_blob_mismatch")
    try:
        predecessor = json.loads(predecessor_raw)
    except json.JSONDecodeError as exc:
        raise ReplaceError("v2_predecessor_lock_json_invalid") from exc
    if predecessor.get("lock_id") != V2_LOCK_ID:
        raise ReplaceError("v2_predecessor_lock_id_mismatch")
    return value

def _normalized_absolute(path: pathlib.Path) -> pathlib.Path:
    raw = str(path)
    if not path.is_absolute() or os.path.normpath(raw) != raw:
        raise ReplaceError("candidate_path_must_be_normalized_absolute")
    return path


def read_exact_candidate(path: pathlib.Path) -> bytes:
    path = _normalized_absolute(path)
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise ReplaceError("candidate_lstat_failed") from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_nlink != 1
        or visible_before.st_size != V3_QUERY_BYTES
    ):
        raise ReplaceError("candidate_metadata_invalid")

    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened_before = os.fstat(fd)
        if not _same_file_identity(visible_before, opened_before):
            raise ReplaceError("candidate_identity_changed_before_read")
        digest = hashlib.sha256()
        data = bytearray()
        remaining = V3_QUERY_BYTES
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise ReplaceError("candidate_short_read")
            digest.update(chunk)
            data.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise ReplaceError("candidate_grew_during_read")
        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_file_identity(opened_before, opened_after)
            or not _same_file_identity(opened_after, visible_after)
        ):
            raise ReplaceError("candidate_identity_changed_during_read")
    finally:
        os.close(fd)

    if digest.hexdigest() != V3_QUERY_SHA256:
        raise ReplaceError("candidate_sha256_mismatch")
    return bytes(data)


def _trusted_root_directory(
    path: pathlib.Path, *, exact_mode: int | None = None
) -> None:
    try:
        st = path.lstat()
    except OSError as exc:
        raise ReplaceError("trusted_directory_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or (st.st_mode & 0o022) != 0
    ):
        raise ReplaceError("trusted_directory_invalid:" + str(path))
    if exact_mode is not None and stat.S_IMODE(st.st_mode) != exact_mode:
        raise ReplaceError("trusted_directory_mode_invalid:" + str(path))


def _exists(path: pathlib.Path) -> bool:
    try:
        path.lstat()
        return True
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise ReplaceError("path_lstat_failed:" + str(path)) from exc


def _file_digest(
    path: pathlib.Path, *, expected_bytes: int, expected_sha256: str
) -> os.stat_result:
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise ReplaceError("installed_file_unavailable:" + path.name) from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_uid != 0
        or visible_before.st_gid != 0
        or stat.S_IMODE(visible_before.st_mode) != 0o555
        or visible_before.st_nlink != 1
        or visible_before.st_size != expected_bytes
    ):
        raise ReplaceError("installed_file_metadata_invalid:" + path.name)

    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened_before = os.fstat(fd)
        if not _same_file_identity(visible_before, opened_before):
            raise ReplaceError("installed_file_rebound:" + path.name)
        digest = hashlib.sha256()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise ReplaceError("installed_file_short_read:" + path.name)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise ReplaceError("installed_file_grew:" + path.name)
        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_file_identity(opened_before, opened_after)
            or not _same_file_identity(opened_after, visible_after)
        ):
            raise ReplaceError("installed_file_changed:" + path.name)
    finally:
        os.close(fd)

    if digest.hexdigest() != expected_sha256:
        raise ReplaceError("installed_file_sha256_mismatch:" + path.name)
    return visible_after


def _require_secure_apply_context() -> None:
    if sys.flags.isolated != 1:
        raise ReplaceError("python_isolated_mode_required")
    present = [name for name in FORBIDDEN_APPLY_ENV if name in os.environ]
    if present:
        raise ReplaceError("forbidden_apply_environment:" + ",".join(present))


def _renameat2(dir_fd: int, source: str, target: str, flags: int) -> None:
    libc = ctypes.CDLL(None, use_errno=True)
    fn = getattr(libc, "renameat2", None)
    if fn is None:
        raise ReplaceError("renameat2_unavailable")
    fn.argtypes = [
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_uint,
    ]
    fn.restype = ctypes.c_int
    rc = fn(
        dir_fd,
        source.encode("utf-8"),
        dir_fd,
        target.encode("utf-8"),
        flags,
    )
    if rc != 0:
        err = ctypes.get_errno()
        raise ReplaceError(
            "renameat2_failed:" + source + ":" + target + ":" + str(err)
        )


def _write_all(fd: int, raw: bytes) -> None:
    view = memoryview(raw)
    offset = 0
    while offset < len(view):
        wrote = os.write(fd, view[offset:])
        if wrote <= 0:
            raise ReplaceError("short_write")
        offset += wrote


def _create_exact_stage(
    dir_fd: int, raw: bytes
) -> tuple[int, int]:
    pending_name = (
        "." + STAGING_NAME + ".pending." + str(os.getpid())
    )
    flags = (
        os.O_RDWR | os.O_CREAT | os.O_EXCL
        | os.O_CLOEXEC | os.O_NOFOLLOW
    )
    fd = os.open(pending_name, flags, 0o500, dir_fd=dir_fd)
    created_identity = _inode_identity(os.fstat(fd))
    published = False
    try:
        _write_all(fd, raw)
        os.fchmod(fd, 0o555)
        os.fchown(fd, 0, 0)
        os.fsync(fd)

        staged = os.fstat(fd)
        if (
            not stat.S_ISREG(staged.st_mode)
            or staged.st_nlink != 1
            or staged.st_uid != 0
            or staged.st_gid != 0
            or stat.S_IMODE(staged.st_mode) != 0o555
            or staged.st_size != len(raw)
        ):
            raise ReplaceError("private_stage_metadata_invalid")
        os.lseek(fd, 0, os.SEEK_SET)
        observed = b""
        while len(observed) < len(raw):
            chunk = os.read(fd, len(raw) - len(observed))
            if not chunk:
                break
            observed += chunk
        if observed != raw:
            raise ReplaceError("private_stage_bytes_invalid")

        _renameat2(
            dir_fd, pending_name, STAGING_NAME, RENAME_NOREPLACE
        )
        published = True
        os.fsync(dir_fd)
        _require_owned_path(
            _fd_child_path(dir_fd, STAGING_NAME),
            created_identity,
        )
        _file_digest(
            _fd_child_path(dir_fd, STAGING_NAME),
            expected_bytes=V3_QUERY_BYTES,
            expected_sha256=V3_QUERY_SHA256,
        )
        return created_identity
    finally:
        os.close(fd)
        if not published:
            try:
                _unlink_owned_name(
                    dir_fd, pending_name, created_identity
                )
            except BaseException:
                pass


def _fd_child_path(dir_fd: int, name: str) -> pathlib.Path:
    return pathlib.Path("/proc/self/fd") / str(dir_fd) / name


def _root_entries_at(dir_fd: int) -> list[str]:
    try:
        return sorted(os.listdir(dir_fd))
    except OSError as exc:
        raise ReplaceError("installed_root_list_failed") from exc


def _private_pending_names_at(dir_fd: int) -> list[str]:
    names = [
        name for name in _root_entries_at(dir_fd)
        if PRIVATE_PENDING_RE.fullmatch(name)
    ]
    if len(names) > 1:
        raise ReplaceError("multiple_private_pending_files")
    for name in names:
        st = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
        if (
            not stat.S_ISREG(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_nlink != 1
            or st.st_uid != 0
            or st.st_size < 0
            or st.st_size > V3_QUERY_BYTES
            or stat.S_IMODE(st.st_mode) not in (0o500, 0o555)
        ):
            raise ReplaceError("private_pending_metadata_invalid")
    return names


def _cleanup_private_pending(dir_fd: int) -> bool:
    names = _private_pending_names_at(dir_fd)
    if not names:
        return False
    os.unlink(names[0], dir_fd=dir_fd)
    os.fsync(dir_fd)
    return True



def _installed_kind_at(
    dir_fd: int, name: str, *, allow_absent: bool
) -> str:
    path = _fd_child_path(dir_fd, name)
    if allow_absent and not _exists(path):
        return "absent"
    for kind, expected_bytes, expected_sha256 in (
        ("v1", V1_QUERY_BYTES, V1_QUERY_SHA256),
        ("v2", V2_QUERY_BYTES, V2_QUERY_SHA256),
        ("v3", V3_QUERY_BYTES, V3_QUERY_SHA256),
    ):
        try:
            _file_digest(
                path,
                expected_bytes=expected_bytes,
                expected_sha256=expected_sha256,
            )
            return kind
        except ReplaceError:
            pass
    raise ReplaceError("installed_generation_unrecognized:" + name)


def _classify_state(
    query_kind: str,
    stage_kind: str,
    v1_predecessor_kind: str,
    v2_predecessor_kind: str,
    entries: list[str],
) -> str:
    expected_entries = {
        READY_STATE: sorted(
            (PREEXEC_NAME, QUERY_NAME, V1_PREDECESSOR_NAME)
        ),
        STAGED_STATE: sorted(
            (PREEXEC_NAME, QUERY_NAME, V1_PREDECESSOR_NAME, STAGING_NAME)
        ),
        EXCHANGED_STATE: sorted(
            (PREEXEC_NAME, QUERY_NAME, V1_PREDECESSOR_NAME, STAGING_NAME)
        ),
        GREEN_STATE: sorted(
            (
                PREEXEC_NAME,
                QUERY_NAME,
                V1_PREDECESSOR_NAME,
                V2_PREDECESSOR_NAME,
            )
        ),
        ROLLBACK_PENDING_STATE: sorted(
            (
                PREEXEC_NAME,
                QUERY_NAME,
                V1_PREDECESSOR_NAME,
                V2_PREDECESSOR_NAME,
            )
        ),
    }
    table = {
        ("v2", "absent", "v1", "absent"): READY_STATE,
        ("v2", "v3", "v1", "absent"): STAGED_STATE,
        ("v3", "v2", "v1", "absent"): EXCHANGED_STATE,
        ("v3", "absent", "v1", "v2"): GREEN_STATE,
        ("v2", "absent", "v1", "v3"): ROLLBACK_PENDING_STATE,
    }
    state = table.get(
        (
            query_kind,
            stage_kind,
            v1_predecessor_kind,
            v2_predecessor_kind,
        )
    )
    if state is None:
        raise ReplaceError("protected_query_state_invalid")
    if entries != expected_entries[state]:
        raise ReplaceError("protected_query_root_entries_invalid")
    return state


def _base_state_at(dir_fd: int) -> str:
    entries = _root_entries_at(dir_fd)
    pending = _private_pending_names_at(dir_fd)
    if pending:
        visible = sorted(
            name for name in entries if name not in set(pending)
        )
        expected_visible = sorted(
            (PREEXEC_NAME, QUERY_NAME, V1_PREDECESSOR_NAME)
        )
        if visible != expected_visible:
            raise ReplaceError("private_pending_state_invalid")
        _file_digest(
            _fd_child_path(dir_fd, PREEXEC_NAME),
            expected_bytes=PREEXEC_BYTES,
            expected_sha256=PREEXEC_SHA256,
        )
        if _installed_kind_at(
            dir_fd, QUERY_NAME, allow_absent=False
        ) != "v2":
            raise ReplaceError(
                "private_pending_query_generation_invalid"
            )
        if _installed_kind_at(
            dir_fd, V1_PREDECESSOR_NAME, allow_absent=False
        ) != "v1":
            raise ReplaceError(
                "private_pending_v1_predecessor_invalid"
            )
        return PRIVATE_PENDING_STATE

    _file_digest(
        _fd_child_path(dir_fd, PREEXEC_NAME),
        expected_bytes=PREEXEC_BYTES,
        expected_sha256=PREEXEC_SHA256,
    )
    return _classify_state(
        _installed_kind_at(dir_fd, QUERY_NAME, allow_absent=False),
        _installed_kind_at(dir_fd, STAGING_NAME, allow_absent=True),
        _installed_kind_at(
            dir_fd, V1_PREDECESSOR_NAME, allow_absent=True
        ),
        _installed_kind_at(
            dir_fd, V2_PREDECESSOR_NAME, allow_absent=True
        ),
        entries,
    )

def _open_protected_root(lock_mode: int) -> tuple[int, int]:
    _trusted_root_directory(pathlib.Path("/"))
    _trusted_root_directory(OPT_ROOT)

    parent_fd = os.open(
        OPT_ROOT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    try:
        try:
            fcntl.flock(parent_fd, lock_mode | fcntl.LOCK_NB)
        except OSError as exc:
            raise ReplaceError("replacement_operation_in_progress") from exc

        visible_parent = OPT_ROOT.lstat()
        opened_parent = os.fstat(parent_fd)
        if (
            not stat.S_ISDIR(opened_parent.st_mode)
            or stat.S_ISLNK(visible_parent.st_mode)
            or visible_parent.st_dev != opened_parent.st_dev
            or visible_parent.st_ino != opened_parent.st_ino
            or visible_parent.st_uid != 0
            or (visible_parent.st_mode & 0o022) != 0
        ):
            raise ReplaceError("locked_parent_identity_invalid")

        dir_fd = os.open(
            INSTALL_ROOT.name,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=parent_fd,
        )
        try:
            visible = os.stat(
                INSTALL_ROOT.name,
                dir_fd=parent_fd,
                follow_symlinks=False,
            )
            opened = os.fstat(dir_fd)
            if (
                not stat.S_ISDIR(opened.st_mode)
                or stat.S_ISLNK(visible.st_mode)
                or visible.st_dev != opened.st_dev
                or visible.st_ino != opened.st_ino
                or visible.st_uid != 0
                or visible.st_gid != 0
                or stat.S_IMODE(visible.st_mode) != 0o755
                or (visible.st_mode & 0o022) != 0
            ):
                raise ReplaceError("locked_install_root_identity_invalid")
            return parent_fd, dir_fd
        except BaseException:
            os.close(dir_fd)
            raise
    except BaseException:
        os.close(parent_fd)
        raise


def _require_visible_install_root(parent_fd: int, dir_fd: int) -> None:
    try:
        visible = os.stat(
            INSTALL_ROOT.name,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        opened = os.fstat(dir_fd)
    except OSError as exc:
        raise ReplaceError("visible_install_root_revalidation_failed") from exc
    if (
        not stat.S_ISDIR(visible.st_mode)
        or stat.S_ISLNK(visible.st_mode)
        or visible.st_dev != opened.st_dev
        or visible.st_ino != opened.st_ino
        or visible.st_uid != 0
        or visible.st_gid != 0
        or stat.S_IMODE(visible.st_mode) != 0o755
        or (visible.st_mode & 0o022) != 0
    ):
        raise ReplaceError("visible_install_root_generation_changed")


def _base_state() -> str:
    parent_fd, dir_fd = _open_protected_root(fcntl.LOCK_SH)
    try:
        _require_visible_install_root(parent_fd, dir_fd)
        return _base_state_at(dir_fd)
    finally:
        os.close(dir_fd)
        os.close(parent_fd)


def source_plan() -> None:
    accepted_lock()
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("accepted_lock_id=" + LOCK_ID)
    print("installed_predecessor_lock_id=" + V2_LOCK_ID)
    print("fixed_install_root=" + str(INSTALL_ROOT))
    print("preexec_replacement=false")
    print("v1_predecessor_required=true")
    print("v1_predecessor_preserved_after_success=true")
    print("v2_predecessor_retained_after_success=true")
    print("query_atomic_exchange_required=true")
    print("automatic_failure_rollback=true")
    print("operation_directory_lock_required=true")
    print("crash_state_classification_required=true")
    print("apply_crash_resume_supported=true")
    print("rollback_crash_resume_supported=true")
    print("stable_parent_operation_lock_required=true")
    print("descriptor_bound_state_inspection_required=true")
    print("private_stage_publication_required=true")
    print("visible_install_root_generation_revalidation_required=true")
    print("query_execution=false")
    print("credential_contents_read=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("transaction=false")
    print("funds_movement=false")


def plan(query: pathlib.Path | None) -> None:
    accepted_lock()
    state = _base_state()
    candidate_verified = False
    if query is not None:
        read_exact_candidate(query)
        candidate_verified = True

    print(MARKER)
    print("mode=plan")
    print("accepted_lock_id=" + LOCK_ID)
    print("installed_predecessor_lock_id=" + V2_LOCK_ID)
    print("protected_state=" + state)
    print("candidate_query_verified=" + str(candidate_verified).lower())
    print("preexec_replacement=false")
    print("v1_predecessor_required=true")
    print("v1_predecessor_preserved_after_success=true")
    print("v2_predecessor_retained_after_success=true")
    print("query_atomic_exchange_required=true")
    print("operation_directory_lock_required=true")
    print("crash_state_classification_required=true")
    print("filesystem_write=false")
    print("query_execution=false")
    print("credential_contents_read=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("transaction=false")
    print("funds_movement=false")
    if state == GREEN_STATE:
        print("already_replaced=true")
        print("next_action=NO_MUTATION_REQUIRED")
    elif state in (STAGED_STATE, EXCHANGED_STATE):
        print("already_replaced=false")
        print("next_action=SEPARATELY_AUTHORIZE_ATOMIC_V2_TO_V3_RESUME")
    elif state == ROLLBACK_PENDING_STATE:
        print("already_replaced=false")
        print("next_action=SEPARATELY_AUTHORIZE_V3_TO_V2_ROLLBACK_RESUME")
    elif state == PRIVATE_PENDING_STATE:
        print("already_replaced=false")
        print("next_action=SEPARATELY_AUTHORIZE_V3_PRIVATE_STAGE_RECOVERY")
    else:
        print("already_replaced=false")
        print("next_action=SEPARATELY_AUTHORIZE_ATOMIC_V2_TO_V3_REPLACEMENT")


def _restore_ready_after_failed_apply(
    dir_fd: int,
    old_name: str | None,
    created_identity: tuple[int, int] | None,
) -> bool:
    try:
        if created_identity is None:
            return _base_state_at(dir_fd) == READY_STATE

        if old_name is not None and _exists(_fd_child_path(dir_fd, old_name)):
            current_is_v3 = False
            try:
                _file_digest(
                    _fd_child_path(dir_fd, QUERY_NAME),
                    expected_bytes=V3_QUERY_BYTES,
                    expected_sha256=V3_QUERY_SHA256,
                )
                _require_owned_path(
                    _fd_child_path(dir_fd, QUERY_NAME),
                    created_identity,
                )
                current_is_v3 = True
            except ReplaceError:
                current_is_v3 = False

            old_path = _fd_child_path(dir_fd, old_name)
            if current_is_v3:
                _file_digest(
                    old_path,
                    expected_bytes=V2_QUERY_BYTES,
                    expected_sha256=V2_QUERY_SHA256,
                )
                _renameat2(
                    dir_fd, QUERY_NAME, old_name, RENAME_EXCHANGE
                )
                os.fsync(dir_fd)

            _file_digest(
                _fd_child_path(dir_fd, QUERY_NAME),
                expected_bytes=V2_QUERY_BYTES,
                expected_sha256=V2_QUERY_SHA256,
            )
            _file_digest(
                _fd_child_path(dir_fd, V1_PREDECESSOR_NAME),
                expected_bytes=V1_QUERY_BYTES,
                expected_sha256=V1_QUERY_SHA256,
            )
            residue = _fd_child_path(dir_fd, old_name)
            if _exists(residue):
                _require_owned_path(residue, created_identity)
                _file_digest(
                    residue,
                    expected_bytes=V3_QUERY_BYTES,
                    expected_sha256=V3_QUERY_SHA256,
                )
                if not _unlink_owned_name(
                    dir_fd, old_name, created_identity
                ):
                    return False
        elif _exists(_fd_child_path(dir_fd, STAGING_NAME)):
            _require_owned_path(
                _fd_child_path(dir_fd, STAGING_NAME),
                created_identity,
            )
            _file_digest(
                _fd_child_path(dir_fd, STAGING_NAME),
                expected_bytes=V3_QUERY_BYTES,
                expected_sha256=V3_QUERY_SHA256,
            )
            if not _unlink_owned_name(
                dir_fd, STAGING_NAME, created_identity
            ):
                return False
        return _base_state_at(dir_fd) == READY_STATE
    except BaseException:
        return False


def apply(query: pathlib.Path, confirm: str) -> None:
    if confirm != CONFIRM_APPLY:
        raise ReplaceError("explicit_atomic_exchange_confirmation_required")
    if os.geteuid() != 0:
        raise ReplaceError("root_required_for_apply")
    _require_secure_apply_context()
    accepted_lock()
    raw = read_exact_candidate(query)

    parent_fd, dir_fd = _open_protected_root(fcntl.LOCK_EX)
    old_name: str | None = None
    created_stage_identity: tuple[int, int] | None = None
    resumed_from = "none"
    try:
        _require_visible_install_root(parent_fd, dir_fd)
        if _base_state_at(dir_fd) == PRIVATE_PENDING_STATE:
            if not _cleanup_private_pending(dir_fd):
                raise ReplaceError("private_pending_cleanup_failed")
            resumed_from = PRIVATE_PENDING_STATE
            _require_visible_install_root(parent_fd, dir_fd)
        state = _base_state_at(dir_fd)
        if state == GREEN_STATE:
            print(MARKER)
            print("mode=apply")
            print("status=ALREADY_GREEN")
            print("protected_query_replacement_performed=false")
            print("crash_recovery_resumed=false")
            print("query_execution=false")
            print("credential_contents_read=false")
            print("service_mutation=false")
            print("systemd_mutation=false")
            print("payment_acceptance=false")
            print("public_presale_activation=false")
            print("wc_void_market_activation=false")
            print("transaction=false")
            print("funds_movement=false")
            return
        if state == ROLLBACK_PENDING_STATE:
            raise ReplaceError("rollback_resume_required_before_apply")
        if state not in (READY_STATE, STAGED_STATE, EXCHANGED_STATE):
            raise ReplaceError("apply_state_not_recoverable")

        if state == READY_STATE:
            _require_visible_install_root(parent_fd, dir_fd)
            created_stage_identity = _create_exact_stage(dir_fd, raw)
            os.fsync(dir_fd)
            state = _base_state_at(dir_fd)
            if state != STAGED_STATE:
                raise ReplaceError("stage_publication_state_invalid")
        elif state == STAGED_STATE:
            read_exact_candidate(_fd_child_path(dir_fd, STAGING_NAME))
            created_stage_identity = _path_inode(
                _fd_child_path(dir_fd, STAGING_NAME)
            )
            resumed_from = STAGED_STATE

        if state == STAGED_STATE:
            old_name = STAGING_NAME
            _require_visible_install_root(parent_fd, dir_fd)
            _renameat2(
                dir_fd, STAGING_NAME, QUERY_NAME, RENAME_EXCHANGE
            )
            os.fsync(dir_fd)
            state = _base_state_at(dir_fd)
            if state != EXCHANGED_STATE:
                raise ReplaceError("exchange_state_invalid")
        elif state == EXCHANGED_STATE:
            created_stage_identity = _path_inode(
                _fd_child_path(dir_fd, QUERY_NAME)
            )
            old_name = STAGING_NAME
            resumed_from = EXCHANGED_STATE

        _file_digest(
            _fd_child_path(dir_fd, QUERY_NAME),
            expected_bytes=V3_QUERY_BYTES,
            expected_sha256=V3_QUERY_SHA256,
        )
        _require_owned_path(
            _fd_child_path(dir_fd, QUERY_NAME),
            created_stage_identity,
        )
        _file_digest(
            _fd_child_path(dir_fd, STAGING_NAME),
            expected_bytes=V2_QUERY_BYTES,
            expected_sha256=V2_QUERY_SHA256,
        )
        _file_digest(
            _fd_child_path(dir_fd, V1_PREDECESSOR_NAME),
            expected_bytes=V1_QUERY_BYTES,
            expected_sha256=V1_QUERY_SHA256,
        )
        _file_digest(
            _fd_child_path(dir_fd, PREEXEC_NAME),
            expected_bytes=PREEXEC_BYTES,
            expected_sha256=PREEXEC_SHA256,
        )

        _require_visible_install_root(parent_fd, dir_fd)
        _renameat2(
            dir_fd,
            STAGING_NAME,
            V2_PREDECESSOR_NAME,
            RENAME_NOREPLACE,
        )
        old_name = V2_PREDECESSOR_NAME
        os.fsync(dir_fd)

        _require_visible_install_root(parent_fd, dir_fd)
        if _base_state_at(dir_fd) != GREEN_STATE:
            raise ReplaceError("post_exchange_state_invalid")
    except BaseException:
        rollback_green = _restore_ready_after_failed_apply(
            dir_fd, old_name, created_stage_identity
        )
        print("automatic_rollback_attempted=true")
        print("automatic_rollback_green=" + str(rollback_green).lower())
        raise
    finally:
        os.close(dir_fd)
        os.close(parent_fd)

    print(MARKER)
    print("mode=apply")
    print("accepted_lock_id=" + LOCK_ID)
    print("installed_predecessor_lock_id=" + V2_LOCK_ID)
    print("protected_query_replacement_performed=true")
    print("atomic_exchange=true")
    print("operation_directory_lock_held=true")
    print("crash_recovery_resumed=" + str(resumed_from != "none").lower())
    print("crash_recovery_initial_state=" + resumed_from)
    print("preexec_replacement=false")
    print("installed_query_sha256=" + V3_QUERY_SHA256)
    print("installed_query_bytes=" + str(V3_QUERY_BYTES))
    print("v1_predecessor_preserved=true")
    print("v2_predecessor_retained=true")
    print("query_execution=false")
    print("credential_contents_read=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("transaction=false")
    print("funds_movement=false")
    print("next_action=V3_INSTALLED_READ_ONLY_QUALIFICATION")


def rollback(confirm: str) -> None:
    if confirm != CONFIRM_ROLLBACK:
        raise ReplaceError("explicit_rollback_confirmation_required")
    if os.geteuid() != 0:
        raise ReplaceError("root_required_for_rollback")
    _require_secure_apply_context()
    accepted_lock()

    parent_fd, dir_fd = _open_protected_root(fcntl.LOCK_EX)
    resumed_from = "none"
    try:
        _require_visible_install_root(parent_fd, dir_fd)
        if _base_state_at(dir_fd) == PRIVATE_PENDING_STATE:
            if not _cleanup_private_pending(dir_fd):
                raise ReplaceError("private_pending_cleanup_failed")
            resumed_from = PRIVATE_PENDING_STATE
            _require_visible_install_root(parent_fd, dir_fd)
        state = _base_state_at(dir_fd)
        if state == READY_STATE:
            print(MARKER)
            print("mode=rollback")
            print("status=ALREADY_V2_READY")
            print(
                "crash_recovery_resumed="
                + str(resumed_from != "none").lower()
            )
            print("crash_recovery_initial_state=" + resumed_from)
            print("v1_predecessor_preserved=true")
            print("query_execution=false")
            print("credential_contents_read=false")
            print("service_mutation=false")
            print("systemd_mutation=false")
            print("payment_acceptance=false")
            print("public_presale_activation=false")
            print("wc_void_market_activation=false")
            print("transaction=false")
            print("funds_movement=false")
            return

        if state == STAGED_STATE:
            _require_visible_install_root(parent_fd, dir_fd)
            _file_digest(
                _fd_child_path(dir_fd, STAGING_NAME),
                expected_bytes=V3_QUERY_BYTES,
                expected_sha256=V3_QUERY_SHA256,
            )
            os.unlink(STAGING_NAME, dir_fd=dir_fd)
            os.fsync(dir_fd)
            resumed_from = STAGED_STATE
        elif state == EXCHANGED_STATE:
            _require_visible_install_root(parent_fd, dir_fd)
            _renameat2(
                dir_fd, QUERY_NAME, STAGING_NAME, RENAME_EXCHANGE
            )
            os.fsync(dir_fd)
            _file_digest(
                _fd_child_path(dir_fd, QUERY_NAME),
                expected_bytes=V2_QUERY_BYTES,
                expected_sha256=V2_QUERY_SHA256,
            )
            _file_digest(
                _fd_child_path(dir_fd, STAGING_NAME),
                expected_bytes=V3_QUERY_BYTES,
                expected_sha256=V3_QUERY_SHA256,
            )
            os.unlink(STAGING_NAME, dir_fd=dir_fd)
            os.fsync(dir_fd)
            resumed_from = EXCHANGED_STATE
        elif state == GREEN_STATE:
            _require_visible_install_root(parent_fd, dir_fd)
            _renameat2(
                dir_fd,
                QUERY_NAME,
                V2_PREDECESSOR_NAME,
                RENAME_EXCHANGE,
            )
            os.fsync(dir_fd)
            state = _base_state_at(dir_fd)
            if state != ROLLBACK_PENDING_STATE:
                raise ReplaceError("rollback_exchange_state_invalid")
            _file_digest(
                _fd_child_path(dir_fd, V2_PREDECESSOR_NAME),
                expected_bytes=V3_QUERY_BYTES,
                expected_sha256=V3_QUERY_SHA256,
            )
            os.unlink(V2_PREDECESSOR_NAME, dir_fd=dir_fd)
            os.fsync(dir_fd)
        elif state == ROLLBACK_PENDING_STATE:
            _require_visible_install_root(parent_fd, dir_fd)
            _file_digest(
                _fd_child_path(dir_fd, V2_PREDECESSOR_NAME),
                expected_bytes=V3_QUERY_BYTES,
                expected_sha256=V3_QUERY_SHA256,
            )
            os.unlink(V2_PREDECESSOR_NAME, dir_fd=dir_fd)
            os.fsync(dir_fd)
            resumed_from = ROLLBACK_PENDING_STATE
        else:
            raise ReplaceError("rollback_state_not_recoverable")

        _require_visible_install_root(parent_fd, dir_fd)
        if _base_state_at(dir_fd) != READY_STATE:
            raise ReplaceError("rollback_post_state_invalid")
    finally:
        os.close(dir_fd)
        os.close(parent_fd)

    print(MARKER)
    print("mode=rollback")
    print("status=ROLLBACK_GREEN")
    print("operation_directory_lock_held=true")
    print("crash_recovery_resumed=" + str(resumed_from != "none").lower())
    print("crash_recovery_initial_state=" + resumed_from)
    print("v2_query_restored=true")
    print("v3_query_removed=true")
    print("v1_predecessor_preserved=true")
    print("preexec_replacement=false")
    print("query_execution=false")
    print("credential_contents_read=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("transaction=false")
    print("funds_movement=false")


def self_test() -> None:
    lock = accepted_lock()
    assert lock["candidate_accepted"] is True
    assert lock["replacement_authorized"] is False
    assert lock["live_query_authorized"] is False
    assert lock["credential_contents_read"] is False
    assert PREEXEC_TARGET.parent == QUERY_TARGET.parent == INSTALL_ROOT
    assert V1_PREDECESSOR_TARGET.parent == INSTALL_ROOT
    assert V2_PREDECESSOR_TARGET.parent == INSTALL_ROOT
    assert STAGING_TARGET.parent == INSTALL_ROOT
    assert PREEXEC_SHA256 != V1_QUERY_SHA256
    assert V1_QUERY_SHA256 != V2_QUERY_SHA256
    assert V2_QUERY_SHA256 != V3_QUERY_SHA256
    assert V2_QUERY_BYTES == V3_QUERY_BYTES

    names_ready = sorted(
        (PREEXEC_NAME, QUERY_NAME, V1_PREDECESSOR_NAME)
    )
    names_stage = sorted(
        (
            PREEXEC_NAME,
            QUERY_NAME,
            V1_PREDECESSOR_NAME,
            STAGING_NAME,
        )
    )
    names_green = sorted(
        (
            PREEXEC_NAME,
            QUERY_NAME,
            V1_PREDECESSOR_NAME,
            V2_PREDECESSOR_NAME,
        )
    )
    assert _classify_state(
        "v2", "absent", "v1", "absent", names_ready
    ) == READY_STATE
    assert _classify_state(
        "v2", "v3", "v1", "absent", names_stage
    ) == STAGED_STATE
    assert _classify_state(
        "v3", "v2", "v1", "absent", names_stage
    ) == EXCHANGED_STATE
    assert _classify_state(
        "v3", "absent", "v1", "v2", names_green
    ) == GREEN_STATE
    assert _classify_state(
        "v2", "absent", "v1", "v3", names_green
    ) == ROLLBACK_PENDING_STATE
    try:
        _classify_state(
            "v2", "v3", "v1", "v2",
            names_stage + [V2_PREDECESSOR_NAME],
        )
    except ReplaceError as exc:
        assert str(exc) == "protected_query_state_invalid"
    else:
        raise AssertionError("invalid_crash_state_unexpectedly_admitted")

    with tempfile.TemporaryDirectory(
        prefix="void-credential-query-v3-lock-and-crash-"
    ) as raw:
        root = pathlib.Path(raw)
        query = root / "query"
        stage = root / "stage"
        v1_predecessor = root / "v1-predecessor"
        v2_predecessor = root / "v2-predecessor"
        query.write_bytes(b"V2")
        stage.write_bytes(b"V3")
        v1_predecessor.write_bytes(b"V1")
        first_fd = os.open(
            root, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
        )
        second_fd = os.open(
            root, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
        )
        try:
            fcntl.flock(first_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            try:
                fcntl.flock(
                    second_fd, fcntl.LOCK_EX | fcntl.LOCK_NB
                )
            except OSError:
                pass
            else:
                raise AssertionError(
                    "second_operation_lock_unexpectedly_acquired"
                )

            _renameat2(
                first_fd, "stage", "query", RENAME_EXCHANGE
            )
            os.fsync(first_fd)
            assert query.read_bytes() == b"V3"
            assert stage.read_bytes() == b"V2"
            assert v1_predecessor.read_bytes() == b"V1"

            _renameat2(
                first_fd, "stage", "v2-predecessor", RENAME_NOREPLACE
            )
            os.fsync(first_fd)
            assert query.read_bytes() == b"V3"
            assert v2_predecessor.read_bytes() == b"V2"
            assert v1_predecessor.read_bytes() == b"V1"

            _renameat2(
                first_fd, "query", "v2-predecessor", RENAME_EXCHANGE
            )
            os.fsync(first_fd)
            assert query.read_bytes() == b"V2"
            assert v2_predecessor.read_bytes() == b"V3"
            assert v1_predecessor.read_bytes() == b"V1"
            os.unlink("v2-predecessor", dir_fd=first_fd)
            os.fsync(first_fd)
            assert query.read_bytes() == b"V2"
            assert v1_predecessor.read_bytes() == b"V1"
            assert not v2_predecessor.exists()
        finally:
            os.close(second_fd)
            os.close(first_fd)

    with tempfile.TemporaryDirectory(
        prefix="void-credential-query-v3-owned-cleanup-"
    ) as raw:
        root = pathlib.Path(raw)
        stage = root / "stage"
        stage.write_bytes(b"owned")
        dir_fd = os.open(
            root, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
        )
        try:
            owned = _inode_identity(stage.lstat())
            foreign = (owned[0], owned[1] + 1)
            assert _unlink_owned_name(dir_fd, "stage", foreign) is False
            assert stage.read_bytes() == b"owned"
            assert _unlink_owned_name(dir_fd, "stage", owned) is True
            assert not stage.exists()
        finally:
            os.close(dir_fd)

    with tempfile.TemporaryDirectory(
        prefix="void-credential-query-v3-renameat2-"
    ) as raw:
        root = pathlib.Path(raw)
        a = root / "a"
        b = root / "b"
        a.write_bytes(b"A")
        b.write_bytes(b"B")
        dir_fd = os.open(
            root, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
        )
        try:
            _renameat2(dir_fd, "a", "b", RENAME_EXCHANGE)
            assert a.read_bytes() == b"B"
            assert b.read_bytes() == b"A"
        finally:
            os.close(dir_fd)

def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--rollback", action="store_true")
    parser.add_argument("--query", type=pathlib.Path)
    parser.add_argument("--confirm", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print(MARKER + "_SELF_TEST_GREEN")
        print("renameat2_exchange_available=true")
        print("preexec_replacement=false")
        print("v1_predecessor_preserved_after_success=true")
        print("v2_predecessor_retained_after_success=true")
        print("automatic_failure_rollback=true")
        print("foreign_stage_cleanup_rejected=true")
        print("current_invocation_stage_inode_bound=true")
        print("operation_directory_lock_required=true")
        print("crash_state_classifier_complete=true")
        print("apply_crash_resume_supported=true")
        print("rollback_crash_resume_supported=true")
        print("operation_lock_exclusivity_exercised=true")
        print("crash_transition_primitives_exercised=true")
        print("stable_parent_operation_lock=true")
        print("descriptor_bound_state_inspection=true")
        print("private_stage_published_only_after_complete=true")
        print("visible_install_root_generation_revalidation=true")
        print("query_execution=false")
        print("credential_contents_read=false")
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if args.plan:
        plan(args.query)
        return 0
    if args.apply:
        if args.query is None:
            raise ReplaceError("query_candidate_required")
        apply(args.query, args.confirm)
        return 0
    rollback(args.confirm)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ReplaceError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("query_execution=false")
        print("credential_contents_read=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("transaction=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
