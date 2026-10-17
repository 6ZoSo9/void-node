#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
import pathlib
import re
import stat
import subprocess
import sys
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-candidate-lock-v1.json"
)
LOCK_GIT_BLOB_SHA1 = "a96dee99c89ef386a6cbd05609b8f4a764caada8"
LOCK_ID = (
    "voidbuye2bootstraplock1_"
    "4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23"
)
CANDIDATE_ID = (
    "voidbuye2bootstrapcand1_"
    "24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851"
)

BOOTSTRAP_BYTES = 731_072
BOOTSTRAP_SHA256 = (
    "1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189"
)
BOOTSTRAP_GIT_BLOB_SHA1 = "5d35e762fa4b510baeb89b2840d5287cc4fd6716"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V1"
)
POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V1"
)
CONFIRM_TOKEN = (
    "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_BOOTSTRAP_V1_CREATE_ONLY"
)
PLAN_PREFIX = "voidbuye2bootstrapinstall1_"

INSTALL_PARENT = pathlib.Path("/opt")
INSTALL_NAME = (
    "void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v1"
)
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
STAGE_NAME = "." + INSTALL_NAME + ".stage"
STAGE_ROOT = INSTALL_PARENT / STAGE_NAME

BIN_DIR_NAME = "bin"
BOOTSTRAP_NAME = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v1"
)
POLICY_NAME = "policy-v1.conf"

BIN_DIR = INSTALL_ROOT / BIN_DIR_NAME
BOOTSTRAP_TARGET = BIN_DIR / BOOTSTRAP_NAME
POLICY_TARGET = INSTALL_ROOT / POLICY_NAME

FIXED_GIT = pathlib.Path("/usr/bin/git")
FIXED_PYTHON = pathlib.Path("/usr/bin/python3")

RENAME_NOREPLACE = 1
MAX_READ_CHUNK = 1024 * 1024
MAX_PYTHON_BYTES = 512 * 1024 * 1024
HEX40 = re.compile(r"^[0-9a-f]{40}$")

READY_STATE = "DORMANT_FIRST_ENTRY_BOOTSTRAP_ROOT_ABSENT_READY_FOR_CREATE_ONLY"
GREEN_STATE = "DORMANT_FIRST_ENTRY_BOOTSTRAP_PROTECTED_ROOT_GREEN"

FORBIDDEN_APPLY_ENV = (
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "LD_AUDIT",
    "LD_DEBUG",
    "GLIBC_TUNABLES",
    "PYTHONPATH",
    "PYTHONHOME",
    "PYTHONSTARTUP",
    "PYTHONINSPECT",
    "PYTHONWARNINGS",
    "PYTHONBREAKPOINT",
)


class InstallError(RuntimeError):
    pass


class PublishedInstallError(InstallError):
    def __init__(
        self,
        reason: str,
        *,
        phase: str,
        parent_fsync_completed: bool | None,
        final_verification_completed: bool | None,
        original_failure_class: str,
        original_failure_reason: str,
    ) -> None:
        super().__init__(reason)
        self.phase = phase
        self.parent_fsync_completed = parent_fsync_completed
        self.final_verification_completed = final_verification_completed
        self.original_failure_class = original_failure_class
        self.original_failure_reason = original_failure_reason


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def canonical_json(value: Any) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def _same_stat(left: os.stat_result, right: os.stat_result) -> bool:
    return (
        left.st_dev == right.st_dev
        and left.st_ino == right.st_ino
        and left.st_mode == right.st_mode
        and left.st_uid == right.st_uid
        and left.st_gid == right.st_gid
        and left.st_nlink == right.st_nlink
        and left.st_size == right.st_size
        and left.st_mtime_ns == right.st_mtime_ns
        and left.st_ctime_ns == right.st_ctime_ns
    )


def _trusted_root_directory(path: pathlib.Path, *, exact_mode: int | None = None) -> os.stat_result:
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
    return st


def _trusted_executable(path: pathlib.Path) -> os.stat_result:
    real = pathlib.Path(os.path.realpath(path))
    _trusted_root_directory(pathlib.Path("/"))
    parent = pathlib.Path(real.anchor)
    for part in real.parent.parts[1:]:
        parent = parent / part
        _trusted_root_directory(parent)
    try:
        st = real.lstat()
    except OSError as exc:
        raise InstallError("trusted_executable_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or st.st_nlink != 1
        or (st.st_mode & 0o022) != 0
        or (st.st_mode & 0o111) == 0
    ):
        raise InstallError("trusted_executable_invalid:" + str(path))
    return st


def _read_fd_exact(fd: int, expected_bytes: int, label: str) -> bytes:
    os.lseek(fd, 0, os.SEEK_SET)
    out = bytearray()
    while len(out) < expected_bytes:
        chunk = os.read(fd, min(MAX_READ_CHUNK, expected_bytes - len(out)))
        if not chunk:
            raise InstallError(label + "_short_read")
        out.extend(chunk)
    if os.read(fd, 1):
        raise InstallError(label + "_grew")
    os.lseek(fd, 0, os.SEEK_SET)
    return bytes(out)


def _read_candidate(path: pathlib.Path) -> bytes:
    raw_path = str(path)
    if (
        not path.is_absolute()
        or os.path.normpath(raw_path) != raw_path
        or "\n" in raw_path
        or "\r" in raw_path
    ):
        raise InstallError("bootstrap_candidate_path_invalid")
    try:
        before = path.lstat()
    except OSError as exc:
        raise InstallError("bootstrap_candidate_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size != BOOTSTRAP_BYTES
    ):
        raise InstallError("bootstrap_candidate_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise InstallError("bootstrap_candidate_rebound")
        raw = _read_fd_exact(fd, BOOTSTRAP_BYTES, "bootstrap_candidate")
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise InstallError("bootstrap_candidate_generation_changed")
    finally:
        os.close(fd)
    if sha256(raw) != BOOTSTRAP_SHA256:
        raise InstallError("bootstrap_candidate_sha256_mismatch")
    if git_blob_sha1(raw) != BOOTSTRAP_GIT_BLOB_SHA1:
        raise InstallError("bootstrap_candidate_git_blob_mismatch")
    return raw


def _git_env() -> dict[str, str]:
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
    }


def _git(args: list[str]) -> bytes:
    _trusted_executable(FIXED_GIT)
    cp = subprocess.run(
        [str(FIXED_GIT), "-C", str(ROOT), "-c", "safe.directory=" + str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=_git_env(),
        timeout=20,
        check=False,
    )
    if cp.returncode != 0:
        raise InstallError(
            "git_command_failed:"
            + str(cp.returncode)
            + ":"
            + cp.stderr.decode("utf-8", "replace")[-1000:]
        )
    return cp.stdout


def checkout_snapshot(expected_head: str) -> dict[str, Any]:
    if HEX40.fullmatch(expected_head) is None:
        raise InstallError("expected_head_invalid")
    head = _git(["rev-parse", "--verify", "HEAD^{commit}"]).decode().strip()
    tree = _git(["rev-parse", "--verify", "HEAD^{tree}"]).decode().strip()
    branch = _git(["symbolic-ref", "--short", "-q", "HEAD"]).decode().strip()
    status = _git(["status", "--porcelain=v1", "--untracked-files=all"])
    if head != expected_head:
        raise InstallError("checkout_head_mismatch")
    if branch != "main":
        raise InstallError("checkout_branch_not_main")
    if status != b"":
        raise InstallError("checkout_not_clean")
    if HEX40.fullmatch(tree) is None:
        raise InstallError("checkout_tree_invalid")
    return {"head": head, "tree": tree, "branch": branch, "clean": True}


def _git_object(expected_head: str, relative: str, expected_blob: str) -> bytes:
    raw = _git(["show", expected_head + ":" + relative])
    if git_blob_sha1(raw) != expected_blob:
        raise InstallError("git_object_blob_mismatch:" + relative)
    return raw


def accepted_lock(expected_head: str) -> dict[str, Any]:
    raw = _git_object(expected_head, LOCK_REL, LOCK_GIT_BLOB_SHA1)
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InstallError("accepted_lock_json_invalid") from exc
    if not isinstance(value, dict):
        raise InstallError("accepted_lock_shape_invalid")
    required = {
        "schema":
            "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_candidate_lock_v1",
        "marker":
            "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_CANDIDATE_LOCK_V1",
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "candidate_accepted": True,
        "bootstrap_binary_identity_accepted": True,
        "bootstrap_source_identity_bound": True,
        "installer_source_identity_bound": True,
        "protected_bootstrap_install_authorized": False,
        "protected_installer_apply_authorized": False,
        "live_execution_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "rpc_call_authorized": False,
        "payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False,
        "treasury_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
        "production_host_evidence_authority": False,
        "next_gate":
            "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v1",
        "lock_id": LOCK_ID,
    }
    for key, expected in required.items():
        if value.get(key) != expected:
            raise InstallError("accepted_lock_field_mismatch:" + key)
    report = value.get("candidate_report")
    if not isinstance(report, dict):
        raise InstallError("accepted_lock_candidate_missing")
    checks = {
        "candidate_id": CANDIDATE_ID,
        "bootstrap_binary_git_blob_sha1": BOOTSTRAP_GIT_BLOB_SHA1,
        "bootstrap_binary_sha256": BOOTSTRAP_SHA256,
        "bootstrap_binary_bytes": BOOTSTRAP_BYTES,
        "fixed_root": str(INSTALL_ROOT),
        "fixed_python": str(FIXED_PYTHON),
        "compile_confirmation": "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY",
        "sealed_bootstrap_source_snapshot": True,
        "production_defaults_preserved": True,
        "toolchain_revalidated_after_build": True,
        "two_builds_byte_identical": True,
        "static_no_interp": True,
        "dynamic_needed_absent": True,
        "semantic_report_validation_fail_closed": True,
    }
    for key, expected in checks.items():
        if report.get(key) != expected:
            raise InstallError("accepted_lock_candidate_field_mismatch:" + key)
    material = dict(value)
    lock_id = material.pop("lock_id", None)
    expected_lock = "voidbuye2bootstraplock1_" + sha256(canonical_json(material))
    if lock_id != expected_lock or lock_id != LOCK_ID:
        raise InstallError("accepted_lock_content_id_mismatch")
    return value


def _tool_snapshot(path: pathlib.Path, *, executable: bool, maximum_bytes: int) -> dict[str, Any]:
    st = _trusted_executable(path) if executable else path.lstat()
    if st.st_size < 1 or st.st_size > maximum_bytes:
        raise InstallError("tool_size_invalid:" + str(path))
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(st, opened):
            raise InstallError("tool_rebound:" + str(path))
        raw = _read_fd_exact(fd, st.st_size, "tool")
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise InstallError("tool_generation_changed:" + str(path))
    finally:
        os.close(fd)
    return {
        "path": str(pathlib.Path(os.path.realpath(path))),
        "dev": st.st_dev,
        "ino": st.st_ino,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "bytes": st.st_size,
        "sha256": sha256(raw),
    }


def python_snapshot() -> dict[str, Any]:
    return _tool_snapshot(FIXED_PYTHON, executable=True, maximum_bytes=MAX_PYTHON_BYTES)


def build_policy(python: dict[str, Any]) -> bytes:
    return (
        "schema=" + POLICY_SCHEMA + "\n"
        "python_sha256=" + str(python["sha256"]) + "\n"
        "python_bytes=" + str(python["bytes"]) + "\n"
    ).encode("ascii")


def _verify_file(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_mode: int,
) -> None:
    st = path.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or st.st_nlink != 1
        or stat.S_IMODE(st.st_mode) != expected_mode
        or st.st_size != expected_bytes
    ):
        raise InstallError("installed_file_metadata_invalid:" + str(path))
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(st, opened):
            raise InstallError("installed_file_rebound:" + str(path))
        raw = _read_fd_exact(fd, expected_bytes, "installed_file")
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise InstallError("installed_file_changed:" + str(path))
    finally:
        os.close(fd)
    if sha256(raw) != expected_sha256:
        raise InstallError("installed_file_sha256_mismatch:" + str(path))


def _verify_root(root: pathlib.Path, policy: bytes) -> None:
    _trusted_root_directory(root, exact_mode=0o755)
    entries = sorted(os.listdir(root))
    if entries != sorted((BIN_DIR_NAME, POLICY_NAME)):
        raise InstallError("installed_root_entries_invalid")
    bin_dir = root / BIN_DIR_NAME
    _trusted_root_directory(bin_dir, exact_mode=0o755)
    bin_entries = sorted(os.listdir(bin_dir))
    if bin_entries != [BOOTSTRAP_NAME]:
        raise InstallError("installed_bin_entries_invalid")
    _verify_file(
        bin_dir / BOOTSTRAP_NAME,
        expected_bytes=BOOTSTRAP_BYTES,
        expected_sha256=BOOTSTRAP_SHA256,
        expected_mode=0o555,
    )
    _verify_file(
        root / POLICY_NAME,
        expected_bytes=len(policy),
        expected_sha256=sha256(policy),
        expected_mode=0o444,
    )


def _exists(path: pathlib.Path) -> bool:
    try:
        path.lstat()
        return True
    except FileNotFoundError:
        return False


def protected_state(policy: bytes) -> str:
    _trusted_root_directory(pathlib.Path("/"))
    _trusted_root_directory(INSTALL_PARENT)
    if _exists(STAGE_ROOT):
        raise InstallError("staging_root_present")
    if not _exists(INSTALL_ROOT):
        return READY_STATE
    _verify_root(INSTALL_ROOT, policy)
    return GREEN_STATE


def collect_plan(bootstrap: pathlib.Path, expected_head: str) -> dict[str, Any]:
    lock = accepted_lock(expected_head)
    bootstrap_raw = _read_candidate(bootstrap)
    checkout = checkout_snapshot(expected_head)
    git_tool = _tool_snapshot(FIXED_GIT, executable=True, maximum_bytes=64 * 1024 * 1024)
    python = python_snapshot()
    policy = build_policy(python)
    state = protected_state(policy)
    body = {
        "schema":
            "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_plan_v1",
        "version": 1,
        "lock_id": LOCK_ID,
        "candidate_id": CANDIDATE_ID,
        "expected_head": expected_head,
        "checkout": checkout,
        "git_tool": git_tool,
        "python": python,
        "bootstrap_sha256": sha256(bootstrap_raw),
        "bootstrap_bytes": len(bootstrap_raw),
        "bootstrap_git_blob_sha1": git_blob_sha1(bootstrap_raw),
        "policy_sha256": sha256(policy),
        "policy_bytes": len(policy),
        "protected_state": state,
        "create_only": True,
        "rename_noreplace_required": True,
        "bootstrap_execution_authorized": False,
        "protected_installer_apply_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "rpc_call_authorized": False,
        "payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False,
        "treasury_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
        "production_host_evidence_authority": False,
    }
    return {
        "lock": lock,
        "body": body,
        "plan_id": PLAN_PREFIX + sha256(canonical_json(body)),
        "bootstrap_raw": bootstrap_raw,
        "policy": policy,
    }


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("bootstrap_sha256=" + BOOTSTRAP_SHA256)
    print("bootstrap_bytes=" + str(BOOTSTRAP_BYTES))
    print("install_root=" + str(INSTALL_ROOT))
    print("create_only=true")
    print("rename_noreplace_required=true")
    print("bootstrap_execution_authorized=false")
    print("protected_installer_apply_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement_authorized=false")
    print("production_host_evidence_authority=false")


def plan(bootstrap: pathlib.Path, expected_head: str) -> None:
    result = collect_plan(bootstrap, expected_head)
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("plan_id=" + result["plan_id"])
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("expected_head=" + expected_head)
    print("protected_state=" + str(body["protected_state"]))
    print("bootstrap_candidate_verified=true")
    print("python_generation_bound=true")
    print("policy_sha256=" + str(body["policy_sha256"]))
    print("policy_bytes=" + str(body["policy_bytes"]))
    print("create_only=true")
    print("rename_noreplace_required=true")
    print("filesystem_write=false")
    print("bootstrap_execution_authorized=false")
    print("protected_installer_apply_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement_authorized=false")
    print("production_host_evidence_authority=false")
    if body["protected_state"] == GREEN_STATE:
        print("already_installed=true")
        print(
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
            "BOOTSTRAP_INSTALLED_READ_ONLY_QUALIFICATION_V1"
        )
    else:
        print("already_installed=false")
        print(
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
            "BOOTSTRAP_CREATE_ONLY_PROTECTED_INSTALL_V1"
        )


def _renameat2(dir_fd: int, source: str, target: str, flags: int) -> None:
    libc = ctypes.CDLL(None, use_errno=True)
    fn = getattr(libc, "renameat2", None)
    if fn is None:
        raise InstallError("renameat2_unavailable")
    fn.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    fn.restype = ctypes.c_int
    rc = fn(dir_fd, source.encode(), dir_fd, target.encode(), flags)
    if rc != 0:
        raise InstallError("renameat2_failed:" + str(ctypes.get_errno()))


def _create_file(
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
        0o400,
        dir_fd=dir_fd,
    )
    try:
        os.fchown(fd, 0, 0)
        view = memoryview(raw)
        offset = 0
        while offset < len(view):
            wrote = os.write(fd, view[offset:])
            if wrote <= 0:
                raise InstallError("stage_short_write:" + name)
            offset += wrote
        os.fchmod(fd, mode)
        os.fsync(fd)
        os.lseek(fd, 0, os.SEEK_SET)
        digest = hashlib.sha256()
        remaining = len(raw)
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("stage_short_read:" + name)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("stage_file_grew:" + name)
        if digest.hexdigest() != expected_sha256:
            raise InstallError("stage_sha256_mismatch:" + name)
    finally:
        os.close(fd)


def _require_secure_apply_context() -> None:
    if sys.flags.isolated != 1:
        raise InstallError("python_isolated_mode_required")
    present = [name for name in FORBIDDEN_APPLY_ENV if name in os.environ]
    if present:
        raise InstallError("forbidden_apply_environment:" + ",".join(present))


def emit_operation_authority() -> None:
    print(MARKER)
    print("mode=apply")
    print("authority_boundary=PRE_MUTATION")
    print("filesystem_mutation_possible=true")
    print("filesystem_mutation_performed_at_pre_mutation_boundary=false")
    print("create_only=true")
    print("bootstrap_execution=false")
    print("protected_installer_apply=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    sys.stdout.flush()


def _cleanup_stage(opt_fd: int, stage_fd: int) -> bool:
    try:
        visible = os.stat(STAGE_NAME, dir_fd=opt_fd, follow_symlinks=False)
        opened = os.fstat(stage_fd)
        if not _same_stat(visible, opened):
            return False
        bin_fd = os.open(
            BIN_DIR_NAME,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=stage_fd,
        )
        try:
            os.unlink(BOOTSTRAP_NAME, dir_fd=bin_fd)
        finally:
            os.close(bin_fd)
        os.rmdir(BIN_DIR_NAME, dir_fd=stage_fd)
        os.unlink(POLICY_NAME, dir_fd=stage_fd)
        os.rmdir(STAGE_NAME, dir_fd=opt_fd)
        os.fsync(opt_fd)
        return True
    except OSError:
        return False


def _bounded_failure(exc: BaseException) -> tuple[str, str]:
    return type(exc).__name__[:80], str(exc).replace("\n", " ")[:500]


def apply(
    bootstrap: pathlib.Path,
    expected_head: str,
    expected_plan_id: str,
    confirm: str,
) -> None:
    emit_operation_authority()
    if confirm != CONFIRM_TOKEN:
        raise InstallError("explicit_create_only_confirmation_required")
    if os.geteuid() != 0:
        raise InstallError("root_required_for_apply")
    _require_secure_apply_context()

    initial = collect_plan(bootstrap, expected_head)
    if initial["plan_id"] != expected_plan_id:
        raise InstallError("expected_plan_id_mismatch")
    body = initial["body"]
    if body["protected_state"] == GREEN_STATE:
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("protected_install_performed=false")
        print("bootstrap_execution=false")
        print("credential_access=false")
        print("transaction=false")
        print("funds_movement=false")
        return
    if body["protected_state"] != READY_STATE:
        raise InstallError("apply_state_not_ready")

    checkout_before = body["checkout"]
    python_before = body["python"]
    policy = initial["policy"]
    bootstrap_raw = initial["bootstrap_raw"]

    opt_fd = os.open(
        INSTALL_PARENT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    stage_fd: int | None = None
    stage_created = False
    published = False
    parent_fsync_completed = False
    final_verification_completed = False
    try:
        if _exists(STAGE_ROOT) or _exists(INSTALL_ROOT):
            raise InstallError("apply_target_or_stage_present")
        os.mkdir(STAGE_NAME, 0o755, dir_fd=opt_fd)
        stage_created = True
        stage_fd = os.open(
            STAGE_NAME,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=opt_fd,
        )
        os.fchown(stage_fd, 0, 0)
        os.fchmod(stage_fd, 0o755)

        os.mkdir(BIN_DIR_NAME, 0o755, dir_fd=stage_fd)
        bin_fd = os.open(
            BIN_DIR_NAME,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=stage_fd,
        )
        try:
            os.fchown(bin_fd, 0, 0)
            os.fchmod(bin_fd, 0o755)
            _create_file(
                bin_fd,
                BOOTSTRAP_NAME,
                bootstrap_raw,
                mode=0o555,
                expected_sha256=BOOTSTRAP_SHA256,
            )
            os.fsync(bin_fd)
        finally:
            os.close(bin_fd)

        _create_file(
            stage_fd,
            POLICY_NAME,
            policy,
            mode=0o444,
            expected_sha256=sha256(policy),
        )
        os.fsync(stage_fd)
        os.fsync(opt_fd)

        if checkout_snapshot(expected_head) != checkout_before:
            raise InstallError("checkout_generation_changed_before_publication")
        if python_snapshot() != python_before:
            raise InstallError("python_generation_changed_before_publication")
        accepted_lock(expected_head)
        _verify_root(STAGE_ROOT, policy)

        _renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)
        stage_created = False
        published = True
        os.fsync(opt_fd)
        parent_fsync_completed = True

        _verify_root(INSTALL_ROOT, policy)
        if checkout_snapshot(expected_head) != checkout_before:
            raise InstallError("checkout_generation_changed_after_publication")
        if python_snapshot() != python_before:
            raise InstallError("python_generation_changed_after_publication")
        final_verification_completed = True
    except BaseException as exc:
        if published:
            klass, reason = _bounded_failure(exc)
            raise PublishedInstallError(
                "published_bootstrap_install_needs_inspection",
                phase="post_publication_verification",
                parent_fsync_completed=parent_fsync_completed,
                final_verification_completed=final_verification_completed,
                original_failure_class=klass,
                original_failure_reason=reason,
            ) from exc
        if stage_created and stage_fd is not None:
            cleanup_green = _cleanup_stage(opt_fd, stage_fd)
            print("prepublication_stage_cleanup_attempted=true")
            print("prepublication_stage_cleanup_green=" + str(cleanup_green).lower())
        raise
    finally:
        if stage_fd is not None:
            try:
                os.close(stage_fd)
            except OSError:
                pass
        os.close(opt_fd)

    print(MARKER)
    print("mode=apply")
    print("status=GREEN")
    print("plan_id=" + expected_plan_id)
    print("protected_install_performed=true")
    print("publication_state=create_only_rename_noreplace_verified")
    print("final_state_verified=true")
    print("bootstrap_sha256=" + BOOTSTRAP_SHA256)
    print("bootstrap_bytes=" + str(BOOTSTRAP_BYTES))
    print("policy_sha256=" + str(body["policy_sha256"]))
    print("policy_bytes=" + str(body["policy_bytes"]))
    print("bootstrap_execution=false")
    print("protected_installer_apply=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print(
        "next_action=EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_"
        "INSTALLED_READ_ONLY_QUALIFICATION_V1"
    )


def self_test() -> None:
    assert LOCK_ID.startswith("voidbuye2bootstraplock1_")
    assert CANDIDATE_ID.startswith("voidbuye2bootstrapcand1_")
    assert len(BOOTSTRAP_SHA256) == 64
    assert BOOTSTRAP_BYTES == 731_072
    assert INSTALL_ROOT == pathlib.Path(
        "/opt/void-buy-void-epoch2-dormant-first-entry-"
        "protected-install-bootstrap-v1"
    )
    assert CONFIRM_TOKEN.endswith("_CREATE_ONLY")
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_lock_identity_bound=true")
    print("accepted_bootstrap_identity_bound=true")
    print("fixed_protected_root_bound=true")
    print("python_policy_generation_bound=true")
    print("create_only=true")
    print("rename_noreplace_required=true")
    print("bootstrap_execution_authorized=false")
    print("protected_installer_apply_authorized=false")
    print("credential_access_authorized=false")
    print("transaction_authorized=false")
    print("funds_movement_authorized=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--bootstrap", default="")
    parser.add_argument("--expected-head", default="")
    parser.add_argument("--expected-plan-id", default="")
    parser.add_argument("--confirm", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if not args.bootstrap or not args.expected_head:
        raise InstallError("bootstrap_expected_head_required")
    bootstrap = pathlib.Path(args.bootstrap)
    if args.plan:
        plan(bootstrap, args.expected_head)
        return 0
    if not args.expected_plan_id:
        raise InstallError("expected_plan_id_required")
    apply(bootstrap, args.expected_head, args.expected_plan_id, args.confirm)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PublishedInstallError as exc:
        print(MARKER)
        print("status=HOLD")
        print("receipt_boundary=FINAL_FAILURE_RECEIPT")
        print("publication=true")
        print("publication_state=published_needs_inspection")
        print("failure_phase=" + exc.phase)
        print(
            "parent_fsync_completed="
            + ("unknown" if exc.parent_fsync_completed is None else str(exc.parent_fsync_completed).lower())
        )
        print(
            "final_verification_completed="
            + ("unknown" if exc.final_verification_completed is None else str(exc.final_verification_completed).lower())
        )
        print("original_failure_class=" + exc.original_failure_class)
        print("original_failure_reason=" + exc.original_failure_reason)
        print("bootstrap_execution=false")
        print("credential_access=false")
        print("transaction=false")
        print("funds_movement=false")
        raise SystemExit(2)
    except InstallError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("bootstrap_execution=false")
        print("protected_installer_apply=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("treasury_liquidity_action=false")
        print("funds_movement=false")
        raise SystemExit(2)
