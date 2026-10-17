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
import selectors
import signal
import stat
import subprocess
import sys
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
    "INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V3"
)
# V3 authenticates this installer operation and its complete source generation.
# Keep the payload namespace and policy schema compatible with the frozen lock.
POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1"
)
CONFIRM_TOKEN = "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V3_CREATE_ONLY"
PLAN_PREFIX = "voidbuye2dormantfirstentryinstall3_"

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
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v3.py"
)
BOOTSTRAP_SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4.c"
)
MANIFEST_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-source-generation-v1.conf"
)
BOOTSTRAP_ROOT = pathlib.Path(
    "/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v4"
)
BOOTSTRAP_SELF = BOOTSTRAP_ROOT / "bin" / (
    "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4"
)
BOOTSTRAP_MANIFEST = BOOTSTRAP_ROOT / "source-generation-v1.conf"
BOOTSTRAP_POLICY = BOOTSTRAP_ROOT / "policy-v1.conf"
MANIFEST_SCHEMA = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_SOURCE_GENERATION_V1"
HOST_POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V4"
)
PARENT_PROOF_SCHEMA = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_V1"
PARENT_PROOF_ENV = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_FD"
SOURCE_GENERATION_PREFIX = "voidbuye2dormantsourcegen1_"
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


def _git(args: list[str]) -> bytes:
    # Operational activation hashes and authenticates this immutable snapshot
    # against the retained root policy before enabling any Git invocation.
    # Use the same FD for execution; a later pathname replacement cannot select
    # a different executable between the check and exec.
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
        git_state = os.fstat(git_fd)
        seals = fcntl.fcntl(git_fd, fcntl.F_GET_SEALS)
    except OSError as exc:
        raise InstallError("retained_git_descriptor_unavailable") from exc
    if (
        not stat.S_ISREG(git_state.st_mode)
        or stat.S_IMODE(git_state.st_mode) != 0o500
        or git_state.st_nlink != 0
        or seals & required_seals != required_seals
    ):
        raise InstallError("retained_git_descriptor_not_sealed_executable")
    settings = (
        "safe.directory=" + str(FIXED_CHECKOUT),
        "core.bare=false",
        "core.fsmonitor=false",
        "core.hooksPath=/dev/null",
        "core.attributesFile=/dev/null",
        "core.excludesFile=/dev/null",
        "core.untrackedCache=false",
        "core.preloadIndex=false",
        "core.ignoreCase=false",
        "core.fileMode=true",
        "core.commitGraph=false",
        "submodule.recurse=false",
        "protocol.allow=never",
        "gc.auto=0",
        "maintenance.auto=false",
        "fetch.writeCommitGraph=false",
    )
    argv = [
        "/proc/self/fd/" + str(git_fd),
        "--no-pager",
        "--no-replace-objects",
        "--no-optional-locks",
        "-C",
        str(FIXED_CHECKOUT),
        "--git-dir=" + str(FIXED_CHECKOUT / ".git"),
        "--work-tree=" + str(FIXED_CHECKOUT),
    ]
    for setting in settings:
        argv.extend(("-c", setting))
    argv.extend(args)
    return _bounded_git_read(argv, git_fd)


def _nul_records(raw: bytes, label: str) -> list[bytes]:
    if len(raw) > MAX_GIT_READ_OUTPUT_BYTES:
        raise InstallError(label + "_too_large")
    if not raw:
        return []
    if not raw.endswith(b"\0"):
        raise InstallError(label + "_termination_invalid")
    records = raw[:-1].split(b"\0")
    if len(records) > MAX_TRACKED_ENTRIES or any(not r for r in records):
        raise InstallError(label + "_record_count_invalid")
    return records


def _tracked_parts(path: bytes) -> tuple[bytes, ...]:
    parts = tuple(path.split(b"/"))
    if (
        not path
        or len(path) > MAX_TRACKED_PATH_BYTES
        or b"\0" in path
        or any(part in (b"", b".", b"..", b".git") for part in parts)
    ):
        raise InstallError("checkout_tracked_path_invalid")
    return parts


def _tracked_listing(
    raw: bytes,
    *,
    from_index: bool,
) -> dict[bytes, tuple[bytes, str]]:
    entries: dict[bytes, tuple[bytes, str]] = {}
    label = "checkout_index" if from_index else "checkout_tree"
    for record in _nul_records(raw, label):
        header, sep, path = record.partition(b"\t")
        if sep != b"\t":
            raise InstallError(label + "_entry_invalid")
        _tracked_parts(path)
        fields = header.split(b" ")
        if from_index:
            # -v exposes assume-unchanged as lowercase and skip-worktree as
            # S. --sparse exposes sparse-directory entries without expanding
            # them. Accept only ordinary, fully materialized stage-0 files.
            if len(fields) != 4 or fields[0] != b"H" or fields[3] != b"0":
                raise InstallError("checkout_index_flags_or_stage_unsupported")
            mode, oid_bytes = fields[1], fields[2]
        else:
            if len(fields) != 3 or fields[1] != b"blob":
                raise InstallError("checkout_tree_entry_type_unsupported")
            mode, oid_bytes = fields[0], fields[2]
        try:
            oid = oid_bytes.decode("ascii")
        except UnicodeDecodeError as exc:
            raise InstallError(label + "_object_invalid") from exc
        if mode not in TRACKED_MODES or HEX40.fullmatch(oid) is None:
            raise InstallError(label + "_mode_or_object_unsupported")
        if path in entries:
            raise InstallError(label + "_duplicate_path")
        entries[path] = (mode, oid)
    return entries


def _reject_git_store_redirects(git_fd: int) -> None:
    def reject_present(parent_fd: int, name: bytes) -> None:
        try:
            os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        except FileNotFoundError:
            return
        raise InstallError("checkout_git_store_redirect_unsupported")

    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW
    for name in (b"commondir", b"shallow"):
        reject_present(git_fd, name)
    objects_fd = os.open(b"objects", flags, dir_fd=git_fd)
    try:
        for directory, forbidden in (
            (b"info", (b"alternates", b"http-alternates")),
            (b"pack", ()),
        ):
            try:
                child_fd = os.open(directory, flags, dir_fd=objects_fd)
            except FileNotFoundError:
                continue
            try:
                for name in forbidden:
                    reject_present(child_fd, name)
            finally:
                os.close(child_fd)
    finally:
        os.close(objects_fd)
    try:
        info_fd = os.open(b"info", flags, dir_fd=git_fd)
    except FileNotFoundError:
        return
    try:
        reject_present(info_fd, b"grafts")
    finally:
        os.close(info_fd)


def _open_fixed_checkout() -> int:
    # Walk from / so no ancestor of the fixed checkout can be a symlink.
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW
    fd = os.open(b"/", flags)
    try:
        for part in FIXED_CHECKOUT.parts[1:]:
            child = os.open(os.fsencode(part), flags, dir_fd=fd)
            os.close(fd)
            fd = child
        # This version deliberately supports a physical .git directory only.
        # A gitfile or .git symlink must not redirect the fixed checkout.
        git_fd = os.open(b".git", flags, dir_fd=fd)
        try:
            _reject_git_store_redirects(git_fd)
        finally:
            os.close(git_fd)
        return fd
    except BaseException:
        os.close(fd)
        raise


def _tracked_blob_snapshot(
    root_fd: int,
    path: bytes,
    *,
    mode: bytes,
    expected_oid: str,
    remaining_budget: int,
) -> int:
    parts = _tracked_parts(path)
    parent_fd = os.dup(root_fd)
    directory_fds = [parent_fd]
    directory_bindings: list[tuple[int, bytes, int, os.stat_result]] = []
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW
    try:
        for part in parts[:-1]:
            before_dir = os.stat(part, dir_fd=parent_fd, follow_symlinks=False)
            child_fd = os.open(part, flags, dir_fd=parent_fd)
            directory_fds.append(child_fd)
            if not _same_stat(before_dir, os.fstat(child_fd)):
                raise InstallError("checkout_tracked_directory_rebound")
            directory_bindings.append((parent_fd, part, child_fd, before_dir))
            parent_fd = child_fd
        leaf = parts[-1]
        before = os.stat(leaf, dir_fd=parent_fd, follow_symlinks=False)
        if before.st_size < 0 or before.st_size > min(
            MAX_TRACKED_FILE_BYTES, remaining_budget
        ):
            raise InstallError("checkout_tracked_read_budget_exceeded")
        if mode == b"120000":
            if not stat.S_ISLNK(before.st_mode):
                raise InstallError("checkout_tracked_symlink_type_mismatch")
            # A bytes path returns the raw link text, without opening the
            # target, even for an absolute or out-of-checkout target.
            raw = os.readlink(leaf, dir_fd=parent_fd)
            if not isinstance(raw, bytes) or len(raw) != before.st_size:
                raise InstallError("checkout_tracked_symlink_size_changed")
            actual_oid = git_blob_sha1(raw)
        else:
            if not stat.S_ISREG(before.st_mode):
                raise InstallError("checkout_tracked_regular_type_mismatch")
            # Git records the owner execute bit, not full POSIX permissions.
            if bool(before.st_mode & stat.S_IXUSR) != (mode == b"100755"):
                raise InstallError("checkout_tracked_executable_bit_mismatch")
            fd = os.open(
                leaf,
                os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
                dir_fd=parent_fd,
            )
            try:
                opened = os.fstat(fd)
                if not stat.S_ISREG(opened.st_mode) or not _same_stat(before, opened):
                    raise InstallError("checkout_tracked_file_rebound")
                digest = hashlib.sha1(
                    b"blob " + str(opened.st_size).encode("ascii") + b"\0"
                )
                remaining = opened.st_size
                while remaining:
                    chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
                    if not chunk:
                        raise InstallError("checkout_tracked_file_short_read")
                    digest.update(chunk)
                    remaining -= len(chunk)
                if os.read(fd, 1):
                    raise InstallError("checkout_tracked_file_grew")
                if not _same_stat(opened, os.fstat(fd)):
                    raise InstallError("checkout_tracked_file_changed")
                actual_oid = digest.hexdigest()
            finally:
                os.close(fd)
        if not _same_stat(
            before, os.stat(leaf, dir_fd=parent_fd, follow_symlinks=False)
        ):
            raise InstallError("checkout_tracked_file_changed")
        if actual_oid != expected_oid:
            raise InstallError("checkout_tracked_raw_blob_mismatch")
        for directory_parent, name, child_fd, initial in directory_bindings:
            if (
                not _same_stat(initial, os.fstat(child_fd))
                or not _same_stat(
                    initial,
                    os.stat(name, dir_fd=directory_parent, follow_symlinks=False),
                )
            ):
                raise InstallError("checkout_tracked_directory_changed")
        return before.st_size
    except OSError as exc:
        raise InstallError("checkout_tracked_path_read_failed") from exc
    finally:
        for fd in reversed(directory_fds):
            os.close(fd)


def checkout_snapshot(expected_head: str) -> dict[str, Any]:
    if HEX40.fullmatch(expected_head) is None:
        raise InstallError("expected_head_invalid")
    try:
        root_fd = _open_fixed_checkout()
    except OSError as exc:
        raise InstallError("checkout_physical_directory_required") from exc
    try:
        root_before = os.fstat(root_fd)
        head = _git(["rev-parse", "--verify", "HEAD^{commit}"]).decode("ascii").strip()
        if head != expected_head:
            raise InstallError("checkout_head_mismatch")
        branch_ref = _git(["symbolic-ref", "-q", "HEAD"])
        if branch_ref != b"refs/heads/main\n":
            raise InstallError("checkout_branch_not_main")
        tree = _git([
            "rev-parse", "--verify", expected_head + "^{tree}"
        ]).decode("ascii").strip()
        if HEX40.fullmatch(tree) is None:
            raise InstallError("checkout_tree_invalid")

        tree_entries = _tracked_listing(
            _git(["ls-tree", "-r", "--full-tree", "-z", expected_head]),
            from_index=False,
        )
        index_args = ["ls-files", "--stage", "-v", "-z", "--full-name", "--sparse"]
        index_raw = _git(index_args)
        index_entries = _tracked_listing(index_raw, from_index=True)
        if index_entries != tree_entries:
            raise InstallError("checkout_index_tree_mismatch")

        total_bytes = 0
        for path, (mode, oid) in tree_entries.items():
            total_bytes += _tracked_blob_snapshot(
                root_fd,
                path,
                mode=mode,
                expected_oid=oid,
                remaining_budget=MAX_TRACKED_TOTAL_BYTES - total_bytes,
            )

        if _git(["ls-files", "--others", "--exclude-standard", "-z", "--full-name"]):
            raise InstallError("checkout_untracked_files_present")
        if _git(index_args) != index_raw:
            raise InstallError("checkout_index_changed_during_snapshot")
        if (
            _git(["rev-parse", "--verify", "HEAD^{commit}"]) != (expected_head + "\n").encode("ascii")
            or _git(["symbolic-ref", "-q", "HEAD"]) != branch_ref
        ):
            raise InstallError("checkout_generation_changed_during_snapshot")
        if (
            not _same_stat(root_before, os.fstat(root_fd))
            or not _same_stat(root_before, FIXED_CHECKOUT.lstat())
        ):
            raise InstallError("checkout_root_changed_during_snapshot")
        return {"head": head, "tree": tree, "branch": "main", "clean": True}
    finally:
        os.close(root_fd)


def _read_git_object(
    expected_head: str,
    relative: str,
    *,
    expected_blob: str,
    expected_bytes: int | None = None,
    expected_sha256: str | None = None,
) -> bytes:
    # No --filters or --textconv; this operation returns raw blob content.
    raw = _git(["cat-file", "blob", expected_head + ":" + relative])
    if git_blob_sha1(raw) != expected_blob:
        raise InstallError("git_object_blob_mismatch:" + relative)
    if expected_bytes is not None and len(raw) != expected_bytes:
        raise InstallError("git_object_bytes_mismatch:" + relative)
    if expected_sha256 is not None and sha256(raw) != expected_sha256:
        raise InstallError("git_object_sha256_mismatch:" + relative)
    return raw


def _verify_source_generation_dependencies(
    manifest_raw: bytes,
    manifest: dict[str, str],
    sources: dict[str, bytes],
    expected_head: str,
) -> dict[str, Any]:
    """Read-only generation checks, also usable with disposable source fixtures.

    The caller supplies authenticated immutable bytes. This helper grants no
    installer authority; operational callers separately require a live native
    proof and policy-bound descriptors. Git reads raw blobs without conversion.
    """
    if parse_source_manifest(manifest_raw) != manifest or set(sources) != set(SOURCE_ROLES):
        raise InstallError("source_generation_membership_invalid")
    checkout = checkout_snapshot(expected_head)
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

    root_fd = _open_fixed_checkout()
    try:
        for relative, expected_raw, expected_blob in expected_files:
            # A source tuple always means a regular, non-executable Git blob.
            # Do not permit an attribute conversion, symlink or tree substitution.
            listing = _tracked_listing(
                _git(["ls-tree", "-z", expected_head, "--", relative]),
                from_index=False,
            )
            if listing != {relative.encode("ascii"): (b"100644", expected_blob)}:
                raise InstallError("source_generation_tree_entry_mismatch:" + relative)
            raw = _read_git_object(
                expected_head, relative, expected_blob=expected_blob,
                expected_bytes=len(expected_raw), expected_sha256=sha256(expected_raw),
            )
            if raw != expected_raw:
                raise InstallError("source_generation_git_bytes_mismatch:" + relative)
            _tracked_blob_snapshot(
                root_fd, relative.encode("ascii"), mode=b"100644",
                expected_oid=expected_blob, remaining_budget=MAX_APPLICATION_SOURCE_BYTES,
            )
        if (
            _git(["rev-parse", "--verify", "HEAD^{commit}"]) != (expected_head + "\n").encode("ascii")
            or _git(["symbolic-ref", "-q", "HEAD"]) != b"refs/heads/main\n"
        ):
            raise InstallError("source_generation_head_changed_during_validation")
    finally:
        os.close(root_fd)
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
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_install_plan_v3",
        "version": 3,
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
            "CREATE_ONLY_PROTECTED_INSTALL_V3"
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
    assert PLAN_PREFIX.startswith("voidbuye2dormantfirstentryinstall3_")
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
