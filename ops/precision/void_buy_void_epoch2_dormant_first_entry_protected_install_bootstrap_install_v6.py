#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import fcntl
import resource
import selectors
import signal
import time
import hashlib
import json
import os
import pathlib
import re
import stat
import subprocess
import sys
import tempfile
from typing import Any

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6"
)
PLAN_SCHEMA = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_plan_v6"
)
POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6"
)
CONFIRM_TOKEN = (
    "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_BOOTSTRAP_V6_CREATE_ONLY"
)
PLAN_PREFIX = "voidbuye2bootstrapinstall6_"

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
)
LOCK_BYTES = 4550
LOCK_SHA256 = "8d10c909c88e56b81f3c42abe5195bbf7d3f9cbc95053ea555387a76084fdd71"
LOCK_GIT_BLOB_SHA1 = "f2ce1364dd776bfbf1aa1ef59ce999cb46037b73"
LOCK_ID = (
    "voidbuye2dormantbootstraplock3_"
    "4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"
)
CANDIDATE_ID = (
    "voidbuye2dormantbootstrapcand3_"
    "1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
)

MANIFEST_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
)
MANIFEST_GIT_BLOB_SHA1 = "de56bacb30bea0adc418e240cf3fb8d900b061ef"
MANIFEST_BYTES = 2382
MANIFEST_SHA256 = (
    "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9"
)

BOOTSTRAP_BYTES = 874_608
BOOTSTRAP_SHA256 = (
    "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"
)
BOOTSTRAP_GIT_BLOB_SHA1 = "b577d70666f98ac59a75b84b3dab741fe7b93a4b"

FIXED_CHECKOUT = pathlib.Path("/home/zoso/dev/void-node")
FIXED_GIT = pathlib.Path("/usr/bin/git")
FIXED_PYTHON = pathlib.Path("/usr/bin/python3")
INSTALL_PARENT = pathlib.Path("/opt")
INSTALL_NAME = (
    "void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v6"
)
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
STAGE_NAME = "." + INSTALL_NAME + ".stage"
STAGE_ROOT = INSTALL_PARENT / STAGE_NAME
BIN_DIR = "bin"
BOOTSTRAP_NAME = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v6"
)
MANIFEST_NAME = "source-generation-v3.conf"
POLICY_NAME = "policy-v1.conf"

READY_STATE = "PROTECTED_BOOTSTRAP_V6_ROOT_ABSENT_READY_FOR_CREATE_ONLY"
GREEN_STATE = "PROTECTED_BOOTSTRAP_V6_ROOT_GREEN"

MAX_READ_CHUNK = 1024 * 1024
MAX_PYTHON_BYTES = 512 * 1024 * 1024
MAX_GIT_BYTES = 64 * 1024 * 1024
RENAME_NOREPLACE = 1
HEX40 = re.compile(r"^[0-9a-f]{40}$")

FORBIDDEN_APPLY_ENV = (
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "LD_AUDIT",
    "LD_DEBUG",
    "GLIBC_TUNABLES",
    "PYTHONPATH",
    "PYTHONHOME",
)


class InstallError(RuntimeError):
    pass


def _failure_reason(exc: BaseException | None) -> str:
    if exc is None:
        return "none"
    try:
        reason = str(exc)
    except BaseException:
        reason = "exception_reason_unavailable"
    # Terminal facts occupy one bounded line, even for an unexpected exception.
    return reason.encode("unicode_escape").decode("ascii")[:1024]


class InstallTerminalError(InstallError):
    def __init__(
        self,
        *,
        published: bool | None,
        phase: str,
        parent_fsync_completed: bool,
        final_verification_completed: bool,
        cleanup_attempted: bool,
        cleanup_completed: bool,
        original_failure: BaseException | None,
        cleanup_failure: BaseException | None,
        close_failure: BaseException | None,
        reconciliation_attempted: bool = False,
        reconciliation_failure: BaseException | None = None,
    ) -> None:
        self.facts = {
            "publication": "unknown" if published is None else str(published).lower(),
            "publication_state": (
                "unknown_needs_inspection" if published is None
                else "published_needs_inspection" if published else "not_published"
            ),
            "failure_phase": phase,
            "publication_reconciliation_attempted": str(reconciliation_attempted).lower(),
            "parent_fsync_completed": str(parent_fsync_completed).lower(),
            "final_verification_completed": str(final_verification_completed).lower(),
            "prepublication_cleanup_attempted": str(cleanup_attempted).lower(),
            "prepublication_cleanup_completed": str(cleanup_completed).lower(),
            "install_parent_close_completed": str(close_failure is None).lower(),
        }
        for name, failure in (
            ("original", original_failure),
            ("cleanup", cleanup_failure),
            ("close", close_failure),
            ("reconciliation", reconciliation_failure),
        ):
            self.facts[name + "_failure_class"] = (
                failure.__class__.__name__ if failure is not None else "none"
            )
            self.facts[name + "_failure_reason"] = _failure_reason(failure)
        super().__init__(
            self.facts["publication_state"]
            + ":"
            + phase
            + ":"
            + self.facts["original_failure_reason"]
        )


class PublishedInstallError(InstallTerminalError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def canonical_json(value: Any) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def _same_stat(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_mode == b.st_mode
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_nlink == b.st_nlink
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
    )


def _trusted_directory(path: pathlib.Path, exact_mode: int | None = None) -> os.stat_result:
    try:
        st = path.lstat()
    except OSError as exc:
        raise InstallError("trusted_directory_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or (st.st_mode & 0o022) != 0
    ):
        raise InstallError("trusted_directory_invalid:" + str(path))
    if exact_mode is not None and stat.S_IMODE(st.st_mode) != exact_mode:
        raise InstallError("trusted_directory_mode_invalid:" + str(path))
    return st


def _root_ancestry(path: pathlib.Path) -> None:
    real = pathlib.Path(os.path.realpath(path))
    current = pathlib.Path("/")
    _trusted_directory(current)
    for part in real.parent.parts[1:]:
        current = current / part
        _trusted_directory(current)


def _read_exact_path(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_git_blob: str | None,
    expected_mode: int,
    require_root_owner: bool,
) -> tuple[bytes, dict[str, Any]]:
    raw_path = str(path)
    if not path.is_absolute() or os.path.normpath(raw_path) != raw_path:
        raise InstallError("input_path_not_normalized_absolute:" + raw_path)
    try:
        before = path.lstat()
    except OSError as exc:
        raise InstallError("input_unavailable:" + raw_path) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size != expected_bytes
        or stat.S_IMODE(before.st_mode) != expected_mode
    ):
        raise InstallError("input_metadata_invalid:" + raw_path)
    if require_root_owner and (before.st_uid != 0 or before.st_gid != 0):
        raise InstallError("input_owner_invalid:" + raw_path)
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise InstallError("input_rebound:" + raw_path)
        digest = hashlib.sha256()
        data = bytearray()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("input_short_read:" + raw_path)
            data.extend(chunk)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("input_grew:" + raw_path)
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise InstallError("input_changed:" + raw_path)
    finally:
        os.close(fd)
    raw = bytes(data)
    if digest.hexdigest() != expected_sha256:
        raise InstallError("input_sha256_mismatch:" + raw_path)
    if expected_git_blob is not None and git_blob_sha1(raw) != expected_git_blob:
        raise InstallError("input_git_blob_mismatch:" + raw_path)
    return raw, {
        "path": raw_path,
        "dev": before.st_dev,
        "ino": before.st_ino,
        "uid": before.st_uid,
        "gid": before.st_gid,
        "mode": format(stat.S_IMODE(before.st_mode), "04o"),
        "nlink": before.st_nlink,
        "bytes": before.st_size,
        "mtime_ns": before.st_mtime_ns,
        "ctime_ns": before.st_ctime_ns,
        "sha256": expected_sha256,
        "git_blob_sha1": expected_git_blob,
    }


def _tool_snapshot(fixed: pathlib.Path, maximum_bytes: int) -> dict[str, Any]:
    try:
        alias = fixed.lstat()
    except OSError as exc:
        raise InstallError("tool_alias_unavailable:" + str(fixed)) from exc
    if (
        alias.st_uid != 0
        or alias.st_gid != 0
        or (stat.S_ISREG(alias.st_mode) and (alias.st_mode & 0o022) != 0)
        or (not stat.S_ISREG(alias.st_mode) and not stat.S_ISLNK(alias.st_mode))
    ):
        raise InstallError("tool_alias_invalid:" + str(fixed))
    real = pathlib.Path(os.path.realpath(fixed))
    _root_ancestry(real)
    try:
        before = real.lstat()
    except OSError as exc:
        raise InstallError("tool_target_unavailable:" + str(fixed)) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or (before.st_mode & 0o022) != 0
        or (before.st_mode & 0o111) == 0
        or before.st_nlink < 1
        or before.st_size < 1
        or before.st_size > maximum_bytes
    ):
        raise InstallError("tool_target_invalid:" + str(fixed))
    fd = os.open(real, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise InstallError("tool_target_rebound:" + str(fixed))
        digest = hashlib.sha256()
        remaining = before.st_size
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("tool_target_short_read:" + str(fixed))
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("tool_target_grew:" + str(fixed))
        after = os.fstat(fd)
        visible = real.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise InstallError("tool_target_changed:" + str(fixed))
    finally:
        os.close(fd)
    if not _same_stat(alias, fixed.lstat()) or pathlib.Path(os.path.realpath(fixed)) != real:
        raise InstallError("tool_alias_changed:" + str(fixed))
    return {
        "fixed": str(fixed),
        "realpath": str(real),
        "bytes": before.st_size,
        "sha256": digest.hexdigest(),
        "uid": before.st_uid,
        "gid": before.st_gid,
        "mode": format(stat.S_IMODE(before.st_mode), "04o"),
    }








GIT_BOUNDARY_POLICY = "private_metadata_pinned_objects_raw_checkout_outer_v6"
GIT_MAX_ENTRIES = 100_000
GIT_MAX_LIST_BYTES = 64 * 1024 * 1024
GIT_MAX_PATH_BYTES = 4096
GIT_MAX_TREE_DEPTH = 32
GIT_OBJECT_BATCH_SIZE = 64
GIT_MAX_LOOSE_FILE_BYTES = 256 * 1024 * 1024
GIT_MAX_LOOSE_TOTAL_BYTES = 512 * 1024 * 1024
GIT_MAX_TRACKED_FILE_BYTES = 512 * 1024 * 1024
GIT_MAX_TRACKED_TOTAL_BYTES = 4 * 1024 * 1024 * 1024
GIT_MAX_PACK_PAIRS = 128
GIT_MAX_PACK_BYTES = 8 * 1024 * 1024 * 1024
GIT_MAX_PACK_TOTAL_BYTES = 32 * 1024 * 1024 * 1024
GIT_WITNESS_SECONDS = 180
GIT_COMMAND_SECONDS = 20
GIT_CHILD_ADDRESS_SPACE_BYTES = 2 * 1024 * 1024 * 1024
GIT_CHILD_CPU_SECONDS = 20
# Stable Linux fcntl ABI, including Python builds that omit the symbolic names.
GIT_F_ADD_SEALS = 1033
GIT_F_GET_SEALS = 1034
GIT_INDEX_SEALS = 0x0001 | 0x0002 | 0x0004 | 0x0008
_GIT_PRIVATE_ACTIVE = 0
_GIT_PRIVATE_MUTATION_PERFORMED = False
_GIT_PRIVATE_CLEANUP_FAILED = False
GIT_PRIVATE_CONFIG = (
    b"[core]\n"
    b"repositoryFormatVersion = 0\n"
    b"bare = false\n"
    b"fileMode = true\n"
    b"logAllRefUpdates = false\n"
    b"fsmonitor = false\n"
    b"hooksPath = /dev/null\n"
    b"attributesFile = /dev/null\n"
    b"excludesFile = /dev/null\n"
    b"untrackedCache = false\n"
    b"splitIndex = false\n"
    b"autocrlf = false\n"
    b"packedGitWindowSize = 16m\n"
    b"packedGitLimit = 256m\n"
    b"[index]\nthreads = 1\n"
    b"[pack]\nthreads = 1\n"
    b"[gc]\nauto = 0\n"
    b"[maintenance]\nauto = false\n"
)


def _git_child_limits() -> None:
    """Only Popen's child applies these limits; preserve any stricter inherited limit."""
    for which, configured in (
        (resource.RLIMIT_AS, GIT_CHILD_ADDRESS_SPACE_BYTES),
        (resource.RLIMIT_CPU, GIT_CHILD_CPU_SECONDS),
        (resource.RLIMIT_CORE, 0),
    ):
        soft, hard = resource.getrlimit(which)
        target = configured
        if hard != resource.RLIM_INFINITY:
            target = min(target, hard)
        if soft != resource.RLIM_INFINITY:
            target = min(target, soft)
        resource.setrlimit(which, (target, target))


class _RepositorySnapshot:
    """Read a fixed checkout without giving its Git metadata execution authority."""

    def __init__(self, expected_head: str) -> None:
        if not isinstance(expected_head, str) or HEX40.fullmatch(expected_head) is None:
            raise InstallError("expected_head_invalid")
        self.expected_head = expected_head
        self.deadline = time.monotonic() + GIT_WITNESS_SECONDS
        self._fds: list[int] = []
        self._pass_fds: list[int] = []
        self._directory_checks: list[tuple[int, str, int, os.stat_result, bool]] = []
        self._file_checks: list[tuple[int, str, os.stat_result, int | None]] = []
        self._absent_checks: list[tuple[int, str]] = []
        self._work_files: dict[bytes, os.stat_result] = {}
        self._work_dirs: dict[bytes, os.stat_result] = {}
        self._temporary: Any = None
        self._private_started = False
        self._closed = False
        self.tree = ""
        self.entries: dict[bytes, tuple[bytes, str]] = {}
        self._entry_path_bytes = 0
        self._tracked_bytes = 0


    def _retain_git_execution(self) -> None:
        # This outer reader admits the fixed host tool directly. It does not
        # inherit or manufacture the inner installer's native-parent authority.
        global _GIT_PRIVATE_ACTIVE, _GIT_PRIVATE_MUTATION_PERFORMED
        _require_secure_apply_context()
        if signal.getsignal(signal.SIGCHLD) != signal.SIG_DFL:
            raise InstallError("git_child_wait_disposition_unsupported")
        self._git_owner = (os.geteuid(), os.getegid())
        self.git_tool = _tool_snapshot(FIXED_GIT, MAX_GIT_BYTES)
        real = pathlib.Path(self.git_tool["realpath"])
        self._git_tool_directories = []

        def parent_fd(path: pathlib.Path) -> int:
            if not path.is_absolute() or ".." in path.parts:
                raise InstallError("git_tool_parent_path_invalid")
            current = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
            self._fds.append(current)
            root_state = os.fstat(current)
            visible_root = os.lstat("/")
            if not _same_stat(root_state, visible_root):
                raise InstallError("git_tool_root_rebound")
            self._git_tool_directories.append((None, "/", current, root_state))
            for part in path.parts[1:]:
                previous = current
                current = self._directory(previous, part, strict=False)
                state = os.fstat(current)
                self._git_tool_directories.append((previous, part, current, state))
            for _, _, descriptor, state in self._git_tool_directories:
                if (not stat.S_ISDIR(state.st_mode) or state.st_uid != 0
                        or state.st_gid != 0 or state.st_mode & 0o022):
                    raise InstallError("git_tool_parent_not_root_custodied")
                if not self._directory_identity(state, os.fstat(descriptor)):
                    raise InstallError("git_tool_parent_rebound")
            return current

        self._git_alias_parent_fd = parent_fd(FIXED_GIT.parent)
        self._git_target_parent_fd = parent_fd(real.parent)
        alias = os.stat(FIXED_GIT.name, dir_fd=self._git_alias_parent_fd, follow_symlinks=False)
        if (alias.st_uid != 0 or alias.st_gid != 0
                or not (stat.S_ISREG(alias.st_mode) or stat.S_ISLNK(alias.st_mode))
                or (stat.S_ISREG(alias.st_mode) and (alias.st_mode & 0o022 or not alias.st_mode & 0o111))):
            raise InstallError("git_tool_alias_invalid")
        if pathlib.Path(os.path.realpath(FIXED_GIT)) != real:
            raise InstallError("git_tool_alias_changed")
        target = os.stat(real.name, dir_fd=self._git_target_parent_fd, follow_symlinks=False)
        if (not stat.S_ISREG(target.st_mode) or target.st_uid != 0 or target.st_gid != 0
                or target.st_mode & 0o022 or not target.st_mode & 0o111
                or target.st_nlink < 1 or not 0 < target.st_size <= MAX_GIT_BYTES
                or target.st_size != self.git_tool["bytes"]
                or format(stat.S_IMODE(target.st_mode), "04o") != self.git_tool["mode"]):
            raise InstallError("git_tool_target_invalid")
        source = os.open(real.name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
                         dir_fd=self._git_target_parent_fd)
        self._fds.append(source)
        if not _same_stat(target, os.fstat(source)):
            raise InstallError("git_tool_target_rebound")
        execution = os.memfd_create("void-bootstrap-install-git-v6",
                                    flags=os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING)
        self._fds.append(execution)
        self._pass_fds.append(execution)
        self._private_started = True
        _GIT_PRIVATE_ACTIVE += 1
        _GIT_PRIVATE_MUTATION_PERFORMED = True
        digest = hashlib.sha256()
        remaining = target.st_size
        while remaining:
            self._time()
            chunk = os.read(source, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("git_tool_snapshot_short_read")
            self._write_all(execution, chunk)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(source, 1) or not _same_stat(target, os.fstat(source)):
            raise InstallError("git_tool_snapshot_changed")
        if digest.hexdigest() != self.git_tool["sha256"]:
            raise InstallError("git_tool_snapshot_digest_mismatch")
        os.fchmod(execution, 0o500)
        os.lseek(execution, 0, os.SEEK_SET)
        fcntl.fcntl(execution, GIT_F_ADD_SEALS, GIT_INDEX_SEALS)
        self._git_source_fd = source
        self._git_execution_fd = execution
        self._git_execution_state = os.fstat(execution)
        self._git_alias_state = alias
        self._git_target_state = target
        self._git_target_path = real
        self._check_git_execution()


    def _check_git_execution(self) -> None:
        if ((os.geteuid(), os.getegid()) != self._git_owner
                or signal.getsignal(signal.SIGCHLD) != signal.SIG_DFL):
            raise InstallError("git_execution_context_changed")
        for parent, name, descriptor, before in self._git_tool_directories:
            visible = os.stat(name, dir_fd=parent, follow_symlinks=False)
            if (not self._directory_identity(before, os.fstat(descriptor))
                    or not self._directory_identity(before, visible)):
                raise InstallError("git_tool_parent_changed")
        alias = os.stat(FIXED_GIT.name, dir_fd=self._git_alias_parent_fd, follow_symlinks=False)
        target = os.stat(self._git_target_path.name, dir_fd=self._git_target_parent_fd,
                         follow_symlinks=False)
        if (not _same_stat(self._git_alias_state, alias)
                or pathlib.Path(os.path.realpath(FIXED_GIT)) != self._git_target_path
                or not _same_stat(self._git_target_state, target)
                or not _same_stat(self._git_target_state, os.fstat(self._git_source_fd))):
            raise InstallError("git_tool_visible_generation_changed")
        current = os.fstat(self._git_execution_fd)
        seals = fcntl.fcntl(self._git_execution_fd, GIT_F_GET_SEALS)
        if (not stat.S_ISREG(current.st_mode) or stat.S_IMODE(current.st_mode) != 0o500
                or (current.st_uid, current.st_gid) != self._git_owner
                or current.st_nlink != 0 or current.st_size != self.git_tool["bytes"]
                or seals & GIT_INDEX_SEALS != GIT_INDEX_SEALS
                or not _same_stat(self._git_execution_state, current)):
            raise InstallError("git_tool_sealed_generation_changed")

    def _time(self) -> None:
        if time.monotonic() >= self.deadline:
            raise InstallError("repository_witness_deadline_exceeded")

    def _names(self, parent: int, maximum: int) -> list[str]:
        names: list[str] = []
        with os.scandir(parent) as entries:
            for entry in entries:
                self._time()
                if len(names) >= maximum:
                    raise InstallError("repository_directory_entry_limit")
                names.append(entry.name)
        return sorted(names)

    @staticmethod
    def _directory_identity(left: os.stat_result, right: os.stat_result) -> bool:
        return (
            left.st_dev, left.st_ino, left.st_mode, left.st_uid, left.st_gid
        ) == (
            right.st_dev, right.st_ino, right.st_mode, right.st_uid, right.st_gid
        )

    @staticmethod
    def _lstat(parent: int, name: str | bytes) -> os.stat_result | None:
        try:
            return os.stat(name, dir_fd=parent, follow_symlinks=False)
        except FileNotFoundError:
            return None

    def _directory(self, parent: int, name: str, *, strict: bool = True) -> int:
        self._time()
        before = self._lstat(parent, name)
        if before is None or not stat.S_ISDIR(before.st_mode):
            raise InstallError("repository_directory_layout_unsupported")
        fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                     dir_fd=parent)
        self._fds.append(fd)
        opened = os.fstat(fd)
        visible = self._lstat(parent, name)
        if visible is None or not _same_stat(before, opened) or not _same_stat(opened, visible):
            raise InstallError("repository_directory_rebound")
        self._directory_checks.append((parent, name, fd, opened, strict))
        return fd

    def _absent(self, parent: int, name: str) -> None:
        if self._lstat(parent, name) is not None:
            raise InstallError("repository_layout_feature_unsupported")
        self._absent_checks.append((parent, name))

    def _source_file(
        self, parent: int, name: str, maximum: int, *, keep_open: bool = False
    ) -> tuple[int, os.stat_result]:
        self._time()
        before = self._lstat(parent, name)
        if (
            before is None or not stat.S_ISREG(before.st_mode)
            or before.st_size < 0 or before.st_size > maximum
        ):
            raise InstallError("repository_input_file_invalid")
        fd = os.open(name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
                     dir_fd=parent)
        try:
            opened = os.fstat(fd)
            visible = self._lstat(parent, name)
            if (
                visible is None or not _same_stat(before, opened)
                or not _same_stat(opened, visible)
            ):
                raise InstallError("repository_input_file_rebound")
            self._file_checks.append((parent, name, opened, fd if keep_open else None))
            if keep_open:
                self._fds.append(fd)
                self._pass_fds.append(fd)
            return fd, opened
        except BaseException:
            os.close(fd)
            raise

    def _read_source(self, parent: int, name: str, maximum: int) -> bytes:
        fd, opened = self._source_file(parent, name, maximum)
        try:
            raw = bytearray()
            while len(raw) < opened.st_size:
                self._time()
                part = os.read(fd, min(MAX_READ_CHUNK, opened.st_size - len(raw)))
                if not part:
                    raise InstallError("repository_input_short_read")
                raw.extend(part)
            if os.read(fd, 1) or not _same_stat(opened, os.fstat(fd)):
                raise InstallError("repository_input_changed")
            visible = self._lstat(parent, name)
            if visible is None or not _same_stat(opened, visible):
                raise InstallError("repository_input_changed")
            return bytes(raw)
        finally:
            os.close(fd)

    @staticmethod
    def _write_all(fd: int, raw: bytes) -> None:
        view = memoryview(raw)
        while view:
            count = os.write(fd, view)
            if count <= 0:
                raise InstallError("repository_private_write_failed")
            view = view[count:]

    def _private_directory(self, relative: str) -> pathlib.Path:
        path = self.private / relative
        path.mkdir(mode=0o700)
        return path

    def _private_file(self, relative: str, raw: bytes) -> None:
        fd = os.open(self.private / relative,
                     os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
                     0o600)
        try:
            self._write_all(fd, raw)
        finally:
            os.close(fd)

    def _index_snapshot(self, raw: bytes) -> None:
        global _GIT_PRIVATE_ACTIVE, _GIT_PRIVATE_MUTATION_PERFORMED
        if len(raw) < 32 or raw[:4] != b"DIRC":
            raise InstallError("repository_index_invalid")
        if int.from_bytes(raw[4:8], "big") != 2:
            raise InstallError("repository_index_version_unsupported")
        count = int.from_bytes(raw[8:12], "big")
        if count > GIT_MAX_ENTRIES:
            raise InstallError("repository_index_entry_limit")
        if hashlib.sha1(raw[:-20]).digest() != raw[-20:]:
            raise InstallError("repository_index_checksum_invalid")
        # Git receives only ordinary stage-zero v2 entries. Parsing before
        # execution prevents split-index shared-file reads and timestamp writes;
        # dropping optional extensions also excludes cached fsmonitor/untracked
        # state. The original index is retained solely as a read-only witness.
        cursor = 12
        limit = len(raw) - 20
        previous = b""
        for _ in range(count):
            self._time()
            start = cursor
            if start + 62 >= limit:
                raise InstallError("repository_index_entry_invalid")
            flags = int.from_bytes(raw[start + 60:start + 62], "big")
            if flags & 0xF000:
                raise InstallError("repository_index_flags_unsupported")
            mode = int.from_bytes(raw[start + 24:start + 28], "big")
            if mode not in (0o100644, 0o100755, 0o120000):
                raise InstallError("repository_index_mode_unsupported")
            end = raw.find(b"\0", start + 62, min(limit, start + 62 + GIT_MAX_PATH_BYTES + 1))
            if end < 0:
                raise InstallError("repository_index_path_invalid")
            path = raw[start + 62:end]
            self._path(path)
            if path <= previous or flags & 0x0FFF != min(len(path), 0x0FFF):
                raise InstallError("repository_index_path_order_or_length_invalid")
            previous = path
            cursor = start + ((end + 1 - start + 7) // 8) * 8
            if cursor > limit or any(raw[end:cursor]):
                raise InstallError("repository_index_padding_invalid")
        entries_end = cursor
        extensions: set[bytes] = set()
        while cursor < limit:
            self._time()
            if cursor + 8 > limit:
                raise InstallError("repository_index_extension_invalid")
            signature = raw[cursor:cursor + 4]
            size = int.from_bytes(raw[cursor + 4:cursor + 8], "big")
            if (
                not 65 <= signature[0] <= 90 or signature in extensions
                or len(extensions) >= 64
            ):
                raise InstallError("repository_index_extension_unsupported")
            extensions.add(signature)
            cursor += 8 + size
            if cursor > limit:
                raise InstallError("repository_index_extension_invalid")
        normalized = raw[:entries_end]
        normalized += hashlib.sha1(normalized).digest()
        fd = os.memfd_create("void-bootstrap-install-index-v6",
                             flags=os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING)
        _GIT_PRIVATE_MUTATION_PERFORMED = True
        self._fds.append(fd)
        self._pass_fds.append(fd)
        os.fchmod(fd, 0o600)
        self._write_all(fd, normalized)
        os.lseek(fd, 0, os.SEEK_SET)
        fcntl.fcntl(fd, GIT_F_ADD_SEALS, GIT_INDEX_SEALS)
        if fcntl.fcntl(fd, GIT_F_GET_SEALS) & GIT_INDEX_SEALS != GIT_INDEX_SEALS:
            raise InstallError("repository_index_seal_failed")
        self.index_fd = fd

    def _reference_snapshot(self) -> None:
        head = self._read_source(self.git_fd, "HEAD", 256)
        if head != b"ref: refs/heads/main\n":
            raise InstallError("checkout_branch_not_main")
        refs = self._directory(self.git_fd, "refs")
        heads = self._directory(refs, "heads")
        if self._lstat(heads, "main") is not None:
            raw = self._read_source(heads, "main", 128)
            if re.fullmatch(rb"[0-9a-f]{40}\n?", raw) is None:
                raise InstallError("checkout_main_reference_invalid")
            head_oid = raw.rstrip(b"\n").decode("ascii")
        else:
            self._absent(heads, "main")
            packed = self._read_source(self.git_fd, "packed-refs", GIT_MAX_LIST_BYTES)
            seen: set[bytes] = set()
            head_oid = ""
            for line in packed.splitlines():
                self._time()
                if not line or line.startswith(b"#"):
                    continue
                if line.startswith(b"^"):
                    if re.fullmatch(rb"\^[0-9a-f]{40}", line) is None:
                        raise InstallError("repository_packed_refs_invalid")
                    continue
                match = re.fullmatch(rb"([0-9a-f]{40}) ([^\x00 \t\r\n]+)", line)
                if match is None or match[2] in seen or len(seen) >= GIT_MAX_ENTRIES:
                    raise InstallError("repository_packed_refs_invalid")
                seen.add(match[2])
                if match[2] == b"refs/heads/main":
                    head_oid = match[1].decode("ascii")
        if head_oid != self.expected_head:
            raise InstallError("checkout_head_mismatch")

    def _objects_snapshot(self) -> None:
        source = self._directory(self.git_fd, "objects")
        info = self._directory(source, "info")
        self._absent(info, "alternates")
        self._absent(info, "http-alternates")
        self._private_directory("objects")
        self._private_directory("objects/info")
        self._private_directory("objects/pack")
        names = self._names(source, 258)
        loose_total = 0
        loose_count = 0
        for name in names:
            self._time()
            if name in ("info", "pack"):
                continue
            if re.fullmatch(r"[0-9a-f]{2}", name) is None:
                raise InstallError("repository_objects_layout_unsupported")
            directory = self._directory(source, name)
            target = self._private_directory("objects/" + name)
            for suffix in self._names(directory, GIT_MAX_ENTRIES - loose_count):
                self._time()
                if re.fullmatch(r"[0-9a-f]{38}", suffix) is None:
                    raise InstallError("repository_loose_object_name_invalid")
                loose_count += 1
                if loose_count > GIT_MAX_ENTRIES:
                    raise InstallError("repository_loose_object_count_limit")
                fd, opened = self._source_file(directory, suffix, GIT_MAX_LOOSE_FILE_BYTES)
                destination = -1
                try:
                    loose_total += opened.st_size
                    if loose_total > GIT_MAX_LOOSE_TOTAL_BYTES:
                        raise InstallError("repository_loose_object_bytes_limit")
                    destination = os.open(
                        target / suffix,
                        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
                        0o600,
                    )
                    remaining = opened.st_size
                    while remaining:
                        self._time()
                        part = os.read(fd, min(MAX_READ_CHUNK, remaining))
                        if not part:
                            raise InstallError("repository_loose_object_short_read")
                        self._write_all(destination, part)
                        remaining -= len(part)
                    if os.read(fd, 1) or not _same_stat(opened, os.fstat(fd)):
                        raise InstallError("repository_loose_object_changed")
                    visible = self._lstat(directory, suffix)
                    if visible is None or not _same_stat(opened, visible):
                        raise InstallError("repository_loose_object_changed")
                finally:
                    if destination >= 0:
                        os.close(destination)
                    os.close(fd)
        pack = self._directory(source, "pack")
        pairs: dict[str, set[str]] = {}
        pack_names = self._names(pack, 2048)
        for name in pack_names:
            self._time()
            entry = self._lstat(pack, name)
            if entry is None or not stat.S_ISREG(entry.st_mode):
                raise InstallError("repository_pack_entry_invalid")
            match = re.fullmatch(r"(pack-[0-9a-f]{40})\.(pack|idx)", name)
            if match is not None:
                pairs.setdefault(match[1], set()).add(match[2])
            elif (
                re.fullmatch(r"pack-[0-9a-f]{40}\.(rev|bitmap|keep|mtimes)", name)
                is None
                and name != "multi-pack-index"
                and re.fullmatch(r"multi-pack-index-[0-9a-f]{40}\.(bitmap|rev)", name) is None
            ):
                raise InstallError("repository_pack_entry_unsupported")
        if len(pairs) > GIT_MAX_PACK_PAIRS or any(v != {"pack", "idx"} for v in pairs.values()):
            raise InstallError("repository_pack_pairs_invalid")
        packed_total = 0
        for stem in sorted(pairs):
            for extension in ("pack", "idx"):
                name = stem + "." + extension
                maximum = GIT_MAX_PACK_BYTES if extension == "pack" else GIT_MAX_LOOSE_FILE_BYTES
                fd, opened = self._source_file(pack, name, maximum, keep_open=True)
                packed_total += opened.st_size
                if opened.st_size == 0 or packed_total > GIT_MAX_PACK_TOTAL_BYTES:
                    raise InstallError("repository_pack_bytes_limit")
                os.symlink("/proc/self/fd/" + str(fd), self.private / "objects/pack" / name)

    def __enter__(self) -> "_RepositorySnapshot":
        try:
            self._retain_git_execution()
            root = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
            self._fds.append(root)
            checkout = pathlib.Path(FIXED_CHECKOUT)
            if not checkout.is_absolute() or ".." in checkout.parts:
                raise InstallError("fixed_checkout_invalid")
            current = root
            for index, part in enumerate(checkout.parts[1:]):
                current = self._directory(
                    current, part, strict=index == len(checkout.parts) - 2
                )
            self.checkout_fd = current
            self._pass_fds.append(current)
            self.git_fd = self._directory(current, ".git")
            for name in ("commondir", "gitdir", "shallow", "reftable"):
                self._absent(self.git_fd, name)
            self._reference_snapshot()
            index_raw = self._read_source(self.git_fd, "index", GIT_MAX_LIST_BYTES)
            self._index_snapshot(index_raw)
            excludes = b""
            if self._lstat(self.git_fd, "info") is not None:
                info = self._directory(self.git_fd, "info")
                self._absent(info, "grafts")
                if self._lstat(info, "exclude") is not None:
                    excludes = self._read_source(info, "exclude", GIT_MAX_LIST_BYTES)
                else:
                    self._absent(info, "exclude")
            else:
                self._absent(self.git_fd, "info")
            self._temporary = tempfile.TemporaryDirectory(prefix="void-bootstrap-install-git-v6-", dir="/tmp")
            self.private = pathlib.Path(self._temporary.name)
            os.chmod(self.private, 0o700)
            self._private_directory("refs")
            self._private_directory("refs/heads")
            self._private_directory("info")
            self._private_file("HEAD", b"ref: refs/heads/main\n")
            self._private_file("refs/heads/main", self.expected_head.encode("ascii") + b"\n")
            self._private_file("config", GIT_PRIVATE_CONFIG)
            self._private_file("info/exclude", excludes)
            self._objects_snapshot()
            self._check_git_execution()
            self._load_tree()
            return self
        except BaseException as exc:
            self._close()
            if isinstance(exc, (OSError, subprocess.SubprocessError, MemoryError)):
                raise InstallError(
                    "repository_reader_resource_or_io_failed:" + type(exc).__name__
                ) from exc
            raise

    def _environment(self) -> dict[str, str]:
        return {
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
            "GIT_DIR": str(self.private),
            "GIT_WORK_TREE": "/proc/self/fd/" + str(self.checkout_fd),
            "GIT_OBJECT_DIRECTORY": str(self.private / "objects"),
            "GIT_INDEX_FILE": "/proc/self/fd/" + str(self.index_fd),
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_ATTR_NOSYSTEM": "1",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
            "GIT_NO_LAZY_FETCH": "1",
            "GIT_ALLOW_PROTOCOL": "",
            "GIT_PROTOCOL_FROM_USER": "0",
            "GIT_PAGER": "",
        }

    def _run(
        self, operation: str, *, object_ids: list[str] | None = None,
        maximum: int = GIT_MAX_LIST_BYTES
    ) -> bytes:
        self._time()
        self._check_git_execution()
        input_raw = b""
        if operation == "objects":
            if (
                not object_ids or len(object_ids) > GIT_MAX_ENTRIES
                or any(HEX40.fullmatch(oid) is None for oid in object_ids)
            ):
                raise InstallError("repository_object_request_invalid")
            args = ["cat-file", "--batch"]
            input_raw = ("\n".join(object_ids) + "\n").encode("ascii")
        elif operation == "index" and object_ids is None:
            args = ["ls-files", "--stage", "--sparse", "-v", "-z", "--full-name"]
        elif operation == "untracked" and object_ids is None:
            args = ["ls-files", "--others", "--exclude-standard", "-z", "--full-name",
                    "--exclude=/.git/"]
        else:
            raise InstallError("repository_git_operation_rejected")
        stop = min(self.deadline, time.monotonic() + GIT_COMMAND_SECONDS)
        output = bytearray()
        error_bytes = 0
        offset = 0
        selector = selectors.DefaultSelector()
        process: subprocess.Popen[bytes] | None = None
        try:
            process = subprocess.Popen(
                ["/proc/self/fd/" + str(self._git_execution_fd),
                 "--no-pager", "--no-replace-objects", *args],
                cwd="/proc/self/fd/" + str(self.checkout_fd),
                stdin=subprocess.PIPE if input_raw else subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=self._environment(),
                close_fds=True,
                pass_fds=tuple(self._pass_fds),
                start_new_session=True,
                preexec_fn=_git_child_limits,
            )
            assert process.stdout is not None and process.stderr is not None
            for stream, label in ((process.stdout, "stdout"), (process.stderr, "stderr")):
                os.set_blocking(stream.fileno(), False)
                selector.register(stream, selectors.EVENT_READ, label)
            if input_raw:
                assert process.stdin is not None
                os.set_blocking(process.stdin.fileno(), False)
                selector.register(process.stdin, selectors.EVENT_WRITE, "stdin")
            while selector.get_map():
                remaining = stop - time.monotonic()
                if remaining <= 0:
                    raise InstallError("repository_git_deadline_exceeded")
                for key, _ in selector.select(min(remaining, 0.25)):
                    stream = key.fileobj
                    if key.data == "stdin":
                        try:
                            count = os.write(stream.fileno(), input_raw[offset:offset + 65536])
                        except BrokenPipeError:
                            count = 0
                            offset = len(input_raw)
                        except BlockingIOError:
                            continue
                        offset += count
                        if offset >= len(input_raw):
                            selector.unregister(stream)
                            stream.close()
                        continue
                    try:
                        part = os.read(stream.fileno(), 65536)
                    except BlockingIOError:
                        continue
                    if not part:
                        selector.unregister(stream)
                        stream.close()
                    elif key.data == "stdout":
                        if len(output) + len(part) > maximum:
                            raise InstallError("repository_git_output_limit")
                        output.extend(part)
                    else:
                        error_bytes += len(part)
                        if error_bytes > 65536:
                            raise InstallError("repository_git_error_output_limit")
            remaining = stop - time.monotonic()
            if remaining <= 0:
                raise InstallError("repository_git_deadline_exceeded")
            code = process.wait(timeout=remaining)
            if code != 0:
                raise InstallError("repository_git_operation_failed:" + operation + ":" + str(code))
            return bytes(output)
        except subprocess.TimeoutExpired as exc:
            raise InstallError("repository_git_deadline_exceeded") from exc
        finally:
            try:
                selector.close()
            finally:
                try:
                    # Keep the unreaped child PID reserved until its group has
                    # been stopped. poll() would release that reservation.
                    if process is not None and process.returncode is None:
                        try:
                            os.killpg(process.pid, signal.SIGKILL)
                        except ProcessLookupError:
                            pass
                        try:
                            process.wait(timeout=2)
                        except subprocess.TimeoutExpired as exc:
                            raise InstallError("repository_git_termination_incomplete") from exc
                finally:
                    if process is not None:
                        for stream in (process.stdin, process.stdout, process.stderr):
                            if stream is not None:
                                stream.close()

    def _objects(self, kind: bytes, ids: list[str], maximum: int) -> dict[str, bytes]:
        output = self._run("objects", object_ids=ids, maximum=maximum)
        cursor = 0
        result: dict[str, bytes] = {}
        for expected in ids:
            self._time()
            end = output.find(b"\n", cursor)
            if end < 0 or end - cursor > 128:
                raise InstallError("repository_object_header_invalid")
            header = output[cursor:end].split(b" ")
            if (
                len(header) != 3 or header[0] != expected.encode("ascii") or header[1] != kind
                or re.fullmatch(rb"0|[1-9][0-9]{0,11}", header[2]) is None
            ):
                raise InstallError("repository_object_missing_or_invalid")
            size = int(header[2])
            cursor = end + 1
            end = cursor + size
            if end >= len(output) or output[end:end + 1] != b"\n":
                raise InstallError("repository_object_length_invalid")
            raw = output[cursor:end]
            identity = hashlib.sha1(kind + b" " + str(size).encode("ascii") + b"\0" + raw).hexdigest()
            if identity != expected:
                raise InstallError("repository_object_identity_invalid")
            result[expected] = raw
            cursor = end + 1
        if cursor != len(output):
            raise InstallError("repository_object_trailing_output")
        return result

    @staticmethod
    def _path(raw: bytes) -> None:
        if (
            not raw or len(raw) > GIT_MAX_PATH_BYTES or raw.startswith(b"/")
            or b"\0" in raw
            or any(part in (b"", b".", b"..", b".git") for part in raw.split(b"/"))
        ):
            raise InstallError("repository_tree_path_invalid")

    def _load_tree(self) -> None:
        commit = self._objects(b"commit", [self.expected_head], 1024 * 1024)[self.expected_head]
        first = commit.split(b"\n", 1)[0]
        if re.fullmatch(rb"tree [0-9a-f]{40}", first) is None:
            raise InstallError("repository_commit_tree_invalid")
        self.tree = first[5:].decode("ascii")
        pending: list[tuple[bytes, str]] = [(b"", self.tree)]
        total_trees = 0
        total_members = 0
        total_bytes = 0
        for _ in range(GIT_MAX_TREE_DEPTH):
            if not pending:
                return
            ids = sorted({oid for _, oid in pending})
            objects: dict[str, bytes] = {}
            for offset in range(0, len(ids), GIT_OBJECT_BATCH_SIZE):
                batch = self._objects(
                    b"tree", ids[offset:offset + GIT_OBJECT_BATCH_SIZE], GIT_MAX_LIST_BYTES,
                )
                total_bytes += sum(len(raw) for raw in batch.values())
                if total_bytes > GIT_MAX_LIST_BYTES:
                    raise InstallError("repository_tree_bytes_limit")
                objects.update(batch)
            following: list[tuple[bytes, str]] = []
            for prefix, oid in pending:
                self._time()
                total_trees += 1
                if total_trees > GIT_MAX_ENTRIES:
                    raise InstallError("repository_tree_count_limit")
                raw = objects[oid]
                cursor = 0
                names: set[bytes] = set()
                previous_sort_key = b""
                while cursor < len(raw):
                    self._time()
                    total_members += 1
                    if total_members > GIT_MAX_ENTRIES:
                        raise InstallError("repository_tree_member_limit")
                    separator = raw.find(b" ", cursor)
                    end = raw.find(b"\0", separator + 1) if separator >= 0 else -1
                    if separator < 0 or end < 0 or end + 21 > len(raw):
                        raise InstallError("repository_tree_object_invalid")
                    mode = raw[cursor:separator]
                    name = raw[separator + 1:end]
                    if not name or b"/" in name or name in names:
                        raise InstallError("repository_tree_name_invalid")
                    names.add(name)
                    path = prefix + name
                    self._path(path)
                    sort_key = name + (b"/" if mode == b"40000" else b"\0")
                    if sort_key <= previous_sort_key:
                        raise InstallError("repository_tree_order_invalid")
                    previous_sort_key = sort_key
                    self._entry_path_bytes += len(path)
                    if self._entry_path_bytes > GIT_MAX_LIST_BYTES:
                        raise InstallError("repository_tree_path_bytes_limit")
                    object_id = raw[end + 1:end + 21].hex()
                    cursor = end + 21
                    if mode == b"40000":
                        following.append((path + b"/", object_id))
                    elif mode in (b"100644", b"100755", b"120000"):
                        if path in self.entries or len(self.entries) >= GIT_MAX_ENTRIES:
                            raise InstallError("repository_tree_entry_limit_or_duplicate")
                        self.entries[path] = (mode, object_id)
                    else:
                        raise InstallError("repository_tree_mode_unsupported")
            pending = following
        if pending:
            raise InstallError("repository_tree_depth_limit")

    def _work_parent(self, relative: bytes) -> tuple[int, bytes, list[int]]:
        self._path(relative)
        components = relative.split(b"/")
        current = self.checkout_fd
        opened_fds: list[int] = []
        prefix = b""
        try:
            for component in components[:-1]:
                self._time()
                before = self._lstat(current, component)
                if before is None or not stat.S_ISDIR(before.st_mode):
                    raise InstallError("checkout_directory_type_invalid")
                fd = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                             dir_fd=current)
                opened_fds.append(fd)
                opened = os.fstat(fd)
                visible = self._lstat(current, component)
                if (
                    visible is None or not _same_stat(before, opened)
                    or not _same_stat(opened, visible)
                ):
                    raise InstallError("checkout_directory_changed")
                prefix += component
                previous = self._work_dirs.setdefault(prefix, opened)
                if not _same_stat(previous, opened):
                    raise InstallError("checkout_directory_changed")
                prefix += b"/"
                current = fd
            return current, components[-1], opened_fds
        except BaseException:
            for fd in reversed(opened_fds):
                os.close(fd)
            raise

    def _worktree_file(self, relative: bytes, mode: bytes, expected: str) -> None:
        parent, name, directories = self._work_parent(relative)
        fd = -1
        try:
            before = self._lstat(parent, name)
            if before is None:
                raise InstallError("checkout_tracked_file_missing")
            previous = self._work_files.get(relative)
            if previous is not None and not _same_stat(previous, before):
                raise InstallError("checkout_tracked_generation_changed")
            if mode == b"120000":
                if not stat.S_ISLNK(before.st_mode):
                    raise InstallError("checkout_tracked_file_type_invalid")
                raw = os.readlink(name, dir_fd=parent)
                if not isinstance(raw, bytes) or len(raw) > GIT_MAX_PATH_BYTES:
                    raise InstallError("checkout_symlink_invalid")
                actual = git_blob_sha1(raw)
            else:
                if (
                    not stat.S_ISREG(before.st_mode)
                    or before.st_size > GIT_MAX_TRACKED_FILE_BYTES
                    or bool(before.st_mode & stat.S_IXUSR) != (mode == b"100755")
                ):
                    raise InstallError("checkout_tracked_file_metadata_invalid")
                self._tracked_bytes += before.st_size
                if self._tracked_bytes > GIT_MAX_TRACKED_TOTAL_BYTES:
                    raise InstallError("checkout_tracked_bytes_limit")
                fd = os.open(name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
                             dir_fd=parent)
                opened = os.fstat(fd)
                if not _same_stat(before, opened):
                    raise InstallError("checkout_tracked_file_rebound")
                digest = hashlib.sha1(b"blob " + str(opened.st_size).encode("ascii") + b"\0")
                remaining = opened.st_size
                while remaining:
                    self._time()
                    part = os.read(fd, min(MAX_READ_CHUNK, remaining))
                    if not part:
                        raise InstallError("checkout_tracked_file_short_read")
                    digest.update(part)
                    remaining -= len(part)
                if os.read(fd, 1) or not _same_stat(opened, os.fstat(fd)):
                    raise InstallError("checkout_tracked_file_changed")
                actual = digest.hexdigest()
            visible = self._lstat(parent, name)
            if visible is None or not _same_stat(before, visible):
                raise InstallError("checkout_tracked_file_changed")
            if actual != expected:
                raise InstallError("checkout_raw_worktree_bytes_mismatch")
            self._work_files.setdefault(relative, before)
        finally:
            if fd >= 0:
                os.close(fd)
            for descriptor in reversed(directories):
                os.close(descriptor)

    def checkout(self) -> dict[str, Any]:
        raw = self._run("index")
        if raw and not raw.endswith(b"\0"):
            raise InstallError("repository_index_listing_invalid")
        entries: dict[bytes, tuple[bytes, str]] = {}
        for record in raw.split(b"\0")[:-1]:
            self._time()
            fields = record.split(b"\t", 1)
            if len(fields) != 2:
                raise InstallError("repository_index_listing_invalid")
            header, path = fields
            self._path(path)
            match = re.fullmatch(rb"H (100644|100755|120000) ([0-9a-f]{40}) 0", header)
            if match is None or path in entries or len(entries) >= GIT_MAX_ENTRIES:
                raise InstallError("repository_index_state_unsupported")
            entries[path] = (match[1], match[2].decode("ascii"))
        if entries != self.entries:
            raise InstallError("checkout_index_tree_mismatch")
        self._tracked_bytes = 0
        for path, (mode, oid) in sorted(self.entries.items()):
            self._worktree_file(path, mode, oid)
        if self._run("untracked"):
            raise InstallError("checkout_untracked_files_present")
        return {
            "head": self.expected_head,
            "tree": self.tree,
            "branch": "main",
            "clean": True,
            "git_boundary_policy": GIT_BOUNDARY_POLICY,
        }

    def blob(
        self, relative: str, *, expected_blob: str, expected_bytes: int | None = None,
        expected_sha256: str | None = None
    ) -> bytes:
        if (
            not isinstance(relative, str) or not isinstance(expected_blob, str)
            or HEX40.fullmatch(expected_blob) is None
        ):
            raise InstallError("git_object_request_invalid")
        path = relative.encode("utf-8", "strict")
        self._path(path)
        entry = self.entries.get(path)
        if entry is None or entry[0] not in (b"100644", b"100755") or entry[1] != expected_blob:
            raise InstallError("git_object_tree_membership_mismatch:" + relative)
        if expected_bytes is not None and (
            not isinstance(expected_bytes, int) or expected_bytes < 0
            or expected_bytes > GIT_MAX_TRACKED_FILE_BYTES
        ):
            raise InstallError("git_object_expected_bytes_invalid")
        maximum = (expected_bytes if expected_bytes is not None else 1024 * 1024) + 256
        raw = self._objects(b"blob", [expected_blob], maximum)[expected_blob]
        if expected_bytes is not None and len(raw) != expected_bytes:
            raise InstallError("git_object_bytes_mismatch:" + relative)
        if expected_sha256 is not None and sha256(raw) != expected_sha256:
            raise InstallError("git_object_sha256_mismatch:" + relative)
        return raw

    def _recheck(self) -> None:
        self._check_git_execution()
        for parent, name, fd, before, strict in self._directory_checks:
            self._time()
            opened = os.fstat(fd)
            visible = self._lstat(parent, name)
            compare = _same_stat if strict else self._directory_identity
            if visible is None or not compare(before, opened) or not compare(before, visible):
                raise InstallError("repository_directory_changed")
        for parent, name, before, fd in self._file_checks:
            self._time()
            visible = self._lstat(parent, name)
            if visible is None or not _same_stat(before, visible):
                raise InstallError("repository_input_changed")
            if fd is not None and not _same_stat(before, os.fstat(fd)):
                raise InstallError("repository_pinned_input_changed")
        for parent, name in self._absent_checks:
            self._time()
            if self._lstat(parent, name) is not None:
                raise InstallError("repository_layout_changed")
        for relative, before in list(self._work_dirs.items()) + list(self._work_files.items()):
            self._time()
            parent, name, directories = self._work_parent(relative)
            try:
                visible = self._lstat(parent, name)
                if visible is None or not _same_stat(before, visible):
                    raise InstallError("checkout_worktree_changed")
            finally:
                for fd in reversed(directories):
                    os.close(fd)

    def _close(self) -> None:
        global _GIT_PRIVATE_ACTIVE, _GIT_PRIVATE_CLEANUP_FAILED
        if self._closed:
            return
        self._closed = True
        failure: BaseException | None = None
        if self._temporary is not None:
            try:
                self._temporary.cleanup()
            except BaseException as exc:
                failure = exc
        for fd in reversed(self._fds):
            try:
                os.close(fd)
            except OSError as exc:
                if failure is None:
                    failure = exc
        self._fds.clear()
        if self._private_started:
            _GIT_PRIVATE_ACTIVE -= 1
            self._private_started = False
        if failure is not None:
            _GIT_PRIVATE_CLEANUP_FAILED = True
            raise InstallError("repository_private_cleanup_failed") from failure

    def __exit__(self, exc_type: Any, exc: Any, traceback: Any) -> bool:
        try:
            if exc_type is None:
                self._recheck()
            elif isinstance(exc, (OSError, subprocess.SubprocessError, MemoryError)):
                raise InstallError(
                    "repository_reader_resource_or_io_failed:" + type(exc).__name__
                ) from exc
        except (OSError, subprocess.SubprocessError, MemoryError) as failure:
            raise InstallError(
                "repository_reader_resource_or_io_failed:" + type(failure).__name__
            ) from failure
        finally:
            self._close()
        return False




def checkout_snapshot(
    expected_head: str, *, repository: _RepositorySnapshot | None = None,
) -> dict[str, Any]:
    if repository is None:
        with _RepositorySnapshot(expected_head) as owned:
            return checkout_snapshot(expected_head, repository=owned)
    if repository.expected_head != expected_head or repository._closed:
        raise InstallError("git_object_witness_head_or_lifetime_mismatch")
    return repository.checkout()



def _git_object(
    expected_head: str, relative: str, expected_blob: str,
    *, repository: _RepositorySnapshot | None = None,
) -> bytes:
    identities = {
        LOCK_REL: (LOCK_GIT_BLOB_SHA1, LOCK_BYTES, LOCK_SHA256),
        MANIFEST_REL: (MANIFEST_GIT_BLOB_SHA1, MANIFEST_BYTES, MANIFEST_SHA256),
    }
    identity = identities.get(relative)
    if identity is None or expected_blob != identity[0]:
        raise InstallError("git_object_request_not_allowed")
    if repository is None:
        with _RepositorySnapshot(expected_head) as owned:
            return _git_object(expected_head, relative, expected_blob, repository=owned)
    if repository.expected_head != expected_head or repository._closed:
        raise InstallError("git_object_witness_head_or_lifetime_mismatch")
    return repository.blob(relative, expected_blob=identity[0],
                           expected_bytes=identity[1], expected_sha256=identity[2])


def accepted_lock(
    expected_head: str, *, repository: _RepositorySnapshot | None = None,
) -> dict[str, Any]:
    raw = _git_object(expected_head, LOCK_REL, LOCK_GIT_BLOB_SHA1, repository=repository)
    try:
        lock = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InstallError("accepted_lock_json_invalid") from exc
    required = {
        "schema": "void_buy_void_epoch2_dormant_first_entry_bootstrap_v6_candidate_lock_v1",
        "marker": "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_CANDIDATE_LOCK_V1",
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "candidate_accepted": True,
        "native_binary_identity_accepted": True,
        "source_generation_identity_accepted": True,
        "protected_install_authorized": False,
        "live_execution_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "rpc_call_authorized": False,
        "funds_movement_authorized": False,
        "lock_id": LOCK_ID,
    }
    for key, want in required.items():
        if type(lock.get(key)) is not type(want) or lock.get(key) != want:
            raise InstallError("accepted_lock_field_mismatch:" + key)
    report = lock.get("candidate_report")
    binary = lock.get("native_binary")
    sg = lock.get("source_generation")
    if not isinstance(report, dict) or not isinstance(binary, dict) or not isinstance(sg, dict):
        raise InstallError("accepted_lock_evidence_missing")
    if report.get("candidate_id") != CANDIDATE_ID:
        raise InstallError("accepted_lock_candidate_id_mismatch")
    if (
        binary.get("bytes") != BOOTSTRAP_BYTES
        or binary.get("sha256") != BOOTSTRAP_SHA256
        or binary.get("distinct_source_fd_builds_byte_identical") is not True
    ):
        raise InstallError("accepted_lock_binary_identity_mismatch")
    if (
        sg.get("manifest_git_blob_sha1") != MANIFEST_GIT_BLOB_SHA1
        or sg.get("manifest_bytes") != MANIFEST_BYTES
        or sg.get("manifest_sha256") != MANIFEST_SHA256
    ):
        raise InstallError("accepted_lock_manifest_identity_mismatch")
    return lock


def build_policy(python: dict[str, Any], git_tool: dict[str, Any]) -> bytes:
    return (
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + str(python["sha256"]) + "\n"
        + "python_bytes=" + str(python["bytes"]) + "\n"
        + "git_sha256=" + str(git_tool["sha256"]) + "\n"
        + "git_bytes=" + str(git_tool["bytes"]) + "\n"
    ).encode("ascii")


def _exists(path: pathlib.Path) -> bool:
    try:
        path.lstat()
        return True
    except FileNotFoundError:
        return False


def _verify_file(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_git_blob: str | None,
    expected_mode: int,
) -> None:
    _read_exact_path(
        path,
        expected_bytes=expected_bytes,
        expected_sha256=expected_sha256,
        expected_git_blob=expected_git_blob,
        expected_mode=expected_mode,
        require_root_owner=True,
    )


def _verify_generation_at(
    root: pathlib.Path,
    policy: bytes,
    manifest: bytes,
) -> None:
    _trusted_directory(INSTALL_PARENT)
    _trusted_directory(root, 0o755)
    entries = sorted(os.listdir(root))
    if entries != sorted((BIN_DIR, MANIFEST_NAME, POLICY_NAME)):
        raise InstallError("installed_root_entries_invalid")
    bin_path = root / BIN_DIR
    _trusted_directory(bin_path, 0o755)
    if sorted(os.listdir(bin_path)) != [BOOTSTRAP_NAME]:
        raise InstallError("installed_bin_entries_invalid")
    _verify_file(
        bin_path / BOOTSTRAP_NAME,
        expected_bytes=BOOTSTRAP_BYTES,
        expected_sha256=BOOTSTRAP_SHA256,
        expected_git_blob=BOOTSTRAP_GIT_BLOB_SHA1,
        expected_mode=0o555,
    )
    _verify_file(
        root / MANIFEST_NAME,
        expected_bytes=MANIFEST_BYTES,
        expected_sha256=MANIFEST_SHA256,
        expected_git_blob=MANIFEST_GIT_BLOB_SHA1,
        expected_mode=0o444,
    )
    _verify_file(
        root / POLICY_NAME,
        expected_bytes=len(policy),
        expected_sha256=sha256(policy),
        expected_git_blob=None,
        expected_mode=0o444,
    )
    if (root / MANIFEST_NAME).read_bytes() != manifest:
        raise InstallError("installed_manifest_bytes_mismatch")
    if (root / POLICY_NAME).read_bytes() != policy:
        raise InstallError("installed_policy_bytes_mismatch")


def _verify_root_generation(policy: bytes, manifest: bytes) -> None:
    _verify_generation_at(INSTALL_ROOT, policy, manifest)


def protected_state(policy: bytes, manifest: bytes) -> str:
    _trusted_directory(pathlib.Path("/"))
    _trusted_directory(INSTALL_PARENT)
    if _exists(STAGE_ROOT):
        raise InstallError("staging_root_present")
    if not _exists(INSTALL_ROOT):
        return READY_STATE
    _verify_root_generation(policy, manifest)
    return GREEN_STATE


def collect_plan(
    bootstrap: pathlib.Path,
    manifest_path: pathlib.Path,
    expected_head: str,
) -> dict[str, Any]:
    with _RepositorySnapshot(expected_head) as repository:
        lock = accepted_lock(expected_head, repository=repository)
        checkout = checkout_snapshot(expected_head, repository=repository)
        bootstrap_raw, bootstrap_snapshot = _read_exact_path(
            bootstrap,
            expected_bytes=BOOTSTRAP_BYTES,
            expected_sha256=BOOTSTRAP_SHA256,
            expected_git_blob=BOOTSTRAP_GIT_BLOB_SHA1,
            expected_mode=0o555,
            require_root_owner=False,
        )
        manifest_raw, manifest_snapshot = _read_exact_path(
            manifest_path,
            expected_bytes=MANIFEST_BYTES,
            expected_sha256=MANIFEST_SHA256,
            expected_git_blob=MANIFEST_GIT_BLOB_SHA1,
            expected_mode=0o444,
            require_root_owner=False,
        )
        canonical_manifest = _git_object(
            expected_head,
            MANIFEST_REL,
            MANIFEST_GIT_BLOB_SHA1,
            repository=repository,
        )
        if manifest_raw != canonical_manifest:
            raise InstallError("manifest_input_not_canonical_git_object")
        python = _tool_snapshot(FIXED_PYTHON, MAX_PYTHON_BYTES)
        git_tool = dict(repository.git_tool)
        policy = build_policy(python, git_tool)
        state = protected_state(policy, manifest_raw)
        body = {
            "schema": PLAN_SCHEMA,
            "version": 1,
            "lock_id": LOCK_ID,
            "candidate_id": CANDIDATE_ID,
            "expected_head": expected_head,
            "checkout": checkout,
            "git_boundary_policy": GIT_BOUNDARY_POLICY,
            "source_repository_mutation": False,
            "temporary_git_metadata_write_required": True,
            "python": python,
            "git_tool": git_tool,
            "bootstrap_input": bootstrap_snapshot,
            "manifest_input": manifest_snapshot,
            "bootstrap_sha256": sha256(bootstrap_raw),
            "bootstrap_bytes": len(bootstrap_raw),
            "bootstrap_git_blob_sha1": git_blob_sha1(bootstrap_raw),
            "manifest_sha256": sha256(manifest_raw),
            "manifest_bytes": len(manifest_raw),
            "manifest_git_blob_sha1": git_blob_sha1(manifest_raw),
            "policy_sha256": sha256(policy),
            "policy_bytes": len(policy),
            "install_root": str(INSTALL_ROOT),
            "protected_state": state,
            "create_only": True,
            "rename_noreplace_required": True,
            "bootstrap_execution_authorized": False,
            "inner_installer_execution_authorized": False,
            "service_mutation_authorized": False,
            "credential_access_authorized": False,
            "private_key_access_authorized": False,
            "signing_authorized": False,
            "transaction_authorized": False,
            "rpc_call_authorized": False,
            "payment_acceptance_authorized": False,
            "public_presale_activation_authorized": False,
            "wc_void_market_activation_authorized": False,
            "treasury_liquidity_action_authorized": False,
            "funds_movement_authorized": False,
            "production_host_evidence_authority": False,
        }
        return {
            "lock": lock,
            "body": body,
            "plan_id": PLAN_PREFIX + sha256(canonical_json(body)),
            "bootstrap_raw": bootstrap_raw,
            "manifest_raw": manifest_raw,
            "policy": policy,
        }


def _renameat2(dir_fd: int, source: str, target: str, flags: int) -> None:
    libc = ctypes.CDLL(None, use_errno=True)
    fn = getattr(libc, "renameat2", None)
    if fn is None:
        raise InstallError("renameat2_unavailable")
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
        raise InstallError(
            "renameat2_failed:"
            + source
            + ":"
            + target
            + ":"
            + str(ctypes.get_errno())
        )


def _write_all(fd: int, raw: bytes) -> None:
    view = memoryview(raw)
    offset = 0
    while offset < len(view):
        wrote = os.write(fd, view[offset:])
        if wrote <= 0:
            raise InstallError("stage_short_write")
        offset += wrote


def _create_file(
    parent_fd: int,
    name: str,
    raw: bytes,
    *,
    mode: int,
    expected_sha256: str,
) -> None:
    fd = os.open(
        name,
        os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
        0o400,
        dir_fd=parent_fd,
    )
    try:
        os.fchown(fd, 0, 0)
        _write_all(fd, raw)
        os.fchmod(fd, mode)
        os.fsync(fd)
        os.lseek(fd, 0, os.SEEK_SET)
        digest = hashlib.sha256()
        while True:
            chunk = os.read(fd, MAX_READ_CHUNK)
            if not chunk:
                break
            digest.update(chunk)
        if digest.hexdigest() != expected_sha256:
            raise InstallError("stage_file_digest_mismatch:" + name)
    finally:
        os.close(fd)


def _same_stage_directory(a: os.stat_result, b: os.stat_result) -> bool:
    # Creating our bin and files changes nlink, size, mtime and ctime.  Those
    # changes do not authorize cleanup of a different inode, owner or mode.
    return (
        stat.S_ISDIR(a.st_mode)
        and stat.S_ISDIR(b.st_mode)
        and a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_mode == b.st_mode
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
    )


def _publication_after_handoff(opt_fd: int, expected: os.stat_result) -> bool | None:
    """Recover an interrupted rename's outcome from the created stage identity."""
    def observe() -> tuple[os.stat_result | None, os.stat_result | None]:
        values: list[os.stat_result | None] = []
        for name in (STAGE_NAME, INSTALL_NAME):
            try:
                values.append(os.stat(name, dir_fd=opt_fd, follow_symlinks=False))
            except FileNotFoundError:
                values.append(None)
        return values[0], values[1]

    before = observe()
    after = observe()
    for earlier, current in zip(before, after):
        if earlier is None or current is None:
            if earlier is not current:
                return None
        elif not _same_stat(earlier, current):
            return None
    stage, installed = after
    at_stage = stage is not None and _same_stage_directory(expected, stage)
    at_install = installed is not None and _same_stage_directory(expected, installed)
    if at_install and not at_stage:
        return True
    if at_stage and not at_install:
        return False
    # Missing, substituted or conflicting identities never authorize cleanup.
    return None


def _cleanup_stage(opt_fd: int, expected: os.stat_result) -> None:
    stage_fd = os.open(
        STAGE_NAME,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        dir_fd=opt_fd,
    )
    try:
        opened = os.fstat(stage_fd)
        visible = os.stat(
            STAGE_NAME,
            dir_fd=opt_fd,
            follow_symlinks=False,
        )
        if not _same_stage_directory(expected, opened) or not _same_stat(opened, visible):
            raise InstallError("stage_generation_changed_before_cleanup")
        entries = sorted(os.listdir(stage_fd))
        allowed = {BIN_DIR, MANIFEST_NAME, POLICY_NAME}
        if not set(entries).issubset(allowed):
            raise InstallError("stage_cleanup_unexpected_entry")
        if BIN_DIR in entries:
            bin_fd = os.open(
                BIN_DIR,
                os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                dir_fd=stage_fd,
            )
            try:
                bin_identity = os.fstat(bin_fd)
                if not _same_stat(
                    bin_identity,
                    os.stat(BIN_DIR, dir_fd=stage_fd, follow_symlinks=False),
                ):
                    raise InstallError("stage_bin_changed_before_cleanup")
                children = sorted(os.listdir(bin_fd))
                if not set(children).issubset({BOOTSTRAP_NAME}):
                    raise InstallError("stage_cleanup_unexpected_bin_entry")
                if BOOTSTRAP_NAME in children:
                    os.unlink(BOOTSTRAP_NAME, dir_fd=bin_fd)
                os.fsync(bin_fd)
                if not _same_stage_directory(
                    bin_identity,
                    os.stat(BIN_DIR, dir_fd=stage_fd, follow_symlinks=False),
                ):
                    raise InstallError("stage_bin_changed_during_cleanup")
                os.rmdir(BIN_DIR, dir_fd=stage_fd)
            finally:
                os.close(bin_fd)
        for name in (MANIFEST_NAME, POLICY_NAME):
            try:
                os.unlink(name, dir_fd=stage_fd)
            except FileNotFoundError:
                pass
        os.fsync(stage_fd)
        current = os.fstat(stage_fd)
        visible = os.stat(STAGE_NAME, dir_fd=opt_fd, follow_symlinks=False)
        if not _same_stage_directory(expected, current) or not _same_stat(current, visible):
            raise InstallError("stage_generation_changed_during_cleanup")
        os.rmdir(STAGE_NAME, dir_fd=opt_fd)
    finally:
        os.close(stage_fd)
    os.fsync(opt_fd)


def _require_secure_apply_context() -> None:
    if sys.flags.isolated != 1:
        raise InstallError("python_isolated_mode_required")
    present = [name for name in FORBIDDEN_APPLY_ENV if name in os.environ]
    if present:
        raise InstallError("forbidden_apply_environment:" + ",".join(present))



def _bindings_snapshot(
    expected_head: str, *, repository: _RepositorySnapshot | None = None,
) -> dict[str, Any]:
    if repository is None:
        with _RepositorySnapshot(expected_head) as owned:
            return _bindings_snapshot(expected_head, repository=owned)
    return {
        "checkout": checkout_snapshot(expected_head, repository=repository),
        "lock_id": accepted_lock(expected_head, repository=repository)["lock_id"],
        "python": _tool_snapshot(FIXED_PYTHON, MAX_PYTHON_BYTES),
        "git_tool": dict(repository.git_tool),
    }



def git_boundary_receipt() -> dict[str, Any]:
    return {
        "git_boundary_policy": GIT_BOUNDARY_POLICY,
        "temporary_git_metadata_write_required": True,
        "temporary_git_metadata_write_performed": _GIT_PRIVATE_MUTATION_PERFORMED,
        "temporary_git_metadata_cleanup_completed": (
            _GIT_PRIVATE_ACTIVE == 0 and not _GIT_PRIVATE_CLEANUP_FAILED
        ),
        "source_repository_mutation": False,
        "source_object_fetch": False,
        "repository_config_loaded": False,
        "repository_callback_execution": False,
        "standalone_git_tool_admission": True,
        "native_parent_authority_claimed": False,
    }


def _emit_git_boundary_receipt() -> None:
    for key, value in git_boundary_receipt().items():
        print(key + "=" + (str(value).lower() if isinstance(value, bool) else str(value)))


def _emit_git_boundary_authority(operation: str) -> None:
    print(MARKER)
    print("mode=" + operation)
    print("authority_boundary=PRE_GIT_OBSERVATION")
    print("read_only=false")
    print("temporary_git_metadata_write_required=true")
    print("temporary_git_metadata_write_authorized=true")
    print("source_repository_mutation=false")
    print("source_object_fetch=false")
    print("repository_config_loaded=false")
    print("repository_callback_execution=false")
    print("protected_state_mutation_at_observation_boundary=false")
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("funds_movement=false")
    sys.stdout.flush()


def emit_operation_authority() -> None:
    print(MARKER)
    print("mode=apply")
    print("authority_boundary=PRE_MUTATION")
    print("temporary_git_metadata_write_required=true")
    print("temporary_git_metadata_write_authorized=true")
    print("source_repository_mutation=false")
    print("filesystem_mutation_possible=true")
    print("filesystem_mutation_performed_at_pre_mutation_boundary=false")
    print("create_only=true")
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    sys.stdout.flush()


def apply(
    bootstrap: pathlib.Path,
    manifest_path: pathlib.Path,
    expected_head: str,
    expected_plan_id: str,
    confirm: str,
) -> None:
    emit_operation_authority()
    if confirm != CONFIRM_TOKEN:
        raise InstallError("explicit_create_only_confirmation_required")
    if os.geteuid() != 0:
        raise InstallError("root_required_for_apply")
    _require_secure_apply_context()
    initial = collect_plan(bootstrap, manifest_path, expected_head)
    if initial["plan_id"] != expected_plan_id:
        raise InstallError("expected_plan_id_mismatch")
    body = initial["body"]
    if body["protected_state"] == GREEN_STATE:
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        _emit_git_boundary_receipt()
        print("protected_install_performed=false")
        print("bootstrap_execution=false")
        print("inner_installer_execution=false")
        print("credential_access=false")
        print("transaction=false")
        print("funds_movement=false")
        return
    if body["protected_state"] != READY_STATE:
        raise InstallError("apply_state_not_ready")

    bootstrap_raw = initial["bootstrap_raw"]
    manifest_raw = initial["manifest_raw"]
    policy = initial["policy"]
    before_bindings = _bindings_snapshot(expected_head)
    if before_bindings != {
        "checkout": body["checkout"],
        "lock_id": body["lock_id"],
        "python": body["python"],
        "git_tool": body["git_tool"],
    }:
        raise InstallError("authorized_plan_binding_changed_before_staging")
    opt_fd = os.open(
        INSTALL_PARENT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    stage_created = False
    stage_identity: os.stat_result | None = None
    published: bool | None = False
    publication_attempted = False
    reconciliation_attempted = False
    phase = "pre_publication"
    parent_fsync_completed = False
    final_verification_completed = False
    cleanup_attempted = False
    cleanup_completed = False
    original_failure: BaseException | None = None
    cleanup_failure: BaseException | None = None
    close_failure: BaseException | None = None
    reconciliation_failure: BaseException | None = None
    try:
        if _exists(STAGE_ROOT) or _exists(INSTALL_ROOT):
            raise InstallError("create_only_target_or_stage_present")
        os.mkdir(STAGE_NAME, 0o755, dir_fd=opt_fd)
        stage_created = True
        stage_fd = os.open(
            STAGE_NAME,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=opt_fd,
        )
        try:
            os.fchown(stage_fd, 0, 0)
            os.fchmod(stage_fd, 0o755)
            stage_identity = os.fstat(stage_fd)
            os.mkdir(BIN_DIR, 0o755, dir_fd=stage_fd)
            bin_fd = os.open(
                BIN_DIR,
                os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                dir_fd=stage_fd,
            )
            try:
                os.fchown(bin_fd, 0, 0)
                os.fchmod(bin_fd, 0o755)
                _create_file(
                    bin_fd,
                    BOOTSTRAP_NAME,
                    bootstrap_raw,
                    mode=0o555,
                    expected_sha256=BOOTSTRAP_SHA256,
                )
                os.fsync(bin_fd)
            finally:
                os.close(bin_fd)
            _create_file(
                stage_fd,
                MANIFEST_NAME,
                manifest_raw,
                mode=0o444,
                expected_sha256=MANIFEST_SHA256,
            )
            _create_file(
                stage_fd,
                POLICY_NAME,
                policy,
                mode=0o444,
                expected_sha256=sha256(policy),
            )
            os.fsync(stage_fd)
        finally:
            os.close(stage_fd)

        # Verify the staged tree using the same exact layout contract as final.
        _verify_generation_at(STAGE_ROOT, policy, manifest_raw)

        after_bindings = _bindings_snapshot(expected_head)
        if after_bindings != before_bindings:
            raise InstallError("plan_binding_changed_before_publication")

        # Revalidate candidate paths themselves immediately before publication.
        b2, _ = _read_exact_path(
            bootstrap,
            expected_bytes=BOOTSTRAP_BYTES,
            expected_sha256=BOOTSTRAP_SHA256,
            expected_git_blob=BOOTSTRAP_GIT_BLOB_SHA1,
            expected_mode=0o555,
            require_root_owner=False,
        )
        m2, _ = _read_exact_path(
            manifest_path,
            expected_bytes=MANIFEST_BYTES,
            expected_sha256=MANIFEST_SHA256,
            expected_git_blob=MANIFEST_GIT_BLOB_SHA1,
            expected_mode=0o444,
            require_root_owner=False,
        )
        if b2 != bootstrap_raw or m2 != manifest_raw:
            raise InstallError("candidate_generation_changed_before_publication")

        phase = "publication_handoff"
        publication_attempted = True
        _renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)
        published = True
        stage_created = False
        phase = "post_publication_parent_fsync"
        os.fsync(opt_fd)
        parent_fsync_completed = True
        phase = "post_publication_verification"
        _verify_root_generation(policy, manifest_raw)
        if _bindings_snapshot(expected_head) != before_bindings:
            raise InstallError("post_publication_binding_changed")
        final_verification_completed = True
        phase = "install_parent_close"
    except BaseException as exc:
        original_failure = exc
        if publication_attempted and published is not True:
            # SIGINT can become KeyboardInterrupt as ctypes returns, after the
            # kernel rename succeeded but before published was assigned.
            published = None
            reconciliation_attempted = True
            try:
                if stage_identity is None:
                    raise InstallError("stage_identity_missing_during_reconciliation")
                published = _publication_after_handoff(opt_fd, stage_identity)
            except BaseException as reconciliation_exc:
                reconciliation_failure = reconciliation_exc
        if published is False and stage_created:
            cleanup_attempted = True
            try:
                if stage_identity is None:
                    raise InstallError("stage_identity_missing_during_cleanup")
                _cleanup_stage(opt_fd, stage_identity)
                cleanup_completed = True
            except BaseException as cleanup_exc:
                cleanup_failure = cleanup_exc
    finally:
        # close() may consume the descriptor and still report failure.  Do not
        # retry it or let that failure replace an earlier publication fact.
        try:
            os.close(opt_fd)
        except BaseException as close_exc:
            close_failure = close_exc

    if original_failure is not None or cleanup_failure is not None or close_failure is not None:
        error_type = PublishedInstallError if published is True else InstallTerminalError
        raise error_type(
            published=published,
            phase=phase,
            parent_fsync_completed=parent_fsync_completed,
            final_verification_completed=final_verification_completed,
            cleanup_attempted=cleanup_attempted,
            cleanup_completed=cleanup_completed,
            original_failure=original_failure,
            cleanup_failure=cleanup_failure,
            close_failure=close_failure,
            reconciliation_attempted=reconciliation_attempted,
            reconciliation_failure=reconciliation_failure,
        ) from (original_failure or cleanup_failure or close_failure)

    print(MARKER)
    print("mode=apply")
    print("status=GREEN")
    _emit_git_boundary_receipt()
    print("expected_head=" + expected_head)
    print("plan_id=" + expected_plan_id)
    print("protected_install_performed=true")
    print("publication=true")
    print("publication_state=rename_noreplace_verified")
    print("parent_fsync_completed=true")
    print("final_verification_completed=true")
    print("install_parent_close_completed=true")
    print("final_state_verified=true")
    print("bootstrap_sha256=" + BOOTSTRAP_SHA256)
    print("manifest_sha256=" + MANIFEST_SHA256)
    print("policy_sha256=" + sha256(policy))
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print(
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_BOOTSTRAP_V6_INSTALLED_READ_ONLY_QUALIFICATION"
    )


def plan(
    bootstrap: pathlib.Path,
    manifest_path: pathlib.Path,
    expected_head: str,
) -> None:
    _emit_git_boundary_authority("plan")
    result = collect_plan(bootstrap, manifest_path, expected_head)
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=false")
    print("filesystem_write=true")
    print("protected_filesystem_mutation=false")
    _emit_git_boundary_receipt()
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("expected_head=" + expected_head)
    print("plan_id=" + result["plan_id"])
    print("protected_state=" + str(body["protected_state"]))
    print("bootstrap_sha256=" + BOOTSTRAP_SHA256)
    print("bootstrap_bytes=" + str(BOOTSTRAP_BYTES))
    print("manifest_sha256=" + MANIFEST_SHA256)
    print("manifest_bytes=" + str(MANIFEST_BYTES))
    print("policy_sha256=" + str(body["policy_sha256"]))
    print("policy_bytes=" + str(body["policy_bytes"]))
    print("python_sha256=" + str(body["python"]["sha256"]))
    print("python_bytes=" + str(body["python"]["bytes"]))
    print("git_sha256=" + str(body["git_tool"]["sha256"]))
    print("git_bytes=" + str(body["git_tool"]["bytes"]))
    print("create_only=true")
    print("rename_noreplace_required=true")
    print("bootstrap_execution_authorized=false")
    print("inner_installer_execution_authorized=false")
    print("service_mutation_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement_authorized=false")
    print("production_host_evidence_authority=false")
    if body["protected_state"] == GREEN_STATE:
        print("already_installed=true")
        print(
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
            "PROTECTED_BOOTSTRAP_V6_INSTALLED_READ_ONLY_QUALIFICATION"
        )
    else:
        print("already_installed=false")
        print(
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
            "PROTECTED_BOOTSTRAP_V6_CREATE_ONLY_INSTALL"
        )


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("bootstrap_sha256=" + BOOTSTRAP_SHA256)
    print("manifest_sha256=" + MANIFEST_SHA256)
    print("policy_schema=" + POLICY_SCHEMA)
    print("install_root=" + str(INSTALL_ROOT))
    print("create_only=true")
    print("rename_noreplace_required=true")
    print("python_and_git_host_policy_required=true")
    print("bootstrap_execution_authorized=false")
    print("inner_installer_execution_authorized=false")
    print("service_mutation_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("funds_movement_authorized=false")


def self_test() -> None:
    assert LOCK_ID.startswith("voidbuye2dormantbootstraplock3_")
    assert CANDIDATE_ID.startswith("voidbuye2dormantbootstrapcand3_")
    assert BOOTSTRAP_BYTES == 874_608
    assert MANIFEST_BYTES == 2382
    policy = build_policy(
        {"sha256": "1" * 64, "bytes": 123},
        {"sha256": "2" * 64, "bytes": 456},
    )
    assert policy == (
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + "1" * 64 + "\n"
        + "python_bytes=123\n"
        + "git_sha256=" + "2" * 64 + "\n"
        + "git_bytes=456\n"
    ).encode("ascii")
    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-v6-install-selftest-") as td:
        parent = pathlib.Path(td)
        (parent / "stage").mkdir()
        fd = os.open(parent, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
        try:
            _renameat2(fd, "stage", "final", RENAME_NOREPLACE)
            assert (parent / "final").is_dir()
            assert not (parent / "stage").exists()
        finally:
            os.close(fd)
    assert b"hooksPath = /dev/null" in GIT_PRIVATE_CONFIG
    assert b"fsmonitor = false" in GIT_PRIVATE_CONFIG
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_bootstrap_v6_lock_bound=true")
    print("accepted_bootstrap_v6_binary_bound=true")
    print("source_generation_v3_manifest_bound=true")
    print("python_and_git_host_policy_bound=true")
    print("create_only_publication=true")
    print("rename_noreplace_exercised=true")
    print("post_publication_rollback=false")
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--bootstrap")
    parser.add_argument("--manifest")
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
    if not args.bootstrap or not args.manifest or not args.expected_head:
        raise InstallError("bootstrap_manifest_expected_head_required")
    bootstrap = pathlib.Path(args.bootstrap)
    manifest = pathlib.Path(args.manifest)
    if args.plan:
        plan(bootstrap, manifest, args.expected_head)
        return 0
    if not args.expected_plan_id:
        raise InstallError("expected_plan_id_required")
    apply(
        bootstrap,
        manifest,
        args.expected_head,
        args.expected_plan_id,
        args.confirm,
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except InstallTerminalError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + _failure_reason(exc))
        _emit_git_boundary_receipt()
        for name, value in exc.facts.items():
            print(name + "=" + value)
        print("post_publication_rollback=false")
        print("bootstrap_execution=false")
        print("inner_installer_execution=false")
        print("credential_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("funds_movement=false")
        raise SystemExit(2)
    except (InstallError, OSError, subprocess.SubprocessError, MemoryError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + _failure_reason(exc))
        _emit_git_boundary_receipt()
        print("bootstrap_execution=false")
        print("inner_installer_execution=false")
        print("credential_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("funds_movement=false")
        raise SystemExit(2)
