from __future__ import annotations

import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
from typing import BinaryIO

MARKER = "VOID_DATANET_PROTECTED_EXECUTION_MEMFD_V1"
MAX_ARTIFACT_BYTES = 256 * 1024 * 1024
CHUNK = 1024 * 1024
REQUIRED_SEALS = (
    fcntl.F_SEAL_WRITE
    | fcntl.F_SEAL_GROW
    | fcntl.F_SEAL_SHRINK
    | fcntl.F_SEAL_SEAL
)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def hash_fd(fd: int, limit: int = MAX_ARTIFACT_BYTES) -> tuple[int, str]:
    st0 = os.fstat(fd)
    if not stat.S_ISREG(st0.st_mode) or st0.st_size <= 0 or st0.st_size > limit:
        raise AssertionError("artifact_fd_not_bounded_regular")
    h = hashlib.sha256()
    total = 0
    offset = 0
    while True:
        chunk = os.pread(fd, min(CHUNK, limit - total + 1), offset)
        if not chunk:
            break
        total += len(chunk)
        if total > limit:
            raise AssertionError("artifact_fd_too_large")
        h.update(chunk)
        offset += len(chunk)
    st1 = os.fstat(fd)
    for key in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        if getattr(st0, key) != getattr(st1, key):
            raise AssertionError("artifact_fd_changed_during_hash")
    if total != st0.st_size:
        raise AssertionError("artifact_fd_short_read")
    return total, h.hexdigest()


def open_readonly_nofollow(path: str) -> int:
    flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0)
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(path, flags)
    st = os.fstat(fd)
    visible = os.stat(path, follow_symlinks=False)
    if not stat.S_ISREG(st.st_mode) or not stat.S_ISREG(visible.st_mode):
        os.close(fd)
        raise AssertionError("artifact_path_not_regular")
    if (st.st_dev, st.st_ino) != (visible.st_dev, visible.st_ino):
        os.close(fd)
        raise AssertionError("artifact_path_identity_mismatch")
    return fd


def _copy_fd(src_fd: int, dst_fd: int, expected_bytes: int) -> None:
    offset = 0
    while offset < expected_bytes:
        chunk = os.pread(src_fd, min(CHUNK, expected_bytes - offset), offset)
        if not chunk:
            raise AssertionError("artifact_copy_short_read")
        wrote = 0
        while wrote < len(chunk):
            n = os.write(dst_fd, chunk[wrote:])
            if n <= 0:
                raise AssertionError("artifact_copy_short_write")
            wrote += n
        offset += len(chunk)
    os.lseek(dst_fd, 0, os.SEEK_SET)


def sealed_memfd_from_fd(src_fd: int, label: str) -> int:
    if not hasattr(os, "memfd_create"):
        raise AssertionError("memfd_unavailable")
    size, digest = hash_fd(src_fd)
    writer = os.memfd_create(
        f"void-{label}",
        os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING,
    )
    reader = -1
    try:
        _copy_fd(src_fd, writer, size)
        os.fsync(writer)
        if hash_fd(writer) != (size, digest):
            raise AssertionError("memfd_copy_digest_mismatch")
        fcntl.fcntl(writer, fcntl.F_ADD_SEALS, REQUIRED_SEALS)
        seals = fcntl.fcntl(writer, fcntl.F_GET_SEALS)
        if seals & REQUIRED_SEALS != REQUIRED_SEALS:
            raise AssertionError("memfd_seal_mismatch")
        reader = os.open(f"/proc/self/fd/{writer}", os.O_RDONLY | getattr(os, "O_CLOEXEC", 0))
        if fcntl.fcntl(reader, fcntl.F_GETFL) & os.O_ACCMODE != os.O_RDONLY:
            raise AssertionError("retained_memfd_not_read_only")
        if hash_fd(reader) != (size, digest):
            raise AssertionError("retained_memfd_digest_mismatch")
        result = reader
        reader = -1
        return result
    finally:
        if writer >= 0:
            os.close(writer)
        if reader >= 0:
            os.close(reader)


def fd_identity(fd: int) -> dict:
    st = os.fstat(fd)
    size, digest = hash_fd(fd)
    seals = fcntl.fcntl(fd, fcntl.F_GET_SEALS)
    return {
        "dev": st.st_dev,
        "ino": st.st_ino,
        "bytes": size,
        "sha256": digest,
        "read_only": (fcntl.fcntl(fd, fcntl.F_GETFL) & os.O_ACCMODE) == os.O_RDONLY,
        "seals": seals,
        "required_seals_present": seals & REQUIRED_SEALS == REQUIRED_SEALS,
    }


def build_protected_set(paths: dict[str, str]) -> dict[str, int]:
    result: dict[str, int] = {}
    sources: list[int] = []
    try:
        for role in ("runtime", "preload", "observer", "proof"):
            src = open_readonly_nofollow(paths[role])
            sources.append(src)
            result[role] = sealed_memfd_from_fd(src, role)
        for fd in result.values():
            ident = fd_identity(fd)
            if not ident["read_only"] or not ident["required_seals_present"]:
                raise AssertionError("protected_artifact_not_sealed_readonly")
        return result
    except Exception:
        for fd in result.values():
            try: os.close(fd)
            except OSError: pass
        raise
    finally:
        for fd in sources:
            try: os.close(fd)
            except OSError: pass


def close_set(fds: dict[str, int]) -> None:
    for fd in fds.values():
        try: os.close(fd)
        except OSError: pass


def run_protected(fds: dict[str, int], env: dict[str, str] | None = None) -> dict:
    runtime_fd = fds["runtime"]
    proof_fd = fds["proof"]
    child_env = os.environ.copy()
    child_env.update(env or {})
    child_env.update({
        "VOID_EXEC_PROFILE": "protected",
        "VOID_PRELOAD_FD": str(fds["preload"]),
        "VOID_OBSERVER_FD": str(fds["observer"]),
        "VOID_PROOF_REF_FD": str(proof_fd),
    })
    os.lseek(proof_fd, 0, os.SEEK_SET)
    completed = subprocess.run(
        [f"/proc/self/fd/{runtime_fd}", "--input-type=module", "-"],
        executable=f"/proc/self/fd/{runtime_fd}",
        stdin=proof_fd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=child_env,
        pass_fds=tuple(fds.values()),
        timeout=15,
        check=False,
    )
    if completed.returncode != 0:
        raise AssertionError(f"protected_child_failed:{completed.returncode}:{completed.stderr[:500]}")
    lines = [line for line in completed.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise AssertionError("protected_child_output_shape")
    return json.loads(lines[0])


def run_current(paths: dict[str, str], env: dict[str, str] | None = None) -> dict:
    child_env = os.environ.copy()
    child_env.update(env or {})
    child_env.update({
        "VOID_EXEC_PROFILE": "current",
        "VOID_PRELOAD_PATH": paths["preload"],
        "VOID_OBSERVER_PATH": paths["observer"],
    })
    completed = subprocess.run(
        [paths["runtime"], paths["proof"]],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=child_env,
        timeout=15,
        check=False,
    )
    if completed.returncode != 0:
        raise AssertionError(f"current_child_failed:{completed.returncode}:{completed.stderr[:500]}")
    lines = [line for line in completed.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise AssertionError("current_child_output_shape")
    return json.loads(lines[0])
