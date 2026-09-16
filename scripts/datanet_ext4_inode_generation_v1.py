#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import ctypes
import fcntl
import hashlib
import os
from pathlib import Path
import stat
import sys

SOURCE = Path(__file__).resolve()
EXT4_IOC_GETVERSION = 0x80086603
U32_MAX = (1 << 32) - 1


def source_sha256() -> str:
    return hashlib.sha256(SOURCE.read_bytes()).hexdigest()


def executable_sha256() -> str:
    return hashlib.sha256(Path(sys.executable).resolve().read_bytes()).hexdigest()


def _snapshot(fd: int) -> dict:
    st = os.fstat(fd)
    return {
        "dev": st.st_dev,
        "ino": st.st_ino,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "size": st.st_size,
        "mode": stat.S_IMODE(st.st_mode),
        "nlink": st.st_nlink,
        "is_regular": stat.S_ISREG(st.st_mode),
    }


def _required_identity(snapshot: dict) -> tuple:
    return (
        snapshot["dev"],
        snapshot["ino"],
        snapshot["uid"],
        snapshot["size"],
        snapshot["is_regular"],
    )


def observe_ext4_inode_generation_v1(fd: int) -> dict:
    """Read ext4 i_generation from one already-open exact regular-file fd.

    This primitive is observation-only. It performs exactly one GETVERSION ioctl,
    issues no SETVERSION-class operation, and requires the caller-visible fd
    identity to remain stable around the ioctl.
    """
    if not isinstance(fd, int) or isinstance(fd, bool) or fd < 0:
        raise RuntimeError("VOID_EXT4_GENERATION_V1:FD_INVALID")

    before = _snapshot(fd)
    if not before["is_regular"]:
        raise RuntimeError("VOID_EXT4_GENERATION_V1:FD_NOT_REGULAR")

    native_long_bytes = ctypes.sizeof(ctypes.c_long)
    buffer = bytearray(native_long_bytes)
    fcntl.ioctl(fd, EXT4_IOC_GETVERSION, buffer, True)
    generation = int.from_bytes(buffer, byteorder=sys.byteorder, signed=False) & U32_MAX

    after = _snapshot(fd)
    if _required_identity(before) != _required_identity(after):
        raise RuntimeError("VOID_EXT4_GENERATION_V1:FD_IDENTITY_DRIFT")
    if not 0 <= generation <= U32_MAX:
        raise RuntimeError("VOID_EXT4_GENERATION_V1:GENERATION_RANGE")

    return {
        "format": "VOID_EXT4_INODE_GENERATION_V1",
        "generation": generation,
        "ioctl_calls": 1,
        "ioctl_command": "EXT4_IOC_GETVERSION",
        "ioctl_hex": hex(EXT4_IOC_GETVERSION),
        "native_long_bytes": native_long_bytes,
        "setversion_issued": False,
        "before": before,
        "after": after,
        "identity_stable": True,
        "source_sha256": source_sha256(),
    }
