#!/usr/bin/env python3
# Protected, read-only all-process reference census candidate.
# Production --census is intentionally unusable from a mutable checkout.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_V1"
)
if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
    or _bootstrap_sys.flags.optimize != 0
    or not __debug__
    or not _bootstrap_sys.dont_write_bytecode
):
    if __name__ == "__main__":
        print(_BOOTSTRAP_MARKER)
        print("status=HOLD")
        print("reason=python_isolated_unoptimized_no_bytecode_mode_required")
        print("production_filesystem_write=false")
        print("replacement_apply_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_no_bytecode_mode_required")

import argparse
import errno
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = (
    "void_buy_void_custody_runtime_v3_"
    "protected_all_process_reference_census_v1"
)
VERSION = 1

PARENT_CURRENT_UID_HEAD = "95d1d10f41e00848b9c7e58da8d3fdf975ada3da"
PARENT_CURRENT_UID_SOURCE_BLOB = "4de1cb35a43045a0d9568b3bf4c10904c3653d34"
PRESTATE_HEAD = "97ddf23065b56fef3bf16c5c96092a0b100042a1"
PRESTATE_SOURCE_BLOB = "e32ebd94ad09cd80e03489079e74657aab159d7a"
ARCHIVE_LOCK_BLOB = "edb4ea2b833373ab387762e45ba7da4032c860f3"
ARCHIVE_LOCK_SHA256 = (
    "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"
)

PROTECTED_ROOT = Path("/opt/void-buy-allocation-custody-procref-v1")
PROTECTED_SOURCE = (
    PROTECTED_ROOT
    / "void_buy_allocation_custody_runtime_v3_"
      "protected_all_process_reference_census_v1.py"
)
TARGET = Path("/opt/void-buy-allocation-custody-runtime-v1")
PROC = Path("/proc")

PF_KTHREAD = 0x00200000
MAX_TARGET_ENTRIES = 32768
MAX_TARGET_DEPTH = 64
MAX_PIDS = 32768
MAX_FDS_PER_PROCESS = 65536
MAX_TASKS_PER_PROCESS = 65536
MAX_TOTAL_TASKS = 262144
MAX_STAT_BYTES = 4096
MAX_MAPS_BYTES = 8 * 1024 * 1024
MAX_MOUNTINFO_BYTES = 4 * 1024 * 1024
MAX_SCAN_ATTEMPTS = 3
MAX_SOURCE_BYTES = 2 * 1024 * 1024


class CensusHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise CensusHold("custody_runtime_v3_protected_all_process_" + reason)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def canonical(value: object) -> bytes:
    return (
        json.dumps(
            value,
            sort_keys=True,
            ensure_ascii=True,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")


def _identity(st: os.stat_result) -> tuple[int, int, int, int, int, int]:
    return (
        st.st_dev,
        st.st_ino,
        st.st_uid,
        st.st_gid,
        st.st_mode,
        st.st_nlink,
    )


def _generation(
    st: os.stat_result,
) -> tuple[int, int, int, int, int, int, int, int, int]:
    return _identity(st) + (st.st_size, st.st_mtime_ns, st.st_ctime_ns)


def _directory_flags() -> int:
    required = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_DIRECTORY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
    )
    if any(type(value) is not int for value in required):
        hold("descriptor_capability_invalid")
    return os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_NONBLOCK


def _leaf_flags() -> int:
    required = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
    )
    if any(type(value) is not int for value in required):
        hold("descriptor_capability_invalid")
    return os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK


def _host_root_flags() -> int:
    required = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_DIRECTORY", None),
        getattr(os, "O_NONBLOCK", None),
    )
    if any(type(value) is not int for value in required):
        hold("descriptor_capability_invalid")
    # /proc/1/root is a kernel-owned magic symlink. This open intentionally
    # follows that single procfs link, then all target traversal is NOFOLLOW.
    return os.O_RDONLY | os.O_DIRECTORY | os.O_NONBLOCK


def _root_custodied(st: os.stat_result, *, directory: bool) -> bool:
    kind_ok = stat.S_ISDIR(st.st_mode) if directory else stat.S_ISREG(st.st_mode)
    return (
        kind_ok
        and not stat.S_ISLNK(st.st_mode)
        and st.st_uid == 0
        and st.st_gid == 0
        and stat.S_IMODE(st.st_mode) & 0o022 == 0
    )


def _read_open_fd(fd: int, maximum: int) -> bytes:
    if maximum < 1 or maximum > 16 * 1024 * 1024:
        hold("read_limit_invalid")
    raw = bytearray()
    while len(raw) <= maximum:
        chunk = os.read(fd, min(65536, maximum + 1 - len(raw)))
        if not chunk:
            break
        raw.extend(chunk)
    if len(raw) > maximum:
        hold("read_ceiling_exceeded")
    return bytes(raw)


def _read_proc_file(path: Path, maximum: int) -> bytes:
    before = os.stat(path, follow_symlinks=False)
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode):
        hold("proc_file_shape_invalid:" + path.name)
    fd = os.open(path, _leaf_flags())
    try:
        opened = os.fstat(fd)
        if _identity(before) != _identity(opened):
            hold("proc_file_rebound:" + path.name)
        raw = _read_open_fd(fd, maximum)
        after = os.fstat(fd)
        visible = os.stat(path, follow_symlinks=False)
        if _identity(opened) != _identity(after) or _identity(after) != _identity(visible):
            hold("proc_file_identity_changed:" + path.name)
        return raw
    finally:
        os.close(fd)


def _read_proc_at(proc_fd: int, relative: str, maximum: int) -> bytes:
    if (
        not isinstance(relative, str)
        or not relative
        or relative.startswith("/")
        or "\x00" in relative
        or any(part in ("", ".", "..") for part in relative.split("/"))
    ):
        hold("proc_relative_path_invalid")
    before = os.stat(relative, dir_fd=proc_fd, follow_symlinks=False)
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode):
        hold("proc_file_shape_invalid:" + relative)
    fd = os.open(relative, _leaf_flags(), dir_fd=proc_fd)
    try:
        opened = os.fstat(fd)
        if _identity(before) != _identity(opened):
            hold("proc_file_rebound:" + relative)
        raw = _read_open_fd(fd, maximum)
        after = os.fstat(fd)
        visible = os.stat(relative, dir_fd=proc_fd, follow_symlinks=False)
        if (
            _identity(opened) != _identity(after)
            or _identity(after) != _identity(visible)
        ):
            hold("proc_file_identity_changed:" + relative)
        return raw
    finally:
        os.close(fd)


def _fd_mount_id(fd: int, proc_fd: int | None = None) -> int:
    if proc_fd is None:
        raw = _read_proc_file(Path(f"/proc/self/fdinfo/{fd}"), 64 * 1024)
    else:
        raw = _read_proc_at(proc_fd, f"self/fdinfo/{fd}", 64 * 1024)
    try:
        text = raw.decode("ascii")
    except UnicodeDecodeError:
        hold("mount_id_record_invalid")
    values: list[int] = []
    for line in text.splitlines():
        if line.startswith("mnt_id:"):
            value = line.split(":", 1)[1].strip()
            if value.isdigit():
                values.append(int(value))
    if len(values) != 1 or values[0] <= 0:
        hold("mount_id_missing_or_ambiguous")
    return values[0]


def parse_dev_ino_lease(value: str, code: str) -> tuple[int, int]:
    if not isinstance(value, str) or len(value) > 41 or value.count(":") != 1:
        hold(code)
    dev_text, ino_text = value.split(":", 1)
    if (
        not dev_text.isdigit()
        or not ino_text.isdigit()
        or dev_text.startswith("0")
        or ino_text.startswith("0")
        or len(dev_text) > 20
        or len(ino_text) > 20
    ):
        hold(code)
    dev = int(dev_text, 10)
    ino = int(ino_text, 10)
    if dev <= 0 or ino <= 0:
        hold(code)
    return dev, ino


def verify_pid_namespace_lease_stats(
    self_ns: os.stat_result,
    init_ns: os.stat_result,
    expected: tuple[int, int],
) -> tuple[int, int]:
    observed = (int(self_ns.st_dev), int(self_ns.st_ino))
    init_observed = (int(init_ns.st_dev), int(init_ns.st_ino))
    if observed != init_observed:
        hold("not_in_pid1_namespace")
    if observed != expected:
        hold("host_pid_namespace_lease_mismatch")
    return observed


def verify_mount_namespace_lease_stats(
    self_ns: os.stat_result,
    init_ns: os.stat_result,
    expected: tuple[int, int],
) -> tuple[int, int]:
    observed = (int(self_ns.st_dev), int(self_ns.st_ino))
    init_observed = (int(init_ns.st_dev), int(init_ns.st_ino))
    if observed != init_observed:
        hold("not_in_pid1_mount_namespace")
    if observed != expected:
        hold("host_mount_namespace_lease_mismatch")
    return observed


def verify_user_namespace_lease_stats(
    self_ns: os.stat_result,
    init_ns: os.stat_result,
    expected: tuple[int, int],
) -> tuple[int, int]:
    observed = (int(self_ns.st_dev), int(self_ns.st_ino))
    init_observed = (int(init_ns.st_dev), int(init_ns.st_ino))
    if observed != init_observed:
        hold("not_in_pid1_user_namespace")
    if observed != expected:
        hold("host_user_namespace_lease_mismatch")
    return observed


def verify_host_filesystem_root_stats(
    self_root: os.stat_result,
    init_root: os.stat_result,
) -> tuple[int, int]:
    observed = (int(self_root.st_dev), int(self_root.st_ino))
    init_observed = (int(init_root.st_dev), int(init_root.st_ino))
    if observed != init_observed:
        hold("not_in_pid1_filesystem_root")
    return observed


def verify_complete_proc_visibility(
    raw: bytes,
    expected_mount_id: int,
) -> dict[str, Any]:
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        hold("proc_mountinfo_encoding_invalid:" + type(exc).__name__)
    matches: list[tuple[tuple[str, ...], tuple[str, ...]]] = []
    for line in text.splitlines():
        parts = line.split()
        try:
            separator = parts.index("-")
        except ValueError:
            hold("proc_mountinfo_row_invalid")
        if separator < 6 or separator + 3 >= len(parts):
            hold("proc_mountinfo_row_invalid")
        if not parts[0].isdigit():
            hold("proc_mountinfo_row_invalid")
        if int(parts[0], 10) != expected_mount_id:
            continue
        if parts[separator + 1] != "proc":
            hold("proc_mount_identity_not_procfs")
        mount_options = tuple(sorted(set(parts[5].split(","))))
        super_options = tuple(sorted(set(parts[separator + 3].split(","))))
        matches.append((mount_options, super_options))
    if len(matches) != 1:
        hold("proc_mount_selection_invalid")
    mount_options, super_options = matches[0]
    all_options = set(mount_options) | set(super_options)
    hidden = sorted(
        option for option in all_options
        if option.startswith("hidepid=") and option != "hidepid=0"
    )
    if hidden:
        hold("proc_visibility_restricted:" + ",".join(hidden))
    return {
        "mount_id": expected_mount_id,
        "mount_options": list(mount_options),
        "super_options": list(super_options),
        "hidepid_restricted": False,
        "complete_process_visibility_required": True,
    }


def open_pinned_proc_view(
    expected_host_pid_namespace_dev_ino: str,
    expected_host_mount_namespace_dev_ino: str,
    expected_host_user_namespace_dev_ino: str,
) -> tuple[int, dict[str, Any]]:
    expected_pid = parse_dev_ino_lease(
        expected_host_pid_namespace_dev_ino,
        "host_pid_namespace_lease_invalid",
    )
    expected_mount = parse_dev_ino_lease(
        expected_host_mount_namespace_dev_ino,
        "host_mount_namespace_lease_invalid",
    )
    expected_user = parse_dev_ino_lease(
        expected_host_user_namespace_dev_ino,
        "host_user_namespace_lease_invalid",
    )
    before = os.stat("/proc", follow_symlinks=False)
    if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
        hold("proc_root_not_direct_directory")
    fd = os.open("/proc", _directory_flags())
    try:
        opened = os.fstat(fd)
        visible = os.stat("/proc", follow_symlinks=False)
        if (
            not stat.S_ISDIR(opened.st_mode)
            or _identity(before) != _identity(opened)
            or _identity(opened) != _identity(visible)
        ):
            hold("proc_root_rebound")
        mount_id = _fd_mount_id(fd, fd)
        try:
            self_pid_ns = os.stat("self/ns/pid", dir_fd=fd, follow_symlinks=True)
            init_pid_ns = os.stat("1/ns/pid", dir_fd=fd, follow_symlinks=True)
            self_mount_ns = os.stat("self/ns/mnt", dir_fd=fd, follow_symlinks=True)
            init_mount_ns = os.stat("1/ns/mnt", dir_fd=fd, follow_symlinks=True)
            self_user_ns = os.stat("self/ns/user", dir_fd=fd, follow_symlinks=True)
            init_user_ns = os.stat("1/ns/user", dir_fd=fd, follow_symlinks=True)
            self_root = os.stat("self/root", dir_fd=fd, follow_symlinks=True)
            init_root = os.stat("1/root", dir_fd=fd, follow_symlinks=True)
        except OSError as exc:
            hold("host_namespace_or_root_unreadable:" + str(exc.errno))
        observed_pid = verify_pid_namespace_lease_stats(
            self_pid_ns, init_pid_ns, expected_pid
        )
        observed_mount = verify_mount_namespace_lease_stats(
            self_mount_ns, init_mount_ns, expected_mount
        )
        observed_user = verify_user_namespace_lease_stats(
            self_user_ns, init_user_ns, expected_user
        )
        observed_root = verify_host_filesystem_root_stats(self_root, init_root)
        visibility = verify_complete_proc_visibility(
            _read_proc_at(fd, "self/mountinfo", MAX_MOUNTINFO_BYTES),
            mount_id,
        )
        return fd, {
            "host_pid_namespace_external_lease_required": True,
            "host_pid_namespace_lease_verified": True,
            "host_pid_namespace_dev": str(observed_pid[0]),
            "host_pid_namespace_ino": str(observed_pid[1]),
            "pid1_namespace_matches_self": True,
            "host_mount_namespace_external_lease_required": True,
            "host_mount_namespace_lease_verified": True,
            "host_mount_namespace_dev": str(observed_mount[0]),
            "host_mount_namespace_ino": str(observed_mount[1]),
            "pid1_mount_namespace_matches_self": True,
            "host_user_namespace_external_lease_required": True,
            "host_user_namespace_lease_verified": True,
            "host_user_namespace_dev": str(observed_user[0]),
            "host_user_namespace_ino": str(observed_user[1]),
            "pid1_user_namespace_matches_self": True,
            "pid1_filesystem_root_matches_self": True,
            "host_filesystem_root_dev": str(observed_root[0]),
            "host_filesystem_root_ino": str(observed_root[1]),
            "proc_root_dev": opened.st_dev,
            "proc_root_ino": opened.st_ino,
            "proc_mount_id": mount_id,
            "proc_visibility": visibility,
            "host_namespace_lease_provenance_authenticated_by_census": False,
            "separately_reviewed_host_namespace_lease_required": True,
        }
    except BaseException:
        os.close(fd)
        raise


def open_retained_host_root(
    proc_fd: int,
    proc_scope: dict[str, Any],
) -> tuple[int, dict[str, Any]]:
    try:
        before = os.stat("1/root", dir_fd=proc_fd, follow_symlinks=True)
    except OSError as exc:
        hold("pid1_root_unreadable:" + str(exc.errno))
    fd = os.open("1/root", _host_root_flags(), dir_fd=proc_fd)
    try:
        opened = os.fstat(fd)
        if (
            not stat.S_ISDIR(opened.st_mode)
            or _identity(before) != _identity(opened)
            or str(opened.st_dev) != proc_scope["host_filesystem_root_dev"]
            or str(opened.st_ino) != proc_scope["host_filesystem_root_ino"]
        ):
            hold("pid1_root_descriptor_mismatch")
        return fd, {
            "host_root_dev": opened.st_dev,
            "host_root_ino": opened.st_ino,
            "host_root_mount_id": _fd_mount_id(fd, proc_fd),
            "retained_host_root_used": True,
            "target_resolution_root": "retained_proc_pid1_root",
        }
    except BaseException:
        os.close(fd)
        raise


def revalidate_retained_host_root(
    host_root_fd: int,
    proc_fd: int,
    initial: dict[str, Any],
) -> dict[str, bool]:
    opened = os.fstat(host_root_fd)
    try:
        visible = os.stat("1/root", dir_fd=proc_fd, follow_symlinks=True)
    except OSError as exc:
        hold("pid1_root_unreadable:" + str(exc.errno))
    if (
        opened.st_dev != initial["host_root_dev"]
        or opened.st_ino != initial["host_root_ino"]
        or _identity(opened) != _identity(visible)
        or _fd_mount_id(host_root_fd, proc_fd) != initial["host_root_mount_id"]
    ):
        hold("retained_host_root_changed")
    return {
        "retained_host_root_revalidated_after_census": True,
        "pid1_root_matches_retained_at_terminal": True,
    }


def revalidate_pinned_proc_view(
    fd: int,
    expected_host_pid_namespace_dev_ino: str,
    expected_host_mount_namespace_dev_ino: str,
    expected_host_user_namespace_dev_ino: str,
    initial: dict[str, Any],
) -> dict[str, bool]:
    expected_pid = parse_dev_ino_lease(
        expected_host_pid_namespace_dev_ino,
        "host_pid_namespace_lease_invalid",
    )
    expected_mount = parse_dev_ino_lease(
        expected_host_mount_namespace_dev_ino,
        "host_mount_namespace_lease_invalid",
    )
    expected_user = parse_dev_ino_lease(
        expected_host_user_namespace_dev_ino,
        "host_user_namespace_lease_invalid",
    )
    opened = os.fstat(fd)
    if (
        opened.st_dev != initial["proc_root_dev"]
        or opened.st_ino != initial["proc_root_ino"]
    ):
        hold("proc_root_generation_changed")
    try:
        self_pid_ns = os.stat("self/ns/pid", dir_fd=fd, follow_symlinks=True)
        init_pid_ns = os.stat("1/ns/pid", dir_fd=fd, follow_symlinks=True)
        self_mount_ns = os.stat("self/ns/mnt", dir_fd=fd, follow_symlinks=True)
        init_mount_ns = os.stat("1/ns/mnt", dir_fd=fd, follow_symlinks=True)
        self_user_ns = os.stat("self/ns/user", dir_fd=fd, follow_symlinks=True)
        init_user_ns = os.stat("1/ns/user", dir_fd=fd, follow_symlinks=True)
        self_root = os.stat("self/root", dir_fd=fd, follow_symlinks=True)
        init_root = os.stat("1/root", dir_fd=fd, follow_symlinks=True)
    except OSError as exc:
        hold("host_namespace_or_root_unreadable:" + str(exc.errno))
    observed_pid = verify_pid_namespace_lease_stats(
        self_pid_ns, init_pid_ns, expected_pid
    )
    if (
        str(observed_pid[0]) != initial["host_pid_namespace_dev"]
        or str(observed_pid[1]) != initial["host_pid_namespace_ino"]
    ):
        hold("host_pid_namespace_scope_changed")
    observed_mount = verify_mount_namespace_lease_stats(
        self_mount_ns, init_mount_ns, expected_mount
    )
    if (
        str(observed_mount[0]) != initial["host_mount_namespace_dev"]
        or str(observed_mount[1]) != initial["host_mount_namespace_ino"]
    ):
        hold("host_mount_namespace_scope_changed")
    observed_user = verify_user_namespace_lease_stats(
        self_user_ns, init_user_ns, expected_user
    )
    if (
        str(observed_user[0]) != initial["host_user_namespace_dev"]
        or str(observed_user[1]) != initial["host_user_namespace_ino"]
    ):
        hold("host_user_namespace_scope_changed")
    observed_root = verify_host_filesystem_root_stats(self_root, init_root)
    if (
        str(observed_root[0]) != initial["host_filesystem_root_dev"]
        or str(observed_root[1]) != initial["host_filesystem_root_ino"]
    ):
        hold("host_filesystem_root_scope_changed")
    visibility = verify_complete_proc_visibility(
        _read_proc_at(fd, "self/mountinfo", MAX_MOUNTINFO_BYTES),
        initial["proc_mount_id"],
    )
    if visibility != initial["proc_visibility"]:
        hold("proc_visibility_scope_changed")
    visible = os.stat("/proc", follow_symlinks=False)
    if _identity(visible) != _identity(opened):
        hold("visible_proc_root_changed")
    return {
        "host_pid_namespace_lease_revalidated_after_census": True,
        "host_mount_namespace_lease_revalidated_after_census": True,
        "host_user_namespace_lease_revalidated_after_census": True,
        "host_filesystem_root_revalidated_after_census": True,
        "proc_visibility_revalidated_after_census": True,
        "retained_procfs_view_revalidated_after_census": True,
        "visible_proc_root_matches_retained_at_terminal": True,
    }


def _open_bound_directory(path: Path) -> tuple[int, os.stat_result]:
    absolute = Path(os.path.abspath(os.fspath(path)))
    parts = absolute.parts
    if (
        not absolute.is_absolute()
        or not parts
        or parts[0] != "/"
        or any(part in ("", ".", "..") for part in parts[1:])
        or "\x00" in str(absolute)
    ):
        hold("directory_path_invalid")

    fd = os.open("/", _directory_flags())
    try:
        for component in parts[1:]:
            before = os.stat(component, dir_fd=fd, follow_symlinks=False)
            if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
                hold("directory_component_invalid:" + component)
            next_fd = os.open(component, _directory_flags(), dir_fd=fd)
            opened = os.fstat(next_fd)
            if _identity(before) != _identity(opened):
                os.close(next_fd)
                hold("directory_component_rebound:" + component)
            os.close(fd)
            fd = next_fd
        opened = os.fstat(fd)
        visible = os.stat(str(absolute), follow_symlinks=False)
        if _identity(opened) != _identity(visible):
            hold("directory_terminal_rebound")
        return fd, opened
    except BaseException:
        os.close(fd)
        raise


def _open_bound_directory_from_root(
    root_fd: int,
    path: Path,
) -> tuple[int, os.stat_result]:
    absolute = Path(os.path.abspath(os.fspath(path)))
    parts = absolute.parts
    if (
        not absolute.is_absolute()
        or not parts
        or parts[0] != "/"
        or any(part in ("", ".", "..") for part in parts[1:])
        or "\x00" in str(absolute)
    ):
        hold("directory_path_invalid")
    fd = os.dup(root_fd)
    try:
        root_opened = os.fstat(fd)
        if not stat.S_ISDIR(root_opened.st_mode):
            hold("host_root_descriptor_invalid")
        for component in parts[1:]:
            before = os.stat(component, dir_fd=fd, follow_symlinks=False)
            if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
                hold("directory_component_invalid:" + component)
            next_fd = os.open(component, _directory_flags(), dir_fd=fd)
            opened = os.fstat(next_fd)
            if _identity(before) != _identity(opened):
                os.close(next_fd)
                hold("directory_component_rebound:" + component)
            os.close(fd)
            fd = next_fd
        opened = os.fstat(fd)
        local = os.stat(".", dir_fd=fd, follow_symlinks=False)
        if _identity(opened) != _identity(local):
            hold("directory_terminal_rebound")
        return fd, opened
    except BaseException:
        os.close(fd)
        raise


def _protected_source_admission() -> dict[str, Any]:
    if os.getuid() != 0 or os.geteuid() != 0 or os.getgid() != 0 or os.getegid() != 0:
        hold("root_execution_required")
    if os.path.abspath(__file__) != str(PROTECTED_SOURCE):
        hold("protected_source_fixed_path_required")

    root_fd = os.open("/", _directory_flags())
    fd = root_fd
    try:
        root_st = os.fstat(fd)
        if not _root_custodied(root_st, directory=True):
            hold("root_ancestry_custody_invalid")
        for component in ("opt", PROTECTED_ROOT.name):
            before = os.stat(component, dir_fd=fd, follow_symlinks=False)
            if not _root_custodied(before, directory=True):
                hold("protected_source_ancestor_custody_invalid:" + component)
            next_fd = os.open(component, _directory_flags(), dir_fd=fd)
            opened = os.fstat(next_fd)
            if _identity(before) != _identity(opened):
                os.close(next_fd)
                hold("protected_source_ancestor_rebound:" + component)
            if fd != root_fd:
                os.close(fd)
            fd = next_fd

        leaf = PROTECTED_SOURCE.name
        before = os.stat(leaf, dir_fd=fd, follow_symlinks=False)
        if (
            not _root_custodied(before, directory=False)
            or before.st_nlink != 1
            or before.st_size < 1
            or before.st_size > MAX_SOURCE_BYTES
        ):
            hold("protected_source_leaf_custody_invalid")
        source_fd = os.open(leaf, _leaf_flags(), dir_fd=fd)
        try:
            opened = os.fstat(source_fd)
            if _generation(before) != _generation(opened):
                hold("protected_source_leaf_rebound")
            raw = _read_open_fd(source_fd, MAX_SOURCE_BYTES)
            after = os.fstat(source_fd)
            visible = os.stat(leaf, dir_fd=fd, follow_symlinks=False)
            if (
                _generation(opened) != _generation(after)
                or _generation(after) != _generation(visible)
            ):
                hold("protected_source_leaf_changed")
        finally:
            os.close(source_fd)

        parent_after = os.fstat(fd)
        parent_visible = os.stat(str(PROTECTED_ROOT), follow_symlinks=False)
        if _identity(parent_after) != _identity(parent_visible):
            hold("protected_source_parent_changed")

        return {
            "path": str(PROTECTED_SOURCE),
            "bytes": len(raw),
            "sha256": sha256(raw),
            "uid": before.st_uid,
            "gid": before.st_gid,
            "mode": format(stat.S_IMODE(before.st_mode), "04o"),
            "nlink": before.st_nlink,
            "protected_source_path_verified": True,
            "root_owned_nonwritable_ancestry_verified": True,
        }
    finally:
        if fd != root_fd:
            os.close(fd)
        os.close(root_fd)


def _python_runtime_observation() -> dict[str, Any]:
    executable = Path(os.path.realpath(_bootstrap_sys.executable))
    st = os.stat(executable, follow_symlinks=False)
    if (
        not stat.S_ISREG(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
    ):
        hold("python_runtime_custody_invalid")
    return {
        "resolved_executable": str(executable),
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "dev": st.st_dev,
        "ino": st.st_ino,
        "isolated_mode": True,
        "bytecode_disabled": True,
        "python_runtime_closure_verified": False,
    }


def _observe_regular_at(
    parent_fd: int,
    name: str,
    before: os.stat_result,
    expected_mnt: int,
    relative: str,
    proc_fd: int | None = None,
) -> os.stat_result:
    descriptor = os.open(name, _leaf_flags(), dir_fd=parent_fd)
    try:
        opened = os.fstat(descriptor)
        if (
            not stat.S_ISREG(opened.st_mode)
            or _generation(before) != _generation(opened)
        ):
            hold("target_file_rebound:" + relative)
        if _fd_mount_id(descriptor, proc_fd) != expected_mnt:
            hold("target_file_mount_boundary_invalid:" + relative)
        after = os.fstat(descriptor)
        visible = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("target_file_changed:" + relative)
        return opened
    finally:
        os.close(descriptor)


def _target_records(
    fd: int,
    prefix: str,
    expected_dev: int,
    expected_mnt: int,
    records: list[dict[str, Any]],
    identities: set[tuple[int, int]],
    totals: dict[str, int],
    depth: int,
    proc_fd: int | None = None,
) -> None:
    if depth > MAX_TARGET_DEPTH:
        hold("target_depth_exceeded")
    root = os.fstat(fd)
    if (
        not stat.S_ISDIR(root.st_mode)
        or root.st_dev != expected_dev
        or _fd_mount_id(fd, proc_fd) != expected_mnt
    ):
        hold("target_directory_boundary_invalid")
    identities.add((root.st_dev, root.st_ino))

    remaining = MAX_TARGET_ENTRIES - totals["entries"]
    if remaining < 0:
        hold("target_entry_limit_exceeded")
    names: list[str] = []
    with os.scandir(fd) as iterator:
        for entry in iterator:
            names.append(entry.name)
            if len(names) > remaining:
                hold("target_entry_limit_exceeded")
    names.sort()

    for name in names:
        if name in ("", ".", "..") or "/" in name or "\x00" in name:
            hold("target_name_invalid")
        relative = name if not prefix else prefix + "/" + name
        before = os.stat(name, dir_fd=fd, follow_symlinks=False)
        if before.st_dev != expected_dev:
            hold("target_cross_device_entry")
        if stat.S_ISDIR(before.st_mode):
            kind = "directory"
        elif stat.S_ISREG(before.st_mode):
            kind = "file"
        elif stat.S_ISLNK(before.st_mode):
            kind = "symlink"
        else:
            hold("target_special_file_forbidden:" + relative)

        if kind == "file":
            before = _observe_regular_at(
                fd, name, before, expected_mnt, relative, proc_fd
            )

        identities.add((before.st_dev, before.st_ino))
        records.append({
            "path": relative,
            "kind": kind,
            "dev": before.st_dev,
            "ino": before.st_ino,
            "uid": before.st_uid,
            "gid": before.st_gid,
            "mode": format(stat.S_IMODE(before.st_mode), "04o"),
            "nlink": before.st_nlink,
            "size": before.st_size,
            "mtime_ns": before.st_mtime_ns,
            "ctime_ns": before.st_ctime_ns,
        })
        totals["entries"] += 1
        if totals["entries"] > MAX_TARGET_ENTRIES:
            hold("target_entry_limit_exceeded")

        if kind == "directory":
            child = os.open(name, _directory_flags(), dir_fd=fd)
            try:
                opened = os.fstat(child)
                if _identity(before) != _identity(opened):
                    hold("target_directory_rebound:" + relative)
                _target_records(
                    child,
                    relative,
                    expected_dev,
                    expected_mnt,
                    records,
                    identities,
                    totals,
                    depth + 1,
                    proc_fd,
                )
                after = os.fstat(child)
                visible = os.stat(name, dir_fd=fd, follow_symlinks=False)
                if (
                    _generation(opened) != _generation(after)
                    or _generation(after) != _generation(visible)
                ):
                    hold("target_directory_changed:" + relative)
            finally:
                os.close(child)


def target_snapshot(
    path: Path = TARGET,
    proc_fd: int | None = None,
    host_root_fd: int | None = None,
) -> dict[str, Any]:
    if host_root_fd is None:
        parent_fd, parent_st = _open_bound_directory(path.parent)
    else:
        parent_fd, parent_st = _open_bound_directory_from_root(
            host_root_fd, path.parent
        )
    target_fd = -1
    try:
        before = os.stat(path.name, dir_fd=parent_fd, follow_symlinks=False)
        if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
            hold("target_not_direct_directory")
        target_fd = os.open(path.name, _directory_flags(), dir_fd=parent_fd)
        opened = os.fstat(target_fd)
        if _identity(before) != _identity(opened):
            hold("target_root_rebound")
        parent_mnt = _fd_mount_id(parent_fd, proc_fd)
        target_mnt = _fd_mount_id(target_fd, proc_fd)
        if opened.st_dev != parent_st.st_dev or target_mnt != parent_mnt:
            hold("target_root_mount_boundary_invalid")

        records: list[dict[str, Any]] = []
        identities: set[tuple[int, int]] = set()
        totals = {"entries": 0}
        _target_records(
            target_fd,
            "",
            opened.st_dev,
            target_mnt,
            records,
            identities,
            totals,
            0,
            proc_fd,
        )
        after = os.fstat(target_fd)
        visible = os.stat(path.name, dir_fd=parent_fd, follow_symlinks=False)
        if _generation(opened) != _generation(after) or _generation(after) != _generation(visible):
            hold("target_root_changed")

        public = {
            "path": str(path),
            "root_dev": opened.st_dev,
            "root_ino": opened.st_ino,
            "mount_id": target_mnt,
            "entry_count": totals["entries"],
            "identity_count": len(identities),
            "metadata_sha256": sha256(canonical(sorted(records, key=lambda x: x["path"]))),
        }
        return {**public, "identities": identities}
    finally:
        if target_fd >= 0:
            os.close(target_fd)
        os.close(parent_fd)


def _parse_proc_stat(raw: bytes, label: str) -> dict[str, Any]:
    try:
        text = raw.decode("ascii")
    except UnicodeDecodeError:
        hold(label + "_nonascii")
    close = text.rfind(") ")
    if close < 1:
        hold(label + "_shape_invalid")
    fields = text[close + 2 :].split()
    if len(fields) < 20:
        hold(label + "_fields_incomplete")
    state = fields[0]
    start_ticks = fields[19]
    if len(state) != 1 or not start_ticks.isdigit() or not fields[6].isdigit():
        hold(label + "_identity_invalid")
    return {
        "state": state,
        "start_ticks": start_ticks,
        "kernel_thread": bool(int(fields[6]) & PF_KTHREAD),
    }


def _proc_stat(
    pid: int,
    proc_fd: int | None = None,
) -> dict[str, Any] | None:
    try:
        raw = (
            _read_proc_file(PROC / str(pid) / "stat", MAX_STAT_BYTES)
            if proc_fd is None
            else _read_proc_at(proc_fd, f"{pid}/stat", MAX_STAT_BYTES)
        )
        return _parse_proc_stat(raw, "proc_stat")
    except FileNotFoundError:
        return None
    except OSError as exc:
        if exc.errno in (errno.ENOENT, errno.ESRCH):
            return None
        raise


def _task_stat(
    pid: int,
    tid: int,
    proc_fd: int | None = None,
) -> dict[str, Any] | None:
    try:
        raw = (
            _read_proc_file(PROC / str(pid) / "task" / str(tid) / "stat", MAX_STAT_BYTES)
            if proc_fd is None
            else _read_proc_at(proc_fd, f"{pid}/task/{tid}/stat", MAX_STAT_BYTES)
        )
        return _parse_proc_stat(raw, "proc_task_stat")
    except FileNotFoundError:
        return None
    except OSError as exc:
        if exc.errno in (errno.ENOENT, errno.ESRCH):
            return None
        raise


def _all_pids(proc_fd: int | None = None) -> list[int]:
    pids: list[int] = []
    scan_fd = -1
    try:
        if proc_fd is None:
            iterator = os.scandir(PROC)
        else:
            scan_fd = os.open(".", _directory_flags(), dir_fd=proc_fd)
            iterator = os.scandir(scan_fd)
        with iterator:
            for entry in iterator:
                if not entry.name.isdigit():
                    continue
                pids.append(int(entry.name))
                if len(pids) > MAX_PIDS:
                    hold("proc_pid_limit_exceeded")
    finally:
        if scan_fd >= 0:
            os.close(scan_fd)
    pids.sort()
    return pids


def _task_inventory(
    pid: int,
    proc_fd: int | None = None,
) -> dict[int, tuple[str, str]] | None:
    tids: list[int] = []
    task_fd = -1
    try:
        if proc_fd is None:
            iterator = os.scandir(PROC / str(pid) / "task")
        else:
            task_fd = os.open(
                f"{pid}/task", _directory_flags(), dir_fd=proc_fd
            )
            iterator = os.scandir(task_fd)
    except OSError as exc:
        if task_fd >= 0:
            os.close(task_fd)
        if exc.errno in (errno.ENOENT, errno.ESRCH, errno.EACCES, errno.EPERM):
            return None
        raise
    try:
        with iterator:
            for entry in iterator:
                if not entry.name.isdigit():
                    continue
                tids.append(int(entry.name))
                if len(tids) > MAX_TASKS_PER_PROCESS:
                    hold("proc_task_limit_exceeded")
    finally:
        if task_fd >= 0:
            os.close(task_fd)
    tids.sort()
    observed: dict[int, tuple[str, str]] = {}
    for tid in tids:
        row = _task_stat(pid, tid, proc_fd)
        if row is None:
            return None
        observed[tid] = (row["state"], row["start_ticks"])
    if not observed or pid not in observed:
        return None
    return observed


def _task_inventory_digest(
    inventory: dict[int, tuple[str, str]],
) -> str:
    material = [
        {"tid": tid, "state": state, "start_ticks": start_ticks}
        for tid, (state, start_ticks) in sorted(inventory.items())
    ]
    return sha256(canonical(material))


def _task_mount_namespace(
    pid: int,
    tid: int,
    proc_fd: int | None = None,
) -> tuple[int, int] | None:
    try:
        st = (
            os.stat(
                PROC / str(pid) / "task" / str(tid) / "ns" / "mnt",
                follow_symlinks=True,
            )
            if proc_fd is None
            else os.stat(
                f"{pid}/task/{tid}/ns/mnt",
                dir_fd=proc_fd,
                follow_symlinks=True,
            )
        )
    except OSError as exc:
        if exc.errno in (errno.ENOENT, errno.ESRCH, errno.EACCES, errno.EPERM):
            return None
        raise
    return int(st.st_dev), int(st.st_ino)


def _task_mount_namespace_inventory(
    pid: int,
    inventory: dict[int, tuple[str, str]],
    expected_host_mount_namespace: tuple[int, int],
    proc_fd: int | None = None,
) -> tuple[dict[int, tuple[int, int]] | None, int | None]:
    if (
        type(expected_host_mount_namespace) is not tuple
        or len(expected_host_mount_namespace) != 2
        or any(type(value) is not int or value <= 0 for value in expected_host_mount_namespace)
    ):
        hold("host_mount_namespace_identity_invalid")
    observed: dict[int, tuple[int, int]] = {}
    for tid, (state, _start_ticks) in sorted(inventory.items()):
        if state in ("Z", "X"):
            continue
        namespace = _task_mount_namespace(pid, tid, proc_fd)
        if namespace is None:
            return None, None
        if namespace != expected_host_mount_namespace:
            return observed, tid
        observed[tid] = namespace
    return observed, None


def _matches(st: os.stat_result, identities: set[tuple[int, int]]) -> bool:
    return (st.st_dev, st.st_ino) in identities


def _scan_link_path(
    path: Path,
    identities: set[tuple[int, int]],
) -> tuple[bool, bool]:
    try:
        st = os.stat(path, follow_symlinks=True)
    except OSError as exc:
        if exc.errno in (errno.ENOENT, errno.ESRCH, errno.EACCES, errno.EPERM):
            return False, True
        raise
    return _matches(st, identities), False


def _scan_link(
    pid: int,
    name: str,
    identities: set[tuple[int, int]],
    proc_fd: int | None = None,
) -> tuple[bool, bool]:
    if proc_fd is None:
        return _scan_link_path(PROC / str(pid) / name, identities)
    try:
        st = os.stat(f"{pid}/{name}", dir_fd=proc_fd, follow_symlinks=True)
    except OSError as exc:
        if exc.errno in (errno.ENOENT, errno.ESRCH, errno.EACCES, errno.EPERM):
            return False, True
        raise
    return _matches(st, identities), False


def _scan_task_link(
    pid: int,
    tid: int,
    name: str,
    identities: set[tuple[int, int]],
    proc_fd: int | None = None,
) -> tuple[bool, bool]:
    if proc_fd is None:
        return _scan_link_path(
            PROC / str(pid) / "task" / str(tid) / name,
            identities,
        )
    try:
        st = os.stat(
            f"{pid}/task/{tid}/{name}",
            dir_fd=proc_fd,
            follow_symlinks=True,
        )
    except OSError as exc:
        if exc.errno in (errno.ENOENT, errno.ESRCH, errno.EACCES, errno.EPERM):
            return False, True
        raise
    return _matches(st, identities), False


def _scan_fd_root(
    root: Path | str,
    identities: set[tuple[int, int]],
    proc_fd: int | None = None,
) -> tuple[int, int]:
    refs = 0
    incomplete = 0
    seen = 0
    directory_fd = -1
    try:
        if proc_fd is None:
            iterator = os.scandir(root)
        else:
            directory_fd = os.open(str(root), _directory_flags(), dir_fd=proc_fd)
            iterator = os.scandir(directory_fd)
    except OSError as exc:
        if directory_fd >= 0:
            os.close(directory_fd)
        if exc.errno in (errno.ENOENT, errno.ESRCH, errno.EACCES, errno.EPERM):
            return 0, 1
        raise
    try:
        with iterator:
            for entry in iterator:
                if not entry.name.isdigit():
                    continue
                seen += 1
                if seen > MAX_FDS_PER_PROCESS:
                    hold("proc_fd_limit_exceeded")
                try:
                    st = (
                        os.stat(Path(root) / entry.name, follow_symlinks=True)
                        if proc_fd is None
                        else os.stat(
                            entry.name,
                            dir_fd=directory_fd,
                            follow_symlinks=True,
                        )
                    )
                except OSError as exc:
                    if exc.errno in (
                        errno.ENOENT,
                        errno.ESRCH,
                        errno.EACCES,
                        errno.EPERM,
                    ):
                        incomplete += 1
                        continue
                    raise
                if _matches(st, identities):
                    refs += 1
    finally:
        if directory_fd >= 0:
            os.close(directory_fd)
    return refs, incomplete

def _scan_fds(
    pid: int,
    identities: set[tuple[int, int]],
    proc_fd: int | None = None,
) -> tuple[int, int]:
    root = PROC / str(pid) / "fd" if proc_fd is None else f"{pid}/fd"
    return _scan_fd_root(root, identities, proc_fd)


def _scan_task_fds(
    pid: int,
    tid: int,
    identities: set[tuple[int, int]],
    proc_fd: int | None = None,
) -> tuple[int, int]:
    root = (
        PROC / str(pid) / "task" / str(tid) / "fd"
        if proc_fd is None
        else f"{pid}/task/{tid}/fd"
    )
    return _scan_fd_root(root, identities, proc_fd)


def _scan_maps(
    pid: int,
    identities: set[tuple[int, int]],
    proc_fd: int | None = None,
) -> tuple[int, bool]:
    try:
        raw = (
            _read_proc_file(PROC / str(pid) / "maps", MAX_MAPS_BYTES)
            if proc_fd is None
            else _read_proc_at(proc_fd, f"{pid}/maps", MAX_MAPS_BYTES)
        )
    except OSError as exc:
        if exc.errno in (
            errno.ENOENT,
            errno.ESRCH,
            errno.EACCES,
            errno.EPERM,
        ):
            return 0, True
        raise
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeDecodeError:
        hold("proc_maps_non_utf8")
    refs = 0
    for line in text.splitlines():
        parts = line.split(None, 5)
        if len(parts) < 5 or ":" not in parts[3] or not parts[4].isdigit():
            hold("proc_maps_line_invalid")
        major_text, minor_text = parts[3].split(":", 1)
        try:
            dev = os.makedev(int(major_text, 16), int(minor_text, 16))
        except ValueError:
            hold("proc_maps_device_invalid")
        ino = int(parts[4])
        if ino > 0 and (dev, ino) in identities:
            refs += 1
    return refs, False


def scan_process(
    pid: int,
    identities: set[tuple[int, int]],
    expected_host_mount_namespace: tuple[int, int],
    proc_fd: int | None = None,
) -> dict[str, Any]:
    before = _proc_stat(pid, proc_fd)
    if before is None:
        return {"pid": pid, "status": "vanished"}
    if before["kernel_thread"]:
        after = _proc_stat(pid, proc_fd)
        if after != before:
            return {"pid": pid, "status": "generation_changed_or_vanished"}
        return {"pid": pid, "status": "kernel_thread_skipped"}
    tasks_before = _task_inventory(pid, proc_fd)
    if tasks_before is None:
        return {
            "pid": pid,
            "status": "task_inventory_changed_or_unreadable",
            "start_ticks": before["start_ticks"],
        }
    mount_namespaces_before, divergent_tid = _task_mount_namespace_inventory(
        pid, tasks_before, expected_host_mount_namespace, proc_fd
    )
    if divergent_tid is not None:
        return {
            "pid": pid,
            "status": "task_mount_namespace_diverged",
            "start_ticks": before["start_ticks"],
            "task_count": len(tasks_before),
            "divergent_tid": divergent_tid,
            "task_mount_namespace_inventory_stable": False,
        }
    if mount_namespaces_before is None:
        return {
            "pid": pid,
            "status": "task_mount_namespace_changed_or_unreadable",
            "start_ticks": before["start_ticks"],
            "task_count": len(tasks_before),
            "task_mount_namespace_inventory_stable": False,
        }

    if before["state"] in ("Z", "X"):
        live_tasks = [
            tid for tid, (state, _start_ticks) in tasks_before.items()
            if state not in ("Z", "X")
        ]
        if live_tasks:
            return {
                "pid": pid,
                "status": "zombie_leader_with_live_tasks",
                "start_ticks": before["start_ticks"],
                "task_count": len(tasks_before),
                "live_task_count": len(live_tasks),
                "task_inventory_stable": False,
            }
        tasks_after = _task_inventory(pid, proc_fd)
        mount_namespaces_after, divergent_tid = (
            (None, None)
            if tasks_after is None
            else _task_mount_namespace_inventory(
                pid, tasks_after, expected_host_mount_namespace, proc_fd
            )
        )
        after = _proc_stat(pid, proc_fd)
        if divergent_tid is not None:
            return {
                "pid": pid,
                "status": "task_mount_namespace_diverged",
                "start_ticks": before["start_ticks"],
                "task_count": len(tasks_before),
                "divergent_tid": divergent_tid,
                "task_mount_namespace_inventory_stable": False,
            }
        if (
            after != before
            or tasks_after is None
            or tasks_after != tasks_before
            or mount_namespaces_after is None
            or mount_namespaces_after != mount_namespaces_before
        ):
            return {
                "pid": pid,
                "status": "generation_changed_or_vanished",
                "start_ticks": before["start_ticks"],
                "task_count": len(tasks_before),
            }
        return {
            "pid": pid,
            "status": "not_live",
            "start_ticks": before["start_ticks"],
            "task_count": len(tasks_before),
            "live_task_count": 0,
            "task_inventory_stable": True,
            "task_mount_namespace_inventory_stable": True,
            "task_generation_digest": _task_inventory_digest(tasks_before),
        }

    refs = {"cwd": 0, "root": 0, "exe": 0, "fd": 0, "maps": 0}
    incomplete = 0
    live_tasks = 0

    # CLONE_THREAD implies CLONE_VM on Linux, so exe/maps are process-mm
    # observations. files_struct and fs_struct may be unshared per thread;
    # inspect cwd/root/fd for every live TID rather than only the TGID leader.
    matched, failed = _scan_link(pid, "exe", identities, proc_fd)
    refs["exe"] += int(matched)
    incomplete += int(failed)
    refs["maps"], maps_incomplete = _scan_maps(pid, identities, proc_fd)
    incomplete += int(maps_incomplete)

    for tid, (state, _start_ticks) in sorted(tasks_before.items()):
        if state in ("Z", "X"):
            continue
        live_tasks += 1
        for name in ("cwd", "root"):
            matched, failed = _scan_task_link(pid, tid, name, identities, proc_fd)
            refs[name] += int(matched)
            incomplete += int(failed)
        task_refs, task_incomplete = _scan_task_fds(pid, tid, identities, proc_fd)
        refs["fd"] += task_refs
        incomplete += task_incomplete

    tasks_after = _task_inventory(pid, proc_fd)
    mount_namespaces_after, divergent_tid = (
        (None, None)
        if tasks_after is None
        else _task_mount_namespace_inventory(
            pid, tasks_after, expected_host_mount_namespace, proc_fd
        )
    )
    after = _proc_stat(pid, proc_fd)
    if divergent_tid is not None:
        return {
            "pid": pid,
            "status": "task_mount_namespace_diverged",
            "start_ticks": before["start_ticks"],
            "task_count": len(tasks_before),
            "divergent_tid": divergent_tid,
            "task_mount_namespace_inventory_stable": False,
        }
    if (
        after is None
        or after != before
        or tasks_after is None
        or tasks_after != tasks_before
        or mount_namespaces_after is None
        or mount_namespaces_after != mount_namespaces_before
    ):
        return {
            "pid": pid,
            "status": "generation_changed_or_vanished",
            "start_ticks": before["start_ticks"],
            "task_count": len(tasks_before),
        }

    return {
        "pid": pid,
        "status": "scanned",
        "start_ticks": before["start_ticks"],
        "task_count": len(tasks_before),
        "live_task_count": live_tasks,
        "task_inventory_stable": True,
        "task_mount_namespace_inventory_stable": True,
        "task_generation_digest": _task_inventory_digest(tasks_before),
        "reference_count": sum(refs.values()),
        "references": refs,
        "incomplete_observations": incomplete,
    }


def classify_attempt(
    start_pids: list[int],
    end_pids: list[int],
    rows: list[dict[str, Any]],
    target_stable: bool,
) -> dict[str, Any]:
    referenced = [
        row for row in rows
        if row.get("status") == "scanned" and row.get("reference_count", 0) > 0
    ]
    incomplete = [
        row for row in rows
        if row.get("status") not in ("scanned", "kernel_thread_skipped", "not_live")
        or (
            row.get("status") == "scanned"
            and row.get("incomplete_observations", 0) != 0
        )
    ]
    by_kind = {key: 0 for key in ("cwd", "root", "exe", "fd", "maps")}
    for row in referenced:
        for key in by_kind:
            by_kind[key] += int(row["references"][key])
    pid_stable = start_pids == end_pids
    scanned_rows = [row for row in rows if row.get("status") == "scanned"]
    task_inventory_stable = all(
        row.get("task_inventory_stable") is True for row in scanned_rows
    )
    task_mount_namespace_inventory_stable = all(
        row.get("task_mount_namespace_inventory_stable") is True
        for row in scanned_rows
    )
    clean = (
        pid_stable
        and target_stable
        and task_inventory_stable
        and task_mount_namespace_inventory_stable
        and len(rows) == len(start_pids)
        and not referenced
        and not incomplete
    )
    return {
        "pid_count": len(start_pids),
        "pid_set_stable": pid_stable,
        "task_inventory_stable": task_inventory_stable,
        "task_mount_namespace_inventory_stable":
            task_mount_namespace_inventory_stable,
        "task_count": sum(int(row.get("task_count", 0)) for row in rows),
        "target_identity_set_stable": target_stable,
        "referenced_process_count": len(referenced),
        "incomplete_process_count": len(incomplete),
        "kernel_thread_count": sum(
            row.get("status") == "kernel_thread_skipped" for row in rows
        ),
        "not_live_process_count": sum(
            row.get("status") == "not_live" for row in rows
        ),
        "reference_count_by_kind": by_kind,
        "host_scoped_target_reference_absent_candidate": clean,
        "all_process_target_reference_absent_observed": False,
        "all_process_reference_absence_proven": False,
        "fd_table_stability_proven": False,
        "mapping_set_stability_proven": False,
        "mount_namespace_reference_scan_performed": False,
        "mount_namespace_reference_absence_proven": False,
        "task_inventory_generation_stability_required": True,
        "per_thread_files_fs_reference_scan_required": True,
        "per_thread_host_mount_namespace_required": True,
        "task_mount_namespace_generation_stability_required": True,
        "private_task_mount_namespace_rejected": True,
        "process_reference_snapshot_race_free": False,
        "live_at_use_reverification_required": True,
    }


def all_process_census(
    expected_host_pid_namespace_dev_ino: str,
    expected_host_mount_namespace_dev_ino: str,
    expected_host_user_namespace_dev_ino: str,
) -> dict[str, Any]:
    proc_fd = -1
    host_root_fd = -1
    try:
        proc_fd, proc_scope = open_pinned_proc_view(
            expected_host_pid_namespace_dev_ino,
            expected_host_mount_namespace_dev_ino,
            expected_host_user_namespace_dev_ino,
        )
        host_root_fd, host_root_scope = open_retained_host_root(
            proc_fd, proc_scope
        )
        expected_host_mount_namespace = (
            int(proc_scope["host_mount_namespace_dev"]),
            int(proc_scope["host_mount_namespace_ino"]),
        )
        attempts: list[dict[str, Any]] = []
        for attempt in range(1, MAX_SCAN_ATTEMPTS + 1):
            target_before = target_snapshot(
                TARGET, proc_fd, host_root_fd
            )
            identities = target_before["identities"]
            start_pids = _all_pids(proc_fd)
            rows: list[dict[str, Any]] = []
            total_tasks = 0
            for pid in start_pids:
                row = scan_process(
                    pid,
                    identities,
                    expected_host_mount_namespace,
                    proc_fd,
                )
                total_tasks += int(row.get("task_count", 0))
                if total_tasks > MAX_TOTAL_TASKS:
                    hold("proc_total_task_limit_exceeded")
                rows.append(row)
            end_pids = _all_pids(proc_fd)
            target_after = target_snapshot(
                TARGET, proc_fd, host_root_fd
            )
            stable = (
                target_before["root_dev"] == target_after["root_dev"]
                and target_before["root_ino"] == target_after["root_ino"]
                and target_before["mount_id"] == target_after["mount_id"]
                and target_before["metadata_sha256"] == target_after["metadata_sha256"]
                and target_before["identity_count"] == target_after["identity_count"]
            )
            classified = classify_attempt(start_pids, end_pids, rows, stable)
            attempts.append({"attempt": attempt, **classified})
            if classified["referenced_process_count"] > 0:
                break
            if classified["host_scoped_target_reference_absent_candidate"]:
                break

        terminal_host_root = revalidate_retained_host_root(
            host_root_fd, proc_fd, host_root_scope
        )
        terminal_scope = revalidate_pinned_proc_view(
            proc_fd,
            expected_host_pid_namespace_dev_ino,
            expected_host_mount_namespace_dev_ino,
            expected_host_user_namespace_dev_ino,
            proc_scope,
        )
        selected = attempts[-1]
        return {
            "proc_scope": proc_scope,
            "host_root_scope": host_root_scope,
            **terminal_host_root,
            **terminal_scope,
            "host_namespace_lease_provenance_authenticated_by_census": False,
            "separately_reviewed_host_namespace_lease_required": True,
            "target_resolved_in_host_mount_namespace": True,
            "target_resolved_via_retained_host_root": True,
            "retained_host_root_used": True,
            "host_filesystem_root_matches_pid1": True,
            "attempt_count": len(attempts),
            "attempts": attempts,
            "selected_attempt": selected["attempt"],
            "host_scoped_target_reference_absent_candidate":
                selected["host_scoped_target_reference_absent_candidate"],
            "all_process_target_reference_absent_observed": False,
            "all_process_reference_absence_proven": False,
            "fd_table_stability_proven": False,
            "mapping_set_stability_proven": False,
            "mount_namespace_reference_scan_performed": False,
            "mount_namespace_reference_absence_proven": False,
            "task_inventory_generation_stability_required": True,
            "per_thread_files_fs_reference_scan_required": True,
            "per_thread_host_mount_namespace_required": True,
            "task_mount_namespace_generation_stability_required": True,
            "private_task_mount_namespace_rejected": True,
            "process_reference_snapshot_race_free": False,
            "live_at_use_reverification_required": True,
        }
    finally:
        if host_root_fd >= 0:
            os.close(host_root_fd)
        if proc_fd >= 0:
            os.close(proc_fd)


def census(
    expected_host_pid_namespace_dev_ino: str,
    expected_host_mount_namespace_dev_ino: str,
    expected_host_user_namespace_dev_ino: str,
) -> dict[str, Any]:
    source = _protected_source_admission()
    python_runtime = _python_runtime_observation()
    process = all_process_census(
        expected_host_pid_namespace_dev_ino,
        expected_host_mount_namespace_dev_ino,
        expected_host_user_namespace_dev_ino,
    )
    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "lineage": {
            "parent_current_uid_head": PARENT_CURRENT_UID_HEAD,
            "parent_current_uid_source_git_blob_sha1": PARENT_CURRENT_UID_SOURCE_BLOB,
            "prestate_head": PRESTATE_HEAD,
            "prestate_source_git_blob_sha1": PRESTATE_SOURCE_BLOB,
            "archive_lock_git_blob_sha1": ARCHIVE_LOCK_BLOB,
            "archive_lock_sha256": ARCHIVE_LOCK_SHA256,
        },
        "protected_source": source,
        "python_runtime": python_runtime,
        "target": str(TARGET),
        "process": process,
        "host_pid_namespace_external_lease_required": True,
        "host_pid_namespace_lease_verified": True,
        "host_mount_namespace_external_lease_required": True,
        "host_mount_namespace_lease_verified": True,
        "host_user_namespace_external_lease_required": True,
        "host_user_namespace_lease_verified": True,
        "target_resolved_in_host_mount_namespace": True,
        "target_resolved_via_retained_host_root": True,
        "retained_host_root_used": True,
        "retained_host_root_revalidated_after_census": True,
        "host_filesystem_root_matches_pid1": True,
        "complete_proc_visibility_verified": True,
        "retained_procfs_view_used": True,
        "retained_procfs_view_revalidated_after_census": True,
        "host_namespace_lease_provenance_authenticated_by_census": False,
        "separately_reviewed_host_namespace_lease_required": True,
        "production_read_only": True,
        "production_filesystem_write": False,
        "process_environment_read": False,
        "process_arguments_read": False,
        "proc_cmdline_read": False,
        "proc_environ_read": False,
        "proc_fd_target_text_read": False,
        "proc_maps_path_text_retained": False,
        "mount_namespace_reference_scan_performed": False,
        "mount_namespace_reference_absence_proven": False,
        "per_thread_host_mount_namespace_required": True,
        "task_mount_namespace_generation_stability_required": True,
        "private_task_mount_namespace_rejected": True,
        "service_mutation": False,
        "systemd_mutation": False,
        "install_target_selected": False,
        "existing_target_replaced": False,
        "replacement_apply_authorized": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
    }
    return {
        **body,
        "census_id": "voidbuycustodyallprocref1_" + sha256(canonical(body)),
    }


def self_test() -> None:
    clean_rows = [
        {
            "pid": 1,
            "status": "scanned",
            "start_ticks": "100",
            "task_count": 1,
            "live_task_count": 1,
            "task_inventory_stable": True,
            "task_mount_namespace_inventory_stable": True,
            "task_generation_digest": "0" * 64,
            "reference_count": 0,
            "references": {"cwd": 0, "root": 0, "exe": 0, "fd": 0, "maps": 0},
            "incomplete_observations": 0,
        },
        {"pid": 2, "status": "kernel_thread_skipped"},
        {"pid": 3, "status": "not_live"},
    ]
    clean = classify_attempt([1, 2, 3], [1, 2, 3], clean_rows, True)
    if clean["host_scoped_target_reference_absent_candidate"] is not True:
        hold("self_test_clean_candidate_rejected")
    if clean["all_process_target_reference_absent_observed"] is not False:
        hold("self_test_untrusted_lease_promoted")
    if (
        clean["all_process_reference_absence_proven"] is not False
        or clean["fd_table_stability_proven"] is not False
        or clean["mapping_set_stability_proven"] is not False
        or clean["process_reference_snapshot_race_free"] is not False
        or clean["live_at_use_reverification_required"] is not True
    ):
        hold("self_test_authority_boundary_invalid")

    ref_row = {
        **clean_rows[0],
        "reference_count": 1,
        "references": {"cwd": 0, "root": 0, "exe": 0, "fd": 1, "maps": 0},
    }
    if classify_attempt([1], [1], [ref_row], True)[
        "all_process_target_reference_absent_observed"
    ] is not False:
        hold("self_test_reference_accepted")

    if classify_attempt([1], [1, 4], [clean_rows[0]], True)[
        "all_process_target_reference_absent_observed"
    ] is not False:
        hold("self_test_pid_drift_accepted")

    if classify_attempt([1], [1], [clean_rows[0]], False)[
        "all_process_target_reference_absent_observed"
    ] is not False:
        hold("self_test_target_drift_accepted")

    zombie_worker_row = {
        "pid": 4,
        "status": "zombie_leader_with_live_tasks",
        "start_ticks": "200",
        "task_count": 2,
        "live_task_count": 1,
        "task_inventory_stable": False,
    }
    if classify_attempt([4], [4], [zombie_worker_row], True)[
        "host_scoped_target_reference_absent_candidate"
    ] is not False:
        hold("self_test_zombie_leader_live_worker_accepted")

    with tempfile.TemporaryDirectory(
        prefix="void-custody-allprocref-selftest-"
    ) as tmp:
        root = Path(tmp) / "target"
        (root / "nested").mkdir(parents=True, mode=0o700)
        (root / "a").write_bytes(b"a")
        snapshot = target_snapshot(root)
        if snapshot["entry_count"] != 2 or snapshot["identity_count"] != 3:
            hold("self_test_target_snapshot_invalid")

    if parse_dev_ino_lease("12:34", "test_lease_invalid") != (12, 34):
        hold("self_test_namespace_lease_parse_invalid")
    fake_self = type("FakeStat", (), {"st_dev": 12, "st_ino": 34})()
    fake_init = type("FakeStat", (), {"st_dev": 12, "st_ino": 34})()
    if verify_pid_namespace_lease_stats(
        fake_self, fake_init, (12, 34)
    ) != (12, 34):
        hold("self_test_pid_namespace_lease_verify_invalid")
    try:
        verify_pid_namespace_lease_stats(
            fake_self,
            type("FakeStat", (), {"st_dev": 12, "st_ino": 35})(),
            (12, 34),
        )
    except CensusHold as exc:
        if "not_in_pid1_namespace" not in str(exc):
            raise
    else:
        hold("self_test_private_pid_namespace_accepted")
    try:
        verify_pid_namespace_lease_stats(fake_self, fake_init, (12, 35))
    except CensusHold as exc:
        if "host_pid_namespace_lease_mismatch" not in str(exc):
            raise
    else:
        hold("self_test_pid_namespace_lease_mismatch_accepted")
    if verify_mount_namespace_lease_stats(
        fake_self, fake_init, (12, 34)
    ) != (12, 34):
        hold("self_test_mount_namespace_lease_verify_invalid")
    if verify_host_filesystem_root_stats(
        fake_self, fake_init
    ) != (12, 34):
        hold("self_test_host_filesystem_root_verify_invalid")
    try:
        verify_host_filesystem_root_stats(
            fake_self,
            type("FakeStat", (), {"st_dev": 12, "st_ino": 35})(),
        )
    except CensusHold as exc:
        if "not_in_pid1_filesystem_root" not in str(exc):
            raise
    else:
        hold("self_test_private_filesystem_root_accepted")
    try:
        verify_mount_namespace_lease_stats(
            fake_self,
            type("FakeStat", (), {"st_dev": 12, "st_ino": 35})(),
            (12, 34),
        )
    except CensusHold as exc:
        if "not_in_pid1_mount_namespace" not in str(exc):
            raise
    else:
        hold("self_test_private_mount_namespace_accepted")
    if verify_user_namespace_lease_stats(
        fake_self, fake_init, (12, 34)
    ) != (12, 34):
        hold("self_test_user_namespace_lease_verify_invalid")
    try:
        verify_user_namespace_lease_stats(
            fake_self,
            type("FakeStat", (), {"st_dev": 12, "st_ino": 35})(),
            (12, 34),
        )
    except CensusHold as exc:
        if "not_in_pid1_user_namespace" not in str(exc):
            raise
    else:
        hold("self_test_private_user_namespace_accepted")
    try:
        verify_user_namespace_lease_stats(
            fake_self, fake_init, (12, 35)
        )
    except CensusHold as exc:
        if "host_user_namespace_lease_mismatch" not in str(exc):
            raise
    else:
        hold("self_test_host_user_namespace_lease_mismatch_accepted")

    visible_mountinfo = (
        b"42 1 0:1 / /proc rw,nosuid,nodev,noexec,relatime"
        b" - proc proc rw,hidepid=0\n"
    )
    hidden_mountinfo = (
        b"42 1 0:1 / /proc rw,nosuid,nodev,noexec,relatime"
        b" - proc proc rw,hidepid=2\n"
    )
    if verify_complete_proc_visibility(
        visible_mountinfo, 42
    )["hidepid_restricted"] is not False:
        hold("self_test_proc_visibility_invalid")
    try:
        verify_complete_proc_visibility(hidden_mountinfo, 42)
    except CensusHold as exc:
        if "proc_visibility_restricted" not in str(exc):
            raise
    else:
        hold("self_test_hidepid_restriction_accepted")

    print(MARKER + "_SELF_TEST_GREEN")
    print("protected_source_fixed_path_required=true")
    print("root_owned_nonwritable_ancestry_required=true")
    print("root_execution_required=true")
    print("target_identity_metadata_only=true")
    print("regular_file_mount_id_checked=true")
    print("all_numeric_pids_scope=true")
    print("kernel_thread_explicit_skip=true")
    print("pid_generation_recheck=true")
    print("host_pid_namespace_external_lease_required=true")
    print("private_pid_namespace_rejected=true")
    print("host_pid_namespace_lease_mismatch_rejected=true")
    print("host_mount_namespace_external_lease_required=true")
    print("private_mount_namespace_rejected=true")
    print("host_mount_namespace_lease_mismatch_rejected=true")
    print("host_user_namespace_external_lease_required=true")
    print("private_user_namespace_rejected=true")
    print("host_user_namespace_lease_mismatch_rejected=true")
    print("host_filesystem_root_matches_pid1=true")
    print("chroot_filesystem_root_mismatch_rejected=true")
    print("complete_proc_visibility_required=true")
    print("hidepid_restricted_proc_holds=true")
    print("retained_procfs_view_required=true")
    print("retained_procfs_view_descriptor_relative=true")
    print("retained_procfs_view_revalidated_after_census=true")
    print("target_resolved_in_host_mount_namespace=true")
    print("target_resolved_via_retained_host_root=true")
    print("retained_host_root_used=true")
    print("retained_host_root_revalidated_after_census=true")
    print("host_namespace_lease_provenance_authenticated_by_census=false")
    print("separately_reviewed_host_namespace_lease_required=true")
    print("host_scoped_target_reference_absent_candidate_only=true")
    print("all_process_target_reference_absent_observed=false")
    print("task_inventory_generation_stability_required=true")
    print("per_thread_files_fs_reference_scan_required=true")
    print("per_thread_host_mount_namespace_required=true")
    print("task_mount_namespace_generation_stability_required=true")
    print("private_task_mount_namespace_rejected=true")
    print("bounded_task_inventory_required=true")
    print("zombie_leader_live_worker_rejected=true")
    print("target_pre_post_identity_recheck=true")
    print("cwd_inode_reference_classification=true")
    print("fd_inode_reference_classification=true")
    print("mapped_inode_reference_classification=true")
    print("proc_cmdline_read=false")
    print("proc_environ_read=false")
    print("proc_fd_target_text_read=false")
    print("proc_maps_path_text_retained=false")
    print("all_process_reference_absence_proven=false")
    print("fd_table_stability_proven=false")
    print("mapping_set_stability_proven=false")
    print("mount_namespace_reference_scan_performed=false")
    print("mount_namespace_reference_absence_proven=false")
    print("process_reference_snapshot_race_free=false")
    print("live_at_use_reverification_required=true")
    print("production_filesystem_write=false")
    print("self_test_temporary_filesystem_write=true")
    print("replacement_apply_authorized=false")
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--census", action="store_true")
    parser.add_argument("--expected-host-pid-namespace-dev-ino")
    parser.add_argument("--expected-host-mount-namespace-dev-ino")
    parser.add_argument("--expected-host-user-namespace-dev-ino")
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0
    if args.census:
        if args.expected_host_pid_namespace_dev_ino is None:
            hold("expected_host_pid_namespace_lease_required")
        if args.expected_host_mount_namespace_dev_ino is None:
            hold("expected_host_mount_namespace_lease_required")
        if args.expected_host_user_namespace_dev_ino is None:
            hold("expected_host_user_namespace_lease_required")
        print(
            json.dumps(
                census(
                    args.expected_host_pid_namespace_dev_ino,
                    args.expected_host_mount_namespace_dev_ino,
                    args.expected_host_user_namespace_dev_ino,
                ),
                sort_keys=True,
                separators=(",", ":"),
            )
        )
        return 0
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main(_bootstrap_sys.argv[1:]))
    except (CensusHold, OSError, ValueError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("production_read_only=true")
        print("host_pid_namespace_external_lease_required=true")
        print("host_pid_namespace_lease_verified=false")
        print("host_mount_namespace_external_lease_required=true")
        print("host_mount_namespace_lease_verified=false")
        print("host_user_namespace_external_lease_required=true")
        print("host_user_namespace_lease_verified=false")
        print("host_namespace_lease_provenance_authenticated_by_census=false")
        print("separately_reviewed_host_namespace_lease_required=true")
        print("retained_procfs_view_used=false")
        print("retained_host_root_used=false")
        print("target_resolved_via_retained_host_root=false")
        print("production_filesystem_write=false")
        print("all_process_reference_absence_proven=false")
        print("fd_table_stability_proven=false")
        print("mapping_set_stability_proven=false")
        print("mount_namespace_reference_scan_performed=false")
        print("mount_namespace_reference_absence_proven=false")
        print("live_at_use_reverification_required=true")
        print("replacement_apply_authorized=false")
        print("service_mutation=false")
        print("runtime_integration=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
