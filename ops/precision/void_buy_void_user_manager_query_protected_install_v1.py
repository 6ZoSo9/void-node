#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import stat
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
LOCK_REL = "ops/security/buy-void-user-manager-query-elf-lock-v1.json"
LOCK_PATH = ROOT / LOCK_REL
LOCK_GIT_BLOB_SHA1 = "4f255dbc98ac4b65fb4e6433f4e7aee7b86351db"
LOCK_ID = "voidbuyumqelflock1_0b0b791995f7a3346c3562387e211e9e2bb54ca6a050a964950e70a0e4cd1a16"

MARKER = "VOID_BUY_VOID_USER_MANAGER_QUERY_PROTECTED_INSTALL_V1"
INSTALL_ROOT = pathlib.Path("/opt/void-buy-void-user-manager-query-v1")
PREEXEC_NAME = "void_buy_void_user_manager_private_unit_query_preexec_v1"
QUERY_NAME = "void_buy_void_user_manager_private_unit_query_v1"
PREEXEC_TARGET = INSTALL_ROOT / PREEXEC_NAME
QUERY_TARGET = INSTALL_ROOT / QUERY_NAME

PREEXEC_BYTES = 706504
PREEXEC_SHA256 = "8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11"
QUERY_BYTES = 34872
QUERY_SHA256 = "98fb0de18c7e2acc133db38f15036acc8345f503b2dd196cc07193523dd0a435"
CONFIRM_TOKEN = "INSTALL_ACCEPTED_USER_MANAGER_QUERY_PAIR_CREATE_ONLY_V1"

MAX_READ_CHUNK = 1024 * 1024


class InstallError(RuntimeError):
    pass


def git_blob_sha1(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


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
    if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_nlink != 1:
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
    evidence = value.get("candidate_evidence")
    if not isinstance(evidence, dict):
        raise InstallError("accepted_lock_evidence_missing")
    required = {
        "schema": "void_buy_void_user_manager_query_elf_lock_v1",
        "marker": "VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V1",
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "candidate_accepted": True,
        "install_authorized": False,
        "protected_install_performed": False,
        "complete_host_evidence_collector": False,
        "production_host_evidence_authority": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
        "lock_id": LOCK_ID,
    }
    for key, expected in required.items():
        if value.get(key) != expected:
            raise InstallError("accepted_lock_field_mismatch:" + key)
    candidate_required = {
        "preexec_source_git_blob_sha1":
            "f0fbfaae97df3294097a281100f06ada2ef157ff",
        "query_source_git_blob_sha1":
            "ad49cd7f71c41e0f559a561b5a62a00cec60c215",
        "peer_source_git_blob_sha1":
            "cab88f4642ab929d1f7a4d2f1511462a94ef34ca",
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

    flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW
    try:
        fd = os.open(path, flags)
    except OSError as exc:
        raise InstallError("candidate_open_failed") from exc
    try:
        opened_before = os.fstat(fd)
        if not _same_file_identity(visible_before, opened_before):
            raise InstallError("candidate_identity_changed_before_read")

        data = bytearray()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("candidate_short_read")
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

    raw = bytes(data)
    if sha256(raw) != expected_sha256:
        raise InstallError("candidate_sha256_mismatch")
    return raw


def _trusted_root_directory(path: pathlib.Path, *, exact_mode: int | None = None) -> None:
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


def _target_absent(path: pathlib.Path) -> None:
    try:
        path.lstat()
    except FileNotFoundError:
        return
    except OSError as exc:
        raise InstallError("target_lstat_failed:" + str(path)) from exc
    raise InstallError("create_only_target_exists:" + str(path))


def _write_all(fd: int, raw: bytes) -> None:
    view = memoryview(raw)
    offset = 0
    while offset < len(view):
        wrote = os.write(fd, view[offset:])
        if wrote <= 0:
            raise InstallError("installed_file_write_failed")
        offset += wrote


def _installed_file_ok(
    dir_fd: int,
    name: str,
    *,
    expected_bytes: int,
    expected_sha256: str,
) -> None:
    st = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) != 0o555
        or st.st_nlink != 1
        or st.st_size != expected_bytes
    ):
        raise InstallError("installed_file_metadata_invalid:" + name)

    fd = os.open(
        name,
        os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW,
        dir_fd=dir_fd,
    )
    try:
        before = os.fstat(fd)
        digest = hashlib.sha256()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("installed_file_short_read:" + name)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("installed_file_grew_during_read:" + name)
        after = os.fstat(fd)
        visible = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
        if not _same_file_identity(before, after) or not _same_file_identity(after, visible):
            raise InstallError("installed_file_changed_during_verify:" + name)
        if digest.hexdigest() != expected_sha256:
            raise InstallError("installed_file_sha256_mismatch:" + name)
    finally:
        os.close(fd)


def _create_installed_file(
    dir_fd: int,
    name: str,
    raw: bytes,
    *,
    expected_bytes: int,
    expected_sha256: str,
) -> None:
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW
    try:
        fd = os.open(name, flags, 0o500, dir_fd=dir_fd)
    except OSError as exc:
        raise InstallError("create_only_file_create_failed:" + name) from exc
    try:
        _write_all(fd, raw)
        os.fchmod(fd, 0o555)
        os.fchown(fd, 0, 0)
        os.fsync(fd)
    finally:
        os.close(fd)
    _installed_file_ok(
        dir_fd,
        name,
        expected_bytes=expected_bytes,
        expected_sha256=expected_sha256,
    )


def inspect_sources(preexec: pathlib.Path, query: pathlib.Path) -> tuple[bytes, bytes]:
    accepted_lock()
    preexec_raw = read_exact_candidate(
        preexec,
        expected_bytes=PREEXEC_BYTES,
        expected_sha256=PREEXEC_SHA256,
    )
    query_raw = read_exact_candidate(
        query,
        expected_bytes=QUERY_BYTES,
        expected_sha256=QUERY_SHA256,
    )
    return preexec_raw, query_raw


def plan(preexec: pathlib.Path | None, query: pathlib.Path | None) -> None:
    accepted_lock()
    source_verified = False
    if preexec is not None or query is not None:
        if preexec is None or query is None:
            raise InstallError("both_candidate_paths_required")
        inspect_sources(preexec, query)
        source_verified = True

    print(MARKER)
    print("mode=plan")
    print("source_only_contract=false")
    print("apply_available=true")
    print("root_required_for_apply=true")
    print("create_only=true")
    print("target_root=" + str(INSTALL_ROOT))
    print("preexec_target=" + str(PREEXEC_TARGET))
    print("query_target=" + str(QUERY_TARGET))
    print("accepted_lock_id=" + LOCK_ID)
    print("source_candidate_bytes_verified=" + str(source_verified).lower())
    print("filesystem_write=false")
    print("query_execution=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("network_calls=false")
    print("credential_access=false")
    print("wallet_or_signer_access=false")
    print("transaction_signing=false")
    print("transaction_broadcast=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("next_action=SEPARATELY_AUTHORIZE_CREATE_ONLY_INSTALL_APPLY")


def apply(preexec: pathlib.Path, query: pathlib.Path, confirm: str) -> None:
    if confirm != CONFIRM_TOKEN:
        raise InstallError("explicit_create_only_confirmation_required")
    if os.geteuid() != 0:
        raise InstallError("root_required_for_apply")

    preexec_raw, query_raw = inspect_sources(preexec, query)
    _trusted_root_directory(pathlib.Path("/"))
    _trusted_root_directory(pathlib.Path("/opt"))
    _target_absent(INSTALL_ROOT)

    created_root = False
    created_names: list[str] = []
    dir_fd = -1
    try:
        os.mkdir(INSTALL_ROOT, 0o755)
        created_root = True
        os.chown(INSTALL_ROOT, 0, 0)
        os.chmod(INSTALL_ROOT, 0o755)
        _trusted_root_directory(INSTALL_ROOT, exact_mode=0o755)
        dir_fd = os.open(
            INSTALL_ROOT,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        )

        _create_installed_file(
            dir_fd,
            PREEXEC_NAME,
            preexec_raw,
            expected_bytes=PREEXEC_BYTES,
            expected_sha256=PREEXEC_SHA256,
        )
        created_names.append(PREEXEC_NAME)
        _create_installed_file(
            dir_fd,
            QUERY_NAME,
            query_raw,
            expected_bytes=QUERY_BYTES,
            expected_sha256=QUERY_SHA256,
        )
        created_names.append(QUERY_NAME)

        os.fsync(dir_fd)
        _installed_file_ok(
            dir_fd,
            PREEXEC_NAME,
            expected_bytes=PREEXEC_BYTES,
            expected_sha256=PREEXEC_SHA256,
        )
        _installed_file_ok(
            dir_fd,
            QUERY_NAME,
            expected_bytes=QUERY_BYTES,
            expected_sha256=QUERY_SHA256,
        )
        _trusted_root_directory(INSTALL_ROOT, exact_mode=0o755)
    except BaseException:
        if dir_fd >= 0:
            for name in reversed(created_names):
                try:
                    os.unlink(name, dir_fd=dir_fd)
                except OSError:
                    pass
            try:
                os.fsync(dir_fd)
            except OSError:
                pass
        if created_root:
            try:
                os.rmdir(INSTALL_ROOT)
            except OSError:
                pass
        raise
    finally:
        if dir_fd >= 0:
            os.close(dir_fd)

    print(MARKER)
    print("mode=apply")
    print("accepted_lock_id=" + LOCK_ID)
    print("create_only=true")
    print("protected_install_performed=true")
    print("installed_preexec_sha256=" + PREEXEC_SHA256)
    print("installed_preexec_bytes=" + str(PREEXEC_BYTES))
    print("installed_query_sha256=" + QUERY_SHA256)
    print("installed_query_bytes=" + str(QUERY_BYTES))
    print("query_execution=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("network_calls=false")
    print("credential_access=false")
    print("wallet_or_signer_access=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("next_action=AUTHENTICATED_USER_MANAGER_LIVE_QUERY_READ_ONLY_QUALIFICATION")


def self_test() -> None:
    lock = accepted_lock()
    assert lock["candidate_accepted"] is True
    assert lock["install_authorized"] is False
    assert lock["protected_install_performed"] is False
    assert PREEXEC_TARGET == (
        pathlib.Path("/opt/void-buy-void-user-manager-query-v1")
        / PREEXEC_NAME
    )
    assert QUERY_TARGET == (
        pathlib.Path("/opt/void-buy-void-user-manager-query-v1")
        / QUERY_NAME
    )
    assert len(PREEXEC_SHA256) == 64
    assert len(QUERY_SHA256) == 64


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--preexec", type=pathlib.Path)
    parser.add_argument("--query", type=pathlib.Path)
    parser.add_argument("--confirm", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print(MARKER + "_SELF_TEST_GREEN")
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
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("protected_install_performed=false")
        print("query_execution=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("network_calls=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
