#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import stat
import subprocess
from typing import Any

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_"
    "BOOTSTRAP_INSTALLED_QUALIFICATION_V2R"
)

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-lock-v3.json"
)
LOCK_GIT_BLOB_SHA1 = "64c9a42ca1108a9e8f88218c34d53e50668c653e"
LOCK_ID = (
    "voidbuye2bootstraplock3_"
    "690d119c90f5c8c20f429fcc14919b62691f9a1b3bfe2226476267ede993197f"
)
CANDIDATE_MERGE = "344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b"
CANDIDATE_TREE = "4085987d856fa303b8bc81087e3b5a207bc8964f"
CANDIDATE_ID = (
    "voidbuye2bootstrapcand2_"
    "b71b8757fa64fc36c2df0e95e3812c00eccef114b71e0b854c34ddfd62285def"
)

BOOTSTRAP_BYTES = 731_072
BOOTSTRAP_SHA256 = (
    "37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276"
)
BOOTSTRAP_GIT_BLOB_SHA1 = "45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62"

PROTECTED_INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_protected_install_v1.py"
)
PROTECTED_INSTALLER_BLOB = "383b84e71b371de65579e4113469e86a59b807ab"
PROTECTED_INSTALLER_BYTES = 42_054
PROTECTED_INSTALLER_SHA256 = (
    "e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef"
)

FIXED_CHECKOUT = pathlib.Path("/home/zoso/dev/void-node")
FIXED_GIT = pathlib.Path("/usr/bin/git")
FIXED_PYTHON = pathlib.Path("/usr/bin/python3")
INSTALL_PARENT = pathlib.Path("/opt")
INSTALL_NAME = (
    "void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v2"
)
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
BIN_DIR = "bin"
BOOTSTRAP_NAME = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v2"
)
POLICY_NAME = "policy-v1.conf"
BOOTSTRAP_TARGET = INSTALL_ROOT / BIN_DIR / BOOTSTRAP_NAME
POLICY_TARGET = INSTALL_ROOT / POLICY_NAME
POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V2"
)

MAX_READ_CHUNK = 1024 * 1024
MAX_PYTHON_BYTES = 512 * 1024 * 1024
HEX40 = re.compile(r"^[0-9a-f]{40}$")


class QualifyError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


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


def _trusted_root_directory(
    path: pathlib.Path,
    *,
    exact_mode: int | None = None,
) -> os.stat_result:
    try:
        st = path.lstat()
    except OSError as exc:
        raise QualifyError("trusted_directory_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or (st.st_mode & 0o022) != 0
    ):
        raise QualifyError("trusted_directory_invalid:" + str(path))
    if exact_mode is not None and stat.S_IMODE(st.st_mode) != exact_mode:
        raise QualifyError("trusted_directory_mode_invalid:" + str(path))
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
        raise QualifyError("tool_unavailable:" + str(path)) from exc
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
        raise QualifyError("tool_metadata_invalid:" + str(path))

    fd = os.open(real, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise QualifyError("tool_rebound:" + str(path))
        digest = hashlib.sha256()
        remaining = opened.st_size
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise QualifyError("tool_short_read:" + str(path))
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise QualifyError("tool_grew:" + str(path))
        after = os.fstat(fd)
        visible = real.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise QualifyError("tool_changed:" + str(path))
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
        # Qualification identity reads must never lazy-fetch missing objects.
        # Transport denial is the fail-closed fallback for older Git builds.
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_ALLOW_PROTOCOL": "",
    }


def _git(args: list[str]) -> bytes:
    git_tool = _tool_snapshot(
        FIXED_GIT,
        executable=True,
        maximum_bytes=64 * 1024 * 1024,
    )
    cp = subprocess.run(
        [
            git_tool["path"],
            "--no-replace-objects",
            "-C",
            str(FIXED_CHECKOUT),
            "-c",
            "safe.directory=" + str(FIXED_CHECKOUT),
            *args,
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=_git_env(),
        check=False,
        timeout=20,
    )
    if cp.returncode != 0:
        raise QualifyError(
            "git_command_failed:"
            + str(cp.returncode)
            + ":"
            + cp.stderr.decode("utf-8", "replace")[-1000:]
        )
    return cp.stdout


def checkout_snapshot(expected_head: str) -> dict[str, Any]:
    if HEX40.fullmatch(expected_head) is None:
        raise QualifyError("expected_head_invalid")
    head = _git(["rev-parse", "--verify", "HEAD^{commit}"]).decode().strip()
    tree = _git(["rev-parse", "--verify", "HEAD^{tree}"]).decode().strip()
    branch = _git(["symbolic-ref", "--short", "-q", "HEAD"]).decode().strip()
    status = _git(["status", "--porcelain=v1", "--untracked-files=all"])
    if head != expected_head:
        raise QualifyError("checkout_head_mismatch")
    if branch != "main":
        raise QualifyError("checkout_branch_not_main")
    if status != b"":
        raise QualifyError("checkout_not_clean")
    if HEX40.fullmatch(tree) is None:
        raise QualifyError("checkout_tree_invalid")
    return {
        "head": head,
        "tree": tree,
        "branch": branch,
        "clean": True,
    }


def _git_object(expected_head: str, relative: str, *, expected_blob: str) -> bytes:
    raw = _git(["show", expected_head + ":" + relative])
    if git_blob_sha1(raw) != expected_blob:
        raise QualifyError("git_object_blob_mismatch:" + relative)
    return raw


def accepted_lock(expected_head: str) -> dict[str, Any]:
    raw = _git_object(
        expected_head,
        LOCK_REL,
        expected_blob=LOCK_GIT_BLOB_SHA1,
    )
    try:
        lock = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise QualifyError("accepted_lock_json_invalid") from exc
    if not isinstance(lock, dict):
        raise QualifyError("accepted_lock_shape_invalid")
    required = {
        "lock_id": LOCK_ID,
        "candidate_source_head": CANDIDATE_MERGE,
        "candidate_source_tree": CANDIDATE_TREE,
        "candidate_merge": CANDIDATE_MERGE,
        "candidate_accepted": True,
        "bootstrap_binary_identity_accepted": True,
        "bootstrap_source_identity_bound": True,
        "installer_source_identity_bound": True,
        "runtime_head_contract_accepted": True,
        "canonical_main_candidate_authority": True,
        "superseded_v2_lock_install_authority": False,
        "superseded_v1_lock_install_authority": False,
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
    }
    for key, expected in required.items():
        if lock.get(key) != expected:
            raise QualifyError("accepted_lock_field_mismatch:" + key)
    report = lock.get("candidate_report")
    if not isinstance(report, dict):
        raise QualifyError("accepted_lock_report_missing")
    if (
        report.get("candidate_id") != CANDIDATE_ID
        or report.get("bootstrap_binary_bytes") != BOOTSTRAP_BYTES
        or report.get("bootstrap_binary_sha256") != BOOTSTRAP_SHA256
        or report.get("bootstrap_binary_git_blob_sha1") != BOOTSTRAP_GIT_BLOB_SHA1
        or report.get("installer_source_git_blob_sha1") != PROTECTED_INSTALLER_BLOB
        or report.get("installer_source_bytes") != PROTECTED_INSTALLER_BYTES
        or report.get("installer_source_sha256") != PROTECTED_INSTALLER_SHA256
        or report.get("runtime_expected_head_compile_bound") is not False
        or report.get("runtime_expected_head_strict_lowercase_hex") is not True
        or report.get("runtime_expected_head_forwarded_unchanged") is not True
        or report.get("repository_head_not_embedded_in_bootstrap") is not True
    ):
        raise QualifyError("accepted_lock_report_identity_mismatch")
    return lock


def python_snapshot() -> dict[str, Any]:
    return _tool_snapshot(
        FIXED_PYTHON,
        executable=True,
        maximum_bytes=MAX_PYTHON_BYTES,
    )


def build_policy(python: dict[str, Any]) -> bytes:
    return (
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + str(python["sha256"]) + "\n"
        + "python_bytes=" + str(python["bytes"]) + "\n"
    ).encode("ascii")


def _read_exact_file(
    path: pathlib.Path,
    *,
    expected_mode: int,
    expected_uid: int,
    expected_gid: int,
    expected_bytes: int,
    expected_sha256: str,
    expected_git_blob: str | None,
    label: str,
) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualifyError(label + "_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != expected_uid
        or before.st_gid != expected_gid
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_size != expected_bytes
    ):
        raise QualifyError(label + "_metadata_invalid")

    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise QualifyError(label + "_rebound")
        raw = bytearray()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise QualifyError(label + "_short_read")
            raw.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise QualifyError(label + "_grew")
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise QualifyError(label + "_changed")
    finally:
        os.close(fd)

    data = bytes(raw)
    if sha256(data) != expected_sha256:
        raise QualifyError(label + "_sha256_mismatch")
    if expected_git_blob is not None and git_blob_sha1(data) != expected_git_blob:
        raise QualifyError(label + "_git_blob_mismatch")
    return data


def inspect_installed_root(policy: bytes) -> dict[str, Any]:
    _trusted_root_directory(pathlib.Path("/"))
    _trusted_root_directory(INSTALL_PARENT)
    _trusted_root_directory(INSTALL_ROOT, exact_mode=0o755)

    root_entries = tuple(sorted(os.listdir(INSTALL_ROOT)))
    if root_entries != tuple(sorted((BIN_DIR, POLICY_NAME))):
        raise QualifyError("installed_root_entries_invalid")

    bin_path = INSTALL_ROOT / BIN_DIR
    _trusted_root_directory(bin_path, exact_mode=0o755)
    if tuple(sorted(os.listdir(bin_path))) != (BOOTSTRAP_NAME,):
        raise QualifyError("installed_bin_entries_invalid")

    bootstrap = _read_exact_file(
        BOOTSTRAP_TARGET,
        expected_mode=0o555,
        expected_uid=0,
        expected_gid=0,
        expected_bytes=BOOTSTRAP_BYTES,
        expected_sha256=BOOTSTRAP_SHA256,
        expected_git_blob=BOOTSTRAP_GIT_BLOB_SHA1,
        label="installed_bootstrap",
    )
    installed_policy = _read_exact_file(
        POLICY_TARGET,
        expected_mode=0o444,
        expected_uid=0,
        expected_gid=0,
        expected_bytes=len(policy),
        expected_sha256=sha256(policy),
        expected_git_blob=None,
        label="installed_policy",
    )
    if installed_policy != policy:
        raise QualifyError("installed_policy_bytes_mismatch")

    return {
        "install_root": str(INSTALL_ROOT),
        "bootstrap_path": str(BOOTSTRAP_TARGET),
        "bootstrap_bytes": len(bootstrap),
        "bootstrap_sha256": sha256(bootstrap),
        "bootstrap_git_blob_sha1": git_blob_sha1(bootstrap),
        "policy_path": str(POLICY_TARGET),
        "policy_bytes": len(installed_policy),
        "policy_sha256": sha256(installed_policy),
        "root_owned": True,
        "exact_entries": True,
    }


def inspect_current_installer(expected_head: str) -> dict[str, Any]:
    absolute = FIXED_CHECKOUT / PROTECTED_INSTALLER_REL
    raw = _read_exact_file(
        absolute,
        expected_mode=0o644,
        expected_uid=os.getuid(),
        expected_gid=os.getgid(),
        expected_bytes=PROTECTED_INSTALLER_BYTES,
        expected_sha256=PROTECTED_INSTALLER_SHA256,
        expected_git_blob=PROTECTED_INSTALLER_BLOB,
        label="current_protected_installer",
    )
    head_blob = _git(
        ["rev-parse", expected_head + ":" + PROTECTED_INSTALLER_REL]
    ).decode().strip()
    if head_blob != PROTECTED_INSTALLER_BLOB:
        raise QualifyError("protected_installer_head_blob_mismatch")
    return {
        "path": str(absolute),
        "bytes": len(raw),
        "sha256": sha256(raw),
        "git_blob_sha1": git_blob_sha1(raw),
        "head_blob_matches": True,
    }


def collect(expected_head: str) -> dict[str, Any]:
    checkout = checkout_snapshot(expected_head)
    accepted_lock(expected_head)
    python = python_snapshot()
    policy = build_policy(python)
    installed = inspect_installed_root(policy)
    installer = inspect_current_installer(expected_head)

    result = {
        "expected_head": expected_head,
        "checkout": checkout,
        "accepted_lock_id": LOCK_ID,
        "candidate_id": CANDIDATE_ID,
        "candidate_source_head": CANDIDATE_MERGE,
        "candidate_source_tree": CANDIDATE_TREE,
        "bootstrap_runtime_head_compile_bound": False,
        "runtime_expected_head_strict_lowercase_hex": True,
        "runtime_expected_head_forwarded_unchanged": True,
        "canonical_main_candidate_authority": True,
        "superseded_v2_lock_install_authority": False,
        "superseded_v1_lock_install_authority": False,
        "installed": installed,
        "python": python,
        "protected_installer": installer,
        "installed_identity_green": True,
        "policy_generation_green": True,
        "protected_installer_source_identity_green": True,
        "runtime_head_contract_green": True,
        "bootstrap_execution_performed": False,
        "protected_installer_apply_performed": False,
        "filesystem_write": False,
        "service_mutation": False,
        "credential_access": False,
        "private_key_access": False,
        "signing": False,
        "transaction": False,
        "rpc_call": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "treasury_liquidity_action": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
        "protected_installer_execution_readiness": True,
    }
    return result
def emit(result: dict[str, Any], *, mode: str) -> int:
    print(MARKER)
    print("mode=" + mode)
    print("read_only=true")
    print("filesystem_write=false")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("candidate_source_head=" + CANDIDATE_MERGE)
    print("current_checkout_head=" + str(result["expected_head"]))
    print("bootstrap_runtime_head_compile_bound=false")
    print("runtime_expected_head_strict_lowercase_hex=true")
    print("runtime_expected_head_forwarded_unchanged=true")
    print("canonical_main_candidate_authority=true")
    print("superseded_v2_lock_install_authority=false")
    print("superseded_v1_lock_install_authority=false")
    print("installed_identity_green=true")
    print("policy_generation_green=true")
    print("protected_installer_source_identity_green=true")
    print("runtime_head_contract_green=true")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
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
    print("production_host_evidence_authority=false")
    print("protected_installer_execution_readiness=true")
    print("status=GREEN")
    print(
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V2R"
    )
    return 0
def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("read_only=true")
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("candidate_source_head=" + CANDIDATE_MERGE)
    print("bootstrap_runtime_head_compile_bound=false")
    print("runtime_expected_head_strict_lowercase_hex=true")
    print("runtime_expected_head_forwarded_unchanged=true")
    print("canonical_main_candidate_authority=true")
    print("superseded_v2_lock_install_authority=false")
    print("installed_bootstrap_execution=false")
    print("protected_installer_apply=false")
    print("filesystem_write=false")
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
    print("production_host_evidence_authority=false")
def self_test() -> None:
    assert len(CANDIDATE_MERGE) == 40
    assert len(CANDIDATE_TREE) == 40
    assert len(BOOTSTRAP_SHA256) == 64
    assert len(BOOTSTRAP_GIT_BLOB_SHA1) == 40
    policy = build_policy({"sha256": "a" * 64, "bytes": 123456})
    assert policy == (
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + "a" * 64 + "\n"
        + "python_bytes=123456\n"
    ).encode("ascii")
    assert _git_env()["GIT_NO_LAZY_FETCH"] == "1"
    assert _git_env()["GIT_ALLOW_PROTOCOL"] == ""
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_bootstrap_lock_v3_bound=true")
    print("canonical_main_candidate_authority_required=true")
    print("exact_installed_bootstrap_identity_required=true")
    print("exact_policy_generation_required=true")
    print("exact_protected_installer_source_required=true")
    print("runtime_expected_head_compile_bound=false")
    print("runtime_expected_head_strict_lowercase_hex=true")
    print("runtime_expected_head_forwarded_unchanged=true")
    print("frozen_head_alignment_not_required=true")
    print("git_lazy_fetch_suppressed=true")
    print("git_transport_denied=true")
    print("bootstrap_execution=false")
    print("protected_installer_apply=false")
    print("filesystem_write=false")
    print("service_mutation=false")
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
    mode.add_argument("--run", action="store_true")
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if not args.expected_head:
        raise QualifyError("expected_head_required")

    result = collect(args.expected_head)
    return emit(result, mode="plan" if args.plan else "run")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except QualifyError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("read_only=true")
        print("filesystem_write=false")
        print("bootstrap_execution_performed=false")
        print("protected_installer_apply_performed=false")
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
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
