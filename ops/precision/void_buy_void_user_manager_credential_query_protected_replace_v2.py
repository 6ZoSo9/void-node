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
import tempfile
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
LOCK_REL = "ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json"
LOCK_PATH = ROOT / LOCK_REL
LOCK_GIT_BLOB_SHA1 = "b73415ce8fc95ff2d49cbde97a15d701ad5b7937"
LOCK_ID = (
    "voidbuyumqcredelflock2_"
    "c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54"
)

MARKER = "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V2"
INSTALL_ROOT = pathlib.Path("/opt/void-buy-void-user-manager-credential-query-v1")

PREEXEC_NAME = "void_buy_void_user_manager_private_credential_unit_query_preexec_v1"
QUERY_NAME = "void_buy_void_user_manager_private_credential_unit_query_v1"
V1_PREDECESSOR_NAME = (
    "void_buy_void_user_manager_private_credential_unit_query_v1."
    "predecessor-lock-v1"
)
STAGING_NAME = (
    ".void_buy_void_user_manager_private_credential_unit_query_v2.stage"
)

PREEXEC_TARGET = INSTALL_ROOT / PREEXEC_NAME
QUERY_TARGET = INSTALL_ROOT / QUERY_NAME
V1_PREDECESSOR_TARGET = INSTALL_ROOT / V1_PREDECESSOR_NAME
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
V2_QUERY_SOURCE_BLOB = "39b292a6353cc36bcc07a5425ff2c736372a7c83"
V2_CANDIDATE_BLOB = "e193d74abbd7c55a792c6a82280a6a0382a8a719"

CONFIRM_APPLY = (
    "ATOMIC_EXCHANGE_ACCEPTED_CREDENTIAL_QUERY_V1_TO_V2"
)
CONFIRM_ROLLBACK = (
    "ATOMIC_EXCHANGE_ROLLBACK_CREDENTIAL_QUERY_V2_TO_V1"
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

READY_STATE = "CREDENTIAL_QUERY_V1_GREEN_READY_FOR_V2"
GREEN_STATE = "CREDENTIAL_QUERY_V2_GREEN_WITH_V1_PREDECESSOR"


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
        "schema": "void_buy_void_user_manager_credential_query_elf_lock_v2",
        "marker": "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V2",
        "version": 2,
        "repository": "6ZoSo9/void-node",
        "v1_predecessor_lock_id": V1_LOCK_ID,
        "candidate_accepted": True,
        "replacement_authorized": False,
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
            raise ReplaceError("accepted_lock_field_mismatch:" + key)

    evidence = value.get("candidate_evidence")
    if not isinstance(evidence, dict):
        raise ReplaceError("accepted_lock_evidence_missing")
    expected_evidence = {
        "git_blob_sha1": V2_CANDIDATE_BLOB,
        "preexec_binary_sha256": PREEXEC_SHA256,
        "preexec_binary_bytes": PREEXEC_BYTES,
        "query_binary_sha256": V2_QUERY_SHA256,
        "query_binary_bytes": V2_QUERY_BYTES,
        "credential_query_source_git_blob_sha1": V2_QUERY_SOURCE_BLOB,
        "max_dropin_paths": 64,
        "max_load_credentials": 32,
        "unique_credential_ids_required": True,
        "exactly_one_epoch2_credential_required": True,
        "unrelated_credentials_allowed": True,
        "complete_credential_set_generation_stability_required": True,
    }
    for key, expected in expected_evidence.items():
        if evidence.get(key) != expected:
            raise ReplaceError(
                "accepted_lock_candidate_field_mismatch:" + key
            )
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
        or visible_before.st_size != V2_QUERY_BYTES
    ):
        raise ReplaceError("candidate_metadata_invalid")

    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened_before = os.fstat(fd)
        if not _same_file_identity(visible_before, opened_before):
            raise ReplaceError("candidate_identity_changed_before_read")
        digest = hashlib.sha256()
        data = bytearray()
        remaining = V2_QUERY_BYTES
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

    if digest.hexdigest() != V2_QUERY_SHA256:
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


def _create_exact_stage(dir_fd: int, raw: bytes) -> None:
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW
    fd = os.open(STAGING_NAME, flags, 0o500, dir_fd=dir_fd)
    try:
        _write_all(fd, raw)
        os.fchmod(fd, 0o555)
        os.fchown(fd, 0, 0)
        os.fsync(fd)
    finally:
        os.close(fd)
    _file_digest(
        STAGING_TARGET,
        expected_bytes=V2_QUERY_BYTES,
        expected_sha256=V2_QUERY_SHA256,
    )


def _root_entries() -> list[str]:
    try:
        return sorted(os.listdir(INSTALL_ROOT))
    except OSError as exc:
        raise ReplaceError("installed_root_list_failed") from exc


def _base_state() -> str:
    _trusted_root_directory(pathlib.Path("/"))
    _trusted_root_directory(pathlib.Path("/opt"))
    _trusted_root_directory(INSTALL_ROOT, exact_mode=0o755)

    _file_digest(
        PREEXEC_TARGET,
        expected_bytes=PREEXEC_BYTES,
        expected_sha256=PREEXEC_SHA256,
    )
    if _exists(STAGING_TARGET):
        raise ReplaceError("staging_path_present")

    query_is_v1 = False
    query_is_v2 = False
    try:
        _file_digest(
            QUERY_TARGET,
            expected_bytes=V1_QUERY_BYTES,
            expected_sha256=V1_QUERY_SHA256,
        )
        query_is_v1 = True
    except ReplaceError:
        try:
            _file_digest(
                QUERY_TARGET,
                expected_bytes=V2_QUERY_BYTES,
                expected_sha256=V2_QUERY_SHA256,
            )
            query_is_v2 = True
        except ReplaceError as exc:
            raise ReplaceError("fixed_query_identity_unrecognized") from exc

    predecessor_exists = _exists(V1_PREDECESSOR_TARGET)

    if query_is_v1 and not predecessor_exists:
        if _root_entries() != sorted((PREEXEC_NAME, QUERY_NAME)):
            raise ReplaceError("v1_ready_root_entries_invalid")
        return READY_STATE

    if query_is_v2 and predecessor_exists:
        _file_digest(
            V1_PREDECESSOR_TARGET,
            expected_bytes=V1_QUERY_BYTES,
            expected_sha256=V1_QUERY_SHA256,
        )
        if _root_entries() != sorted(
            (PREEXEC_NAME, QUERY_NAME, V1_PREDECESSOR_NAME)
        ):
            raise ReplaceError("v2_green_root_entries_invalid")
        return GREEN_STATE

    raise ReplaceError("protected_query_state_invalid")


def source_plan() -> None:
    accepted_lock()
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("accepted_lock_id=" + LOCK_ID)
    print("installed_predecessor_lock_id=" + V1_LOCK_ID)
    print("fixed_install_root=" + str(INSTALL_ROOT))
    print("preexec_replacement=false")
    print("v1_predecessor_preserved_after_success=true")
    print("query_atomic_exchange_required=true")
    print("automatic_failure_rollback=true")
    print("query_execution=false")
    print("credential_contents_read=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
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
    print("installed_predecessor_lock_id=" + V1_LOCK_ID)
    print("protected_state=" + state)
    print("candidate_query_verified=" + str(candidate_verified).lower())
    print("preexec_replacement=false")
    print("v1_predecessor_preserved_after_success=true")
    print("query_atomic_exchange_required=true")
    print("filesystem_write=false")
    print("query_execution=false")
    print("credential_contents_read=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("transaction=false")
    print("funds_movement=false")
    if state == GREEN_STATE:
        print("already_replaced=true")
        print("next_action=NO_MUTATION_REQUIRED")
    else:
        print("already_replaced=false")
        print("next_action=SEPARATELY_AUTHORIZE_ATOMIC_V1_TO_V2_REPLACEMENT")


def _restore_ready_after_failed_apply(dir_fd: int, old_name: str | None) -> bool:
    try:
        if old_name is not None and _exists(INSTALL_ROOT / old_name):
            current_is_v2 = False
            try:
                _file_digest(
                    QUERY_TARGET,
                    expected_bytes=V2_QUERY_BYTES,
                    expected_sha256=V2_QUERY_SHA256,
                )
                current_is_v2 = True
            except ReplaceError:
                current_is_v2 = False

            old_path = INSTALL_ROOT / old_name
            if current_is_v2:
                _file_digest(
                    old_path,
                    expected_bytes=V1_QUERY_BYTES,
                    expected_sha256=V1_QUERY_SHA256,
                )
                _renameat2(dir_fd, QUERY_NAME, old_name, RENAME_EXCHANGE)
                os.fsync(dir_fd)

            _file_digest(
                QUERY_TARGET,
                expected_bytes=V1_QUERY_BYTES,
                expected_sha256=V1_QUERY_SHA256,
            )
            residue = INSTALL_ROOT / old_name
            if _exists(residue):
                _file_digest(
                    residue,
                    expected_bytes=V2_QUERY_BYTES,
                    expected_sha256=V2_QUERY_SHA256,
                )
                os.unlink(old_name, dir_fd=dir_fd)
                os.fsync(dir_fd)
        elif _exists(STAGING_TARGET):
            _file_digest(
                QUERY_TARGET,
                expected_bytes=V1_QUERY_BYTES,
                expected_sha256=V1_QUERY_SHA256,
            )
            _file_digest(
                STAGING_TARGET,
                expected_bytes=V2_QUERY_BYTES,
                expected_sha256=V2_QUERY_SHA256,
            )
            os.unlink(STAGING_NAME, dir_fd=dir_fd)
            os.fsync(dir_fd)
        return _base_state() == READY_STATE
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
    state = _base_state()
    if state == GREEN_STATE:
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("protected_query_replacement_performed=false")
        print("query_execution=false")
        print("credential_contents_read=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("transaction=false")
        print("funds_movement=false")
        return
    if state != READY_STATE:
        raise ReplaceError("apply_state_not_v1_ready")

    dir_fd = os.open(
        INSTALL_ROOT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    old_name: str | None = None
    try:
        if _exists(STAGING_TARGET) or _exists(V1_PREDECESSOR_TARGET):
            raise ReplaceError("replacement_target_changed_before_apply")

        _create_exact_stage(dir_fd, raw)
        os.fsync(dir_fd)

        old_name = STAGING_NAME
        _renameat2(dir_fd, STAGING_NAME, QUERY_NAME, RENAME_EXCHANGE)
        os.fsync(dir_fd)

        _file_digest(
            QUERY_TARGET,
            expected_bytes=V2_QUERY_BYTES,
            expected_sha256=V2_QUERY_SHA256,
        )
        _file_digest(
            STAGING_TARGET,
            expected_bytes=V1_QUERY_BYTES,
            expected_sha256=V1_QUERY_SHA256,
        )
        _file_digest(
            PREEXEC_TARGET,
            expected_bytes=PREEXEC_BYTES,
            expected_sha256=PREEXEC_SHA256,
        )

        _renameat2(
            dir_fd,
            STAGING_NAME,
            V1_PREDECESSOR_NAME,
            RENAME_NOREPLACE,
        )
        old_name = V1_PREDECESSOR_NAME
        os.fsync(dir_fd)

        if _base_state() != GREEN_STATE:
            raise ReplaceError("post_exchange_state_invalid")
    except BaseException:
        rollback_green = _restore_ready_after_failed_apply(dir_fd, old_name)
        print("automatic_rollback_attempted=true")
        print("automatic_rollback_green=" + str(rollback_green).lower())
        raise
    finally:
        os.close(dir_fd)

    print(MARKER)
    print("mode=apply")
    print("accepted_lock_id=" + LOCK_ID)
    print("installed_predecessor_lock_id=" + V1_LOCK_ID)
    print("protected_query_replacement_performed=true")
    print("atomic_exchange=true")
    print("preexec_replacement=false")
    print("installed_query_sha256=" + V2_QUERY_SHA256)
    print("installed_query_bytes=" + str(V2_QUERY_BYTES))
    print("v1_predecessor_retained=true")
    print("query_execution=false")
    print("credential_contents_read=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("transaction=false")
    print("funds_movement=false")
    print("next_action=V2_INSTALLED_READ_ONLY_QUALIFICATION")


def rollback(confirm: str) -> None:
    if confirm != CONFIRM_ROLLBACK:
        raise ReplaceError("explicit_rollback_confirmation_required")
    if os.geteuid() != 0:
        raise ReplaceError("root_required_for_rollback")
    _require_secure_apply_context()
    accepted_lock()

    if _base_state() != GREEN_STATE:
        raise ReplaceError("rollback_state_not_v2_green")

    dir_fd = os.open(
        INSTALL_ROOT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    try:
        _renameat2(
            dir_fd,
            QUERY_NAME,
            V1_PREDECESSOR_NAME,
            RENAME_EXCHANGE,
        )
        os.fsync(dir_fd)

        _file_digest(
            QUERY_TARGET,
            expected_bytes=V1_QUERY_BYTES,
            expected_sha256=V1_QUERY_SHA256,
        )
        _file_digest(
            V1_PREDECESSOR_TARGET,
            expected_bytes=V2_QUERY_BYTES,
            expected_sha256=V2_QUERY_SHA256,
        )
        os.unlink(V1_PREDECESSOR_NAME, dir_fd=dir_fd)
        os.fsync(dir_fd)

        if _base_state() != READY_STATE:
            raise ReplaceError("rollback_post_state_invalid")
    finally:
        os.close(dir_fd)

    print(MARKER)
    print("mode=rollback")
    print("status=ROLLBACK_GREEN")
    print("v1_query_restored=true")
    print("v2_query_removed=true")
    print("preexec_replacement=false")
    print("query_execution=false")
    print("credential_contents_read=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
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
    assert STAGING_TARGET.parent == INSTALL_ROOT
    assert PREEXEC_SHA256 != V1_QUERY_SHA256
    assert V1_QUERY_SHA256 != V2_QUERY_SHA256
    assert V1_QUERY_BYTES != V2_QUERY_BYTES

    with tempfile.TemporaryDirectory(
        prefix="void-credential-query-v2-renameat2-"
    ) as raw:
        root = pathlib.Path(raw)
        a = root / "a"
        b = root / "b"
        a.write_bytes(b"A")
        b.write_bytes(b"B")
        dir_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
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
        print("automatic_failure_rollback=true")
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
        print("transaction=false")
        print("funds_movement=false")
        raise SystemExit(2)
