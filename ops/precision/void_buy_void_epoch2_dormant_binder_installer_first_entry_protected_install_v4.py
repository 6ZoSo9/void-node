#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import fcntl
import hashlib
import json
import os
import pathlib
import re
import resource
import selectors
import signal
import stat
import subprocess
import sys
import tempfile
import time
from typing import Any

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json"
)
LOCK_GIT_BLOB_SHA1 = "f8ff6fbb855aecafc329cd60622cf3af782745a3"
LOCK_ID = (
    "voidbuye2dormantfirstentrylock1_"
    "bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85"
)
CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand1_"
    "b7109c847373114e2d5e044928ecc4e30c65ef446880d70d9ec57d5853ad3736"
)

LAUNCHER_BYTES = 731_072
LAUNCHER_SHA256 = (
    "4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a"
)
NATIVE_BYTES = 726_976
NATIVE_SHA256 = (
    "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
)

RUNTIME_INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
RUNTIME_INSTALLER_GIT_BLOB_SHA1 = (
    "f3d6b1559be7490303cf36338c4bfa38fdaa390a"
)
RUNTIME_INSTALLER_BYTES = 57_255
RUNTIME_INSTALLER_SHA256 = (
    "602d7fbc256d346b3f80adc93e3b20a39403be5158e944e23456851764a954b9"
)

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_"
    "INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V4"
)
# V4 repairs the repository witness while preserving the authenticated parent and terminal contract.
# Keep the payload namespace and policy schema compatible with the frozen lock.
POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1"
)
CONFIRM_TOKEN = "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V4_CREATE_ONLY"
PLAN_PREFIX = "voidbuye2dormantfirstentryinstall4_"

INSTALL_PARENT = pathlib.Path("/opt")
INSTALL_NAME = "void-buy-void-epoch2-dormant-binder-installer-first-entry-v1"
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
STAGE_NAME = "." + INSTALL_NAME + ".stage"
STAGE_ROOT = INSTALL_PARENT / STAGE_NAME

BIN_DIR = "bin"
SOURCE_DIR = "source"
OPS_DIR = "ops"
PRECISION_DIR = "precision"
INPUT_DIR = "input"

LAUNCHER_NAME = "void_buy_void_epoch2_dormant_binder_installer_first_entry_v1"
POLICY_NAME = "policy-v1.conf"
RUNTIME_INSTALLER_NAME = (
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
NATIVE_NAME = "void_buy_void_epoch2_dormant_binder_native_candidate_v2"

LAUNCHER_TARGET = INSTALL_ROOT / BIN_DIR / LAUNCHER_NAME
POLICY_TARGET = INSTALL_ROOT / POLICY_NAME
RUNTIME_INSTALLER_TARGET = (
    INSTALL_ROOT / SOURCE_DIR / OPS_DIR / PRECISION_DIR / RUNTIME_INSTALLER_NAME
)
NATIVE_TARGET = INSTALL_ROOT / INPUT_DIR / NATIVE_NAME

FIXED_GIT = pathlib.Path("/usr/bin/git")
FIXED_PYTHON = pathlib.Path("/usr/bin/python3")
FIXED_CHECKOUT = pathlib.Path("/home/zoso/dev/void-node")

# This is the closed application dependency set. The loader, Python standard
# library and libc remain root-custodied OS inputs; automatic site startup is
# disabled. Neither a moving branch tip nor a compiled binary's self-hash is
# an immutable source-generation identifier.
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4.py"
)
BOOTSTRAP_SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.c"
)
MANIFEST_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-source-generation-v2.conf"
)
BOOTSTRAP_ROOT = pathlib.Path(
    "/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v5"
)
BOOTSTRAP_SELF = BOOTSTRAP_ROOT / "bin" / (
    "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5"
)
BOOTSTRAP_MANIFEST = BOOTSTRAP_ROOT / "source-generation-v2.conf"
BOOTSTRAP_POLICY = BOOTSTRAP_ROOT / "policy-v1.conf"
MANIFEST_SCHEMA = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_SOURCE_GENERATION_V2"
HOST_POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V5"
)
PARENT_PROOF_SCHEMA = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_V2"
PARENT_PROOF_ENV = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_FD"
SOURCE_GENERATION_PREFIX = "voidbuye2dormantsourcegen2_"
LOCK_BYTES = 3_939
LOCK_SHA256 = "f10a73ceda4ce49b76039324a4d3a1a25bc23e1138f4c3ed5b0f1b82ba60e812"
MAX_MANIFEST_BYTES = 16 * 1024
MAX_HOST_POLICY_BYTES = 1024
MAX_PARENT_PROOF_BYTES = 8192
MAX_APPLICATION_SOURCE_BYTES = 2 * 1024 * 1024
MAX_GIT_BYTES = 64 * 1024 * 1024
SOURCE_ROLES = ("installer", "bootstrap_source", "lock", "runtime_installer")
FD_ROLES = (
    "proof", "manifest", "installer", "bootstrap_source", "lock",
    "runtime_installer", "launcher", "native", "policy", "python", "git",
    "checkout", "git_dir",
)
MANIFEST_KEYS = (
    "schema", "repository", "trusted_os_runtime", "checkout_path",
    "bootstrap_root", "bootstrap_self", "manifest_rel",
    "installer_rel", "installer_blob_sha1", "installer_bytes", "installer_sha256",
    "bootstrap_source_rel", "bootstrap_source_blob_sha1",
    "bootstrap_source_bytes", "bootstrap_source_sha256",
    "lock_rel", "lock_blob_sha1", "lock_bytes", "lock_sha256",
    "runtime_installer_rel", "runtime_installer_blob_sha1",
    "runtime_installer_bytes", "runtime_installer_sha256",
    "launcher_bytes", "launcher_sha256", "native_bytes", "native_sha256",
    "python_path", "git_path", "install_root", "payload_policy_schema",
    "host_policy_schema", "parent_proof_schema", "plan_prefix", "confirm_token",
)
# Keep the reviewed production paths literal here. Source-only fixtures may
# select a disposable checkout without weakening manifest parsing semantics.
MANIFEST_FIXED_VALUES = {
    "schema": MANIFEST_SCHEMA,
    "repository": "6ZoSo9/void-node",
    "trusted_os_runtime": "root_custodied_linux_loader_python_stdlib_libc_v1",
    "checkout_path": "/home/zoso/dev/void-node",
    "bootstrap_root": str(BOOTSTRAP_ROOT),
    "bootstrap_self": str(BOOTSTRAP_SELF),
    "manifest_rel": MANIFEST_REL,
    "installer_rel": INSTALLER_REL,
    "bootstrap_source_rel": BOOTSTRAP_SOURCE_REL,
    "lock_rel": LOCK_REL,
    "lock_blob_sha1": LOCK_GIT_BLOB_SHA1,
    "lock_bytes": str(LOCK_BYTES),
    "lock_sha256": LOCK_SHA256,
    "runtime_installer_rel": RUNTIME_INSTALLER_REL,
    "runtime_installer_blob_sha1": RUNTIME_INSTALLER_GIT_BLOB_SHA1,
    "runtime_installer_bytes": str(RUNTIME_INSTALLER_BYTES),
    "runtime_installer_sha256": RUNTIME_INSTALLER_SHA256,
    "launcher_bytes": str(LAUNCHER_BYTES),
    "launcher_sha256": LAUNCHER_SHA256,
    "native_bytes": str(NATIVE_BYTES),
    "native_sha256": NATIVE_SHA256,
    "python_path": "/usr/bin/python3",
    "git_path": "/usr/bin/git",
    "install_root": "/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1",
    "payload_policy_schema": POLICY_SCHEMA,
    "host_policy_schema": HOST_POLICY_SCHEMA,
    "parent_proof_schema": PARENT_PROOF_SCHEMA,
    "plan_prefix": PLAN_PREFIX,
    "confirm_token": CONFIRM_TOKEN,
}
HOST_POLICY_KEYS = (
    "schema", "python_sha256", "python_bytes", "git_sha256", "git_bytes",
)
PARENT_PROOF_KEYS = (
    "schema", "parent_pid", "parent_start_ticks", "parent_exe_dev",
    "parent_exe_ino", "operation", "expected_head", "expected_tree",
    "expected_plan_id", "source_generation_id", "manifest_sha256",
    "manifest_bytes", "host_policy_sha256", "host_policy_bytes",
) + tuple(role + suffix for role in FD_ROLES for suffix in ("_fd", "_dev", "_ino"))
CHILD_BASE_ENV = {
    "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C",
    "LC_ALL": "C", "TZ": "UTC",
}
_BOOTSTRAP_CONTEXT: dict[str, Any] | None = None

RENAME_NOREPLACE = 1
MAX_READ_CHUNK = 1024 * 1024
MAX_PYTHON_BYTES = 512 * 1024 * 1024
HEX40 = re.compile(r"^[0-9a-f]{40}$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")

READY_STATE = "DORMANT_FIRST_ENTRY_ROOT_ABSENT_READY_FOR_CREATE_ONLY"
GREEN_STATE = "DORMANT_FIRST_ENTRY_PROTECTED_ROOT_GREEN"

FORBIDDEN_APPLY_ENV = (
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "LD_AUDIT",
    "LD_DEBUG",
    "GLIBC_TUNABLES",
    "PYTHONPATH",
    "PYTHONHOME",
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
        self.install_parent_close_completed: bool | None = None
        self.close_failure_class = "none"
        self.close_failure_reason = "none"


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


def _bounded_failure(exc: BaseException) -> tuple[str, str]:
    klass = type(exc).__name__[:128]
    reason = str(exc).replace("\n", " ").replace("\r", " ")[:512]
    return klass, reason


def _trusted_root_directory(
    path: pathlib.Path,
    *,
    exact_mode: int | None = None,
) -> os.stat_result:
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


def _tool_snapshot(
    path: pathlib.Path,
    *,
    executable: bool,
    maximum_bytes: int,
) -> dict[str, Any]:
    real = pathlib.Path(os.path.realpath(path))
    parent = pathlib.Path(real.anchor)
    _trusted_root_directory(parent)
    for part in real.parent.parts[1:]:
        parent = parent / part
        _trusted_root_directory(parent)
    try:
        before = real.lstat()
    except OSError as exc:
        raise InstallError("tool_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or before.st_nlink != 1
        or (before.st_mode & 0o022) != 0
        or before.st_size < 1
        or before.st_size > maximum_bytes
        or (executable and (before.st_mode & 0o111) == 0)
    ):
        raise InstallError("tool_metadata_invalid:" + str(path))
    fd = os.open(real, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise InstallError("tool_rebound:" + str(path))
        digest = hashlib.sha256()
        remaining = opened.st_size
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("tool_short_read:" + str(path))
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("tool_grew:" + str(path))
        after = os.fstat(fd)
        visible = real.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise InstallError("tool_changed:" + str(path))
    finally:
        os.close(fd)
    return {
        "path": str(real),
        "sha256": digest.hexdigest(),
        "bytes": before.st_size,
        "mode": format(stat.S_IMODE(before.st_mode), "04o"),
        "uid": before.st_uid,
        "gid": before.st_gid,
    }


def _canonical_rows(
    raw: bytes,
    keys: tuple[str, ...],
    *,
    maximum: int,
    label: str,
) -> dict[str, str]:
    if (
        not isinstance(raw, bytes)
        or not raw
        or len(raw) > maximum
        or not raw.endswith(b"\n")
        or any(byte != 10 and not 33 <= byte <= 126 for byte in raw)
    ):
        raise InstallError(label + "_framing_invalid")
    lines = raw.decode("ascii").split("\n")[:-1]
    if len(lines) != len(keys):
        raise InstallError(label + "_membership_invalid")
    result: dict[str, str] = {}
    for key, line in zip(keys, lines):
        prefix = key + "="
        if not line.startswith(prefix) or not line[len(prefix):]:
            raise InstallError(label + "_order_or_key_invalid:" + key)
        result[key] = line[len(prefix):]
    return result


def _decimal(
    value: str,
    *,
    maximum: int = (1 << 64) - 1,
    allow_zero: bool = False,
) -> int:
    if (allow_zero and value == "0"):
        return 0
    if re.fullmatch(r"[1-9][0-9]{0,19}", value) is None:
        raise InstallError("canonical_decimal_required")
    number = int(value)
    if number > maximum:
        raise InstallError("canonical_decimal_out_of_range")
    return number


def parse_source_manifest(raw: bytes) -> dict[str, str]:
    manifest = _canonical_rows(
        raw, MANIFEST_KEYS, maximum=MAX_MANIFEST_BYTES, label="source_manifest"
    )
    for key, expected in MANIFEST_FIXED_VALUES.items():
        if manifest[key] != expected:
            raise InstallError("source_manifest_fixed_field_mismatch:" + key)
    for role in SOURCE_ROLES:
        if HEX40.fullmatch(manifest[role + "_blob_sha1"]) is None:
            raise InstallError("source_manifest_blob_invalid:" + role)
        if HEX64.fullmatch(manifest[role + "_sha256"]) is None:
            raise InstallError("source_manifest_sha256_invalid:" + role)
        _decimal(manifest[role + "_bytes"], maximum=MAX_APPLICATION_SOURCE_BYTES)
    for role in ("launcher", "native"):
        _decimal(manifest[role + "_bytes"], maximum=MAX_APPLICATION_SOURCE_BYTES)
        if HEX64.fullmatch(manifest[role + "_sha256"]) is None:
            raise InstallError("source_manifest_sha256_invalid:" + role)
    return manifest


def source_generation_id(raw: bytes) -> str:
    parse_source_manifest(raw)
    return SOURCE_GENERATION_PREFIX + sha256(raw)


def _parse_host_policy(raw: bytes) -> dict[str, str]:
    policy = _canonical_rows(
        raw, HOST_POLICY_KEYS, maximum=MAX_HOST_POLICY_BYTES, label="host_policy"
    )
    if policy["schema"] != HOST_POLICY_SCHEMA:
        raise InstallError("host_policy_schema_invalid")
    for role, maximum in (("python", MAX_PYTHON_BYTES), ("git", MAX_GIT_BYTES)):
        if HEX64.fullmatch(policy[role + "_sha256"]) is None:
            raise InstallError("host_policy_hash_invalid:" + role)
        _decimal(policy[role + "_bytes"], maximum=maximum)
    return policy


def _parse_parent_proof(raw: bytes) -> dict[str, str]:
    proof = _canonical_rows(
        raw, PARENT_PROOF_KEYS, maximum=MAX_PARENT_PROOF_BYTES, label="parent_proof"
    )
    if proof["schema"] != PARENT_PROOF_SCHEMA:
        raise InstallError("parent_proof_schema_invalid")
    _decimal(proof["parent_pid"], maximum=(1 << 31) - 1)
    _decimal(proof["parent_start_ticks"])
    _decimal(proof["parent_exe_dev"], allow_zero=True)
    _decimal(proof["parent_exe_ino"])
    for key in ("expected_head", "expected_tree"):
        if HEX40.fullmatch(proof[key]) is None:
            raise InstallError("parent_proof_object_invalid:" + key)
    for key in ("manifest_sha256", "host_policy_sha256"):
        if HEX64.fullmatch(proof[key]) is None:
            raise InstallError("parent_proof_digest_invalid:" + key)
    _decimal(proof["manifest_bytes"], maximum=MAX_MANIFEST_BYTES)
    _decimal(proof["host_policy_bytes"], maximum=MAX_HOST_POLICY_BYTES)
    if proof["source_generation_id"] != SOURCE_GENERATION_PREFIX + proof["manifest_sha256"]:
        raise InstallError("parent_proof_generation_invalid")
    if proof["operation"] == "installer_plan":
        if proof["expected_plan_id"] != "none":
            raise InstallError("parent_proof_plan_mode_invalid")
    elif proof["operation"] == "installer_apply":
        if (
            not proof["expected_plan_id"].startswith(PLAN_PREFIX)
            or HEX64.fullmatch(proof["expected_plan_id"][len(PLAN_PREFIX):]) is None
        ):
            raise InstallError("parent_proof_apply_plan_invalid")
    else:
        raise InstallError("parent_proof_operation_invalid")
    descriptors: set[int] = set()
    for role in FD_ROLES:
        fd = _decimal(proof[role + "_fd"], maximum=(1 << 31) - 1)
        if fd <= 2 or fd in descriptors:
            raise InstallError("parent_proof_descriptor_reused_or_reserved")
        descriptors.add(fd)
        _decimal(proof[role + "_dev"], allow_zero=True)
        _decimal(proof[role + "_ino"])
    return proof


def _sealed_fd_state(
    fd: int,
    *,
    mode: int,
    maximum: int,
    label: str,
) -> os.stat_result:
    try:
        before = os.fstat(fd)
        required = (
            fcntl.F_SEAL_SEAL | fcntl.F_SEAL_SHRINK
            | fcntl.F_SEAL_GROW | fcntl.F_SEAL_WRITE
        )
        seals = fcntl.fcntl(fd, fcntl.F_GET_SEALS)
    except (AttributeError, OSError, ValueError) as exc:
        raise InstallError(label + "_sealed_descriptor_required") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_IMODE(before.st_mode) != mode
        or before.st_uid != 0
        or before.st_gid != 0
        or before.st_nlink != 0
        or before.st_size < 1
        or before.st_size > maximum
        or seals & required != required
    ):
        raise InstallError(label + "_snapshot_metadata_invalid")
    return before


def _pread_exact(fd: int, size: int, *, label: str) -> bytes:
    data = bytearray()
    while len(data) < size:
        chunk = os.pread(fd, min(MAX_READ_CHUNK, size - len(data)), len(data))
        if not chunk:
            raise InstallError(label + "_short_read")
        data.extend(chunk)
    if os.pread(fd, 1, size):
        raise InstallError(label + "_grew")
    return bytes(data)


def _read_sealed_fd(fd: int, *, maximum: int, label: str) -> bytes:
    before = _sealed_fd_state(fd, mode=0o400, maximum=maximum, label=label)
    raw = _pread_exact(fd, before.st_size, label=label)
    if not _same_stat(before, os.fstat(fd)):
        raise InstallError(label + "_snapshot_changed")
    return raw


def _sealed_tool_digest(fd: int, *, maximum: int, label: str) -> tuple[str, int]:
    before = _sealed_fd_state(fd, mode=0o500, maximum=maximum, label=label)
    digest = hashlib.sha256()
    offset = 0
    while offset < before.st_size:
        chunk = os.pread(fd, min(MAX_READ_CHUNK, before.st_size - offset), offset)
        if not chunk:
            raise InstallError(label + "_snapshot_short_read")
        digest.update(chunk)
        offset += len(chunk)
    if os.pread(fd, 1, offset) or not _same_stat(before, os.fstat(fd)):
        raise InstallError(label + "_snapshot_changed")
    return digest.hexdigest(), before.st_size


def _root_custodied_stat(path: pathlib.Path, *, mode: int) -> os.stat_result:
    parent = pathlib.Path(path.anchor)
    _trusted_root_directory(parent)
    for part in path.parent.parts[1:]:
        parent /= part
        _trusted_root_directory(parent)
    try:
        st = path.lstat()
    except OSError as exc:
        raise InstallError("bootstrap_custody_file_unavailable") from exc
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_IMODE(st.st_mode) != mode
        or st.st_uid != 0 or st.st_gid != 0 or st.st_nlink != 1
    ):
        raise InstallError("bootstrap_custody_file_metadata_invalid")
    return st


def _read_root_data(path: pathlib.Path, *, maximum: int) -> tuple[bytes, os.stat_result]:
    before = _root_custodied_stat(path, mode=0o444)
    if not 1 <= before.st_size <= maximum:
        raise InstallError("bootstrap_custody_file_size_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        if not _same_stat(before, os.fstat(fd)):
            raise InstallError("bootstrap_custody_file_rebound")
        raw = _pread_exact(fd, before.st_size, label="bootstrap_custody_file")
        if (
            not _same_stat(before, os.fstat(fd))
            or not _same_stat(before, path.lstat())
        ):
            raise InstallError("bootstrap_custody_file_changed")
        return raw, before
    finally:
        os.close(fd)


def _process_start_ticks(pid: int) -> int:
    try:
        with open("/proc/" + str(pid) + "/stat", "rb") as stream:
            raw = stream.read(4097)
        close = raw.rfind(b") ")
        fields = raw[close + 2:].split()
        if close < 0 or len(raw) > 4096 or len(fields) < 20:
            raise InstallError("native_parent_stat_invalid")
        return _decimal(fields[19].decode("ascii"))
    except (OSError, UnicodeDecodeError) as exc:
        raise InstallError("native_parent_stat_unavailable") from exc


def _native_parent_identity() -> tuple[int, int, os.stat_result]:
    pid = os.getppid()
    if pid <= 1:
        raise InstallError("live_native_parent_required")
    before = _root_custodied_stat(BOOTSTRAP_SELF, mode=0o555)
    try:
        running = os.stat("/proc/" + str(pid) + "/exe")
        start = _process_start_ticks(pid)
    except OSError as exc:
        raise InstallError("native_parent_identity_unavailable") from exc
    if (
        not _same_stat(before, running)
        or not _same_stat(before, BOOTSTRAP_SELF.lstat())
        or os.getppid() != pid
    ):
        raise InstallError("fixed_native_parent_executable_required")
    return pid, start, before


def _require_bootstrap_environment() -> int:
    text = os.environ.get(PARENT_PROOF_ENV, "")
    if not text:
        raise InstallError("authenticated_native_parent_proof_required")
    fd = _decimal(text, maximum=(1 << 31) - 1)
    if fd <= 2:
        raise InstallError("parent_proof_descriptor_reserved")
    expected = dict(CHILD_BASE_ENV)
    expected[PARENT_PROOF_ENV] = text
    if dict(os.environ) != expected:
        raise InstallError("closed_native_child_environment_required")
    if os.geteuid() != 0:
        raise InstallError("root_native_child_required")
    if (
        sys.flags.isolated != 1
        or sys.flags.no_site != 1
        or not sys.dont_write_bytecode
    ):
        raise InstallError("isolated_no_site_no_bytecode_python_required")
    return fd


def _validate_parent_and_descriptors(context: dict[str, Any]) -> None:
    proof_fd = _require_bootstrap_environment()
    proof = context["proof"]
    fds = context["fds"]
    if proof_fd != fds["proof"]:
        raise InstallError("parent_proof_environment_rebound")
    pid, start, parent_exe = _native_parent_identity()
    if (
        str(pid) != proof["parent_pid"]
        or str(start) != proof["parent_start_ticks"]
        or str(parent_exe.st_dev) != proof["parent_exe_dev"]
        or str(parent_exe.st_ino) != proof["parent_exe_ino"]
    ):
        raise InstallError("parent_proof_live_identity_mismatch")
    for role in FD_ROLES:
        fd = fds[role]
        try:
            local = os.fstat(fd)
            peer = os.stat("/proc/" + str(pid) + "/fd/" + str(fd))
        except OSError as exc:
            raise InstallError("retained_descriptor_unavailable:" + role) from exc
        if (
            str(local.st_dev) != proof[role + "_dev"]
            or str(local.st_ino) != proof[role + "_ino"]
            or not _same_stat(local, peer)
        ):
            raise InstallError("retained_parent_descriptor_mismatch:" + role)
        if role in ("checkout", "git_dir"):
            flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW
            root_fd = _open_fixed_checkout()
            visible_fd = root_fd
            try:
                if role == "git_dir":
                    visible_fd = os.open(b".git", flags, dir_fd=root_fd)
                if not stat.S_ISDIR(local.st_mode) or not _same_stat(local, os.fstat(visible_fd)):
                    raise InstallError("retained_checkout_directory_rebound:" + role)
            finally:
                if visible_fd != root_fd:
                    os.close(visible_fd)
                os.close(root_fd)
        else:
            maximum = MAX_PYTHON_BYTES if role == "python" else MAX_GIT_BYTES
            _sealed_fd_state(
                fd, mode=0o500 if role in ("python", "git") else 0o400,
                maximum=maximum, label=role,
            )
    if _read_sealed_fd(
        fds["proof"], maximum=MAX_PARENT_PROOF_BYTES, label="parent_proof"
    ) != context["proof_raw"]:
        raise InstallError("parent_proof_descriptor_content_changed")
    if (
        sys.argv[0] != "/proc/self/fd/" + str(fds["installer"])
        or not _same_stat(os.stat("/proc/self/exe"), os.fstat(fds["python"]))
    ):
        raise InstallError("sealed_installer_and_python_execution_required")
    final_pid, final_start, final_exe = _native_parent_identity()
    if final_pid != pid or final_start != start or not _same_stat(parent_exe, final_exe):
        raise InstallError("native_parent_changed_during_validation")


def _context_request_matches(
    context: dict[str, Any],
    operation: str | None,
    expected_head: str,
    expected_plan_id: str | None,
    launcher: pathlib.Path,
    native: pathlib.Path,
) -> None:
    proof = context["proof"]
    if (
        (operation is not None and proof["operation"] != operation)
        or proof["expected_head"] != expected_head
        or (expected_plan_id is not None and proof["expected_plan_id"] != expected_plan_id)
        or str(launcher) != "/proc/self/fd/" + str(context["fds"]["launcher"])
        or str(native) != "/proc/self/fd/" + str(context["fds"]["native"])
    ):
        raise InstallError("parent_proof_operation_or_input_mismatch")


def _activate_bootstrap_context(
    operation: str,
    expected_head: str,
    expected_plan_id: str,
    launcher: pathlib.Path,
    native: pathlib.Path,
) -> dict[str, Any]:
    global _BOOTSTRAP_CONTEXT
    if _BOOTSTRAP_CONTEXT is not None:
        raise InstallError("bootstrap_context_already_active")
    proof_fd = _require_bootstrap_environment()
    # Establish the live root-custodied parent before trusting any proof fields.
    _native_parent_identity()
    raw = _read_sealed_fd(proof_fd, maximum=MAX_PARENT_PROOF_BYTES, label="parent_proof")
    proof = _parse_parent_proof(raw)
    context: dict[str, Any] = {
        "proof": proof,
        "proof_raw": raw,
        "fds": {role: int(proof[role + "_fd"]) for role in FD_ROLES},
    }
    _context_request_matches(context, operation, expected_head, expected_plan_id, launcher, native)
    _validate_parent_and_descriptors(context)
    fds = context["fds"]
    manifest_raw = _read_sealed_fd(fds["manifest"], maximum=MAX_MANIFEST_BYTES, label="manifest")
    manifest = parse_source_manifest(manifest_raw)
    policy_raw = _read_sealed_fd(fds["policy"], maximum=MAX_HOST_POLICY_BYTES, label="policy")
    if (
        sha256(manifest_raw) != proof["manifest_sha256"]
        or str(len(manifest_raw)) != proof["manifest_bytes"]
        or source_generation_id(manifest_raw) != proof["source_generation_id"]
        or sha256(policy_raw) != proof["host_policy_sha256"]
        or str(len(policy_raw)) != proof["host_policy_bytes"]
    ):
        raise InstallError("parent_proof_manifest_or_policy_mismatch")
    context.update({
        "manifest_raw": manifest_raw,
        "manifest": manifest,
        "policy_raw": policy_raw,
        "host_policy": _parse_host_policy(policy_raw),
        "sources": {},
        "payloads": {},
        "visible_generation": {},
    })
    for role in SOURCE_ROLES + ("launcher", "native"):
        source = _read_sealed_fd(fds[role], maximum=MAX_APPLICATION_SOURCE_BYTES, label=role)
        if len(source) != int(manifest[role + "_bytes"]) or sha256(source) != manifest[role + "_sha256"]:
            raise InstallError("inherited_source_or_payload_mismatch:" + role)
        if role in SOURCE_ROLES:
            if git_blob_sha1(source) != manifest[role + "_blob_sha1"]:
                raise InstallError("inherited_source_blob_mismatch:" + role)
            context["sources"][role] = source
        else:
            context["payloads"][role] = source
    # Only this authenticated context enables the retained Git executable.
    # Reset on any failure so partial validation cannot become authority.
    _BOOTSTRAP_CONTEXT = context
    try:
        context["initial_generation"] = _revalidate_authenticated_generation(context, expected_head)
    except BaseException:
        _BOOTSTRAP_CONTEXT = None
        raise
    return context


def _require_bootstrap_context(
    operation: str | None,
    expected_head: str,
    expected_plan_id: str | None,
    launcher: pathlib.Path,
    native: pathlib.Path,
) -> dict[str, Any]:
    context = _BOOTSTRAP_CONTEXT
    if context is None or "proof" not in context:
        raise InstallError("authenticated_native_parent_proof_required")
    _context_request_matches(context, operation, expected_head, expected_plan_id, launcher, native)
    _validate_parent_and_descriptors(context)
    return context


MAX_GIT_READ_OUTPUT_BYTES = 64 * 1024 * 1024
MAX_GIT_ERROR_OUTPUT_BYTES = 64 * 1024
GIT_READ_TIMEOUT_SECONDS = 20
MAX_TRACKED_ENTRIES = 200_000
MAX_TRACKED_PATH_BYTES = 4096
MAX_TRACKED_FILE_BYTES = 256 * 1024 * 1024
MAX_TRACKED_TOTAL_BYTES = 4 * 1024 * 1024 * 1024
TRACKED_MODES = {b"100644", b"100755", b"120000"}


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
        # The empty protocol allowlist is the Git 2.43-compatible transport
        # boundary. NO_LAZY_FETCH is additional protection on newer Git.
        "GIT_ALLOW_PROTOCOL": "",
        "GIT_PROTOCOL_FROM_USER": "0",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_ATTR_NOSYSTEM": "1",
    }


def _bounded_git_read(argv: list[str], git_fd: int) -> bytes:
    deadline = time.monotonic() + GIT_READ_TIMEOUT_SECONDS
    process = subprocess.Popen(
        argv,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=_git_env(),
        pass_fds=(git_fd,),
        start_new_session=True,
    )
    output = bytearray()
    error_bytes = 0
    assert process.stdout is not None and process.stderr is not None
    try:
        with selectors.DefaultSelector() as ready:
            for stream, label in ((process.stdout, "stdout"), (process.stderr, "stderr")):
                os.set_blocking(stream.fileno(), False)
                ready.register(stream, selectors.EVENT_READ, label)
            while ready.get_map():
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise InstallError("git_read_timeout")
                for key, _ in ready.select(remaining):
                    budget = (
                        MAX_GIT_READ_OUTPUT_BYTES - len(output)
                        if key.data == "stdout"
                        else MAX_GIT_ERROR_OUTPUT_BYTES - error_bytes
                    )
                    try:
                        chunk = os.read(key.fd, min(64 * 1024, budget + 1))
                    except BlockingIOError:
                        continue
                    if not chunk:
                        ready.unregister(key.fileobj)
                        continue
                    if len(chunk) > budget:
                        raise InstallError("git_" + key.data + "_output_too_large")
                    if key.data == "stdout":
                        output.extend(chunk)
                    else:
                        # Repository diagnostics can contain unrelated paths or
                        # config values. Bound their volume without retaining it.
                        error_bytes += len(chunk)
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise InstallError("git_read_timeout")
            try:
                result = process.wait(timeout=remaining)
            except subprocess.TimeoutExpired as exc:
                raise InstallError("git_read_timeout") from exc
        if result != 0:
            raise InstallError("git_command_failed:" + str(result))
        return bytes(output)
    except BaseException:
        # On an unfinished read the unreaped child PID anchors this process
        # group. Never signal a numeric PID after wait() has released it.
        if process.returncode is None:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired as exc:
                raise InstallError("git_process_termination_incomplete") from exc
        raise
    finally:
        process.stdout.close()
        process.stderr.close()


def _authenticated_repository_git_fd() -> int:
    context = _BOOTSTRAP_CONTEXT
    if context is None or "fds" not in context or "git" not in context["fds"]:
        raise InstallError("authenticated_retained_git_required")
    git_fd = context["fds"]["git"]
    if not isinstance(git_fd, int) or git_fd <= 2:
        raise InstallError("retained_git_descriptor_invalid")
    required_seals = (
        fcntl.F_SEAL_SEAL | fcntl.F_SEAL_SHRINK
        | fcntl.F_SEAL_GROW | fcntl.F_SEAL_WRITE
    )
    try:
        state = os.fstat(git_fd)
        seals = fcntl.fcntl(git_fd, fcntl.F_GET_SEALS)
    except OSError as exc:
        raise InstallError("retained_git_descriptor_unavailable") from exc
    if (
        not stat.S_ISREG(state.st_mode)
        or stat.S_IMODE(state.st_mode) != 0o500
        or state.st_nlink != 0
        or seals & required_seals != required_seals
    ):
        raise InstallError("retained_git_descriptor_not_sealed_executable")
    return git_fd


GIT_BOUNDARY_POLICY = "private_metadata_pinned_objects_raw_checkout_v4"
GIT_MAX_ENTRIES = 100_000
GIT_MAX_LIST_BYTES = 64 * 1024 * 1024
GIT_MAX_PATH_BYTES = 4096
GIT_MAX_LOOSE_FILE_BYTES = 256 * 1024 * 1024
GIT_MAX_LOOSE_TOTAL_BYTES = 512 * 1024 * 1024
GIT_MAX_TRACKED_FILE_BYTES = 512 * 1024 * 1024
GIT_MAX_TRACKED_TOTAL_BYTES = 4 * 1024 * 1024 * 1024
GIT_MAX_PACK_PAIRS = 128
GIT_MAX_PACK_BYTES = 8 * 1024 * 1024 * 1024
GIT_MAX_PACK_TOTAL_BYTES = 32 * 1024 * 1024 * 1024
GIT_WITNESS_SECONDS = 180
GIT_COMMAND_SECONDS = 60
GIT_CHILD_ADDRESS_SPACE_BYTES = 2 * 1024 * 1024 * 1024
GIT_CHILD_CPU_SECONDS = 60
# Stable Linux fcntl ABI, including Python builds that omit the symbolic names.
GIT_F_ADD_SEALS = 1033
GIT_F_GET_SEALS = 1034
GIT_INDEX_SEALS = 0x0001 | 0x0002 | 0x0004 | 0x0008
GIT_PRIVATE_CONFIG = (
    b"[core]\n"
    b"repositoryFormatVersion = 0\n"
    b"bare = false\n"
    b"fileMode = true\n"
    b"logAllRefUpdates = false\n"
    b"fsmonitor = false\n"
    b"hooksPath = /dev/null\n"
    b"attributesFile = /dev/null\n"
    b"excludesFile = /dev/null\n"
    b"untrackedCache = false\n"
    b"splitIndex = false\n"
    b"autocrlf = false\n"
    b"[gc]\nauto = 0\n"
    b"[maintenance]\nauto = false\n"
)


def _git_child_limits() -> None:
    """Only Popen's child applies these limits; preserve any stricter inherited limit."""
    for which, configured in (
        (resource.RLIMIT_AS, GIT_CHILD_ADDRESS_SPACE_BYTES),
        (resource.RLIMIT_CPU, GIT_CHILD_CPU_SECONDS),
    ):
        soft, hard = resource.getrlimit(which)
        target = configured
        if hard != resource.RLIM_INFINITY:
            target = min(target, hard)
        if soft != resource.RLIM_INFINITY:
            target = min(target, soft)
        resource.setrlimit(which, (target, target))


class _RepositorySnapshot:
    """Read a fixed checkout without giving its Git metadata execution authority."""

    def __init__(self, expected_head: str) -> None:
        if not isinstance(expected_head, str) or HEX40.fullmatch(expected_head) is None:
            raise InstallError("expected_head_invalid")
        self.expected_head = expected_head
        self.deadline = time.monotonic() + GIT_WITNESS_SECONDS
        self._fds: list[int] = []
        self._pass_fds: list[int] = []
        self._directory_checks: list[tuple[int, str, int, os.stat_result, bool]] = []
        self._file_checks: list[tuple[int, str, os.stat_result, int | None]] = []
        self._absent_checks: list[tuple[int, str]] = []
        self._work_files: dict[bytes, os.stat_result] = {}
        self._work_dirs: dict[bytes, os.stat_result] = {}
        self._temporary: Any = None
        self._closed = False
        self.git_exec_fd = -1
        self.tree = ""
        self.entries: dict[bytes, tuple[bytes, str]] = {}
        self._entry_path_bytes = 0
        self._tracked_bytes = 0

    def _time(self) -> None:
        if time.monotonic() >= self.deadline:
            raise InstallError("repository_witness_deadline_exceeded")

    def _names(self, parent: int, maximum: int) -> list[str]:
        names: list[str] = []
        with os.scandir(parent) as entries:
            for entry in entries:
                self._time()
                if len(names) >= maximum:
                    raise InstallError("repository_directory_entry_limit")
                names.append(entry.name)
        return sorted(names)

    @staticmethod
    def _directory_identity(left: os.stat_result, right: os.stat_result) -> bool:
        return (
            left.st_dev, left.st_ino, left.st_mode, left.st_uid, left.st_gid
        ) == (
            right.st_dev, right.st_ino, right.st_mode, right.st_uid, right.st_gid
        )

    @staticmethod
    def _lstat(parent: int, name: str | bytes) -> os.stat_result | None:
        try:
            return os.stat(name, dir_fd=parent, follow_symlinks=False)
        except FileNotFoundError:
            return None

    def _directory(self, parent: int, name: str, *, strict: bool = True) -> int:
        self._time()
        before = self._lstat(parent, name)
        if before is None or not stat.S_ISDIR(before.st_mode):
            raise InstallError("repository_directory_layout_unsupported")
        fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                     dir_fd=parent)
        self._fds.append(fd)
        opened = os.fstat(fd)
        visible = self._lstat(parent, name)
        if visible is None or not _same_stat(before, opened) or not _same_stat(opened, visible):
            raise InstallError("repository_directory_rebound")
        self._directory_checks.append((parent, name, fd, opened, strict))
        return fd

    def _absent(self, parent: int, name: str) -> None:
        if self._lstat(parent, name) is not None:
            raise InstallError("repository_layout_feature_unsupported")
        self._absent_checks.append((parent, name))

    def _source_file(
        self, parent: int, name: str, maximum: int, *, keep_open: bool = False
    ) -> tuple[int, os.stat_result]:
        self._time()
        before = self._lstat(parent, name)
        if (
            before is None or not stat.S_ISREG(before.st_mode)
            or before.st_size < 0 or before.st_size > maximum
        ):
            raise InstallError("repository_input_file_invalid")
        fd = os.open(name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
                     dir_fd=parent)
        try:
            opened = os.fstat(fd)
            visible = self._lstat(parent, name)
            if (
                visible is None or not _same_stat(before, opened)
                or not _same_stat(opened, visible)
            ):
                raise InstallError("repository_input_file_rebound")
            self._file_checks.append((parent, name, opened, fd if keep_open else None))
            if keep_open:
                self._fds.append(fd)
                self._pass_fds.append(fd)
            return fd, opened
        except BaseException:
            os.close(fd)
            raise

    def _read_source(self, parent: int, name: str, maximum: int) -> bytes:
        fd, opened = self._source_file(parent, name, maximum)
        try:
            raw = bytearray()
            while len(raw) < opened.st_size:
                self._time()
                part = os.read(fd, min(MAX_READ_CHUNK, opened.st_size - len(raw)))
                if not part:
                    raise InstallError("repository_input_short_read")
                raw.extend(part)
            if os.read(fd, 1) or not _same_stat(opened, os.fstat(fd)):
                raise InstallError("repository_input_changed")
            visible = self._lstat(parent, name)
            if visible is None or not _same_stat(opened, visible):
                raise InstallError("repository_input_changed")
            return bytes(raw)
        finally:
            os.close(fd)

    @staticmethod
    def _write_all(fd: int, raw: bytes) -> None:
        view = memoryview(raw)
        while view:
            count = os.write(fd, view)
            if count <= 0:
                raise InstallError("repository_private_write_failed")
            view = view[count:]

    def _private_directory(self, relative: str) -> pathlib.Path:
        path = self.private / relative
        path.mkdir(mode=0o700)
        return path

    def _private_file(self, relative: str, raw: bytes) -> None:
        fd = os.open(self.private / relative,
                     os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
                     0o600)
        try:
            self._write_all(fd, raw)
        finally:
            os.close(fd)

    def _index_snapshot(self, raw: bytes) -> None:
        if len(raw) < 32 or raw[:4] != b"DIRC":
            raise InstallError("repository_index_invalid")
        if int.from_bytes(raw[4:8], "big") not in (2, 3, 4):
            raise InstallError("repository_index_version_unsupported")
        if int.from_bytes(raw[8:12], "big") > GIT_MAX_ENTRIES:
            raise InstallError("repository_index_entry_limit")
        if hashlib.sha1(raw[:-20]).digest() != raw[-20:]:
            raise InstallError("repository_index_checksum_invalid")
        fd = os.memfd_create("void-installer-index-v3",
                             flags=os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING)
        self._fds.append(fd)
        self._pass_fds.append(fd)
        os.fchmod(fd, 0o600)
        self._write_all(fd, raw)
        os.lseek(fd, 0, os.SEEK_SET)
        fcntl.fcntl(fd, GIT_F_ADD_SEALS, GIT_INDEX_SEALS)
        if fcntl.fcntl(fd, GIT_F_GET_SEALS) & GIT_INDEX_SEALS != GIT_INDEX_SEALS:
            raise InstallError("repository_index_seal_failed")
        self.index_fd = fd

    def _reference_snapshot(self) -> None:
        head = self._read_source(self.git_fd, "HEAD", 256)
        if head != b"ref: refs/heads/main\n":
            raise InstallError("checkout_branch_not_main")
        refs = self._directory(self.git_fd, "refs")
        heads = self._directory(refs, "heads")
        if self._lstat(heads, "main") is not None:
            raw = self._read_source(heads, "main", 128)
            if re.fullmatch(rb"[0-9a-f]{40}\n?", raw) is None:
                raise InstallError("checkout_main_reference_invalid")
            head_oid = raw.rstrip(b"\n").decode("ascii")
        else:
            self._absent(heads, "main")
            packed = self._read_source(self.git_fd, "packed-refs", GIT_MAX_LIST_BYTES)
            seen: set[bytes] = set()
            head_oid = ""
            for line in packed.splitlines():
                self._time()
                if not line or line.startswith(b"#"):
                    continue
                if line.startswith(b"^"):
                    if re.fullmatch(rb"\^[0-9a-f]{40}", line) is None:
                        raise InstallError("repository_packed_refs_invalid")
                    continue
                match = re.fullmatch(rb"([0-9a-f]{40}) ([^\x00 \t\r\n]+)", line)
                if match is None or match[2] in seen or len(seen) >= GIT_MAX_ENTRIES:
                    raise InstallError("repository_packed_refs_invalid")
                seen.add(match[2])
                if match[2] == b"refs/heads/main":
                    head_oid = match[1].decode("ascii")
        if head_oid != self.expected_head:
            raise InstallError("checkout_head_mismatch")

    def _objects_snapshot(self) -> None:
        source = self._directory(self.git_fd, "objects")
        info = self._directory(source, "info")
        self._absent(info, "alternates")
        self._absent(info, "http-alternates")
        self._private_directory("objects")
        self._private_directory("objects/info")
        self._private_directory("objects/pack")
        names = self._names(source, 258)
        loose_total = 0
        loose_count = 0
        for name in names:
            self._time()
            if name in ("info", "pack"):
                continue
            if re.fullmatch(r"[0-9a-f]{2}", name) is None:
                raise InstallError("repository_objects_layout_unsupported")
            directory = self._directory(source, name)
            target = self._private_directory("objects/" + name)
            for suffix in self._names(directory, GIT_MAX_ENTRIES - loose_count):
                self._time()
                if re.fullmatch(r"[0-9a-f]{38}", suffix) is None:
                    raise InstallError("repository_loose_object_name_invalid")
                loose_count += 1
                if loose_count > GIT_MAX_ENTRIES:
                    raise InstallError("repository_loose_object_count_limit")
                fd, opened = self._source_file(directory, suffix, GIT_MAX_LOOSE_FILE_BYTES)
                destination = -1
                try:
                    loose_total += opened.st_size
                    if loose_total > GIT_MAX_LOOSE_TOTAL_BYTES:
                        raise InstallError("repository_loose_object_bytes_limit")
                    destination = os.open(
                        target / suffix,
                        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
                        0o600,
                    )
                    remaining = opened.st_size
                    while remaining:
                        self._time()
                        part = os.read(fd, min(MAX_READ_CHUNK, remaining))
                        if not part:
                            raise InstallError("repository_loose_object_short_read")
                        self._write_all(destination, part)
                        remaining -= len(part)
                    if os.read(fd, 1) or not _same_stat(opened, os.fstat(fd)):
                        raise InstallError("repository_loose_object_changed")
                    visible = self._lstat(directory, suffix)
                    if visible is None or not _same_stat(opened, visible):
                        raise InstallError("repository_loose_object_changed")
                finally:
                    if destination >= 0:
                        os.close(destination)
                    os.close(fd)
        pack = self._directory(source, "pack")
        pairs: dict[str, set[str]] = {}
        pack_names = self._names(pack, 2048)
        for name in pack_names:
            self._time()
            entry = self._lstat(pack, name)
            if entry is None or not stat.S_ISREG(entry.st_mode):
                raise InstallError("repository_pack_entry_invalid")
            match = re.fullmatch(r"(pack-[0-9a-f]{40})\.(pack|idx)", name)
            if match is not None:
                pairs.setdefault(match[1], set()).add(match[2])
            elif (
                re.fullmatch(r"pack-[0-9a-f]{40}\.(rev|bitmap|promisor|keep|mtimes)", name)
                is None
                and name != "multi-pack-index"
                and re.fullmatch(r"multi-pack-index-[0-9a-f]{40}\.(bitmap|rev)", name) is None
            ):
                raise InstallError("repository_pack_entry_unsupported")
        if len(pairs) > GIT_MAX_PACK_PAIRS or any(v != {"pack", "idx"} for v in pairs.values()):
            raise InstallError("repository_pack_pairs_invalid")
        packed_total = 0
        for stem in sorted(pairs):
            for extension in ("pack", "idx"):
                name = stem + "." + extension
                maximum = GIT_MAX_PACK_BYTES if extension == "pack" else GIT_MAX_LOOSE_FILE_BYTES
                fd, opened = self._source_file(pack, name, maximum, keep_open=True)
                packed_total += opened.st_size
                if opened.st_size == 0 or packed_total > GIT_MAX_PACK_TOTAL_BYTES:
                    raise InstallError("repository_pack_bytes_limit")
                os.symlink("/proc/self/fd/" + str(fd), self.private / "objects/pack" / name)

    def __enter__(self) -> "_RepositorySnapshot":
        try:
            root = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
            self._fds.append(root)
            checkout = pathlib.Path(FIXED_CHECKOUT)
            if not checkout.is_absolute() or ".." in checkout.parts:
                raise InstallError("fixed_checkout_invalid")
            current = root
            for index, part in enumerate(checkout.parts[1:]):
                current = self._directory(
                    current, part, strict=index == len(checkout.parts) - 2
                )
            self.checkout_fd = current
            self._pass_fds.append(current)
            self.git_fd = self._directory(current, ".git")
            for name in ("commondir", "gitdir", "shallow", "reftable", "index.lock"):
                self._absent(self.git_fd, name)
            for name in self._names(self.git_fd, GIT_MAX_ENTRIES):
                if re.fullmatch(r"sharedindex\.[0-9a-f]{40}", name):
                    raise InstallError("repository_split_index_unsupported")
            self._reference_snapshot()
            index_raw = self._read_source(self.git_fd, "index", GIT_MAX_LIST_BYTES)
            self._index_snapshot(index_raw)
            excludes = b""
            if self._lstat(self.git_fd, "info") is not None:
                info = self._directory(self.git_fd, "info")
                if self._lstat(info, "exclude") is not None:
                    excludes = self._read_source(info, "exclude", GIT_MAX_LIST_BYTES)
                else:
                    self._absent(info, "exclude")
            else:
                self._absent(self.git_fd, "info")
            self._temporary = tempfile.TemporaryDirectory(prefix="void-git-read-v3-", dir="/tmp")
            self.private = pathlib.Path(self._temporary.name)
            os.chmod(self.private, 0o700)
            self._private_directory("refs")
            self._private_directory("refs/heads")
            self._private_directory("info")
            self._private_file("HEAD", b"ref: refs/heads/main\n")
            self._private_file("refs/heads/main", self.expected_head.encode("ascii") + b"\n")
            self._private_file("config", GIT_PRIVATE_CONFIG)
            self._private_file("info/exclude", excludes)
            self._objects_snapshot()
            self.git_exec_fd = _authenticated_repository_git_fd()
            if self.git_exec_fd in self._pass_fds:
                raise InstallError("repository_git_descriptor_alias")
            self._pass_fds.append(self.git_exec_fd)
            self._load_tree()
            return self
        except BaseException as exc:
            self._close()
            if isinstance(exc, (OSError, subprocess.SubprocessError, MemoryError)):
                raise InstallError(
                    "repository_reader_resource_or_io_failed:" + type(exc).__name__
                ) from exc
            raise

    def _environment(self) -> dict[str, str]:
        return {
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
            "GIT_DIR": str(self.private),
            "GIT_WORK_TREE": "/proc/self/fd/" + str(self.checkout_fd),
            "GIT_OBJECT_DIRECTORY": str(self.private / "objects"),
            "GIT_INDEX_FILE": "/proc/self/fd/" + str(self.index_fd),
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_ATTR_NOSYSTEM": "1",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
            "GIT_NO_LAZY_FETCH": "1",
            "GIT_ALLOW_PROTOCOL": "",
            "GIT_PAGER": "",
        }

    def _run(
        self, operation: str, *, object_ids: list[str] | None = None,
        maximum: int = GIT_MAX_LIST_BYTES
    ) -> bytes:
        self._time()
        input_raw = b""
        if operation == "objects":
            if (
                not object_ids or len(object_ids) > GIT_MAX_ENTRIES
                or any(HEX40.fullmatch(oid) is None for oid in object_ids)
            ):
                raise InstallError("repository_object_request_invalid")
            args = ["cat-file", "--batch"]
            input_raw = ("\n".join(object_ids) + "\n").encode("ascii")
        elif operation == "index" and object_ids is None:
            args = ["ls-files", "--stage", "--sparse", "-v", "-z", "--full-name"]
        elif operation == "untracked" and object_ids is None:
            args = ["ls-files", "--others", "--exclude-standard", "-z", "--full-name",
                    "--exclude=/.git/"]
        else:
            raise InstallError("repository_git_operation_rejected")
        stop = min(self.deadline, time.monotonic() + GIT_COMMAND_SECONDS)
        process = subprocess.Popen(
            ["/proc/self/fd/" + str(self.git_exec_fd), "--no-pager", "--no-replace-objects", *args],
            cwd="/proc/self/fd/" + str(self.checkout_fd),
            stdin=subprocess.PIPE if input_raw else subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=self._environment(),
            close_fds=True,
            pass_fds=tuple(self._pass_fds),
            preexec_fn=_git_child_limits,
        )
        output = bytearray()
        error_bytes = 0
        offset = 0
        selector = selectors.DefaultSelector()
        try:
            assert process.stdout is not None and process.stderr is not None
            for stream, label in ((process.stdout, "stdout"), (process.stderr, "stderr")):
                os.set_blocking(stream.fileno(), False)
                selector.register(stream, selectors.EVENT_READ, label)
            if input_raw:
                assert process.stdin is not None
                os.set_blocking(process.stdin.fileno(), False)
                selector.register(process.stdin, selectors.EVENT_WRITE, "stdin")
            while selector.get_map():
                remaining = stop - time.monotonic()
                if remaining <= 0:
                    raise InstallError("repository_git_deadline_exceeded")
                for key, _ in selector.select(min(remaining, 0.25)):
                    stream = key.fileobj
                    if key.data == "stdin":
                        try:
                            count = os.write(stream.fileno(), input_raw[offset:offset + 65536])
                        except BrokenPipeError:
                            count = 0
                            offset = len(input_raw)
                        except BlockingIOError:
                            continue
                        offset += count
                        if offset >= len(input_raw):
                            selector.unregister(stream)
                            stream.close()
                        continue
                    try:
                        part = os.read(stream.fileno(), 65536)
                    except BlockingIOError:
                        continue
                    if not part:
                        selector.unregister(stream)
                        stream.close()
                    elif key.data == "stdout":
                        if len(output) + len(part) > maximum:
                            raise InstallError("repository_git_output_limit")
                        output.extend(part)
                    else:
                        error_bytes += len(part)
                        if error_bytes > 65536:
                            raise InstallError("repository_git_error_output_limit")
            remaining = stop - time.monotonic()
            if remaining <= 0:
                raise InstallError("repository_git_deadline_exceeded")
            code = process.wait(timeout=remaining)
            if code != 0:
                raise InstallError("repository_git_operation_failed:" + operation + ":" + str(code))
            return bytes(output)
        except subprocess.TimeoutExpired as exc:
            raise InstallError("repository_git_deadline_exceeded") from exc
        finally:
            selector.close()
            if process.poll() is None:
                process.kill()
            process.wait(timeout=5)
            for stream in (process.stdin, process.stdout, process.stderr):
                if stream is not None:
                    stream.close()

    def _objects(self, kind: bytes, ids: list[str], maximum: int) -> dict[str, bytes]:
        output = self._run("objects", object_ids=ids, maximum=maximum)
        cursor = 0
        result: dict[str, bytes] = {}
        for expected in ids:
            self._time()
            end = output.find(b"\n", cursor)
            if end < 0 or end - cursor > 128:
                raise InstallError("repository_object_header_invalid")
            header = output[cursor:end].split(b" ")
            if (
                len(header) != 3 or header[0] != expected.encode("ascii") or header[1] != kind
                or re.fullmatch(rb"0|[1-9][0-9]{0,11}", header[2]) is None
            ):
                raise InstallError("repository_object_missing_or_invalid")
            size = int(header[2])
            cursor = end + 1
            end = cursor + size
            if end >= len(output) or output[end:end + 1] != b"\n":
                raise InstallError("repository_object_length_invalid")
            raw = output[cursor:end]
            identity = hashlib.sha1(kind + b" " + str(size).encode("ascii") + b"\0" + raw).hexdigest()
            if identity != expected:
                raise InstallError("repository_object_identity_invalid")
            result[expected] = raw
            cursor = end + 1
        if cursor != len(output):
            raise InstallError("repository_object_trailing_output")
        return result

    @staticmethod
    def _path(raw: bytes) -> None:
        if (
            not raw or len(raw) > GIT_MAX_PATH_BYTES or raw.startswith(b"/")
            or b"\0" in raw
            or any(part in (b"", b".", b"..", b".git") for part in raw.split(b"/"))
        ):
            raise InstallError("repository_tree_path_invalid")

    def _load_tree(self) -> None:
        commit = self._objects(b"commit", [self.expected_head], 1024 * 1024)[self.expected_head]
        first = commit.split(b"\n", 1)[0]
        if re.fullmatch(rb"tree [0-9a-f]{40}", first) is None:
            raise InstallError("repository_commit_tree_invalid")
        self.tree = first[5:].decode("ascii")
        pending: list[tuple[bytes, str]] = [(b"", self.tree)]
        total_trees = 0
        total_members = 0
        total_bytes = 0
        for _ in range(64):
            if not pending:
                return
            ids = sorted({oid for _, oid in pending})
            objects = self._objects(b"tree", ids, GIT_MAX_LIST_BYTES)
            total_bytes += sum(len(raw) for raw in objects.values())
            if total_bytes > GIT_MAX_LIST_BYTES:
                raise InstallError("repository_tree_bytes_limit")
            following: list[tuple[bytes, str]] = []
            for prefix, oid in pending:
                self._time()
                total_trees += 1
                if total_trees > GIT_MAX_ENTRIES:
                    raise InstallError("repository_tree_count_limit")
                raw = objects[oid]
                cursor = 0
                names: set[bytes] = set()
                previous_sort_key = b""
                while cursor < len(raw):
                    self._time()
                    total_members += 1
                    if total_members > GIT_MAX_ENTRIES:
                        raise InstallError("repository_tree_member_limit")
                    separator = raw.find(b" ", cursor)
                    end = raw.find(b"\0", separator + 1) if separator >= 0 else -1
                    if separator < 0 or end < 0 or end + 21 > len(raw):
                        raise InstallError("repository_tree_object_invalid")
                    mode = raw[cursor:separator]
                    name = raw[separator + 1:end]
                    if not name or b"/" in name or name in names:
                        raise InstallError("repository_tree_name_invalid")
                    names.add(name)
                    path = prefix + name
                    self._path(path)
                    sort_key = name + (b"/" if mode == b"40000" else b"\0")
                    if sort_key <= previous_sort_key:
                        raise InstallError("repository_tree_order_invalid")
                    previous_sort_key = sort_key
                    self._entry_path_bytes += len(path)
                    if self._entry_path_bytes > GIT_MAX_LIST_BYTES:
                        raise InstallError("repository_tree_path_bytes_limit")
                    object_id = raw[end + 1:end + 21].hex()
                    cursor = end + 21
                    if mode == b"40000":
                        following.append((path + b"/", object_id))
                    elif mode in (b"100644", b"100755", b"120000"):
                        if path in self.entries or len(self.entries) >= GIT_MAX_ENTRIES:
                            raise InstallError("repository_tree_entry_limit_or_duplicate")
                        self.entries[path] = (mode, object_id)
                    else:
                        raise InstallError("repository_tree_mode_unsupported")
            pending = following
        raise InstallError("repository_tree_depth_limit")

    def _work_parent(self, relative: bytes) -> tuple[int, bytes, list[int]]:
        self._path(relative)
        components = relative.split(b"/")
        current = self.checkout_fd
        opened_fds: list[int] = []
        prefix = b""
        try:
            for component in components[:-1]:
                self._time()
                before = self._lstat(current, component)
                if before is None or not stat.S_ISDIR(before.st_mode):
                    raise InstallError("checkout_directory_type_invalid")
                fd = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                             dir_fd=current)
                opened_fds.append(fd)
                opened = os.fstat(fd)
                visible = self._lstat(current, component)
                if (
                    visible is None or not _same_stat(before, opened)
                    or not _same_stat(opened, visible)
                ):
                    raise InstallError("checkout_directory_changed")
                prefix += component
                previous = self._work_dirs.setdefault(prefix, opened)
                if not _same_stat(previous, opened):
                    raise InstallError("checkout_directory_changed")
                prefix += b"/"
                current = fd
            return current, components[-1], opened_fds
        except BaseException:
            for fd in reversed(opened_fds):
                os.close(fd)
            raise

    def _worktree_file(self, relative: bytes, mode: bytes, expected: str) -> None:
        parent, name, directories = self._work_parent(relative)
        fd = -1
        try:
            before = self._lstat(parent, name)
            if before is None:
                raise InstallError("checkout_tracked_file_missing")
            if mode == b"120000":
                if not stat.S_ISLNK(before.st_mode):
                    raise InstallError("checkout_tracked_file_type_invalid")
                raw = os.readlink(name, dir_fd=parent)
                if not isinstance(raw, bytes) or len(raw) > GIT_MAX_PATH_BYTES:
                    raise InstallError("checkout_symlink_invalid")
                actual = git_blob_sha1(raw)
            else:
                if (
                    not stat.S_ISREG(before.st_mode)
                    or before.st_size > GIT_MAX_TRACKED_FILE_BYTES
                    or bool(before.st_mode & stat.S_IXUSR) != (mode == b"100755")
                ):
                    raise InstallError("checkout_tracked_file_metadata_invalid")
                self._tracked_bytes += before.st_size
                if self._tracked_bytes > GIT_MAX_TRACKED_TOTAL_BYTES:
                    raise InstallError("checkout_tracked_bytes_limit")
                fd = os.open(name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
                             dir_fd=parent)
                opened = os.fstat(fd)
                if not _same_stat(before, opened):
                    raise InstallError("checkout_tracked_file_rebound")
                digest = hashlib.sha1(b"blob " + str(opened.st_size).encode("ascii") + b"\0")
                remaining = opened.st_size
                while remaining:
                    self._time()
                    part = os.read(fd, min(MAX_READ_CHUNK, remaining))
                    if not part:
                        raise InstallError("checkout_tracked_file_short_read")
                    digest.update(part)
                    remaining -= len(part)
                if os.read(fd, 1) or not _same_stat(opened, os.fstat(fd)):
                    raise InstallError("checkout_tracked_file_changed")
                actual = digest.hexdigest()
            visible = self._lstat(parent, name)
            if visible is None or not _same_stat(before, visible):
                raise InstallError("checkout_tracked_file_changed")
            if actual != expected:
                raise InstallError("checkout_raw_worktree_bytes_mismatch")
            self._work_files[relative] = before
        finally:
            if fd >= 0:
                os.close(fd)
            for descriptor in reversed(directories):
                os.close(descriptor)

    def checkout(self) -> dict[str, Any]:
        raw = self._run("index")
        if raw and not raw.endswith(b"\0"):
            raise InstallError("repository_index_listing_invalid")
        entries: dict[bytes, tuple[bytes, str]] = {}
        for record in raw.split(b"\0")[:-1]:
            self._time()
            fields = record.split(b"\t", 1)
            if len(fields) != 2:
                raise InstallError("repository_index_listing_invalid")
            header, path = fields
            self._path(path)
            match = re.fullmatch(rb"H (100644|100755|120000) ([0-9a-f]{40}) 0", header)
            if match is None or path in entries or len(entries) >= GIT_MAX_ENTRIES:
                raise InstallError("repository_index_state_unsupported")
            entries[path] = (match[1], match[2].decode("ascii"))
        if entries != self.entries:
            raise InstallError("checkout_index_tree_mismatch")
        self._tracked_bytes = 0
        for path, (mode, oid) in sorted(self.entries.items()):
            self._worktree_file(path, mode, oid)
        if self._run("untracked"):
            raise InstallError("checkout_untracked_files_present")
        return {
            "head": self.expected_head,
            "tree": self.tree,
            "branch": "main",
            "clean": True,
            "git_boundary_policy": GIT_BOUNDARY_POLICY,
        }

    def blob(
        self, relative: str, *, expected_blob: str, expected_bytes: int | None = None,
        expected_sha256: str | None = None
    ) -> bytes:
        if (
            not isinstance(relative, str) or not isinstance(expected_blob, str)
            or HEX40.fullmatch(expected_blob) is None
        ):
            raise InstallError("git_object_request_invalid")
        path = relative.encode("utf-8", "strict")
        self._path(path)
        entry = self.entries.get(path)
        if entry is None or entry[0] not in (b"100644", b"100755") or entry[1] != expected_blob:
            raise InstallError("git_object_tree_membership_mismatch:" + relative)
        if expected_bytes is not None and (
            not isinstance(expected_bytes, int) or expected_bytes < 0
            or expected_bytes > GIT_MAX_TRACKED_FILE_BYTES
        ):
            raise InstallError("git_object_expected_bytes_invalid")
        maximum = (expected_bytes if expected_bytes is not None else 1024 * 1024) + 256
        raw = self._objects(b"blob", [expected_blob], maximum)[expected_blob]
        if expected_bytes is not None and len(raw) != expected_bytes:
            raise InstallError("git_object_bytes_mismatch:" + relative)
        if expected_sha256 is not None and sha256(raw) != expected_sha256:
            raise InstallError("git_object_sha256_mismatch:" + relative)
        return raw

    def _recheck(self) -> None:
        for parent, name, fd, before, strict in self._directory_checks:
            self._time()
            opened = os.fstat(fd)
            visible = self._lstat(parent, name)
            compare = _same_stat if strict else self._directory_identity
            if visible is None or not compare(before, opened) or not compare(before, visible):
                raise InstallError("repository_directory_changed")
        for parent, name, before, fd in self._file_checks:
            self._time()
            visible = self._lstat(parent, name)
            if visible is None or not _same_stat(before, visible):
                raise InstallError("repository_input_changed")
            if fd is not None and not _same_stat(before, os.fstat(fd)):
                raise InstallError("repository_pinned_input_changed")
        for parent, name in self._absent_checks:
            self._time()
            if self._lstat(parent, name) is not None:
                raise InstallError("repository_layout_changed")
        for relative, before in list(self._work_dirs.items()) + list(self._work_files.items()):
            self._time()
            parent, name, directories = self._work_parent(relative)
            try:
                visible = self._lstat(parent, name)
                if visible is None or not _same_stat(before, visible):
                    raise InstallError("checkout_worktree_changed")
            finally:
                for fd in reversed(directories):
                    os.close(fd)
        if _authenticated_repository_git_fd() != self.git_exec_fd:
            raise InstallError("repository_git_tool_changed")

    def _close(self) -> None:
        if self._closed:
            return
        self._closed = True
        failure: BaseException | None = None
        if self._temporary is not None:
            try:
                self._temporary.cleanup()
            except BaseException as exc:
                failure = exc
        for fd in reversed(self._fds):
            try:
                os.close(fd)
            except OSError as exc:
                if failure is None:
                    failure = exc
        self._fds.clear()
        if failure is not None:
            raise InstallError("repository_private_cleanup_failed") from failure

    def __exit__(self, exc_type: Any, exc: Any, traceback: Any) -> bool:
        try:
            if exc_type is None:
                self._recheck()
            elif isinstance(exc, (OSError, subprocess.SubprocessError, MemoryError)):
                raise InstallError(
                    "repository_reader_resource_or_io_failed:" + type(exc).__name__
                ) from exc
        except (OSError, subprocess.SubprocessError, MemoryError) as failure:
            raise InstallError(
                "repository_reader_resource_or_io_failed:" + type(failure).__name__
            ) from failure
        finally:
            self._close()
        return False


def checkout_snapshot(expected_head: str) -> dict[str, Any]:
    with _RepositorySnapshot(expected_head) as snapshot:
        return snapshot.checkout()



def _verify_source_generation_dependencies(
    manifest_raw: bytes,
    manifest: dict[str, str],
    sources: dict[str, bytes],
    expected_head: str,
) -> dict[str, Any]:
    """Verify one retained repository witness across all generation checks."""
    if parse_source_manifest(manifest_raw) != manifest or set(sources) != set(SOURCE_ROLES):
        raise InstallError("source_generation_membership_invalid")
    expected_files = [(MANIFEST_REL, manifest_raw, git_blob_sha1(manifest_raw))]
    for role in SOURCE_ROLES:
        raw = sources[role]
        if (
            not isinstance(raw, bytes)
            or len(raw) != int(manifest[role + "_bytes"])
            or sha256(raw) != manifest[role + "_sha256"]
            or git_blob_sha1(raw) != manifest[role + "_blob_sha1"]
        ):
            raise InstallError("source_generation_snapshot_mismatch:" + role)
        expected_files.append((manifest[role + "_rel"], raw, manifest[role + "_blob_sha1"]))

    with _RepositorySnapshot(expected_head) as snapshot:
        checkout = snapshot.checkout()
        for relative, expected_raw, expected_blob in expected_files:
            path = relative.encode("ascii")
            entry = snapshot.entries.get(path)
            if entry != (b"100644", expected_blob):
                raise InstallError("source_generation_tree_entry_mismatch:" + relative)
            raw = snapshot.blob(
                relative,
                expected_blob=expected_blob,
                expected_bytes=len(expected_raw),
                expected_sha256=sha256(expected_raw),
            )
            if raw != expected_raw:
                raise InstallError("source_generation_git_bytes_mismatch:" + relative)
        # __exit__ performs the final retained repository/worktree observation pass.
        return checkout


def _remember_visible_generation(
    context: dict[str, Any],
    role: str,
    identity: tuple[Any, ...],
) -> None:
    previous = context["visible_generation"].get(role)
    if previous is None:
        context["visible_generation"][role] = identity
        return
    for left, right in zip(previous, identity):
        if isinstance(left, os.stat_result):
            if not isinstance(right, os.stat_result) or not _same_stat(left, right):
                raise InstallError("visible_generation_changed:" + role)
        elif left != right:
            raise InstallError("visible_generation_changed:" + role)
    if len(previous) != len(identity):
        raise InstallError("visible_generation_changed:" + role)


def _tool_visible_identity(path: pathlib.Path) -> tuple[Any, ...]:
    real = pathlib.Path(os.path.realpath(path))
    return path.lstat(), str(real), real.lstat()


def _revalidate_authenticated_generation(
    context: dict[str, Any],
    expected_head: str,
) -> dict[str, Any]:
    _validate_parent_and_descriptors(context)
    proof = context["proof"]
    fds = context["fds"]
    manifest = context["manifest"]
    if expected_head != proof["expected_head"]:
        raise InstallError("authenticated_runtime_head_mismatch")
    for role, path, maximum, expected_raw in (
        ("manifest", BOOTSTRAP_MANIFEST, MAX_MANIFEST_BYTES, context["manifest_raw"]),
        ("policy", BOOTSTRAP_POLICY, MAX_HOST_POLICY_BYTES, context["policy_raw"]),
    ):
        raw = _read_sealed_fd(fds[role], maximum=maximum, label=role)
        visible_raw, visible_stat = _read_root_data(path, maximum=maximum)
        if raw != expected_raw or visible_raw != expected_raw:
            raise InstallError("authenticated_custody_bytes_changed:" + role)
        _remember_visible_generation(context, role, (visible_stat,))
    tools: dict[str, dict[str, Any]] = {}
    for role, path, maximum in (
        ("python", FIXED_PYTHON, MAX_PYTHON_BYTES), ("git", FIXED_GIT, MAX_GIT_BYTES),
    ):
        expected_digest = context["host_policy"][role + "_sha256"]
        expected_bytes = int(context["host_policy"][role + "_bytes"])
        digest, size = _sealed_tool_digest(fds[role], maximum=maximum, label=role)
        if digest != expected_digest or size != expected_bytes:
            raise InstallError("authenticated_tool_snapshot_mismatch:" + role)
        before = _tool_visible_identity(path)
        visible = _tool_snapshot(path, executable=True, maximum_bytes=maximum)
        _remember_visible_generation(context, role, before)
        _remember_visible_generation(context, role, _tool_visible_identity(path))
        if visible["sha256"] != expected_digest or visible["bytes"] != expected_bytes:
            raise InstallError("authenticated_visible_tool_mismatch:" + role)
        tools[role] = visible
    for role in SOURCE_ROLES + ("launcher", "native"):
        raw = _read_sealed_fd(fds[role], maximum=MAX_APPLICATION_SOURCE_BYTES, label=role)
        retained = context["sources"][role] if role in SOURCE_ROLES else context["payloads"][role]
        if raw != retained or len(raw) != int(manifest[role + "_bytes"]) or sha256(raw) != manifest[role + "_sha256"]:
            raise InstallError("authenticated_source_or_payload_changed:" + role)
    checkout = _verify_source_generation_dependencies(
        context["manifest_raw"], manifest, context["sources"], expected_head,
    )
    if checkout["tree"] != proof["expected_tree"]:
        raise InstallError("authenticated_runtime_tree_mismatch")
    _validate_parent_and_descriptors(context)
    # These content and stable tool-policy identities can enter a reusable plan.
    # PID, start time, FD numbers, inodes and stat timestamps stay private.
    return {
        "checkout": checkout,
        "git_tool": tools["git"],
        "python": tools["python"],
        "host_policy_sha256": proof["host_policy_sha256"],
        "host_policy_bytes": int(proof["host_policy_bytes"]),
        "source_generation_id": proof["source_generation_id"],
        "manifest_sha256": proof["manifest_sha256"],
        "manifest_bytes": int(proof["manifest_bytes"]),
    }


def _git_object(
    expected_head: str,
    relative: str,
    *,
    expected_blob: str,
    expected_bytes: int | None = None,
    expected_sha256: str | None = None,
) -> bytes:
    # Operational consumers use only the immutable inherited source set. Real
    # Git reads at the same HEAD are a separate generation revalidation step.
    context = _BOOTSTRAP_CONTEXT
    if context is None or "sources" not in context:
        raise InstallError("authenticated_source_descriptors_required")
    if expected_head != context["proof"]["expected_head"]:
        raise InstallError("authenticated_source_head_mismatch")
    by_path = {context["manifest"][role + "_rel"]: role for role in SOURCE_ROLES}
    role = by_path.get(relative)
    if role is None:
        raise InstallError("source_dependency_outside_closed_manifest")
    raw = context["sources"][role]
    if (
        git_blob_sha1(raw) != expected_blob
        or (expected_bytes is not None and len(raw) != expected_bytes)
        or (expected_sha256 is not None and sha256(raw) != expected_sha256)
    ):
        raise InstallError("authenticated_source_identity_mismatch:" + role)
    return raw


def accepted_lock(expected_head: str) -> dict[str, Any]:
    raw = _git_object(
        expected_head,
        LOCK_REL,
        expected_blob=LOCK_GIT_BLOB_SHA1,
    )
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InstallError("accepted_lock_json_invalid") from exc
    required = {
        "schema":
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_lock_v1",
        "marker":
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CANDIDATE_LOCK_V1",
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "candidate_accepted": True,
        "launcher_binary_identity_accepted": True,
        "protected_install_authorized": False,
        "precision_install_authorized": False,
        "native_or_binder_live_execution_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False,
        "treasury_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
        "production_host_evidence_authority": False,
        "next_gate":
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1",
        "lock_id": LOCK_ID,
    }
    if not isinstance(value, dict):
        raise InstallError("accepted_lock_shape_invalid")
    for key, expected in required.items():
        if value.get(key) != expected:
            raise InstallError("accepted_lock_field_mismatch:" + key)
    report = value.get("candidate_report")
    if not isinstance(report, dict):
        raise InstallError("accepted_lock_candidate_missing")
    checks = {
        "candidate_id": CANDIDATE_ID,
        "launcher_binary_sha256": LAUNCHER_SHA256,
        "launcher_binary_bytes": LAUNCHER_BYTES,
        "accepted_native_binary_sha256": NATIVE_SHA256,
        "accepted_native_binary_bytes": NATIVE_BYTES,
        "installer_source_git_blob_sha1": RUNTIME_INSTALLER_GIT_BLOB_SHA1,
        "installer_source_sha256": RUNTIME_INSTALLER_SHA256,
        "installer_source_bytes": RUNTIME_INSTALLER_BYTES,
        "compile_bound_confirmation":
            "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY",
    }
    for key, expected in checks.items():
        if report.get(key) != expected:
            raise InstallError("accepted_lock_candidate_field_mismatch:" + key)
    return value


def _read_exact_candidate(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    label: str,
) -> bytes:
    context = _BOOTSTRAP_CONTEXT
    if context is None or "payloads" not in context:
        raise InstallError("authenticated_candidate_descriptors_required")
    by_path = {
        "/proc/self/fd/" + str(context["fds"][role]): role
        for role in ("launcher", "native")
    }
    role = by_path.get(str(path))
    if role is None:
        raise InstallError(label + "_inherited_descriptor_path_required")
    raw = _read_sealed_fd(
        context["fds"][role], maximum=MAX_APPLICATION_SOURCE_BYTES, label=label,
    )
    if raw != context["payloads"][role] or len(raw) != expected_bytes or sha256(raw) != expected_sha256:
        raise InstallError(label + "_sealed_identity_mismatch")
    return raw


def python_snapshot() -> dict[str, Any]:
    return _tool_snapshot(
        FIXED_PYTHON,
        executable=True,
        maximum_bytes=MAX_PYTHON_BYTES,
    )


def build_policy(python: dict[str, Any]) -> bytes:
    return (
        "schema=" + POLICY_SCHEMA + "\n"
        "python_sha256=" + str(python["sha256"]) + "\n"
        "python_bytes=" + str(python["bytes"]) + "\n"
    ).encode("ascii")


def _verify_dir(path: pathlib.Path) -> None:
    st = _trusted_root_directory(path, exact_mode=0o755)
    if st.st_nlink < 2:
        raise InstallError("installed_directory_nlink_invalid:" + str(path))


def _verify_file(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_mode: int,
) -> None:
    try:
        before = path.lstat()
    except OSError as exc:
        raise InstallError("installed_file_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_size != expected_bytes
    ):
        raise InstallError("installed_file_metadata_invalid:" + str(path))
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise InstallError("installed_file_rebound:" + str(path))
        digest = hashlib.sha256()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("installed_file_short_read:" + str(path))
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("installed_file_grew:" + str(path))
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise InstallError("installed_file_changed:" + str(path))
    finally:
        os.close(fd)
    if digest.hexdigest() != expected_sha256:
        raise InstallError("installed_file_sha256_mismatch:" + str(path))


def _require_exact_entries(path: pathlib.Path, expected: tuple[str, ...]) -> None:
    try:
        actual = tuple(sorted(os.listdir(path)))
    except OSError as exc:
        raise InstallError("installed_directory_list_failed:" + str(path)) from exc
    if actual != tuple(sorted(expected)):
        raise InstallError("installed_directory_entries_invalid:" + str(path))


def _verify_root_generation(
    root: pathlib.Path,
    *,
    policy: bytes,
) -> None:
    _verify_dir(root)
    _require_exact_entries(root, (BIN_DIR, INPUT_DIR, POLICY_NAME, SOURCE_DIR))

    bin_path = root / BIN_DIR
    input_path = root / INPUT_DIR
    source_path = root / SOURCE_DIR
    ops_path = source_path / OPS_DIR
    precision_path = ops_path / PRECISION_DIR

    for directory in (bin_path, input_path, source_path, ops_path, precision_path):
        _verify_dir(directory)

    _require_exact_entries(bin_path, (LAUNCHER_NAME,))
    _require_exact_entries(input_path, (NATIVE_NAME,))
    _require_exact_entries(source_path, (OPS_DIR,))
    _require_exact_entries(ops_path, (PRECISION_DIR,))
    _require_exact_entries(precision_path, (RUNTIME_INSTALLER_NAME,))

    _verify_file(
        bin_path / LAUNCHER_NAME,
        expected_bytes=LAUNCHER_BYTES,
        expected_sha256=LAUNCHER_SHA256,
        expected_mode=0o555,
    )
    _verify_file(
        input_path / NATIVE_NAME,
        expected_bytes=NATIVE_BYTES,
        expected_sha256=NATIVE_SHA256,
        expected_mode=0o444,
    )
    _verify_file(
        precision_path / RUNTIME_INSTALLER_NAME,
        expected_bytes=RUNTIME_INSTALLER_BYTES,
        expected_sha256=RUNTIME_INSTALLER_SHA256,
        expected_mode=0o444,
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
    _verify_root_generation(INSTALL_ROOT, policy=policy)
    return GREEN_STATE


def collect_plan(
    launcher: pathlib.Path,
    native: pathlib.Path,
    expected_head: str,
) -> dict[str, Any]:
    context = _require_bootstrap_context(None, expected_head, None, launcher, native)
    generation = _revalidate_authenticated_generation(context, expected_head)
    if generation != context["initial_generation"]:
        raise InstallError("authenticated_generation_changed_before_plan")
    lock = accepted_lock(expected_head)
    launcher_raw = _read_exact_candidate(
        launcher,
        expected_bytes=LAUNCHER_BYTES,
        expected_sha256=LAUNCHER_SHA256,
        label="launcher_candidate",
    )
    native_raw = _read_exact_candidate(
        native,
        expected_bytes=NATIVE_BYTES,
        expected_sha256=NATIVE_SHA256,
        label="native_candidate",
    )
    checkout = generation["checkout"]
    git_tool = generation["git_tool"]
    python = generation["python"]
    runtime_installer = _git_object(
        expected_head,
        RUNTIME_INSTALLER_REL,
        expected_blob=RUNTIME_INSTALLER_GIT_BLOB_SHA1,
        expected_bytes=RUNTIME_INSTALLER_BYTES,
        expected_sha256=RUNTIME_INSTALLER_SHA256,
    )
    policy = build_policy(python)
    state = protected_state(policy)

    body = {
        "schema":
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_install_plan_v4",
        "version": 4,
        "lock_id": LOCK_ID,
        "candidate_id": CANDIDATE_ID,
        "expected_head": expected_head,
        "source_generation_id": generation["source_generation_id"],
        "source_manifest_sha256": generation["manifest_sha256"],
        "source_manifest_bytes": generation["manifest_bytes"],
        "host_policy_sha256": generation["host_policy_sha256"],
        "host_policy_bytes": generation["host_policy_bytes"],
        "trusted_os_runtime": MANIFEST_FIXED_VALUES["trusted_os_runtime"],
        "checkout": checkout,
        "git_tool": git_tool,
        "python": python,
        "launcher_sha256": sha256(launcher_raw),
        "launcher_bytes": len(launcher_raw),
        "native_sha256": sha256(native_raw),
        "native_bytes": len(native_raw),
        "runtime_installer_git_blob_sha1": git_blob_sha1(runtime_installer),
        "runtime_installer_sha256": sha256(runtime_installer),
        "runtime_installer_bytes": len(runtime_installer),
        "policy_sha256": sha256(policy),
        "policy_bytes": len(policy),
        "protected_state": state,
        "create_only": True,
        "rename_noreplace_required": True,
        "launcher_execution_authorized": False,
        "native_execution_authorized": False,
        "binder_execution_authorized": False,
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
    plan_id = PLAN_PREFIX + sha256(canonical_json(body))
    return {
        "lock": lock,
        "body": body,
        "plan_id": plan_id,
        "launcher_raw": launcher_raw,
        "native_raw": native_raw,
        "runtime_installer_raw": runtime_installer,
        "policy": policy,
        "authenticated_generation": generation,
    }


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("install_root=" + str(INSTALL_ROOT))
    print("create_only=true")
    print("rename_noreplace_required=true")
    print("launcher_execution_authorized=false")
    print("native_execution_authorized=false")
    print("binder_execution_authorized=false")
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


def plan(
    launcher: pathlib.Path,
    native: pathlib.Path,
    expected_head: str,
) -> None:
    _require_bootstrap_context("installer_plan", expected_head, "none", launcher, native)
    result = collect_plan(launcher, native, expected_head)
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("plan_id=" + result["plan_id"])
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("expected_head=" + expected_head)
    print("source_generation_id=" + str(body["source_generation_id"]))
    print("source_manifest_sha256=" + str(body["source_manifest_sha256"]))
    print("host_policy_sha256=" + str(body["host_policy_sha256"]))
    print("private_native_parent_proof_verified=true")
    print("closed_source_generation_verified=true")
    print("protected_state=" + str(body["protected_state"]))
    print("launcher_candidate_verified=true")
    print("native_candidate_verified=true")
    print("runtime_installer_git_object_verified=true")
    print("python_generation_bound=true")
    print("policy_sha256=" + str(body["policy_sha256"]))
    print("policy_bytes=" + str(body["policy_bytes"]))
    print("create_only=true")
    print("rename_noreplace_required=true")
    print("filesystem_write=false")
    print("launcher_execution_authorized=false")
    print("native_execution_authorized=false")
    print("binder_execution_authorized=false")
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
            "INSTALLED_READ_ONLY_QUALIFICATION_V1"
        )
    else:
        print("already_installed=false")
        print(
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
            "CREATE_ONLY_PROTECTED_INSTALL_V4"
        )


def _renameat2(dir_fd: int, source: str, target: str, flags: int) -> None:
    libc = ctypes.CDLL(None, use_errno=True)
    fn = getattr(libc, "renameat2", None)
    if fn is None:
        raise InstallError("renameat2_unavailable")
    fn.argtypes = [
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_uint,
    ]
    fn.restype = ctypes.c_int
    rc = fn(
        dir_fd,
        source.encode("utf-8"),
        dir_fd,
        target.encode("utf-8"),
        flags,
    )
    if rc != 0:
        raise InstallError(
            "renameat2_failed:"
            + source
            + ":"
            + target
            + ":"
            + str(ctypes.get_errno())
        )


def _mkdir_at(parent_fd: int, name: str) -> int:
    os.mkdir(name, 0o755, dir_fd=parent_fd)
    fd = os.open(
        name,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        dir_fd=parent_fd,
    )
    os.fchown(fd, 0, 0)
    os.fchmod(fd, 0o755)
    return fd


def _create_file(
    parent_fd: int,
    name: str,
    raw: bytes,
    *,
    mode: int,
    expected_sha256: str,
) -> None:
    fd = os.open(
        name,
        os.O_WRONLY
        | os.O_CREAT
        | os.O_EXCL
        | os.O_CLOEXEC
        | os.O_NOFOLLOW,
        0o400,
        dir_fd=parent_fd,
    )
    try:
        os.fchown(fd, 0, 0)
        offset = 0
        view = memoryview(raw)
        digest = hashlib.sha256()
        while offset < len(view):
            wrote = os.write(fd, view[offset:])
            if wrote <= 0:
                raise InstallError("stage_file_short_write:" + name)
            digest.update(view[offset : offset + wrote])
            offset += wrote
        if digest.hexdigest() != expected_sha256:
            raise InstallError("stage_file_write_sha256_mismatch:" + name)
        os.fchmod(fd, mode)
        os.fsync(fd)
    finally:
        os.close(fd)


def _cleanup_created_stage(
    parent_fd: int,
    expected_stage_dev: int,
    expected_stage_ino: int,
) -> bool:
    """Remove only the created stage generation through retained descriptors."""
    expected = {
        (): {BIN_DIR, INPUT_DIR, POLICY_NAME, SOURCE_DIR},
        (BIN_DIR,): {LAUNCHER_NAME},
        (INPUT_DIR,): {NATIVE_NAME},
        (SOURCE_DIR,): {OPS_DIR},
        (SOURCE_DIR, OPS_DIR): {PRECISION_DIR},
        (SOURCE_DIR, OPS_DIR, PRECISION_DIR): {RUNTIME_INSTALLER_NAME},
    }
    directories: dict[tuple[str, ...], int] = {}
    identities: dict[tuple[str, ...], tuple[int, int]] = {}
    files: list[tuple[tuple[str, ...], str, os.stat_result]] = []

    def directory_identity(st: os.stat_result) -> tuple[int, int]:
        if (
            not stat.S_ISDIR(st.st_mode)
            or st.st_uid != 0
            or st.st_gid != 0
            or stat.S_IMODE(st.st_mode) != 0o755
        ):
            raise InstallError("cleanup_directory_not_protected")
        return st.st_dev, st.st_ino

    def visible_directory_identity(relative: tuple[str, ...]) -> tuple[int, int]:
        fd = parent_fd if not relative else directories[relative[:-1]]
        name = STAGE_NAME if not relative else relative[-1]
        return directory_identity(os.stat(name, dir_fd=fd, follow_symlinks=False))

    def generations_match() -> bool:
        return all(
            visible_directory_identity(relative) == identity
            and set(os.listdir(directories[relative])) <= expected[relative]
            for relative, identity in identities.items()
        )

    def cleanup() -> bool:
        try:
            visible = visible_directory_identity(())
        except FileNotFoundError:
            return True
        if visible != (expected_stage_dev, expected_stage_ino):
            return False

        for relative in expected:
            if relative and relative[:-1] not in directories:
                continue
            fd = parent_fd if not relative else directories[relative[:-1]]
            name = STAGE_NAME if not relative else relative[-1]
            try:
                before = visible_directory_identity(relative)
            except FileNotFoundError:
                if not relative:
                    return False
                continue
            opened = os.open(
                name,
                os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                dir_fd=fd,
            )
            directories[relative] = opened
            identity = directory_identity(os.fstat(opened))
            if identity != before or (not relative and identity != visible):
                return False
            identities[relative] = identity

        # Complete preflight precedes every deletion. Partial creation is valid;
        # unknown names, symlinks, special files and hardlinks are not.
        for relative, fd in directories.items():
            entries = set(os.listdir(fd))
            if entries - expected[relative]:
                return False
            for name in entries:
                child = relative + (name,)
                if child in expected:
                    if child not in directories:
                        return False
                    continue
                observed = os.stat(name, dir_fd=fd, follow_symlinks=False)
                if (
                    not stat.S_ISREG(observed.st_mode)
                    or observed.st_uid != 0
                    or observed.st_gid != 0
                    or observed.st_nlink != 1
                    or (observed.st_mode & 0o022) != 0
                ):
                    return False
                files.append((relative, name, observed))

        for relative, name, observed in files:
            if not generations_match():
                return False
            if not _same_stat(
                observed,
                os.stat(name, dir_fd=directories[relative], follow_symlinks=False),
            ):
                return False
            os.unlink(name, dir_fd=directories[relative])

        for relative in reversed(tuple(directories)):
            if not generations_match():
                return False
            fd = parent_fd if not relative else directories[relative[:-1]]
            name = STAGE_NAME if not relative else relative[-1]
            os.rmdir(name, dir_fd=fd)
            del identities[relative]
        return True

    result = False
    try:
        result = cleanup()
    except (OSError, InstallError):
        result = False
    finally:
        for fd in reversed(tuple(directories.values())):
            try:
                os.close(fd)
            except OSError:
                result = False
    return result


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
    print("launcher_execution=false")
    print("native_execution=false")
    print("binder_execution=false")
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


def apply(
    launcher: pathlib.Path,
    native: pathlib.Path,
    expected_head: str,
    expected_plan_id: str,
    confirm: str,
) -> None:
    context = _require_bootstrap_context(
        "installer_apply", expected_head, expected_plan_id, launcher, native,
    )
    if confirm != CONFIRM_TOKEN:
        raise InstallError("explicit_create_only_confirmation_required")
    if os.geteuid() != 0:
        raise InstallError("root_required_for_apply")
    _require_secure_apply_context()
    emit_operation_authority()

    initial = collect_plan(launcher, native, expected_head)
    if initial["plan_id"] != expected_plan_id:
        raise InstallError("expected_plan_id_mismatch")
    body = initial["body"]
    generation_before = initial["authenticated_generation"]
    if body["protected_state"] == GREEN_STATE:
        if _revalidate_authenticated_generation(context, expected_head) != generation_before:
            raise InstallError("authenticated_generation_changed_before_green_receipt")
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("protected_install_performed=false")
        print("launcher_execution=false")
        print("native_execution=false")
        print("binder_execution=false")
        print("credential_access=false")
        print("transaction=false")
        print("funds_movement=false")
        return
    if body["protected_state"] != READY_STATE:
        raise InstallError("apply_state_not_install_ready")

    launcher_raw = initial["launcher_raw"]
    native_raw = initial["native_raw"]
    runtime_installer_raw = initial["runtime_installer_raw"]
    policy = initial["policy"]

    opt_fd = os.open(
        INSTALL_PARENT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    stage_created = False
    stage_dev: int | None = None
    stage_ino: int | None = None
    published = False
    parent_fsync_completed = False
    final_verification_completed = False
    try:
        if _exists(STAGE_ROOT) or _exists(INSTALL_ROOT):
            raise InstallError("install_root_or_stage_already_present")

        if _revalidate_authenticated_generation(context, expected_head) != generation_before:
            raise InstallError("authenticated_generation_changed_before_mutation")

        os.mkdir(STAGE_NAME, 0o755, dir_fd=opt_fd)
        stage_created = True
        stage_fd = os.open(
            STAGE_NAME,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=opt_fd,
        )
        try:
            stage_identity = os.fstat(stage_fd)
            stage_dev = stage_identity.st_dev
            stage_ino = stage_identity.st_ino
            os.fchown(stage_fd, 0, 0)
            os.fchmod(stage_fd, 0o755)
            bin_fd = _mkdir_at(stage_fd, BIN_DIR)
            input_fd = _mkdir_at(stage_fd, INPUT_DIR)
            source_fd = _mkdir_at(stage_fd, SOURCE_DIR)
            try:
                ops_fd = _mkdir_at(source_fd, OPS_DIR)
                try:
                    precision_fd = _mkdir_at(ops_fd, PRECISION_DIR)
                    try:
                        _create_file(
                            bin_fd,
                            LAUNCHER_NAME,
                            launcher_raw,
                            mode=0o555,
                            expected_sha256=LAUNCHER_SHA256,
                        )
                        _create_file(
                            input_fd,
                            NATIVE_NAME,
                            native_raw,
                            mode=0o444,
                            expected_sha256=NATIVE_SHA256,
                        )
                        _create_file(
                            precision_fd,
                            RUNTIME_INSTALLER_NAME,
                            runtime_installer_raw,
                            mode=0o444,
                            expected_sha256=RUNTIME_INSTALLER_SHA256,
                        )
                        _create_file(
                            stage_fd,
                            POLICY_NAME,
                            policy,
                            mode=0o444,
                            expected_sha256=sha256(policy),
                        )
                        os.fsync(precision_fd)
                    finally:
                        os.close(precision_fd)
                    os.fsync(ops_fd)
                finally:
                    os.close(ops_fd)
                os.fsync(source_fd)
            finally:
                os.close(source_fd)
                os.close(input_fd)
                os.close(bin_fd)
            os.fsync(stage_fd)
        finally:
            os.close(stage_fd)
        os.fsync(opt_fd)

        _verify_root_generation(STAGE_ROOT, policy=policy)
        if _revalidate_authenticated_generation(context, expected_head) != generation_before:
            raise InstallError("authenticated_generation_changed_before_publication")

        _renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)
        stage_created = False
        published = True
        os.fsync(opt_fd)
        parent_fsync_completed = True

        _verify_root_generation(INSTALL_ROOT, policy=policy)
        if _revalidate_authenticated_generation(context, expected_head) != generation_before:
            raise InstallError("authenticated_generation_changed_after_publication")
        final_verification_completed = True
    except BaseException as exc:
        if published:
            klass, reason = _bounded_failure(exc)
            failure = PublishedInstallError(
                "published_install_requires_inspection",
                phase="post_publication_verification",
                parent_fsync_completed=parent_fsync_completed,
                final_verification_completed=final_verification_completed,
                original_failure_class=klass,
                original_failure_reason=reason,
            )
            try:
                os.close(opt_fd)
                failure.install_parent_close_completed = True
            except BaseException as close_exc:
                failure.install_parent_close_completed = False
                (
                    failure.close_failure_class,
                    failure.close_failure_reason,
                ) = _bounded_failure(close_exc)
            raise failure from exc

        cleanup_attempted = stage_created
        cleanup_green = True
        if cleanup_attempted:
            if stage_dev is None or stage_ino is None:
                cleanup_green = False
            else:
                cleanup_green = _cleanup_created_stage(opt_fd, stage_dev, stage_ino)
        print("prepublication_cleanup_attempted=" + str(cleanup_attempted).lower())
        print("prepublication_cleanup_green=" + str(cleanup_green).lower())
        try:
            os.close(opt_fd)
        except BaseException as close_exc:
            raise InstallError("install_parent_close_failed_before_publication") from close_exc
        if not cleanup_green:
            raise InstallError("prepublication_cleanup_failed") from exc
        raise

    try:
        os.close(opt_fd)
    except BaseException as close_exc:
        klass, reason = _bounded_failure(close_exc)
        failure = PublishedInstallError(
            "published_install_close_failed",
            phase="install_parent_close",
            parent_fsync_completed=parent_fsync_completed,
            final_verification_completed=final_verification_completed,
            original_failure_class=klass,
            original_failure_reason=reason,
        )
        failure.install_parent_close_completed = False
        failure.close_failure_class = klass
        failure.close_failure_reason = reason
        raise failure from close_exc

    print(MARKER)
    print("mode=apply")
    print("status=GREEN")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("plan_id=" + expected_plan_id)
    print("source_generation_id=" + str(body["source_generation_id"]))
    print("source_manifest_sha256=" + str(body["source_manifest_sha256"]))
    print("host_policy_sha256=" + str(body["host_policy_sha256"]))
    print("private_native_parent_proof_verified=true")
    print("closed_source_generation_verified=true")
    print("protected_install_performed=true")
    print("publication=true")
    print("publication_state=create_only_rename_noreplace_verified")
    print("final_state_verified=true")
    print("parent_fsync_completed=true")
    print("install_parent_close_completed=true")
    print("launcher_sha256=" + LAUNCHER_SHA256)
    print("launcher_bytes=" + str(LAUNCHER_BYTES))
    print("native_sha256=" + NATIVE_SHA256)
    print("native_bytes=" + str(NATIVE_BYTES))
    print("runtime_installer_sha256=" + RUNTIME_INSTALLER_SHA256)
    print("runtime_installer_bytes=" + str(RUNTIME_INSTALLER_BYTES))
    print("policy_sha256=" + sha256(policy))
    print("policy_bytes=" + str(len(policy)))
    print("launcher_execution=false")
    print("native_execution=false")
    print("binder_execution=false")
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
        "next_action=EPOCH2_DORMANT_FIRST_ENTRY_"
        "INSTALLED_READ_ONLY_QUALIFICATION_V1"
    )


def self_test() -> None:
    body = {
        "lock_id": LOCK_ID,
        "candidate_id": CANDIDATE_ID,
        "launcher_sha256": LAUNCHER_SHA256,
        "launcher_bytes": LAUNCHER_BYTES,
        "native_sha256": NATIVE_SHA256,
        "native_bytes": NATIVE_BYTES,
        "runtime_installer_sha256": RUNTIME_INSTALLER_SHA256,
        "runtime_installer_bytes": RUNTIME_INSTALLER_BYTES,
        "install_root": str(INSTALL_ROOT),
        "confirm": CONFIRM_TOKEN,
    }
    assert PLAN_PREFIX.startswith("voidbuye2dormantfirstentryinstall4_")
    assert GIT_BOUNDARY_POLICY == "private_metadata_pinned_objects_raw_checkout_v4"
    assert len(sha256(canonical_json(body))) == 64
    policy = build_policy(
        {
            "sha256": "a" * 64,
            "bytes": 123456,
        }
    )
    assert policy == (
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + "a" * 64 + "\n"
        + "python_bytes=123456\n"
    ).encode("ascii")
    assert len(LAUNCHER_SHA256) == 64
    assert len(NATIVE_SHA256) == 64
    assert len(RUNTIME_INSTALLER_SHA256) == 64
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_first_entry_lock_bound=true")
    print("exact_launcher_candidate_bound=true")
    print("exact_native_candidate_bound=true")
    print("exact_runtime_installer_git_object_bound=true")
    print("root_python_policy_binding_required=true")
    print("create_only=true")
    print("rename_noreplace_required=true")
    print("operation_bound_plan_id_required=true")
    print("explicit_apply_confirmation_required=true")
    print("prepublication_cleanup_required=true")
    print("prepublication_cleanup_stage_generation_bound=true")
    print("prepublication_cleanup_descriptor_relative=true")
    print("post_publication_rollback=false")
    print("truthful_post_publication_failure_receipt=true")
    print("post_publication_close_failure_receipt_truthful=true")
    print("launcher_execution=false")
    print("native_execution=false")
    print("binder_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--launcher", default="")
    parser.add_argument("--native", default="")
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

    if not args.launcher or not args.native or not args.expected_head:
        raise InstallError("launcher_native_expected_head_required")
    launcher = pathlib.Path(args.launcher)
    native = pathlib.Path(args.native)

    if args.plan:
        if args.expected_plan_id or args.confirm:
            raise InstallError("plan_apply_arguments_forbidden")
        _activate_bootstrap_context(
            "installer_plan", args.expected_head, "none", launcher, native,
        )
        plan(launcher, native, args.expected_head)
        return 0

    if not args.expected_plan_id:
        raise InstallError("expected_plan_id_required")
    _activate_bootstrap_context(
        "installer_apply", args.expected_head, args.expected_plan_id, launcher, native,
    )
    apply(
        launcher,
        native,
        args.expected_head,
        args.expected_plan_id,
        args.confirm,
    )
    return 0


def entrypoint() -> int:
    try:
        return main()
    except PublishedInstallError as exc:
        print(MARKER)
        print("status=HOLD")
        print("receipt_boundary=FINAL_FAILURE_RECEIPT")
        print("publication=true")
        print("publication_state=published_needs_inspection")
        print(
            "parent_fsync_completed="
            + (
                "true"
                if exc.parent_fsync_completed is True
                else "false"
                if exc.parent_fsync_completed is False
                else "unknown"
            )
        )
        print(
            "final_verification_completed="
            + (
                "true"
                if exc.final_verification_completed is True
                else "false"
                if exc.final_verification_completed is False
                else "unknown"
            )
        )
        print("failure_phase=" + exc.phase)
        print(
            "install_parent_close_completed="
            + (
                "true"
                if exc.install_parent_close_completed is True
                else "false"
                if exc.install_parent_close_completed is False
                else "unknown"
            )
        )
        print("close_failure_class=" + exc.close_failure_class)
        print("close_failure_reason=" + exc.close_failure_reason)
        print("original_failure_class=" + exc.original_failure_class)
        print("original_failure_reason=" + exc.original_failure_reason)
        print("post_publication_rollback=false")
        print("launcher_execution=false")
        print("native_execution=false")
        print("binder_execution=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("funds_movement=false")
        return 2
    except InstallError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("publication=false")
        print("launcher_execution=false")
        print("native_execution=false")
        print("binder_execution=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("funds_movement=false")
        return 2


if __name__ == "__main__":
    raise SystemExit(entrypoint())
