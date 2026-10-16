#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
import pathlib
import re
import stat
import subprocess
import sys
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]

LOCK_REL = "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v2.json"
LOCK_GIT_BLOB_SHA1 = "9e9661ded53116e2c3312108294a2675b6a6f900"
LOCK_ID = (
    "voidbuye2dormantbinderlock2_"
    "34df85425460aa9fc5192cee326de4b711deefbcb195dc6b7b6c3ebd23eb5597"
)

BINDER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
)
BINDER_GIT_BLOB_SHA1 = "9c29eb4716077e459b9154f39d0f30cf2e56729f"
BINDER_BYTES = 39_391
BINDER_SHA256 = (
    "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e"
)

NATIVE_BYTES = 726_976
NATIVE_SHA256 = (
    "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
)
CANDIDATE_ID = (
    "voidbuye2dormantbindercand2_"
    "342712bbfdc6c999ca3c4bb132b02531df94356ffd1e5bb0b21d40c8f82d33ce"
)

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V1"
INSTALL_PARENT = pathlib.Path("/opt")
INSTALL_NAME = "void-buy-void-epoch2-dormant-v3r-binding-v2"
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
STAGE_NAME = ".void-buy-void-epoch2-dormant-v3r-binding-v2.stage"
STAGE_ROOT = INSTALL_PARENT / STAGE_NAME

NATIVE_NAME = "void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2"
BINDER_NAME = "void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
NATIVE_TARGET = INSTALL_ROOT / NATIVE_NAME
BINDER_TARGET = INSTALL_ROOT / BINDER_NAME

CONFIRM_TOKEN = "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V2_CREATE_ONLY"
RENAME_NOREPLACE = 1
MAX_READ_CHUNK = 1024 * 1024
READY_STATE = "DORMANT_BINDER_ROOT_ABSENT_READY_FOR_CREATE_ONLY"
GREEN_STATE = "DORMANT_BINDER_NATIVE_PAIR_GREEN"
HEX40 = re.compile(r"^[0-9a-f]{40}$")

FIXED_GIT = pathlib.Path("/usr/bin/git")
FIXED_SETPRIV = pathlib.Path("/usr/bin/setpriv")
RUNTIME_UID = 1000
RUNTIME_GID = 1000
FIXED_CHECKOUT = pathlib.Path("/home/zoso/dev/void-node")

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


class PublishedInstallError(InstallError):
    def __init__(
        self,
        reason: str,
        *,
        phase: str,
        parent_fsync_completed: bool | None,
        final_verification_completed: bool | None,
        original_failure_class: str,
        original_failure_reason: str,
    ) -> None:
        super().__init__(reason)
        self.phase = phase
        self.parent_fsync_completed = parent_fsync_completed
        self.final_verification_completed = final_verification_completed
        self.original_failure_class = original_failure_class
        self.original_failure_reason = original_failure_reason
        self.install_parent_close_completed: bool | None = None
        self.close_failure_class = "none"
        self.close_failure_reason = "none"


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


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


def _normalized_absolute(path: pathlib.Path) -> pathlib.Path:
    raw = str(path)
    if not path.is_absolute() or os.path.normpath(raw) != raw:
        raise InstallError("candidate_path_must_be_normalized_absolute")
    return path


def _trusted_root_directory(
    path: pathlib.Path, *, exact_mode: int | None = None
) -> None:
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


def _trusted_executable(path: pathlib.Path) -> None:
    real = pathlib.Path(os.path.realpath(path))
    _trusted_root_directory(pathlib.Path("/"))
    parent = pathlib.Path(real.anchor)
    for part in real.parent.parts[1:]:
        parent = parent / part
        _trusted_root_directory(parent)
    st = real.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or (st.st_mode & 0o022) != 0
        or (st.st_mode & 0o111) == 0
    ):
        raise InstallError("trusted_executable_invalid:" + str(path))


def _git_env() -> dict[str, str]:
    return {
        "PATH": "/usr/bin:/bin",
        "HOME": "/home/zoso",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
    }


def _git(args: list[str]) -> bytes:
    _trusted_executable(FIXED_GIT)
    _trusted_executable(FIXED_SETPRIV)
    command = [
        str(FIXED_SETPRIV),
        "--no-new-privs",
        "--reuid=" + str(RUNTIME_UID),
        "--regid=" + str(RUNTIME_GID),
        "--clear-groups",
        str(FIXED_GIT),
        "-C",
        str(FIXED_CHECKOUT),
        "-c",
        "core.fsmonitor=false",
        "-c",
        "core.hooksPath=/dev/null",
        *args,
    ]
    try:
        cp = subprocess.run(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=_git_env(),
            check=False,
            timeout=20,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise InstallError("git_execution_failed") from exc
    if cp.returncode != 0 or cp.stderr:
        raise InstallError("git_query_failed:" + (args[0] if args else "unknown"))
    return cp.stdout


def _git_text(args: list[str]) -> str:
    try:
        return _git(args).decode("utf-8", "strict").strip()
    except UnicodeError as exc:
        raise InstallError("git_output_invalid") from exc


def _verify_checkout(expected_head: str) -> None:
    if not HEX40.fullmatch(expected_head):
        raise InstallError("expected_head_invalid")
    if _git_text(["rev-parse", "--verify", "HEAD"]) != expected_head:
        raise InstallError("checkout_head_mismatch")
    if _git_text(["branch", "--show-current"]) != "main":
        raise InstallError("checkout_branch_not_main")
    if _git_text(["status", "--porcelain=v1", "--untracked-files=all"]) != "":
        raise InstallError("checkout_not_clean")


def _git_object(
    expected_head: str,
    relative: str,
    *,
    expected_blob: str,
    expected_bytes: int | None = None,
    expected_sha256: str | None = None,
) -> bytes:
    raw = _git(["show", expected_head + ":" + relative])
    if git_blob_sha1(raw) != expected_blob:
        raise InstallError("git_object_blob_mismatch:" + relative)
    if expected_bytes is not None and len(raw) != expected_bytes:
        raise InstallError("git_object_bytes_mismatch:" + relative)
    if expected_sha256 is not None and sha256(raw) != expected_sha256:
        raise InstallError("git_object_sha256_mismatch:" + relative)
    return raw


def accepted_lock(expected_head: str) -> dict[str, Any]:
    raw = _git_object(
        expected_head,
        LOCK_REL,
        expected_blob=LOCK_GIT_BLOB_SHA1,
    )
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InstallError("accepted_lock_json_invalid") from exc
    if not isinstance(value, dict):
        raise InstallError("accepted_lock_shape_invalid")

    required = {
        "schema": "void_buy_void_epoch2_dormant_binder_native_candidate_lock_v2",
        "marker": "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_LOCK_V2",
        "version": 2,
        "repository": "6ZoSo9/void-node",
        "candidate_id": None,
        "candidate_accepted": True,
        "native_binary_identity_accepted": True,
        "binder_source_identity_bound": True,
        "protected_install_authorized": False,
        "live_execution_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False,
        "treasury_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
        "production_host_evidence_authority": False,
        "next_gate": "void_buy_void_epoch2_dormant_binder_native_protected_install_v1",
        "lock_id": LOCK_ID,
    }
    for key, expected in required.items():
        if key == "candidate_id":
            continue
        if value.get(key) != expected:
            raise InstallError("accepted_lock_field_mismatch:" + key)

    evidence = value.get("candidate_report")
    if not isinstance(evidence, dict):
        raise InstallError("accepted_lock_candidate_report_missing")
    candidate_required = {
        "candidate_id": CANDIDATE_ID,
        "native_source_git_blob_sha1":
            "4fdf3f627f407335b9d50800fbbc913d1edae523",
        "binder_source_git_blob_sha1": BINDER_GIT_BLOB_SHA1,
        "binder_sha256": BINDER_SHA256,
        "native_binary_sha256": NATIVE_SHA256,
        "native_binary_bytes": NATIVE_BYTES,
        "sealed_source_snapshot": True,
        "checkout_path_is_not_build_authority": True,
        "toolchain_root_custody_verified": True,
        "toolchain_revalidated_after_build": True,
        "static_no_interp": True,
        "hostile_ld_preload_blocked": True,
        "failure_truth_boundary_semantics_bound": True,
    }
    for key, expected in candidate_required.items():
        if evidence.get(key) != expected:
            raise InstallError("accepted_lock_candidate_field_mismatch:" + key)
    return value


def read_exact_candidate(path: pathlib.Path) -> bytes:
    path = _normalized_absolute(path)
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise InstallError("candidate_lstat_failed") from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_nlink != 1
        or visible_before.st_size != NATIVE_BYTES
    ):
        raise InstallError("candidate_metadata_invalid")
    try:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    except OSError as exc:
        raise InstallError("candidate_open_failed") from exc
    try:
        opened_before = os.fstat(fd)
        if not _same_file_identity(visible_before, opened_before):
            raise InstallError("candidate_identity_changed_before_read")
        digest = hashlib.sha256()
        data = bytearray()
        remaining = NATIVE_BYTES
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("candidate_short_read")
            digest.update(chunk)
            data.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("candidate_grew_during_read")
        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_file_identity(opened_before, opened_after)
            or not _same_file_identity(opened_after, visible_after)
        ):
            raise InstallError("candidate_identity_changed_during_read")
    finally:
        os.close(fd)
    if digest.hexdigest() != NATIVE_SHA256:
        raise InstallError("candidate_sha256_mismatch")
    return bytes(data)


def _exists(path: pathlib.Path) -> bool:
    try:
        path.lstat()
        return True
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise InstallError("path_lstat_failed:" + str(path)) from exc


def _installed_file_ok(
    dir_fd: int,
    name: str,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_mode: int,
) -> None:
    try:
        before = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    except OSError as exc:
        raise InstallError("installed_file_unavailable:" + name) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_nlink != 1
        or before.st_size != expected_bytes
    ):
        raise InstallError("installed_file_metadata_invalid:" + name)
    fd = os.open(
        name,
        os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW,
        dir_fd=dir_fd,
    )
    try:
        opened_before = os.fstat(fd)
        if not _same_file_identity(before, opened_before):
            raise InstallError("installed_file_rebound:" + name)
        digest = hashlib.sha256()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("installed_file_short_read:" + name)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("installed_file_grew:" + name)
        opened_after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
        if (
            not _same_file_identity(opened_before, opened_after)
            or not _same_file_identity(opened_after, visible_after)
        ):
            raise InstallError("installed_file_changed:" + name)
    finally:
        os.close(fd)
    if digest.hexdigest() != expected_sha256:
        raise InstallError("installed_file_sha256_mismatch:" + name)


def _verify_install_root(root: pathlib.Path = INSTALL_ROOT) -> None:
    _trusted_root_directory(root, exact_mode=0o755)
    try:
        entries = sorted(os.listdir(root))
    except OSError as exc:
        raise InstallError("installed_root_list_failed") from exc
    if entries != sorted((NATIVE_NAME, BINDER_NAME)):
        raise InstallError("installed_root_entries_invalid")
    root_fd = os.open(
        root,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    try:
        _installed_file_ok(
            root_fd,
            NATIVE_NAME,
            expected_bytes=NATIVE_BYTES,
            expected_sha256=NATIVE_SHA256,
            expected_mode=0o555,
        )
        _installed_file_ok(
            root_fd,
            BINDER_NAME,
            expected_bytes=BINDER_BYTES,
            expected_sha256=BINDER_SHA256,
            expected_mode=0o444,
        )
    finally:
        os.close(root_fd)


def protected_state() -> str:
    _trusted_root_directory(pathlib.Path("/"))
    _trusted_root_directory(INSTALL_PARENT)
    if _exists(STAGE_ROOT):
        raise InstallError("staging_root_present")
    if not _exists(INSTALL_ROOT):
        return READY_STATE
    _verify_install_root()
    return GREEN_STATE


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
            "renameat2_failed:" + source + ":" + target + ":" + str(ctypes.get_errno())
        )


def _write_all(fd: int, raw: bytes) -> None:
    view = memoryview(raw)
    offset = 0
    while offset < len(view):
        wrote = os.write(fd, view[offset:])
        if wrote <= 0:
            raise InstallError("short_write")
        offset += wrote


def _create_file(
    dir_fd: int,
    name: str,
    raw: bytes,
    *,
    expected_bytes: int,
    expected_sha256: str,
    mode: int,
) -> None:
    fd = os.open(
        name,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
        0o400,
        dir_fd=dir_fd,
    )
    try:
        _write_all(fd, raw)
        os.fchown(fd, 0, 0)
        os.fchmod(fd, mode)
        os.fsync(fd)
    finally:
        os.close(fd)
    _installed_file_ok(
        dir_fd,
        name,
        expected_bytes=expected_bytes,
        expected_sha256=expected_sha256,
        expected_mode=mode,
    )


def _cleanup_stage(opt_fd: int) -> bool:
    if not _exists(STAGE_ROOT):
        return True
    try:
        _trusted_root_directory(STAGE_ROOT, exact_mode=0o755)
        entries = sorted(os.listdir(STAGE_ROOT))
        if any(name not in (NATIVE_NAME, BINDER_NAME) for name in entries):
            return False
        stage_fd = os.open(
            STAGE_NAME,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=opt_fd,
        )
        try:
            for name in entries:
                os.unlink(name, dir_fd=stage_fd)
            os.fsync(stage_fd)
        finally:
            os.close(stage_fd)
        os.rmdir(STAGE_NAME, dir_fd=opt_fd)
        os.fsync(opt_fd)
        return True
    except (OSError, InstallError):
        return False


def _bounded_failure(exc: BaseException) -> tuple[str, str]:
    if isinstance(exc, OSError):
        errno_value = exc.errno if exc.errno is not None else "unknown"
        return "OSError", "os_error_" + str(errno_value)
    if isinstance(exc, InstallError):
        if str(exc) == "post_publish_state_invalid":
            return "InstallError", "post_publish_state_invalid"
        return "InstallError", "install_error"
    return "BaseException", "unexpected_failure"


def _published_failure(
    reason: str,
    *,
    phase: str,
    parent_fsync_completed: bool | None,
    final_verification_completed: bool | None,
    cause: BaseException,
) -> PublishedInstallError:
    failure_class, failure_reason = _bounded_failure(cause)
    return PublishedInstallError(
        reason,
        phase=phase,
        parent_fsync_completed=parent_fsync_completed,
        final_verification_completed=final_verification_completed,
        original_failure_class=failure_class,
        original_failure_reason=failure_reason,
    )


def _post_publication_checks(
    opt_fd: int,
    *,
    _fsync_fn: Any = os.fsync,
    _state_reader: Any = protected_state,
) -> None:
    try:
        _fsync_fn(opt_fd)
    except BaseException as exc:
        raise _published_failure(
            "post_publication_parent_fsync_failed",
            phase="parent_fsync",
            parent_fsync_completed=False,
            final_verification_completed=False,
            cause=exc,
        ) from exc
    try:
        final_state = _state_reader()
    except BaseException as exc:
        raise _published_failure(
            "post_publication_final_verification_failed",
            phase="final_verification",
            parent_fsync_completed=True,
            final_verification_completed=False,
            cause=exc,
        ) from exc
    if final_state != GREEN_STATE:
        cause = InstallError("post_publish_state_invalid")
        raise _published_failure(
            "post_publish_state_invalid",
            phase="final_verification",
            parent_fsync_completed=True,
            final_verification_completed=True,
            cause=cause,
        ) from cause


def _bool_fact(value: bool | None) -> str:
    if value is None:
        return "unknown"
    return str(value).lower()


def _failure_receipt(exc: InstallError) -> dict[str, str]:
    if isinstance(exc, PublishedInstallError):
        return {
            "protected_install_performed": "true",
            "publication": "true",
            "publication_state": "published_needs_inspection",
            "final_state_verified": (
                "true"
                if (
                    exc.phase == "install_parent_close"
                    and exc.final_verification_completed is True
                )
                else "false"
            ),
            "publication_failure_phase": exc.phase,
            "parent_fsync_completed": _bool_fact(exc.parent_fsync_completed),
            "final_verification_completed":
                _bool_fact(exc.final_verification_completed),
            "original_failure_class": exc.original_failure_class,
            "original_failure_reason": exc.original_failure_reason,
            "install_parent_close_completed":
                _bool_fact(exc.install_parent_close_completed),
            "close_failure_class": exc.close_failure_class,
            "close_failure_reason": exc.close_failure_reason,
        }
    failure_class, failure_reason = _bounded_failure(exc)
    return {
        "protected_install_performed": "false",
        "publication": "false",
        "publication_state": "not_published",
        "final_state_verified": "false",
        "publication_failure_phase": "not_published",
        "parent_fsync_completed": "not_applicable",
        "final_verification_completed": "not_applicable",
        "original_failure_class": failure_class,
        "original_failure_reason": failure_reason,
        "install_parent_close_completed": "not_applicable",
        "close_failure_class": "not_applicable",
        "close_failure_reason": "not_applicable",
    }


def _require_apply_context() -> None:
    if sys.flags.isolated != 1:
        raise InstallError("python_isolated_mode_required")
    if sys.argv[0] != "-":
        raise InstallError("installer_git_object_stdin_required")
    present = [name for name in FORBIDDEN_APPLY_ENV if name in os.environ]
    if present:
        raise InstallError("forbidden_apply_environment:" + ",".join(present))


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("accepted_lock_id=" + LOCK_ID)
    print("target_root=" + str(INSTALL_ROOT))
    print("staging_root=" + str(STAGE_ROOT))
    print("create_only=true")
    print("atomic_root_publication_required=true")
    print("rename_noreplace_required=true")
    print("native_execution=false")
    print("binder_execution=false")
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
    print("production_host_evidence_authority=false")


def plan(native: pathlib.Path, expected_head: str) -> None:
    _verify_checkout(expected_head)
    accepted_lock(expected_head)
    native_raw = read_exact_candidate(native)
    binder_raw = _git_object(
        expected_head,
        BINDER_REL,
        expected_blob=BINDER_GIT_BLOB_SHA1,
        expected_bytes=BINDER_BYTES,
        expected_sha256=BINDER_SHA256,
    )
    state = protected_state()
    print(MARKER)
    print("mode=plan")
    print("expected_head=" + expected_head)
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("protected_state=" + state)
    print("candidate_native_verified=" + str(len(native_raw) == NATIVE_BYTES).lower())
    print("binder_source_verified=" + str(len(binder_raw) == BINDER_BYTES).lower())
    print("create_only=true")
    print("atomic_root_publication_required=true")
    print("rename_noreplace_required=true")
    print("filesystem_write=false")
    print("native_execution=false")
    print("binder_execution=false")
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
    print("production_host_evidence_authority=false")
    if state == GREEN_STATE:
        print("already_installed=true")
        print("next_action=NO_MUTATION_REQUIRED")
    else:
        print("already_installed=false")
        print("next_action=SEPARATELY_AUTHORIZE_DORMANT_BINDER_CREATE_ONLY_INSTALL")


def apply(
    native: pathlib.Path,
    expected_head: str,
    confirm: str,
) -> None:
    if confirm != CONFIRM_TOKEN:
        raise InstallError("explicit_create_only_confirmation_required")
    _require_apply_context()
    if os.geteuid() != 0:
        raise InstallError("root_required_for_apply")

    _verify_checkout(expected_head)
    accepted_lock(expected_head)
    native_raw = read_exact_candidate(native)
    binder_raw = _git_object(
        expected_head,
        BINDER_REL,
        expected_blob=BINDER_GIT_BLOB_SHA1,
        expected_bytes=BINDER_BYTES,
        expected_sha256=BINDER_SHA256,
    )

    state = protected_state()
    if state == GREEN_STATE:
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("accepted_lock_id=" + LOCK_ID)
        print("protected_install_performed=false")
        print("publication=false")
        print("publication_state=already_green")
        print("native_execution=false")
        print("binder_execution=false")
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
        return
    if state != READY_STATE:
        raise InstallError("apply_state_not_ready")

    opt_fd = os.open(
        INSTALL_PARENT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    stage_created = False
    published = False
    try:
        if _exists(STAGE_ROOT) or _exists(INSTALL_ROOT):
            raise InstallError("create_only_target_changed_before_apply")
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
            _create_file(
                stage_fd,
                NATIVE_NAME,
                native_raw,
                expected_bytes=NATIVE_BYTES,
                expected_sha256=NATIVE_SHA256,
                mode=0o555,
            )
            _create_file(
                stage_fd,
                BINDER_NAME,
                binder_raw,
                expected_bytes=BINDER_BYTES,
                expected_sha256=BINDER_SHA256,
                mode=0o444,
            )
            os.fsync(stage_fd)
        finally:
            os.close(stage_fd)

        _verify_install_root(STAGE_ROOT)
        _renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)
        published = True
        stage_created = False
        _post_publication_checks(opt_fd)
    except BaseException as exc:
        if stage_created and not published:
            cleanup_green = _cleanup_stage(opt_fd)
            print("automatic_stage_cleanup_attempted=true")
            print("automatic_stage_cleanup_green=" + str(cleanup_green).lower())
        if published:
            if isinstance(exc, PublishedInstallError):
                post_failure = exc
            else:
                post_failure = _published_failure(
                    "post_publication_unclassified_failure",
                    phase="post_publication_unknown",
                    parent_fsync_completed=None,
                    final_verification_completed=None,
                    cause=exc,
                )
            try:
                os.close(opt_fd)
                post_failure.install_parent_close_completed = True
            except OSError as close_exc:
                post_failure.install_parent_close_completed = False
                (
                    post_failure.close_failure_class,
                    post_failure.close_failure_reason,
                ) = _bounded_failure(close_exc)
            raise post_failure from exc
        try:
            os.close(opt_fd)
        except OSError as close_exc:
            raise InstallError("install_parent_close_failed") from close_exc
        raise
    else:
        try:
            os.close(opt_fd)
        except OSError as close_exc:
            post_failure = _published_failure(
                "post_publication_close_requires_inspection",
                phase="install_parent_close",
                parent_fsync_completed=True,
                final_verification_completed=True,
                cause=close_exc,
            )
            post_failure.install_parent_close_completed = False
            (
                post_failure.close_failure_class,
                post_failure.close_failure_reason,
            ) = _bounded_failure(close_exc)
            raise post_failure from close_exc

    print(MARKER)
    print("mode=apply")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("protected_install_performed=true")
    print("publication=true")
    print("publication_state=published_verified")
    print("final_state_verified=true")
    print("atomic_root_publication=true")
    print("create_only=true")
    print("installed_native_sha256=" + NATIVE_SHA256)
    print("installed_native_bytes=" + str(NATIVE_BYTES))
    print("installed_binder_sha256=" + BINDER_SHA256)
    print("installed_binder_bytes=" + str(BINDER_BYTES))
    print("native_execution=false")
    print("binder_execution=false")
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
    print("production_host_evidence_authority=false")
    print("next_action=EPOCH2_DORMANT_BINDER_INSTALLED_READ_ONLY_QUALIFICATION_V1")


def self_test() -> None:
    assert INSTALL_ROOT == pathlib.Path(
        "/opt/void-buy-void-epoch2-dormant-v3r-binding-v2"
    )
    assert NATIVE_TARGET.parent == BINDER_TARGET.parent == INSTALL_ROOT
    assert NATIVE_BYTES == 726_976
    assert BINDER_BYTES == 39_391
    assert NATIVE_SHA256 != BINDER_SHA256
    libc = ctypes.CDLL(None)
    assert getattr(libc, "renameat2", None) is not None

    def injected_fsync_failure(_fd: int) -> None:
        raise OSError(5, "injected_fsync_failure")

    try:
        _post_publication_checks(
            -1,
            _fsync_fn=injected_fsync_failure,
            _state_reader=lambda: GREEN_STATE,
        )
    except PublishedInstallError as exc:
        receipt = _failure_receipt(exc)
        assert receipt["protected_install_performed"] == "true"
        assert receipt["publication"] == "true"
        assert receipt["publication_state"] == "published_needs_inspection"
        assert receipt["publication_failure_phase"] == "parent_fsync"
        assert receipt["parent_fsync_completed"] == "false"
        assert receipt["final_verification_completed"] == "false"
    else:
        raise AssertionError("post_publication_fsync_failure_not_classified")

    def injected_final_failure() -> str:
        raise InstallError("injected_final_failure")

    try:
        _post_publication_checks(
            -1,
            _fsync_fn=lambda _fd: None,
            _state_reader=injected_final_failure,
        )
    except PublishedInstallError as exc:
        receipt = _failure_receipt(exc)
        assert receipt["protected_install_performed"] == "true"
        assert receipt["publication"] == "true"
        assert receipt["publication_state"] == "published_needs_inspection"
        assert receipt["publication_failure_phase"] == "final_verification"
        assert receipt["parent_fsync_completed"] == "true"
        assert receipt["final_verification_completed"] == "false"
    else:
        raise AssertionError("post_publication_final_failure_not_classified")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--native", type=pathlib.Path)
    parser.add_argument("--expected-head", default="")
    parser.add_argument("--confirm", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print(MARKER + "_SELF_TEST_GREEN")
        print("atomic_root_publication_required=true")
        print("rename_noreplace_required=true")
        print("truthful_post_publication_failure_receipt=true")
        print("post_publication_fsync_failure_receipt_truthful=true")
        print("post_publication_final_readback_failure_receipt_truthful=true")
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if args.native is None:
        raise InstallError("native_candidate_path_required")
    if not args.expected_head:
        raise InstallError("expected_head_required")
    if args.plan:
        plan(args.native, args.expected_head)
        return 0
    apply(args.native, args.expected_head, args.confirm)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except InstallError as exc:
        receipt = _failure_receipt(exc)
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("protected_install_performed=" + receipt["protected_install_performed"])
        print("publication=" + receipt["publication"])
        print("publication_state=" + receipt["publication_state"])
        print("final_state_verified=" + receipt["final_state_verified"])
        print("publication_failure_phase=" + receipt["publication_failure_phase"])
        print("parent_fsync_completed=" + receipt["parent_fsync_completed"])
        print(
            "final_verification_completed="
            + receipt["final_verification_completed"]
        )
        print("original_failure_class=" + receipt["original_failure_class"])
        print("original_failure_reason=" + receipt["original_failure_reason"])
        print(
            "install_parent_close_completed="
            + receipt["install_parent_close_completed"]
        )
        print("close_failure_class=" + receipt["close_failure_class"])
        print("close_failure_reason=" + receipt["close_failure_reason"])
        print("native_execution=false")
        print("binder_execution=false")
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
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
