#!/usr/bin/env python3
# Read-only Precision prestate census for the accepted V3 custody runtime archive.
# No sudo, service mutation, permission mutation, archive extraction, or funds access.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALL_PRESTATE_CENSUS_V1"
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
        print("production_census_read_only=true")
        print("production_census_explicit_filesystem_write=false")
        print("production_census_filesystem_write_free=false")
        print("production_census_atime_write_possible=true")
        print("self_test_temporary_filesystem_write=false")
        print("service_mutation=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_nobytecode_mode_required")

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_custody_runtime_v3_install_prestate_census_v1"
VERSION = 1

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE_LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-install-archive-lock-v3.json"
)
ARCHIVE_LOCK_GIT_BLOB = "edb4ea2b833373ab387762e45ba7da4032c860f3"
ARCHIVE_LOCK_SHA256 = (
    "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"
)
ARCHIVE_ID = (
    "voidbuycustodyarchive3_"
    "0b1c997cb4649be6b6eaf161712230ad3ee1a0b69720133d3adc4875bae322cb"
)
ARCHIVE_SHA256 = (
    "5c77db938bcfd353e72628088f1e02c4b22d73814cbae555b9c13ce3ba3a95d1"
)
ARCHIVE_BYTES = 266240

INSTALL_PARENT = Path("/opt")
TARGET_NAME = "void-buy-allocation-custody-runtime-v1"
TARGET = INSTALL_PARENT / TARGET_NAME
PROPOSED_STAGE_NAME = ".void-buy-allocation-custody-runtime-v3.stage-v1"
PROPOSED_STAGE = INSTALL_PARENT / PROPOSED_STAGE_NAME
PROPOSED_ROLLBACK_NAME = (
    ".void-buy-allocation-custody-runtime-v1.rollback-v3-v1"
)
PROPOSED_ROLLBACK = INSTALL_PARENT / PROPOSED_ROLLBACK_NAME

MAX_TREE_ENTRIES = 32768
MAX_FILE_BYTES = 64 * 1024 * 1024
MAX_TOTAL_REGULAR_BYTES = 512 * 1024 * 1024
MAX_DEPTH = 64


class CensusHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise CensusHold("custody_runtime_v3_install_prestate_" + reason)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    prefix = b"blob " + str(len(data)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + data).hexdigest()


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


def _fd_mount_id(fd: int) -> int:
    if not isinstance(fd, int) or isinstance(fd, bool) or fd < 0:
        hold("fd_mount_id_descriptor_invalid")
    path = f"/proc/self/fdinfo/{fd}"
    info_fd = -1
    try:
        info_fd = os.open(
            path,
            os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK,
        )
        raw = bytearray()
        while len(raw) <= 64 * 1024:
            chunk = os.read(info_fd, min(4096, 64 * 1024 + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > 64 * 1024:
            hold("fd_mount_id_record_too_large")
    finally:
        if info_fd >= 0:
            os.close(info_fd)
    try:
        text = bytes(raw).decode("ascii")
    except UnicodeDecodeError:
        hold("fd_mount_id_record_invalid")
    values = []
    for line in text.splitlines():
        if line.startswith("mnt_id:"):
            value = line.split(":", 1)[1].strip()
            if value.isdigit():
                values.append(int(value))
    if len(values) != 1 or values[0] <= 0:
        hold("fd_mount_id_missing_or_ambiguous")
    return values[0]


def open_bound_directory(path: Path) -> tuple[int, os.stat_result]:
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
        root_visible = os.stat("/", follow_symlinks=False)
        root_opened = os.fstat(fd)
        if (
            not stat.S_ISDIR(root_opened.st_mode)
            or _identity(root_visible) != _identity(root_opened)
        ):
            hold("filesystem_root_unbound")

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
        if (
            not stat.S_ISDIR(opened.st_mode)
            or _identity(opened) != _identity(visible)
        ):
            hold("directory_terminal_rebound")
        return fd, opened
    except BaseException:
        if fd >= 0:
            os.close(fd)
        raise


def read_bound_regular(path: Path, maximum: int) -> bytes:
    if (
        not isinstance(maximum, int)
        or isinstance(maximum, bool)
        or maximum < 1
        or maximum > 64 * 1024 * 1024
    ):
        hold("read_limit_invalid")
    absolute = Path(os.path.abspath(os.fspath(path)))
    parent_fd, _parent = open_bound_directory(absolute.parent)
    fd = -1
    try:
        name = absolute.name
        before = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        if (
            not stat.S_ISREG(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_size < 1
            or before.st_size > maximum
        ):
            hold("read_file_shape_invalid:" + name)
        fd = os.open(name, _leaf_flags(), dir_fd=parent_fd)
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("read_file_rebound:" + name)
        raw = bytearray()
        while len(raw) < opened.st_size:
            chunk = os.read(fd, min(65536, opened.st_size - len(raw)))
            if not chunk:
                hold("read_file_short:" + name)
            raw.extend(chunk)
        if os.read(fd, 1):
            hold("read_file_grew:" + name)
        after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible_after)
        ):
            hold("read_file_generation_changed:" + name)
        return bytes(raw)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)


def verify_archive_lock() -> dict[str, Any]:
    raw = read_bound_regular(ROOT / ARCHIVE_LOCK_REL, 128 * 1024)
    if git_blob(raw) != ARCHIVE_LOCK_GIT_BLOB:
        hold("archive_lock_git_blob_mismatch")
    if sha256(raw) != ARCHIVE_LOCK_SHA256:
        hold("archive_lock_sha256_mismatch")
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("archive_lock_json_invalid:" + type(exc).__name__)

    if (
        type(value) is not dict
        or value.get("schema")
        != "void_buy_void_custody_runtime_install_archive_lock_v3"
        or value.get("marker")
        != "VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_LOCK_V3"
        or value.get("archive_candidate_accepted") is not True
        or value.get("archive_evidence", {}).get("archive_candidate_id")
        != ARCHIVE_ID
        or value.get("archive_evidence", {}).get("bytes") != ARCHIVE_BYTES
        or value.get("archive_evidence", {}).get("sha256") != ARCHIVE_SHA256
    ):
        hold("archive_lock_identity_invalid")

    for key in (
        "immutable_root_install",
        "install_target_selected",
        "existing_target_replaced",
        "node_binary_identity_verified",
        "request_root_selected",
        "shared_directory_selected",
        "service_unit_installed",
        "service_started",
        "service_restarted",
        "runtime_integration",
        "reserve_method_enabled",
        "recover_method_enabled",
        "payment_acceptance",
        "public_presale_activation",
        "production_gate_ready",
        "funds_movement",
    ):
        if value.get(key) is not False:
            hold("archive_lock_authority_not_false:" + key)
    return value


def _entry_record(
    relative: str,
    st: os.stat_result,
    kind: str,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "path": relative,
        "kind": kind,
        "dev": st.st_dev,
        "ino": st.st_ino,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "nlink": st.st_nlink,
        "mtime_ns": st.st_mtime_ns,
        "ctime_ns": st.st_ctime_ns,
    }
    if kind == "file":
        result["bytes"] = st.st_size
    return result


def _observe_symlink_at(
    parent_fd: int,
    name: str,
    before: os.stat_result,
) -> os.stat_result:
    # Symlink target text is opaque and potentially sensitive. Do not read,
    # hash, print, or otherwise consume it in this metadata-only census.
    if not stat.S_ISLNK(before.st_mode):
        hold("target_symlink_shape_invalid")
    after = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    if _generation(before) != _generation(after):
        hold("target_symlink_generation_changed")
    return after


def _observe_regular_at(
    parent_fd: int,
    name: str,
    before: os.stat_result,
    expected_mnt_id: int,
) -> os.stat_result:
    # Legacy runtime files are intentionally content-blind here. Open only to
    # bind type/mount/generation metadata; never read opaque file bodies.
    if before.st_size < 0 or before.st_size > MAX_FILE_BYTES:
        hold("target_file_size_out_of_bounds")
    fd = os.open(name, _leaf_flags(), dir_fd=parent_fd)
    try:
        opened = os.fstat(fd)
        if _fd_mount_id(fd) != expected_mnt_id:
            hold("target_tree_cross_mount_file_forbidden")
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

def _scan_dir(
    fd: int,
    relative_prefix: str,
    records: list[dict[str, Any]],
    totals: dict[str, int],
    depth: int,
    expected_dev: int,
    expected_mnt_id: int,
) -> None:
    if depth > MAX_DEPTH:
        hold("target_tree_depth_exceeded")
    before = os.fstat(fd)
    if not stat.S_ISDIR(before.st_mode):
        hold("target_directory_not_directory")
    if before.st_dev != expected_dev:
        hold("target_tree_cross_device_directory_forbidden")
    if _fd_mount_id(fd) != expected_mnt_id:
        hold("target_tree_cross_mount_directory_forbidden")

    # Process each directory entry as it is enumerated. Do not retain a
    # per-recursion-frame name list: otherwise wide ancestors plus wide
    # descendants can retain depth * MAX_TREE_ENTRIES names simultaneously.
    # The final record list is sorted globally below, so traversal order does
    # not affect the canonical metadata digest.
    try:
        with os.scandir(fd) as iterator:
            for entry in iterator:
                name = entry.name
                if name in (".", "..") or "/" in name or "\x00" in name:
                    hold("target_tree_name_invalid")

                totals["entries"] += 1
                if totals["entries"] > MAX_TREE_ENTRIES:
                    hold("target_tree_entry_limit_exceeded")

                relative = (
                    name
                    if not relative_prefix
                    else relative_prefix + "/" + name
                )
                st = os.stat(name, dir_fd=fd, follow_symlinks=False)
                if st.st_dev != expected_dev:
                    hold(
                        "target_tree_cross_device_entry_forbidden"
                    )

                if stat.S_ISDIR(st.st_mode):
                    child_fd = os.open(name, _directory_flags(), dir_fd=fd)
                    try:
                        opened = os.fstat(child_fd)
                        if _identity(st) != _identity(opened):
                            hold("target_directory_rebound")
                        records.append(
                            _entry_record(relative, opened, "directory")
                        )
                        totals["directories"] += 1
                        _scan_dir(
                            child_fd,
                            relative,
                            records,
                            totals,
                            depth + 1,
                            expected_dev,
                            expected_mnt_id,
                        )
                        terminal = os.fstat(child_fd)
                        visible_terminal = os.stat(
                            name, dir_fd=fd, follow_symlinks=False
                        )
                        if (
                            _generation(opened) != _generation(terminal)
                            or _generation(terminal)
                            != _generation(visible_terminal)
                        ):
                            hold("target_directory_generation_changed")
                    finally:
                        os.close(child_fd)
                elif stat.S_ISREG(st.st_mode):
                    observed = _observe_regular_at(
                        fd, name, st, expected_mnt_id
                    )
                    records.append(_entry_record(relative, observed, "file"))
                    totals["files"] += 1
                    totals["bytes"] += observed.st_size
                    if totals["bytes"] > MAX_TOTAL_REGULAR_BYTES:
                        hold("target_tree_byte_limit_exceeded")
                elif stat.S_ISLNK(st.st_mode):
                    observed = _observe_symlink_at(fd, name, st)
                    records.append(_entry_record(relative, observed, "symlink"))
                    totals["symlinks"] += 1
                else:
                    hold("target_tree_special_file_forbidden")
    except CensusHold:
        raise
    except OSError as exc:
        hold("target_directory_unreadable:" + str(exc.errno))

    after = os.fstat(fd)
    if _generation(before) != _generation(after):
        hold("target_directory_changed_during_scan")

def scan_target_at(
    parent_fd: int,
    parent_generation: os.stat_result,
    target_name: str,
) -> dict[str, Any]:
    try:
        visible = os.stat(target_name, dir_fd=parent_fd, follow_symlinks=False)
    except FileNotFoundError:
        return {
            "state": "ABSENT",
            "replacement_required": False,
            "root": None,
            "tree": None,
        }

    if not stat.S_ISDIR(visible.st_mode) or stat.S_ISLNK(visible.st_mode):
        hold("target_not_direct_directory")

    target_fd = os.open(target_name, _directory_flags(), dir_fd=parent_fd)
    try:
        opened = os.fstat(target_fd)
        if _identity(visible) != _identity(opened):
            hold("target_root_rebound")
        if opened.st_dev != parent_generation.st_dev:
            hold("target_root_cross_device_mount_forbidden")
        parent_mnt_id = _fd_mount_id(parent_fd)
        target_mnt_id = _fd_mount_id(target_fd)
        if target_mnt_id != parent_mnt_id:
            hold("target_root_cross_mount_forbidden")

        records: list[dict[str, Any]] = []
        totals = {
            "entries": 0,
            "directories": 0,
            "files": 0,
            "symlinks": 0,
            "bytes": 0,
        }
        _scan_dir(
            target_fd,
            "",
            records,
            totals,
            0,
            opened.st_dev,
            target_mnt_id,
        )

        final_opened = os.fstat(target_fd)
        final_visible = os.stat(
            target_name, dir_fd=parent_fd, follow_symlinks=False
        )
        if (
            _generation(opened) != _generation(final_opened)
            or _generation(final_opened) != _generation(final_visible)
        ):
            hold("target_root_changed_during_scan")

        normalized = sorted(records, key=lambda item: item["path"])
        tree_sha = sha256(canonical(normalized))
        return {
            "state": "PRESENT_SCANNED",
            "replacement_required": True,
            "root": {
                "dev": opened.st_dev,
                "ino": opened.st_ino,
                "uid": opened.st_uid,
                "gid": opened.st_gid,
                "mode": format(stat.S_IMODE(opened.st_mode), "04o"),
                "nlink": opened.st_nlink,
                "mount_id": target_mnt_id,
            },
            "tree": {
                "entries": totals["entries"],
                "directories": totals["directories"],
                "regular_files": totals["files"],
                "regular_bytes": totals["bytes"],
                "metadata_sha256": tree_sha,
                "special_files": 0,
                "symlinks": totals["symlinks"],
            },
        }
    finally:
        os.close(target_fd)


def _child_state(parent_fd: int, name: str) -> dict[str, Any]:
    try:
        st = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    except FileNotFoundError:
        return {"present": False, "kind": "absent"}
    if stat.S_ISDIR(st.st_mode):
        kind = "directory"
    elif stat.S_ISREG(st.st_mode):
        kind = "file"
    elif stat.S_ISLNK(st.st_mode):
        kind = "symlink"
    else:
        kind = "special"
    return {
        "present": True,
        "kind": kind,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "dev": st.st_dev,
        "ino": st.st_ino,
    }


def collect_prestate(
    parent: Path,
    target_name: str,
    stage_name: str,
    rollback_name: str,
    *,
    require_root_owned_parent: bool,
) -> dict[str, Any]:
    parent_fd, parent_generation = open_bound_directory(parent)
    try:
        if (
            require_root_owned_parent
            and (
                parent_generation.st_uid != 0
                or parent_generation.st_gid != 0
                or stat.S_IMODE(parent_generation.st_mode) & 0o022
            )
        ):
            hold("install_parent_custody_invalid")

        parent_mnt_id = _fd_mount_id(parent_fd)
        target = scan_target_at(parent_fd, parent_generation, target_name)
        stage = _child_state(parent_fd, stage_name)
        rollback = _child_state(parent_fd, rollback_name)

        parent_after = os.fstat(parent_fd)
        visible_after = os.stat(str(parent), follow_symlinks=False)
        if (
            _generation(parent_generation) != _generation(parent_after)
            or _generation(parent_after) != _generation(visible_after)
        ):
            hold("install_parent_changed_during_census")

        rollback_candidate = (
            target["state"] == "PRESENT_SCANNED"
            and stage["present"] is False
            and rollback["present"] is False
        )
        create_only_candidate = (
            target["state"] == "ABSENT"
            and stage["present"] is False
            and rollback["present"] is False
        )
        return {
            "parent": {
                "path": str(parent),
                "dev": parent_generation.st_dev,
                "ino": parent_generation.st_ino,
                "uid": parent_generation.st_uid,
                "gid": parent_generation.st_gid,
                "mode": format(stat.S_IMODE(parent_generation.st_mode), "04o"),
                "mount_id": parent_mnt_id,
            },
            "target": target,
            "proposed_stage": {
                "path": str(parent / stage_name),
                **stage,
            },
            "proposed_rollback": {
                "path": str(parent / rollback_name),
                **rollback,
            },
            "same_filesystem_rename_candidate": (
                target["state"] == "PRESENT_SCANNED"
                and target["root"]["dev"] == parent_generation.st_dev
                and target["root"]["mount_id"] == parent_mnt_id
            ),
            "rollback_rename_candidate": rollback_candidate,
            "create_only_install_candidate": create_only_candidate,
        }
    finally:
        os.close(parent_fd)


def census() -> dict[str, Any]:
    lock = verify_archive_lock()
    prestate = collect_prestate(
        INSTALL_PARENT,
        TARGET_NAME,
        PROPOSED_STAGE_NAME,
        PROPOSED_ROLLBACK_NAME,
        require_root_owned_parent=True,
    )
    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "archive_lock": {
            "path": ARCHIVE_LOCK_REL,
            "git_blob_sha1": ARCHIVE_LOCK_GIT_BLOB,
            "sha256": ARCHIVE_LOCK_SHA256,
            "archive_candidate_id": ARCHIVE_ID,
            "archive_bytes": ARCHIVE_BYTES,
            "archive_sha256": ARCHIVE_SHA256,
            "archive_candidate_accepted": lock["archive_candidate_accepted"],
        },
        "prestate": prestate,
        "read_only": True,
        "filesystem_explicit_write": False,
        "filesystem_write_free": False,
        "atime_write_possible": True,
        "production_census_read_only": True,
        "production_census_explicit_filesystem_write": False,
        "production_census_filesystem_write_free": False,
        "production_census_atime_write_possible": True,
        "archive_extraction": False,
        "permission_mutation": False,
        "service_state_checked": False,
        "service_mutation": False,
        "live_process_binding_checked": False,
        "process_environment_read": False,
        "process_arguments_read": False,
        "request_history_read": False,
        "custody_data_read": False,
        "credential_access": False,
        "wallet_or_signer_access": False,
        "install_target_selected": False,
        "existing_target_replaced": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
    }
    return {
        **body,
        "prestate_id": (
            "voidbuycustodyprestate1_" + sha256(canonical(body))
        ),
    }


def self_test() -> None:
    verify_archive_lock()
    with tempfile.TemporaryDirectory(
        prefix="void-custody-v3-prestate-selftest-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o700)
        target = parent / TARGET_NAME
        (target / "nested").mkdir(parents=True, mode=0o700)
        (target / "a.txt").write_bytes(b"alpha\n")
        (target / "nested" / "b.txt").write_bytes(b"beta\n")

        first = collect_prestate(
            parent,
            TARGET_NAME,
            PROPOSED_STAGE_NAME,
            PROPOSED_ROLLBACK_NAME,
            require_root_owned_parent=False,
        )
        second = collect_prestate(
            parent,
            TARGET_NAME,
            PROPOSED_STAGE_NAME,
            PROPOSED_ROLLBACK_NAME,
            require_root_owned_parent=False,
        )
        if first != second:
            hold("self_test_nondeterministic_census")
        if (
            first["target"]["state"] != "PRESENT_SCANNED"
            or first["target"]["tree"]["regular_files"] != 2
            or first["target"]["tree"]["directories"] != 1
            or first["target"]["tree"]["regular_bytes"] != 11
            or first["same_filesystem_rename_candidate"] is not True
            or first["rollback_rename_candidate"] is not True
            or first["create_only_install_candidate"] is not False
        ):
            hold("self_test_positive_prestate_invalid")

        (target / "opaque-link").symlink_to("../outside-do-not-follow")
        linked = collect_prestate(
            parent,
            TARGET_NAME,
            PROPOSED_STAGE_NAME,
            PROPOSED_ROLLBACK_NAME,
            require_root_owned_parent=False,
        )
        if linked["target"]["tree"]["symlinks"] != 1:
            hold("self_test_symlink_opaque_identity_missing")
        (target / "opaque-link").unlink()

        fifo = target / "bad-fifo"
        os.mkfifo(fifo, 0o600)
        try:
            collect_prestate(
                parent,
                TARGET_NAME,
                PROPOSED_STAGE_NAME,
                PROPOSED_ROLLBACK_NAME,
                require_root_owned_parent=False,
            )
        except CensusHold as exc:
            if "target_tree_special_file_forbidden" not in str(exc):
                raise
        else:
            hold("self_test_special_file_accepted")
        fifo.unlink()

        stage = parent / PROPOSED_STAGE_NAME
        stage.mkdir(mode=0o700)
        collision = collect_prestate(
            parent,
            TARGET_NAME,
            PROPOSED_STAGE_NAME,
            PROPOSED_ROLLBACK_NAME,
            require_root_owned_parent=False,
        )
        if (
            collision["proposed_stage"]["present"] is not True
            or collision["rollback_rename_candidate"] is not False
        ):
            hold("self_test_stage_collision_not_held_by_plan")

    print(MARKER + "_SELF_TEST_GREEN")
    print("archive_lock_exact=true")
    print("descriptor_bound_tree_scan=true")
    print("target_tree_metadata_digest=true")
    print("legacy_regular_file_content_read=false")
    print("nested_mount_rejection_bound=true")
    print("mount_id_boundary_bound=true")
    print("symlink_target_content_read=false")
    print("hold_reason_untrusted_entry_names_redacted=true")
    print("special_file_rejection=true")
    print("stage_and_rollback_collision_observed=true")
    print("production_census_read_only=true")
    print("python_no_bytecode_mode_required=true")
    print("production_census_explicit_filesystem_write=false")
    print("production_census_filesystem_write_free=false")
    print("production_census_atime_write_possible=true")
    print("self_test_temporary_filesystem_write=true")
    print("archive_extraction=false")
    print("service_state_checked=false")
    print("service_mutation=false")
    print("request_history_read=false")
    print("custody_data_read=false")
    print("credential_access=false")
    print("wallet_or_signer_access=false")
    print("install_target_selected=false")
    print("existing_target_replaced=false")
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
        print("production_census_read_only=true")
        print("production_census_explicit_filesystem_write=false")
        print("production_census_filesystem_write_free=false")
        print("production_census_atime_write_possible=true")
        print(
            "self_test_temporary_filesystem_write="
            + ("true" if "--self-test" in _bootstrap_sys.argv[1:] else "false")
        )
        print("service_mutation=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
