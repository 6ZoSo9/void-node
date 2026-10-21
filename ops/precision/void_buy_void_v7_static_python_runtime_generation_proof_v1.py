#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import resource
import shutil
import socket
import stat
import struct
import subprocess
import tempfile
from typing import Any

MARKER = "VOID_BUY_VOID_V7_STATIC_PYTHON_RUNTIME_GENERATION_PROOF_V1"
SCHEMA = "void_buy_void_v7_static_python_runtime_generation_proof_v1"
RUNTIME_UID = 1000
RUNTIME_GID = 1000

V5_REL = "ops/precision/void_buy_void_v7_protected_substrate_install_v5.py"
V5_GIT_BLOB = "632f3371ad3095e6a8fdf338b24c34431abe7d2c"
V5_BYTES = 89416
V5_SHA256 = "6a2c7de4fd55b2778cd7eb6c625d3b16cea068f9fbf9beb74adf2a04f433c14b"

MAX_CANDIDATE_BYTES = 512 * 1024 * 1024
MAX_CHILD_OUTPUT = 1024 * 1024
CHUNK = 1024 * 1024

F_ADD_SEALS = getattr(fcntl, "F_ADD_SEALS", 1033)
F_GET_SEALS = getattr(fcntl, "F_GET_SEALS", 1034)
F_SEAL_SEAL = getattr(fcntl, "F_SEAL_SEAL", 0x0001)
F_SEAL_SHRINK = getattr(fcntl, "F_SEAL_SHRINK", 0x0002)
F_SEAL_GROW = getattr(fcntl, "F_SEAL_GROW", 0x0004)
F_SEAL_WRITE = getattr(fcntl, "F_SEAL_WRITE", 0x0008)
REQUIRED_SEALS = F_SEAL_SEAL | F_SEAL_SHRINK | F_SEAL_GROW | F_SEAL_WRITE
MFD_ALLOW_SEALING = getattr(os, "MFD_ALLOW_SEALING", 0x0002)
MFD_CLOEXEC = getattr(os, "MFD_CLOEXEC", 0x0001)

# x86-64 Linux ABI. The candidate itself is required to be x86-64 ET_EXEC.
SYS_LANDLOCK_CREATE_RULESET = 444
SYS_LANDLOCK_ADD_RULE = 445
SYS_LANDLOCK_RESTRICT_SELF = 446
LANDLOCK_CREATE_RULESET_VERSION = 1
LANDLOCK_RULE_PATH_BENEATH = 1

LANDLOCK_ACCESS_FS_EXECUTE = 1 << 0
LANDLOCK_ACCESS_FS_WRITE_FILE = 1 << 1
LANDLOCK_ACCESS_FS_READ_FILE = 1 << 2
LANDLOCK_ACCESS_FS_READ_DIR = 1 << 3
LANDLOCK_ACCESS_FS_REMOVE_DIR = 1 << 4
LANDLOCK_ACCESS_FS_REMOVE_FILE = 1 << 5
LANDLOCK_ACCESS_FS_MAKE_CHAR = 1 << 6
LANDLOCK_ACCESS_FS_MAKE_DIR = 1 << 7
LANDLOCK_ACCESS_FS_MAKE_REG = 1 << 8
LANDLOCK_ACCESS_FS_MAKE_SOCK = 1 << 9
LANDLOCK_ACCESS_FS_MAKE_FIFO = 1 << 10
LANDLOCK_ACCESS_FS_MAKE_BLOCK = 1 << 11
LANDLOCK_ACCESS_FS_MAKE_SYM = 1 << 12
LANDLOCK_ACCESS_FS_REFER = 1 << 13
LANDLOCK_ACCESS_FS_TRUNCATE = 1 << 14
LANDLOCK_HANDLED_FS_V3 = (1 << 15) - 1

PR_SET_DUMPABLE = 4
PR_SET_NO_NEW_PRIVS = 38
PR_SET_SECCOMP = 22
SECCOMP_MODE_FILTER = 2
SECCOMP_RET_KILL_PROCESS = 0x80000000
SECCOMP_RET_ERRNO = 0x00050000
SECCOMP_RET_ALLOW = 0x7FFF0000
AUDIT_ARCH_X86_64 = 0xC000003E
X32_SYSCALL_BIT = 0x40000000

BPF_LD = 0x00
BPF_W = 0x00
BPF_ABS = 0x20
BPF_JMP = 0x05
BPF_JEQ = 0x10
BPF_JGE = 0x30
BPF_K = 0x00
BPF_RET = 0x06

# No network, process spawning/control, namespaces/mounts, io_uring, kernel
# key/BPF/perf/module surfaces, or handle-based filesystem escape.
CLONE_NEWNS = 0x00020000
CLONE_NEWUSER = 0x10000000
MS_RDONLY = 1
MS_NOSUID = 2
MS_NODEV = 4
MS_NOEXEC = 8
MS_REMOUNT = 32
MS_BIND = 4096
MS_REC = 16384
MS_PRIVATE = 1 << 18
SYS_CAPSET = 126
LINUX_CAPABILITY_VERSION_3 = 0x20080522
SNAPSHOT_TMP_BYTES = 64 * 1024 * 1024

SECCOMP_DENIED_SYSCALLS = (
    29, 30, 31,                    # SysV shared memory
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,
    56, 57, 58, 62,                # clone/fork/vfork/kill
    64, 65, 66, 67, 68, 69, 70, 71,  # SysV IPC
    101, 135, 141, 142, 144,       # ptrace/personality/scheduler mutation
    155, 157, 163, 165, 166, 167, 168, 169, 170, 171, 172, 173,
    175, 176, 200, 203, 234, 246, 248, 249, 250, 272,
    298, 300, 302, 303, 304, 308, 310, 311, 312, 313, 317,
    320, 321, 323,
    424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435,
    438, 440, 442,
)

class _LandlockRulesetAttr(ctypes.Structure):
    _fields_ = [("handled_access_fs", ctypes.c_uint64)]

class _LandlockPathBeneathAttr(ctypes.Structure):
    _fields_ = [
        ("allowed_access", ctypes.c_uint64),
        ("parent_fd", ctypes.c_int32),
        ("reserved", ctypes.c_uint32),
    ]

class _CapHeader(ctypes.Structure):
    _fields_ = [
        ("version", ctypes.c_uint32),
        ("pid", ctypes.c_int32),
    ]

class _CapData(ctypes.Structure):
    _fields_ = [
        ("effective", ctypes.c_uint32),
        ("permitted", ctypes.c_uint32),
        ("inheritable", ctypes.c_uint32),
    ]

class _SockFilter(ctypes.Structure):
    _fields_ = [
        ("code", ctypes.c_ushort),
        ("jt", ctypes.c_ubyte),
        ("jf", ctypes.c_ubyte),
        ("k", ctypes.c_uint32),
    ]

class _SockFprog(ctypes.Structure):
    _fields_ = [
        ("len", ctypes.c_ushort),
        ("filter", ctypes.POINTER(_SockFilter)),
    ]

class RuntimeProofError(RuntimeError):
    pass

def canonical(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)

def _identity(st: os.stat_result) -> tuple[int, ...]:
    return (
        st.st_dev, st.st_ino, st.st_mode, st.st_uid, st.st_gid,
        st.st_nlink, st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )

def _hex64(value: str, label: str) -> str:
    if len(value) != 64 or any(ch not in "0123456789abcdef" for ch in value):
        raise RuntimeProofError(label + "_invalid")
    return value

def _positive_int(value: str, label: str) -> int:
    if not value.isdecimal():
        raise RuntimeProofError(label + "_invalid")
    parsed = int(value, 10)
    if parsed < 1 or parsed > MAX_CANDIDATE_BYTES:
        raise RuntimeProofError(label + "_invalid")
    return parsed

def _open_exact(path: Path, *, expected_size: int, expected_sha256: str, label: str) -> int:
    before = os.lstat(path)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink < 1
        or before.st_size != expected_size
    ):
        raise RuntimeProofError(label + "_shape_mismatch")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        if _identity(opened) != _identity(before):
            raise RuntimeProofError(label + "_generation_rebound")
        h = hashlib.sha256()
        remaining = opened.st_size
        while remaining:
            part = os.read(fd, min(CHUNK, remaining))
            if not part:
                raise RuntimeProofError(label + "_short_read")
            h.update(part)
            remaining -= len(part)
        if os.read(fd, 1):
            raise RuntimeProofError(label + "_grew_during_read")
        after = os.fstat(fd)
        visible = os.lstat(path)
        if _identity(after) != _identity(opened) or _identity(visible) != _identity(opened):
            raise RuntimeProofError(label + "_generation_changed")
        if h.hexdigest() != expected_sha256:
            raise RuntimeProofError(label + "_sha256_mismatch")
        os.lseek(fd, 0, os.SEEK_SET)
        return fd
    except BaseException:
        os.close(fd)
        raise

def _read_at(fd: int, offset: int, size: int, label: str) -> bytes:
    if size < 0 or size > 16 * 1024 * 1024:
        raise RuntimeProofError(label + "_read_size_invalid")
    raw = os.pread(fd, size, offset)
    if len(raw) != size:
        raise RuntimeProofError(label + "_short_read")
    return raw

def _require_static_python_elf(fd: int, expected_size: int) -> None:
    if expected_size < 64:
        raise RuntimeProofError("python_elf_too_small")
    eh = _read_at(fd, 0, 64, "python_elf_header")
    if eh[:4] != b"\x7fELF" or eh[4] != 2 or eh[5] != 1 or eh[6] != 1:
        raise RuntimeProofError("python_elf64_little_endian_required")
    e_type, e_machine = struct.unpack_from("<HH", eh, 16)
    if e_type != 2 or e_machine != 62:
        raise RuntimeProofError("python_elf_x86_64_et_exec_required")
    e_phoff = struct.unpack_from("<Q", eh, 32)[0]
    e_phentsize, e_phnum = struct.unpack_from("<HH", eh, 54)
    if e_phentsize < 56 or e_phnum < 1 or e_phnum > 1024:
        raise RuntimeProofError("python_program_header_table_invalid")
    table_bytes = e_phentsize * e_phnum
    if e_phoff > expected_size or table_bytes > expected_size or e_phoff + table_bytes > expected_size:
        raise RuntimeProofError("python_program_header_table_bounds_invalid")
    table = _read_at(fd, e_phoff, table_bytes, "python_program_headers")
    has_load = False
    for index in range(e_phnum):
        p_type = struct.unpack_from("<I", table, index * e_phentsize)[0]
        if p_type == 1:
            has_load = True
        if p_type == 2:
            raise RuntimeProofError("python_elf_pt_dynamic_forbidden")
        if p_type == 3:
            raise RuntimeProofError("python_elf_pt_interp_forbidden")
    if not has_load:
        raise RuntimeProofError("python_elf_pt_load_required")
    os.lseek(fd, 0, os.SEEK_SET)

def _copy_fd_exact(source_fd: int, target: Path, *, size: int, mode: int, label: str) -> None:
    out = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC, mode)
    try:
        os.lseek(source_fd, 0, os.SEEK_SET)
        remaining = size
        while remaining:
            part = os.read(source_fd, min(CHUNK, remaining))
            if not part:
                raise RuntimeProofError(label + "_source_short_read")
            view = memoryview(part)
            while view:
                wrote = os.write(out, view)
                if wrote <= 0:
                    raise RuntimeProofError(label + "_copy_short_write")
                view = view[wrote:]
            remaining -= len(part)
        if os.read(source_fd, 1):
            raise RuntimeProofError(label + "_source_grew")
        os.fsync(out)
    finally:
        os.close(out)
    os.chmod(target, mode)
    os.lseek(source_fd, 0, os.SEEK_SET)

def _seal_memfd(fd: int, *, mode: int, label: str) -> None:
    os.fchmod(fd, mode)
    os.fsync(fd)
    os.lseek(fd, 0, os.SEEK_SET)
    fcntl.fcntl(fd, F_ADD_SEALS, REQUIRED_SEALS)
    seals = fcntl.fcntl(fd, F_GET_SEALS)
    if seals & REQUIRED_SEALS != REQUIRED_SEALS:
        raise RuntimeProofError(label + "_memfd_seals_missing")
    try:
        os.write(fd, b"x")
    except OSError as exc:
        if exc.errno != errno.EPERM:
            raise RuntimeProofError(label + "_memfd_write_seal_wrong_errno") from exc
    else:
        raise RuntimeProofError(label + "_memfd_write_seal_ineffective")
    os.lseek(fd, 0, os.SEEK_SET)

def _sealed_memfd(raw: bytes, label: str, *, mode: int = 0o400) -> int:
    if not hasattr(os, "memfd_create"):
        raise RuntimeProofError("memfd_create_unavailable")
    fd = os.memfd_create(label, MFD_ALLOW_SEALING)
    try:
        position = 0
        while position < len(raw):
            wrote = os.write(fd, raw[position:])
            if wrote <= 0:
                raise RuntimeProofError(label + "_memfd_short_write")
            position += wrote
        _seal_memfd(fd, mode=mode, label=label)
        return fd
    except BaseException:
        os.close(fd)
        raise

def _sealed_snapshot_from_fd(
    source_fd: int,
    *,
    size: int,
    expected_sha256: str,
    mode: int,
    label: str,
) -> int:
    if not hasattr(os, "memfd_create"):
        raise RuntimeProofError("memfd_create_unavailable")
    snapshot = os.memfd_create(label, MFD_ALLOW_SEALING)
    try:
        os.lseek(source_fd, 0, os.SEEK_SET)
        h = hashlib.sha256()
        remaining = size
        while remaining:
            part = os.read(source_fd, min(CHUNK, remaining))
            if not part:
                raise RuntimeProofError(label + "_snapshot_source_short_read")
            h.update(part)
            view = memoryview(part)
            while view:
                wrote = os.write(snapshot, view)
                if wrote <= 0:
                    raise RuntimeProofError(label + "_snapshot_short_write")
                view = view[wrote:]
            remaining -= len(part)
        if os.read(source_fd, 1):
            raise RuntimeProofError(label + "_snapshot_source_grew")
        if h.hexdigest() != expected_sha256:
            raise RuntimeProofError(label + "_snapshot_sha256_mismatch")
        _seal_memfd(snapshot, mode=mode, label=label)
        os.lseek(source_fd, 0, os.SEEK_SET)
        return snapshot
    except BaseException:
        os.close(snapshot)
        raise

def _libc() -> ctypes.CDLL:
    return ctypes.CDLL(None, use_errno=True)

def _syscall(number: int, *args: object) -> int:
    libc = _libc()
    libc.syscall.restype = ctypes.c_long
    result = libc.syscall(number, *args)
    if result < 0:
        err = ctypes.get_errno()
        raise OSError(err, os.strerror(err))
    return int(result)

def _landlock_abi() -> int:
    if os.uname().machine != "x86_64":
        raise RuntimeProofError("sandbox_x86_64_host_required")
    try:
        return _syscall(
            SYS_LANDLOCK_CREATE_RULESET,
            ctypes.c_void_p(),
            ctypes.c_size_t(0),
            ctypes.c_uint(LANDLOCK_CREATE_RULESET_VERSION),
        )
    except OSError as exc:
        raise RuntimeProofError("landlock_unavailable:errno_" + str(exc.errno)) from exc

def _landlock_add_path_rule(ruleset_fd: int, path: Path, allowed: int) -> None:
    flags = getattr(os, "O_PATH", 0)
    if not flags:
        raise RuntimeProofError("o_path_unavailable")
    parent_fd = os.open(path, flags | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        attr = _LandlockPathBeneathAttr(
            allowed_access=allowed,
            parent_fd=parent_fd,
            reserved=0,
        )
        _syscall(
            SYS_LANDLOCK_ADD_RULE,
            ctypes.c_int(ruleset_fd),
            ctypes.c_int(LANDLOCK_RULE_PATH_BENEATH),
            ctypes.byref(attr),
            ctypes.c_uint(0),
        )
    finally:
        os.close(parent_fd)

def _apply_landlock(runtime_root: Path) -> None:
    abi = _landlock_abi()
    if abi < 3:
        raise RuntimeProofError("landlock_abi_v3_required")

    attr = _LandlockRulesetAttr(handled_access_fs=LANDLOCK_HANDLED_FS_V3)
    try:
        ruleset_fd = _syscall(
            SYS_LANDLOCK_CREATE_RULESET,
            ctypes.byref(attr),
            ctypes.c_size_t(ctypes.sizeof(attr)),
            ctypes.c_uint(0),
        )
    except OSError as exc:
        raise RuntimeProofError("landlock_ruleset_create_failed:errno_" + str(exc.errno)) from exc

    try:
        # Root traversal only. Read/execute authority is delegated narrowly.
        _landlock_add_path_rule(
            ruleset_fd,
            runtime_root,
            LANDLOCK_ACCESS_FS_READ_DIR,
        )
        _landlock_add_path_rule(
            ruleset_fd,
            runtime_root / "bin",
            LANDLOCK_ACCESS_FS_READ_DIR
            | LANDLOCK_ACCESS_FS_READ_FILE
            | LANDLOCK_ACCESS_FS_EXECUTE,
        )
        _landlock_add_path_rule(
            ruleset_fd,
            runtime_root / "lib",
            LANDLOCK_ACCESS_FS_READ_DIR | LANDLOCK_ACCESS_FS_READ_FILE,
        )
        # V5 self-test needs temporary regular files, dirs, FIFO and symlinks,
        # but it never needs to execute from scratch.
        _landlock_add_path_rule(
            ruleset_fd,
            runtime_root / "tmp",
            LANDLOCK_ACCESS_FS_WRITE_FILE
            | LANDLOCK_ACCESS_FS_READ_FILE
            | LANDLOCK_ACCESS_FS_READ_DIR
            | LANDLOCK_ACCESS_FS_REMOVE_DIR
            | LANDLOCK_ACCESS_FS_REMOVE_FILE
            | LANDLOCK_ACCESS_FS_MAKE_DIR
            | LANDLOCK_ACCESS_FS_MAKE_REG
            | LANDLOCK_ACCESS_FS_MAKE_FIFO
            | LANDLOCK_ACCESS_FS_MAKE_SYM
            | LANDLOCK_ACCESS_FS_REFER
            | LANDLOCK_ACCESS_FS_TRUNCATE,
        )

        libc = _libc()
        libc.prctl.argtypes = [
            ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong,
            ctypes.c_ulong, ctypes.c_ulong,
        ]
        libc.prctl.restype = ctypes.c_int
        if libc.prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0:
            err = ctypes.get_errno()
            raise RuntimeProofError("no_new_privs_failed:errno_" + str(err))
        if libc.prctl(PR_SET_DUMPABLE, 0, 0, 0, 0) != 0:
            err = ctypes.get_errno()
            raise RuntimeProofError("dumpable_disable_failed:errno_" + str(err))
        try:
            _syscall(
                SYS_LANDLOCK_RESTRICT_SELF,
                ctypes.c_int(ruleset_fd),
                ctypes.c_uint(0),
            )
        except OSError as exc:
            raise RuntimeProofError("landlock_restrict_failed:errno_" + str(exc.errno)) from exc
    finally:
        os.close(ruleset_fd)

def _stmt(code: int, k: int) -> _SockFilter:
    return _SockFilter(code=code, jt=0, jf=0, k=k)

def _jump(code: int, k: int, jt: int, jf: int) -> _SockFilter:
    return _SockFilter(code=code, jt=jt, jf=jf, k=k)

def _apply_seccomp() -> None:
    filters: list[_SockFilter] = [
        _stmt(BPF_LD | BPF_W | BPF_ABS, 4),
        _jump(BPF_JMP | BPF_JEQ | BPF_K, AUDIT_ARCH_X86_64, 1, 0),
        _stmt(BPF_RET | BPF_K, SECCOMP_RET_KILL_PROCESS),
        _stmt(BPF_LD | BPF_W | BPF_ABS, 0),
        _jump(BPF_JMP | BPF_JGE | BPF_K, X32_SYSCALL_BIT, 0, 1),
        _stmt(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | errno.EPERM),
    ]
    for syscall_number in SECCOMP_DENIED_SYSCALLS:
        filters.append(_jump(BPF_JMP | BPF_JEQ | BPF_K, syscall_number, 0, 1))
        filters.append(_stmt(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | errno.EPERM))
    filters.append(_stmt(BPF_RET | BPF_K, SECCOMP_RET_ALLOW))

    array_type = _SockFilter * len(filters)
    array = array_type(*filters)
    program = _SockFprog(
        len=len(filters),
        filter=ctypes.cast(array, ctypes.POINTER(_SockFilter)),
    )
    libc = _libc()
    libc.prctl.argtypes = [
        ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong,
        ctypes.c_ulong, ctypes.c_ulong,
    ]
    libc.prctl.restype = ctypes.c_int
    if libc.prctl(
        PR_SET_SECCOMP,
        SECCOMP_MODE_FILTER,
        ctypes.cast(ctypes.byref(program), ctypes.c_void_p).value,
        0,
        0,
    ) != 0:
        err = ctypes.get_errno()
        raise RuntimeProofError("seccomp_install_failed:errno_" + str(err))

def _child_limits() -> None:
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_CPU, (15, 15))
    resource.setrlimit(resource.RLIMIT_AS, (2 * 1024 * 1024 * 1024, 2 * 1024 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_CHILD_OUTPUT, MAX_CHILD_OUTPUT))
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    if hasattr(resource, "RLIMIT_NPROC"):
        resource.setrlimit(resource.RLIMIT_NPROC, (0, 0))

def _write_all(path: str, raw: bytes, label: str) -> None:
    fd = os.open(path, os.O_WRONLY | os.O_CLOEXEC)
    try:
        view = memoryview(raw)
        while view:
            wrote = os.write(fd, view)
            if wrote <= 0:
                raise RuntimeProofError(label + "_short_write")
            view = view[wrote:]
    finally:
        os.close(fd)

def _mount(
    source: str | None,
    target: Path,
    fstype: str | None,
    flags: int,
    data: str | None,
    label: str,
) -> None:
    libc = _libc()
    libc.mount.argtypes = [
        ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p,
        ctypes.c_ulong, ctypes.c_void_p,
    ]
    libc.mount.restype = ctypes.c_int
    source_b = None if source is None else os.fsencode(source)
    fstype_b = None if fstype is None else os.fsencode(fstype)
    data_b = None if data is None else os.fsencode(data)
    if libc.mount(
        source_b,
        os.fsencode(target),
        fstype_b,
        flags,
        None if data_b is None else ctypes.c_char_p(data_b),
    ) != 0:
        err = ctypes.get_errno()
        raise RuntimeProofError(label + "_mount_failed:errno_" + str(err))

def _drop_namespace_capabilities() -> None:
    header = _CapHeader(version=LINUX_CAPABILITY_VERSION_3, pid=0)
    data_type = _CapData * 2
    data = data_type()
    try:
        _syscall(SYS_CAPSET, ctypes.byref(header), ctypes.byref(data))
    except OSError as exc:
        raise RuntimeProofError("namespace_capability_drop_failed:errno_" + str(exc.errno)) from exc

def _bind_sealed_fd(fd: int, target: Path, *, mode: int, label: str) -> None:
    created = os.open(
        target,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC,
        mode,
    )
    os.close(created)
    source = "/proc/self/fd/" + str(fd)
    _mount(source, target, None, MS_BIND, None, label + "_bind")
    _mount(
        None,
        target,
        None,
        MS_BIND | MS_REMOUNT | MS_RDONLY | MS_NOSUID | MS_NODEV,
        None,
        label + "_readonly",
    )

def _prepare_private_runtime_snapshot(
    mount_root: Path,
    python_snapshot_fd: int,
    stdlib_snapshot_fd: int,
) -> None:
    outer_uid = os.getuid()
    outer_gid = os.getgid()

    libc = _libc()
    libc.prctl.argtypes = [
        ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong,
        ctypes.c_ulong, ctypes.c_ulong,
    ]
    libc.prctl.restype = ctypes.c_int
    if libc.prctl(PR_SET_DUMPABLE, 0, 0, 0, 0) != 0:
        err = ctypes.get_errno()
        raise RuntimeProofError("snapshot_dumpable_disable_failed:errno_" + str(err))

    libc.unshare.argtypes = [ctypes.c_int]
    libc.unshare.restype = ctypes.c_int
    if libc.unshare(CLONE_NEWUSER | CLONE_NEWNS) != 0:
        err = ctypes.get_errno()
        raise RuntimeProofError("user_mount_namespace_unavailable:errno_" + str(err))

    _write_all("/proc/self/setgroups", b"deny\n", "setgroups_deny")
    _write_all(
        "/proc/self/uid_map",
        ("1000 " + str(outer_uid) + " 1\n").encode("ascii"),
        "uid_map",
    )
    _write_all(
        "/proc/self/gid_map",
        ("1000 " + str(outer_gid) + " 1\n").encode("ascii"),
        "gid_map",
    )
    if os.getuid() != 1000 or os.geteuid() != 1000 or os.getgid() != 1000 or os.getegid() != 1000:
        raise RuntimeProofError("namespace_runtime_identity_mapping_failed")

    _mount(None, Path("/"), None, MS_REC | MS_PRIVATE, None, "mount_propagation_private")
    _mount(
        "tmpfs",
        mount_root,
        "tmpfs",
        MS_NOSUID | MS_NODEV,
        "mode=0700,size=16m",
        "runtime_root_tmpfs",
    )
    (mount_root / "bin").mkdir(mode=0o700)
    (mount_root / "lib").mkdir(mode=0o700)
    (mount_root / "tmp").mkdir(mode=0o700)
    (mount_root / "synthetic-repo" / "ops" / "precision").mkdir(parents=True, mode=0o700)

    _mount(
        "tmpfs",
        mount_root / "tmp",
        "tmpfs",
        MS_NOSUID | MS_NODEV | MS_NOEXEC,
        "mode=0700,size=" + str(SNAPSHOT_TMP_BYTES),
        "runtime_tmp_tmpfs",
    )
    _bind_sealed_fd(
        python_snapshot_fd,
        mount_root / "bin" / "python3.12-static",
        mode=0o555,
        label="python_snapshot",
    )
    _bind_sealed_fd(
        stdlib_snapshot_fd,
        mount_root / "lib" / "python312.zip",
        mode=0o444,
        label="stdlib_snapshot",
    )

    _mount(
        None,
        mount_root,
        None,
        MS_REMOUNT | MS_RDONLY | MS_NOSUID | MS_NODEV,
        None,
        "runtime_root_readonly",
    )

    root_fd = os.open(
        mount_root,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    try:
        os.fchdir(root_fd)
        os.chroot(".")
        os.chdir("/")
    finally:
        os.close(root_fd)

    os.close(python_snapshot_fd)
    os.close(stdlib_snapshot_fd)
    _drop_namespace_capabilities()

def _apply_candidate_sandbox(runtime_root: Path) -> None:
    _child_limits()
    os.umask(0o077)
    _apply_landlock(runtime_root)
    _apply_seccomp()

def _candidate_preexec(
    mount_root: Path,
    python_snapshot_fd: int,
    stdlib_snapshot_fd: int,
):
    def apply() -> None:
        _prepare_private_runtime_snapshot(
            mount_root,
            python_snapshot_fd,
            stdlib_snapshot_fd,
        )
        _apply_candidate_sandbox(Path("/"))
    return apply

def _run_child(
    argv: list[str],
    *,
    mount_root: Path,
    python_snapshot_fd: int,
    stdlib_snapshot_fd: int,
    pass_fds: tuple[int, ...] = (),
) -> tuple[int, bytes, bytes]:
    env = {
        "PATH": "/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "OPENSSL_CONF": "/dev/null",
        "TMPDIR": "/tmp",
    }
    inherited = tuple(dict.fromkeys(
        (python_snapshot_fd, stdlib_snapshot_fd, *pass_fds)
    ))
    with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
        try:
            child = subprocess.Popen(
                argv,
                stdin=subprocess.DEVNULL,
                stdout=out,
                stderr=err,
                cwd=os.fspath(mount_root),
                env=env,
                close_fds=True,
                pass_fds=inherited,
                preexec_fn=_candidate_preexec(
                    mount_root,
                    python_snapshot_fd,
                    stdlib_snapshot_fd,
                ),
            )
            rc = child.wait(timeout=30)
        except subprocess.TimeoutExpired as exc:
            child.kill()
            child.wait()
            raise RuntimeProofError("candidate_timeout") from exc
        except (OSError, subprocess.SubprocessError) as exc:
            raise RuntimeProofError("candidate_exec_failed") from exc
        out.flush(); err.flush()
        if out.tell() > MAX_CHILD_OUTPUT or err.tell() > MAX_CHILD_OUTPUT:
            raise RuntimeProofError("candidate_output_limit")
        out.seek(0); err.seek(0)
        return rc, out.read(MAX_CHILD_OUTPUT + 1), err.read(MAX_CHILD_OUTPUT + 1)

V5_BOOTSTRAP = r'''
import os
import sys

synthetic = sys.argv[1]
fd = int(sys.argv[2], 10)
os.lseek(fd, 0, os.SEEK_SET)
chunks = []
while True:
    part = os.read(fd, 1024 * 1024)
    if not part:
        break
    chunks.append(part)
raw = b"".join(chunks)
sys.argv = [synthetic, "--self-test"]
namespace = {
    "__name__": "__main__",
    "__file__": synthetic,
    "__package__": None,
    "__cached__": None,
}
code = compile(raw, synthetic, "exec", dont_inherit=True, optimize=0)
exec(code, namespace, namespace)
'''

PROBE = r'''
import ctypes
import _ctypes
import json
import os
import sys

root = os.path.realpath(sys.argv[1])
ctypes_file = os.path.realpath(ctypes.__file__)
ctypes_origin = getattr(getattr(ctypes, "__spec__", None), "origin", None)
native_origin = getattr(getattr(_ctypes, "__spec__", None), "origin", None)
native_file = getattr(_ctypes, "__file__", None)
libc = ctypes.CDLL(None, use_errno=True)
renameat2 = getattr(libc, "renameat2", None)
rename_call_ok = False
rename_errno = None
if renameat2 is not None:
    renameat2.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    renameat2.restype = ctypes.c_int
    ctypes.set_errno(0)
    rc = renameat2(-1, b"x", -1, b"y", 1)
    rename_errno = ctypes.get_errno()
    rename_call_ok = (rc == -1 and rename_errno != 0)
print(json.dumps({
    "version": list(sys.version_info[:3]),
    "isolated": sys.flags.isolated,
    "safe_path": bool(getattr(sys.flags, "safe_path", False)),
    "no_site": sys.flags.no_site,
    "executable": os.path.realpath(sys.executable),
    "sys_path": list(sys.path),
    "ctypes_file": ctypes_file,
    "ctypes_origin": ctypes_origin,
    "_ctypes_origin": native_origin,
    "_ctypes_file": native_file,
    "renameat2_present": renameat2 is not None,
    "renameat2_call_ok": rename_call_ok,
    "renameat2_errno": rename_errno,
}, sort_keys=True, separators=(",", ":")))
'''

def _check_probe(raw: bytes) -> dict[str, Any]:
    try:
        text = raw.decode("utf-8", "strict")
        obj = json.loads(text)
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise RuntimeProofError("candidate_probe_output_invalid") from exc
    if not isinstance(obj, dict):
        raise RuntimeProofError("candidate_probe_shape_invalid")
    if obj.get("version", [])[:2] != [3, 12]:
        raise RuntimeProofError("candidate_python_3_12_required")
    if obj.get("isolated") != 1 or obj.get("safe_path") is not True or obj.get("no_site") != 1:
        raise RuntimeProofError("candidate_python_flags_invalid")
    if obj.get("executable") != "/bin/python3.12-static":
        raise RuntimeProofError("candidate_executable_path_mismatch")
    paths = obj.get("sys_path")
    if not isinstance(paths, list) or not paths:
        raise RuntimeProofError("candidate_sys_path_invalid")
    for item in paths:
        if not isinstance(item, str) or not item.startswith("/"):
            raise RuntimeProofError("candidate_sys_path_invalid")
        normalized = os.path.normpath(item)
        if normalized.startswith("/usr/") or normalized == "/usr":
            raise RuntimeProofError("candidate_host_sys_path_forbidden")
        lowered = normalized.lower()
        if "site-packages" in lowered:
            raise RuntimeProofError("candidate_site_packages_forbidden")
        if normalized != "/lib" and not normalized.startswith("/lib/"):
            raise RuntimeProofError("candidate_sys_path_outside_private_lib")
    ctypes_file = obj.get("ctypes_file")
    if not isinstance(ctypes_file, str) or not ctypes_file.startswith("/lib/python312.zip/"):
        raise RuntimeProofError("candidate_ctypes_not_from_exact_zip")
    if obj.get("_ctypes_origin") != "built-in" or obj.get("_ctypes_file") not in (None, ""):
        raise RuntimeProofError("candidate_native_ctypes_not_builtin")
    if obj.get("renameat2_present") is not True or obj.get("renameat2_call_ok") is not True:
        raise RuntimeProofError("candidate_renameat2_unavailable")
    return obj

def _read_v5_source(root: Path) -> bytes:
    path = root / V5_REL
    st = os.lstat(path)
    if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_size != V5_BYTES:
        raise RuntimeProofError("v5_source_shape_mismatch")
    raw = path.read_bytes()
    if len(raw) != V5_BYTES or hashlib.sha256(raw).hexdigest() != V5_SHA256:
        raise RuntimeProofError("v5_source_identity_mismatch")
    return raw

def self_test() -> None:
    if not hasattr(os, "memfd_create"):
        raise RuntimeProofError("memfd_create_unavailable")
    fd = _sealed_memfd(b"sealed-runtime-proof", "void-v7-runtime-proof-self-test")
    try:
        seals = fcntl.fcntl(fd, F_GET_SEALS)
        assert seals & REQUIRED_SEALS == REQUIRED_SEALS
    finally:
        os.close(fd)

    with tempfile.TemporaryDirectory(prefix="void-v7-runtime-elf-self-test-") as td:
        path = Path(td) / "fake"
        eh = bytearray(64)
        eh[:4] = b"\x7fELF"; eh[4] = 2; eh[5] = 1; eh[6] = 1
        struct.pack_into("<HH", eh, 16, 2, 62)
        struct.pack_into("<Q", eh, 32, 64)
        struct.pack_into("<HH", eh, 54, 56, 1)
        ph = bytearray(56)
        struct.pack_into("<I", ph, 0, 1)
        path.write_bytes(bytes(eh + ph))
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        opened = _open_exact(path, expected_size=len(raw), expected_sha256=digest, label="self_test_elf")
        try:
            _require_static_python_elf(opened, len(raw))
        finally:
            os.close(opened)

    with tempfile.TemporaryDirectory(prefix="void-v7-runtime-sandbox-self-test-") as td:
        sandbox_root = Path(td)
        (sandbox_root / "bin").mkdir()
        (sandbox_root / "lib").mkdir()
        (sandbox_root / "tmp").mkdir()
        allowed = sandbox_root / "lib" / "allowed.txt"
        allowed.write_text("allowed", "utf-8")
        pid = os.fork()
        if pid == 0:
            try:
                _apply_candidate_sandbox(sandbox_root)
                if allowed.read_text("utf-8") != "allowed":
                    os._exit(11)
                (sandbox_root / "tmp" / "write.txt").write_text("ok", "utf-8")
                try:
                    Path("/etc/passwd").read_bytes()
                except PermissionError:
                    pass
                else:
                    os._exit(12)
                try:
                    socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                except OSError as exc:
                    if exc.errno != errno.EPERM:
                        os._exit(13)
                else:
                    os._exit(14)
                try:
                    os.fork()
                except OSError as exc:
                    if exc.errno != errno.EPERM:
                        os._exit(15)
                else:
                    os._exit(16)
                os._exit(0)
            except BaseException:
                os._exit(17)
        waited, status = os.waitpid(pid, 0)
        if waited != pid or not os.WIFEXITED(status) or os.WEXITSTATUS(status) != 0:
            raise RuntimeProofError(
                "candidate_sandbox_self_test_failed:"
                + str(os.WEXITSTATUS(status) if os.WIFEXITED(status) else -1)
            )

    print(MARKER + "_SELF_TEST_GREEN")
    print("candidate_execution=false")
    print("root_execution=false")
    print("sealed_memfd_snapshot_required=true")
    print("static_elf_pt_interp_forbidden=true")
    print("static_elf_pt_dynamic_forbidden=true")
    print("runtime_import_closure_proof_required=true")
    print("candidate_execution_sandbox_required=true")
    print("landlock_v3_filesystem_confinement_required=true")
    print("seccomp_network_process_escape_denial_required=true")
    print("same_uid_immutable_runtime_snapshot_required=true")
    print("fsverity_host_readiness_established=false")
    print("protected_host_install=false")
    print("protected_v5_apply=false")
    print("funds_movement=false")

def run(args: argparse.Namespace) -> int:
    # Landlock/seccomp confine the candidate process itself, but ordinary
    # same-UID processes can still mutate/chmod pathname-backed scratch files.
    # Do not execute candidate bytes until the runtime snapshot is backed by a
    # separately reviewed same-UID-resistant immutable presentation.
    raise RuntimeProofError("candidate_execution_snapshot_not_same_uid_immutable")

    if os.geteuid() == 0 or os.getuid() == 0:
        raise RuntimeProofError("root_execution_forbidden")
    if os.geteuid() != os.getuid() or os.getegid() != os.getgid():
        raise RuntimeProofError("identity_transition_forbidden")

    python_size = _positive_int(args.expected_python_bytes, "expected_python_bytes")
    stdlib_size = _positive_int(args.expected_stdlib_bytes, "expected_stdlib_bytes")
    python_sha = _hex64(args.expected_python_sha256, "expected_python_sha256")
    stdlib_sha = _hex64(args.expected_stdlib_sha256, "expected_stdlib_sha256")

    python_fd = _open_exact(Path(args.python), expected_size=python_size, expected_sha256=python_sha, label="python_candidate")
    stdlib_fd = _open_exact(Path(args.stdlib_zip), expected_size=stdlib_size, expected_sha256=stdlib_sha, label="stdlib_candidate")
    try:
        _require_static_python_elf(python_fd, python_size)
        with tempfile.TemporaryDirectory(prefix="void-v7-static-runtime-proof-") as td:
            root = Path(td)
            os.chmod(root, 0o700)
            (root / "bin").mkdir(mode=0o700)
            (root / "lib").mkdir(mode=0o700)
            (root / "tmp").mkdir(mode=0o700)
            python_target = root / "bin" / "python3.12-static"
            zip_target = root / "lib" / "python312.zip"
            _copy_fd_exact(python_fd, python_target, size=python_size, mode=0o500, label="python_candidate")
            _copy_fd_exact(stdlib_fd, zip_target, size=stdlib_size, mode=0o400, label="stdlib_candidate")

            probe_rc, probe_out, probe_err = _run_child(
                ["/bin/python3.12-static", "-I", "-B", "-S", "-c", PROBE, "/"],
                mount_root=root,
                python_snapshot_fd=python_fd,
                stdlib_snapshot_fd=stdlib_fd,
            )
            if probe_rc != 0 or probe_err:
                raise RuntimeProofError("candidate_probe_failed")
            probe = _check_probe(probe_out)

            repo_root = Path(__file__).resolve().parents[2]
            v5_raw = _read_v5_source(repo_root)
            v5_fd = _sealed_memfd(v5_raw, "void-v7-v5-source")
            synthetic_v5 = root / "synthetic-repo" / V5_REL
            synthetic_v5.parent.mkdir(parents=True, mode=0o700)
            try:
                v5_rc, v5_out, v5_err = _run_child(
                    [
                        "/bin/python3.12-static",
                        "-I", "-B", "-S", "-c", V5_BOOTSTRAP,
                        "/synthetic-repo/" + V5_REL,
                        str(v5_fd),
                    ],
                    mount_root=root,
                    python_snapshot_fd=python_fd,
                    stdlib_snapshot_fd=stdlib_fd,
                    pass_fds=(v5_fd,),
                )
            finally:
                os.close(v5_fd)
            if v5_rc != 0 or v5_err:
                raise RuntimeProofError("v5_self_test_failed")
            marker = b"VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V5_SELF_TEST_GREEN"
            if marker not in v5_out:
                raise RuntimeProofError("v5_self_test_marker_missing")

            receipt = {
                "schema": SCHEMA,
                "status": "RUNTIME_CLOSURE_GREEN",
                "python_bytes": python_size,
                "python_sha256": python_sha,
                "stdlib_bytes": stdlib_size,
                "stdlib_sha256": stdlib_sha,
                "v5_git_blob": V5_GIT_BLOB,
                "v5_bytes": V5_BYTES,
                "v5_sha256": V5_SHA256,
                "python_version": probe["version"],
                "ctypes_from_exact_zip": True,
                "native_ctypes_builtin": True,
                "renameat2_callable": True,
                "isolated_python": True,
                "safe_path": True,
                "no_site": True,
                "candidate_execution_performed": True,
                "execution_as_root": False,
                "protected_filesystem_mutation": False,
                "fsverity_enablement": False,
                "fsverity_host_readiness_established": False,
                "protected_host_install": False,
                "protected_v5_apply": False,
                "service_mutation": False,
                "credential_access": False,
                "signing": False,
                "payment_acceptance": False,
                "public_presale_activation": False,
                "funds_movement": False,
                "next_action": "BIND_EXACT_RUNTIME_RECEIPT_AND_RESOLVE_PERSISTENT_CONTENT_SEAL_HOLD",
            }
            print(MARKER)
            print("status=RUNTIME_CLOSURE_GREEN")
            print("receipt_json=" + canonical(receipt))
            print("protected_host_install=false")
            print("fsverity_host_readiness_established=false")
            print("protected_v5_apply=false")
            print("funds_movement=false")
            return 0
    finally:
        os.close(python_fd)
        os.close(stdlib_fd)

def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--run", action="store_true")
    parser.add_argument("--python")
    parser.add_argument("--stdlib-zip")
    parser.add_argument("--expected-python-bytes")
    parser.add_argument("--expected-python-sha256")
    parser.add_argument("--expected-stdlib-bytes")
    parser.add_argument("--expected-stdlib-sha256")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0

    required = (
        args.python,
        args.stdlib_zip,
        args.expected_python_bytes,
        args.expected_python_sha256,
        args.expected_stdlib_bytes,
        args.expected_stdlib_sha256,
    )
    if any(value is None for value in required):
        raise RuntimeProofError("run_arguments_incomplete")
    return run(args)

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeProofError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("candidate_execution_authority=false")
        print("protected_host_install=false")
        print("fsverity_host_readiness_established=false")
        print("protected_v5_apply=false")
        print("service_mutation=false")
        print("credential_access=false")
        print("signing=false")
        print("payment_acceptance=false")
        print("funds_movement=false")
        raise SystemExit(2)
