#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat
from typing import Any, Callable

SOURCE = Path(__file__).resolve()
Hold = Callable[[str, str], None]


def source_sha256() -> str:
    return hashlib.sha256(SOURCE.read_bytes()).hexdigest()


def canonical_bytes(obj: dict[str, Any]) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("ascii")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def _strict_object(pairs, hold: Hold):
    out = {}
    for key, value in pairs:
        if key in out:
            hold("HOLD_DUPLICATE_JSON_KEY", str(key))
        out[key] = value
    return out


def parse_canonical(raw: bytes, max_bytes: int, hold: Hold) -> dict[str, Any]:
    if not raw or len(raw) > max_bytes:
        hold("HOLD_RECORD_SIZE", str(len(raw)))
    try:
        obj = json.loads(raw.decode("ascii"), object_pairs_hook=lambda pairs: _strict_object(pairs, hold))
    except Exception as exc:
        if exc.__class__.__name__ == "RecoveryHold":
            raise
        hold("HOLD_RECORD_JSON", type(exc).__name__)
    if not isinstance(obj, dict) or canonical_bytes(obj) != raw:
        hold("HOLD_RECORD_NONCANONICAL", "")
    return obj


def read_exact(root_fd: int, name: str, max_bytes: int, hold: Hold) -> dict[str, Any] | None:
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(name, flags, dir_fd=root_fd)
    except FileNotFoundError:
        return None
    try:
        before = os.fstat(fd)
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(visible.st_mode):
            hold("HOLD_RECORD_NONREGULAR", name)
        if identity(before) != identity(visible):
            hold("HOLD_RECORD_PATH_IDENTITY", name)
        if before.st_uid != os.getuid() or before.st_nlink != 1 or stat.S_IMODE(before.st_mode) != 0o600:
            hold("HOLD_RECORD_METADATA", name)
        if not (0 < before.st_size <= max_bytes):
            hold("HOLD_RECORD_SIZE", name)
        raw = bytearray()
        while len(raw) < before.st_size:
            chunk = os.read(fd, before.st_size - len(raw))
            if not chunk:
                hold("HOLD_RECORD_SHORT_READ", name)
            raw.extend(chunk)
        if os.read(fd, 1) != b"":
            hold("HOLD_RECORD_EXTRA_BYTES", name)
        after = os.fstat(fd)
        if (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns) != (
            before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns
        ):
            hold("HOLD_RECORD_CHANGED_DURING_READ", name)
        data = bytes(raw)
        return {"name": name, "raw": data, "sha256": digest(data), "record": parse_canonical(data, max_bytes, hold)}
    finally:
        os.close(fd)


def write_all(fd: int, data: bytes, hold: Hold) -> None:
    off = 0
    while off < len(data):
        n = os.write(fd, data[off:])
        if n <= 0:
            hold("HOLD_RECORD_WRITE", str(n))
        off += n


def create_marker(root_fd: int, name: str, obj: dict[str, Any], max_bytes: int, hold: Hold) -> dict[str, Any]:
    raw = canonical_bytes(obj)
    if not (0 < len(raw) <= max_bytes):
        hold("HOLD_RECORD_SIZE", f"{name}:{len(raw)}")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(name, flags, 0o600, dir_fd=root_fd)
    except FileExistsError:
        hold("HOLD_RECORD_ALREADY_EXISTS", name)
    try:
        os.fchmod(fd, 0o600)
        write_all(fd, raw, hold)
        os.fsync(fd)
    finally:
        os.close(fd)
    os.fsync(root_fd)
    reread = read_exact(root_fd, name, max_bytes, hold)
    if reread is None or reread["raw"] != raw:
        hold("HOLD_RECORD_READBACK", name)
    return reread
