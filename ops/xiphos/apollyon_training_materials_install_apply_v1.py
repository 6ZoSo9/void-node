#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import stat
import tempfile
from typing import Any

from apollyon_training_materials_install_contract_v1 import (
    ACCOUNT,
    ENTRYPOINT_TARGET,
    EXPECTED_ENTRYPOINT_BYTES,
    EXPECTED_ENTRYPOINT_SELF_TEST_SHA256,
    EXPECTED_ENTRYPOINT_SHA256,
    EXPECTED_PREENTRY_BYTES,
    EXPECTED_PREENTRY_SELF_TEST_SHA256,
    EXPECTED_PREENTRY_SHA256,
    HOME,
    INPUT_DIR,
    MARKER,
    MAX_SOURCE_BYTES,
    OUTPUT_DIR,
    PLAN_PREFIX,
    PREENTRY_TARGET,
    RECEIPT_PREFIX,
    TARGET_HOST,
    UNIT_SOURCE,
    UNIT_TARGET,
    Hold,
    bounded_regular_bytes,
    canonical,
    sha256,
    verify_repository_contract,
)
from apollyon_training_materials_install_host_plan_v1 import (
    account_state,
    build_plan,
    compiler_identity,
    expected_file_state,
    expected_unit_state,
    run_command,
    systemd_major,
    systemd_unit_state,
)
from apollyon_training_materials_install_build_v1 import build_locked_binary

def verify_account_exact() -> tuple[int, int]:
    state = account_state()
    if state["state"] != "exact":
        raise Hold("dedicated_account_not_created")
    return int(state["uid"]), int(state["gid"])


def create_account_if_absent() -> bool:
    state = account_state()
    if state["state"] == "exact":
        return False
    result = run_command(
        [
            "/usr/sbin/useradd",
            "--system",
            "--user-group",
            "--home-dir",
            os.fspath(HOME),
            "--shell",
            "/usr/sbin/nologin",
            "--no-create-home",
            ACCOUNT,
        ],
        timeout=30,
        env={"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LC_ALL": "C"},
    )
    if result.returncode != 0:
        raise Hold("dedicated_account_creation_failed:" + result.stderr[-500:])
    verify_account_exact()
    return True


def ensure_directory(path: Path, mode: int, uid: int, gid: int) -> bool:
    try:
        os.mkdir(path, mode)
        created = True
    except FileExistsError:
        created = False
    except OSError as exc:
        raise Hold("directory_create_failed:" + os.fspath(path)) from exc
    try:
        metadata = path.lstat()
    except OSError as exc:
        raise Hold("directory_postcheck_failed:" + os.fspath(path)) from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISDIR(metadata.st_mode):
        raise Hold("directory_postcheck_type_invalid:" + os.fspath(path))
    if created:
        os.chown(path, uid, gid, follow_symlinks=False)
        os.chmod(path, mode, follow_symlinks=False)
        metadata = path.lstat()
    if (
        metadata.st_uid != uid
        or metadata.st_gid != gid
        or stat.S_IMODE(metadata.st_mode) != mode
    ):
        raise Hold("directory_postcheck_metadata_invalid:" + os.fspath(path))
    return created


def fsync_directory(path: Path) -> None:
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def atomic_create_file(path: Path, data: bytes, mode: int) -> bool:
    if path.exists() or path.is_symlink():
        state = expected_file_state(
            path,
            mode=mode,
            expected_bytes=len(data),
            expected_sha256=sha256(data),
        )
        if state["state"] != "exact":
            raise Hold("existing_file_not_exact:" + os.fspath(path))
        return False
    token = hashlib.sha256((os.fspath(path) + str(os.getpid())).encode("utf-8")).hexdigest()[:16]
    temporary = path.parent / ("." + path.name + ".tmp." + token)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(temporary, flags, 0o600)
    try:
        offset = 0
        while offset < len(data):
            written = os.write(fd, data[offset:])
            if written <= 0:
                raise Hold("temporary_file_short_write:" + os.fspath(path))
            offset += written
        os.fchmod(fd, mode)
        os.fchown(fd, 0, 0)
        os.fsync(fd)
    finally:
        os.close(fd)
    try:
        os.link(temporary, path, follow_symlinks=False)
    except BaseException:
        try:
            temporary.unlink()
        except OSError:
            pass
        raise
    temporary.unlink()
    fsync_directory(path.parent)
    expected_file_state(
        path,
        mode=mode,
        expected_bytes=len(data),
        expected_sha256=sha256(data),
    )
    return True


def apply(expected_plan_id: str) -> dict[str, Any]:
    if os.geteuid() != 0:
        raise Hold("apply_requires_root")
    initial = build_plan()
    if initial["plan_id"] != expected_plan_id:
        raise Hold("expected_plan_id_mismatch")
    materials = verify_repository_contract()
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-training-install-v1-", dir="/var/tmp"
    ) as temporary_name:
        temporary = Path(temporary_name)
        preentry = build_locked_binary(
            materials["preentry_source"],
            temporary,
            "apollyon_training_bus_isolation_preentry_v1",
            EXPECTED_PREENTRY_BYTES,
            EXPECTED_PREENTRY_SHA256,
            EXPECTED_PREENTRY_SELF_TEST_SHA256,
        )
        entrypoint = build_locked_binary(
            materials["entrypoint_source"],
            temporary,
            "apollyon_candidate_training_entrypoint_v1",
            EXPECTED_ENTRYPOINT_BYTES,
            EXPECTED_ENTRYPOINT_SHA256,
            EXPECTED_ENTRYPOINT_SELF_TEST_SHA256,
        )
        if build_plan()["plan_id"] != expected_plan_id:
            raise Hold("plan_drift_before_mutation")
        account_created = create_account_if_absent()
        uid, gid = verify_account_exact()
        created_directories = []
        for path, mode, owner_uid, owner_gid in (
            (PREENTRY_TARGET.parent, 0o755, 0, 0),
            (ENTRYPOINT_TARGET.parent, 0o755, 0, 0),
            (HOME, 0o755, 0, 0),
            (INPUT_DIR, 0o755, 0, 0),
            (OUTPUT_DIR, 0o700, uid, gid),
        ):
            if ensure_directory(path, mode, owner_uid, owner_gid):
                created_directories.append(os.fspath(path))
        created_files = []
        if atomic_create_file(ENTRYPOINT_TARGET, entrypoint.read_bytes(), 0o755):
            created_files.append(os.fspath(ENTRYPOINT_TARGET))
        if atomic_create_file(PREENTRY_TARGET, preentry.read_bytes(), 0o755):
            created_files.append(os.fspath(PREENTRY_TARGET))
        unit_bytes = materials["unit"]
        if atomic_create_file(UNIT_TARGET, unit_bytes, 0o644):
            created_files.append(os.fspath(UNIT_TARGET))
    final_service = systemd_unit_state()
    final_material = {
        "marker": MARKER,
        "version": 1,
        "status": "reviewed_materials_installed_create_only_reload_required",
        "target_host": TARGET_HOST,
        "source_plan_id": expected_plan_id,
        "account_created": account_created,
        "created_directories": created_directories,
        "created_files": created_files,
        "installed_unit_identity_exact": expected_unit_state(materials["unit"])["state"]
        == "exact",
        "installed_preentry_identity_exact": expected_file_state(
            PREENTRY_TARGET,
            mode=0o755,
            expected_bytes=EXPECTED_PREENTRY_BYTES,
            expected_sha256=EXPECTED_PREENTRY_SHA256,
        )["state"]
        == "exact",
        "installed_entrypoint_identity_exact": expected_file_state(
            ENTRYPOINT_TARGET,
            mode=0o755,
            expected_bytes=EXPECTED_ENTRYPOINT_BYTES,
            expected_sha256=EXPECTED_ENTRYPOINT_SHA256,
        )["state"]
        == "exact",
        "service": final_service,
        "authority": {
            "filesystem_mutation": True,
            "account_mutation": account_created,
            "daemon_reload": False,
            "service_enable": False,
            "service_start": False,
            "service_restart": False,
            "attempt_claim": False,
            "training_execution": False,
            "candidate_weight_mutation": False,
            "credential_access": False,
            "wallet_or_signer_access": False,
            "transaction": False,
            "funds_movement": False,
        },
        "next_gate": "apollyon_training_materials_daemon_reload_and_installed_identity_v1",
    }
    return {
        **final_material,
        "receipt_id": RECEIPT_PREFIX
        + sha256(canonical(final_material).encode("utf-8")),
    }


def self_test() -> None:
    materials = verify_repository_contract()
    compiler_identity()
    systemd_major()
    with tempfile.TemporaryDirectory(prefix="void-apollyon-install-selftest-") as td:
        directory = Path(td)
        preentry = build_locked_binary(
            materials["preentry_source"],
            directory,
            "preentry",
            EXPECTED_PREENTRY_BYTES,
            EXPECTED_PREENTRY_SHA256,
            EXPECTED_PREENTRY_SELF_TEST_SHA256,
        )
        entrypoint = build_locked_binary(
            materials["entrypoint_source"],
            directory,
            "entrypoint",
            EXPECTED_ENTRYPOINT_BYTES,
            EXPECTED_ENTRYPOINT_SHA256,
            EXPECTED_ENTRYPOINT_SELF_TEST_SHA256,
        )
        if preentry.stat().st_size != EXPECTED_PREENTRY_BYTES:
            raise AssertionError("preentry self-test size mismatch")
        if entrypoint.stat().st_size != EXPECTED_ENTRYPOINT_BYTES:
            raise AssertionError("entrypoint self-test size mismatch")
        sample = {"marker": MARKER, "version": 1, "value": "stable"}
        first = PLAN_PREFIX + sha256(canonical(sample).encode("utf-8"))
        second = PLAN_PREFIX + sha256(canonical(dict(reversed(list(sample.items())))).encode("utf-8"))
        if first != second:
            raise AssertionError("canonical plan identity unstable")
    print(MARKER + "_SELF_TEST=GREEN")
    print("source_only=true")
    print("temporary_build_filesystem_write=true")
    print("operator_host_mutation=false")
    print("account_mutation=false")
    print("daemon_reload=false")
    print("service_enable=false")
    print("service_start=false")
    print("training_execution=false")
    print("funds_movement=false")



