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
import tempfile
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V2"
CONFIRM_TOKEN = "INSTALL_EPOCH2_DORMANT_BINDER_NATIVE_V2"
PLAN_PREFIX = "voidbuye2dormantbinderinstall2_"

LOCK_REL = "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
LOCK_PATH = ROOT / LOCK_REL
LOCK_GIT_BLOB_SHA1 = "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1"
LOCK_ID = "voidbuye2dormantbinderlock3_a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a"
CANDIDATE_ID = "voidbuye2dormantbindercand2_8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"

NATIVE_SHA256 = "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
NATIVE_BYTES = 726_976

BINDER_REL = "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
BINDER_GIT_BLOB_SHA1 = "9c29eb4716077e459b9154f39d0f30cf2e56729f"
BINDER_SHA256 = "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e"
BINDER_BYTES = 39_391

INSTALL_PARENT = pathlib.Path("/opt")
INSTALL_NAME = "void-buy-void-epoch2-dormant-v3r-binding-v2"
STAGE_NAME = ".void-buy-void-epoch2-dormant-v3r-binding-v2.stage"
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
STAGE_ROOT = INSTALL_PARENT / STAGE_NAME

NATIVE_NAME = "void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2"
BINDER_NAME = "void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"

FIXED_GIT = pathlib.Path("/usr/bin/git")
MAX_GIT_OUTPUT = 4 * 1024 * 1024
MAX_READ_CHUNK = 1024 * 1024
RENAME_NOREPLACE = 1

READY_STATE = "EPOCH2_DORMANT_BINDER_V2_READY_FOR_CREATE_ONLY_INSTALL"
GREEN_STATE = "EPOCH2_DORMANT_BINDER_V2_PROTECTED_INSTALL_GREEN"

FORBIDDEN_APPLY_ENV = (
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "PYTHONPATH",
    "PYTHONHOME",
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_INDEX_FILE",
)


class InstallError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def canonical(value: Any) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def _same_stat(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_mode == b.st_mode
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_nlink == b.st_nlink
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
    )


def _run_git(args: list[str], *, maximum: int = MAX_GIT_OUTPUT) -> bytes:
    env = {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_COUNT": "0",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_ASKPASS": "/bin/false",
    }
    try:
        cp = subprocess.run(
            [str(FIXED_GIT), "-C", str(ROOT), *args],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            timeout=20,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise InstallError("git_execution_failed") from exc
    if cp.returncode != 0:
        raise InstallError("git_command_failed:" + args[0])
    if cp.stderr:
        raise InstallError("git_unexpected_stderr:" + args[0])
    if len(cp.stdout) > maximum:
        raise InstallError("git_output_too_large:" + args[0])
    return cp.stdout


def _git_text(args: list[str]) -> str:
    try:
        return _run_git(args).decode("ascii").strip()
    except UnicodeError as exc:
        raise InstallError("git_output_not_ascii:" + args[0]) from exc


def checkout_snapshot(expected_head: str) -> dict[str, str]:
    if len(expected_head) != 40 or any(c not in "0123456789abcdef" for c in expected_head):
        raise InstallError("expected_head_invalid")
    head = _git_text(["rev-parse", "--verify", "HEAD^{commit}"])
    tree = _git_text(["rev-parse", "--verify", "HEAD^{tree}"])
    branch = _git_text(["symbolic-ref", "--short", "-q", "HEAD"])
    status = _git_text(["status", "--porcelain=v1", "--untracked-files=all"])
    top = _git_text(["rev-parse", "--show-toplevel"])
    if pathlib.Path(top).resolve() != ROOT.resolve():
        raise InstallError("checkout_root_invalid")
    if head != expected_head:
        raise InstallError("checkout_head_mismatch")
    if branch != "main":
        raise InstallError("checkout_branch_not_main")
    if status != "":
        raise InstallError("checkout_not_clean")
    if len(tree) != 40 or any(c not in "0123456789abcdef" for c in tree):
        raise InstallError("checkout_tree_invalid")
    return {"head": head, "tree": tree, "branch": branch}


def direct_file(path: pathlib.Path, maximum: int, label: str) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise InstallError(label + "_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise InstallError(label + "_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise InstallError(label + "_rebound")
        data = bytearray()
        remaining = maximum + 1
        while remaining > 0:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                break
            data.extend(chunk)
            remaining -= len(chunk)
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise InstallError(label + "_changed")
    finally:
        os.close(fd)
    if len(data) != before.st_size:
        raise InstallError(label + "_short_read")
    return bytes(data)


def accepted_lock() -> dict[str, Any]:
    raw = direct_file(LOCK_PATH, 128 * 1024, "accepted_lock")
    if git_blob_sha1(raw) != LOCK_GIT_BLOB_SHA1:
        raise InstallError("accepted_lock_blob_mismatch")
    try:
        value = json.loads(raw)
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise InstallError("accepted_lock_json_invalid") from exc
    required = {
        "lock_id": LOCK_ID,
        "candidate_id": CANDIDATE_ID,
        "candidate_accepted": True,
        "native_binary_identity_accepted": True,
        "binder_source_identity_bound": True,
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
        "next_gate": "void_buy_void_epoch2_dormant_binder_native_protected_install_v2",
    }
    for key, want in required.items():
        if value.get(key) != want:
            raise InstallError("accepted_lock_field_invalid:" + key)
    report = value.get("candidate_report")
    if (
        not isinstance(report, dict)
        or report.get("native_binary_sha256") != NATIVE_SHA256
        or report.get("native_binary_bytes") != NATIVE_BYTES
        or report.get("binder_source_git_blob_sha1") != BINDER_GIT_BLOB_SHA1
        or report.get("binder_sha256") != BINDER_SHA256
        or report.get("candidate_id") != CANDIDATE_ID
        or report.get("verified_helper_execution_bound") is not True
        or report.get("sealed_source_snapshot") is not True
        or report.get("toolchain_revalidated_after_build") is not True
    ):
        raise InstallError("accepted_lock_candidate_report_invalid")
    return value


def binder_bytes(expected_head: str) -> bytes:
    blob = _git_text(["rev-parse", "--verify", expected_head + ":" + BINDER_REL])
    if blob != BINDER_GIT_BLOB_SHA1:
        raise InstallError("binder_source_blob_mismatch")
    raw = _run_git(["show", expected_head + ":" + BINDER_REL], maximum=128 * 1024)
    if (
        len(raw) != BINDER_BYTES
        or sha256(raw) != BINDER_SHA256
        or git_blob_sha1(raw) != BINDER_GIT_BLOB_SHA1
    ):
        raise InstallError("binder_source_identity_mismatch")
    return raw


def native_candidate(path: pathlib.Path) -> bytes:
    raw = direct_file(path, 2 * 1024 * 1024, "native_candidate")
    if len(raw) != NATIVE_BYTES or sha256(raw) != NATIVE_SHA256:
        raise InstallError("native_candidate_identity_mismatch")
    if not raw.startswith(b"\x7fELF"):
        raise InstallError("native_candidate_not_elf")
    return raw


def _trusted_directory(path: pathlib.Path, exact_mode: int | None = None) -> os.stat_result:
    try:
        st = path.lstat()
    except OSError as exc:
        raise InstallError("directory_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or st.st_nlink < 2
        or (stat.S_IMODE(st.st_mode) & 0o022) != 0
    ):
        raise InstallError("directory_untrusted:" + str(path))
    if exact_mode is not None and stat.S_IMODE(st.st_mode) != exact_mode:
        raise InstallError("directory_mode_invalid:" + str(path))
    return st


def _hash_installed(path: pathlib.Path, size: int, digest: str, mode: int) -> None:
    try:
        before = path.lstat()
    except OSError as exc:
        raise InstallError("installed_file_missing:" + path.name) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != mode
        or before.st_size != size
    ):
        raise InstallError("installed_file_metadata_invalid:" + path.name)
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise InstallError("installed_file_rebound:" + path.name)
        h = hashlib.sha256()
        remaining = size
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("installed_file_short_read:" + path.name)
            h.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("installed_file_grew:" + path.name)
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise InstallError("installed_file_changed:" + path.name)
    finally:
        os.close(fd)
    if h.hexdigest() != digest:
        raise InstallError("installed_file_sha256_mismatch:" + path.name)


def verify_root(path: pathlib.Path) -> None:
    _trusted_directory(path, exact_mode=0o755)
    try:
        names = sorted(os.listdir(path))
    except OSError as exc:
        raise InstallError("installed_root_list_failed") from exc
    if names != sorted([NATIVE_NAME, BINDER_NAME]):
        raise InstallError("installed_root_entries_invalid")
    _hash_installed(path / NATIVE_NAME, NATIVE_BYTES, NATIVE_SHA256, 0o555)
    _hash_installed(path / BINDER_NAME, BINDER_BYTES, BINDER_SHA256, 0o444)


def protected_state() -> str:
    _trusted_directory(pathlib.Path("/"))
    _trusted_directory(INSTALL_PARENT)
    stage = STAGE_ROOT.exists()
    installed = INSTALL_ROOT.exists()
    if stage:
        raise InstallError("install_stage_present")
    if installed:
        verify_root(INSTALL_ROOT)
        return GREEN_STATE
    return READY_STATE


def collect_plan(native: pathlib.Path, expected_head: str) -> dict[str, Any]:
    lock = accepted_lock()
    checkout = checkout_snapshot(expected_head)
    native_raw = native_candidate(native)
    binder_raw = binder_bytes(expected_head)
    state = protected_state()
    body = {
        "schema": "void_buy_void_epoch2_dormant_binder_native_protected_install_plan_v2",
        "version": 2,
        "expected_head": expected_head,
        "checkout": checkout,
        "lock_id": lock["lock_id"],
        "candidate_id": CANDIDATE_ID,
        "native_sha256": sha256(native_raw),
        "native_bytes": len(native_raw),
        "binder_git_blob_sha1": git_blob_sha1(binder_raw),
        "binder_sha256": sha256(binder_raw),
        "binder_bytes": len(binder_raw),
        "install_root": str(INSTALL_ROOT),
        "stage_root": str(STAGE_ROOT),
        "protected_state": state,
        "create_only": True,
        "atomic_publish_required": True,
        "automatic_cleanup_or_rollback_required": True,
        "filesystem_write_authorized": False,
        "service_mutation_authorized": False,
        "systemd_mutation_authorized": False,
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
    }
    return {
        "body": body,
        "plan_id": PLAN_PREFIX + sha256(canonical(body)),
        "native_raw": native_raw,
        "binder_raw": binder_raw,
    }


def source_plan() -> None:
    accepted_lock()
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("native_sha256=" + NATIVE_SHA256)
    print("native_bytes=" + str(NATIVE_BYTES))
    print("binder_git_blob_sha1=" + BINDER_GIT_BLOB_SHA1)
    print("binder_sha256=" + BINDER_SHA256)
    print("binder_bytes=" + str(BINDER_BYTES))
    print("install_root=" + str(INSTALL_ROOT))
    print("create_only=true")
    print("atomic_publish_required=true")
    print("automatic_cleanup_or_rollback_required=true")
    print("protected_install_authorized=false")
    print("service_mutation_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("funds_movement_authorized=false")
    print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_BINDER_PROTECTED_INSTALL_V2")


def plan(native: pathlib.Path, expected_head: str) -> None:
    result = collect_plan(native, expected_head)
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("plan_id=" + result["plan_id"])
    print("expected_head=" + expected_head)
    print("protected_state=" + str(body["protected_state"]))
    print("lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("native_candidate_verified=true")
    print("binder_source_verified=true")
    print("native_sha256=" + NATIVE_SHA256)
    print("native_bytes=" + str(NATIVE_BYTES))
    print("binder_sha256=" + BINDER_SHA256)
    print("binder_bytes=" + str(BINDER_BYTES))
    print("create_only=true")
    print("atomic_publish_required=true")
    print("automatic_cleanup_or_rollback_required=true")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("live_execution=false")
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
    if body["protected_state"] == GREEN_STATE:
        print("already_installed=true")
        print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_BINDER_INSTALLED_QUALIFICATION_V1")
    else:
        print("already_installed=false")
        print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_BINDER_PROTECTED_INSTALL_V2")


def _renameat2(
    old_dir_fd: int,
    old_name: str,
    new_dir_fd: int,
    new_name: str,
    flags: int,
) -> None:
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
        old_dir_fd,
        old_name.encode(),
        new_dir_fd,
        new_name.encode(),
        flags,
    )
    if rc != 0:
        raise InstallError("renameat2_failed:" + str(ctypes.get_errno()))


def _create_file(dir_fd: int, name: str, raw: bytes, mode: int, digest: str) -> None:
    fd: int | None = None
    try:
        fd = os.open(
            name,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
            0o400,
            dir_fd=dir_fd,
        )
        os.fchown(fd, 0, 0)
        offset = 0
        while offset < len(raw):
            wrote = os.write(fd, raw[offset:])
            if wrote <= 0:
                raise InstallError("create_file_short_write:" + name)
            offset += wrote
        os.fchmod(fd, mode)
        os.fsync(fd)
    finally:
        if fd is not None:
            os.close(fd)
    path = STAGE_ROOT / name
    _hash_installed(path, len(raw), digest, mode)


def _cleanup_stage() -> bool:
    try:
        if not STAGE_ROOT.exists():
            return True
        for name in (NATIVE_NAME, BINDER_NAME):
            path = STAGE_ROOT / name
            if path.exists():
                if name == NATIVE_NAME:
                    _hash_installed(path, NATIVE_BYTES, NATIVE_SHA256, 0o555)
                else:
                    _hash_installed(path, BINDER_BYTES, BINDER_SHA256, 0o444)
                os.unlink(path)
        os.rmdir(STAGE_ROOT)
        return not STAGE_ROOT.exists()
    except BaseException:
        return False


def _require_apply_context() -> None:
    if os.geteuid() != 0:
        raise InstallError("root_required_for_apply")
    if sys.flags.isolated != 1:
        raise InstallError("python_isolated_mode_required")
    present = [name for name in FORBIDDEN_APPLY_ENV if name in os.environ]
    if present:
        raise InstallError("forbidden_apply_environment:" + ",".join(present))


def emit_authority() -> None:
    print(MARKER)
    print("mode=apply")
    print("authority_boundary=PRE_MUTATION")
    print("filesystem_mutation_possible=true")
    print("filesystem_mutation_performed_at_pre_mutation_boundary=false")
    print("create_only=true")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("live_execution=false")
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
    native: pathlib.Path,
    expected_head: str,
    expected_plan_id: str,
    confirm: str,
) -> None:
    emit_authority()
    if confirm != CONFIRM_TOKEN:
        raise InstallError("explicit_install_confirmation_required")
    _require_apply_context()

    result = collect_plan(native, expected_head)
    if result["plan_id"] != expected_plan_id:
        raise InstallError("expected_plan_id_mismatch")
    body = result["body"]
    if body["protected_state"] == GREEN_STATE:
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("protected_install_performed=false")
        print("service_mutation=false")
        print("live_execution=false")
        print("credential_access=false")
        print("transaction=false")
        print("funds_movement=false")
        return
    if body["protected_state"] != READY_STATE:
        raise InstallError("apply_state_not_ready")

    parent_fd = os.open(
        INSTALL_PARENT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    stage_created = False
    published = False
    rollback_attempted = False
    rollback_green = False
    failure_phase = "before_stage"
    try:
        if STAGE_ROOT.exists() or INSTALL_ROOT.exists():
            raise InstallError("install_path_became_occupied")

        failure_phase = "stage_create"
        os.mkdir(STAGE_NAME, 0o755, dir_fd=parent_fd)
        stage_created = True
        stage_fd = os.open(
            STAGE_NAME,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=parent_fd,
        )
        try:
            os.fchown(stage_fd, 0, 0)
            os.fchmod(stage_fd, 0o755)
            failure_phase = "native_create"
            _create_file(
                stage_fd,
                NATIVE_NAME,
                result["native_raw"],
                0o555,
                NATIVE_SHA256,
            )
            failure_phase = "binder_create"
            _create_file(
                stage_fd,
                BINDER_NAME,
                result["binder_raw"],
                0o444,
                BINDER_SHA256,
            )
            os.fsync(stage_fd)
        finally:
            os.close(stage_fd)

        failure_phase = "stage_verify"
        verify_root(STAGE_ROOT)
        if checkout_snapshot(expected_head) != body["checkout"]:
            raise InstallError("checkout_changed_before_publish")
        if native_candidate(native) != result["native_raw"]:
            raise InstallError("native_candidate_changed_before_publish")
        if binder_bytes(expected_head) != result["binder_raw"]:
            raise InstallError("binder_source_changed_before_publish")

        failure_phase = "publish"
        _renameat2(
            parent_fd,
            STAGE_NAME,
            parent_fd,
            INSTALL_NAME,
            RENAME_NOREPLACE,
        )
        stage_created = False
        published = True
        os.fsync(parent_fd)

        failure_phase = "post_publish_verify"
        verify_root(INSTALL_ROOT)
        if checkout_snapshot(expected_head) != body["checkout"]:
            raise InstallError("checkout_changed_after_publish")
        if protected_state() != GREEN_STATE:
            raise InstallError("post_publish_state_not_green")
    except BaseException as exc:
        if published:
            rollback_attempted = True
            try:
                if STAGE_ROOT.exists():
                    raise InstallError("rollback_stage_already_present")
                _renameat2(
                    parent_fd,
                    INSTALL_NAME,
                    parent_fd,
                    STAGE_NAME,
                    RENAME_NOREPLACE,
                )
                published = False
                stage_created = True
                os.fsync(parent_fd)
                verify_root(STAGE_ROOT)
                rollback_green = _cleanup_stage()
                stage_created = False if rollback_green else True
            except BaseException:
                rollback_green = False
        elif stage_created:
            rollback_attempted = True
            rollback_green = _cleanup_stage()
            stage_created = False if rollback_green else True

        final_state = "UNKNOWN"
        try:
            if not STAGE_ROOT.exists() and not INSTALL_ROOT.exists():
                final_state = READY_STATE
            elif not STAGE_ROOT.exists() and INSTALL_ROOT.exists():
                verify_root(INSTALL_ROOT)
                final_state = GREEN_STATE
        except BaseException:
            final_state = "UNKNOWN"

        print(MARKER)
        print("mode=FINAL_FAILURE_RECEIPT")
        print("status=HOLD")
        print("reason=" + str(exc))
        print("failure_phase=" + failure_phase)
        print("publication_performed=" + str(published or failure_phase == "post_publish_verify").lower())
        print("rollback_attempted=" + str(rollback_attempted).lower())
        print("rollback_green=" + str(rollback_green).lower())
        print("final_protected_state=" + final_state)
        print("service_mutation=false")
        print("live_execution=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("funds_movement=false")
        raise
    finally:
        os.close(parent_fd)

    print(MARKER)
    print("mode=apply")
    print("status=GREEN")
    print("plan_id=" + expected_plan_id)
    print("expected_head=" + expected_head)
    print("protected_install_performed=true")
    print("publication_state=create_only_atomic_publish_verified")
    print("final_state_verified=true")
    print("protected_state=" + GREEN_STATE)
    print("lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("installed_native_sha256=" + NATIVE_SHA256)
    print("installed_native_bytes=" + str(NATIVE_BYTES))
    print("installed_binder_sha256=" + BINDER_SHA256)
    print("installed_binder_bytes=" + str(BINDER_BYTES))
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("live_execution=false")
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
    print("next_action=EPOCH2_DORMANT_BINDER_INSTALLED_READ_ONLY_QUALIFICATION_V1")


def self_test() -> None:
    accepted_lock()
    assert INSTALL_ROOT == pathlib.Path("/opt/void-buy-void-epoch2-dormant-v3r-binding-v2")
    assert NATIVE_BYTES == 726_976
    assert BINDER_BYTES == 39_391
    assert len(NATIVE_SHA256) == 64
    assert len(BINDER_SHA256) == 64
    assert len(BINDER_GIT_BLOB_SHA1) == 40

    with tempfile.TemporaryDirectory(prefix="void-e2-dormant-install-v2-") as td:
        root = pathlib.Path(td)
        old = root / "old"
        new = root / "new"
        old.write_text("a", encoding="ascii")
        fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
        try:
            _renameat2(fd, "old", fd, "new", RENAME_NOREPLACE)
            assert not old.exists()
            assert new.read_text(encoding="ascii") == "a"
        finally:
            os.close(fd)

    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_lock_bound=true")
    print("candidate_identity_bound=true")
    print("native_identity_bound=true")
    print("binder_identity_bound=true")
    print("create_only=true")
    print("renameat2_noreplace_exercised=true")
    print("automatic_cleanup_or_rollback_required=true")
    print("failure_truth_final_receipt_required=true")
    print("service_mutation=false")
    print("live_execution=false")
    print("credential_access=false")
    print("transaction=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
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
    if not args.native:
        raise InstallError("native_candidate_path_required")
    if not args.expected_head:
        raise InstallError("expected_head_required")
    native = pathlib.Path(args.native)
    if args.plan:
        plan(native, args.expected_head)
        return 0
    if not args.expected_plan_id:
        raise InstallError("expected_plan_id_required")
    apply(native, args.expected_head, args.expected_plan_id, args.confirm)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except InstallError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("live_execution=false")
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
