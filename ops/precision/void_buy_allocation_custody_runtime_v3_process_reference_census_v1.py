#!/usr/bin/env python3
# Read-only current-UID process-reference census for the legacy custody runtime.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROCESS_REFERENCE_CENSUS_V1"
if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
    or _bootstrap_sys.flags.dont_write_bytecode != 1
    or _bootstrap_sys.flags.optimize != 0
    or not __debug__
):
    if __name__ == "__main__":
        print(_BOOTSTRAP_MARKER)
        print("status=HOLD")
        print("reason=python_isolated_unoptimized_nobytecode_mode_required")
        print("production_filesystem_write=false")
        print("service_mutation=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_nobytecode_mode_required")

import argparse
import errno
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import tempfile
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_custody_runtime_v3_process_reference_census_v1"
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

PRESTATE_SOURCE_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_install_prestate_census_v1.py"
)
PRESTATE_SOURCE_BLOB = "4d9c6e5809a5cc64454626760f71e60ed99354bc"
ARCHIVE_LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-install-archive-lock-v3.json"
)
ARCHIVE_LOCK_BLOB = "edb4ea2b833373ab387762e45ba7da4032c860f3"
ARCHIVE_LOCK_SHA256 = (
    "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"
)

TARGET = Path("/opt/void-buy-allocation-custody-runtime-v1")
PROC = Path("/proc")
MAX_MOUNTINFO_BYTES = 4 * 1024 * 1024
DEV_INO_LEASE_RE = re.compile(r"[1-9][0-9]{0,19}:[1-9][0-9]{0,19}")

MAX_TARGET_ENTRIES = 32768
MAX_TARGET_DEPTH = 64
MAX_PIDS = 32768
MAX_FDS_PER_PROCESS = 65536
MAX_STAT_BYTES = 4096
MAX_STATUS_BYTES = 64 * 1024
MAX_MAPS_BYTES = 8 * 1024 * 1024
MAX_SCAN_ATTEMPTS = 3


class CensusHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise CensusHold("custody_runtime_v3_process_reference_" + reason)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


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
    values = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_DIRECTORY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
    )
    if any(type(value) is not int for value in values):
        hold("descriptor_capability_invalid")
    return os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_NONBLOCK


def _leaf_flags() -> int:
    values = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
    )
    if any(type(value) is not int for value in values):
        hold("descriptor_capability_invalid")
    return os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK


def _fd_mount_id(fd: int) -> int:
    raw = _read_bounded_fd_path(
        Path(f"/proc/self/fdinfo/{fd}"),
        64 * 1024,
        allow_zero_size=True,
    )
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


def _open_bound_directory(path: Path) -> tuple[int, os.stat_result]:
    if os.name != "posix" or not Path("/proc/self/fd").is_dir():
        hold("linux_proc_descriptor_boundary_required")
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

    flags = _directory_flags()
    fd = -1
    try:
        fd = os.open("/", flags)
        for component in parts[1:]:
            before = os.stat(component, dir_fd=fd, follow_symlinks=False)
            if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
                hold("directory_component_invalid:" + component)
            next_fd = os.open(component, flags, dir_fd=fd)
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
        if fd >= 0:
            os.close(fd)
        raise


def _read_bounded_fd_path(
    path: Path,
    maximum: int,
    *,
    allow_zero_size: bool,
) -> bytes:
    if maximum < 1 or maximum > 16 * 1024 * 1024:
        hold("bounded_read_limit_invalid")
    before = os.stat(path, follow_symlinks=False)
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode):
        hold("bounded_read_shape_invalid:" + path.name)
    if not allow_zero_size and (before.st_size < 1 or before.st_size > maximum):
        hold("bounded_read_visible_size_invalid:" + path.name)
    fd = os.open(path, _leaf_flags())
    try:
        opened = os.fstat(fd)
        if _identity(before) != _identity(opened):
            hold("bounded_read_rebound:" + path.name)
        raw = bytearray()
        while len(raw) <= maximum:
            chunk = os.read(fd, min(65536, maximum + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("bounded_read_ceiling_exceeded:" + path.name)
        after = os.fstat(fd)
        visible = os.stat(path, follow_symlinks=False)
        if _identity(opened) != _identity(after) or _identity(after) != _identity(visible):
            hold("bounded_read_identity_changed:" + path.name)
        return bytes(raw)
    finally:
        os.close(fd)




def _read_bounded_at(
    directory_fd: int,
    relative: str,
    maximum: int,
    *,
    allow_zero_size: bool,
) -> bytes:
    if (
        not isinstance(relative, str)
        or not relative
        or relative.startswith("/")
        or "\x00" in relative
        or any(part in ("", ".", "..") for part in relative.split("/"))
    ):
        hold("bounded_read_relative_path_invalid")
    if maximum < 1 or maximum > 16 * 1024 * 1024:
        hold("bounded_read_limit_invalid")
    before = os.stat(
        relative,
        dir_fd=directory_fd,
        follow_symlinks=False,
    )
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode):
        hold("bounded_read_shape_invalid:" + relative)
    if not allow_zero_size and (
        before.st_size < 1 or before.st_size > maximum
    ):
        hold("bounded_read_visible_size_invalid:" + relative)
    fd = os.open(relative, _leaf_flags(), dir_fd=directory_fd)
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("bounded_read_rebound:" + relative)
        raw = bytearray()
        while len(raw) <= maximum:
            chunk = os.read(fd, min(65536, maximum + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("bounded_read_ceiling_exceeded:" + relative)
        after = os.fstat(fd)
        visible = os.stat(
            relative,
            dir_fd=directory_fd,
            follow_symlinks=False,
        )
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("bounded_read_identity_changed:" + relative)
        return bytes(raw)
    finally:
        os.close(fd)

def parse_dev_ino_lease(
    value: str,
    code: str = "host_pid_namespace_lease_invalid",
) -> tuple[int, int]:
    if not isinstance(value, str) or not DEV_INO_LEASE_RE.fullmatch(value):
        hold(code)
    dev_text, ino_text = value.split(":", 1)
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


def verify_complete_proc_visibility(
    raw: bytes,
    expected_mount_id: int,
) -> dict[str, Any]:
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        hold("proc_mountinfo_encoding_invalid:" + type(exc).__name__)
    matches: list[dict[str, Any]] = []
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
        matches.append({
            "root": parts[3],
            "mount_point": parts[4],
            "mount_options": mount_options,
            "super_options": super_options,
        })
    if len(matches) != 1:
        hold("proc_mount_selection_invalid")
    selected = matches[0]
    if selected["root"] != "/" or selected["mount_point"] != "/proc":
        hold("proc_mount_scope_not_complete_host_view")
    mount_options = selected["mount_options"]
    super_options = selected["super_options"]
    all_options = set(mount_options) | set(super_options)
    hidden = sorted(
        option for option in all_options
        if option.startswith("hidepid=") and option != "hidepid=0"
    )
    if hidden:
        hold("proc_visibility_restricted:" + ",".join(hidden))
    return {
        "mount_id": expected_mount_id,
        "root": selected["root"],
        "mount_point": selected["mount_point"],
        "mount_options": list(mount_options),
        "super_options": list(super_options),
        "hidepid_restricted": False,
        "complete_process_visibility_required": True,
    }


def parse_proc_self_stat_pid(raw: bytes, expected_pid: int) -> int:
    if (
        not isinstance(expected_pid, int)
        or isinstance(expected_pid, bool)
        or expected_pid <= 0
    ):
        hold("proc_self_expected_pid_invalid")
    first_space = raw.find(b" ")
    if first_space < 1:
        hold("proc_self_stat_shape_invalid")
    pid_text = raw[:first_space]
    if not pid_text.isascii() or not pid_text.isdigit():
        hold("proc_self_stat_pid_invalid")
    observed = int(pid_text, 10)
    if observed != expected_pid:
        hold("proc_self_pid_namespace_mismatch")
    return observed


def open_pinned_proc_view(
    expected_host_pid_namespace_dev_ino: str,
) -> tuple[int, dict[str, Any]]:
    expected = parse_dev_ino_lease(expected_host_pid_namespace_dev_ino)
    before = os.stat("/proc", follow_symlinks=False)
    if (
        not stat.S_ISDIR(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or stat.S_IMODE(before.st_mode) & 0o022
    ):
        hold("proc_root_custody_invalid")
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
        mount_id = _fd_mount_id(fd)
        try:
            self_ns = os.stat(
                "self/ns/pid", dir_fd=fd, follow_symlinks=True
            )
            init_ns = os.stat(
                "1/ns/pid", dir_fd=fd, follow_symlinks=True
            )
        except OSError as exc:
            hold("host_pid_namespace_unreadable:" + str(exc.errno))
        observed = verify_pid_namespace_lease_stats(
            self_ns, init_ns, expected
        )
        mountinfo = _read_bounded_at(
            fd,
            "self/mountinfo",
            MAX_MOUNTINFO_BYTES,
            allow_zero_size=True,
        )
        visibility = verify_complete_proc_visibility(mountinfo, mount_id)
        self_stat = _read_bounded_at(
            fd,
            "self/stat",
            MAX_STAT_BYTES,
            allow_zero_size=True,
        )
        parse_proc_self_stat_pid(self_stat, os.getpid())
        return fd, {
            "external_lease_required": True,
            "lease_verified": True,
            "pid_namespace_dev": str(observed[0]),
            "pid_namespace_ino": str(observed[1]),
            "pid1_namespace_matches_self": True,
            "proc_root_dev": opened.st_dev,
            "proc_root_ino": opened.st_ino,
            "proc_mount_id": mount_id,
            "proc_root_uid": opened.st_uid,
            "proc_root_gid": opened.st_gid,
            "proc_root_mode": format(stat.S_IMODE(opened.st_mode), "04o"),
            "proc_visibility": visibility,
            "proc_self_pid_matches_runtime": True,
        }
    except BaseException:
        os.close(fd)
        raise


def revalidate_pinned_proc_view(
    fd: int,
    expected_host_pid_namespace_dev_ino: str,
    initial: dict[str, Any],
) -> dict[str, bool]:
    expected = parse_dev_ino_lease(expected_host_pid_namespace_dev_ino)
    opened = os.fstat(fd)
    if (
        opened.st_dev != initial["proc_root_dev"]
        or opened.st_ino != initial["proc_root_ino"]
        or _fd_mount_id(fd) != initial["proc_mount_id"]
    ):
        hold("proc_root_generation_changed")
    try:
        self_ns = os.stat(
            "self/ns/pid", dir_fd=fd, follow_symlinks=True
        )
        init_ns = os.stat(
            "1/ns/pid", dir_fd=fd, follow_symlinks=True
        )
    except OSError as exc:
        hold("host_pid_namespace_unreadable:" + str(exc.errno))
    observed = verify_pid_namespace_lease_stats(
        self_ns, init_ns, expected
    )
    if (
        str(observed[0]) != initial["pid_namespace_dev"]
        or str(observed[1]) != initial["pid_namespace_ino"]
    ):
        hold("host_pid_namespace_scope_changed")
    mountinfo = _read_bounded_at(
        fd,
        "self/mountinfo",
        MAX_MOUNTINFO_BYTES,
        allow_zero_size=True,
    )
    visibility = verify_complete_proc_visibility(
        mountinfo, initial["proc_mount_id"]
    )
    if visibility != initial["proc_visibility"]:
        hold("proc_visibility_scope_changed")
    self_stat = _read_bounded_at(
        fd,
        "self/stat",
        MAX_STAT_BYTES,
        allow_zero_size=True,
    )
    parse_proc_self_stat_pid(self_stat, os.getpid())
    visible = os.stat("/proc", follow_symlinks=False)
    visible_matches = _identity(visible) == _identity(opened)
    if not visible_matches:
        hold("visible_proc_root_changed")
    return {
        "host_pid_namespace_lease_revalidated_after_census": True,
        "proc_visibility_revalidated_after_census": True,
        "proc_self_pid_revalidated_after_census": True,
        "retained_procfs_view_revalidated_after_census": True,
        "visible_proc_root_matches_retained_at_terminal": True,
    }

def verify_source_inputs() -> dict[str, Any]:
    prestate = _read_bounded_fd_path(
        ROOT / PRESTATE_SOURCE_REL,
        2 * 1024 * 1024,
        allow_zero_size=False,
    )
    if git_blob(prestate) != PRESTATE_SOURCE_BLOB:
        hold("prestate_source_blob_mismatch")

    lock_raw = _read_bounded_fd_path(
        ROOT / ARCHIVE_LOCK_REL,
        128 * 1024,
        allow_zero_size=False,
    )
    if git_blob(lock_raw) != ARCHIVE_LOCK_BLOB:
        hold("archive_lock_blob_mismatch")
    if sha256(lock_raw) != ARCHIVE_LOCK_SHA256:
        hold("archive_lock_sha256_mismatch")
    try:
        lock = json.loads(lock_raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("archive_lock_json_invalid:" + type(exc).__name__)
    if (
        type(lock) is not dict
        or lock.get("archive_candidate_accepted") is not True
        or lock.get("existing_target_replaced") is not False
        or lock.get("runtime_integration") is not False
        or lock.get("payment_acceptance") is not False
        or lock.get("public_presale_activation") is not False
        or lock.get("funds_movement") is not False
    ):
        hold("archive_lock_authority_invalid")
    return lock


def _target_snapshot_record(
    relative: str,
    st: os.stat_result,
    kind: str,
) -> dict[str, Any]:
    return {
        "path": relative,
        "kind": kind,
        "dev": st.st_dev,
        "ino": st.st_ino,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "nlink": st.st_nlink,
        "size": st.st_size,
        "mtime_ns": st.st_mtime_ns,
        "ctime_ns": st.st_ctime_ns,
    }


def _observe_target_regular_at(
    parent_fd: int,
    name: str,
    before: os.stat_result,
    expected_mnt_id: int,
) -> os.stat_result:
    fd = os.open(name, _leaf_flags(), dir_fd=parent_fd)
    try:
        opened = os.fstat(fd)
        if _fd_mount_id(fd) != expected_mnt_id:
            hold("target_cross_mount_file_forbidden")
        if (
            not stat.S_ISREG(opened.st_mode)
            or _generation(before) != _generation(opened)
        ):
            hold("target_file_rebound")
        after = os.fstat(fd)
        visible = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("target_file_generation_changed")
        return after
    finally:
        os.close(fd)


def _scan_target_dir(
    fd: int,
    expected_dev: int,
    expected_mnt_id: int,
    identities: set[tuple[int, int]],
    records: list[dict[str, Any]],
    totals: dict[str, int],
    depth: int,
    relative_prefix: str,
) -> None:
    if depth > MAX_TARGET_DEPTH:
        hold("target_depth_exceeded")
    st = os.fstat(fd)
    if not stat.S_ISDIR(st.st_mode) or st.st_dev != expected_dev:
        hold("target_directory_identity_invalid")
    if _fd_mount_id(fd) != expected_mnt_id:
        hold("target_cross_mount_directory_forbidden")
    identities.add((st.st_dev, st.st_ino))

    with os.scandir(fd) as iterator:
        for entry in iterator:
            name = entry.name
            if name in ("", ".", "..") or "/" in name or "\x00" in name:
                hold("target_entry_name_invalid")
            totals["entries"] += 1
            if totals["entries"] > MAX_TARGET_ENTRIES:
                hold("target_entry_limit_exceeded")

            before = os.stat(name, dir_fd=fd, follow_symlinks=False)
            if before.st_dev != expected_dev:
                hold("target_cross_device_entry_forbidden")
            relative = (
                name
                if not relative_prefix
                else relative_prefix + "/" + name
            )
            identities.add((before.st_dev, before.st_ino))

            if stat.S_ISDIR(before.st_mode):
                child_fd = os.open(name, _directory_flags(), dir_fd=fd)
                try:
                    opened = os.fstat(child_fd)
                    if _identity(before) != _identity(opened):
                        hold("target_directory_rebound")
                    records.append(
                        _target_snapshot_record(relative, opened, "directory")
                    )
                    _scan_target_dir(
                        child_fd,
                        expected_dev,
                        expected_mnt_id,
                        identities,
                        records,
                        totals,
                        depth + 1,
                        relative,
                    )
                    after = os.fstat(child_fd)
                    visible = os.stat(
                        name, dir_fd=fd, follow_symlinks=False
                    )
                    if (
                        _generation(opened) != _generation(after)
                        or _generation(after) != _generation(visible)
                    ):
                        hold("target_directory_generation_changed")
                finally:
                    os.close(child_fd)
            elif stat.S_ISREG(before.st_mode):
                observed = _observe_target_regular_at(
                    fd,
                    name,
                    before,
                    expected_mnt_id,
                )
                records.append(
                    _target_snapshot_record(relative, observed, "file")
                )
            elif stat.S_ISLNK(before.st_mode):
                records.append(
                    _target_snapshot_record(relative, before, "symlink")
                )
            else:
                hold("target_special_file_forbidden")

def target_identity_set(path: Path = TARGET) -> dict[str, Any]:
    parent_fd, parent_st = _open_bound_directory(path.parent)
    target_fd = -1
    try:
        before = os.stat(path.name, dir_fd=parent_fd, follow_symlinks=False)
        if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
            hold("target_not_direct_directory")
        target_fd = os.open(path.name, _directory_flags(), dir_fd=parent_fd)
        opened = os.fstat(target_fd)
        if _identity(before) != _identity(opened):
            hold("target_root_rebound")
        parent_mnt_id = _fd_mount_id(parent_fd)
        target_mnt_id = _fd_mount_id(target_fd)
        if opened.st_dev != parent_st.st_dev or target_mnt_id != parent_mnt_id:
            hold("target_root_mount_boundary_invalid")
        identities: set[tuple[int, int]] = set()
        records: list[dict[str, Any]] = []
        totals = {"entries": 0}
        _scan_target_dir(
            target_fd,
            opened.st_dev,
            target_mnt_id,
            identities,
            records,
            totals,
            0,
            "",
        )
        after = os.fstat(target_fd)
        visible = os.stat(path.name, dir_fd=parent_fd, follow_symlinks=False)
        if _generation(opened) != _generation(after) or _generation(after) != _generation(visible):
            hold("target_root_generation_changed")
        snapshot_body = {
            "root": {
                "dev": opened.st_dev,
                "ino": opened.st_ino,
                "uid": opened.st_uid,
                "gid": opened.st_gid,
                "mode": format(stat.S_IMODE(opened.st_mode), "04o"),
                "nlink": opened.st_nlink,
                "size": opened.st_size,
                "mtime_ns": opened.st_mtime_ns,
                "ctime_ns": opened.st_ctime_ns,
                "mount_id": target_mnt_id,
            },
            "entries": sorted(records, key=lambda item: item["path"]),
        }
        return {
            "root_dev": opened.st_dev,
            "root_ino": opened.st_ino,
            "mount_id": target_mnt_id,
            "identity_count": len(identities),
            "entry_count": totals["entries"],
            "snapshot_id": "sha256:" + sha256(canonical(snapshot_body)),
            "identities": identities,
        }
    finally:
        if target_fd >= 0:
            os.close(target_fd)
        os.close(parent_fd)


def _proc_stat_identity(
    pid: int,
    proc_fd: int | None = None,
) -> tuple[str, str] | None:
    try:
        if proc_fd is None:
            raw = _read_bounded_fd_path(
                PROC / str(pid) / "stat",
                MAX_STAT_BYTES,
                allow_zero_size=True,
            )
        else:
            raw = _read_bounded_at(
                proc_fd,
                str(pid) + "/stat",
                MAX_STAT_BYTES,
                allow_zero_size=True,
            )
    except FileNotFoundError:
        return None
    except OSError as exc:
        if exc.errno in (errno.ENOENT, errno.ESRCH):
            return None
        raise
    try:
        text = raw.decode("ascii")
    except UnicodeDecodeError:
        hold("proc_stat_nonascii")
    close = text.rfind(") ")
    if close < 1:
        hold("proc_stat_shape_invalid")
    fields = text[close + 2 :].split()
    if len(fields) < 20:
        hold("proc_stat_fields_incomplete")
    state = fields[0]
    start_ticks = fields[19]
    if len(state) != 1 or not start_ticks.isdigit():
        hold("proc_stat_identity_invalid")
    return state, start_ticks



def parse_proc_uid_slots(raw: bytes) -> tuple[int, int, int, int]:
    if len(raw) > MAX_STATUS_BYTES:
        hold("proc_status_too_large")
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeDecodeError:
        hold("proc_status_non_utf8")
    rows = [line for line in text.splitlines() if line.startswith("Uid:")]
    if len(rows) != 1:
        hold("proc_status_uid_invalid")
    parts = rows[0].split()
    if len(parts) != 5 or parts[0] != "Uid:":
        hold("proc_status_uid_invalid")
    try:
        values = tuple(int(value, 10) for value in parts[1:])
    except ValueError:
        hold("proc_status_uid_invalid")
    if len(values) != 4 or any(value < 0 for value in values):
        hold("proc_status_uid_invalid")
    return values  # type: ignore[return-value]


def _proc_uid_slots(
    pid: int,
    proc_fd: int | None = None,
) -> tuple[int, int, int, int] | None:
    try:
        if proc_fd is None:
            raw = _read_bounded_fd_path(
                PROC / str(pid) / "status",
                MAX_STATUS_BYTES,
                allow_zero_size=True,
            )
        else:
            raw = _read_bounded_at(
                proc_fd,
                str(pid) + "/status",
                MAX_STATUS_BYTES,
                allow_zero_size=True,
            )
    except FileNotFoundError:
        return None
    except OSError as exc:
        if exc.errno in (errno.ENOENT, errno.ESRCH):
            return None
        raise
    return parse_proc_uid_slots(raw)

def _same_uid_pids(
    uid: int,
    proc_fd: int | None = None,
) -> tuple[list[int], int]:
    pids: list[int] = []
    vanished = 0
    numeric_seen = 0
    with os.scandir(PROC if proc_fd is None else proc_fd) as iterator:
        for entry in iterator:
            name = entry.name
            if not name.isdigit():
                continue
            numeric_seen += 1
            if numeric_seen > MAX_PIDS:
                hold("proc_pid_limit_exceeded")
            pid = int(name)
            try:
                if proc_fd is None:
                    st = os.stat(
                        PROC / name,
                        follow_symlinks=False,
                    )
                else:
                    st = os.stat(
                        name,
                        dir_fd=proc_fd,
                        follow_symlinks=False,
                    )
            except FileNotFoundError:
                vanished += 1
                continue
            if not stat.S_ISDIR(st.st_mode):
                hold("proc_pid_entry_not_directory")
            slots = _proc_uid_slots(pid, proc_fd)
            if slots is None:
                vanished += 1
                continue
            if slots[1] == uid:
                pids.append(pid)
    pids.sort()
    return pids, vanished

def _matches_target(
    st: os.stat_result,
    identities: set[tuple[int, int]],
) -> bool:
    return (st.st_dev, st.st_ino) in identities


def _scan_proc_link(
    pid: int,
    name: str,
    identities: set[tuple[int, int]],
    proc_fd: int | None = None,
) -> tuple[bool, bool]:
    try:
        if proc_fd is None:
            st = os.stat(
                PROC / str(pid) / name,
                follow_symlinks=True,
            )
        else:
            st = os.stat(
                str(pid) + "/" + name,
                dir_fd=proc_fd,
                follow_symlinks=True,
            )
    except FileNotFoundError:
        return False, True
    except PermissionError:
        return False, True
    except OSError as exc:
        if exc.errno in (
            errno.ENOENT,
            errno.ESRCH,
            errno.EACCES,
            errno.EPERM,
        ):
            return False, True
        raise
    return _matches_target(st, identities), False


def _scan_fds(
    pid: int,
    identities: set[tuple[int, int]],
    proc_fd: int | None = None,
) -> tuple[int, int]:
    references = 0
    races = 0
    count = 0
    fd_dir = -1
    try:
        if proc_fd is None:
            iterator = os.scandir(PROC / str(pid) / "fd")
        else:
            fd_dir = os.open(
                str(pid) + "/fd",
                _directory_flags(),
                dir_fd=proc_fd,
            )
            iterator = os.scandir(fd_dir)
    except (FileNotFoundError, PermissionError):
        if fd_dir >= 0:
            os.close(fd_dir)
        return 0, 1
    try:
        with iterator:
            for entry in iterator:
                if not entry.name.isdigit():
                    continue
                count += 1
                if count > MAX_FDS_PER_PROCESS:
                    hold("proc_fd_limit_exceeded")
                try:
                    if proc_fd is None:
                        st = os.stat(
                            PROC / str(pid) / "fd" / entry.name,
                            follow_symlinks=True,
                        )
                    else:
                        st = os.stat(
                            entry.name,
                            dir_fd=fd_dir,
                            follow_symlinks=True,
                        )
                except (FileNotFoundError, PermissionError):
                    races += 1
                    continue
                except OSError as exc:
                    if exc.errno in (
                        errno.ENOENT,
                        errno.ESRCH,
                        errno.EACCES,
                        errno.EPERM,
                    ):
                        races += 1
                        continue
                    raise
                if _matches_target(st, identities):
                    references += 1
    finally:
        if fd_dir >= 0:
            os.close(fd_dir)
    return references, races


def _maps_reference_count(
    pid: int,
    identities: set[tuple[int, int]],
    proc_fd: int | None = None,
) -> tuple[int, bool]:
    try:
        if proc_fd is None:
            raw = _read_bounded_fd_path(
                PROC / str(pid) / "maps",
                MAX_MAPS_BYTES,
                allow_zero_size=True,
            )
        else:
            raw = _read_bounded_at(
                proc_fd,
                str(pid) + "/maps",
                MAX_MAPS_BYTES,
                allow_zero_size=True,
            )
    except (FileNotFoundError, PermissionError):
        return 0, True
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
    references = 0
    for line in text.splitlines():
        parts = line.split(None, 5)
        if len(parts) < 5:
            hold("proc_maps_line_invalid")
        dev = parts[3]
        inode_text = parts[4]
        if ":" not in dev or not inode_text.isdigit():
            hold("proc_maps_identity_invalid")
        major_text, minor_text = dev.split(":", 1)
        try:
            device = os.makedev(
                int(major_text, 16),
                int(minor_text, 16),
            )
        except ValueError:
            hold("proc_maps_device_invalid")
        inode = int(inode_text)
        if inode > 0 and (device, inode) in identities:
            references += 1
    return references, False


def scan_process(
    pid: int,
    uid: int,
    identities: set[tuple[int, int]],
    proc_fd: int | None = None,
) -> dict[str, Any]:
    before = _proc_stat_identity(pid, proc_fd)
    if before is None:
        return {"pid": pid, "status": "vanished"}
    state, start_ticks = before
    if state in ("Z", "X"):
        return {"pid": pid, "status": "not_live"}

    try:
        if proc_fd is None:
            proc_st = os.stat(
                PROC / str(pid),
                follow_symlinks=False,
            )
        else:
            proc_st = os.stat(
                str(pid),
                dir_fd=proc_fd,
                follow_symlinks=False,
            )
    except FileNotFoundError:
        return {"pid": pid, "status": "vanished"}
    if not stat.S_ISDIR(proc_st.st_mode):
        return {"pid": pid, "status": "not_process_directory"}
    uid_slots_before = _proc_uid_slots(pid, proc_fd)
    if uid_slots_before is None:
        return {"pid": pid, "status": "vanished"}
    if uid_slots_before[1] != uid:
        return {"pid": pid, "status": "uid_changed"}

    references = {
        "cwd": 0,
        "root": 0,
        "exe": 0,
        "fd": 0,
        "maps": 0,
    }
    incomplete = 0
    for name in ("cwd", "root", "exe"):
        matched, failed = _scan_proc_link(
            pid, name, identities, proc_fd
        )
        if matched:
            references[name] += 1
        if failed:
            incomplete += 1

    fd_refs, fd_races = _scan_fds(pid, identities, proc_fd)
    references["fd"] = fd_refs
    incomplete += fd_races

    map_refs, maps_incomplete = _maps_reference_count(
        pid, identities, proc_fd
    )
    references["maps"] = map_refs
    incomplete += int(maps_incomplete)

    after = _proc_stat_identity(pid, proc_fd)
    uid_slots_after = _proc_uid_slots(pid, proc_fd)
    if after is None or after != before:
        return {
            "pid": pid,
            "status": "generation_changed_or_vanished",
            "start_ticks": start_ticks,
        }
    if uid_slots_after is None or uid_slots_after != uid_slots_before:
        return {
            "pid": pid,
            "status": "uid_slots_changed_or_vanished",
            "start_ticks": start_ticks,
        }

    return {
        "pid": pid,
        "status": "scanned",
        "start_ticks": start_ticks,
        "reference_count": sum(references.values()),
        "references": references,
        "incomplete_observations": incomplete,
    }

def classify_attempt(
    start_pids: list[int],
    end_pids: list[int],
    listing_vanished: int,
    rows: list[dict[str, Any]],
    target_snapshot_stable: bool,
) -> dict[str, Any]:
    referenced = [
        row for row in rows
        if row.get("status") == "scanned" and row.get("reference_count", 0) > 0
    ]
    incomplete = [
        row for row in rows
        if row.get("status") != "scanned"
        or row.get("incomplete_observations", 0) != 0
    ]
    stable_set = start_pids == end_pids
    clean = (
        target_snapshot_stable
        and stable_set
        and listing_vanished == 0
        and not referenced
        and not incomplete
        and len(rows) == len(start_pids)
    )
    by_kind = {key: 0 for key in ("cwd", "root", "exe", "fd", "maps")}
    for row in referenced:
        refs = row["references"]
        for key in by_kind:
            by_kind[key] += int(refs[key])
    return {
        "current_uid_pid_count": len(start_pids),
        "scanned_row_count": len(rows),
        "pid_set_stable": stable_set,
        "target_snapshot_stable": target_snapshot_stable,
        "listing_vanished_count": listing_vanished,
        "incomplete_process_count": len(incomplete),
        "referenced_process_count": len(referenced),
        "reference_count_by_kind": by_kind,
        "current_uid_target_reference_absent_candidate": clean,
        "all_process_reference_absence_proven": False,
        "privileged_all_process_scan": False,
    }


def _assert_unprivileged_execution() -> int:
    uid = os.geteuid()
    if uid == 0 or os.getuid() == 0:
        hold("root_execution_forbidden_for_user_owned_diagnostic")
    return uid


def current_uid_census(
    expected_host_pid_namespace_dev_ino: str,
    target_path: Path = TARGET,
) -> dict[str, Any]:
    uid = _assert_unprivileged_execution()
    proc_fd = -1
    try:
        proc_fd, proc_scope = open_pinned_proc_view(
            expected_host_pid_namespace_dev_ino
        )
        attempts: list[dict[str, Any]] = []
        for attempt in range(1, MAX_SCAN_ATTEMPTS + 1):
            target_before = target_identity_set(target_path)
            start_pids, vanished = _same_uid_pids(uid, proc_fd)
            rows = [
                scan_process(pid, uid, target_before["identities"], proc_fd)
                for pid in start_pids
            ]
            end_pids, vanished_end = _same_uid_pids(uid, proc_fd)
            target_after = target_identity_set(target_path)
            target_snapshot_stable = (
                target_before["snapshot_id"] == target_after["snapshot_id"]
            )
            result = classify_attempt(
                start_pids,
                end_pids,
                vanished + vanished_end,
                rows,
                target_snapshot_stable,
            )
            attempts.append({
                "attempt": attempt,
                "target_snapshot_before": target_before["snapshot_id"],
                "target_snapshot_after": target_after["snapshot_id"],
                "target_root_dev": target_before["root_dev"],
                "target_root_ino": target_before["root_ino"],
                "target_mount_id": target_before["mount_id"],
                "target_entry_count": target_before["entry_count"],
                "target_identity_count_before": target_before["identity_count"],
                "target_identity_count_after": target_after["identity_count"],
                **result,
            })
            if result["referenced_process_count"] > 0:
                break
            if result["current_uid_target_reference_absent_candidate"] is True:
                break

        terminal_scope = revalidate_pinned_proc_view(
            proc_fd,
            expected_host_pid_namespace_dev_ino,
            proc_scope,
        )
        selected = attempts[-1]
        return {
            "effective_uid": uid,
            "proc_scope": proc_scope,
            **terminal_scope,
            "attempt_count": len(attempts),
            "attempts": attempts,
            "selected_attempt": selected["attempt"],
            "selected_target_snapshot_before":
                selected["target_snapshot_before"],
            "selected_target_snapshot_after":
                selected["target_snapshot_after"],
            "selected_target_snapshot_stable":
                selected["target_snapshot_stable"],
            "selected_target_root_dev": selected["target_root_dev"],
            "selected_target_root_ino": selected["target_root_ino"],
            "selected_target_mount_id": selected["target_mount_id"],
            "selected_target_entry_count": selected["target_entry_count"],
            "selected_target_identity_count":
                selected["target_identity_count_before"],
            "current_uid_target_reference_absent_candidate":
                selected["current_uid_target_reference_absent_candidate"],
            "all_process_reference_absence_proven": False,
            "privileged_all_process_scan": False,
            "custody_principal_process_scan_performed": False,
            "target_snapshot_stable_required": True,
            "fd_table_stability_proven": False,
            "mapping_set_stability_proven": False,
            "live_at_use_reverification_required": True,
        }
    finally:
        if proc_fd >= 0:
            os.close(proc_fd)

def census(expected_host_pid_namespace_dev_ino: str) -> dict[str, Any]:
    _assert_unprivileged_execution()
    lock = verify_source_inputs()
    process = current_uid_census(
        expected_host_pid_namespace_dev_ino,
        TARGET,
    )
    target_public = {
        "path": str(TARGET),
        "root_dev": process["selected_target_root_dev"],
        "root_ino": process["selected_target_root_ino"],
        "mount_id": process["selected_target_mount_id"],
        "identity_count": process["selected_target_identity_count"],
        "entry_count": process["selected_target_entry_count"],
        "snapshot_id": process["selected_target_snapshot_before"],
        "snapshot_matches_selected_attempt": True,
    }
    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "archive_lock": {
            "git_blob_sha1": ARCHIVE_LOCK_BLOB,
            "sha256": ARCHIVE_LOCK_SHA256,
            "archive_candidate_accepted": lock["archive_candidate_accepted"],
        },
        "prestate_source": {
            "path": PRESTATE_SOURCE_REL,
            "git_blob_sha1": PRESTATE_SOURCE_BLOB,
        },
        "target": target_public,
        "process": process,
        "read_only": True,
        "host_pid_namespace_external_lease_required": True,
        "host_pid_namespace_lease_verified": True,
        "host_pid_namespace_lease_revalidated_after_census": True,
        "complete_proc_visibility_verified": True,
        "proc_mount_root_is_slash_required": True,
        "proc_mount_point_exact_required": True,
        "proc_root_root_owned_nonwritable_required": True,
        "proc_self_pid_matches_runtime_required": True,
        "proc_visibility_revalidated_after_census": True,
        "proc_self_pid_revalidated_after_census": True,
        "retained_procfs_view_used": True,
        "retained_procfs_view_revalidated_after_census": True,
        "production_filesystem_write": False,
        "root_execution_forbidden": True,
        "target_snapshot_stable_required": True,
        "fd_table_stability_proven": False,
        "mapping_set_stability_proven": False,
        "live_at_use_reverification_required": True,
        "process_environment_read": False,
        "process_arguments_read": False,
        "proc_cmdline_read": False,
        "proc_environ_read": False,
        "proc_fd_target_text_read": False,
        "proc_maps_path_text_retained": False,
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
        "census_id": "voidbuycustodyprocref1_" + sha256(canonical(body)),
    }


def self_test() -> None:
    verify_source_inputs()

    if parse_proc_uid_slots(
        b"Name:\tsynthetic\nUid:\t1000\t1000\t1000\t1000\n"
    ) != (1000, 1000, 1000, 1000):
        hold("self_test_proc_uid_slots_invalid")

    if parse_dev_ino_lease("12:34") != (12, 34):
        hold("self_test_pid_namespace_lease_parse_invalid")
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
        verify_pid_namespace_lease_stats(
            fake_self, fake_init, (12, 35)
        )
    except CensusHold as exc:
        if "host_pid_namespace_lease_mismatch" not in str(exc):
            raise
    else:
        hold("self_test_pid_namespace_lease_mismatch_accepted")

    visible_mountinfo = (
        b"42 1 0:1 / /proc rw,nosuid,nodev,noexec,relatime"
        b" - proc proc rw,hidepid=0\n"
    )
    hidden_mountinfo = (
        b"42 1 0:1 / /proc rw,nosuid,nodev,noexec,relatime"
        b" - proc proc rw,hidepid=2\n"
    )
    subtree_mountinfo = (
        b"42 1 0:1 /123 /proc rw,nosuid,nodev,noexec,relatime"
        b" - proc proc rw,hidepid=0\n"
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
    try:
        verify_complete_proc_visibility(subtree_mountinfo, 42)
    except CensusHold as exc:
        if "proc_mount_scope_not_complete_host_view" not in str(exc):
            raise
    else:
        hold("self_test_proc_subtree_mount_accepted")
    if parse_proc_self_stat_pid(
        b"123 (fixture) S 0 0 0\n",
        123,
    ) != 123:
        hold("self_test_proc_self_pid_parse_invalid")
    try:
        parse_proc_self_stat_pid(
            b"124 (fixture) S 0 0 0\n",
            123,
        )
    except CensusHold as exc:
        if "proc_self_pid_namespace_mismatch" not in str(exc):
            raise
    else:
        hold("self_test_proc_self_pid_mismatch_accepted")

    with tempfile.TemporaryDirectory(
        prefix="void-custody-procref-readat-selftest-"
    ) as tmp:
        root = Path(tmp)
        leaf = root / "probe"
        leaf.write_bytes(b"descriptor-relative-probe")
        directory_fd = os.open(root, _directory_flags())
        try:
            observed = _read_bounded_at(
                directory_fd,
                "probe",
                4096,
                allow_zero_size=False,
            )
            if observed != b"descriptor-relative-probe":
                hold("self_test_descriptor_relative_read_invalid")
        finally:
            os.close(directory_fd)

    clean_rows = [{
        "pid": 101,
        "status": "scanned",
        "start_ticks": "10",
        "reference_count": 0,
        "references": {"cwd": 0, "root": 0, "exe": 0, "fd": 0, "maps": 0},
        "incomplete_observations": 0,
    }]
    clean = classify_attempt([101], [101], 0, clean_rows, True)
    if clean["current_uid_target_reference_absent_candidate"] is not True:
        hold("self_test_clean_candidate_rejected")

    referenced_rows = [{
        **clean_rows[0],
        "reference_count": 1,
        "references": {"cwd": 0, "root": 0, "exe": 0, "fd": 1, "maps": 0},
    }]
    referenced = classify_attempt([101], [101], 0, referenced_rows, True)
    if (
        referenced["current_uid_target_reference_absent_candidate"] is not False
        or referenced["reference_count_by_kind"]["fd"] != 1
    ):
        hold("self_test_reference_not_rejected")

    changed = classify_attempt([101], [101, 102], 0, clean_rows, True)
    if changed["current_uid_target_reference_absent_candidate"] is not False:
        hold("self_test_pid_set_change_accepted")

    raced_rows = [{**clean_rows[0], "incomplete_observations": 1}]
    raced = classify_attempt([101], [101], 0, raced_rows, True)
    if raced["current_uid_target_reference_absent_candidate"] is not False:
        hold("self_test_incomplete_scan_accepted")

    target_changed = classify_attempt([101], [101], 0, clean_rows, False)
    if target_changed["current_uid_target_reference_absent_candidate"] is not False:
        hold("self_test_target_snapshot_change_accepted")

    with tempfile.TemporaryDirectory(
        prefix="void-custody-procref-selftest-"
    ) as tmp:
        root = Path(tmp) / "target"
        (root / "nested").mkdir(parents=True, mode=0o700)
        (root / "one").write_bytes(b"one")
        (root / "nested" / "two").write_bytes(b"two")
        identities = target_identity_set(root)
        if identities["identity_count"] != 4:
            hold("self_test_target_identity_count_invalid")
        fifo = root / "fifo"
        os.mkfifo(fifo, 0o600)
        try:
            target_identity_set(root)
        except CensusHold as exc:
            if "target_special_file_forbidden" not in str(exc):
                raise
        else:
            hold("self_test_special_file_accepted")

    print(MARKER + "_SELF_TEST_GREEN")
    print("prestate_source_exact=true")
    print("archive_lock_exact=true")
    print("target_identity_metadata_only=true")
    print("current_uid_process_scope=true")
    print("proc_status_effective_uid_classification=true")
    print("process_uid_slots_stable_during_reference_scan=true")
    print("host_pid_namespace_external_lease_required=true")
    print("private_pid_namespace_rejected=true")
    print("host_pid_namespace_lease_mismatch_rejected=true")
    print("complete_proc_visibility_required=true")
    print("proc_mount_root_is_slash_required=true")
    print("proc_mount_point_exact_required=true")
    print("proc_root_root_owned_nonwritable_required=true")
    print("proc_self_pid_matches_runtime_required=true")
    print("hidepid_restricted_proc_holds=true")
    print("proc_subtree_mount_holds=true")
    print("descriptor_relative_bounded_reader_tested=true")
    print("proc_cmdline_read=false")
    print("proc_environ_read=false")
    print("proc_fd_target_text_read=false")
    print("proc_maps_path_text_retained=false")
    print("fd_inode_reference_classification=true")
    print("mapped_inode_reference_classification=true")
    print("pid_generation_race_fail_closed=true")
    print("pid_set_change_fail_closed=true")
    print("target_snapshot_change_fail_closed=true")
    print("target_rescan_each_attempt=true")
    print("target_snapshot_stable_required=true")
    print("regular_file_mount_id_checked=true")
    print("receipt_target_bound_to_selected_attempt=true")
    print("legacy_tree_entry_limit=32768")
    print("python_no_bytecode_mode_required=true")
    print("root_execution_forbidden=true")
    print("current_uid_target_reference_absent_candidate_tested=true")
    print("all_process_reference_absence_proven=false")
    print("privileged_all_process_scan=false")
    print("fd_table_stability_proven=false")
    print("mapping_set_stability_proven=false")
    print("live_at_use_reverification_required=true")
    print("production_filesystem_write=false")
    print("self_test_temporary_filesystem_write=true")
    print("service_mutation=false")
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
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0
    if args.census:
        if args.expected_host_pid_namespace_dev_ino is None:
            hold("expected_host_pid_namespace_lease_required")
        print(
            json.dumps(
                census(args.expected_host_pid_namespace_dev_ino),
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
        print("read_only=true")
        print("host_pid_namespace_external_lease_required=true")
        print("host_pid_namespace_lease_verified=false")
        print("retained_procfs_view_used=false")
        print("production_filesystem_write=false")
        print("root_execution_forbidden=true")
        print("all_process_reference_absence_proven=false")
        print("target_snapshot_stable_required=true")
        print("fd_table_stability_proven=false")
        print("mapping_set_stability_proven=false")
        print("live_at_use_reverification_required=true")
        print("replacement_apply_authorized=false")
        print("service_mutation=false")
        print("runtime_integration=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
