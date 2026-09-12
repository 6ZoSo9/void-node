#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import errno
import hashlib
import os
from pathlib import Path
import stat
from typing import Any, Callable

import datanet_v39_recovery_record_io_v1 as v39_io
import prove_datanet_v40_fsverity_record_immutability_v1 as v40

SOURCE = Path(__file__).resolve()
V40_SOURCE = Path(v40.__file__).resolve()
Hold = Callable[[str, str], None]
VERITY_BLOCK_SIZE = 4096


def source_sha256() -> str:
    h = hashlib.sha256()
    for path in (SOURCE, v39_io.SOURCE, V40_SOURCE):
        data = path.read_bytes()
        h.update(len(data).to_bytes(8, "big"))
        h.update(data)
    return h.hexdigest()


canonical_bytes = v39_io.canonical_bytes
digest = v39_io.digest
identity = v39_io.identity
write_all = v39_io.write_all
parse_canonical = v39_io.parse_canonical


def _measure(fd: int, name: str, hold: Hold) -> dict[str, Any]:
    try:
        measured = v40.measure_verity(fd)
    except OSError as exc:
        hold("HOLD_RECORD_FSVERITY_REQUIRED", f"{name}:{exc.errno}")
    if measured.get("algorithm") != v40.FS_VERITY_HASH_ALG_SHA256 or measured.get("digest_size") != 32:
        hold("HOLD_RECORD_FSVERITY_DIGEST", name)
    return measured


def _expect_open_denied(root_fd: int, name: str, mode: int, label: str, hold: Hold) -> int:
    flags = mode | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(name, flags, dir_fd=root_fd)
    except OSError as exc:
        if exc.errno != errno.EPERM:
            hold("HOLD_RECORD_FSVERITY_MUTATION_ERRNO", f"{name}:{label}:{exc.errno}")
        return exc.errno
    else:
        os.close(fd)
        hold("HOLD_RECORD_FSVERITY_MUTATION_ALLOWED", f"{name}:{label}")
    raise AssertionError("unreachable")


def _expect_truncate_denied(root_fd: int, name: str, size: int, hold: Hold) -> int:
    try:
        os.truncate(f"/proc/self/fd/{root_fd}/{name}", max(0, size - 1))
    except OSError as exc:
        if exc.errno != errno.EPERM:
            hold("HOLD_RECORD_FSVERITY_MUTATION_ERRNO", f"{name}:truncate:{exc.errno}")
        return exc.errno
    hold("HOLD_RECORD_FSVERITY_MUTATION_ALLOWED", f"{name}:truncate")
    raise AssertionError("unreachable")


def _mutation_denials(root_fd: int, name: str, size: int, hold: Hold) -> dict[str, int | bool]:
    write_errno = _expect_open_denied(root_fd, name, os.O_WRONLY, "write", hold)
    rdwr_errno = _expect_open_denied(root_fd, name, os.O_RDWR, "rdwr", hold)
    truncate_errno = _expect_truncate_denied(root_fd, name, size, hold)
    return {
        "same_uid_write_denied": True,
        "same_uid_write_errno": write_errno,
        "same_uid_rdwr_denied": True,
        "same_uid_rdwr_errno": rdwr_errno,
        "same_uid_truncate_denied": True,
        "same_uid_truncate_errno": truncate_errno,
    }


def _read_fd_bytes(fd: int, size: int, name: str, hold: Hold) -> bytes:
    raw = bytearray()
    off = 0
    while off < size:
        chunk = os.pread(fd, size - off, off)
        if not chunk:
            hold("HOLD_RECORD_SHORT_READ", name)
        raw.extend(chunk)
        off += len(chunk)
    if os.pread(fd, 1, size) != b"":
        hold("HOLD_RECORD_EXTRA_BYTES", name)
    return bytes(raw)


def _open_bound_without_generation(root_fd: int, name: str, max_bytes: int, hold: Hold) -> tuple[int, os.stat_result, bytes]:
    fd = v39_io._open_exact(root_fd, name, os.O_RDONLY)
    try:
        st = os.fstat(fd)
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(visible.st_mode):
            hold("HOLD_RECORD_NONREGULAR", name)
        if identity(st) != identity(visible):
            hold("HOLD_RECORD_PATH_IDENTITY", name)
        if st.st_uid != os.getuid() or st.st_nlink != 1 or stat.S_IMODE(st.st_mode) != 0o600:
            hold("HOLD_RECORD_METADATA", name)
        if not (0 < st.st_size <= max_bytes):
            hold("HOLD_RECORD_SIZE", name)
        raw = _read_fd_bytes(fd, st.st_size, name, hold)
        parse_canonical(raw, max_bytes, hold)
        return fd, st, raw
    except Exception:
        os.close(fd)
        raise


def read_exact(root_fd: int, name: str, max_bytes: int, hold: Hold, *, retain_fd: bool = False) -> dict[str, Any] | None:
    item = v39_io.read_exact(root_fd, name, max_bytes, hold, retain_fd=True)
    if item is None:
        return None
    fd = int(item["fd"])
    keep = False
    try:
        item["fsverity"] = _measure(fd, name, hold)
        item["fsverity_measure_ioctl_calls"] = 1
        item.update(_mutation_denials(root_fd, name, len(item["raw"]), hold))
        if retain_fd:
            os.set_inheritable(fd, True)
            keep = True
        else:
            item.pop("fd", None)
        return item
    finally:
        if not keep:
            os.close(fd)


def seal_existing(root_fd: int, name: str, max_bytes: int, hold: Hold, *, expected_sha256: str | None = None) -> dict[str, Any]:
    fd, before, raw = _open_bound_without_generation(root_fd, name, max_bytes, hold)
    try:
        actual_sha256 = digest(raw)
        if expected_sha256 is not None and actual_sha256 != expected_sha256:
            hold("HOLD_RECORD_PREVERITY_DIGEST", name)
        try:
            v40.enable_verity(fd, VERITY_BLOCK_SIZE)
        except OSError as exc:
            hold("HOLD_RECORD_FSVERITY_ENABLE", f"{name}:{exc.errno}")
        os.fsync(fd)
        measured = _measure(fd, name, hold)
        after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        if identity(after) != identity(before) or identity(visible_after) != identity(before) or after.st_size != before.st_size:
            hold("HOLD_RECORD_POSTVERITY_IDENTITY_DRIFT", name)
        if _read_fd_bytes(fd, after.st_size, name, hold) != raw:
            hold("HOLD_RECORD_POSTVERITY_CONTENT_DRIFT", name)
        denials = _mutation_denials(root_fd, name, len(raw), hold)
        return {
            "name": name,
            "identity": identity(before),
            "bytes": len(raw),
            "sha256": actual_sha256,
            "fsverity": measured,
            "fsverity_enable_ioctl_calls": 1,
            "fsverity_measure_ioctl_calls": 1,
            **denials,
        }
    finally:
        os.close(fd)


def create_marker(root_fd: int, name: str, base_obj: dict[str, Any], max_bytes: int, hold: Hold, *, retain_fd: bool = False) -> dict[str, Any]:
    # Preserve V39's exact create/generation/write/readback sequence, but do not
    # retain its writable creator FD. fs-verity is enabled only after that FD and
    # V39's readback FD have both closed.
    created = v39_io.create_marker(root_fd, name, base_obj, max_bytes, hold, retain_fd=False)
    fd, st, raw = _open_bound_without_generation(root_fd, name, max_bytes, hold)
    keep = False
    try:
        if identity(st) != created["identity"] or raw != created["raw"] or digest(raw) != created["sha256"]:
            hold("HOLD_RECORD_PREVERITY_DRIFT", name)
        try:
            v40.enable_verity(fd, VERITY_BLOCK_SIZE)
        except OSError as exc:
            hold("HOLD_RECORD_FSVERITY_ENABLE", f"{name}:{exc.errno}")
        os.fsync(fd)
        measured = _measure(fd, name, hold)
        after = os.fstat(fd)
        if identity(after) != created["identity"] or after.st_size != len(raw):
            hold("HOLD_RECORD_POSTVERITY_BINDING_DRIFT", name)
        if _read_fd_bytes(fd, after.st_size, name, hold) != raw:
            hold("HOLD_RECORD_POSTVERITY_CONTENT_DRIFT", name)
        item = dict(created)
        item["fsverity"] = measured
        item["fsverity_enable_ioctl_calls"] = 1
        item["fsverity_measure_ioctl_calls"] = 1
        item.update(_mutation_denials(root_fd, name, len(item["raw"]), hold))
        if retain_fd:
            os.set_inheritable(fd, True)
            item["fd"] = fd
            keep = True
        return item
    finally:
        if not keep:
            os.close(fd)
