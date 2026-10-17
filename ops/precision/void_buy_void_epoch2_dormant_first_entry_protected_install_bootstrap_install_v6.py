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
import tempfile
from typing import Any

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6"
)
PLAN_SCHEMA = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_plan_v6"
)
POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6"
)
CONFIRM_TOKEN = (
    "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_BOOTSTRAP_V6_CREATE_ONLY"
)
PLAN_PREFIX = "voidbuye2bootstrapinstall6_"

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
)
LOCK_GIT_BLOB_SHA1 = "f5b03c6b81016edf21f605099e0ef8976f40e107"
LOCK_ID = (
    "voidbuye2dormantbootstraplock3_"
    "5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
)
CANDIDATE_ID = (
    "voidbuye2dormantbootstrapcand3_"
    "13521be924148818f4869bf24e535d2ecd54a27483daca74e17ba05128c96062"
)

MANIFEST_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
)
MANIFEST_GIT_BLOB_SHA1 = "6e0630af72111bd9976dcc38cdcdada1904dd067"
MANIFEST_BYTES = 2382
MANIFEST_SHA256 = (
    "aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"
)

BOOTSTRAP_BYTES = 874_608
BOOTSTRAP_SHA256 = (
    "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
)
BOOTSTRAP_GIT_BLOB_SHA1 = "a91707c3e5803071fc73c3451c9bcb3b774f8b48"

FIXED_CHECKOUT = pathlib.Path("/home/zoso/dev/void-node")
FIXED_GIT = pathlib.Path("/usr/bin/git")
FIXED_PYTHON = pathlib.Path("/usr/bin/python3")
INSTALL_PARENT = pathlib.Path("/opt")
INSTALL_NAME = (
    "void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v6"
)
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
STAGE_NAME = "." + INSTALL_NAME + ".stage"
STAGE_ROOT = INSTALL_PARENT / STAGE_NAME
BIN_DIR = "bin"
BOOTSTRAP_NAME = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v6"
)
MANIFEST_NAME = "source-generation-v3.conf"
POLICY_NAME = "policy-v1.conf"

READY_STATE = "PROTECTED_BOOTSTRAP_V6_ROOT_ABSENT_READY_FOR_CREATE_ONLY"
GREEN_STATE = "PROTECTED_BOOTSTRAP_V6_ROOT_GREEN"

MAX_READ_CHUNK = 1024 * 1024
MAX_PYTHON_BYTES = 512 * 1024 * 1024
MAX_GIT_BYTES = 64 * 1024 * 1024
RENAME_NOREPLACE = 1
HEX40 = re.compile(r"^[0-9a-f]{40}$")

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
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def canonical_json(value: Any) -> bytes:
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


def _trusted_directory(path: pathlib.Path, exact_mode: int | None = None) -> os.stat_result:
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


def _root_ancestry(path: pathlib.Path) -> None:
    real = pathlib.Path(os.path.realpath(path))
    current = pathlib.Path("/")
    _trusted_directory(current)
    for part in real.parent.parts[1:]:
        current = current / part
        _trusted_directory(current)


def _read_exact_path(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_git_blob: str | None,
    expected_mode: int,
    require_root_owner: bool,
) -> tuple[bytes, dict[str, Any]]:
    raw_path = str(path)
    if not path.is_absolute() or os.path.normpath(raw_path) != raw_path:
        raise InstallError("input_path_not_normalized_absolute:" + raw_path)
    try:
        before = path.lstat()
    except OSError as exc:
        raise InstallError("input_unavailable:" + raw_path) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size != expected_bytes
        or stat.S_IMODE(before.st_mode) != expected_mode
    ):
        raise InstallError("input_metadata_invalid:" + raw_path)
    if require_root_owner and (before.st_uid != 0 or before.st_gid != 0):
        raise InstallError("input_owner_invalid:" + raw_path)
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise InstallError("input_rebound:" + raw_path)
        digest = hashlib.sha256()
        data = bytearray()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("input_short_read:" + raw_path)
            data.extend(chunk)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("input_grew:" + raw_path)
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise InstallError("input_changed:" + raw_path)
    finally:
        os.close(fd)
    raw = bytes(data)
    if digest.hexdigest() != expected_sha256:
        raise InstallError("input_sha256_mismatch:" + raw_path)
    if expected_git_blob is not None and git_blob_sha1(raw) != expected_git_blob:
        raise InstallError("input_git_blob_mismatch:" + raw_path)
    return raw, {
        "path": raw_path,
        "dev": before.st_dev,
        "ino": before.st_ino,
        "uid": before.st_uid,
        "gid": before.st_gid,
        "mode": format(stat.S_IMODE(before.st_mode), "04o"),
        "nlink": before.st_nlink,
        "bytes": before.st_size,
        "mtime_ns": before.st_mtime_ns,
        "ctime_ns": before.st_ctime_ns,
        "sha256": expected_sha256,
        "git_blob_sha1": expected_git_blob,
    }


def _tool_snapshot(fixed: pathlib.Path, maximum_bytes: int) -> dict[str, Any]:
    try:
        alias = fixed.lstat()
    except OSError as exc:
        raise InstallError("tool_alias_unavailable:" + str(fixed)) from exc
    if (
        alias.st_uid != 0
        or alias.st_gid != 0
        # Linux symlink permission bits do not govern target access.
        # Keep ownership/type checks here and authenticate the target below.
        or (stat.S_ISREG(alias.st_mode) and (alias.st_mode & 0o022) != 0)
        or (not stat.S_ISREG(alias.st_mode) and not stat.S_ISLNK(alias.st_mode))
    ):
        raise InstallError("tool_alias_invalid:" + str(fixed))
    real = pathlib.Path(os.path.realpath(fixed))
    _root_ancestry(real)
    try:
        before = real.lstat()
    except OSError as exc:
        raise InstallError("tool_target_unavailable:" + str(fixed)) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or (before.st_mode & 0o022) != 0
        or (before.st_mode & 0o111) == 0
        or before.st_nlink < 1
        or before.st_size < 1
        or before.st_size > maximum_bytes
    ):
        raise InstallError("tool_target_invalid:" + str(fixed))
    fd = os.open(real, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise InstallError("tool_target_rebound:" + str(fixed))
        digest = hashlib.sha256()
        remaining = before.st_size
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise InstallError("tool_target_short_read:" + str(fixed))
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise InstallError("tool_target_grew:" + str(fixed))
        after = os.fstat(fd)
        visible = real.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise InstallError("tool_target_changed:" + str(fixed))
    finally:
        os.close(fd)
    if fixed.lstat() != alias or pathlib.Path(os.path.realpath(fixed)) != real:
        raise InstallError("tool_alias_changed:" + str(fixed))
    return {
        "fixed": str(fixed),
        "realpath": str(real),
        "bytes": before.st_size,
        "sha256": digest.hexdigest(),
        "uid": before.st_uid,
        "gid": before.st_gid,
        "mode": format(stat.S_IMODE(before.st_mode), "04o"),
    }


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
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_ALLOW_PROTOCOL": "",
    }


def _git(args: list[str]) -> bytes:
    git_tool = _tool_snapshot(FIXED_GIT, MAX_GIT_BYTES)
    cp = subprocess.run(
        [
            git_tool["realpath"],
            "--no-replace-objects",
            "-C",
            str(FIXED_CHECKOUT),
            "-c",
            "safe.directory=" + str(FIXED_CHECKOUT),
            "-c",
            "core.hooksPath=/dev/null",
            "-c",
            "core.fsmonitor=false",
            "-c",
            "core.attributesFile=/dev/null",
            "-c",
            "core.excludesFile=/dev/null",
            *args,
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=20,
        env=_git_env(),
    )
    if cp.returncode != 0:
        raise InstallError(
            "git_failed:"
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
        lock = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InstallError("accepted_lock_json_invalid") from exc
    required = {
        "schema": "void_buy_void_epoch2_dormant_first_entry_bootstrap_v6_candidate_lock_v1",
        "marker": "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_CANDIDATE_LOCK_V1",
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "candidate_accepted": True,
        "native_binary_identity_accepted": True,
        "source_generation_identity_accepted": True,
        "protected_install_authorized": False,
        "live_execution_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "rpc_call_authorized": False,
        "funds_movement_authorized": False,
        "lock_id": LOCK_ID,
    }
    for key, want in required.items():
        if lock.get(key) != want:
            raise InstallError("accepted_lock_field_mismatch:" + key)
    report = lock.get("candidate_report")
    binary = lock.get("native_binary")
    sg = lock.get("source_generation")
    if not isinstance(report, dict) or not isinstance(binary, dict) or not isinstance(sg, dict):
        raise InstallError("accepted_lock_evidence_missing")
    if report.get("candidate_id") != CANDIDATE_ID:
        raise InstallError("accepted_lock_candidate_id_mismatch")
    if (
        binary.get("bytes") != BOOTSTRAP_BYTES
        or binary.get("sha256") != BOOTSTRAP_SHA256
        or binary.get("distinct_source_fd_builds_byte_identical") is not True
    ):
        raise InstallError("accepted_lock_binary_identity_mismatch")
    if (
        sg.get("manifest_git_blob_sha1") != MANIFEST_GIT_BLOB_SHA1
        or sg.get("manifest_bytes") != MANIFEST_BYTES
        or sg.get("manifest_sha256") != MANIFEST_SHA256
    ):
        raise InstallError("accepted_lock_manifest_identity_mismatch")
    return lock


def build_policy(python: dict[str, Any], git_tool: dict[str, Any]) -> bytes:
    return (
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + str(python["sha256"]) + "\n"
        + "python_bytes=" + str(python["bytes"]) + "\n"
        + "git_sha256=" + str(git_tool["sha256"]) + "\n"
        + "git_bytes=" + str(git_tool["bytes"]) + "\n"
    ).encode("ascii")


def _exists(path: pathlib.Path) -> bool:
    try:
        path.lstat()
        return True
    except FileNotFoundError:
        return False


def _verify_file(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_git_blob: str | None,
    expected_mode: int,
) -> None:
    _read_exact_path(
        path,
        expected_bytes=expected_bytes,
        expected_sha256=expected_sha256,
        expected_git_blob=expected_git_blob,
        expected_mode=expected_mode,
        require_root_owner=True,
    )


def _verify_generation_at(
    root: pathlib.Path,
    policy: bytes,
    manifest: bytes,
) -> None:
    _trusted_directory(INSTALL_PARENT)
    _trusted_directory(root, 0o755)
    entries = sorted(os.listdir(root))
    if entries != sorted((BIN_DIR, MANIFEST_NAME, POLICY_NAME)):
        raise InstallError("installed_root_entries_invalid")
    bin_path = root / BIN_DIR
    _trusted_directory(bin_path, 0o755)
    if sorted(os.listdir(bin_path)) != [BOOTSTRAP_NAME]:
        raise InstallError("installed_bin_entries_invalid")
    _verify_file(
        bin_path / BOOTSTRAP_NAME,
        expected_bytes=BOOTSTRAP_BYTES,
        expected_sha256=BOOTSTRAP_SHA256,
        expected_git_blob=BOOTSTRAP_GIT_BLOB_SHA1,
        expected_mode=0o555,
    )
    _verify_file(
        root / MANIFEST_NAME,
        expected_bytes=MANIFEST_BYTES,
        expected_sha256=MANIFEST_SHA256,
        expected_git_blob=MANIFEST_GIT_BLOB_SHA1,
        expected_mode=0o444,
    )
    _verify_file(
        root / POLICY_NAME,
        expected_bytes=len(policy),
        expected_sha256=sha256(policy),
        expected_git_blob=None,
        expected_mode=0o444,
    )
    if (root / MANIFEST_NAME).read_bytes() != manifest:
        raise InstallError("installed_manifest_bytes_mismatch")
    if (root / POLICY_NAME).read_bytes() != policy:
        raise InstallError("installed_policy_bytes_mismatch")


def _verify_root_generation(policy: bytes, manifest: bytes) -> None:
    _verify_generation_at(INSTALL_ROOT, policy, manifest)


def protected_state(policy: bytes, manifest: bytes) -> str:
    _trusted_directory(pathlib.Path("/"))
    _trusted_directory(INSTALL_PARENT)
    if _exists(STAGE_ROOT):
        raise InstallError("staging_root_present")
    if not _exists(INSTALL_ROOT):
        return READY_STATE
    _verify_root_generation(policy, manifest)
    return GREEN_STATE


def collect_plan(
    bootstrap: pathlib.Path,
    manifest_path: pathlib.Path,
    expected_head: str,
) -> dict[str, Any]:
    lock = accepted_lock(expected_head)
    checkout = checkout_snapshot(expected_head)
    bootstrap_raw, bootstrap_snapshot = _read_exact_path(
        bootstrap,
        expected_bytes=BOOTSTRAP_BYTES,
        expected_sha256=BOOTSTRAP_SHA256,
        expected_git_blob=BOOTSTRAP_GIT_BLOB_SHA1,
        expected_mode=0o555,
        require_root_owner=False,
    )
    manifest_raw, manifest_snapshot = _read_exact_path(
        manifest_path,
        expected_bytes=MANIFEST_BYTES,
        expected_sha256=MANIFEST_SHA256,
        expected_git_blob=MANIFEST_GIT_BLOB_SHA1,
        expected_mode=0o444,
        require_root_owner=False,
    )
    canonical_manifest = _git_object(
        expected_head,
        MANIFEST_REL,
        MANIFEST_GIT_BLOB_SHA1,
    )
    if manifest_raw != canonical_manifest:
        raise InstallError("manifest_input_not_canonical_git_object")
    python = _tool_snapshot(FIXED_PYTHON, MAX_PYTHON_BYTES)
    git_tool = _tool_snapshot(FIXED_GIT, MAX_GIT_BYTES)
    policy = build_policy(python, git_tool)
    state = protected_state(policy, manifest_raw)
    body = {
        "schema": PLAN_SCHEMA,
        "version": 1,
        "lock_id": LOCK_ID,
        "candidate_id": CANDIDATE_ID,
        "expected_head": expected_head,
        "checkout": checkout,
        "python": python,
        "git_tool": git_tool,
        "bootstrap_input": bootstrap_snapshot,
        "manifest_input": manifest_snapshot,
        "bootstrap_sha256": sha256(bootstrap_raw),
        "bootstrap_bytes": len(bootstrap_raw),
        "bootstrap_git_blob_sha1": git_blob_sha1(bootstrap_raw),
        "manifest_sha256": sha256(manifest_raw),
        "manifest_bytes": len(manifest_raw),
        "manifest_git_blob_sha1": git_blob_sha1(manifest_raw),
        "policy_sha256": sha256(policy),
        "policy_bytes": len(policy),
        "install_root": str(INSTALL_ROOT),
        "protected_state": state,
        "create_only": True,
        "rename_noreplace_required": True,
        "bootstrap_execution_authorized": False,
        "inner_installer_execution_authorized": False,
        "service_mutation_authorized": False,
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
        "manifest_raw": manifest_raw,
        "policy": policy,
    }


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


def _write_all(fd: int, raw: bytes) -> None:
    view = memoryview(raw)
    offset = 0
    while offset < len(view):
        wrote = os.write(fd, view[offset:])
        if wrote <= 0:
            raise InstallError("stage_short_write")
        offset += wrote


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
        os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
        0o400,
        dir_fd=parent_fd,
    )
    try:
        os.fchown(fd, 0, 0)
        _write_all(fd, raw)
        os.fchmod(fd, mode)
        os.fsync(fd)
        os.lseek(fd, 0, os.SEEK_SET)
        digest = hashlib.sha256()
        while True:
            chunk = os.read(fd, MAX_READ_CHUNK)
            if not chunk:
                break
            digest.update(chunk)
        if digest.hexdigest() != expected_sha256:
            raise InstallError("stage_file_digest_mismatch:" + name)
    finally:
        os.close(fd)


def _cleanup_stage(opt_fd: int, expected: os.stat_result) -> None:
    stage_fd = os.open(
        STAGE_NAME,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        dir_fd=opt_fd,
    )
    try:
        opened = os.fstat(stage_fd)
        visible = os.stat(
            STAGE_NAME,
            dir_fd=opt_fd,
            follow_symlinks=False,
        )
        if not _same_stat(expected, opened) or not _same_stat(opened, visible):
            raise InstallError("stage_generation_changed_before_cleanup")
        entries = sorted(os.listdir(STAGE_ROOT))
        allowed = {BIN_DIR, MANIFEST_NAME, POLICY_NAME}
        if not set(entries).issubset(allowed):
            raise InstallError("stage_cleanup_unexpected_entry")
        if BIN_DIR in entries:
            bin_fd = os.open(
                BIN_DIR,
                os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                dir_fd=stage_fd,
            )
            try:
                children = sorted(os.listdir(STAGE_ROOT / BIN_DIR))
                if not set(children).issubset({BOOTSTRAP_NAME}):
                    raise InstallError("stage_cleanup_unexpected_bin_entry")
                if BOOTSTRAP_NAME in children:
                    os.unlink(BOOTSTRAP_NAME, dir_fd=bin_fd)
                os.fsync(bin_fd)
            finally:
                os.close(bin_fd)
            os.rmdir(BIN_DIR, dir_fd=stage_fd)
        for name in (MANIFEST_NAME, POLICY_NAME):
            try:
                os.unlink(name, dir_fd=stage_fd)
            except FileNotFoundError:
                pass
        os.fsync(stage_fd)
    finally:
        os.close(stage_fd)
    os.rmdir(STAGE_NAME, dir_fd=opt_fd)
    os.fsync(opt_fd)


def _require_secure_apply_context() -> None:
    if sys.flags.isolated != 1:
        raise InstallError("python_isolated_mode_required")
    present = [name for name in FORBIDDEN_APPLY_ENV if name in os.environ]
    if present:
        raise InstallError("forbidden_apply_environment:" + ",".join(present))


def _bindings_snapshot(expected_head: str) -> dict[str, Any]:
    return {
        "checkout": checkout_snapshot(expected_head),
        "lock_id": accepted_lock(expected_head)["lock_id"],
        "python": _tool_snapshot(FIXED_PYTHON, MAX_PYTHON_BYTES),
        "git_tool": _tool_snapshot(FIXED_GIT, MAX_GIT_BYTES),
    }


def emit_operation_authority() -> None:
    print(MARKER)
    print("mode=apply")
    print("authority_boundary=PRE_MUTATION")
    print("filesystem_mutation_possible=true")
    print("filesystem_mutation_performed_at_pre_mutation_boundary=false")
    print("create_only=true")
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("service_mutation=false")
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
    bootstrap: pathlib.Path,
    manifest_path: pathlib.Path,
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
    initial = collect_plan(bootstrap, manifest_path, expected_head)
    if initial["plan_id"] != expected_plan_id:
        raise InstallError("expected_plan_id_mismatch")
    body = initial["body"]
    if body["protected_state"] == GREEN_STATE:
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("protected_install_performed=false")
        print("bootstrap_execution=false")
        print("inner_installer_execution=false")
        print("credential_access=false")
        print("transaction=false")
        print("funds_movement=false")
        return
    if body["protected_state"] != READY_STATE:
        raise InstallError("apply_state_not_ready")

    bootstrap_raw = initial["bootstrap_raw"]
    manifest_raw = initial["manifest_raw"]
    policy = initial["policy"]
    before_bindings = _bindings_snapshot(expected_head)
    opt_fd = os.open(
        INSTALL_PARENT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    stage_created = False
    stage_identity: os.stat_result | None = None
    published = False
    try:
        if _exists(STAGE_ROOT) or _exists(INSTALL_ROOT):
            raise InstallError("create_only_target_or_stage_present")
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
            stage_identity = os.fstat(stage_fd)
            os.mkdir(BIN_DIR, 0o755, dir_fd=stage_fd)
            bin_fd = os.open(
                BIN_DIR,
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
                MANIFEST_NAME,
                manifest_raw,
                mode=0o444,
                expected_sha256=MANIFEST_SHA256,
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

        # Verify the staged tree using the same exact layout contract as final.
        _verify_generation_at(STAGE_ROOT, policy, manifest_raw)

        after_bindings = _bindings_snapshot(expected_head)
        if after_bindings != before_bindings:
            raise InstallError("plan_binding_changed_before_publication")

        # Revalidate candidate paths themselves immediately before publication.
        b2, _ = _read_exact_path(
            bootstrap,
            expected_bytes=BOOTSTRAP_BYTES,
            expected_sha256=BOOTSTRAP_SHA256,
            expected_git_blob=BOOTSTRAP_GIT_BLOB_SHA1,
            expected_mode=0o555,
            require_root_owner=False,
        )
        m2, _ = _read_exact_path(
            manifest_path,
            expected_bytes=MANIFEST_BYTES,
            expected_sha256=MANIFEST_SHA256,
            expected_git_blob=MANIFEST_GIT_BLOB_SHA1,
            expected_mode=0o444,
            require_root_owner=False,
        )
        if b2 != bootstrap_raw or m2 != manifest_raw:
            raise InstallError("candidate_generation_changed_before_publication")

        _renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)
        stage_created = False
        published = True
        os.fsync(opt_fd)
        _verify_root_generation(policy, manifest_raw)
        if _bindings_snapshot(expected_head) != before_bindings:
            raise PublishedInstallError("post_publication_binding_changed")
    except BaseException as exc:
        if published:
            raise PublishedInstallError(
                "published_needs_inspection:"
                + exc.__class__.__name__
                + ":"
                + str(exc)
            ) from exc
        if stage_created:
            if stage_identity is None:
                raise InstallError("stage_identity_missing_during_cleanup") from exc
            try:
                _cleanup_stage(opt_fd, stage_identity)
            except BaseException as cleanup_exc:
                raise InstallError(
                    "prepublication_failure_and_stage_cleanup_failed:"
                    + exc.__class__.__name__
                    + ":"
                    + str(exc)
                    + ":cleanup:"
                    + cleanup_exc.__class__.__name__
                    + ":"
                    + str(cleanup_exc)
                ) from exc
        raise
    finally:
        os.close(opt_fd)

    print(MARKER)
    print("mode=apply")
    print("status=GREEN")
    print("expected_head=" + expected_head)
    print("plan_id=" + expected_plan_id)
    print("protected_install_performed=true")
    print("publication_state=rename_noreplace_verified")
    print("final_state_verified=true")
    print("bootstrap_sha256=" + BOOTSTRAP_SHA256)
    print("manifest_sha256=" + MANIFEST_SHA256)
    print("policy_sha256=" + sha256(policy))
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("service_mutation=false")
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
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_BOOTSTRAP_V6_INSTALLED_READ_ONLY_QUALIFICATION"
    )


def plan(
    bootstrap: pathlib.Path,
    manifest_path: pathlib.Path,
    expected_head: str,
) -> None:
    result = collect_plan(bootstrap, manifest_path, expected_head)
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("filesystem_write=false")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("expected_head=" + expected_head)
    print("plan_id=" + result["plan_id"])
    print("protected_state=" + str(body["protected_state"]))
    print("bootstrap_sha256=" + BOOTSTRAP_SHA256)
    print("bootstrap_bytes=" + str(BOOTSTRAP_BYTES))
    print("manifest_sha256=" + MANIFEST_SHA256)
    print("manifest_bytes=" + str(MANIFEST_BYTES))
    print("policy_sha256=" + str(body["policy_sha256"]))
    print("policy_bytes=" + str(body["policy_bytes"]))
    print("python_sha256=" + str(body["python"]["sha256"]))
    print("python_bytes=" + str(body["python"]["bytes"]))
    print("git_sha256=" + str(body["git_tool"]["sha256"]))
    print("git_bytes=" + str(body["git_tool"]["bytes"]))
    print("create_only=true")
    print("rename_noreplace_required=true")
    print("bootstrap_execution_authorized=false")
    print("inner_installer_execution_authorized=false")
    print("service_mutation_authorized=false")
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
            "PROTECTED_BOOTSTRAP_V6_INSTALLED_READ_ONLY_QUALIFICATION"
        )
    else:
        print("already_installed=false")
        print(
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
            "PROTECTED_BOOTSTRAP_V6_CREATE_ONLY_INSTALL"
        )


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("bootstrap_sha256=" + BOOTSTRAP_SHA256)
    print("manifest_sha256=" + MANIFEST_SHA256)
    print("policy_schema=" + POLICY_SCHEMA)
    print("install_root=" + str(INSTALL_ROOT))
    print("create_only=true")
    print("rename_noreplace_required=true")
    print("python_and_git_host_policy_required=true")
    print("bootstrap_execution_authorized=false")
    print("inner_installer_execution_authorized=false")
    print("service_mutation_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("funds_movement_authorized=false")


def self_test() -> None:
    assert LOCK_ID.startswith("voidbuye2dormantbootstraplock3_")
    assert CANDIDATE_ID.startswith("voidbuye2dormantbootstrapcand3_")
    assert BOOTSTRAP_BYTES == 874_608
    assert MANIFEST_BYTES == 2382
    policy = build_policy(
        {"sha256": "1" * 64, "bytes": 123},
        {"sha256": "2" * 64, "bytes": 456},
    )
    assert policy == (
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + "1" * 64 + "\n"
        + "python_bytes=123\n"
        + "git_sha256=" + "2" * 64 + "\n"
        + "git_bytes=456\n"
    ).encode("ascii")
    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-v6-install-selftest-") as td:
        parent = pathlib.Path(td)
        (parent / "stage").mkdir()
        fd = os.open(parent, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
        try:
            _renameat2(fd, "stage", "final", RENAME_NOREPLACE)
            assert (parent / "final").is_dir()
            assert not (parent / "stage").exists()
        finally:
            os.close(fd)
    assert _git_env()["GIT_NO_LAZY_FETCH"] == "1"
    assert _git_env()["GIT_ALLOW_PROTOCOL"] == ""
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_bootstrap_v6_lock_bound=true")
    print("accepted_bootstrap_v6_binary_bound=true")
    print("source_generation_v3_manifest_bound=true")
    print("python_and_git_host_policy_bound=true")
    print("create_only_publication=true")
    print("rename_noreplace_exercised=true")
    print("post_publication_rollback=false")
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("credential_access=false")
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
    parser.add_argument("--bootstrap")
    parser.add_argument("--manifest")
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
    if not args.bootstrap or not args.manifest or not args.expected_head:
        raise InstallError("bootstrap_manifest_expected_head_required")
    bootstrap = pathlib.Path(args.bootstrap)
    manifest = pathlib.Path(args.manifest)
    if args.plan:
        plan(bootstrap, manifest, args.expected_head)
        return 0
    if not args.expected_plan_id:
        raise InstallError("expected_plan_id_required")
    apply(
        bootstrap,
        manifest,
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
        print("publication_state=published_needs_inspection")
        print("post_publication_rollback=false")
        print("bootstrap_execution=false")
        print("inner_installer_execution=false")
        print("credential_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("funds_movement=false")
        raise SystemExit(2)
    except InstallError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("bootstrap_execution=false")
        print("inner_installer_execution=false")
        print("credential_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("funds_movement=false")
        raise SystemExit(2)
