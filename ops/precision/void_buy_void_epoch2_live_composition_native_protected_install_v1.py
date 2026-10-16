#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
REPO_FIXED = Path("/home/zoso/dev/void-node")
LOCK_REL = "ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v3.json"
LOCK = ROOT / LOCK_REL
LOCK_GIT_BLOB_SHA1 = "57f965a944031eac90d69b4104b0f8f2473e66cc"
LOCK_ID = (
    "voidbuye2nativecandlock3_"
    "024c9e3818a40616fc8b198f605721bf76ed43d6d4f186bf02a202d46860a659"
)
LOCK_MERGE_COMMIT = "fab1f7feccc2d32313e6c2cc5c729c9ebe2dd492"

NATIVE_REL = "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c"
RUNNER_REL = "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs"
QUALIFIER_REL = "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v1.py"
SEALED_REL = "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs"

EXPECTED_BLOBS = {
    LOCK_REL: LOCK_GIT_BLOB_SHA1,
    NATIVE_REL: "4aa091e7835b32aa5c4e7b8e4059651c69a64eb3",
    RUNNER_REL: "92e8c8696ea7e2bb81b6ef089db8baa657188935",
    QUALIFIER_REL: "8dc5d53dfcc52c261a3da0ee692f3a4fcc0bfc4c",
    SEALED_REL: "14cbe81e27d04fee77cbe75225ce308bf8561a7b",
}

NATIVE_BYTES = 726976
NATIVE_SHA256 = "78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589"
RUNNER_BYTES = 30103
RUNNER_SHA256 = "2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73"

MARKER = "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1"
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_NATIVE_LIVE_COMPOSITION_V3_CREATE_ONLY"
INSTALL_PARENT = Path("/opt")
INSTALL_NAME = "void-buy-void-epoch2-live-composition-v2"
STAGE_NAME = ".void-buy-void-epoch2-live-composition-v2.stage"
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
STAGE_ROOT = INSTALL_PARENT / STAGE_NAME

NATIVE_NAME = "void_buy_void_epoch2_live_composition_native_preentry_v1"
RUNNER_NAME = "void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs"
POLICY_NAME = "policy-v1.conf"

NATIVE_TARGET = INSTALL_ROOT / NATIVE_NAME
RUNNER_TARGET = INSTALL_ROOT / RUNNER_NAME
POLICY_TARGET = INSTALL_ROOT / POLICY_NAME

NODE = Path("/usr/bin/node")
GIT = "/usr/bin/git"
CC = "/usr/bin/cc"
STRIP = "/usr/bin/strip"

COMPILE_FLAGS = (
    "-std=c11", "-Wall", "-Wextra", "-Werror", "-O2", "-fno-ident", "-fno-pie",
)
LINK_FLAGS = (
    "-static", "-fno-pie", "-no-pie", "-Wl,--build-id=none",
)

RENAME_NOREPLACE = 1
AT_FDCWD = -100
MAX_READ_CHUNK = 1024 * 1024
MAX_NODE_BYTES = 512 * 1024 * 1024
SHA40 = __import__("re").compile(r"^[0-9a-f]{40}$")
HEX64 = __import__("re").compile(r"^[0-9a-f]{64}$")

FORBIDDEN_APPLY_ENV = (
    "LD_PRELOAD", "LD_LIBRARY_PATH", "LD_AUDIT", "LD_DEBUG",
    "GLIBC_TUNABLES", "PYTHONPATH", "PYTHONHOME",
    "GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_NAMESPACE",
)

class InstallError(RuntimeError):
    pass

class PublishedInstallError(InstallError):
    pass

def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()

def same_identity(a: os.stat_result, b: os.stat_result) -> bool:
    return all(
        getattr(a, name) == getattr(b, name)
        for name in (
            "st_dev", "st_ino", "st_uid", "st_gid", "st_mode",
            "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
        )
    )

def git_env() -> dict[str, str]:
    return {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_ASKPASS": "/bin/false",
    }

def git(args: list[str], *, cwd: Path = ROOT) -> str:
    cp = subprocess.run(
        [GIT, "--no-replace-objects", "-C", os.fspath(cwd), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=git_env(),
        check=False,
        timeout=30,
    )
    if cp.returncode != 0:
        raise InstallError("git_failed:" + (args[0] if args else "unknown"))
    if cp.stderr:
        raise InstallError("git_unexpected_stderr:" + (args[0] if args else "unknown"))
    return cp.stdout.decode("utf-8", "strict").strip()

def direct_bytes(
    path: Path,
    *,
    exact_bytes: int | None = None,
    maximum: int = 8 * 1024 * 1024,
) -> bytes:
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise InstallError("file_lstat_failed:" + str(path)) from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_nlink != 1
        or visible_before.st_size < 1
        or visible_before.st_size > maximum
        or (exact_bytes is not None and visible_before.st_size != exact_bytes)
    ):
        raise InstallError("file_metadata_invalid:" + str(path))
    try:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    except OSError as exc:
        raise InstallError("file_open_failed:" + str(path)) from exc
    try:
        opened_before = os.fstat(fd)
        if not same_identity(visible_before, opened_before):
            raise InstallError("file_rebound_before_read:" + str(path))
        data = bytearray()
        digest = hashlib.sha256()
        while True:
            chunk = os.read(fd, MAX_READ_CHUNK)
            if not chunk:
                break
            data.extend(chunk)
            digest.update(chunk)
            if len(data) > maximum:
                raise InstallError("file_too_large:" + str(path))
        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not same_identity(opened_before, opened_after)
            or not same_identity(opened_after, visible_after)
        ):
            raise InstallError("file_changed_during_read:" + str(path))
    finally:
        os.close(fd)
    if exact_bytes is not None and len(data) != exact_bytes:
        raise InstallError("file_size_mismatch:" + str(path))
    return bytes(data)

def accepted_lock() -> dict[str, Any]:
    raw = direct_bytes(LOCK, maximum=128 * 1024)
    if git_blob_sha1(raw) != LOCK_GIT_BLOB_SHA1:
        raise InstallError("candidate_lock_blob_mismatch")
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InstallError("candidate_lock_json_invalid") from exc
    required = {
        "schema": "void_buy_void_epoch2_live_composition_native_candidate_lock_v3",
        "marker": "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V3",
        "version": 3,
        "repository": "6ZoSo9/void-node",
        "candidate_accepted": True,
        "native_binary_identity_accepted": True,
        "runner_identity_accepted": True,
        "protected_install_authorized": False,
        "live_execution_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False,
        "funds_movement_authorized": False,
        "production_host_evidence_authority": False,
        "next_gate": "void_buy_void_epoch2_live_composition_native_protected_install_v1",
        "lock_id": LOCK_ID,
    }
    for key, expected in required.items():
        if value.get(key) != expected:
            raise InstallError("candidate_lock_field_mismatch:" + key)
    report = value.get("candidate_report")
    if not isinstance(report, dict):
        raise InstallError("candidate_lock_report_missing")
    for key, expected in {
        "native_binary_sha256": NATIVE_SHA256,
        "native_binary_bytes": NATIVE_BYTES,
        "runner_sha256": RUNNER_SHA256,
        "runner_bytes": RUNNER_BYTES,
        "native_source_git_blob_sha1": EXPECTED_BLOBS[NATIVE_REL],
        "runner_source_git_blob_sha1": EXPECTED_BLOBS[RUNNER_REL],
        "sealed_v2_git_blob_sha1": EXPECTED_BLOBS[SEALED_REL],
    }.items():
        if report.get(key) != expected:
            raise InstallError("candidate_lock_report_mismatch:" + key)
    return value

def verify_repository(
    expected_head: str,
    *,
    require_main: bool = True,
    require_fixed_path: bool = True,
) -> None:
    if not SHA40.fullmatch(expected_head):
        raise InstallError("expected_head_invalid")
    if require_fixed_path and ROOT != REPO_FIXED:
        raise InstallError("fixed_repository_path_required")
    if git(["rev-parse", "--verify", "HEAD"]) != expected_head:
        raise InstallError("expected_head_mismatch")
    if require_main and git(["branch", "--show-current"]) != "main":
        raise InstallError("branch_not_main")
    if git(["status", "--porcelain=v1", "--untracked-files=all"]) != "":
        raise InstallError("worktree_not_clean")
    try:
        git(["merge-base", "--is-ancestor", LOCK_MERGE_COMMIT, expected_head])
    except InstallError as exc:
        raise InstallError("candidate_lock_merge_not_ancestor") from exc
    for relative, expected in EXPECTED_BLOBS.items():
        actual = git(["rev-parse", expected_head + ":" + relative])
        if actual != expected:
            raise InstallError("reviewed_source_blob_drift:" + relative)

def assert_exact_candidate(
    path: Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
) -> bytes:
    raw = direct_bytes(path, exact_bytes=expected_bytes, maximum=expected_bytes)
    if sha256(raw) != expected_sha256:
        raise InstallError("candidate_sha256_mismatch:" + path.name)
    return raw

def run_compile(argv: list[str], *, env: dict[str, str]) -> None:
    cp = subprocess.run(
        argv,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        check=False,
        timeout=60,
    )
    if cp.returncode != 0:
        raise InstallError("candidate_compile_failed")
    if cp.stdout or cp.stderr:
        raise InstallError("candidate_compile_unexpected_output")

def compile_native(output: Path) -> None:
    env = {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "SOURCE_DATE_EPOCH": "0",
    }
    obj = output.with_suffix(".o")
    cp = subprocess.run(
        [CC, *COMPILE_FLAGS, "-c", "-o", os.fspath(obj), os.fspath(ROOT / NATIVE_REL)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        check=False,
        timeout=60,
    )
    if cp.returncode != 0:
        raise InstallError("candidate_compile_failed")
    link = subprocess.run(
        [CC, *LINK_FLAGS, "-o", os.fspath(output), os.fspath(obj)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        check=False,
        timeout=60,
    )
    if link.returncode != 0:
        raise InstallError("candidate_link_failed")
    strip = subprocess.run(
        [STRIP, "--strip-all", os.fspath(output)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        check=False,
        timeout=60,
    )
    if strip.returncode != 0 or strip.stdout or strip.stderr:
        raise InstallError("candidate_strip_failed")
    try:
        obj.unlink()
    except OSError:
        pass
    raw = assert_exact_candidate(
        output,
        expected_bytes=NATIVE_BYTES,
        expected_sha256=NATIVE_SHA256,
    )
    if not raw.startswith(b"\x7fELF"):
        raise InstallError("candidate_native_not_elf")

def rename_noreplace(source: Path, target: Path) -> None:
    libc = ctypes.CDLL(None, use_errno=True)
    fn = getattr(libc, "renameat2", None)
    if fn is None:
        raise InstallError("renameat2_unavailable")
    fn.argtypes = [
        ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint
    ]
    fn.restype = ctypes.c_int
    rc = fn(
        AT_FDCWD, os.fsencode(source), AT_FDCWD, os.fsencode(target), RENAME_NOREPLACE
    )
    if rc != 0:
        err = ctypes.get_errno()
        raise InstallError("rename_noreplace_failed:" + str(err))

def prepare_candidates(output_dir: Path) -> None:
    if os.geteuid() == 0:
        raise InstallError("candidate_prepare_must_be_unprivileged")
    expected_head = git(["rev-parse", "--verify", "HEAD"])
    verify_repository(
        expected_head,
        require_main=False,
        require_fixed_path=False,
    )
    accepted_lock()
    output_dir = Path(os.path.normpath(os.fspath(output_dir)))
    if not output_dir.is_absolute():
        raise InstallError("prepare_output_must_be_absolute")
    relative = os.path.relpath(output_dir, ROOT)
    if relative == "." or not relative.startswith(".." + os.sep):
        raise InstallError("prepare_output_must_be_outside_repository")
    parent = output_dir.parent
    if parent.resolve() != parent:
        raise InstallError("prepare_parent_alias_forbidden")
    if output_dir.exists() or output_dir.is_symlink():
        raise InstallError("prepare_output_exists")
    stage = Path(tempfile.mkdtemp(prefix=".void-e2-native-v3.", dir=parent))
    try:
        os.chmod(stage, 0o700)
        native = stage / NATIVE_NAME
        runner = stage / RUNNER_NAME
        compile_native(native)
        runner_raw = direct_bytes(ROOT / RUNNER_REL, exact_bytes=RUNNER_BYTES, maximum=RUNNER_BYTES)
        if sha256(runner_raw) != RUNNER_SHA256:
            raise InstallError("runner_source_sha256_mismatch")
        fd = os.open(
            runner,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
            0o400,
        )
        try:
            view = memoryview(runner_raw)
            offset = 0
            while offset < len(view):
                wrote = os.write(fd, view[offset:])
                if wrote <= 0:
                    raise InstallError("prepared_runner_short_write")
                offset += wrote
            os.fsync(fd)
        finally:
            os.close(fd)
        os.chmod(native, 0o500)
        assert_exact_candidate(native, expected_bytes=NATIVE_BYTES, expected_sha256=NATIVE_SHA256)
        assert_exact_candidate(runner, expected_bytes=RUNNER_BYTES, expected_sha256=RUNNER_SHA256)
        rename_noreplace(stage, output_dir)
        parent_fd = os.open(
            parent,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        )
        try:
            os.fsync(parent_fd)
        finally:
            os.close(parent_fd)
    except BaseException:
        shutil.rmtree(stage, ignore_errors=True)
        raise
    print(MARKER + "_PREPARE_GREEN")
    print("expected_head=" + expected_head)
    print("native=" + str(output_dir / NATIVE_NAME))
    print("runner=" + str(output_dir / RUNNER_NAME))
    print("native_sha256=" + NATIVE_SHA256)
    print("runner_sha256=" + RUNNER_SHA256)
    print("protected_install_performed=false")
    print("live_execution=false")
    print("credential_access=false")
    print("signing=false")
    print("funds_movement=false")

def node_identity() -> tuple[int, str]:
    try:
        st = NODE.lstat()
    except OSError as exc:
        raise InstallError("fixed_node_unavailable") from exc
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or st.st_nlink != 1
        or (st.st_mode & 0o022) != 0
        or (st.st_mode & 0o111) == 0
        or st.st_size < 1
        or st.st_size > MAX_NODE_BYTES
    ):
        raise InstallError("fixed_node_metadata_invalid")
    raw = direct_bytes(NODE, exact_bytes=st.st_size, maximum=MAX_NODE_BYTES)
    return len(raw), sha256(raw)

def policy_bytes(expected_head: str, node_bytes: int, node_sha256: str) -> bytes:
    if not SHA40.fullmatch(expected_head):
        raise InstallError("policy_expected_head_invalid")
    if node_bytes <= 0 or node_bytes > MAX_NODE_BYTES or not HEX64.fullmatch(node_sha256):
        raise InstallError("policy_node_identity_invalid")
    text = (
        "schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1\n"
        + "expected_head=" + expected_head + "\n"
        + "runner_sha256=" + RUNNER_SHA256 + "\n"
        + "runner_bytes=" + str(RUNNER_BYTES) + "\n"
        + "node_sha256=" + node_sha256 + "\n"
        + "node_bytes=" + str(node_bytes) + "\n"
    )
    return text.encode("ascii")

def trusted_root_directory(path: Path, *, exact_mode: int | None = None) -> None:
    try:
        st = path.lstat()
    except OSError as exc:
        raise InstallError("trusted_directory_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or (st.st_mode & 0o022) != 0
    ):
        raise InstallError("trusted_directory_invalid:" + str(path))
    if exact_mode is not None and stat.S_IMODE(st.st_mode) != exact_mode:
        raise InstallError("trusted_directory_mode_invalid:" + str(path))

def path_exists(path: Path) -> bool:
    try:
        path.lstat()
        return True
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise InstallError("path_lstat_failed:" + str(path)) from exc

def verify_installed_file(
    dir_fd: int,
    name: str,
    *,
    mode: int,
    expected_bytes: int,
    expected_sha256: str,
) -> None:
    before = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or stat.S_IMODE(before.st_mode) != mode
        or before.st_nlink != 1
        or before.st_size != expected_bytes
    ):
        raise InstallError("installed_file_metadata_invalid:" + name)
    fd = os.open(name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW, dir_fd=dir_fd)
    try:
        opened = os.fstat(fd)
        if not same_identity(before, opened):
            raise InstallError("installed_file_rebound:" + name)
        h = hashlib.sha256()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("installed_file_short_read:" + name)
            h.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("installed_file_grew:" + name)
        after = os.fstat(fd)
        visible = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
        if not same_identity(opened, after) or not same_identity(after, visible):
            raise InstallError("installed_file_changed:" + name)
    finally:
        os.close(fd)
    if h.hexdigest() != expected_sha256:
        raise InstallError("installed_file_sha256_mismatch:" + name)

def verify_installed(expected_head: str) -> None:
    trusted_root_directory(Path("/"))
    trusted_root_directory(INSTALL_PARENT)
    trusted_root_directory(INSTALL_ROOT, exact_mode=0o755)
    entries = sorted(os.listdir(INSTALL_ROOT))
    if entries != sorted((NATIVE_NAME, RUNNER_NAME, POLICY_NAME)):
        raise InstallError("installed_root_entries_invalid")
    node_bytes, node_sha = node_identity()
    policy = policy_bytes(expected_head, node_bytes, node_sha)
    dir_fd = os.open(
        INSTALL_ROOT, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW
    )
    try:
        verify_installed_file(
            dir_fd, NATIVE_NAME, mode=0o555,
            expected_bytes=NATIVE_BYTES, expected_sha256=NATIVE_SHA256,
        )
        verify_installed_file(
            dir_fd, RUNNER_NAME, mode=0o444,
            expected_bytes=RUNNER_BYTES, expected_sha256=RUNNER_SHA256,
        )
        verify_installed_file(
            dir_fd, POLICY_NAME, mode=0o444,
            expected_bytes=len(policy), expected_sha256=sha256(policy),
        )
    finally:
        os.close(dir_fd)

def protected_state(expected_head: str) -> str:
    trusted_root_directory(Path("/"))
    trusted_root_directory(INSTALL_PARENT)
    if path_exists(STAGE_ROOT):
        raise InstallError("staging_root_present")
    if not path_exists(INSTALL_ROOT):
        return "ABSENT_READY_CREATE_ONLY"
    verify_installed(expected_head)
    return "EXACT_INSTALL_PRESENT"

def write_stage_file(
    dir_fd: int,
    name: str,
    raw: bytes,
    *,
    mode: int,
    expected_sha256: str,
) -> None:
    fd = os.open(
        name,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
        mode,
        dir_fd=dir_fd,
    )
    try:
        view = memoryview(raw)
        offset = 0
        while offset < len(view):
            wrote = os.write(fd, view[offset:])
            if wrote <= 0:
                raise InstallError("short_write:" + name)
            offset += wrote
        os.fchown(fd, 0, 0)
        os.fchmod(fd, mode)
        os.fsync(fd)
    finally:
        os.close(fd)
    verify_installed_file(
        dir_fd, name, mode=mode,
        expected_bytes=len(raw), expected_sha256=expected_sha256,
    )

def cleanup_stage(opt_fd: int) -> bool:
    if not path_exists(STAGE_ROOT):
        return True
    try:
        trusted_root_directory(STAGE_ROOT, exact_mode=0o755)
        entries = sorted(os.listdir(STAGE_ROOT))
        if any(name not in (NATIVE_NAME, RUNNER_NAME, POLICY_NAME) for name in entries):
            return False
        stage_fd = os.open(
            STAGE_NAME,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=opt_fd,
        )
        try:
            for name in entries:
                os.unlink(name, dir_fd=stage_fd)
            os.fsync(stage_fd)
        finally:
            os.close(stage_fd)
        os.rmdir(STAGE_NAME, dir_fd=opt_fd)
        os.fsync(opt_fd)
        return True
    except BaseException:
        return False

def source_plan() -> None:
    accepted_lock()
    print(MARKER)
    print("mode=source-plan")
    print("accepted_lock_id=" + LOCK_ID)
    print("target_root=" + str(INSTALL_ROOT))
    print("create_only=true")
    print("atomic_directory_publication=true")
    print("native_candidate_sha256=" + NATIVE_SHA256)
    print("runner_candidate_sha256=" + RUNNER_SHA256)
    print("host_read=false")
    print("host_write=false")
    print("live_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("service_mutation=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")

def plan(native: Path, runner: Path, expected_head: str) -> None:
    accepted_lock()
    verify_repository(expected_head)
    assert_exact_candidate(native, expected_bytes=NATIVE_BYTES, expected_sha256=NATIVE_SHA256)
    assert_exact_candidate(runner, expected_bytes=RUNNER_BYTES, expected_sha256=RUNNER_SHA256)
    node_bytes, node_sha = node_identity()
    state = protected_state(expected_head)
    print(MARKER)
    print("mode=plan")
    print("expected_head=" + expected_head)
    print("candidate_lock_id=" + LOCK_ID)
    print("native_candidate_verified=true")
    print("runner_candidate_verified=true")
    print("node_bytes=" + str(node_bytes))
    print("node_sha256=" + node_sha)
    print("policy_sha256=" + sha256(policy_bytes(expected_head, node_bytes, node_sha)))
    print("protected_state=" + state)
    print("host_write=false")
    print("live_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("service_mutation=false")
    print("funds_movement=false")

def apply(native: Path, runner: Path, expected_head: str, confirm: str | None) -> None:
    if confirm != CONFIRM:
        raise InstallError("explicit_create_only_confirmation_required")
    if os.geteuid() != 0:
        raise InstallError("root_required_for_apply")
    for name in FORBIDDEN_APPLY_ENV:
        if os.environ.get(name):
            raise InstallError("forbidden_apply_environment:" + name)
    accepted_lock()
    verify_repository(expected_head)
    native_raw = assert_exact_candidate(
        native, expected_bytes=NATIVE_BYTES, expected_sha256=NATIVE_SHA256
    )
    runner_raw = assert_exact_candidate(
        runner, expected_bytes=RUNNER_BYTES, expected_sha256=RUNNER_SHA256
    )
    node_bytes, node_sha = node_identity()
    policy = policy_bytes(expected_head, node_bytes, node_sha)
    state = protected_state(expected_head)
    if state == "EXACT_INSTALL_PRESENT":
        print(MARKER + "_GREEN")
        print("protected_install_performed=false")
        print("already_installed_exact=true")
        print("expected_head=" + expected_head)
        print("live_execution=false")
        print("credential_access=false")
        print("signing=false")
        print("funds_movement=false")
        return

    opt_fd = os.open(
        INSTALL_PARENT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    published = False
    try:
        try:
            os.mkdir(STAGE_NAME, 0o755, dir_fd=opt_fd)
            os.chown(STAGE_NAME, 0, 0, dir_fd=opt_fd, follow_symlinks=False)
            os.chmod(STAGE_NAME, 0o755, dir_fd=opt_fd, follow_symlinks=False)
            stage_fd = os.open(
                STAGE_NAME,
                os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                dir_fd=opt_fd,
            )
            try:
                write_stage_file(
                    stage_fd, NATIVE_NAME, native_raw, mode=0o555,
                    expected_sha256=NATIVE_SHA256,
                )
                write_stage_file(
                    stage_fd, RUNNER_NAME, runner_raw, mode=0o444,
                    expected_sha256=RUNNER_SHA256,
                )
                write_stage_file(
                    stage_fd, POLICY_NAME, policy, mode=0o444,
                    expected_sha256=sha256(policy),
                )
                os.fsync(stage_fd)
            finally:
                os.close(stage_fd)

            trusted_root_directory(STAGE_ROOT, exact_mode=0o755)
            stage_entries = sorted(os.listdir(STAGE_ROOT))
            if stage_entries != sorted((NATIVE_NAME, RUNNER_NAME, POLICY_NAME)):
                raise InstallError("stage_entries_invalid")

            libc = ctypes.CDLL(None, use_errno=True)
            fn = getattr(libc, "renameat2", None)
            if fn is None:
                raise InstallError("renameat2_unavailable")
            fn.argtypes = [
                ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p,
                ctypes.c_uint,
            ]
            fn.restype = ctypes.c_int
            rc = fn(
                opt_fd, STAGE_NAME.encode("utf-8"),
                opt_fd, INSTALL_NAME.encode("utf-8"),
                RENAME_NOREPLACE,
            )
            if rc != 0:
                raise InstallError("atomic_publication_failed:" + str(ctypes.get_errno()))
            published = True
            os.fsync(opt_fd)
            verify_installed(expected_head)
        except BaseException as exc:
            if not published:
                cleanup_green = cleanup_stage(opt_fd)
                if isinstance(exc, InstallError):
                    raise InstallError(
                        str(exc) + ":stage_cleanup_" + ("green" if cleanup_green else "failed")
                    ) from exc
                raise
            raise PublishedInstallError("post_publication_failure") from exc
    finally:
        os.close(opt_fd)

    print(MARKER + "_GREEN")
    print("protected_install_performed=true")
    print("publication=true")
    print("final_state_verified=true")
    print("expected_head=" + expected_head)
    print("target_root=" + str(INSTALL_ROOT))
    print("native_sha256=" + NATIVE_SHA256)
    print("runner_sha256=" + RUNNER_SHA256)
    print("policy_sha256=" + sha256(policy))
    print("node_sha256=" + node_sha)
    print("live_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("service_mutation=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")

def self_test() -> None:
    sample = "a" * 40
    node_sha = "b" * 64
    raw = policy_bytes(sample, 123456, node_sha)
    expected = (
        "schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1\n"
        + "expected_head=" + sample + "\n"
        + "runner_sha256=" + RUNNER_SHA256 + "\n"
        + "runner_bytes=" + str(RUNNER_BYTES) + "\n"
        + "node_sha256=" + node_sha + "\n"
        + "node_bytes=123456\n"
    ).encode("ascii")
    if raw != expected:
        raise AssertionError("policy_canonicalization_failed")
    libc = ctypes.CDLL(None)
    if getattr(libc, "renameat2", None) is None:
        raise AssertionError("renameat2_unavailable")
    print(MARKER + "_SELF_TEST_GREEN")
    print("candidate_lock_id=" + LOCK_ID)
    print("create_only=true")
    print("atomic_directory_publication=true")
    print("exact_native_identity_required=true")
    print("exact_runner_identity_required=true")
    print("fixed_root_node_identity_policy_bound=true")
    print("expected_source_head_policy_bound=true")
    print("service_mutation=false")
    print("credential_access=false")
    print("signing=false")
    print("funds_movement=false")

def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--prepare", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--native", type=Path)
    parser.add_argument("--runner", type=Path)
    parser.add_argument("--expected-head")
    parser.add_argument("--confirm")

    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if args.prepare:
        if args.output_dir is None:
            raise InstallError("prepare_output_required")
        prepare_candidates(args.output_dir)
        return 0

    if args.apply and args.confirm != CONFIRM:
        raise InstallError("explicit_create_only_confirmation_required")

    if args.native is None or args.runner is None or not args.expected_head:
        raise InstallError("candidate_and_expected_head_required")

    if args.plan:
        plan(args.native, args.runner, args.expected_head)
        return 0
    apply(args.native, args.runner, args.expected_head, args.confirm)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PublishedInstallError as exc:
        print(MARKER + "_HOLD")
        print("reason=" + str(exc))
        print("protected_install_performed=true")
        print("publication=true")
        print("publication_state=published_needs_inspection")
        print("final_state_verified=false")
        print("live_execution=false")
        print("credential_access=false")
        print("signing=false")
        print("funds_movement=false")
        raise SystemExit(2)
    except InstallError as exc:
        print(MARKER + "_HOLD")
        print("reason=" + str(exc))
        print("protected_install_performed=false")
        print("publication=false")
        print("live_execution=false")
        print("credential_access=false")
        print("signing=false")
        print("funds_movement=false")
        raise SystemExit(2)
