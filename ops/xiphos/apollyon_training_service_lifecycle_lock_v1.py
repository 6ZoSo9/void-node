#!/usr/bin/env python3
from __future__ import annotations

import fcntl
import hashlib
import os
from pathlib import Path
import stat
from typing import Final

MARKER: Final = "VOID_APOLLYON_TRAINING_SERVICE_LIFECYCLE_LOCK_V1"
UNIT_PATH: Final = Path(
    "/etc/systemd/system/void-apollyon-training-bus-isolation-v1.service"
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


class LifecycleLock:
    __slots__ = (
        "_fd",
        "_path",
        "_dev",
        "_ino",
        "_expected_blob",
        "_expected_uid",
        "_expected_gid",
        "_expected_mode",
        "_closed",
    )

    def __init__(
        self,
        fd: int,
        path: Path,
        dev: int,
        ino: int,
        expected_blob: str,
        expected_uid: int,
        expected_gid: int,
        expected_mode: int,
    ) -> None:
        self._fd = fd
        self._path = path
        self._dev = dev
        self._ino = ino
        self._expected_blob = expected_blob
        self._expected_uid = expected_uid
        self._expected_gid = expected_gid
        self._expected_mode = expected_mode
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
            "path": os.fspath(self._path),
            "dev": self._dev,
            "ino": self._ino,
            "git_blob_sha1": self._expected_blob,
            "mode": format(self._expected_mode, "04o"),
            "uid": self._expected_uid,
            "gid": self._expected_gid,
        }

    def revalidate(self) -> None:
        if self._closed:
            hold("training_service_lifecycle_lock_closed")
        _validate_locked_generation(
            self._fd,
            self._path,
            self._expected_blob,
            self._expected_uid,
            self._expected_gid,
            self._expected_mode,
            self._dev,
            self._ino,
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


def _read_fd_exact(fd: int) -> bytes:
    try:
        os.lseek(fd, 0, os.SEEK_SET)
    except OSError as exc:
        raise Hold("training_service_lifecycle_lock_seek_failed") from exc
    chunks: list[bytes] = []
    total = 0
    while True:
        try:
            chunk = os.read(fd, min(8192, MAX_UNIT_BYTES + 1 - total))
        except OSError as exc:
            raise Hold("training_service_lifecycle_lock_read_failed") from exc
        if not chunk:
            break
        chunks.append(chunk)
        total += len(chunk)
        if total > MAX_UNIT_BYTES:
            hold("training_service_lifecycle_lock_unit_too_large")
    return b"".join(chunks)


def _metadata_valid(
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


def _validate_locked_generation(
    fd: int,
    path: Path,
    expected_blob: str,
    expected_uid: int,
    expected_gid: int,
    expected_mode: int,
    expected_dev: int | None = None,
    expected_ino: int | None = None,
) -> tuple[int, int]:
    try:
        before = os.fstat(fd)
    except OSError as exc:
        raise Hold("training_service_lifecycle_lock_fstat_failed") from exc
    if not _metadata_valid(
        before,
        expected_uid,
        expected_gid,
        expected_mode,
    ):
        hold("training_service_lifecycle_lock_metadata_invalid")

    raw = _read_fd_exact(fd)
    try:
        after = os.fstat(fd)
        visible = path.lstat()
    except OSError as exc:
        raise Hold("training_service_lifecycle_lock_revalidation_failed") from exc

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
            hold("training_service_lifecycle_lock_generation_changed")

    if (
        not _metadata_valid(
            visible,
            expected_uid,
            expected_gid,
            expected_mode,
        )
        or visible.st_dev != after.st_dev
        or visible.st_ino != after.st_ino
    ):
        hold("training_service_lifecycle_lock_visible_generation_changed")

    if len(raw) != after.st_size or git_blob(raw) != expected_blob:
        hold("training_service_lifecycle_lock_unit_identity_invalid")

    if expected_dev is not None and after.st_dev != expected_dev:
        hold("training_service_lifecycle_lock_device_changed")
    if expected_ino is not None and after.st_ino != expected_ino:
        hold("training_service_lifecycle_lock_inode_changed")
    return after.st_dev, after.st_ino


def _acquire_at(
    path: Path,
    expected_blob: str,
    expected_uid: int,
    expected_gid: int,
    expected_mode: int,
) -> LifecycleLock:
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(path, flags)
    except OSError as exc:
        raise Hold("training_service_lifecycle_lock_open_failed") from exc

    acquired = False
    try:
        if fcntl.fcntl(fd, fcntl.F_GETFD) & fcntl.FD_CLOEXEC == 0:
            hold("training_service_lifecycle_lock_cloexec_missing")
        dev, ino = _validate_locked_generation(
            fd,
            path,
            expected_blob,
            expected_uid,
            expected_gid,
            expected_mode,
        )
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise Hold("training_service_lifecycle_lock_busy") from exc
        except OSError as exc:
            raise Hold("training_service_lifecycle_lock_acquire_failed") from exc
        acquired = True
        _validate_locked_generation(
            fd,
            path,
            expected_blob,
            expected_uid,
            expected_gid,
            expected_mode,
            dev,
            ino,
        )
        return LifecycleLock(
            fd,
            path,
            dev,
            ino,
            expected_blob,
            expected_uid,
            expected_gid,
            expected_mode,
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
        UNIT_PATH,
        UNIT_GIT_BLOB_SHA1,
        0,
        0,
        UNIT_MODE,
    )


def self_test() -> None:
    assert UNIT_PATH == Path(
        "/etc/systemd/system/void-apollyon-training-bus-isolation-v1.service"
    )
    assert UNIT_GIT_BLOB_SHA1 == "62fbabe1cf7ae0d940f5d96e19b06282f841267b"
    assert UNIT_MODE == 0o644
    print(MARKER + "_SELF_TEST_GREEN")
    print("fixed_training_unit_lock_target=true")
    print("exact_unit_blob_bound=true")
    print("root_owned_mode_0644_required=true")
    print("nonblocking_exclusive_flock_required=true")
    print("fd_cloexec_required=true")
    print("visible_inode_generation_revalidated=true")
    print("filesystem_write=false")
    print("service_action=false")
    print("training_execution=false")
    print("funds_movement=false")


if __name__ == "__main__":
    self_test()
