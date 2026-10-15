#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
import pathlib
import stat
import sys
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
LOCK_REL = "ops/security/buy-void-user-manager-credential-query-elf-lock-v1.json"
LOCK_PATH = ROOT / LOCK_REL
LOCK_GIT_BLOB_SHA1 = "a434fa671c5a1ca3237efcb51f16223cc27cf4fa"
LOCK_ID = (
    "voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c"
)

MARKER = "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_INSTALL_V1"
INSTALL_PARENT = pathlib.Path("/opt")
INSTALL_NAME = "void-buy-void-user-manager-credential-query-v1"
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
STAGE_NAME = ".void-buy-void-user-manager-credential-query-v1.stage"
STAGE_ROOT = INSTALL_PARENT / STAGE_NAME

PREEXEC_NAME = "void_buy_void_user_manager_private_credential_unit_query_preexec_v1"
QUERY_NAME = "void_buy_void_user_manager_private_credential_unit_query_v1"
PREEXEC_TARGET = INSTALL_ROOT / PREEXEC_NAME
QUERY_TARGET = INSTALL_ROOT / QUERY_NAME

PREEXEC_BYTES = 706504
PREEXEC_SHA256 = "67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c"
QUERY_BYTES = 43064
QUERY_SHA256 = "7b968a20f1507215477f43a59c5d82b9e9adca918ce5f2df566292d8380b4cb1"

CONFIRM_TOKEN = "INSTALL_ACCEPTED_USER_MANAGER_CREDENTIAL_QUERY_PAIR_CREATE_ONLY_V1"
RENAME_NOREPLACE = 1
MAX_READ_CHUNK = 1024 * 1024
READY_STATE = "CREDENTIAL_QUERY_ROOT_ABSENT_READY_FOR_CREATE_ONLY"
GREEN_STATE = "CREDENTIAL_QUERY_PAIR_GREEN"

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


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


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


def _direct_repo_bytes(path: pathlib.Path) -> bytes:
    st = path.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_nlink != 1
    ):
        raise InstallError("repository_lock_not_direct_single_link_file")
    return path.read_bytes()


def accepted_lock() -> dict[str, Any]:
    raw = _direct_repo_bytes(LOCK_PATH)
    if git_blob_sha1(raw) != LOCK_GIT_BLOB_SHA1:
        raise InstallError("accepted_lock_blob_mismatch")
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InstallError("accepted_lock_json_invalid") from exc
    if not isinstance(value, dict):
        raise InstallError("accepted_lock_shape_invalid")

    required = {
        "schema": "void_buy_void_user_manager_credential_query_elf_lock_v1",
        "marker": "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V1",
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "candidate_accepted": True,
        "install_authorized": False,
        "live_query_authorized": False,
        "credential_contents_read": False,
        "complete_host_evidence_collector": False,
        "production_host_evidence_authority": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "transaction": False,
        "funds_movement": False,
        "lock_id": LOCK_ID,
    }
    for key, expected in required.items():
        if value.get(key) != expected:
            raise InstallError("accepted_lock_field_mismatch:" + key)

    evidence = value.get("candidate_evidence")
    if not isinstance(evidence, dict):
        raise InstallError("accepted_lock_evidence_missing")
    candidate_required = {
        "git_blob_sha1": "beedebce690b8ed26422f3bc579f90d6d1405936",
        "peer_source_git_blob_sha1":
            "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
        "credential_query_source_git_blob_sha1":
            "e12e0b16df6e6eb5fd912a6dbf6ae970673246f9",
        "credential_query_proof_git_blob_sha1":
            "ec3803e766fd679eb53c84cc0b3d7069e33c2932",
        "credential_preexec_source_git_blob_sha1":
            "0ccd2d07a951389d85a9fc56ec892a774d9dd681",
        "credential_preexec_proof_git_blob_sha1":
            "58df08ca966f4629893c3885f1df37c837762520",
        "preexec_binary_sha256": PREEXEC_SHA256,
        "preexec_binary_bytes": PREEXEC_BYTES,
        "preexec_static_no_interp": True,
        "query_binary_sha256": QUERY_SHA256,
        "query_binary_bytes": QUERY_BYTES,
    }
    for key, expected in candidate_required.items():
        if evidence.get(key) != expected:
            raise InstallError("accepted_lock_candidate_field_mismatch:" + key)
    return value


def _normalized_absolute(path: pathlib.Path) -> pathlib.Path:
    raw = str(path)
    if not path.is_absolute() or os.path.normpath(raw) != raw:
        raise InstallError("candidate_path_must_be_normalized_absolute")
    return path


def read_exact_candidate(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
) -> bytes:
    path = _normalized_absolute(path)
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise InstallError("candidate_lstat_failed") from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_nlink != 1
        or visible_before.st_size != expected_bytes
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
        remaining = expected_bytes
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

    if digest.hexdigest() != expected_sha256:
        raise InstallError("candidate_sha256_mismatch")
    return bytes(data)


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


def _exists(path: pathlib.Path) -> bool:
    try:
        path.lstat()
        return True
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise InstallError("path_lstat_failed:" + str(path)) from exc


def _file_ok(
    dir_fd: int,
    name: str,
    *,
    expected_bytes: int,
    expected_sha256: str,
) -> None:
    try:
        visible_before = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    except OSError as exc:
        raise InstallError("installed_file_unavailable:" + name) from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_uid != 0
        or visible_before.st_gid != 0
        or stat.S_IMODE(visible_before.st_mode) != 0o555
        or visible_before.st_nlink != 1
        or visible_before.st_size != expected_bytes
    ):
        raise InstallError("installed_file_metadata_invalid:" + name)

    fd = os.open(
        name,
        os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW,
        dir_fd=dir_fd,
    )
    try:
        opened_before = os.fstat(fd)
        if not _same_file_identity(visible_before, opened_before):
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


def _verify_pair_root(root: pathlib.Path) -> None:
    _trusted_root_directory(root, exact_mode=0o755)
    try:
        entries = sorted(os.listdir(root))
    except OSError as exc:
        raise InstallError("installed_root_list_failed") from exc
    expected = sorted((PREEXEC_NAME, QUERY_NAME))
    if entries != expected:
        raise InstallError("installed_root_entries_invalid")
    dir_fd = os.open(
        root,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    try:
        _file_ok(
            dir_fd,
            PREEXEC_NAME,
            expected_bytes=PREEXEC_BYTES,
            expected_sha256=PREEXEC_SHA256,
        )
        _file_ok(
            dir_fd,
            QUERY_NAME,
            expected_bytes=QUERY_BYTES,
            expected_sha256=QUERY_SHA256,
        )
    finally:
        os.close(dir_fd)


def protected_state() -> str:
    _trusted_root_directory(pathlib.Path("/"))
    _trusted_root_directory(INSTALL_PARENT)
    if _exists(STAGE_ROOT):
        raise InstallError("staging_root_present")
    if not _exists(INSTALL_ROOT):
        return READY_STATE
    _verify_pair_root(INSTALL_ROOT)
    return GREEN_STATE


def inspect_sources(
    preexec: pathlib.Path,
    query: pathlib.Path,
) -> tuple[bytes, bytes]:
    accepted_lock()
    return (
        read_exact_candidate(
            preexec,
            expected_bytes=PREEXEC_BYTES,
            expected_sha256=PREEXEC_SHA256,
        ),
        read_exact_candidate(
            query,
            expected_bytes=QUERY_BYTES,
            expected_sha256=QUERY_SHA256,
        ),
    )


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
        err = ctypes.get_errno()
        raise InstallError(
            "renameat2_failed:" + source + ":" + target + ":" + str(err)
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
) -> None:
    fd = os.open(
        name,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
        0o500,
        dir_fd=dir_fd,
    )
    try:
        _write_all(fd, raw)
        os.fchmod(fd, 0o555)
        os.fchown(fd, 0, 0)
        os.fsync(fd)
    finally:
        os.close(fd)
    _file_ok(
        dir_fd,
        name,
        expected_bytes=expected_bytes,
        expected_sha256=expected_sha256,
    )


def _cleanup_stage(opt_fd: int) -> bool:
    if not _exists(STAGE_ROOT):
        return True
    try:
        _trusted_root_directory(STAGE_ROOT, exact_mode=0o755)
        entries = sorted(os.listdir(STAGE_ROOT))
        if any(name not in (PREEXEC_NAME, QUERY_NAME) for name in entries):
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
    except OSError:
        return False
    except InstallError:
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
            "parent_fsync_completed": _bool_fact(
                exc.parent_fsync_completed
            ),
            "final_verification_completed": _bool_fact(
                exc.final_verification_completed
            ),
            "original_failure_class": exc.original_failure_class,
            "original_failure_reason": exc.original_failure_reason,
            "install_parent_close_completed": _bool_fact(
                exc.install_parent_close_completed
            ),
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


def source_plan() -> None:
    accepted_lock()
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
    print("truthful_post_publication_failure_receipt_required=true")
    print("query_execution=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("credential_contents_read=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("transaction=false")
    print("funds_movement=false")


def plan(
    preexec: pathlib.Path | None,
    query: pathlib.Path | None,
) -> None:
    accepted_lock()
    candidates_verified = False
    if preexec is not None or query is not None:
        if preexec is None or query is None:
            raise InstallError("both_candidate_paths_required")
        inspect_sources(preexec, query)
        candidates_verified = True
    state = protected_state()

    print(MARKER)
    print("mode=plan")
    print("accepted_lock_id=" + LOCK_ID)
    print("protected_state=" + state)
    print("candidate_pair_verified=" + str(candidates_verified).lower())
    print("create_only=true")
    print("atomic_root_publication_required=true")
    print("rename_noreplace_required=true")
    print("filesystem_write=false")
    print("query_execution=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("credential_contents_read=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("transaction=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    if state == GREEN_STATE:
        print("already_installed=true")
        print("next_action=NO_MUTATION_REQUIRED")
    else:
        print("already_installed=false")
        print("next_action=SEPARATELY_AUTHORIZE_CREDENTIAL_QUERY_CREATE_ONLY_INSTALL")


def _require_secure_apply_context() -> None:
    if sys.flags.isolated != 1:
        raise InstallError("python_isolated_mode_required")
    present = [name for name in FORBIDDEN_APPLY_ENV if name in os.environ]
    if present:
        raise InstallError("forbidden_apply_environment:" + ",".join(present))


def apply(
    preexec: pathlib.Path,
    query: pathlib.Path,
    confirm: str,
) -> None:
    if confirm != CONFIRM_TOKEN:
        raise InstallError("explicit_create_only_confirmation_required")
    if os.geteuid() != 0:
        raise InstallError("root_required_for_apply")
    _require_secure_apply_context()

    preexec_raw, query_raw = inspect_sources(preexec, query)
    state = protected_state()
    if state == GREEN_STATE:
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("protected_install_performed=false")
        print("query_execution=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("credential_contents_read=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("transaction=false")
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
    cleanup_green = True
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
                PREEXEC_NAME,
                preexec_raw,
                expected_bytes=PREEXEC_BYTES,
                expected_sha256=PREEXEC_SHA256,
            )
            _create_file(
                stage_fd,
                QUERY_NAME,
                query_raw,
                expected_bytes=QUERY_BYTES,
                expected_sha256=QUERY_SHA256,
            )
            os.fsync(stage_fd)
        finally:
            os.close(stage_fd)

        _verify_pair_root(STAGE_ROOT)
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
            if published:
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
            raise InstallError("install_parent_close_failed") from close_exc

    print(MARKER)
    print("mode=apply")
    print("accepted_lock_id=" + LOCK_ID)
    print("protected_install_performed=true")
    print("publication_state=published_verified")
    print("final_state_verified=true")
    print("atomic_root_publication=true")
    print("create_only=true")
    print("installed_preexec_sha256=" + PREEXEC_SHA256)
    print("installed_preexec_bytes=" + str(PREEXEC_BYTES))
    print("installed_query_sha256=" + QUERY_SHA256)
    print("installed_query_bytes=" + str(QUERY_BYTES))
    print("query_execution=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("credential_contents_read=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("transaction=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("next_action=CREDENTIAL_QUERY_INSTALLED_READ_ONLY_QUALIFICATION")


def self_test() -> None:
    lock = accepted_lock()
    assert lock["candidate_accepted"] is True
    assert lock["install_authorized"] is False
    assert lock["live_query_authorized"] is False
    assert lock["credential_contents_read"] is False
    assert INSTALL_ROOT == (
        pathlib.Path("/opt")
        / "void-buy-void-user-manager-credential-query-v1"
    )
    assert STAGE_ROOT == (
        pathlib.Path("/opt")
        / ".void-buy-void-user-manager-credential-query-v1.stage"
    )
    assert PREEXEC_TARGET.parent == QUERY_TARGET.parent == INSTALL_ROOT
    assert PREEXEC_SHA256 != QUERY_SHA256
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
        assert str(exc) == "post_publication_parent_fsync_failed"
        assert receipt["protected_install_performed"] == "true"
        assert receipt["publication"] == "true"
        assert receipt["publication_state"] == "published_needs_inspection"
        assert receipt["publication_failure_phase"] == "parent_fsync"
        assert receipt["parent_fsync_completed"] == "false"
        assert receipt["final_verification_completed"] == "false"
        assert receipt["original_failure_class"] == "OSError"
        assert receipt["original_failure_reason"] == "os_error_5"
    else:
        raise AssertionError("post_publication_fsync_failure_not_classified")

    def injected_final_readback_failure() -> str:
        raise InstallError("injected_final_readback_failure")

    try:
        _post_publication_checks(
            -1,
            _fsync_fn=lambda _fd: None,
            _state_reader=injected_final_readback_failure,
        )
    except PublishedInstallError as exc:
        receipt = _failure_receipt(exc)
        assert str(exc) == "post_publication_final_verification_failed"
        assert receipt["protected_install_performed"] == "true"
        assert receipt["publication"] == "true"
        assert receipt["publication_state"] == "published_needs_inspection"
        assert receipt["publication_failure_phase"] == "final_verification"
        assert receipt["parent_fsync_completed"] == "true"
        assert receipt["final_verification_completed"] == "false"
        assert receipt["original_failure_class"] == "InstallError"
        assert receipt["original_failure_reason"] == "install_error"
    else:
        raise AssertionError("post_publication_readback_failure_not_classified")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--preexec", type=pathlib.Path)
    parser.add_argument("--query", type=pathlib.Path)
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
    if args.plan:
        plan(args.preexec, args.query)
        return 0

    if args.preexec is None or args.query is None:
        raise InstallError("apply_candidate_paths_required")
    apply(args.preexec, args.query, args.confirm)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except InstallError as exc:
        receipt = _failure_receipt(exc)
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print(
            "protected_install_performed="
            + receipt["protected_install_performed"]
        )
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
        print("query_execution=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("credential_contents_read=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("transaction=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
