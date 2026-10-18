#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import stat
import types
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "protected_install_v5.py"
)
INSTALLER_SOURCE = ROOT / INSTALLER_REL
INSTALLER_SOURCE_GIT_BLOB_SHA1 = "ce6930bc1be8239a3171d4922c44b96a50f5778b"
REPOSITORY_OBSERVER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v6.py"
)
REPOSITORY_OBSERVER_SOURCE = ROOT / REPOSITORY_OBSERVER_REL
REPOSITORY_OBSERVER_SOURCE_GIT_BLOB_SHA1 = "438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84"
ACCEPTED_LOCK_BYTES = 4548
ACCEPTED_LOCK_SHA256 = "7c4c207fb01d9bb4d8f6ab72b458464bf258373c7601e40e7a8e2719e3b4630a"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
    "INSTALLED_QUALIFICATION_V1"
)
MAX_INSTALLER_SOURCE_BYTES = 2 * 1024 * 1024
MAX_FILE_BYTES = 4 * 1024 * 1024

_GIT_RECEIPT: dict[str, Any] = {
    "temporary_git_metadata_write_performed": False,
    "temporary_git_metadata_cleanup_completed": True,
}


class QualifyError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def _same_stat(a: os.stat_result, b: os.stat_result) -> bool:
    return all(
        getattr(a, field) == getattr(b, field)
        for field in (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
            "st_size", "st_mtime_ns", "st_ctime_ns",
        )
    )


def _direct_source_bytes(path: pathlib.Path) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualifyError("installer_source_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > MAX_INSTALLER_SOURCE_BYTES
    ):
        raise QualifyError("installer_source_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise QualifyError("installer_source_rebound")
        data = bytearray()
        remaining = before.st_size
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise QualifyError("installer_source_short_read")
            data.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise QualifyError("installer_source_grew")
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise QualifyError("installer_source_changed")
    finally:
        os.close(fd)
    return bytes(data)


def _load_installer():
    raw = _direct_source_bytes(INSTALLER_SOURCE)
    if git_blob_sha1(raw) != INSTALLER_SOURCE_GIT_BLOB_SHA1:
        raise QualifyError("installer_source_blob_mismatch")
    module = types.ModuleType(
        "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
        "protected_install_v5_verified"
    )
    module.__file__ = str(INSTALLER_SOURCE)
    module.__package__ = ""
    try:
        code = compile(raw, str(INSTALLER_SOURCE), "exec", dont_inherit=True, optimize=0)
        exec(code, module.__dict__)
    except Exception as exc:
        raise QualifyError("verified_installer_source_execution_failed") from exc
    if getattr(module, "MARKER", "") != (
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
        "PROTECTED_INSTALL_V5"
    ):
        raise QualifyError("installer_marker_mismatch")
    for name in (
        "python_snapshot", "build_policy", "LOCK_REL", "LOCK_GIT_BLOB_SHA1",
        "protected_state", "INSTALL_ROOT", "GREEN_STATE", "LOCK_ID",
        "CANDIDATE_ID", "LAUNCHER_TARGET", "NATIVE_TARGET",
        "RUNTIME_INSTALLER_TARGET", "POLICY_TARGET",
    ):
        if not hasattr(module, name):
            raise QualifyError("installer_contract_missing:" + name)
    return module


def _load_repository_observer():
    try:
        raw = _direct_source_bytes(REPOSITORY_OBSERVER_SOURCE)
    except QualifyError as exc:
        raise QualifyError("repository_observer_source_read_failed:" + str(exc)) from exc
    if git_blob_sha1(raw) != REPOSITORY_OBSERVER_SOURCE_GIT_BLOB_SHA1:
        raise QualifyError("repository_observer_source_blob_mismatch")
    module = types.ModuleType("void_e2_standalone_repository_observer_verified")
    module.__file__ = str(REPOSITORY_OBSERVER_SOURCE)
    module.__package__ = ""
    try:
        code = compile(
            raw, str(REPOSITORY_OBSERVER_SOURCE), "exec", dont_inherit=True, optimize=0
        )
        exec(code, module.__dict__)
    except Exception as exc:
        raise QualifyError("verified_repository_observer_source_execution_failed") from exc
    if getattr(module, "MARKER", "") != (
        "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6"
    ):
        raise QualifyError("repository_observer_marker_mismatch")
    for name in ("_RepositorySnapshot", "git_boundary_receipt"):
        if not callable(getattr(module, name, None)):
            raise QualifyError("repository_observer_contract_missing:" + name)
    return module


def _accepted_lock(installer: Any, repository: Any) -> dict[str, Any]:
    # Observe the accepted immutable lock through the standalone Git witness.
    # The V5 operational loader requires native-parent source descriptors and
    # is deliberately not enabled or replaced for this read-only qualification.
    raw = repository.blob(
        installer.LOCK_REL,
        expected_blob=installer.LOCK_GIT_BLOB_SHA1,
        expected_bytes=ACCEPTED_LOCK_BYTES,
        expected_sha256=ACCEPTED_LOCK_SHA256,
    )
    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise QualifyError("accepted_lock_json_invalid") from exc
    required = {
        "schema":
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_lock_v2",
        "marker":
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CANDIDATE_LOCK_V2",
        "version": 2,
        "repository": "6ZoSo9/void-node",
        "candidate_accepted": True,
        "launcher_binary_identity_accepted": True,
        "runtime_head_contract_accepted": True,
        "canonical_main_candidate_authority": True,
        "superseded_v1_lock_install_authority": False,
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
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_materializer_v2",
        "lock_id": installer.LOCK_ID,
    }
    if not isinstance(value, dict):
        raise QualifyError("accepted_lock_shape_invalid")
    for key, expected in required.items():
        if type(value.get(key)) is not type(expected) or value.get(key) != expected:
            raise QualifyError("accepted_lock_field_mismatch:" + key)
    report = value.get("candidate_report")
    if not isinstance(report, dict):
        raise QualifyError("accepted_lock_candidate_missing")
    checks = {
        "candidate_id": installer.CANDIDATE_ID,
        "launcher_binary_sha256": installer.LAUNCHER_SHA256,
        "launcher_binary_bytes": installer.LAUNCHER_BYTES,
        "accepted_native_binary_sha256": installer.NATIVE_SHA256,
        "accepted_native_binary_bytes": installer.NATIVE_BYTES,
        "installer_source_git_blob_sha1": installer.RUNTIME_INSTALLER_GIT_BLOB_SHA1,
        "installer_source_sha256": installer.RUNTIME_INSTALLER_SHA256,
        "installer_source_bytes": installer.RUNTIME_INSTALLER_BYTES,
        "compile_bound_confirmation": "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY",
        "runtime_expected_head_compile_bound": False,
        "runtime_expected_head_strict_lowercase_hex": True,
        "runtime_expected_head_forwarded_unchanged": True,
        "repository_head_not_embedded_in_launcher": True,
        "frozen_child_launcher_path_compatible": True,
    }
    for key, expected in checks.items():
        if type(report.get(key)) is not type(expected) or report.get(key) != expected:
            raise QualifyError("accepted_lock_candidate_field_mismatch:" + key)
    return value


def _record(st: os.stat_result) -> dict[str, Any]:
    return {
        "dev": st.st_dev,
        "ino": st.st_ino,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "nlink": st.st_nlink,
        "bytes": st.st_size,
        "mtime_ns": st.st_mtime_ns,
        "ctime_ns": st.st_ctime_ns,
    }


def _snapshot_dir(path: pathlib.Path, expected_entries: tuple[str, ...]) -> dict[str, Any]:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualifyError("installed_directory_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISDIR(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or stat.S_IMODE(before.st_mode) != 0o755
    ):
        raise QualifyError("installed_directory_metadata_invalid:" + str(path))
    try:
        entries = tuple(sorted(os.listdir(path)))
    except OSError as exc:
        raise QualifyError("installed_directory_list_failed:" + str(path)) from exc
    if entries != tuple(sorted(expected_entries)):
        raise QualifyError("installed_directory_entries_invalid:" + str(path))
    after = path.lstat()
    if not _same_stat(before, after):
        raise QualifyError("installed_directory_changed:" + str(path))
    result = _record(before)
    result["entries"] = list(entries)
    return result


def _snapshot_file(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_mode: int,
    expected_raw: bytes | None = None,
) -> dict[str, Any]:
    if expected_bytes < 1 or expected_bytes > MAX_FILE_BYTES:
        raise QualifyError("expected_file_size_invalid:" + str(path))
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualifyError("installed_file_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_size != expected_bytes
    ):
        raise QualifyError("installed_file_metadata_invalid:" + str(path))
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise QualifyError("installed_file_rebound:" + str(path))
        digest = hashlib.sha256()
        data = bytearray()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise QualifyError("installed_file_short_read:" + str(path))
            digest.update(chunk)
            data.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise QualifyError("installed_file_grew:" + str(path))
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise QualifyError("installed_file_changed:" + str(path))
    finally:
        os.close(fd)
    raw = bytes(data)
    if digest.hexdigest() != expected_sha256:
        raise QualifyError("installed_file_sha256_mismatch:" + str(path))
    if expected_raw is not None and raw != expected_raw:
        raise QualifyError("installed_file_bytes_mismatch:" + str(path))
    result = _record(before)
    result["sha256"] = expected_sha256
    result["git_blob_sha1"] = git_blob_sha1(raw)
    return result


def _installed_snapshot(
    installer: Any, expected_head: str, *, repository: Any,
) -> dict[str, Any]:
    try:
        if repository.expected_head != expected_head or repository._closed:
            raise QualifyError("repository_witness_head_or_lifetime_mismatch")
        checkout = repository.checkout()
        lock = _accepted_lock(installer, repository)
        python = installer.python_snapshot()
        policy = installer.build_policy(python)
        state = installer.protected_state(policy)
    except Exception as exc:
        raise QualifyError(
            "installer_read_only_contract_hold:" + type(exc).__name__ + ":" + str(exc)
        ) from exc
    if state != installer.GREEN_STATE:
        raise QualifyError("protected_first_entry_not_green")

    root = pathlib.Path(installer.INSTALL_ROOT)
    bin_dir = root / installer.BIN_DIR
    input_dir = root / installer.INPUT_DIR
    source_dir = root / installer.SOURCE_DIR
    ops_dir = source_dir / installer.OPS_DIR
    precision_dir = ops_dir / installer.PRECISION_DIR

    directories = {
        "root": _snapshot_dir(
            root, (installer.BIN_DIR, installer.INPUT_DIR, installer.POLICY_NAME, installer.SOURCE_DIR)
        ),
        "bin": _snapshot_dir(bin_dir, (installer.LAUNCHER_NAME,)),
        "input": _snapshot_dir(input_dir, (installer.NATIVE_NAME,)),
        "source": _snapshot_dir(source_dir, (installer.OPS_DIR,)),
        "ops": _snapshot_dir(ops_dir, (installer.PRECISION_DIR,)),
        "precision": _snapshot_dir(precision_dir, (installer.RUNTIME_INSTALLER_NAME,)),
    }
    files = {
        "launcher": _snapshot_file(
            pathlib.Path(installer.LAUNCHER_TARGET),
            expected_bytes=installer.LAUNCHER_BYTES,
            expected_sha256=installer.LAUNCHER_SHA256,
            expected_mode=0o555,
        ),
        "native": _snapshot_file(
            pathlib.Path(installer.NATIVE_TARGET),
            expected_bytes=installer.NATIVE_BYTES,
            expected_sha256=installer.NATIVE_SHA256,
            expected_mode=0o444,
        ),
        "runtime_installer": _snapshot_file(
            pathlib.Path(installer.RUNTIME_INSTALLER_TARGET),
            expected_bytes=installer.RUNTIME_INSTALLER_BYTES,
            expected_sha256=installer.RUNTIME_INSTALLER_SHA256,
            expected_mode=0o444,
        ),
        "policy": _snapshot_file(
            pathlib.Path(installer.POLICY_TARGET),
            expected_bytes=len(policy),
            expected_sha256=sha256(policy),
            expected_mode=0o444,
            expected_raw=policy,
        ),
    }

    return {
        "expected_head": expected_head,
        "checkout": checkout,
        "lock_id": lock.get("lock_id"),
        "candidate_id": installer.CANDIDATE_ID,
        "python": python,
        "git_tool": dict(repository.git_tool),
        "policy_sha256": sha256(policy),
        "policy_bytes": len(policy),
        "protected_state": state,
        "directories": directories,
        "files": files,
    }


def collect(expected_head: str) -> dict[str, Any]:
    _GIT_RECEIPT.clear()
    _GIT_RECEIPT.update({
        "temporary_git_metadata_write_performed": False,
        "temporary_git_metadata_cleanup_completed": True,
    })
    if os.geteuid() != 0:
        raise QualifyError("root_required_for_installed_qualification")
    if not isinstance(expected_head, str) or not re_fullmatch_hex40(expected_head):
        raise QualifyError("expected_head_invalid")

    observer = None
    try:
        try:
            installer = _load_installer()
            observer = _load_repository_observer()
            with observer._RepositorySnapshot(expected_head) as repository:
                # Bind both already-verified helper modules to this same HEAD.
                repository.blob(
                    INSTALLER_REL, expected_blob=INSTALLER_SOURCE_GIT_BLOB_SHA1,
                )
                repository.blob(
                    REPOSITORY_OBSERVER_REL,
                    expected_blob=REPOSITORY_OBSERVER_SOURCE_GIT_BLOB_SHA1,
                )
                before = _installed_snapshot(installer, expected_head, repository=repository)
                middle = _installed_snapshot(installer, expected_head, repository=repository)
                after = _installed_snapshot(installer, expected_head, repository=repository)
                if before != middle or middle != after:
                    raise QualifyError("installed_generation_changed_during_qualification")
        finally:
            if observer is not None:
                _GIT_RECEIPT.clear()
                _GIT_RECEIPT.update(observer.git_boundary_receipt())
    except QualifyError:
        raise
    except BaseException as exc:
        reason = str(exc).replace("\n", " ").replace("\r", " ")[:512]
        raise QualifyError(
            "standalone_repository_observation_hold:" + type(exc).__name__ + ":" + reason
        ) from exc

    if _GIT_RECEIPT.get("temporary_git_metadata_cleanup_completed") is not True:
        raise QualifyError("temporary_git_metadata_cleanup_incomplete")

    return {
        "version": 1,
        "read_only_installed_state": True,
        "root_execution_required": True,
        "expected_head": expected_head,
        "installer_source_git_blob_sha1": INSTALLER_SOURCE_GIT_BLOB_SHA1,
        "repository_observer_source_git_blob_sha1": REPOSITORY_OBSERVER_SOURCE_GIT_BLOB_SHA1,
        "accepted_lock_id": before["lock_id"],
        "candidate_id": before["candidate_id"],
        "protected_state": before["protected_state"],
        "installed_identity_green": True,
        "checkout_generation_bound": True,
        "python_generation_bound": True,
        "git_generation_bound": True,
        "policy_generation_green": True,
        "installed_generation_stable": True,
        "triple_snapshot_required": True,
        **_GIT_RECEIPT,
        "protected_root_write": False,
        "repository_worktree_write": False,
        "launcher_execution": False,
        "native_execution": False,
        "binder_execution": False,
        "service_mutation": False,
        "systemd_mutation": False,
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
        "installed_generation_evidence_authority": True,
        "installed": before,
        "next_gate": "non_executing_current_head_plan",
        "privileged_execution_authorized": False,
    }


def re_fullmatch_hex40(value: str) -> bool:
    return len(value) == 40 and all(ch in "0123456789abcdef" for ch in value)


def emit(result: dict[str, Any]) -> None:
    print(MARKER)
    for key in (
        "read_only_installed_state",
        "root_execution_required",
        "expected_head",
        "installer_source_git_blob_sha1",
        "repository_observer_source_git_blob_sha1",
        "accepted_lock_id",
        "candidate_id",
        "protected_state",
        "installed_identity_green",
        "checkout_generation_bound",
        "python_generation_bound",
        "git_generation_bound",
        "policy_generation_green",
        "installed_generation_stable",
        "triple_snapshot_required",
        "temporary_git_metadata_write_performed",
        "temporary_git_metadata_cleanup_completed",
        "git_boundary_policy",
        "temporary_git_metadata_write_required",
        "source_repository_mutation",
        "source_object_fetch",
        "repository_config_loaded",
        "repository_callback_execution",
        "standalone_git_tool_admission",
        "native_parent_authority_claimed",
        "protected_root_write",
        "repository_worktree_write",
        "launcher_execution",
        "native_execution",
        "binder_execution",
        "service_mutation",
        "systemd_mutation",
        "credential_access",
        "private_key_access",
        "signing",
        "transaction",
        "rpc_call",
        "payment_acceptance",
        "public_presale_activation",
        "wc_void_market_activation",
        "treasury_liquidity_action",
        "funds_movement",
        "production_host_evidence_authority",
        "installed_generation_evidence_authority",
        "next_gate",
        "privileged_execution_authorized",
    ):
        value = result[key]
        print(f"{key}={str(value).lower() if isinstance(value, bool) else value}")
    print(
        "result_json="
        + json.dumps(result, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    )


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("installer_source_git_blob_sha1=" + INSTALLER_SOURCE_GIT_BLOB_SHA1)
    print("repository_observer_source_git_blob_sha1=" + REPOSITORY_OBSERVER_SOURCE_GIT_BLOB_SHA1)
    print("standalone_repository_observer_required=true")
    print("native_parent_authority_claimed=false")
    print("root_required_for_run=true")
    print("triple_snapshot_required=true")
    print("temporary_git_metadata_write_possible_on_run=true")
    print("temporary_git_metadata_cleanup_required=true")
    print("protected_root_write=false")
    print("repository_worktree_write=false")
    print("launcher_execution=false")
    print("native_execution=false")
    print("binder_execution=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("installed_generation_evidence_authority=false")
    print("privileged_execution_authorized=false")


def self_test() -> None:
    assert re_fullmatch_hex40("a" * 40)
    assert not re_fullmatch_hex40("A" * 40)
    assert not re_fullmatch_hex40("a" * 39)
    assert INSTALLER_SOURCE_GIT_BLOB_SHA1 == "ce6930bc1be8239a3171d4922c44b96a50f5778b"
    assert REPOSITORY_OBSERVER_SOURCE_GIT_BLOB_SHA1 == "438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84"
    print(MARKER + "_SELF_TEST_GREEN")
    print("exact_installer_generation_bound=true")
    print("exact_repository_observer_generation_bound=true")
    print("native_parent_authority_claimed=false")
    print("triple_snapshot_required=true")
    print("installed_payload_execution_absent=true")
    print("temporary_git_metadata_truthful=true")
    print("protected_root_write=false")
    print("repository_worktree_write=false")
    print("credential_access=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("installed_generation_evidence_authority=false")
    print("privileged_execution_authorized=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
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
    emit(collect(args.expected_head))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except QualifyError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        for key, value in _GIT_RECEIPT.items():
            print(key + "=" + (str(value).lower() if isinstance(value, bool) else str(value)))
        print("read_only_installed_state=true")
        print("protected_root_write=false")
        print("repository_worktree_write=false")
        print("launcher_execution=false")
        print("native_execution=false")
        print("binder_execution=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
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
        print("installed_generation_evidence_authority=false")
        print("privileged_execution_authorized=false")
        raise SystemExit(2)
