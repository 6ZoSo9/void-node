#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import types
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
    "CURRENT_HEAD_PLAN_V1"
)
PLAN_SCHEMA = (
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "current_head_plan_v1"
)
PLAN_PREFIX = "voidbuye2dormantfirstentrycurrentheadplan1_"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "installed_qualification_v1.py"
)
QUALIFIER_BLOB = "a03e5879c91bb86fa68897ba6bb4b5e87519a0c6"
INSTALLER_BLOB = "ce6930bc1be8239a3171d4922c44b96a50f5778b"

LOCK_ID = (
    "voidbuye2dormantfirstentrylock2_"
    "89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543"
)
CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand2_"
    "b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b"
)
LAUNCHER_PATH = Path(
    "/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1/"
    "bin/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1"
)
LAUNCHER_BYTES = 731_072
LAUNCHER_SHA256 = (
    "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
)
LAUNCHER_GIT_BLOB = "798907b18c73ee2cc1dea0fe05b36f27ab4137a7"

HEX40 = re.compile(r"^[0-9a-f]{40}$")
MAX_SOURCE_BYTES = 2 * 1024 * 1024


class PlanError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def repository_blob(relative: str, expected_blob: str) -> bytes:
    path = ROOT / relative
    try:
        before = path.lstat()
    except OSError as exc:
        raise PlanError("repository_source_unavailable:" + relative) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > MAX_SOURCE_BYTES
    ):
        raise PlanError("repository_source_metadata_invalid:" + relative)
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        fields = (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
            "st_size", "st_mtime_ns", "st_ctime_ns",
        )
        for field in fields:
            if getattr(before, field) != getattr(opened, field):
                raise PlanError("repository_source_rebound:" + relative)
        data = bytearray()
        remaining = before.st_size
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise PlanError("repository_source_short_read:" + relative)
            data.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise PlanError("repository_source_grew:" + relative)
        after = os.fstat(fd)
        visible = path.lstat()
        for field in fields:
            if getattr(opened, field) != getattr(after, field):
                raise PlanError("repository_source_changed:" + relative)
            if getattr(after, field) != getattr(visible, field):
                raise PlanError("repository_source_visible_changed:" + relative)
    finally:
        os.close(fd)
    raw = bytes(data)
    if git_blob(raw) != expected_blob:
        raise PlanError("repository_source_blob_mismatch:" + relative)
    return raw


def load_qualifier():
    raw = repository_blob(QUALIFIER_REL, QUALIFIER_BLOB)
    module = types.ModuleType("void_e2_first_entry_installed_qualifier_verified")
    module.__file__ = str(ROOT / QUALIFIER_REL)
    module.__package__ = None
    try:
        code = compile(
            raw.decode("utf-8", "strict"),
            QUALIFIER_REL,
            "exec",
            dont_inherit=True,
            optimize=0,
        )
        exec(code, module.__dict__)
    except Exception as exc:
        raise PlanError("qualifier_verified_execution_failed") from exc
    if getattr(module, "MARKER", "") != (
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
        "INSTALLED_QUALIFICATION_V1"
    ):
        raise PlanError("qualifier_marker_mismatch")
    if getattr(module, "INSTALLER_SOURCE_GIT_BLOB_SHA1", "") != INSTALLER_BLOB:
        raise PlanError("qualifier_installer_blob_mismatch")
    if not callable(getattr(module, "collect", None)):
        raise PlanError("qualifier_collect_missing")
    if not callable(getattr(module, "_load_installer", None)):
        raise PlanError("qualifier_installer_loader_missing")
    return module


def _require_qualification(result: dict[str, Any], expected_head: str) -> None:
    required = {
        "version": 1,
        "read_only_installed_state": True,
        "root_execution_required": True,
        "expected_head": expected_head,
        "installer_source_git_blob_sha1": INSTALLER_BLOB,
        "accepted_lock_id": LOCK_ID,
        "candidate_id": CANDIDATE_ID,
        "installed_identity_green": True,
        "checkout_generation_bound": True,
        "python_generation_bound": True,
        "policy_generation_green": True,
        "installed_generation_stable": True,
        "triple_snapshot_required": True,
        "temporary_git_metadata_cleanup_completed": True,
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
        "production_host_evidence_authority": True,
        "next_gate": "non_executing_current_head_plan",
        "privileged_execution_authorized": False,
    }
    for key, want in required.items():
        if result.get(key) != want:
            raise PlanError("qualification_field_mismatch:" + key)

    installed = result.get("installed")
    if not isinstance(installed, dict):
        raise PlanError("qualification_installed_snapshot_missing")
    files = installed.get("files")
    if not isinstance(files, dict):
        raise PlanError("qualification_installed_files_missing")
    launcher = files.get("launcher")
    if not isinstance(launcher, dict):
        raise PlanError("qualification_launcher_missing")
    launcher_required = {
        "bytes": LAUNCHER_BYTES,
        "sha256": LAUNCHER_SHA256,
        "git_blob_sha1": LAUNCHER_GIT_BLOB,
        "mode": "0555",
        "uid": 0,
        "gid": 0,
        "nlink": 1,
    }
    for key, want in launcher_required.items():
        if launcher.get(key) != want:
            raise PlanError("qualification_launcher_field_mismatch:" + key)


def collect_plan(expected_head: str) -> dict[str, Any]:
    if os.geteuid() != 0:
        raise PlanError("root_required_for_current_head_plan")
    if HEX40.fullmatch(expected_head) is None:
        raise PlanError("expected_head_invalid")

    qualifier = load_qualifier()
    try:
        qualification = qualifier.collect(expected_head)
    except Exception as exc:
        raise PlanError(
            "installed_qualification_hold:" + type(exc).__name__ + ":" + str(exc)
        ) from exc
    if not isinstance(qualification, dict):
        raise PlanError("qualification_result_invalid")
    _require_qualification(qualification, expected_head)

    try:
        installer = qualifier._load_installer()
    except Exception as exc:
        raise PlanError("installer_verified_load_failed") from exc
    if getattr(installer, "LOCK_ID", "") != LOCK_ID:
        raise PlanError("installer_lock_id_mismatch")
    if getattr(installer, "CANDIDATE_ID", "") != CANDIDATE_ID:
        raise PlanError("installer_candidate_id_mismatch")
    if Path(getattr(installer, "LAUNCHER_TARGET", "")) != LAUNCHER_PATH:
        raise PlanError("installer_launcher_path_mismatch")
    if getattr(installer, "LAUNCHER_BYTES", -1) != LAUNCHER_BYTES:
        raise PlanError("installer_launcher_bytes_mismatch")
    if getattr(installer, "LAUNCHER_SHA256", "") != LAUNCHER_SHA256:
        raise PlanError("installer_launcher_sha256_mismatch")

    future_argv = [
        str(LAUNCHER_PATH),
        "--installer-plan",
        "--expected-head",
        expected_head,
    ]
    body = {
        "schema": PLAN_SCHEMA,
        "version": 1,
        "expected_head": expected_head,
        "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "installer_git_blob_sha1": INSTALLER_BLOB,
        "qualification": qualification,
        "installed_launcher": qualification["installed"]["files"]["launcher"],
        "future_argv": future_argv,
        "temporary_git_metadata_write_performed": bool(
            qualification.get("temporary_git_metadata_write_performed", False)
        ),
        "temporary_git_metadata_cleanup_completed": True,
        "protected_root_write": False,
        "repository_worktree_write": False,
        "privileged_execution_performed": False,
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
        "production_host_evidence_authority": True,
        "privileged_execution_authorized": False,
    }
    plan_id = PLAN_PREFIX + sha256(canonical(body))
    return {"plan_id": plan_id, "body": body}


def emit_plan(result: dict[str, Any]) -> None:
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("non_executing=true")
    print("root_required=true")
    print("plan_id=" + result["plan_id"])
    print("expected_head=" + body["expected_head"])
    print("qualifier_git_blob_sha1=" + QUALIFIER_BLOB)
    print("installer_git_blob_sha1=" + INSTALLER_BLOB)
    print("installed_qualification_green=true")
    print("installed_launcher_identity_bound=true")
    print(
        "temporary_git_metadata_write_performed="
        + str(body["temporary_git_metadata_write_performed"]).lower()
    )
    print("temporary_git_metadata_cleanup_completed=true")
    print("protected_root_write=false")
    print("repository_worktree_write=false")
    print("privileged_execution_performed=false")
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
    print("production_host_evidence_authority=true")
    print("privileged_execution_authorized=false")
    print("future_argv_json=" + json.dumps(body["future_argv"], separators=(",", ":")))
    print("plan_body_json=" + canonical(body).decode("ascii"))
    print(
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PRIVILEGED_INSTALLER_PLAN_V1"
    )


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("qualifier_git_blob_sha1=" + QUALIFIER_BLOB)
    print("installer_git_blob_sha1=" + INSTALLER_BLOB)
    print("future_launcher_path=" + str(LAUNCHER_PATH))
    print("future_operation=installer_plan")
    print("privileged_execution_performed=false")
    print("launcher_execution=false")
    print("native_execution=false")
    print("binder_execution=false")
    print("credential_access=false")
    print("funds_movement=false")
    print("privileged_execution_authorized=false")


def self_test() -> None:
    assert HEX40.fullmatch("a" * 40)
    assert HEX40.fullmatch("A" * 40) is None
    assert PLAN_PREFIX == "voidbuye2dormantfirstentrycurrentheadplan1_"
    assert str(LAUNCHER_PATH).endswith(
        "/bin/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1"
    )
    print(MARKER + "_SELF_TEST_GREEN")
    print("exact_qualifier_generation_bound=true")
    print("exact_installer_generation_bound=true")
    print("installed_qualification_required=true")
    print("installed_launcher_identity_required=true")
    print("content_addressed_plan_required=true")
    print("future_argv_emitted_only=true")
    print("privileged_execution_performed=false")
    print("launcher_execution=false")
    print("native_execution=false")
    print("binder_execution=false")
    print("credential_access=false")
    print("funds_movement=false")
    print("privileged_execution_authorized=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if not args.expected_head:
        raise PlanError("expected_head_required")
    emit_plan(collect_plan(args.expected_head))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PlanError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("non_executing=true")
        print("protected_root_write=false")
        print("repository_worktree_write=false")
        print("privileged_execution_performed=false")
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
        print("privileged_execution_authorized=false")
        raise SystemExit(2)
