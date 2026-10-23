#!/usr/bin/env python3
# Source/CI-only protected proc-ref installer candidate.
# Production --apply is hard-disabled in this generation.
from __future__ import annotations

import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_CANDIDATE_V1"
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
        print("host_write=false")
        print("protected_source_install_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_nobytecode_mode_required")

import argparse
import ctypes
import errno
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_custody_protected_procref_install_candidate_v1"
VERSION = 1

ROOT = Path(__file__).resolve().parents[2]

PLAN_REL = "tools/void-buy-allocation-custody-protected-procref-install-plan-v1.mjs"
PLAN_GIT_BLOB = "a2431fffbee7be4de2ee1152b70e5fcccafd40c9"
LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-reference-census-lock-v4.json"
)
LOCK_GIT_BLOB = "29a5d9325468897c9b99d22d4a0376547a5e865e"
LOCK_ID = (
    "voidbuycustodyallprocreflock4_"
    "2f22f0cf3e5c5ed56c2a31f0862f087cdbbe41a9"
)

REVIEWED_SOURCE_HEAD = "0eb763d8ecba723f5a80cccb24a297fbf5a010b7"
REVIEWED_SOURCE_GIT_BLOB = "2f22f0cf3e5c5ed56c2a31f0862f087cdbbe41a9"
REVIEWED_SOURCE_BYTES = 74322
REVIEWED_SOURCE_SHA256 = (
    "79810ed2afa60d2e544e0f6f48ff8189"
    "dd26d5aaeb65208bfb1f562fda467a1c"
)

INSTALL_PARENT = Path("/opt")
INSTALL_NAME = "void-buy-allocation-custody-procref-v1"
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
STAGE_NAME = ".void-buy-allocation-custody-procref-v1.stage-v1"
STAGE_ROOT = INSTALL_PARENT / STAGE_NAME
SOURCE_NAME = (
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_reference_census_v1.py"
)

RENAME_NOREPLACE = 1
MAX_SOURCE_BYTES = 2 * 1024 * 1024
MAX_FDINFO_BYTES = 64 * 1024
MAX_DIRECTORY_ENTRIES = 8

# Deliberately immutable in this generation.
PRODUCTION_APPLY_AUTHORIZED = False


class InstallHold(RuntimeError):
    pass


class PublishedInstallHold(InstallHold):
    def __init__(self, reason: str, phase: str) -> None:
        super().__init__(reason)
        self.phase = phase


def hold(reason: str) -> None:
    raise InstallHold("custody_procref_install_candidate_" + reason)


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


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
    return (
        os.O_RDONLY
        | os.O_DIRECTORY
        | os.O_CLOEXEC
        | os.O_NOFOLLOW
        | os.O_NONBLOCK
    )


def _leaf_read_flags() -> int:
    return os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK


def _read_fd(fd: int, maximum: int) -> bytes:
    raw = bytearray()
    while len(raw) <= maximum:
        chunk = os.read(fd, min(65536, maximum + 1 - len(raw)))
        if not chunk:
            break
        raw.extend(chunk)
    if len(raw) > maximum:
        hold("read_ceiling_exceeded")
    return bytes(raw)


def _read_direct_regular(path: Path, maximum: int) -> bytes:
    before = os.stat(path, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_size < 1
        or before.st_size > maximum
    ):
        hold("input_file_shape_invalid:" + path.name)
    fd = os.open(path, _leaf_read_flags())
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("input_file_rebound:" + path.name)
        raw = _read_fd(fd, maximum)
        if len(raw) != opened.st_size:
            hold("input_file_size_read_mismatch:" + path.name)
        after = os.fstat(fd)
        visible = os.stat(path, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("input_file_generation_changed:" + path.name)
        return raw
    finally:
        os.close(fd)


def _read_exact_candidate(path: Path) -> bytes:
    absolute = Path(os.path.abspath(os.fspath(path)))
    if (
        not absolute.is_absolute()
        or "\x00" in str(absolute)
        or os.path.normpath(str(absolute)) != str(absolute)
    ):
        hold("candidate_path_invalid")
    raw = _read_direct_regular(absolute, MAX_SOURCE_BYTES)
    verify_source_bytes(raw)
    return raw


def _open_production_parent() -> tuple[int, dict[str, int]]:
    root_fd = os.open("/", _directory_flags())
    parent_fd = -1
    try:
        root_opened = os.fstat(root_fd)
        root_visible = os.stat("/", follow_symlinks=False)
        if (
            not stat.S_ISDIR(root_opened.st_mode)
            or root_opened.st_uid != 0
            or root_opened.st_gid != 0
            or stat.S_IMODE(root_opened.st_mode) & 0o022
            or _identity(root_opened) != _identity(root_visible)
        ):
            hold("filesystem_root_custody_invalid")
        before = os.stat("opt", dir_fd=root_fd, follow_symlinks=False)
        if (
            not stat.S_ISDIR(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_uid != 0
            or before.st_gid != 0
            or stat.S_IMODE(before.st_mode) & 0o022
        ):
            hold("production_install_parent_invalid")
        parent_fd = os.open("opt", _directory_flags(), dir_fd=root_fd)
        opened = os.fstat(parent_fd)
        if _identity(before) != _identity(opened):
            hold("production_install_parent_rebound")
        root_after = os.fstat(root_fd)
        root_visible_after = os.stat("/", follow_symlinks=False)
        if (
            _identity(root_after) != _identity(root_opened)
            or _identity(root_after) != _identity(root_visible_after)
        ):
            hold("filesystem_root_changed_during_parent_open")
        record = _parent_record(
            parent_fd,
            expected_uid=0,
            expected_gid=0,
        )
        result_fd = parent_fd
        parent_fd = -1
        return result_fd, record
    finally:
        if parent_fd >= 0:
            os.close(parent_fd)
        os.close(root_fd)


def verify_inputs() -> dict[str, Any]:
    plan_raw = _read_direct_regular(ROOT / PLAN_REL, MAX_SOURCE_BYTES)
    if git_blob(plan_raw) != PLAN_GIT_BLOB:
        hold("install_plan_blob_mismatch")
    plan_text = plan_raw.decode("utf-8", "strict")
    for needle in (
        'protected_source_install_authorized: false',
        'root_census_execution_authorized: false',
        'publication_syscall: "renameat2"',
        'publication_flag: "RENAME_NOREPLACE"',
        REVIEWED_SOURCE_GIT_BLOB,
        REVIEWED_SOURCE_SHA256,
    ):
        if needle not in plan_text:
            hold("install_plan_marker_missing")

    lock_raw = _read_direct_regular(ROOT / LOCK_REL, 256 * 1024)
    if git_blob(lock_raw) != LOCK_GIT_BLOB:
        hold("accepted_lock_blob_mismatch")
    try:
        lock = json.loads(lock_raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("accepted_lock_json_invalid:" + type(exc).__name__)
    if (
        type(lock) is not dict
        or lock.get("schema")
        != "void_buy_void_custody_runtime_v3_protected_all_process_reference_census_lock_v4"
        or lock.get("marker")
        != "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_LOCK_V4"
        or lock.get("version") != 4
        or lock.get("lock_id") != LOCK_ID
        or lock.get("candidate_source_accepted") is not True
    ):
        hold("accepted_lock_identity_invalid")
    evidence = lock.get("candidate_evidence")
    if (
        type(evidence) is not dict
        or evidence.get("source_git_blob_sha1") != REVIEWED_SOURCE_GIT_BLOB
        or evidence.get("source_bytes") != REVIEWED_SOURCE_BYTES
        or evidence.get("source_sha256") != REVIEWED_SOURCE_SHA256
    ):
        hold("accepted_lock_source_identity_invalid")
    for key in (
        "protected_install_authorized",
        "protected_source_installed",
        "live_privileged_census_authorized",
        "live_privileged_census_executed",
        "service_mutation",
        "systemd_mutation",
        "existing_target_replaced",
        "replacement_apply_authorized",
        "runtime_integration",
        "payment_acceptance",
        "public_presale_activation",
        "production_gate_ready",
        "funds_movement",
    ):
        if lock.get(key) is not False:
            hold("accepted_lock_authority_not_false:" + key)
    return lock


def verify_source_bytes(raw: bytes) -> None:
    if len(raw) != REVIEWED_SOURCE_BYTES:
        hold("reviewed_source_bytes_mismatch")
    if git_blob(raw) != REVIEWED_SOURCE_GIT_BLOB:
        hold("reviewed_source_git_blob_mismatch")
    if sha256(raw) != REVIEWED_SOURCE_SHA256:
        hold("reviewed_source_sha256_mismatch")
    try:
        raw.decode("ascii")
    except UnicodeDecodeError:
        hold("reviewed_source_non_ascii")


def _fd_mount_id(fd: int) -> int:
    path = f"/proc/self/fdinfo/{fd}"
    info_fd = os.open(
        path,
        os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
    )
    try:
        raw = _read_fd(info_fd, MAX_FDINFO_BYTES)
    finally:
        os.close(info_fd)
    try:
        text = raw.decode("ascii")
    except UnicodeDecodeError:
        hold("mount_id_record_non_ascii")
    values: list[int] = []
    for line in text.splitlines():
        if line.startswith("mnt_id:"):
            value = line.split(":", 1)[1].strip()
            if value.isdigit():
                values.append(int(value))
    if len(values) != 1 or values[0] <= 0:
        hold("mount_id_missing_or_ambiguous")
    return values[0]


def _parent_record(
    fd: int,
    *,
    expected_uid: int,
    expected_gid: int,
) -> dict[str, int]:
    st = os.fstat(fd)
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != expected_uid
        or st.st_gid != expected_gid
        or stat.S_IMODE(st.st_mode) & 0o022
    ):
        hold("install_parent_custody_invalid")
    return {
        "dev": st.st_dev,
        "ino": st.st_ino,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": stat.S_IMODE(st.st_mode),
        "mount_id": _fd_mount_id(fd),
    }


def _revalidate_parent(
    fd: int,
    expected: dict[str, int],
    *,
    expected_uid: int,
    expected_gid: int,
) -> None:
    current = _parent_record(
        fd,
        expected_uid=expected_uid,
        expected_gid=expected_gid,
    )
    if current != expected:
        hold("install_parent_generation_or_mount_changed")


def _bounded_names(fd: int) -> list[str]:
    names: list[str] = []
    with os.scandir(fd) as iterator:
        for entry in iterator:
            names.append(entry.name)
            if len(names) > MAX_DIRECTORY_ENTRIES:
                hold("directory_entry_limit_exceeded")
    names.sort()
    return names


def _stage_record(
    fd: int,
    *,
    expected_uid: int,
    expected_gid: int,
    expected_mount_id: int,
) -> dict[str, int]:
    st = os.fstat(fd)
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != expected_uid
        or st.st_gid != expected_gid
        or stat.S_IMODE(st.st_mode) != 0o755
        or st.st_nlink != 2
        or _fd_mount_id(fd) != expected_mount_id
    ):
        hold("stage_directory_identity_invalid")
    return {
        "dev": st.st_dev,
        "ino": st.st_ino,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": stat.S_IMODE(st.st_mode),
        "nlink": st.st_nlink,
        "mount_id": expected_mount_id,
    }


def _read_exact_file_at(
    dir_fd: int,
    name: str,
    *,
    expected_uid: int,
    expected_gid: int,
    expected_raw: bytes,
) -> None:
    before = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != expected_uid
        or before.st_gid != expected_gid
        or stat.S_IMODE(before.st_mode) != 0o444
        or before.st_nlink != 1
        or before.st_size != len(expected_raw)
    ):
        hold("protected_source_metadata_invalid")
    fd = os.open(name, _leaf_read_flags(), dir_fd=dir_fd)
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("protected_source_rebound")
        raw = _read_fd(fd, MAX_SOURCE_BYTES)
        after = os.fstat(fd)
        visible = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("protected_source_generation_changed")
    finally:
        os.close(fd)
    if raw != expected_raw:
        hold("protected_source_bytes_changed")
    verify_source_bytes(raw)


def _write_all(fd: int, raw: bytes) -> None:
    view = memoryview(raw)
    offset = 0
    while offset < len(view):
        wrote = os.write(fd, view[offset:])
        if wrote <= 0:
            hold("short_write")
        offset += wrote


def _create_source_file(
    stage_fd: int,
    raw: bytes,
    *,
    expected_uid: int,
    expected_gid: int,
) -> None:
    fd = os.open(
        SOURCE_NAME,
        os.O_WRONLY
        | os.O_CREAT
        | os.O_EXCL
        | os.O_CLOEXEC
        | os.O_NOFOLLOW,
        0o400,
        dir_fd=stage_fd,
    )
    try:
        _write_all(fd, raw)
        os.fchmod(fd, 0o444)
        os.fsync(fd)
    finally:
        os.close(fd)
    _read_exact_file_at(
        stage_fd,
        SOURCE_NAME,
        expected_uid=expected_uid,
        expected_gid=expected_gid,
        expected_raw=raw,
    )


def _rename_noreplace(parent_fd: int, old_name: str, new_name: str) -> None:
    libc = ctypes.CDLL(None, use_errno=True)
    fn = getattr(libc, "renameat2", None)
    if fn is None:
        hold("renameat2_unavailable")
    fn.argtypes = [
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_uint,
    ]
    fn.restype = ctypes.c_int
    rc = fn(
        parent_fd,
        old_name.encode("ascii"),
        parent_fd,
        new_name.encode("ascii"),
        RENAME_NOREPLACE,
    )
    if rc != 0:
        err = ctypes.get_errno()
        hold("renameat2_noreplace_failed:" + str(err))


def _verify_root_at(
    parent_fd: int,
    root_name: str,
    raw: bytes,
    *,
    expected_uid: int,
    expected_gid: int,
    expected_mount_id: int,
) -> None:
    before = os.stat(root_name, dir_fd=parent_fd, follow_symlinks=False)
    if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
        hold("protected_root_shape_invalid")
    root_fd = os.open(root_name, _directory_flags(), dir_fd=parent_fd)
    try:
        opened = os.fstat(root_fd)
        if _identity(before) != _identity(opened):
            hold("protected_root_rebound")
        _stage_record(
            root_fd,
            expected_uid=expected_uid,
            expected_gid=expected_gid,
            expected_mount_id=expected_mount_id,
        )
        if _bounded_names(root_fd) != [SOURCE_NAME]:
            hold("protected_root_entries_invalid")
        _read_exact_file_at(
            root_fd,
            SOURCE_NAME,
            expected_uid=expected_uid,
            expected_gid=expected_gid,
            expected_raw=raw,
        )
        after = os.fstat(root_fd)
        visible = os.stat(root_name, dir_fd=parent_fd, follow_symlinks=False)
        if _generation(opened) != _generation(after) or _generation(after) != _generation(visible):
            hold("protected_root_generation_changed")
    finally:
        os.close(root_fd)


def _cleanup_stage(
    parent_fd: int,
    *,
    expected_uid: int,
    expected_gid: int,
    expected_mount_id: int,
) -> bool:
    try:
        before = os.stat(STAGE_NAME, dir_fd=parent_fd, follow_symlinks=False)
    except FileNotFoundError:
        return True
    if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
        return False
    stage_fd = -1
    try:
        stage_fd = os.open(STAGE_NAME, _directory_flags(), dir_fd=parent_fd)
        _stage_record(
            stage_fd,
            expected_uid=expected_uid,
            expected_gid=expected_gid,
            expected_mount_id=expected_mount_id,
        )
        names = _bounded_names(stage_fd)
        if any(name != SOURCE_NAME for name in names):
            return False
        if SOURCE_NAME in names:
            os.unlink(SOURCE_NAME, dir_fd=stage_fd)
            os.fsync(stage_fd)
        os.close(stage_fd)
        stage_fd = -1
        os.rmdir(STAGE_NAME, dir_fd=parent_fd)
        os.fsync(parent_fd)
        return True
    except (OSError, InstallHold):
        return False
    finally:
        if stage_fd >= 0:
            os.close(stage_fd)


def _post_publication_checks(
    parent_fd: int,
    parent_initial: dict[str, int],
    raw: bytes,
    *,
    expected_uid: int,
    expected_gid: int,
    target_name: str,
    _fsync_fn: Any = os.fsync,
    _verify_fn: Any = _verify_root_at,
) -> None:
    try:
        _fsync_fn(parent_fd)
    except BaseException as exc:
        raise PublishedInstallHold(
            "post_publication_parent_fsync_failed",
            "parent_fsync",
        ) from exc
    try:
        _revalidate_parent(
            parent_fd,
            parent_initial,
            expected_uid=expected_uid,
            expected_gid=expected_gid,
        )
        _verify_fn(
            parent_fd,
            target_name,
            raw,
            expected_uid=expected_uid,
            expected_gid=expected_gid,
            expected_mount_id=parent_initial["mount_id"],
        )
    except BaseException as exc:
        raise PublishedInstallHold(
            "post_publication_final_verification_failed",
            "final_verification",
        ) from exc


def _publish_into_parent(
    parent_fd: int,
    raw: bytes,
    *,
    expected_uid: int,
    expected_gid: int,
    target_name: str = INSTALL_NAME,
    stage_name: str = STAGE_NAME,
) -> dict[str, Any]:
    # Production constants are defaults; fixtures supply temporary parent fd
    # but preserve the exact publication sequence.
    if target_name != INSTALL_NAME or stage_name != STAGE_NAME:
        hold("publication_names_not_canonical")

    verify_source_bytes(raw)
    parent_initial = _parent_record(
        parent_fd,
        expected_uid=expected_uid,
        expected_gid=expected_gid,
    )
    for name in (target_name, stage_name):
        try:
            os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        except FileNotFoundError:
            pass
        else:
            hold("publication_name_not_absent:" + name)

    created_stage = False
    published = False
    try:
        os.mkdir(stage_name, 0o755, dir_fd=parent_fd)
        created_stage = True
        stage_fd = os.open(stage_name, _directory_flags(), dir_fd=parent_fd)
        try:
            os.fchmod(stage_fd, 0o755)
            stage_initial = _stage_record(
                stage_fd,
                expected_uid=expected_uid,
                expected_gid=expected_gid,
                expected_mount_id=parent_initial["mount_id"],
            )
            _create_source_file(
                stage_fd,
                raw,
                expected_uid=expected_uid,
                expected_gid=expected_gid,
            )
            os.fsync(stage_fd)
            if _bounded_names(stage_fd) != [SOURCE_NAME]:
                hold("stage_entries_invalid")
            stage_after = _stage_record(
                stage_fd,
                expected_uid=expected_uid,
                expected_gid=expected_gid,
                expected_mount_id=parent_initial["mount_id"],
            )
            if stage_after != stage_initial:
                hold("stage_generation_or_mount_changed")
            _read_exact_file_at(
                stage_fd,
                SOURCE_NAME,
                expected_uid=expected_uid,
                expected_gid=expected_gid,
                expected_raw=raw,
            )
        finally:
            os.close(stage_fd)

        _revalidate_parent(
            parent_fd,
            parent_initial,
            expected_uid=expected_uid,
            expected_gid=expected_gid,
        )
        _rename_noreplace(parent_fd, stage_name, target_name)
        published = True
        _post_publication_checks(
            parent_fd,
            parent_initial,
            raw,
            expected_uid=expected_uid,
            expected_gid=expected_gid,
            target_name=target_name,
        )
        receipt_body = {
            "schema": SCHEMA,
            "marker": MARKER,
            "published": True,
            "final_verified": True,
            "target_name": target_name,
            "parent_dev": parent_initial["dev"],
            "parent_ino": parent_initial["ino"],
            "parent_mount_id": parent_initial["mount_id"],
            "source_git_blob_sha1": REVIEWED_SOURCE_GIT_BLOB,
            "source_bytes": REVIEWED_SOURCE_BYTES,
            "source_sha256": REVIEWED_SOURCE_SHA256,
            "root_census_executed": False,
            "replacement_apply_authorized": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "funds_movement": False,
        }
        return {
            **receipt_body,
            "install_receipt_id": (
                "voidbuycustodyprocrefinstall1_" + sha256(canonical(receipt_body))
            ),
        }
    except BaseException:
        if created_stage and not published:
            _cleanup_stage(
                parent_fd,
                expected_uid=expected_uid,
                expected_gid=expected_gid,
                expected_mount_id=parent_initial["mount_id"],
            )
        raise


def source_plan() -> None:
    verify_inputs()
    print(MARKER)
    print("mode=source-plan")
    print("source_candidate_only=true")
    print("production_apply_exposed=false")
    print("production_apply_authorized=false")
    print("reviewed_source_head=" + REVIEWED_SOURCE_HEAD)
    print("reviewed_source_git_blob=" + REVIEWED_SOURCE_GIT_BLOB)
    print("accepted_source_lock_id=" + LOCK_ID)
    print("create_only=true")
    print("atomic_renameat2_noreplace=true")
    print("install_parent_descriptor_retained=true")
    print("same_mount_staging_required=true")
    print("post_publication_exact_reverification_required=true")
    print("install_receipt_external_review_required=true")
    print("root_census_execution_authorized=false")
    print("host_write=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("replacement_apply_authorized=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def apply_production(source_path: Path | None) -> None:
    # This check is deliberately first. This generation cannot read or write /opt.
    if PRODUCTION_APPLY_AUTHORIZED is not True:
        hold("protected_install_apply_not_authorized")
    if source_path is None:
        hold("protected_install_source_path_required")
    if os.geteuid() != 0 or os.getuid() != 0:
        hold("protected_install_root_required")
    raw = _read_exact_candidate(source_path)
    parent_fd, _parent = _open_production_parent()
    try:
        _publish_into_parent(
            parent_fd,
            raw,
            expected_uid=0,
            expected_gid=0,
        )
    finally:
        os.close(parent_fd)


def self_test() -> None:
    verify_inputs()
    if PRODUCTION_APPLY_AUTHORIZED is not False:
        hold("self_test_apply_authority_invalid")

    raw = _read_direct_regular(
        ROOT
        / "ops/precision/"
        "void_buy_allocation_custody_runtime_v3_"
        "protected_all_process_reference_census_v1.py",
        MAX_SOURCE_BYTES,
    )
    verify_source_bytes(raw)

    if getattr(ctypes.CDLL(None), "renameat2", None) is None:
        hold("self_test_renameat2_unavailable")

    uid = os.geteuid()
    gid = os.getegid()
    with tempfile.TemporaryDirectory(
        prefix="void-procref-install-candidate-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o755)
        parent_fd = os.open(parent, _directory_flags())
        try:
            receipt = _publish_into_parent(
                parent_fd,
                raw,
                expected_uid=uid,
                expected_gid=gid,
            )
            if receipt["published"] is not True or receipt["final_verified"] is not True:
                hold("self_test_publish_receipt_invalid")
            if not receipt["install_receipt_id"].startswith(
                "voidbuycustodyprocrefinstall1_"
            ):
                hold("self_test_install_receipt_id_invalid")

            # No-clobber regression: target already exists.
            try:
                _publish_into_parent(
                    parent_fd,
                    raw,
                    expected_uid=uid,
                    expected_gid=gid,
                )
            except InstallHold as exc:
                if "publication_name_not_absent:" + INSTALL_NAME not in str(exc):
                    raise
            else:
                hold("self_test_existing_target_accepted")
        finally:
            os.close(parent_fd)

    with tempfile.TemporaryDirectory(
        prefix="void-procref-install-postpublish-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o755)
        parent_fd = os.open(parent, _directory_flags())
        try:
            initial = _parent_record(
                parent_fd,
                expected_uid=uid,
                expected_gid=gid,
            )
            try:
                _post_publication_checks(
                    parent_fd,
                    initial,
                    raw,
                    expected_uid=uid,
                    expected_gid=gid,
                    target_name=INSTALL_NAME,
                    _fsync_fn=lambda _fd: (_ for _ in ()).throw(
                        OSError(errno.EIO, "injected")
                    ),
                )
            except PublishedInstallHold as exc:
                if exc.phase != "parent_fsync":
                    raise
            else:
                hold("self_test_postpublish_fsync_failure_not_classified")

            try:
                _post_publication_checks(
                    parent_fd,
                    initial,
                    raw,
                    expected_uid=uid,
                    expected_gid=gid,
                    target_name=INSTALL_NAME,
                    _fsync_fn=lambda _fd: None,
                    _verify_fn=lambda *args, **kwargs: (_ for _ in ()).throw(
                        InstallHold("injected_verify")
                    ),
                )
            except PublishedInstallHold as exc:
                if exc.phase != "final_verification":
                    raise
            else:
                hold("self_test_postpublish_verify_failure_not_classified")
        finally:
            os.close(parent_fd)

    with tempfile.TemporaryDirectory(
        prefix="void-procref-install-parent-drift-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o755)
        parent_fd = os.open(parent, _directory_flags())
        try:
            initial = _parent_record(
                parent_fd,
                expected_uid=uid,
                expected_gid=gid,
            )
            os.chmod(parent, 0o777)
            try:
                _revalidate_parent(
                    parent_fd,
                    initial,
                    expected_uid=uid,
                    expected_gid=gid,
                )
            except InstallHold as exc:
                if "install_parent_custody_invalid" not in str(exc):
                    raise
            else:
                hold("self_test_parent_drift_accepted")
        finally:
            os.close(parent_fd)

    with tempfile.TemporaryDirectory(
        prefix="void-procref-install-cleanup-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o755)
        parent_fd = os.open(parent, _directory_flags())
        try:
            parent_record = _parent_record(
                parent_fd,
                expected_uid=uid,
                expected_gid=gid,
            )
            os.mkdir(STAGE_NAME, 0o755, dir_fd=parent_fd)
            stage_fd = os.open(STAGE_NAME, _directory_flags(), dir_fd=parent_fd)
            try:
                _create_source_file(
                    stage_fd,
                    raw,
                    expected_uid=uid,
                    expected_gid=gid,
                )
            finally:
                os.close(stage_fd)
            if not _cleanup_stage(
                parent_fd,
                expected_uid=uid,
                expected_gid=gid,
                expected_mount_id=parent_record["mount_id"],
            ):
                hold("self_test_stage_cleanup_failed")
            try:
                os.stat(STAGE_NAME, dir_fd=parent_fd, follow_symlinks=False)
            except FileNotFoundError:
                pass
            else:
                hold("self_test_stage_cleanup_left_state")
        finally:
            os.close(parent_fd)

    print(MARKER + "_SELF_TEST_GREEN")
    print("exact_v4_source_lock_bound=true")
    print("exact_reviewed_source_bytes_bound=true")
    print("renameat2_noreplace_fixture_green=true")
    print("create_only_no_clobber_fixture_green=true")
    print("retained_parent_descriptor_fixture_green=true")
    print("parent_mount_id_revalidation_fixture_green=true")
    print("same_mount_stage_fixture_green=true")
    print("exact_single_entry_stage_fixture_green=true")
    print("source_file_mode_0444_fixture_green=true")
    print("stage_fsync_fixture_green=true")
    print("install_parent_fsync_fixture_green=true")
    print("post_publication_exact_reverification_fixture_green=true")
    print("content_addressed_install_receipt_fixture_green=true")
    print("truthful_post_publication_failure_classification=true")
    print("prepublication_stage_cleanup_fixture_green=true")
    print("install_parent_drift_rejected=true")
    print("production_apply_exposed=false")
    print("production_apply_authorized=false")
    print("root_census_execution_authorized=false")
    print("host_write=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("replacement_apply_authorized=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--source-plan", action="store_true")
    group.add_argument("--apply", action="store_true")
    parser.add_argument("--source-file", type=Path)
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if args.apply:
        apply_production(args.source_file)
        return 0
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main(_bootstrap_sys.argv[1:]))
    except (
        InstallHold,
        OSError,
        ValueError,
        TypeError,
        UnicodeError,
    ) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc)[:240])
        print(
            "publication_state="
            + ("published_needs_inspection" if isinstance(exc, PublishedInstallHold) else "not_published")
        )
        print(
            "publication_failure_phase="
            + (exc.phase if isinstance(exc, PublishedInstallHold) else "not_published")
        )
        print("production_apply_authorized=false")
        print("root_census_execution_authorized=false")
        print("host_write=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("replacement_apply_authorized=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
