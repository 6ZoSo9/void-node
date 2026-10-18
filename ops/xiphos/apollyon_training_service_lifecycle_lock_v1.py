#!/usr/bin/env python3
from __future__ import annotations

import fcntl
import hashlib
import os
from pathlib import Path
import stat
from typing import Final

MARKER: Final = "VOID_APOLLYON_TRAINING_SERVICE_LIFECYCLE_LOCK_V1"
LOCK_ROOT: Final = Path("/etc/systemd/system")
UNIT_PATH: Final = (
    LOCK_ROOT / "void-apollyon-training-bus-isolation-v1.service"
)
UNIT_GIT_BLOB_SHA1: Final = "62fbabe1cf7ae0d940f5d96e19b06282f841267b"
UNIT_MODE: Final = 0o644
MAX_UNIT_BYTES: Final = 64 * 1024


class Hold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise Hold(reason)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def _root_metadata_valid(
    metadata: os.stat_result,
    expected_uid: int,
    expected_gid: int,
) -> bool:
    return (
        stat.S_ISDIR(metadata.st_mode)
        and metadata.st_uid == expected_uid
        and metadata.st_gid == expected_gid
        and stat.S_IMODE(metadata.st_mode) & 0o022 == 0
    )


def _unit_metadata_valid(
    metadata: os.stat_result,
    expected_uid: int,
    expected_gid: int,
    expected_mode: int,
) -> bool:
    return (
        stat.S_ISREG(metadata.st_mode)
        and metadata.st_nlink == 1
        and metadata.st_uid == expected_uid
        and metadata.st_gid == expected_gid
        and stat.S_IMODE(metadata.st_mode) == expected_mode
        and 0 < metadata.st_size <= MAX_UNIT_BYTES
    )


def _read_fd_exact(fd: int) -> bytes:
    try:
        os.lseek(fd, 0, os.SEEK_SET)
    except OSError as exc:
        raise Hold("training_service_lifecycle_unit_seek_failed") from exc
    chunks: list[bytes] = []
    total = 0
    while True:
        try:
            chunk = os.read(fd, min(8192, MAX_UNIT_BYTES + 1 - total))
        except OSError as exc:
            raise Hold("training_service_lifecycle_unit_read_failed") from exc
        if not chunk:
            break
        chunks.append(chunk)
        total += len(chunk)
        if total > MAX_UNIT_BYTES:
            hold("training_service_lifecycle_unit_too_large")
    return b"".join(chunks)


def _validate_unit_path(
    path: Path,
    expected_blob: str,
    expected_uid: int,
    expected_gid: int,
    expected_mode: int,
) -> dict[str, object]:
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(path, flags)
    except OSError as exc:
        raise Hold("training_service_lifecycle_unit_open_failed") from exc
    try:
        before = os.fstat(fd)
        if not _unit_metadata_valid(
            before, expected_uid, expected_gid, expected_mode
        ):
            hold("training_service_lifecycle_unit_metadata_invalid")
        raw = _read_fd_exact(fd)
        after = os.fstat(fd)
        visible = path.lstat()
        for field in (
            "st_dev",
            "st_ino",
            "st_mode",
            "st_uid",
            "st_gid",
            "st_nlink",
            "st_size",
            "st_mtime_ns",
            "st_ctime_ns",
        ):
            if getattr(before, field) != getattr(after, field):
                hold("training_service_lifecycle_unit_generation_changed")
        if (
            not _unit_metadata_valid(
                visible, expected_uid, expected_gid, expected_mode
            )
            or visible.st_dev != after.st_dev
            or visible.st_ino != after.st_ino
        ):
            hold("training_service_lifecycle_unit_visible_generation_changed")
        if len(raw) != after.st_size or git_blob(raw) != expected_blob:
            hold("training_service_lifecycle_unit_identity_invalid")
        return {
            "path": os.fspath(path),
            "dev": after.st_dev,
            "ino": after.st_ino,
            "git_blob_sha1": expected_blob,
            "mode": format(expected_mode, "04o"),
            "uid": expected_uid,
            "gid": expected_gid,
        }
    finally:
        os.close(fd)


class LifecycleLock:
    __slots__ = (
        "_fd",
        "_root",
        "_root_dev",
        "_root_ino",
        "_root_uid",
        "_root_gid",
        "_unit",
        "_unit_blob",
        "_unit_uid",
        "_unit_gid",
        "_unit_mode",
        "_closed",
    )

    def __init__(
        self,
        fd: int,
        root: Path,
        root_dev: int,
        root_ino: int,
        root_uid: int,
        root_gid: int,
        unit: Path,
        unit_blob: str,
        unit_uid: int,
        unit_gid: int,
        unit_mode: int,
    ) -> None:
        self._fd = fd
        self._root = root
        self._root_dev = root_dev
        self._root_ino = root_ino
        self._root_uid = root_uid
        self._root_gid = root_gid
        self._unit = unit
        self._unit_blob = unit_blob
        self._unit_uid = unit_uid
        self._unit_gid = unit_gid
        self._unit_mode = unit_mode
        self._closed = False

    @property
    def fd(self) -> int:
        if self._closed:
            hold("training_service_lifecycle_lock_closed")
        return self._fd

    @property
    def identity(self) -> dict[str, object]:
        if self._closed:
            hold("training_service_lifecycle_lock_closed")
        return {
            "lock_root": os.fspath(self._root),
            "lock_root_dev": self._root_dev,
            "lock_root_ino": self._root_ino,
            "unit_path": os.fspath(self._unit),
            "unit_git_blob_sha1": self._unit_blob,
            "unit_mode": format(self._unit_mode, "04o"),
        }

    def revalidate(self) -> None:
        if self._closed:
            hold("training_service_lifecycle_lock_closed")
        _validate_root_generation(
            self._fd,
            self._root,
            self._root_uid,
            self._root_gid,
            self._root_dev,
            self._root_ino,
        )
        _validate_unit_path(
            self._unit,
            self._unit_blob,
            self._unit_uid,
            self._unit_gid,
            self._unit_mode,
        )

    def close(self) -> None:
        if self._closed:
            return
        fd = self._fd
        self._closed = True
        self._fd = -1
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)

    def __enter__(self) -> "LifecycleLock":
        self.revalidate()
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        self.close()
        return False


def _validate_root_generation(
    fd: int,
    path: Path,
    expected_uid: int,
    expected_gid: int,
    expected_dev: int | None = None,
    expected_ino: int | None = None,
) -> tuple[int, int]:
    try:
        held = os.fstat(fd)
        visible = path.lstat()
    except OSError as exc:
        raise Hold("training_service_lifecycle_lock_root_revalidation_failed") from exc
    if (
        not _root_metadata_valid(held, expected_uid, expected_gid)
        or not _root_metadata_valid(visible, expected_uid, expected_gid)
    ):
        hold("training_service_lifecycle_lock_root_metadata_invalid")
    if held.st_dev != visible.st_dev or held.st_ino != visible.st_ino:
        hold("training_service_lifecycle_lock_root_generation_changed")
    if expected_dev is not None and held.st_dev != expected_dev:
        hold("training_service_lifecycle_lock_root_device_changed")
    if expected_ino is not None and held.st_ino != expected_ino:
        hold("training_service_lifecycle_lock_root_inode_changed")
    return held.st_dev, held.st_ino


def _acquire_at(
    lock_root: Path,
    unit_path: Path,
    expected_unit_blob: str,
    root_uid: int,
    root_gid: int,
    unit_uid: int,
    unit_gid: int,
    unit_mode: int,
) -> LifecycleLock:
    flags = os.O_RDONLY | os.O_CLOEXEC | os.O_DIRECTORY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(lock_root, flags)
    except OSError as exc:
        raise Hold("training_service_lifecycle_lock_root_open_failed") from exc

    acquired = False
    try:
        if (fcntl.fcntl(fd, fcntl.F_GETFD) & fcntl.FD_CLOEXEC) == 0:
            hold("training_service_lifecycle_lock_cloexec_missing")
        dev, ino = _validate_root_generation(
            fd, lock_root, root_uid, root_gid
        )
        _validate_unit_path(
            unit_path,
            expected_unit_blob,
            unit_uid,
            unit_gid,
            unit_mode,
        )
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise Hold("training_service_lifecycle_lock_busy") from exc
        except OSError as exc:
            raise Hold("training_service_lifecycle_lock_acquire_failed") from exc
        acquired = True

        _validate_root_generation(
            fd,
            lock_root,
            root_uid,
            root_gid,
            dev,
            ino,
        )
        _validate_unit_path(
            unit_path,
            expected_unit_blob,
            unit_uid,
            unit_gid,
            unit_mode,
        )
        return LifecycleLock(
            fd,
            lock_root,
            dev,
            ino,
            root_uid,
            root_gid,
            unit_path,
            expected_unit_blob,
            unit_uid,
            unit_gid,
            unit_mode,
        )
    except BaseException:
        if acquired:
            try:
                fcntl.flock(fd, fcntl.LOCK_UN)
            except OSError:
                pass
        os.close(fd)
        raise


def acquire_training_service_lifecycle_lock_v1() -> LifecycleLock:
    return _acquire_at(
        LOCK_ROOT,
        UNIT_PATH,
        UNIT_GIT_BLOB_SHA1,
        0,
        0,
        0,
        0,
        UNIT_MODE,
    )


def self_test() -> None:
    assert LOCK_ROOT == Path("/etc/systemd/system")
    assert UNIT_PATH == (
        LOCK_ROOT / "void-apollyon-training-bus-isolation-v1.service"
    )
    assert UNIT_GIT_BLOB_SHA1 == "62fbabe1cf7ae0d940f5d96e19b06282f841267b"
    assert UNIT_MODE == 0o644
    print(MARKER + "_SELF_TEST_GREEN")
    print("stable_systemd_directory_lock_domain=true")
    print("fixed_training_unit_identity_bound=true")
    print("root_owned_nonwritable_lock_root_required=true")
    print("exact_unit_blob_mode_owner_required=true")
    print("nonblocking_exclusive_flock_required=true")
    print("fd_cloexec_required=true")
    print("lock_root_generation_revalidated=true")
    print("unit_generation_revalidated_under_lock=true")
    print("filesystem_write=false")
    print("service_action=false")
    print("training_execution=false")
    print("funds_movement=false")


if __name__ == "__main__":
    self_test()
