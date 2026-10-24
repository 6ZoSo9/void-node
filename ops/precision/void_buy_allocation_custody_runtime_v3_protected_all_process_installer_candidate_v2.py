#!/usr/bin/env python3
# Create-only protected source installer candidate.
# CLI is intentionally non-mutating; live apply requires a later protected first-entry gate.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_CANDIDATE_V2"
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
        print("direct_apply_cli=false")
        print("protected_install_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_no_bytecode_mode_required")

import argparse
import hashlib
import importlib.machinery
import importlib.util
import json
import os
from pathlib import Path
import stat
import tempfile
from typing import Any, Callable

MARKER = _BOOTSTRAP_MARKER
SCHEMA = (
    "void_buy_void_custody_runtime_v3_"
    "protected_all_process_installer_candidate_v2"
)
VERSION = 2
ROOT = Path(__file__).resolve().parents[2]

PLAN_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_install_plan_v1.py"
)
PLAN_GIT_BLOB = "0fef4e6f76738dd474ea775985b1facdd922bb54"
PLAN_HEAD = "06395abde20620b99808f62fe0d90a3f2e05528e"

LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-reference-census-lock-v6.json"
)
LOCK_GIT_BLOB = "5ba0c8d7b1ab8e8384472bb867e0603e6986b9b1"

PREDECESSOR_INSTALLER_LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-installer-lock-v1.json"
)
PREDECESSOR_INSTALLER_LOCK_GIT_BLOB = (
    "a1e1f4887787b408d313e73360966f93a63b2b58"
)
PREDECESSOR_INSTALLER_HEAD = (
    "395249d8eab96adbdf5b15c6654326bd827aa1a0"
)
PREDECESSOR_INSTALLER_SOURCE_GIT_BLOB = (
    "9dd33f38fe4c89a5d2beacbc535380346eaea83b"
)

ACCEPTED_SOURCE_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_reference_census_v1.py"
)
ACCEPTED_SOURCE_GIT_BLOB = "33a7221cad37aec70474b97b26c2b10e2ef60f66"
ACCEPTED_SOURCE_BYTES = 74322
ACCEPTED_SOURCE_SHA256 = (
    "d5b91c7efa048eb40601d162185563a29916f1ff22a23638c7da5f330b92beba"
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
INSTALL_SOURCE = INSTALL_ROOT / SOURCE_NAME

FINAL_ROOT_MODE = 0o555
FINAL_SOURCE_MODE = 0o444
MAX_REPO_READ = 2 * 1024 * 1024
MAX_SOURCE_READ = 2 * 1024 * 1024
MAX_ENTRIES = 8

PROTECTED_FIRST_ENTRY_REQUIRED = True
DIRECT_APPLY_CLI = False


class InstallError(RuntimeError):
    pass


class StageGenerationUnknownError(InstallError):
    def __init__(
        self,
        reason: str,
        *,
        stage_name: str,
        original_failure_class: str,
        original_failure_reason: str,
    ) -> None:
        super().__init__(reason)
        self.stage_creation_succeeded = True
        self.stage_identity_bound = False
        self.possible_residual_stage = True
        self.retry_requires_operator_inspection = True
        self.stage_name = stage_name
        self.original_failure_class = original_failure_class
        self.original_failure_reason = original_failure_reason


class PublishedInstallError(InstallError):
    def __init__(
        self,
        reason: str,
        *,
        parent_fsync_completed: bool,
        final_verification_completed: bool,
        original_failure_class: str,
        original_failure_reason: str,
    ) -> None:
        super().__init__(reason)
        self.publication = True
        self.parent_fsync_completed = parent_fsync_completed
        self.final_verification_completed = final_verification_completed
        self.original_failure_class = original_failure_class
        self.original_failure_reason = original_failure_reason


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


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
        getattr(os, "O_CLOEXEC", None),
    )
    if any(type(value) is not int for value in values):
        raise InstallError("descriptor_capability_invalid")
    return os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC


def _leaf_read_flags() -> int:
    values = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
        getattr(os, "O_CLOEXEC", None),
    )
    if any(type(value) is not int for value in values):
        raise InstallError("descriptor_capability_invalid")
    return (
        os.O_RDONLY
        | os.O_NOFOLLOW
        | os.O_NONBLOCK
        | os.O_CLOEXEC
    )


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
        raise InstallError("directory_path_invalid")

    fd = os.open("/", _directory_flags())
    try:
        for component in parts[1:]:
            before = os.stat(component, dir_fd=fd, follow_symlinks=False)
            if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
                raise InstallError("directory_component_invalid:" + component)
            child = os.open(component, _directory_flags(), dir_fd=fd)
            opened = os.fstat(child)
            if _identity(before) != _identity(opened):
                os.close(child)
                raise InstallError("directory_component_rebound:" + component)
            os.close(fd)
            fd = child
        opened = os.fstat(fd)
        visible = os.stat(str(absolute), follow_symlinks=False)
        if _identity(opened) != _identity(visible):
            raise InstallError("directory_terminal_rebound")
        return fd, opened
    except BaseException:
        os.close(fd)
        raise


def _read_bound_regular(path: Path, maximum: int) -> bytes:
    if maximum < 1 or maximum > 4 * 1024 * 1024:
        raise InstallError("read_limit_invalid")
    absolute = Path(os.path.abspath(os.fspath(path)))
    parent_fd, _ = _open_bound_directory(absolute.parent)
    fd = -1
    try:
        before = os.stat(
            absolute.name,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        if (
            not stat.S_ISREG(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_nlink != 1
            or before.st_size < 1
            or before.st_size > maximum
        ):
            raise InstallError("source_file_shape_invalid:" + absolute.name)
        fd = os.open(
            absolute.name,
            _leaf_read_flags(),
            dir_fd=parent_fd,
        )
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            raise InstallError("source_file_rebound:" + absolute.name)

        raw = bytearray()
        while len(raw) <= maximum:
            chunk = os.read(fd, min(65536, maximum + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            raise InstallError("source_file_read_limit:" + absolute.name)

        after = os.fstat(fd)
        visible = os.stat(
            absolute.name,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            raise InstallError("source_file_generation_changed:" + absolute.name)
        return bytes(raw)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)


def verify_repository_inputs() -> bytes:
    plan_raw = _read_bound_regular(ROOT / PLAN_REL, MAX_REPO_READ)
    if git_blob(plan_raw) != PLAN_GIT_BLOB:
        raise InstallError("install_plan_blob_mismatch")

    lock_raw = _read_bound_regular(ROOT / LOCK_REL, MAX_REPO_READ)
    if git_blob(lock_raw) != LOCK_GIT_BLOB:
        raise InstallError("accepted_lock_blob_mismatch")

    predecessor_raw = _read_bound_regular(
        ROOT / PREDECESSOR_INSTALLER_LOCK_REL,
        MAX_REPO_READ,
    )
    if git_blob(predecessor_raw) != PREDECESSOR_INSTALLER_LOCK_GIT_BLOB:
        raise InstallError("predecessor_installer_lock_blob_mismatch")
    try:
        predecessor = json.loads(predecessor_raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InstallError("predecessor_installer_lock_json_invalid") from exc
    if (
        type(predecessor) is not dict
        or predecessor.get("schema")
        != "void_buy_void_custody_runtime_v3_protected_all_process_installer_lock_v1"
        or predecessor.get("marker")
        != "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V1"
        or predecessor.get("parent_installer_head") != PREDECESSOR_INSTALLER_HEAD
        or predecessor.get("candidate_installer_source_accepted") is not True
        or predecessor.get("installer_candidate_evidence", {}).get(
            "source_git_blob_sha1"
        )
        != PREDECESSOR_INSTALLER_SOURCE_GIT_BLOB
        or predecessor.get("protected_install_authorized") is not False
        or predecessor.get("protected_source_installed") is not False
        or predecessor.get("replacement_apply_authorized") is not False
        or predecessor.get("payment_acceptance") is not False
        or predecessor.get("public_presale_activation") is not False
        or predecessor.get("funds_movement") is not False
    ):
        raise InstallError("predecessor_installer_lock_identity_invalid")

    source_raw = _read_bound_regular(ROOT / ACCEPTED_SOURCE_REL, MAX_SOURCE_READ)
    if (
        git_blob(source_raw) != ACCEPTED_SOURCE_GIT_BLOB
        or len(source_raw) != ACCEPTED_SOURCE_BYTES
        or sha256(source_raw) != ACCEPTED_SOURCE_SHA256
    ):
        raise InstallError("accepted_source_identity_mismatch")
    return source_raw


def _exists_at(dir_fd: int, name: str) -> bool:
    try:
        os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
        return True
    except FileNotFoundError:
        return False


def _trusted_parent(st: os.stat_result, *, require_root: bool) -> None:
    if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
        raise InstallError("install_parent_shape_invalid")
    if stat.S_IMODE(st.st_mode) & 0o022:
        raise InstallError("install_parent_writable_by_nonowner")
    if require_root and (st.st_uid != 0 or st.st_gid != 0):
        raise InstallError("install_parent_not_root_owned")


def _write_all(fd: int, raw: bytes) -> None:
    view = memoryview(raw)
    offset = 0
    while offset < len(view):
        wrote = os.write(fd, view[offset:])
        if wrote <= 0:
            raise InstallError("short_write")
        offset += wrote


def _read_exact_fd(fd: int, expected_bytes: int) -> bytes:
    raw = bytearray()
    while len(raw) < expected_bytes:
        chunk = os.read(fd, min(65536, expected_bytes - len(raw)))
        if not chunk:
            raise InstallError("short_read")
        raw.extend(chunk)
    if os.read(fd, 1):
        raise InstallError("unexpected_trailing_bytes")
    return bytes(raw)


def _file_ok(
    dir_fd: int,
    name: str,
    expected_raw: bytes,
    *,
    expected_uid: int,
    expected_gid: int,
    expected_mode: int,
) -> None:
    before = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != expected_uid
        or before.st_gid != expected_gid
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_nlink != 1
        or before.st_size != len(expected_raw)
    ):
        raise InstallError("installed_source_metadata_invalid")

    fd = os.open(
        name,
        _leaf_read_flags(),
        dir_fd=dir_fd,
    )
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            raise InstallError("installed_source_rebound")
        raw = _read_exact_fd(fd, len(expected_raw))
        after = os.fstat(fd)
        visible = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            raise InstallError("installed_source_generation_changed")
    finally:
        os.close(fd)

    if raw != expected_raw or sha256(raw) != sha256(expected_raw):
        raise InstallError("installed_source_bytes_invalid")


def _verify_root(
    parent_fd: int,
    name: str,
    source_name: str,
    expected_raw: bytes,
    *,
    expected_uid: int,
    expected_gid: int,
) -> os.stat_result:
    before = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    if (
        not stat.S_ISDIR(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != expected_uid
        or before.st_gid != expected_gid
        or stat.S_IMODE(before.st_mode) != FINAL_ROOT_MODE
    ):
        raise InstallError("installed_root_metadata_invalid")

    fd = os.open(name, _directory_flags(), dir_fd=parent_fd)
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            raise InstallError("installed_root_rebound")

        names = sorted(os.listdir(fd))
        if len(names) > MAX_ENTRIES or names != [source_name]:
            raise InstallError("installed_root_entries_invalid")

        _file_ok(
            fd,
            source_name,
            expected_raw,
            expected_uid=expected_uid,
            expected_gid=expected_gid,
            expected_mode=FINAL_SOURCE_MODE,
        )

        terminal = os.fstat(fd)
        visible = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        if (
            _generation(opened) != _generation(terminal)
            or _generation(terminal) != _generation(visible)
        ):
            raise InstallError("installed_root_generation_changed")
        return terminal
    finally:
        os.close(fd)


def _validate_voidfs_module(module: Any) -> Callable[[int, str, str], None]:
    spec = getattr(module, "__spec__", None)
    if (
        spec is None
        or getattr(spec, "origin", None) != "built-in"
        or getattr(spec, "loader", None) is not importlib.machinery.BuiltinImporter
        or getattr(module, "__loader__", None)
        is not importlib.machinery.BuiltinImporter
    ):
        raise InstallError("voidfs_module_not_builtin")
    public = sorted(
        name for name in dir(module)
        if not name.startswith("__")
    )
    if public != ["rename_noreplace"]:
        raise InstallError("voidfs_public_surface_invalid")
    operation = getattr(module, "rename_noreplace", None)
    if not callable(operation):
        raise InstallError("voidfs_rename_noreplace_missing")
    return operation


def _require_builtin_voidfs() -> Callable[[int, str, str], None]:
    if "_voidfs" in _bootstrap_sys.modules:
        raise InstallError("voidfs_preloaded_module_forbidden")
    if "_voidfs" not in _bootstrap_sys.builtin_module_names:
        raise InstallError("voidfs_builtin_module_required")

    spec = importlib.machinery.BuiltinImporter.find_spec("_voidfs")
    if (
        spec is None
        or spec.loader is not importlib.machinery.BuiltinImporter
        or spec.origin != "built-in"
    ):
        raise InstallError("voidfs_builtin_spec_invalid")

    try:
        module = importlib.util.module_from_spec(spec)
        if "_voidfs" in _bootstrap_sys.modules:
            raise InstallError("voidfs_import_cache_side_effect_forbidden")
        spec.loader.exec_module(module)
        if "_voidfs" in _bootstrap_sys.modules:
            raise InstallError("voidfs_import_cache_side_effect_forbidden")
    except InstallError:
        raise
    except Exception as exc:
        raise InstallError("voidfs_builtin_import_failed") from exc

    return _validate_voidfs_module(module)


def _bridge_errno(exc: OSError) -> int:
    value = exc.errno
    if not isinstance(value, int) or value <= 0:
        raise InstallError("rename_noreplace_failed_errno_invalid") from exc
    return value


def _voidfs_rename_noreplace(
    dir_fd: int,
    source: str,
    target: str,
) -> None:
    operation = _require_builtin_voidfs()
    try:
        operation(dir_fd, source, target)
    except OSError as exc:
        raise InstallError(
            "rename_noreplace_failed:" + str(_bridge_errno(exc))
        ) from exc
    except Exception as exc:
        raise InstallError(
            "rename_noreplace_bridge_contract_failure:"
            + type(exc).__name__
        ) from exc

def _stat_nofollow_at(dir_fd: int, name: str) -> os.stat_result:
    return os.stat(name, dir_fd=dir_fd, follow_symlinks=False)


def _cleanup_stage(
    parent_fd: int,
    *,
    stage_name: str,
    source_name: str,
    stage_identity: tuple[int, int] | None,
) -> bool:
    if stage_identity is None:
        return False
    try:
        visible = os.stat(stage_name, dir_fd=parent_fd, follow_symlinks=False)
    except FileNotFoundError:
        return True
    if (visible.st_dev, visible.st_ino) != stage_identity:
        return False
    try:
        stage_fd = os.open(stage_name, _directory_flags(), dir_fd=parent_fd)
    except OSError:
        return False
    try:
        opened = os.fstat(stage_fd)
        if (opened.st_dev, opened.st_ino) != stage_identity:
            return False
        names = sorted(os.listdir(stage_fd))
        if names not in ([], [source_name]):
            return False
        os.fchmod(stage_fd, 0o700)
        if names == [source_name]:
            entry = os.stat(
                source_name,
                dir_fd=stage_fd,
                follow_symlinks=False,
            )
            if not stat.S_ISREG(entry.st_mode) or stat.S_ISLNK(entry.st_mode):
                return False
            os.unlink(source_name, dir_fd=stage_fd)
    finally:
        os.close(stage_fd)
    os.rmdir(stage_name, dir_fd=parent_fd)
    return True


def _apply_create_only_internal(
    *,
    parent: Path,
    install_name: str,
    stage_name: str,
    source_name: str,
    source_raw: bytes,
    expected_uid: int,
    expected_gid: int,
    require_root_parent: bool,
    parent_fsync_fn: Callable[[int], None] = os.fsync,
    rename_fn: Callable[[int, str, str], None] = _voidfs_rename_noreplace,
    stage_initial_stat_fn: Callable[[int, str], os.stat_result] = _stat_nofollow_at,
) -> dict[str, Any]:
    if (
        not isinstance(source_raw, bytes)
        or len(source_raw) < 1
        or len(source_raw) > MAX_SOURCE_READ
    ):
        raise InstallError("candidate_source_bytes_invalid")
    if any(
        not isinstance(name, str)
        or not name
        or "/" in name
        or "\x00" in name
        or name in (".", "..")
        for name in (install_name, stage_name, source_name)
    ):
        raise InstallError("install_component_invalid")

    parent_fd, parent_st = _open_bound_directory(parent)
    stage_identity: tuple[int, int] | None = None
    stage_created = False
    published = False
    parent_fsync_completed = False
    final_verification_completed = False

    try:
        _trusted_parent(parent_st, require_root=require_root_parent)
        if _exists_at(parent_fd, install_name):
            raise InstallError("destination_root_present")
        if _exists_at(parent_fd, stage_name):
            raise InstallError("staging_root_present")

        os.mkdir(stage_name, 0o700, dir_fd=parent_fd)
        stage_created = True
        stage_visible_initial = stage_initial_stat_fn(parent_fd, stage_name)
        stage_identity = (
            stage_visible_initial.st_dev,
            stage_visible_initial.st_ino,
        )
        if (
            not stat.S_ISDIR(stage_visible_initial.st_mode)
            or stat.S_ISLNK(stage_visible_initial.st_mode)
        ):
            raise InstallError("stage_initial_shape_invalid")
        stage_fd = os.open(stage_name, _directory_flags(), dir_fd=parent_fd)
        try:
            stage_st = os.fstat(stage_fd)
            if (
                (stage_st.st_dev, stage_st.st_ino) != stage_identity
                or _identity(stage_visible_initial) != _identity(stage_st)
            ):
                raise InstallError("stage_initial_rebound")
            if stage_st.st_dev != parent_st.st_dev:
                raise InstallError("stage_cross_filesystem")
            if (
                stage_st.st_uid != expected_uid
                or stage_st.st_gid != expected_gid
                or stat.S_IMODE(stage_st.st_mode) != 0o700
            ):
                raise InstallError("stage_initial_metadata_invalid")

            file_fd = os.open(
                source_name,
                os.O_WRONLY
                | os.O_CREAT
                | os.O_EXCL
                | os.O_NOFOLLOW
                | os.O_CLOEXEC,
                0o600,
                dir_fd=stage_fd,
            )
            try:
                file_st = os.fstat(file_fd)
                if (
                    file_st.st_uid != expected_uid
                    or file_st.st_gid != expected_gid
                    or not stat.S_ISREG(file_st.st_mode)
                    or file_st.st_nlink != 1
                ):
                    raise InstallError("stage_source_initial_metadata_invalid")
                _write_all(file_fd, source_raw)
                os.fsync(file_fd)
                os.fchmod(file_fd, FINAL_SOURCE_MODE)
                os.fsync(file_fd)
            finally:
                os.close(file_fd)

            _file_ok(
                stage_fd,
                source_name,
                source_raw,
                expected_uid=expected_uid,
                expected_gid=expected_gid,
                expected_mode=FINAL_SOURCE_MODE,
            )
            os.fchmod(stage_fd, FINAL_ROOT_MODE)
            os.fsync(stage_fd)
            final_stage = os.fstat(stage_fd)
            if (
                final_stage.st_uid != expected_uid
                or final_stage.st_gid != expected_gid
                or stat.S_IMODE(final_stage.st_mode) != FINAL_ROOT_MODE
            ):
                raise InstallError("stage_final_metadata_invalid")
        finally:
            os.close(stage_fd)

        stage_visible = os.stat(
            stage_name,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        if (
            stage_identity is None
            or (stage_visible.st_dev, stage_visible.st_ino) != stage_identity
            or stat.S_IMODE(stage_visible.st_mode) != FINAL_ROOT_MODE
        ):
            raise InstallError("stage_visible_generation_invalid")

        rename_fn(parent_fd, stage_name, install_name)
        published = True

        try:
            parent_fsync_fn(parent_fd)
            parent_fsync_completed = True
            _verify_root(
                parent_fd,
                install_name,
                source_name,
                source_raw,
                expected_uid=expected_uid,
                expected_gid=expected_gid,
            )
            final_verification_completed = True
        except BaseException as exc:
            raise PublishedInstallError(
                "published_install_needs_inspection",
                parent_fsync_completed=parent_fsync_completed,
                final_verification_completed=final_verification_completed,
                original_failure_class=type(exc).__name__,
                original_failure_reason=str(exc)[:300],
            ) from exc

        return {
            "publication": True,
            "publication_state": "published_verified",
            "parent_fsync_completed": True,
            "final_verification_completed": True,
            "create_only": True,
            "rename_noreplace_used": True,
            "fixture_or_internal_publication": True,
            "protected_source_installed": False,
            "live_privileged_census_executed": False,
            "replacement_apply_authorized": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "funds_movement": False,
        }
    except PublishedInstallError:
        raise
    except StageGenerationUnknownError:
        raise
    except BaseException as exc:
        if not published and stage_created and stage_identity is None:
            raise StageGenerationUnknownError(
                "prepublication_stage_generation_unknown",
                stage_name=stage_name,
                original_failure_class=type(exc).__name__,
                original_failure_reason=str(exc)[:300],
            ) from exc
        if not published and stage_identity is not None:
            try:
                cleanup_green = _cleanup_stage(
                    parent_fd,
                    stage_name=stage_name,
                    source_name=source_name,
                    stage_identity=stage_identity,
                )
            except BaseException as cleanup_exc:
                raise InstallError(
                    "prepublication_failure_stage_cleanup_error:"
                    + type(cleanup_exc).__name__
                ) from exc
            if not cleanup_green:
                raise InstallError(
                    "prepublication_failure_stage_cleanup_incomplete:"
                    + type(exc).__name__
                ) from exc
        raise
    finally:
        os.close(parent_fd)


def install_accepted_source_create_only_after_protected_first_entry() -> dict[str, Any]:
    if os.getuid() != 0 or os.geteuid() != 0 or os.getgid() != 0 or os.getegid() != 0:
        raise InstallError("protected_install_root_identity_required")

    accepted = verify_repository_inputs()
    if (
        len(accepted) != ACCEPTED_SOURCE_BYTES
        or sha256(accepted) != ACCEPTED_SOURCE_SHA256
        or git_blob(accepted) != ACCEPTED_SOURCE_GIT_BLOB
    ):
        raise InstallError("fixed_entrypoint_accepted_source_mismatch")

    result = _apply_create_only_internal(
        parent=INSTALL_PARENT,
        install_name=INSTALL_NAME,
        stage_name=STAGE_NAME,
        source_name=SOURCE_NAME,
        source_raw=accepted,
        expected_uid=0,
        expected_gid=0,
        require_root_parent=True,
    )
    if (
        result.get("publication") is not True
        or result.get("publication_state") != "published_verified"
        or result.get("protected_source_installed") is not False
    ):
        raise InstallError("fixed_entrypoint_internal_receipt_invalid")

    return {
        **result,
        "fixture_or_internal_publication": False,
        "protected_source_installed": True,
        "fixed_destination_bound": True,
        "accepted_source_identity_bound": True,
        "root_identity_bound": True,
        "protected_first_entry_precondition_required": True,
        "live_privileged_census_executed": False,
        "replacement_apply_authorized": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
    }


def source_plan() -> dict[str, Any]:
    source_raw = verify_repository_inputs()
    return {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "plan_head": PLAN_HEAD,
        "plan_source_git_blob_sha1": PLAN_GIT_BLOB,
        "accepted_lock_git_blob_sha1": LOCK_GIT_BLOB,
        "predecessor_installer_lock": {
            "path": PREDECESSOR_INSTALLER_LOCK_REL,
            "git_blob_sha1": PREDECESSOR_INSTALLER_LOCK_GIT_BLOB,
            "parent_installer_head": PREDECESSOR_INSTALLER_HEAD,
            "accepted_installer_source_git_blob_sha1": (
                PREDECESSOR_INSTALLER_SOURCE_GIT_BLOB
            ),
        },
        "accepted_source": {
            "path": ACCEPTED_SOURCE_REL,
            "git_blob_sha1": ACCEPTED_SOURCE_GIT_BLOB,
            "bytes": len(source_raw),
            "sha256": sha256(source_raw),
        },
        "fixed_destination": {
            "install_root": str(INSTALL_ROOT),
            "install_source": str(INSTALL_SOURCE),
            "stage_root": str(STAGE_ROOT),
            "root_mode": format(FINAL_ROOT_MODE, "04o"),
            "source_mode": format(FINAL_SOURCE_MODE, "04o"),
        },
        "candidate_contract": {
            "installer_algorithm_implemented": True,
            "fixed_install_entrypoint": (
                "install_accepted_source_create_only_after_protected_first_entry"
            ),
            "parameterized_internal_receipt_never_claims_protected_install": True,
            "direct_apply_cli": False,
            "protected_first_entry_required": True,
            "create_only": True,
            "kernel_rename_noreplace_required": True,
            "builtin_voidfs_required": True,
            "voidfs_origin_required": "built-in",
            "voidfs_public_surface_exact": ["rename_noreplace"],
            "ctypes_forbidden": True,
            "dynamic_symbol_lookup_forbidden": True,
            "libc_symbol_lookup_fallback": False,
            "same_parent_fd_publication_required": True,
            "destination_absent_required": True,
            "stage_absent_required": True,
            "same_filesystem_stage_required": True,
            "source_fsync_required": True,
            "stage_directory_fsync_required": True,
            "install_parent_fsync_required": True,
            "exact_post_publication_verification_required": True,
            "truthful_post_publication_failure_receipt_required": True,
            "stage_generation_unknown_hold_required": True,
            "retry_after_unknown_stage_requires_operator_inspection": True,
            "host_namespace_lease_provenance_still_required": True,
            "live_at_use_reverification_required": True,
        },
        "authority": {
            "source_candidate_only": True,
            "protected_installer_first_entry_installed": False,
            "protected_installer_first_entry_verified": False,
            "protected_install_authorized": False,
            "protected_source_installed": False,
            "live_privileged_census_authorized": False,
            "live_privileged_census_executed": False,
            "service_mutation": False,
            "systemd_mutation": False,
            "existing_target_replaced": False,
            "replacement_apply_authorized": False,
            "runtime_integration": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "production_gate_ready": False,
            "funds_movement": False,
        },
        "next_gate": "ACCEPT_EXACT_INSTALLER_SOURCE_AND_PROTECT_FIRST_ENTRY",
    }


def _fixture_rename_noreplace(
    dir_fd: int,
    source: str,
    target: str,
) -> None:
    if _exists_at(dir_fd, target):
        raise InstallError("fixture_destination_present")
    os.rename(
        source,
        target,
        src_dir_fd=dir_fd,
        dst_dir_fd=dir_fd,
    )


class _FixtureBuiltinSpec:
    origin = "built-in"
    loader = importlib.machinery.BuiltinImporter


class _FixtureVoidfs:
    __spec__ = _FixtureBuiltinSpec()
    __loader__ = importlib.machinery.BuiltinImporter

    @staticmethod
    def rename_noreplace(
        _parent_fd: int,
        _old_leaf: str,
        _new_leaf: str,
    ) -> None:
        return None


class _FixtureBadOriginVoidfs(_FixtureVoidfs):
    __spec__ = type(
        "_BadSpec",
        (),
        {
            "origin": "file",
            "loader": importlib.machinery.BuiltinImporter,
        },
    )()


class _FixtureBadLoaderVoidfs(_FixtureVoidfs):
    __spec__ = type(
        "_BadLoaderSpec",
        (),
        {"origin": "built-in", "loader": object()},
    )()
    __loader__ = object()


class _FixtureExpandedVoidfs(_FixtureVoidfs):
    unexpected = True


def self_test() -> None:
    accepted = verify_repository_inputs()
    if _validate_voidfs_module(_FixtureVoidfs()) is not _FixtureVoidfs.rename_noreplace:
        raise InstallError("self_test_voidfs_contract_validator_invalid")
    for bad in (
        _FixtureBadOriginVoidfs(),
        _FixtureBadLoaderVoidfs(),
        _FixtureExpandedVoidfs(),
    ):
        try:
            _validate_voidfs_module(bad)
        except InstallError:
            pass
        else:
            raise InstallError("self_test_voidfs_bad_contract_accepted")

    cache_sentinel = object()
    prior_voidfs = _bootstrap_sys.modules.get("_voidfs", cache_sentinel)
    _bootstrap_sys.modules["_voidfs"] = _FixtureVoidfs()
    try:
        try:
            _require_builtin_voidfs()
        except InstallError as exc:
            if "voidfs_preloaded_module_forbidden" not in str(exc):
                raise
        else:
            raise InstallError("self_test_voidfs_preloaded_shadow_accepted")
    finally:
        if prior_voidfs is cache_sentinel:
            _bootstrap_sys.modules.pop("_voidfs", None)
        else:
            _bootstrap_sys.modules["_voidfs"] = prior_voidfs

    self_source = Path(__file__).read_text(encoding="utf-8")
    production_bridge = self_source.split(
        "def _voidfs_rename_noreplace(", 1
    )[1].split("def _stat_nofollow_at", 1)[0]
    if "os.rename(" in production_bridge or "_fixture_rename_noreplace" in production_bridge:
        raise InstallError("self_test_production_voidfs_fallback_present")

    fixed_entry = self_source.split(
        "def install_accepted_source_create_only_after_protected_first_entry()", 1
    )[1].split("def source_plan()", 1)[0]
    if "rename_fn=" in fixed_entry or "_fixture_rename_noreplace" in fixed_entry:
        raise InstallError("self_test_fixed_entrypoint_bridge_override_present")

    with tempfile.TemporaryDirectory(
        prefix="void-custody-procref-installer-candidate-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o755)
        uid = os.geteuid()
        gid = os.getegid()

        result = _apply_create_only_internal(
            parent=parent,
            install_name=INSTALL_NAME,
            stage_name=STAGE_NAME,
            source_name=SOURCE_NAME,
            source_raw=accepted,
            expected_uid=uid,
            expected_gid=gid,
            require_root_parent=False,
            rename_fn=_fixture_rename_noreplace,
        )
        if (
            result["publication"] is not True
            or result["publication_state"] != "published_verified"
            or result["fixture_or_internal_publication"] is not True
            or result["protected_source_installed"] is not False
            or result["live_privileged_census_executed"] is not False
        ):
            raise InstallError("self_test_success_receipt_invalid")

        parent_fd, _ = _open_bound_directory(parent)
        try:
            _verify_root(
                parent_fd,
                INSTALL_NAME,
                SOURCE_NAME,
                accepted,
                expected_uid=uid,
                expected_gid=gid,
            )
        finally:
            os.close(parent_fd)

    with tempfile.TemporaryDirectory(
        prefix="void-custody-procref-installer-wrong-payload-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o755)
        altered = accepted + b"\n# altered fixture\n"
        result = _apply_create_only_internal(
            parent=parent,
            install_name=INSTALL_NAME,
            stage_name=STAGE_NAME,
            source_name=SOURCE_NAME,
            source_raw=altered,
            expected_uid=os.geteuid(),
            expected_gid=os.getegid(),
            require_root_parent=False,
            rename_fn=_fixture_rename_noreplace,
        )
        if result["protected_source_installed"] is not False:
            raise InstallError("self_test_wrong_payload_claimed_protected_install")

    with tempfile.TemporaryDirectory(
        prefix="void-custody-procref-installer-wrong-destination-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o755)
        result = _apply_create_only_internal(
            parent=parent,
            install_name="neighboring-procref-root",
            stage_name=".neighboring-procref-stage",
            source_name="neighboring.py",
            source_raw=accepted,
            expected_uid=os.geteuid(),
            expected_gid=os.getegid(),
            require_root_parent=False,
            rename_fn=_fixture_rename_noreplace,
        )
        if result["protected_source_installed"] is not False:
            raise InstallError(
                "self_test_wrong_destination_claimed_protected_install"
            )

    with tempfile.TemporaryDirectory(
        prefix="void-custody-procref-installer-collision-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o755)
        (parent / INSTALL_NAME).mkdir(mode=0o755)
        try:
            _apply_create_only_internal(
                parent=parent,
                install_name=INSTALL_NAME,
                stage_name=STAGE_NAME,
                source_name=SOURCE_NAME,
                source_raw=accepted,
                expected_uid=os.geteuid(),
                expected_gid=os.getegid(),
                require_root_parent=False,
            )
        except InstallError as exc:
            if "destination_root_present" not in str(exc):
                raise
        else:
            raise InstallError("self_test_existing_destination_accepted")
        if (parent / STAGE_NAME).exists():
            raise InstallError("self_test_collision_created_stage")

    with tempfile.TemporaryDirectory(
        prefix="void-custody-procref-installer-stage-generation-unknown-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o755)

        def fail_initial_stage_stat(_fd: int, _name: str) -> os.stat_result:
            raise OSError("injected_first_post_mkdir_identity_failure")

        try:
            _apply_create_only_internal(
                parent=parent,
                install_name=INSTALL_NAME,
                stage_name=STAGE_NAME,
                source_name=SOURCE_NAME,
                source_raw=accepted,
                expected_uid=os.geteuid(),
                expected_gid=os.getegid(),
                require_root_parent=False,
                stage_initial_stat_fn=fail_initial_stage_stat,
            )
        except StageGenerationUnknownError as exc:
            if (
                exc.stage_creation_succeeded is not True
                or exc.stage_identity_bound is not False
                or exc.possible_residual_stage is not True
                or exc.retry_requires_operator_inspection is not True
                or exc.stage_name != STAGE_NAME
                or "injected_first_post_mkdir_identity_failure"
                not in exc.original_failure_reason
            ):
                raise InstallError(
                    "self_test_stage_generation_unknown_receipt_invalid"
                )
        else:
            raise InstallError(
                "self_test_stage_generation_unknown_not_raised"
            )
        if not (parent / STAGE_NAME).is_dir():
            raise InstallError(
                "self_test_unknown_generation_stage_not_preserved"
            )
        if (parent / INSTALL_NAME).exists():
            raise InstallError(
                "self_test_unknown_generation_target_created"
            )

    with tempfile.TemporaryDirectory(
        prefix="void-custody-procref-installer-prepublish-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o755)

        def fail_rename(_fd: int, _source: str, _target: str) -> None:
            raise InstallError("injected_rename_failure")

        try:
            _apply_create_only_internal(
                parent=parent,
                install_name=INSTALL_NAME,
                stage_name=STAGE_NAME,
                source_name=SOURCE_NAME,
                source_raw=accepted,
                expected_uid=os.geteuid(),
                expected_gid=os.getegid(),
                require_root_parent=False,
                rename_fn=fail_rename,
            )
        except InstallError as exc:
            if "injected_rename_failure" not in str(exc):
                raise
        else:
            raise InstallError("self_test_rename_failure_not_raised")
        if (parent / STAGE_NAME).exists():
            raise InstallError("self_test_prepublication_stage_not_cleaned")
        if (parent / INSTALL_NAME).exists():
            raise InstallError("self_test_prepublication_target_created")

    with tempfile.TemporaryDirectory(
        prefix="void-custody-procref-installer-postpublish-"
    ) as tmp:
        parent = Path(tmp) / "opt"
        parent.mkdir(mode=0o755)

        def fail_parent_fsync(_fd: int) -> None:
            raise OSError("injected_parent_fsync_failure")

        try:
            _apply_create_only_internal(
                parent=parent,
                install_name=INSTALL_NAME,
                stage_name=STAGE_NAME,
                source_name=SOURCE_NAME,
                source_raw=accepted,
                expected_uid=os.geteuid(),
                expected_gid=os.getegid(),
                require_root_parent=False,
                parent_fsync_fn=fail_parent_fsync,
                rename_fn=_fixture_rename_noreplace,
            )
        except PublishedInstallError as exc:
            if (
                exc.publication is not True
                or exc.parent_fsync_completed is not False
                or exc.final_verification_completed is not False
                or "injected_parent_fsync_failure"
                not in exc.original_failure_reason
            ):
                raise InstallError("self_test_published_failure_receipt_invalid")
        else:
            raise InstallError("self_test_postpublication_failure_not_raised")
        if not (parent / INSTALL_NAME).is_dir():
            raise InstallError("self_test_published_root_deleted_after_failure")

    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_plan_exact=true")
    print("accepted_lock_exact=true")
    print("predecessor_installer_lock_exact=true")
    print("accepted_source_exact=true")
    print("installer_algorithm_implemented=true")
    print("fixed_least_authority_install_entrypoint=true")
    print("parameterized_internal_receipt_never_claims_protected_install=true")
    print("wrong_payload_cannot_claim_protected_install=true")
    print("wrong_destination_cannot_claim_protected_install=true")
    print("direct_apply_cli=false")
    print("protected_first_entry_required=true")
    print("create_only=true")
    print("destination_collision_rejected=true")
    print("bound_stage_cleanup_before_publication=true")
    print("stage_identity_bound_on_first_successful_post_create_read=true")
    print("stage_generation_unknown_hold=true")
    print("possible_residual_stage_reported=true")
    print("retry_after_unknown_stage_requires_operator_inspection=true")
    print("cleanup_failure_explicit_hold=true")
    print("forced_rename_failure_cleanup_proven=true")
    print("kernel_rename_noreplace_required=true")
    print("builtin_voidfs_required=true")
    print("voidfs_contract_validator_tested=true")
    print("voidfs_builtin_loader_verified=true")
    print("voidfs_preloaded_cache_rejected=true")
    print("ctypes_forbidden=true")
    print("dynamic_symbol_lookup_forbidden=true")
    print("libc_symbol_lookup_fallback=false")
    print("same_parent_fd_publication_required=true")
    print("production_voidfs_bridge_no_os_rename_fallback=true")
    print("fixed_entrypoint_no_bridge_override=true")
    print("source_fsync_required=true")
    print("stage_directory_fsync_required=true")
    print("install_parent_fsync_required=true")
    print("exact_post_publication_verification_required=true")
    print("truthful_post_publication_failure_receipt=true")
    print("postpublication_failure_preserves_final_root=true")
    print("hosted_postpublication_fixture_bridge_explicit=true")
    print("protected_install_authorized=false")
    print("live_privileged_census_authorized=false")
    print("replacement_apply_authorized=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--source-plan", action="store_true")
    group.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        print(json.dumps(source_plan(), sort_keys=True, separators=(",", ":")))
        return 0
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main(_bootstrap_sys.argv[1:]))
    except (InstallError, OSError, ValueError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("direct_apply_cli=false")
        print("protected_first_entry_required=true")
        print("protected_install_authorized=false")
        print("protected_source_installed=false")
        print("live_privileged_census_authorized=false")
        print("replacement_apply_authorized=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
