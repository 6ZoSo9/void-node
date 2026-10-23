#!/usr/bin/env python3
# Read-only current-UID process-reference census for the legacy custody runtime.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROCESS_REFERENCE_CENSUS_V1"
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
        print("production_filesystem_write=false")
        print("service_mutation=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_mode_required")

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
SCHEMA = "void_buy_void_custody_runtime_v3_process_reference_census_v1"
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

PRESTATE_SOURCE_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_install_prestate_census_v1.py"
)
PRESTATE_SOURCE_BLOB = "feb6508133a1feda9bda793646a5c949f1fdc7f0"
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

MAX_TARGET_ENTRIES = 4096
MAX_TARGET_DEPTH = 64
MAX_PIDS = 32768
MAX_FDS_PER_PROCESS = 65536
MAX_STAT_BYTES = 4096
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


def _scan_target_dir(
    fd: int,
    expected_dev: int,
    expected_mnt_id: int,
    identities: set[tuple[int, int]],
    totals: dict[str, int],
    depth: int,
) -> None:
    if depth > MAX_TARGET_DEPTH:
        hold("target_depth_exceeded")
    st = os.fstat(fd)
    if not stat.S_ISDIR(st.st_mode) or st.st_dev != expected_dev:
        hold("target_directory_identity_invalid")
    if _fd_mount_id(fd) != expected_mnt_id:
        hold("target_cross_mount_directory_forbidden")
    identities.add((st.st_dev, st.st_ino))

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
            hold("target_entry_name_invalid")
        before = os.stat(name, dir_fd=fd, follow_symlinks=False)
        if before.st_dev != expected_dev:
            hold("target_cross_device_entry_forbidden")
        identities.add((before.st_dev, before.st_ino))
        totals["entries"] += 1
        if totals["entries"] > MAX_TARGET_ENTRIES:
            hold("target_entry_limit_exceeded")

        if stat.S_ISDIR(before.st_mode):
            child_fd = os.open(name, _directory_flags(), dir_fd=fd)
            try:
                opened = os.fstat(child_fd)
                if _identity(before) != _identity(opened):
                    hold("target_directory_rebound")
                _scan_target_dir(
                    child_fd,
                    expected_dev,
                    expected_mnt_id,
                    identities,
                    totals,
                    depth + 1,
                )
                after = os.fstat(child_fd)
                visible = os.stat(name, dir_fd=fd, follow_symlinks=False)
                if _generation(opened) != _generation(after) or _generation(after) != _generation(visible):
                    hold("target_directory_generation_changed")
            finally:
                os.close(child_fd)
        elif stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode):
            continue
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
        totals = {"entries": 0}
        _scan_target_dir(
            target_fd,
            opened.st_dev,
            target_mnt_id,
            identities,
            totals,
            0,
        )
        after = os.fstat(target_fd)
        visible = os.stat(path.name, dir_fd=parent_fd, follow_symlinks=False)
        if _generation(opened) != _generation(after) or _generation(after) != _generation(visible):
            hold("target_root_generation_changed")
        return {
            "root_dev": opened.st_dev,
            "root_ino": opened.st_ino,
            "mount_id": target_mnt_id,
            "identity_count": len(identities),
            "identities": identities,
        }
    finally:
        if target_fd >= 0:
            os.close(target_fd)
        os.close(parent_fd)


def _proc_stat_identity(pid: int) -> tuple[str, str] | None:
    path = PROC / str(pid) / "stat"
    try:
        raw = _read_bounded_fd_path(path, MAX_STAT_BYTES, allow_zero_size=True)
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


def _same_uid_pids(uid: int) -> tuple[list[int], int]:
    pids: list[int] = []
    vanished = 0
    numeric_seen = 0
    with os.scandir(PROC) as iterator:
        for entry in iterator:
            name = entry.name
            if not name.isdigit():
                continue
            numeric_seen += 1
            if numeric_seen > MAX_PIDS:
                hold("proc_pid_limit_exceeded")
            pid = int(name)
            try:
                st = os.stat(PROC / name, follow_symlinks=False)
            except FileNotFoundError:
                vanished += 1
                continue
            if stat.S_ISDIR(st.st_mode) and st.st_uid == uid:
                pids.append(pid)
    pids.sort()
    return pids, vanished


def _matches_target(st: os.stat_result, identities: set[tuple[int, int]]) -> bool:
    return (st.st_dev, st.st_ino) in identities


def _scan_proc_link(
    pid: int,
    name: str,
    identities: set[tuple[int, int]],
) -> tuple[bool, bool]:
    path = PROC / str(pid) / name
    try:
        st = os.stat(path, follow_symlinks=True)
    except FileNotFoundError:
        return False, True
    except PermissionError:
        return False, True
    except OSError as exc:
        if exc.errno in (errno.ENOENT, errno.ESRCH, errno.EACCES, errno.EPERM):
            return False, True
        raise
    return _matches_target(st, identities), False


def _scan_fds(
    pid: int,
    identities: set[tuple[int, int]],
) -> tuple[int, int]:
    fd_root = PROC / str(pid) / "fd"
    references = 0
    races = 0
    count = 0
    try:
        iterator = os.scandir(fd_root)
    except (FileNotFoundError, PermissionError):
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
                    st = os.stat(fd_root / entry.name, follow_symlinks=True)
                except (FileNotFoundError, PermissionError):
                    races += 1
                    continue
                except OSError as exc:
                    if exc.errno in (errno.ENOENT, errno.ESRCH, errno.EACCES, errno.EPERM):
                        races += 1
                        continue
                    raise
                if _matches_target(st, identities):
                    references += 1
    finally:
        pass
    return references, races


def _maps_reference_count(
    pid: int,
    identities: set[tuple[int, int]],
) -> tuple[int, bool]:
    path = PROC / str(pid) / "maps"
    try:
        raw = _read_bounded_fd_path(path, MAX_MAPS_BYTES, allow_zero_size=True)
    except (FileNotFoundError, PermissionError):
        return 0, True
    except OSError as exc:
        if exc.errno in (errno.ENOENT, errno.ESRCH, errno.EACCES, errno.EPERM):
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
            device = os.makedev(int(major_text, 16), int(minor_text, 16))
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
) -> dict[str, Any]:
    before = _proc_stat_identity(pid)
    if before is None:
        return {"pid": pid, "status": "vanished"}
    state, start_ticks = before
    if state in ("Z", "X"):
        return {"pid": pid, "status": "not_live"}

    try:
        proc_st = os.stat(PROC / str(pid), follow_symlinks=False)
    except FileNotFoundError:
        return {"pid": pid, "status": "vanished"}
    if proc_st.st_uid != uid:
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
        matched, failed = _scan_proc_link(pid, name, identities)
        if matched:
            references[name] += 1
        if failed:
            incomplete += 1

    fd_refs, fd_races = _scan_fds(pid, identities)
    references["fd"] = fd_refs
    incomplete += fd_races

    map_refs, maps_incomplete = _maps_reference_count(pid, identities)
    references["maps"] = map_refs
    incomplete += int(maps_incomplete)

    after = _proc_stat_identity(pid)
    if after is None or after != before:
        return {
            "pid": pid,
            "status": "generation_changed_or_vanished",
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
        stable_set
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
    identities: set[tuple[int, int]],
) -> dict[str, Any]:
    uid = _assert_unprivileged_execution()

    attempts: list[dict[str, Any]] = []
    for attempt in range(1, MAX_SCAN_ATTEMPTS + 1):
        start_pids, vanished = _same_uid_pids(uid)
        rows = [scan_process(pid, uid, identities) for pid in start_pids]
        end_pids, vanished_end = _same_uid_pids(uid)
        result = classify_attempt(
            start_pids,
            end_pids,
            vanished + vanished_end,
            rows,
        )
        attempts.append({"attempt": attempt, **result})
        if result["referenced_process_count"] > 0:
            break
        if result["current_uid_target_reference_absent_candidate"] is True:
            break
    selected = attempts[-1]
    return {
        "effective_uid": uid,
        "attempt_count": len(attempts),
        "attempts": attempts,
        "selected_attempt": selected["attempt"],
        "current_uid_target_reference_absent_candidate":
            selected["current_uid_target_reference_absent_candidate"],
        "all_process_reference_absence_proven": False,
        "privileged_all_process_scan": False,
        "custody_principal_process_scan_performed": False,
        "fd_table_stability_proven": False,
        "mapping_set_stability_proven": False,
        "live_at_use_reverification_required": True,
    }


def census() -> dict[str, Any]:
    _assert_unprivileged_execution()
    lock = verify_source_inputs()
    target = target_identity_set(TARGET)
    process = current_uid_census(target["identities"])
    target_public = {
        "path": str(TARGET),
        "root_dev": target["root_dev"],
        "root_ino": target["root_ino"],
        "mount_id": target["mount_id"],
        "identity_count": target["identity_count"],
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
        "production_filesystem_write": False,
        "root_execution_forbidden": True,
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

    clean_rows = [{
        "pid": 101,
        "status": "scanned",
        "start_ticks": "10",
        "reference_count": 0,
        "references": {"cwd": 0, "root": 0, "exe": 0, "fd": 0, "maps": 0},
        "incomplete_observations": 0,
    }]
    clean = classify_attempt([101], [101], 0, clean_rows)
    if clean["current_uid_target_reference_absent_candidate"] is not True:
        hold("self_test_clean_candidate_rejected")

    referenced_rows = [{
        **clean_rows[0],
        "reference_count": 1,
        "references": {"cwd": 0, "root": 0, "exe": 0, "fd": 1, "maps": 0},
    }]
    referenced = classify_attempt([101], [101], 0, referenced_rows)
    if (
        referenced["current_uid_target_reference_absent_candidate"] is not False
        or referenced["reference_count_by_kind"]["fd"] != 1
    ):
        hold("self_test_reference_not_rejected")

    changed = classify_attempt([101], [101, 102], 0, clean_rows)
    if changed["current_uid_target_reference_absent_candidate"] is not False:
        hold("self_test_pid_set_change_accepted")

    raced_rows = [{**clean_rows[0], "incomplete_observations": 1}]
    raced = classify_attempt([101], [101], 0, raced_rows)
    if raced["current_uid_target_reference_absent_candidate"] is not False:
        hold("self_test_incomplete_scan_accepted")

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
    print("proc_cmdline_read=false")
    print("proc_environ_read=false")
    print("proc_fd_target_text_read=false")
    print("proc_maps_path_text_retained=false")
    print("fd_inode_reference_classification=true")
    print("mapped_inode_reference_classification=true")
    print("pid_generation_race_fail_closed=true")
    print("pid_set_change_fail_closed=true")
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
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0
    if args.census:
        print(json.dumps(census(), sort_keys=True, separators=(",", ":")))
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
        print("production_filesystem_write=false")
        print("root_execution_forbidden=true")
        print("all_process_reference_absence_proven=false")
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
