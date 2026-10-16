#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
import pathlib
import stat
import subprocess
import sys
from typing import Any, Callable

ROOT = pathlib.Path(__file__).resolve().parents[2]
LOCK_REL = "ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v5.json"
LOCK_PATH = ROOT / LOCK_REL
LOCK_GIT_BLOB_SHA1 = "db59358bab68a0fa33d0840bd9afe967dd809e61"
LOCK_ID = (
    "voidbuye2nativecandlock5_"
    "650ae9975eeb898279649e48115cdfec242052c0853b0ce5af19244d4d304126"
)
CANDIDATE_ID = (
    "voidbuye2nativecand5_"
    "a377212ff699fb3463d2bfeecc61a16416a98ed5a291771c4a8a73aa003e6308"
)

MARKER = "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V3"
POLICY_SCHEMA = "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3"

FIXED_CHECKOUT = pathlib.Path("/home/zoso/dev/void-node")
INSTALL_PARENT = pathlib.Path("/opt")
INSTALL_NAME = "void-buy-void-epoch2-live-composition-v3"
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
STAGE_NAME = ".void-buy-void-epoch2-live-composition-v3.stage"
STAGE_ROOT = INSTALL_PARENT / STAGE_NAME

NATIVE_NAME = "void_buy_void_epoch2_live_composition_native_preentry_v3"
RUNNER_NAME = "void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
POLICY_NAME = "policy-v3.conf"
NATIVE_TARGET = INSTALL_ROOT / NATIVE_NAME
RUNNER_TARGET = INSTALL_ROOT / RUNNER_NAME
POLICY_TARGET = INSTALL_ROOT / POLICY_NAME
FIXED_NODE = pathlib.Path("/usr/bin/node")
FIXED_GIT = pathlib.Path("/usr/bin/git")
FIXED_SETPRIV = pathlib.Path("/usr/bin/setpriv")
RUNTIME_UID = 1000
RUNTIME_GID = 1000

NATIVE_BYTES = 726_976
NATIVE_SHA256 = "85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
RUNNER_BYTES = 40_616
RUNNER_SHA256 = "f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889"
NATIVE_SOURCE_BLOB = "5021727f1def1ec11f870d735cab65acc1701a5e"
RUNNER_SOURCE_BLOB = "baab733e43c030d24f8d4abd1644f3c4ae55c3b2"
SEALED_V2_BLOB = "14cbe81e27d04fee77cbe75225ce308bf8561a7b"
QUALIFIER_BLOB = "70b74ff2f09f5aef86eec39b8f643d8f2ebb63f5"

NATIVE_SOURCE_REL = "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c"
RUNNER_SOURCE_REL = "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
SEALED_V2_REL = "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs"
QUALIFIER_REL = "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py"

CONFIRM_TOKEN = "INSTALL_ACCEPTED_EPOCH2_LIVE_COMPOSITION_V5_CREATE_ONLY"
PLAN_PREFIX = "voidbuye2nativeinstallplan3_"
RENAME_NOREPLACE = 1
MAX_READ_CHUNK = 1024 * 1024
MAX_NODE_BYTES = 512 * 1024 * 1024
READY_STATE = "EPOCH2_LIVE_COMPOSITION_V3_ROOT_ABSENT_READY_FOR_CREATE_ONLY"
GREEN_STATE = "EPOCH2_LIVE_COMPOSITION_V3_PROTECTED_INSTALL_GREEN"

FORBIDDEN_APPLY_ENV = (
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "LD_AUDIT",
    "LD_DEBUG",
    "GLIBC_TUNABLES",
    "PYTHONPATH",
    "PYTHONHOME",
)
CLEAN_GIT_ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/home/zoso",
    "LANG": "C",
    "LC_ALL": "C",
    "GIT_OPTIONAL_LOCKS": "0",
    "GIT_NO_REPLACE_OBJECTS": "1",
    "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
}


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


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def canonical_json(value: Any) -> bytes:
    return (
        json.dumps(
            value,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
        )
        + "\n"
    ).encode("ascii")


def _same_stat(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_mode == b.st_mode
        and a.st_nlink == b.st_nlink
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
    )


def _bounded_failure(exc: BaseException) -> tuple[str, str]:
    if isinstance(exc, OSError):
        return type(exc).__name__, "os_error_" + str(exc.errno)
    if isinstance(exc, InstallError):
        return type(exc).__name__, "install_error"
    return type(exc).__name__, "other_error"


def _direct_repo_bytes(path: pathlib.Path) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise InstallError("repository_file_unavailable:" + path.name) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > 2 * 1024 * 1024
    ):
        raise InstallError("repository_file_metadata_invalid:" + path.name)
    raw = path.read_bytes()
    after = path.lstat()
    if not _same_stat(before, after):
        raise InstallError("repository_file_changed:" + path.name)
    return raw


def accepted_lock() -> dict[str, Any]:
    raw = _direct_repo_bytes(LOCK_PATH)
    if git_blob_sha1(raw) != LOCK_GIT_BLOB_SHA1:
        raise InstallError("accepted_lock_blob_mismatch")
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InstallError("accepted_lock_json_invalid") from exc
    if not isinstance(value, dict):
        raise InstallError("accepted_lock_shape_invalid")

    required = {
        "schema": "void_buy_void_epoch2_live_composition_native_candidate_lock_v5",
        "marker": "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V5",
        "version": 5,
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
        "treasury_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
        "production_host_evidence_authority": False,
        "next_gate": "void_buy_void_epoch2_live_composition_native_protected_install_v3",
        "lock_id": LOCK_ID,
    }
    for key, expected in required.items():
        if value.get(key) != expected:
            raise InstallError("accepted_lock_field_mismatch:" + key)

    report = value.get("candidate_report")
    if not isinstance(report, dict):
        raise InstallError("accepted_lock_candidate_report_missing")
    report_required = {
        "candidate_id": CANDIDATE_ID,
        "native_source_git_blob_sha1": NATIVE_SOURCE_BLOB,
        "runner_source_git_blob_sha1": RUNNER_SOURCE_BLOB,
        "sealed_v2_git_blob_sha1": SEALED_V2_BLOB,
        "native_binary_sha256": NATIVE_SHA256,
        "native_binary_bytes": NATIVE_BYTES,
        "runner_sha256": RUNNER_SHA256,
        "runner_bytes": RUNNER_BYTES,
        "candidate_script_git_blob_sha1":
            "bc1b7575e8a77d98b81252da39b6e2d3c10760d9",
        "candidate_workflow_git_blob_sha1":
            "9a2999cf36c3665109632762317b1aa094baf921",
        "source_proof_git_blob_sha1":
            "3918e59fa7393824f2c98d129dfbead3d3867d99",
        "source_workflow_git_blob_sha1":
            "43e791da6b7513bf945731f888f0590fc99c7773",
        "toolchain_closure_bound": True,
        "static_no_interp": True,
        "hostile_ld_preload_blocked": True,
    }
    for key, expected in report_required.items():
        if report.get(key) != expected:
            raise InstallError("accepted_lock_candidate_field_mismatch:" + key)
    return value


def _normalized_absolute(path: pathlib.Path) -> pathlib.Path:
    raw = str(path)
    if not path.is_absolute() or os.path.normpath(raw) != raw:
        raise InstallError("candidate_path_must_be_normalized_absolute")
    return path


def read_exact_candidate(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
) -> bytes:
    path = _normalized_absolute(path)
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise InstallError("candidate_lstat_failed:" + path.name) from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_nlink != 1
        or visible_before.st_size != expected_bytes
    ):
        raise InstallError("candidate_metadata_invalid:" + path.name)

    try:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    except OSError as exc:
        raise InstallError("candidate_open_failed:" + path.name) from exc
    try:
        opened_before = os.fstat(fd)
        if not _same_stat(visible_before, opened_before):
            raise InstallError("candidate_identity_changed_before_read:" + path.name)
        digest = hashlib.sha256()
        data = bytearray()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("candidate_short_read:" + path.name)
            digest.update(chunk)
            data.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("candidate_grew_during_read:" + path.name)
        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
        ):
            raise InstallError("candidate_identity_changed_during_read:" + path.name)
    finally:
        os.close(fd)
    if digest.hexdigest() != expected_sha256:
        raise InstallError("candidate_sha256_mismatch:" + path.name)
    return bytes(data)


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


def _exists(path: pathlib.Path) -> bool:
    try:
        path.lstat()
        return True
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise InstallError("path_lstat_failed:" + str(path)) from exc


def _file_snapshot(
    path: pathlib.Path,
    *,
    maximum_bytes: int,
    executable: bool,
) -> dict[str, Any]:
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise InstallError("host_file_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_uid != 0
        or visible_before.st_gid != 0
        or visible_before.st_nlink != 1
        or visible_before.st_size < 1
        or visible_before.st_size > maximum_bytes
        or (visible_before.st_mode & 0o022) != 0
        or (visible_before.st_mode & (stat.S_ISUID | stat.S_ISGID)) != 0
        or (executable and (visible_before.st_mode & 0o111) == 0)
    ):
        raise InstallError("host_file_metadata_invalid:" + str(path))
    try:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    except OSError as exc:
        raise InstallError("host_file_open_failed:" + str(path)) from exc
    try:
        opened_before = os.fstat(fd)
        if not _same_stat(visible_before, opened_before):
            raise InstallError("host_file_rebound:" + str(path))
        digest = hashlib.sha256()
        remaining = visible_before.st_size
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("host_file_short_read:" + str(path))
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("host_file_grew:" + str(path))
        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
        ):
            raise InstallError("host_file_changed:" + str(path))
    finally:
        os.close(fd)
    return {
        "path": str(path),
        "dev": visible_after.st_dev,
        "ino": visible_after.st_ino,
        "uid": visible_after.st_uid,
        "gid": visible_after.st_gid,
        "mode": format(stat.S_IMODE(visible_after.st_mode), "04o"),
        "nlink": visible_after.st_nlink,
        "bytes": visible_after.st_size,
        "sha256": digest.hexdigest(),
    }


def node_snapshot() -> dict[str, Any]:
    _trusted_root_directory(pathlib.Path("/"))
    _trusted_root_directory(pathlib.Path("/usr"))
    _trusted_root_directory(pathlib.Path("/usr/bin"))
    return _file_snapshot(
        FIXED_NODE,
        maximum_bytes=MAX_NODE_BYTES,
        executable=True,
    )


def _run_git(args: list[str]) -> str:
    if os.geteuid() == 0:
        command = [
            str(FIXED_SETPRIV),
            "--no-new-privs",
            "--reuid=" + str(RUNTIME_UID),
            "--regid=" + str(RUNTIME_GID),
            "--clear-groups",
            str(FIXED_GIT),
            "-C",
            str(FIXED_CHECKOUT),
            *args,
        ]
    elif os.geteuid() == RUNTIME_UID:
        command = [str(FIXED_GIT), "-C", str(FIXED_CHECKOUT), *args]
    else:
        raise InstallError("checkout_query_uid_invalid")
    try:
        completed = subprocess.run(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
            env=CLEAN_GIT_ENV,
            cwd="/",
            timeout=15,
            check=False,
            close_fds=True,
        )
    except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
        raise InstallError("git_execution_failed") from exc
    if completed.returncode != 0 or completed.stderr != "":
        raise InstallError("git_query_failed:" + args[0])
    return completed.stdout


def checkout_snapshot(expected_head: str) -> dict[str, str]:
    if (
        len(expected_head) != 40
        or any(ch not in "0123456789abcdef" for ch in expected_head)
    ):
        raise InstallError("expected_head_invalid")
    head = _run_git(["rev-parse", "--verify", "HEAD"]).strip()
    branch = _run_git(["branch", "--show-current"]).strip()
    dirty = _run_git(["status", "--porcelain=v1", "--untracked-files=all"])
    if head != expected_head:
        raise InstallError("checkout_head_mismatch")
    if branch != "main":
        raise InstallError("checkout_branch_not_main")
    if dirty != "":
        raise InstallError("checkout_not_clean")

    expected_blobs = {
        LOCK_REL: LOCK_GIT_BLOB_SHA1,
        NATIVE_SOURCE_REL: NATIVE_SOURCE_BLOB,
        RUNNER_SOURCE_REL: RUNNER_SOURCE_BLOB,
        SEALED_V2_REL: SEALED_V2_BLOB,
        QUALIFIER_REL: QUALIFIER_BLOB,
    }
    for relative, expected in expected_blobs.items():
        observed = _run_git(["rev-parse", "HEAD:" + relative]).strip()
        if observed != expected:
            raise InstallError("checkout_blob_mismatch:" + relative)
    return {
        "head": head,
        "branch": branch,
        "lock_blob": LOCK_GIT_BLOB_SHA1,
        "native_source_blob": NATIVE_SOURCE_BLOB,
        "runner_source_blob": RUNNER_SOURCE_BLOB,
        "sealed_v2_blob": SEALED_V2_BLOB,
        "qualifier_blob": QUALIFIER_BLOB,
    }


def build_policy(expected_head: str, node: dict[str, Any]) -> bytes:
    return (
        "schema=" + POLICY_SCHEMA + "\n"
        "expected_head=" + expected_head + "\n"
        "runner_sha256=" + RUNNER_SHA256 + "\n"
        "runner_bytes=" + str(RUNNER_BYTES) + "\n"
        "node_sha256=" + str(node["sha256"]) + "\n"
        "node_bytes=" + str(node["bytes"]) + "\n"
    ).encode("ascii")


def _installed_file_ok(
    dir_fd: int,
    name: str,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_mode: int,
) -> None:
    try:
        before = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    except OSError as exc:
        raise InstallError("installed_file_unavailable:" + name) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_nlink != 1
        or before.st_size != expected_bytes
    ):
        raise InstallError("installed_file_metadata_invalid:" + name)
    fd = os.open(
        name,
        os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW,
        dir_fd=dir_fd,
    )
    try:
        opened_before = os.fstat(fd)
        if not _same_stat(before, opened_before):
            raise InstallError("installed_file_rebound:" + name)
        digest = hashlib.sha256()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("installed_file_short_read:" + name)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("installed_file_grew:" + name)
        opened_after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
        ):
            raise InstallError("installed_file_changed:" + name)
    finally:
        os.close(fd)
    if digest.hexdigest() != expected_sha256:
        raise InstallError("installed_file_sha256_mismatch:" + name)


def _verify_install_root(expected_policy: bytes) -> None:
    _trusted_root_directory(INSTALL_ROOT, exact_mode=0o755)
    try:
        entries = sorted(os.listdir(INSTALL_ROOT))
    except OSError as exc:
        raise InstallError("installed_root_list_failed") from exc
    if entries != sorted((NATIVE_NAME, RUNNER_NAME, POLICY_NAME)):
        raise InstallError("installed_root_entries_invalid")
    root_fd = os.open(
        INSTALL_ROOT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    try:
        _installed_file_ok(
            root_fd,
            NATIVE_NAME,
            expected_bytes=NATIVE_BYTES,
            expected_sha256=NATIVE_SHA256,
            expected_mode=0o555,
        )
        _installed_file_ok(
            root_fd,
            RUNNER_NAME,
            expected_bytes=RUNNER_BYTES,
            expected_sha256=RUNNER_SHA256,
            expected_mode=0o444,
        )
        _installed_file_ok(
            root_fd,
            POLICY_NAME,
            expected_bytes=len(expected_policy),
            expected_sha256=sha256(expected_policy),
            expected_mode=0o444,
        )
    finally:
        os.close(root_fd)


def protected_state(expected_policy: bytes) -> str:
    _trusted_root_directory(pathlib.Path("/"))
    _trusted_root_directory(INSTALL_PARENT)
    if _exists(STAGE_ROOT):
        raise InstallError("staging_root_present")
    if not _exists(INSTALL_ROOT):
        return READY_STATE
    _verify_install_root(expected_policy)
    return GREEN_STATE


def inspect_candidates(
    native: pathlib.Path,
    runner: pathlib.Path,
) -> tuple[bytes, bytes]:
    accepted_lock()
    native_raw = read_exact_candidate(
        native,
        expected_bytes=NATIVE_BYTES,
        expected_sha256=NATIVE_SHA256,
    )
    runner_raw = read_exact_candidate(
        runner,
        expected_bytes=RUNNER_BYTES,
        expected_sha256=RUNNER_SHA256,
    )
    if git_blob_sha1(runner_raw) != RUNNER_SOURCE_BLOB:
        raise InstallError("runner_candidate_git_blob_mismatch")
    return native_raw, runner_raw


def collect_plan(
    native: pathlib.Path,
    runner: pathlib.Path,
    expected_head: str,
) -> dict[str, Any]:
    accepted_lock()
    inspect_candidates(native, runner)
    checkout = checkout_snapshot(expected_head)
    git_tool = _file_snapshot(
        FIXED_GIT,
        maximum_bytes=64 * 1024 * 1024,
        executable=True,
    )
    setpriv_tool = _file_snapshot(
        FIXED_SETPRIV,
        maximum_bytes=64 * 1024 * 1024,
        executable=True,
    )
    node = node_snapshot()
    policy = build_policy(expected_head, node)
    state = protected_state(policy)
    body = {
        "schema": "void_buy_void_epoch2_live_composition_native_install_plan_v2",
        "version": 2,
        "accepted_lock_id": LOCK_ID,
        "candidate_id": CANDIDATE_ID,
        "expected_head": expected_head,
        "native_sha256": NATIVE_SHA256,
        "native_bytes": NATIVE_BYTES,
        "runner_sha256": RUNNER_SHA256,
        "runner_bytes": RUNNER_BYTES,
        "node": node,
        "git_tool": git_tool,
        "setpriv_tool": setpriv_tool,
        "checkout": checkout,
        "policy_sha256": sha256(policy),
        "policy_bytes": len(policy),
        "protected_state": state,
        "create_only": True,
        "atomic_root_publication_required": True,
        "rename_noreplace_required": True,
        "protected_install_authorized": False,
        "live_execution_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False,
        "treasury_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
    }
    plan_id = PLAN_PREFIX + sha256(canonical_json(body))
    return {
        "body": body,
        "plan_id": plan_id,
        "policy": policy,
    }


def emit_operation_authority() -> None:
    print(MARKER)
    print("mode=apply")
    print("authority_boundary=PRE_MUTATION")
    print("filesystem_mutation_possible=true")
    print("filesystem_mutation_performed=false")
    print("candidate_files_opened=false")
    print("protected_root_opened=false")
    print("native_execution=false")
    print("runner_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    try:
        sys.stdout.flush()
    except (OSError, ValueError) as exc:
        raise InstallError("pre_mutation_authority_flush_failed") from exc


def source_plan() -> None:
    accepted_lock()
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("target_root=" + str(INSTALL_ROOT))
    print("staging_root=" + str(STAGE_ROOT))
    print("fixed_node=" + str(FIXED_NODE))
    print("create_only=true")
    print("atomic_root_publication_required=true")
    print("rename_noreplace_required=true")
    print("node_generation_bound_at_plan_apply=true")
    print("expected_main_head_bound_at_plan_apply=true")
    print("truthful_post_publication_failure_receipt_required=true")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement_authorized=false")


def plan(
    native: pathlib.Path,
    runner: pathlib.Path,
    expected_head: str,
) -> None:
    result = collect_plan(native, runner, expected_head)
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("plan_id=" + result["plan_id"])
    print("expected_head=" + expected_head)
    print("protected_state=" + str(body["protected_state"]))
    print("native_candidate_verified=true")
    print("runner_candidate_verified=true")
    print("git_sha256=" + str(body["git_tool"]["sha256"]))
    print("setpriv_sha256=" + str(body["setpriv_tool"]["sha256"]))
    print("node_sha256=" + str(body["node"]["sha256"]))
    print("node_bytes=" + str(body["node"]["bytes"]))
    print("node_dev=" + str(body["node"]["dev"]))
    print("node_ino=" + str(body["node"]["ino"]))
    print("policy_sha256=" + str(body["policy_sha256"]))
    print("policy_bytes=" + str(body["policy_bytes"]))
    print("create_only=true")
    print("atomic_root_publication_required=true")
    print("rename_noreplace_required=true")
    print("filesystem_write=false")
    print("native_execution=false")
    print("runner_execution=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement_authorized=false")
    if body["protected_state"] == GREEN_STATE:
        print("already_installed=true")
        print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_NATIVE_INSTALLED_READ_ONLY_QUALIFICATION")
    else:
        print("already_installed=false")
        print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_NATIVE_CREATE_ONLY_INSTALL")


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
        err = ctypes.get_errno()
        raise InstallError(
            "renameat2_failed:" + source + ":" + target + ":" + str(err)
        )


def _write_all(fd: int, raw: bytes) -> None:
    view = memoryview(raw)
    offset = 0
    while offset < len(view):
        wrote = os.write(fd, view[offset:])
        if wrote <= 0:
            raise InstallError("short_write")
        offset += wrote


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
        _write_all(fd, raw)
        os.fchmod(fd, mode)
        os.fchown(fd, 0, 0)
        os.fsync(fd)
    finally:
        os.close(fd)
    _installed_file_ok(
        dir_fd,
        name,
        expected_bytes=len(raw),
        expected_sha256=expected_sha256,
        expected_mode=mode,
    )


def _cleanup_stage(opt_fd: int) -> bool:
    if not _exists(STAGE_ROOT):
        return True
    try:
        _trusted_root_directory(STAGE_ROOT, exact_mode=0o755)
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
    except (OSError, InstallError):
        return False


def _published_failure(
    reason: str,
    *,
    phase: str,
    parent_fsync_completed: bool | None,
    final_verification_completed: bool | None,
    cause: BaseException,
) -> PublishedInstallError:
    failure_class, failure_reason = _bounded_failure(cause)
    return PublishedInstallError(
        reason,
        phase=phase,
        parent_fsync_completed=parent_fsync_completed,
        final_verification_completed=final_verification_completed,
        original_failure_class=failure_class,
        original_failure_reason=failure_reason,
    )


def _post_publication_checks(
    opt_fd: int,
    *,
    expected_policy: bytes,
    expected_node: dict[str, Any] | None = None,
    expected_checkout: dict[str, str] | None = None,
    expected_head: str | None = None,
    _fsync_fn: Callable[[int], None] = os.fsync,
    _verify_fn: Callable[[bytes], None] | None = None,
) -> None:
    verify_fn = _verify_install_root if _verify_fn is None else _verify_fn
    try:
        _fsync_fn(opt_fd)
    except BaseException as exc:
        raise _published_failure(
            "post_publication_parent_fsync_failed",
            phase="parent_fsync",
            parent_fsync_completed=False,
            final_verification_completed=False,
            cause=exc,
        ) from exc
    try:
        verify_fn(expected_policy)
        if expected_node is not None and node_snapshot() != expected_node:
            raise InstallError("post_publication_node_generation_changed")
        if (
            expected_checkout is not None
            and expected_head is not None
            and checkout_snapshot(expected_head) != expected_checkout
        ):
            raise InstallError("post_publication_checkout_generation_changed")
    except BaseException as exc:
        raise _published_failure(
            "post_publication_final_verification_failed",
            phase="final_verification",
            parent_fsync_completed=True,
            final_verification_completed=False,
            cause=exc,
        ) from exc


def _failure_receipt(exc: BaseException) -> dict[str, str]:
    failure_class, failure_reason = _bounded_failure(exc)
    if isinstance(exc, PublishedInstallError):
        def tri(value: bool | None) -> str:
            if value is None:
                return "unknown"
            return str(value).lower()

        return {
            "protected_install_performed": "true",
            "publication": "true",
            "publication_state": "published_needs_inspection",
            "final_state_verified": "false",
            "publication_failure_phase": exc.phase,
            "parent_fsync_completed": tri(exc.parent_fsync_completed),
            "final_verification_completed": tri(exc.final_verification_completed),
            "original_failure_class": exc.original_failure_class,
            "original_failure_reason": exc.original_failure_reason,
            "install_parent_close_completed": tri(
                exc.install_parent_close_completed
            ),
            "close_failure_class": exc.close_failure_class,
            "close_failure_reason": exc.close_failure_reason,
        }
    return {
        "protected_install_performed": "false",
        "publication": "false",
        "publication_state": "not_published",
        "final_state_verified": "false",
        "publication_failure_phase": "not_published",
        "parent_fsync_completed": "not_applicable",
        "final_verification_completed": "not_applicable",
        "original_failure_class": failure_class,
        "original_failure_reason": failure_reason,
        "install_parent_close_completed": "not_applicable",
        "close_failure_class": "not_applicable",
        "close_failure_reason": "not_applicable",
    }


def _require_secure_apply_context() -> None:
    if sys.flags.isolated != 1:
        raise InstallError("python_isolated_mode_required")
    present = [name for name in FORBIDDEN_APPLY_ENV if name in os.environ]
    if present:
        raise InstallError("forbidden_apply_environment:" + ",".join(present))


def apply(
    native: pathlib.Path,
    runner: pathlib.Path,
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

    native_raw, runner_raw = inspect_candidates(native, runner)
    initial = collect_plan(native, runner, expected_head)
    if initial["plan_id"] != expected_plan_id:
        raise InstallError("expected_plan_id_mismatch")
    body = initial["body"]
    policy = initial["policy"]

    if body["protected_state"] == GREEN_STATE:
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("protected_install_performed=false")
        print("live_execution=false")
        print("credential_access=false")
        print("signing=false")
        print("transaction=false")
        print("funds_movement=false")
        return
    if body["protected_state"] != READY_STATE:
        raise InstallError("apply_state_not_ready")

    opt_fd = os.open(
        INSTALL_PARENT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    stage_created = False
    published = False
    cleanup_green = True
    try:
        if _exists(STAGE_ROOT) or _exists(INSTALL_ROOT):
            raise InstallError("create_only_target_changed_before_apply")

        os.mkdir(STAGE_NAME, 0o755, dir_fd=opt_fd)
        stage_created = True
        stage_fd = os.open(
            STAGE_NAME,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=opt_fd,
        )
        try:
            os.fchown(stage_fd, 0, 0)
            os.fchmod(stage_fd, 0o755)
            _create_file(
                stage_fd,
                NATIVE_NAME,
                native_raw,
                mode=0o555,
                expected_sha256=NATIVE_SHA256,
            )
            _create_file(
                stage_fd,
                RUNNER_NAME,
                runner_raw,
                mode=0o444,
                expected_sha256=RUNNER_SHA256,
            )
            _create_file(
                stage_fd,
                POLICY_NAME,
                policy,
                mode=0o444,
                expected_sha256=sha256(policy),
            )
            os.fsync(stage_fd)
        finally:
            os.close(stage_fd)

        # Bind dynamic host/source facts again immediately before publication.
        if _file_snapshot(
            FIXED_GIT,
            maximum_bytes=64 * 1024 * 1024,
            executable=True,
        ) != body["git_tool"]:
            raise InstallError("git_generation_changed_before_publication")
        if _file_snapshot(
            FIXED_SETPRIV,
            maximum_bytes=64 * 1024 * 1024,
            executable=True,
        ) != body["setpriv_tool"]:
            raise InstallError("setpriv_generation_changed_before_publication")
        if node_snapshot() != body["node"]:
            raise InstallError("node_generation_changed_before_publication")
        if checkout_snapshot(expected_head) != body["checkout"]:
            raise InstallError("checkout_generation_changed_before_publication")
        _trusted_root_directory(STAGE_ROOT, exact_mode=0o755)

        stage_fd = os.open(
            STAGE_ROOT,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        )
        try:
            _installed_file_ok(
                stage_fd,
                NATIVE_NAME,
                expected_bytes=NATIVE_BYTES,
                expected_sha256=NATIVE_SHA256,
                expected_mode=0o555,
            )
            _installed_file_ok(
                stage_fd,
                RUNNER_NAME,
                expected_bytes=RUNNER_BYTES,
                expected_sha256=RUNNER_SHA256,
                expected_mode=0o444,
            )
            _installed_file_ok(
                stage_fd,
                POLICY_NAME,
                expected_bytes=len(policy),
                expected_sha256=sha256(policy),
                expected_mode=0o444,
            )
        finally:
            os.close(stage_fd)

        _renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)
        published = True
        stage_created = False
        _post_publication_checks(
            opt_fd,
            expected_policy=policy,
            expected_node=body["node"],
            expected_checkout=body["checkout"],
            expected_head=expected_head,
        )
    except BaseException as exc:
        if stage_created and not published:
            cleanup_green = _cleanup_stage(opt_fd)
            print("automatic_stage_cleanup_attempted=true")
            print("automatic_stage_cleanup_green=" + str(cleanup_green).lower())
        if published:
            post_failure = (
                exc
                if isinstance(exc, PublishedInstallError)
                else _published_failure(
                    "post_publication_unclassified_failure",
                    phase="post_publication_unknown",
                    parent_fsync_completed=None,
                    final_verification_completed=None,
                    cause=exc,
                )
            )
            try:
                os.close(opt_fd)
                post_failure.install_parent_close_completed = True
            except OSError as close_exc:
                post_failure.install_parent_close_completed = False
                (
                    post_failure.close_failure_class,
                    post_failure.close_failure_reason,
                ) = _bounded_failure(close_exc)
            raise post_failure from exc
        try:
            os.close(opt_fd)
        except OSError as close_exc:
            raise InstallError("install_parent_close_failed") from close_exc
        raise
    else:
        try:
            os.close(opt_fd)
        except OSError as close_exc:
            post_failure = _published_failure(
                "post_publication_close_requires_inspection",
                phase="install_parent_close",
                parent_fsync_completed=True,
                final_verification_completed=True,
                cause=close_exc,
            )
            post_failure.install_parent_close_completed = False
            (
                post_failure.close_failure_class,
                post_failure.close_failure_reason,
            ) = _bounded_failure(close_exc)
            raise post_failure from close_exc

    print(MARKER)
    print("mode=apply")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("plan_id=" + expected_plan_id)
    print("protected_install_performed=true")
    print("publication_state=published_verified")
    print("final_state_verified=true")
    print("atomic_root_publication=true")
    print("create_only=true")
    print("installed_native_sha256=" + NATIVE_SHA256)
    print("installed_native_bytes=" + str(NATIVE_BYTES))
    print("installed_runner_sha256=" + RUNNER_SHA256)
    print("installed_runner_bytes=" + str(RUNNER_BYTES))
    print("installed_policy_sha256=" + sha256(policy))
    print("installed_policy_bytes=" + str(len(policy)))
    print("node_sha256=" + str(body["node"]["sha256"]))
    print("node_bytes=" + str(body["node"]["bytes"]))
    print("live_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("next_action=EPOCH2_V3_NATIVE_INSTALLED_READ_ONLY_QUALIFICATION")


def self_test() -> None:
    lock = accepted_lock()
    assert lock["candidate_accepted"] is True
    assert lock["protected_install_authorized"] is False
    assert lock["live_execution_authorized"] is False
    assert INSTALL_ROOT == pathlib.Path(
        "/opt/void-buy-void-epoch2-live-composition-v3"
    )
    assert NATIVE_TARGET.parent == RUNNER_TARGET.parent == POLICY_TARGET.parent
    assert stat.S_IMODE(0o100555) == 0o555
    sample_node = {
        "sha256": "a" * 64,
        "bytes": 123,
    }
    policy = build_policy("b" * 40, sample_node)
    assert policy == (
        "schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3\n"
        "expected_head=" + "b" * 40 + "\n"
        "runner_sha256=" + RUNNER_SHA256 + "\n"
        "runner_bytes=" + str(RUNNER_BYTES) + "\n"
        "node_sha256=" + "a" * 64 + "\n"
        "node_bytes=123\n"
    ).encode("ascii")
    libc = ctypes.CDLL(None)
    assert getattr(libc, "renameat2", None) is not None

    def injected_fsync(_fd: int) -> None:
        raise OSError(5, "injected")

    try:
        _post_publication_checks(
            -1,
            expected_policy=policy,
            _fsync_fn=injected_fsync,
            _verify_fn=lambda _policy: None,
        )
    except PublishedInstallError as exc:
        receipt = _failure_receipt(exc)
        assert receipt["protected_install_performed"] == "true"
        assert receipt["publication_state"] == "published_needs_inspection"
        assert receipt["publication_failure_phase"] == "parent_fsync"
        assert receipt["parent_fsync_completed"] == "false"
    else:
        raise AssertionError("post_publication_failure_not_classified")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--native", type=pathlib.Path)
    parser.add_argument("--runner", type=pathlib.Path)
    parser.add_argument("--expected-head", default="")
    parser.add_argument("--expected-plan-id", default="")
    parser.add_argument("--confirm", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print(MARKER + "_SELF_TEST_GREEN")
        print("atomic_root_publication_required=true")
        print("rename_noreplace_required=true")
        print("node_generation_bound_at_plan_apply=true")
        print("expected_main_head_bound_at_plan_apply=true")
        print("truthful_post_publication_failure_receipt=true")
        print("pre_mutation_authority_boundary=true")
        print("pre_mutation_authority_flush_required=true")
        return 0
    if args.source_plan:
        source_plan()
        return 0

    if args.native is None or args.runner is None or not args.expected_head:
        raise InstallError("native_runner_expected_head_required")
    if args.plan:
        plan(args.native, args.runner, args.expected_head)
        return 0
    if not args.expected_plan_id:
        raise InstallError("expected_plan_id_required")
    apply(
        args.native,
        args.runner,
        args.expected_head,
        args.expected_plan_id,
        args.confirm,
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PublishedInstallError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        for key, value in _failure_receipt(exc).items():
            print(key + "=" + value)
        print("live_execution=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
    except InstallError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        for key, value in _failure_receipt(exc).items():
            print(key + "=" + value)
        print("live_execution=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
