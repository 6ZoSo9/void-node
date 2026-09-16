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

import datanet_ext4_inode_generation_v1 as inode_generation

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
        if exc.__class__.__name__.endswith("Hold"):
            raise
        hold("HOLD_RECORD_JSON", type(exc).__name__)
    if not isinstance(obj, dict) or canonical_bytes(obj) != raw:
        hold("HOLD_RECORD_NONCANONICAL", "")
    return obj


def _open_exact(root_fd: int, name: str, flags: int) -> int:
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    return os.open(name, flags | os.O_CLOEXEC, dir_fd=root_fd)


def _metadata(fd: int, root_fd: int, name: str, hold: Hold) -> tuple[os.stat_result, dict[str, Any]]:
    before = os.fstat(fd)
    visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(visible.st_mode):
        hold("HOLD_RECORD_NONREGULAR", name)
    if identity(before) != identity(visible):
        hold("HOLD_RECORD_PATH_IDENTITY", name)
    if before.st_uid != os.getuid() or before.st_nlink != 1 or stat.S_IMODE(before.st_mode) != 0o600:
        hold("HOLD_RECORD_METADATA", name)
    generation = inode_generation.observe_ext4_inode_generation_v1(fd)
    if generation["ioctl_calls"] != 1 or generation["setversion_issued"] is not False:
        hold("HOLD_RECORD_GENERATION_OBSERVATION", name)
    return before, generation


def read_exact(root_fd: int, name: str, max_bytes: int, hold: Hold, *, retain_fd: bool = False) -> dict[str, Any] | None:
    try:
        fd = _open_exact(root_fd, name, os.O_RDONLY)
    except FileNotFoundError:
        return None
    keep = False
    try:
        before, generation = _metadata(fd, root_fd, name, hold)
        if not (0 < before.st_size <= max_bytes):
            hold("HOLD_RECORD_SIZE", name)
        raw = bytearray()
        offset = 0
        while offset < before.st_size:
            chunk = os.pread(fd, before.st_size - offset, offset)
            if not chunk:
                hold("HOLD_RECORD_SHORT_READ", name)
            raw.extend(chunk)
            offset += len(chunk)
        if os.pread(fd, 1, before.st_size) != b"":
            hold("HOLD_RECORD_EXTRA_BYTES", name)
        after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        fingerprint = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns)
        if (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns) != fingerprint:
            hold("HOLD_RECORD_CHANGED_DURING_READ", name)
        if (visible_after.st_dev, visible_after.st_ino, visible_after.st_size, visible_after.st_mtime_ns, visible_after.st_ctime_ns) != fingerprint:
            hold("HOLD_RECORD_PATH_CHANGED_DURING_READ", name)
        data = bytes(raw)
        obj = parse_canonical(data, max_bytes, hold)
        expected_identity = identity(before)
        expected_generation = int(generation["generation"])
        if obj.get("record_identity") != expected_identity:
            hold("HOLD_RECORD_EMBEDDED_IDENTITY", name)
        if type(obj.get("record_generation")) is not int or obj["record_generation"] != expected_generation:
            hold("HOLD_RECORD_EMBEDDED_GENERATION", name)
        out = {
            "name": name,
            "raw": data,
            "sha256": digest(data),
            "record": obj,
            "identity": expected_identity,
            "generation": expected_generation,
            "generation_identity": f"{expected_identity}:{expected_generation}",
            "generation_ioctl_calls": 1,
            "setversion_issued": False,
        }
        if retain_fd:
            os.set_inheritable(fd, True)
            out["fd"] = fd
            keep = True
        return out
    finally:
        if not keep:
            os.close(fd)


def write_all(fd: int, data: bytes, hold: Hold) -> None:
    off = 0
    while off < len(data):
        n = os.write(fd, data[off:])
        if n <= 0:
            hold("HOLD_RECORD_WRITE", str(n))
        off += n


def create_marker(root_fd: int, name: str, base_obj: dict[str, Any], max_bytes: int, hold: Hold, *, retain_fd: bool = False) -> dict[str, Any]:
    if "record_identity" in base_obj or "record_generation" in base_obj:
        hold("HOLD_RECORD_BINDING_PRESET", name)
    flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(name, flags, 0o600, dir_fd=root_fd)
    except FileExistsError:
        hold("HOLD_RECORD_ALREADY_EXISTS", name)
    keep = False
    try:
        os.fchmod(fd, 0o600)
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_uid != os.getuid() or before.st_nlink != 1:
            hold("HOLD_RECORD_CREATE_METADATA", name)
        if before.st_size != 0 or stat.S_IMODE(before.st_mode) != 0o600:
            hold("HOLD_RECORD_CREATE_SHAPE", name)
        generation = inode_generation.observe_ext4_inode_generation_v1(fd)
        obj = dict(base_obj)
        obj["record_identity"] = identity(before)
        obj["record_generation"] = int(generation["generation"])
        raw = canonical_bytes(obj)
        if not (0 < len(raw) <= max_bytes):
            hold("HOLD_RECORD_SIZE", f"{name}:{len(raw)}")
        write_all(fd, raw, hold)
        os.fsync(fd)
        os.fsync(root_fd)
        after = os.fstat(fd)
        if identity(after) != obj["record_identity"] or after.st_size != len(raw):
            hold("HOLD_RECORD_CREATE_IDENTITY_DRIFT", name)
        reread = read_exact(root_fd, name, max_bytes, hold, retain_fd=False)
        if reread is None or reread["raw"] != raw or reread["generation"] != obj["record_generation"]:
            hold("HOLD_RECORD_READBACK", name)
        if retain_fd:
            os.set_inheritable(fd, True)
            reread["fd"] = fd
            keep = True
        return reread
    finally:
        if not keep:
            os.close(fd)
