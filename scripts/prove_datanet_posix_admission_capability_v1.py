#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
import array
import ctypes
import errno
import fcntl
import json
import os
import re
import signal
import socket
import stat
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass

MARKER = "VOID_DATANET_POSIX_ADMISSION_CAPABILITY_V1"
HEX64 = re.compile(r"^[0-9a-f]{64}$")
PREFIX = ".void-datanet-admission-"
SUFFIX = ".lock.v1"
LOCK_START = 0
LOCK_LEN = 1
EXPECTED_MODE = 0o600
SYS_PIDFD_GETFD = 438

class Hold(Exception):
    pass

def fail(code: str, detail: str) -> None:
    raise Hold(f"{MARKER}:{code}:{detail}")

def canonical_u(value: int, code: str) -> str:
    if not isinstance(value, int) or value < 0:
        fail(code, str(value))
    return str(value)

def identity(st: os.stat_result) -> tuple[str, str]:
    return canonical_u(st.st_dev, "DEV"), canonical_u(st.st_ino, "INO")

def identity_text(st: os.stat_result) -> str:
    d, i = identity(st)
    return f"{d}:{i}"

def capability_name(k: str) -> str:
    if not isinstance(k, str) or HEX64.fullmatch(k) is None:
        fail("K_INVALID", str(k))
    name = f"{PREFIX}{k}{SUFFIX}"
    if name.encode("ascii").decode("ascii") != name:
        fail("NAME_NONASCII", name)
    return name

@dataclass(frozen=True)
class Binding:
    root_identity: str
    lock_identity: str
    k: str

def open_bound(root_path: str, binding: Binding) -> tuple[int, int]:
    flags_root = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags_root |= os.O_NOFOLLOW
    root_fd = os.open(root_path, flags_root)
    try:
        root_st = os.fstat(root_fd)
        if not stat.S_ISDIR(root_st.st_mode):
            fail("ROOT_NOT_DIRECTORY", root_path)
        if identity_text(root_st) != binding.root_identity:
            fail("ROOT_IDENTITY_MISMATCH", identity_text(root_st))
        name = capability_name(binding.k)
        flags_lock = os.O_RDWR | os.O_CLOEXEC
        if hasattr(os, "O_NOFOLLOW"):
            flags_lock |= os.O_NOFOLLOW
        lock_fd = os.open(name, flags_lock, dir_fd=root_fd)
        try:
            opened = os.fstat(lock_fd)
            visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
            if not stat.S_ISREG(opened.st_mode) or not stat.S_ISREG(visible.st_mode):
                fail("LOCK_NONREGULAR", name)
            if stat.S_ISLNK(visible.st_mode):
                fail("LOCK_SYMLINK", name)
            if identity(opened) != identity(visible):
                fail("LOCK_PATH_IDENTITY_MISMATCH", name)
            if identity_text(opened) != binding.lock_identity:
                fail("LOCK_IDENTITY_MISMATCH", identity_text(opened))
            if opened.st_uid != os.getuid():
                fail("LOCK_UID_MISMATCH", str(opened.st_uid))
            if opened.st_nlink != 1:
                fail("LOCK_NLINK_INVALID", str(opened.st_nlink))
            if stat.S_IMODE(opened.st_mode) != EXPECTED_MODE:
                fail("LOCK_MODE_INVALID", oct(stat.S_IMODE(opened.st_mode)))
            if opened.st_size != 0:
                fail("LOCK_SIZE_INVALID", str(opened.st_size))
            return root_fd, lock_fd
        except BaseException:
            os.close(lock_fd)
            raise
    except BaseException:
        os.close(root_fd)
        raise

def acquire(lock_fd: int) -> bool:
    try:
        fcntl.lockf(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB, LOCK_LEN, LOCK_START, os.SEEK_SET)
        return True
    except OSError as exc:
        if exc.errno in (errno.EACCES, errno.EAGAIN):
            return False
        raise

def unlock(lock_fd: int) -> None:
    fcntl.lockf(lock_fd, fcntl.LOCK_UN, LOCK_LEN, LOCK_START, os.SEEK_SET)

def revalidate(root_fd: int, lock_fd: int, binding: Binding) -> None:
    root_st = os.fstat(root_fd)
    opened = os.fstat(lock_fd)
    visible = os.stat(capability_name(binding.k), dir_fd=root_fd, follow_symlinks=False)
    if identity_text(root_st) != binding.root_identity:
        fail("ROOT_CHANGED_AFTER_LOCK", identity_text(root_st))
    if identity_text(opened) != binding.lock_identity or identity(opened) != identity(visible):
        fail("LOCK_CHANGED_AFTER_LOCK", identity_text(opened))

def parse_binding(ns: argparse.Namespace) -> Binding:
    return Binding(root_identity=ns.root_identity, lock_identity=ns.lock_identity, k=ns.k)

def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)

def child_contend(ns: argparse.Namespace) -> int:
    binding = parse_binding(ns)
    root_fd, lock_fd = open_bound(ns.root, binding)
    try:
        os.write(ns.ready_fd, b"R")
        if os.read(ns.start_fd, 1) != b"G":
            fail("BARRIER", "missing-go")
        got = acquire(lock_fd)
        if got:
            revalidate(root_fd, lock_fd, binding)
            emit({"status": "acquired", "pid": os.getpid(), "lock_fd": lock_fd})
            time.sleep(ns.hold_seconds)
            unlock(lock_fd)
        else:
            emit({"status": "busy", "pid": os.getpid()})
        return 0
    finally:
        os.close(lock_fd)
        os.close(root_fd)

def child_holder(ns: argparse.Namespace) -> int:
    binding = parse_binding(ns)
    root_fd, lock_fd = open_bound(ns.root, binding)
    if not acquire(lock_fd):
        fail("HOLDER_BUSY", "unexpected")
    revalidate(root_fd, lock_fd, binding)
    if ns.send_socket_fd is not None:
        sock = socket.socket(fileno=ns.send_socket_fd)
        rights = array.array("i", [lock_fd])
        sock.sendmsg([b"F"], [(socket.SOL_SOCKET, socket.SCM_RIGHTS, rights)])
        sock.close()
    emit({"status": "holding", "pid": os.getpid(), "lock_fd": lock_fd})
    while True:
        signal.pause()

def child_fork_holder(ns: argparse.Namespace) -> int:
    binding = parse_binding(ns)
    root_fd, lock_fd = open_bound(ns.root, binding)
    if not acquire(lock_fd):
        fail("HOLDER_BUSY", "unexpected")
    revalidate(root_fd, lock_fd, binding)
    r, w = os.pipe2(os.O_CLOEXEC)
    pid = os.fork()
    if pid == 0:
        os.close(r)
        # Child deliberately keeps inherited root/lock descriptors open. POSIX process
        # locks are not inherited; this FD must not keep the parent's capability alive.
        os.write(w, f"{os.getpid()}\n".encode())
        os.close(w)
        while True:
            signal.pause()
    os.close(w)
    child_pid = int(os.read(r, 64).decode().strip())
    os.close(r)
    emit({"status": "holding", "pid": os.getpid(), "child_pid": child_pid, "lock_fd": lock_fd})
    while True:
        signal.pause()

def recv_fd(sock: socket.socket) -> int:
    data, ancdata, _flags, _addr = sock.recvmsg(1, socket.CMSG_SPACE(array.array("i").itemsize))
    if data != b"F":
        fail("SCM_DATA", repr(data))
    for level, kind, payload in ancdata:
        if level == socket.SOL_SOCKET and kind == socket.SCM_RIGHTS:
            values = array.array("i")
            values.frombytes(payload[: values.itemsize])
            return values[0]
    fail("SCM_MISSING_FD", "none")

def pidfd_getfd(pid: int, target_fd: int) -> int:
    if not hasattr(os, "pidfd_open"):
        fail("PIDFD_UNAVAILABLE", "pidfd_open")
    pidfd = os.pidfd_open(pid, 0)
    try:
        libc = ctypes.CDLL(None, use_errno=True)
        new_fd = libc.syscall(SYS_PIDFD_GETFD, pidfd, target_fd, 0)
        if new_fd < 0:
            err = ctypes.get_errno()
            fail("PIDFD_GETFD_FAILED", f"{err}:{os.strerror(err)}")
        return int(new_fd)
    finally:
        os.close(pidfd)

def probe_fd_busy(fd: int) -> bool:
    got = acquire(fd)
    if got:
        unlock(fd)
        return False
    return True

def fresh_probe(root: str, binding: Binding) -> bool:
    root_fd, lock_fd = open_bound(root, binding)
    try:
        got = acquire(lock_fd)
        if got:
            revalidate(root_fd, lock_fd, binding)
            unlock(lock_fd)
        return got
    finally:
        os.close(lock_fd)
        os.close(root_fd)

def spawn_holder(root: str, binding: Binding, *, send_sock: socket.socket | None = None, fork_child: bool = False):
    args = [
        sys.executable, os.path.abspath(__file__),
        "--fork-holder" if fork_child else "--holder",
        "--root", root, "--root-identity", binding.root_identity,
        "--lock-identity", binding.lock_identity, "--k", binding.k,
    ]
    pass_fds: tuple[int, ...] = ()
    if send_sock is not None:
        args += ["--send-socket-fd", str(send_sock.fileno())]
        pass_fds = (send_sock.fileno(),)
    proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, pass_fds=pass_fds)
    line = proc.stdout.readline()
    if not line:
        err = proc.stderr.read()
        proc.kill()
        raise RuntimeError(f"holder failed: {err}")
    info = json.loads(line)
    return proc, info

def kill_and_reap(proc: subprocess.Popen) -> None:
    if proc.poll() is None:
        proc.kill()
    proc.wait(timeout=5)

def make_fixture(root: str, k: str) -> Binding:
    root_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
    try:
        name = capability_name(k)
        fd = os.open(name, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC, EXPECTED_MODE, dir_fd=root_fd)
        try:
            os.fchmod(fd, EXPECTED_MODE)
            root_id = identity_text(os.fstat(root_fd))
            lock_id = identity_text(os.fstat(fd))
        finally:
            os.close(fd)
        return Binding(root_identity=root_id, lock_identity=lock_id, k=k)
    finally:
        os.close(root_fd)

def run_race(root: str, binding: Binding) -> tuple[int, int]:
    ready_r, ready_w = os.pipe2(os.O_CLOEXEC)
    start_r, start_w = os.pipe2(os.O_CLOEXEC)
    children = []
    try:
        for _ in range(8):
            args = [
                sys.executable, os.path.abspath(__file__), "--contend",
                "--root", root, "--root-identity", binding.root_identity,
                "--lock-identity", binding.lock_identity, "--k", binding.k,
                "--ready-fd", str(ready_w), "--start-fd", str(start_r),
                "--hold-seconds", "1.5",
            ]
            children.append(subprocess.Popen(
                args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                pass_fds=(ready_w, start_r),
            ))
        os.close(ready_w); ready_w = -1
        os.close(start_r); start_r = -1
        ready = b""
        deadline = time.monotonic() + 5
        while len(ready) < 8 and time.monotonic() < deadline:
            chunk = os.read(ready_r, 8 - len(ready))
            if not chunk:
                break
            ready += chunk
        if ready != b"R" * 8:
            raise AssertionError(f"ready barrier mismatch {ready!r}")
        os.write(start_w, b"G" * 8)
        outputs = []
        for p in children:
            out, err = p.communicate(timeout=5)
            if p.returncode != 0:
                raise AssertionError(f"contender rc={p.returncode} err={err}")
            outputs.append(json.loads(out.strip()))
        acquired = sum(1 for x in outputs if x["status"] == "acquired")
        busy = sum(1 for x in outputs if x["status"] == "busy")
        return acquired, busy
    finally:
        for fd in (ready_r, ready_w, start_r, start_w):
            if isinstance(fd, int) and fd >= 0:
                try: os.close(fd)
                except OSError: pass
        for p in children:
            if p.poll() is None:
                p.kill()
                p.wait()

def main_proof() -> int:
    if sys.platform != "linux":
        raise AssertionError("Linux-only proof")
    k = "ab" * 32
    other_k = "cd" * 32
    results = {}
    with tempfile.TemporaryDirectory(prefix="void-datanet-posix-cap-") as root:
        binding = make_fixture(root, k)
        other = make_fixture(root, other_k)

        assert capability_name(k) == f"{PREFIX}{k}{SUFFIX}"
        assert not capability_name(k).startswith(f"datanet-{k}-")
        results["name_binding"] = "green"

        got, busy = run_race(root, binding)
        assert (got, busy) == (1, 7), (got, busy)
        results["eight_contenders"] = {"acquired": got, "busy": busy}

        r1, f1 = open_bound(root, binding)
        r2, f2 = open_bound(root, other)
        try:
            assert acquire(f1)
            assert acquire(f2)
            results["distinct_k_independent"] = True
            unlock(f2); unlock(f1)
        finally:
            os.close(f2); os.close(r2); os.close(f1); os.close(r1)

        parent_sock, child_sock = socket.socketpair(socket.AF_UNIX, socket.SOCK_SEQPACKET)
        try:
            proc, info = spawn_holder(root, binding, send_sock=child_sock)
            child_sock.close()
            copied = recv_fd(parent_sock)
            try:
                assert probe_fd_busy(copied), "SCM_RIGHTS recipient unexpectedly owns capability"
                kill_and_reap(proc)
                assert acquire(copied), "lock did not crash-release while transferred FD remained open"
                unlock(copied)
                results["scm_rights_nontransfer_crash_release"] = True
            finally:
                os.close(copied)
                if proc.poll() is None: kill_and_reap(proc)
        finally:
            parent_sock.close()
            try: child_sock.close()
            except OSError: pass

        proc, info = spawn_holder(root, binding)
        proc_copy = os.open(f"/proc/{proc.pid}/fd/{info['lock_fd']}", os.O_RDWR | os.O_CLOEXEC)
        try:
            assert probe_fd_busy(proc_copy), "procfs reopened FD unexpectedly owns capability"
            kill_and_reap(proc)
            assert acquire(proc_copy), "lock did not crash-release while procfs FD remained open"
            unlock(proc_copy)
            results["procfs_nontransfer_crash_release"] = True
        finally:
            os.close(proc_copy)
            if proc.poll() is None: kill_and_reap(proc)

        proc, info = spawn_holder(root, binding)
        pid_copy = pidfd_getfd(proc.pid, info["lock_fd"])
        try:
            assert probe_fd_busy(pid_copy), "pidfd_getfd copy unexpectedly owns capability"
            kill_and_reap(proc)
            assert acquire(pid_copy), "lock did not crash-release while pidfd copy remained open"
            unlock(pid_copy)
            results["pidfd_nontransfer_crash_release"] = True
        finally:
            os.close(pid_copy)
            if proc.poll() is None: kill_and_reap(proc)

        proc, info = spawn_holder(root, binding, fork_child=True)
        child_pid = int(info["child_pid"])
        try:
            assert not fresh_probe(root, binding), "fresh process acquired while holder alive"
            kill_and_reap(proc)
            os.kill(child_pid, 0)
            assert fresh_probe(root, binding), "fork child inherited/retained parent's lock capability"
            results["fork_noninheritance_crash_release"] = True
        finally:
            if proc.poll() is None: kill_and_reap(proc)
            try: os.kill(child_pid, signal.SIGKILL)
            except ProcessLookupError: pass

        wrong_root = Binding(root_identity="0:1", lock_identity=binding.lock_identity, k=k)
        try:
            open_bound(root, wrong_root)
            raise AssertionError("wrong root identity admitted")
        except Hold as exc:
            assert ":ROOT_IDENTITY_MISMATCH:" in str(exc)
        wrong_lock = Binding(root_identity=binding.root_identity, lock_identity="0:1", k=k)
        try:
            open_bound(root, wrong_lock)
            raise AssertionError("wrong lock identity admitted")
        except Hold as exc:
            assert ":LOCK_IDENTITY_MISMATCH:" in str(exc)
        results["identity_fail_closed"] = True

        name = capability_name(other_k)
        path = os.path.join(root, name)
        os.chmod(path, 0o640)
        try:
            open_bound(root, other)
            raise AssertionError("wrong mode admitted")
        except Hold as exc:
            assert ":LOCK_MODE_INVALID:" in str(exc)
        os.chmod(path, 0o600)
        alias = os.path.join(root, "capability-alias")
        os.link(path, alias)
        try:
            open_bound(root, other)
            raise AssertionError("nlink>1 admitted")
        except Hold as exc:
            assert ":LOCK_NLINK_INVALID:" in str(exc)
        os.unlink(alias)
        results["metadata_fail_closed"] = True

        assert fresh_probe(root, binding)
        results["final_fresh_acquisition"] = True

    emit({"marker": MARKER, "status": "GREEN", "cases": 9, "results": results})
    return 0

def build_parser():
    p = argparse.ArgumentParser()
    modes = p.add_mutually_exclusive_group()
    modes.add_argument("--contend", action="store_true")
    modes.add_argument("--holder", action="store_true")
    modes.add_argument("--fork-holder", action="store_true")
    p.add_argument("--root")
    p.add_argument("--root-identity")
    p.add_argument("--lock-identity")
    p.add_argument("--k")
    p.add_argument("--ready-fd", type=int)
    p.add_argument("--start-fd", type=int)
    p.add_argument("--send-socket-fd", type=int)
    p.add_argument("--hold-seconds", type=float, default=1.0)
    return p

if __name__ == "__main__":
    ns = build_parser().parse_args()
    try:
        if ns.contend:
            raise SystemExit(child_contend(ns))
        if ns.holder:
            raise SystemExit(child_holder(ns))
        if ns.fork_holder:
            raise SystemExit(child_fork_holder(ns))
        raise SystemExit(main_proof())
    except Hold as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2)
