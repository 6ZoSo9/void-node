#!/usr/bin/env python3
from __future__ import annotations

import argparse
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import resource
import shutil
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

def _sealed_memfd(raw: bytes, label: str) -> int:
    if not hasattr(os, "memfd_create"):
        raise RuntimeProofError("memfd_create_unavailable")
    fd = os.memfd_create(label, MFD_ALLOW_SEALING)
    try:
        position = 0
        while position < len(raw):
            wrote = os.write(fd, raw[position:])
            if wrote <= 0:
                raise RuntimeProofError("memfd_short_write")
            position += wrote
        os.lseek(fd, 0, os.SEEK_SET)
        fcntl.fcntl(fd, F_ADD_SEALS, REQUIRED_SEALS)
        seals = fcntl.fcntl(fd, F_GET_SEALS)
        if seals & REQUIRED_SEALS != REQUIRED_SEALS:
            raise RuntimeProofError("memfd_seals_missing")
        try:
            os.write(fd, b"x")
        except OSError as exc:
            if exc.errno != errno.EPERM:
                raise RuntimeProofError("memfd_write_seal_wrong_errno") from exc
        else:
            raise RuntimeProofError("memfd_write_seal_ineffective")
        os.lseek(fd, 0, os.SEEK_SET)
        return fd
    except BaseException:
        os.close(fd)
        raise

def _child_limits() -> None:
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_CPU, (15, 15))
    resource.setrlimit(resource.RLIMIT_AS, (2 * 1024 * 1024 * 1024, 2 * 1024 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_CHILD_OUTPUT, MAX_CHILD_OUTPUT))
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))

def _run_child(argv: list[str], *, cwd: Path, pass_fds: tuple[int, ...] = ()) -> tuple[int, bytes, bytes]:
    env = {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "OPENSSL_CONF": "/dev/null",
    }
    with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
        try:
            child = subprocess.Popen(
                argv,
                stdin=subprocess.DEVNULL,
                stdout=out,
                stderr=err,
                cwd=os.fspath(cwd),
                env=env,
                close_fds=True,
                pass_fds=pass_fds,
                preexec_fn=_child_limits,
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

def _check_probe(raw: bytes, runtime_root: Path) -> dict[str, Any]:
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
    root = os.path.realpath(runtime_root)
    executable = obj.get("executable")
    if not isinstance(executable, str) or executable != os.path.realpath(runtime_root / "bin" / "python3.12-static"):
        raise RuntimeProofError("candidate_executable_path_mismatch")
    paths = obj.get("sys_path")
    if not isinstance(paths, list) or not paths:
        raise RuntimeProofError("candidate_sys_path_invalid")
    for item in paths:
        if not isinstance(item, str):
            raise RuntimeProofError("candidate_sys_path_invalid")
        if item == "":
            continue
        normalized = os.path.realpath(item)
        if normalized != root and not normalized.startswith(root + os.sep):
            raise RuntimeProofError("candidate_host_sys_path_forbidden")
        lowered = item.lower()
        if "site-packages" in lowered or "lib-dynload" in lowered:
            raise RuntimeProofError("candidate_host_extension_path_forbidden")
    ctypes_file = obj.get("ctypes_file")
    expected_zip_prefix = os.path.realpath(runtime_root / "lib" / "python312.zip") + os.sep
    if not isinstance(ctypes_file, str) or not ctypes_file.startswith(expected_zip_prefix):
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

    print(MARKER + "_SELF_TEST_GREEN")
    print("candidate_execution=false")
    print("root_execution=false")
    print("sealed_memfd_snapshot_required=true")
    print("static_elf_pt_interp_forbidden=true")
    print("static_elf_pt_dynamic_forbidden=true")
    print("runtime_import_closure_proof_required=true")
    print("fsverity_host_readiness_established=false")
    print("protected_host_install=false")
    print("protected_v5_apply=false")
    print("funds_movement=false")

def run(args: argparse.Namespace) -> int:
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
            python_target = root / "bin" / "python3.12-static"
            zip_target = root / "lib" / "python312.zip"
            _copy_fd_exact(python_fd, python_target, size=python_size, mode=0o500, label="python_candidate")
            _copy_fd_exact(stdlib_fd, zip_target, size=stdlib_size, mode=0o400, label="stdlib_candidate")

            probe_rc, probe_out, probe_err = _run_child(
                [os.fspath(python_target), "-I", "-B", "-S", "-c", PROBE, os.fspath(root)],
                cwd=root,
            )
            if probe_rc != 0 or probe_err:
                raise RuntimeProofError("candidate_probe_failed")
            probe = _check_probe(probe_out, root)

            repo_root = Path(__file__).resolve().parents[2]
            v5_raw = _read_v5_source(repo_root)
            v5_fd = _sealed_memfd(v5_raw, "void-v7-v5-source")
            try:
                v5_rc, v5_out, v5_err = _run_child(
                    [os.fspath(python_target), "-I", "-B", "-S", "/proc/self/fd/" + str(v5_fd), "--self-test"],
                    cwd=root,
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
