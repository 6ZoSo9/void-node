#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
from typing import Any

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALLER_BOOTSTRAP_V7_QUALIFY_EXECUTE_CONTRACT_V1"
)
SCHEMA = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_v7_qualify_execute_contract_v1"
)
CONTRACT_PREFIX = "voidbuye2protectedbootstrapv7exec1_"

PLANNER_MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V7"
)
PLANNER_SCHEMA = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v7"
)
PLANNER_PREFIX = "voidbuye2protectedbootstrapplan7_"
PLANNER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v7.py"
)
PLANNER_BLOB = "9ea4a7d34a66f81ed568adaed693755ebca37b66"
PLANNER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v7.py"
)
PLANNER_PROOF_BLOB = "66263ef1beb35d5611683f456f95cafd5e0007ec"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_repaired_installed_qualification_v1.py"
)
QUALIFIER_BLOB = "d9650aff7af2cb9fc9a8d95a888d8dd52aef1970"
FIXED_PYTHON = "/usr/bin/python3"

BOOTSTRAP_PATH = (
    "/opt/void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v6/bin/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v6"
)
BOOTSTRAP_BYTES = 874_608
BOOTSTRAP_SHA256 = (
    "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"
)
BOOTSTRAP_GIT_BLOB = "b577d70666f98ac59a75b84b3dab741fe7b93a4b"
BOOTSTRAP_LOCK_ID = (
    "voidbuye2dormantbootstraplock3_"
    "4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"
)
BOOTSTRAP_CANDIDATE_ID = (
    "voidbuye2dormantbootstrapcand3_"
    "1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
)
BOOTSTRAP_GREEN_STATE = "PROTECTED_BOOTSTRAP_V6_REPAIRED_GREEN_WITH_PREDECESSOR"

LAUNCHER_LOCK_ID = (
    "voidbuye2dormantfirstentrylock2_"
    "89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543"
)
LAUNCHER_CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand2_"
    "b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b"
)
LAUNCHER_BYTES = 731_072
LAUNCHER_SHA256 = (
    "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
)
LAUNCHER_GIT_BLOB = "798907b18c73ee2cc1dea0fe05b36f27ab4137a7"

NATIVE_BYTES = 726_976
NATIVE_SHA256 = (
    "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
)

QUALIFICATION_OLD_LOCK = (
    "voidbuye2dormantbootstraplock3_"
    "5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
)
QUALIFICATION_NEW_LOCK = BOOTSTRAP_LOCK_ID
QUALIFICATION_NEW_CAND = BOOTSTRAP_CANDIDATE_ID
QUALIFICATION_NEW_BOOTSTRAP_SHA256 = BOOTSTRAP_SHA256
QUALIFICATION_NEW_MANIFEST_SHA256 = (
    "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9"
)
QUALIFICATION_OLD_BOOTSTRAP_SHA256 = (
    "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
)
QUALIFICATION_OLD_MANIFEST_SHA256 = (
    "aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"
)

HEX40 = re.compile(r"^[0-9a-f]{40}$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")
MAX_PLANNER_OUTPUT_BYTES = 2 * 1024 * 1024

AUTHORITY_FALSE_KEYS = (
    "bootstrap_execution_performed",
    "protected_installer_apply_performed",
    "filesystem_write",
    "protected_filesystem_mutation",
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
)


class ContractError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def _read_stable(path: Path) -> bytes:
    raw_path = str(path)
    if not path.is_absolute() or os.path.normpath(raw_path) != raw_path:
        raise ContractError("planner_output_path_not_normalized_absolute")
    try:
        before = path.lstat()
    except OSError as exc:
        raise ContractError("planner_output_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > MAX_PLANNER_OUTPUT_BYTES
    ):
        raise ContractError("planner_output_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if (
            opened.st_dev != before.st_dev
            or opened.st_ino != before.st_ino
            or opened.st_size != before.st_size
            or opened.st_mtime_ns != before.st_mtime_ns
            or opened.st_ctime_ns != before.st_ctime_ns
        ):
            raise ContractError("planner_output_rebound")
        chunks: list[bytes] = []
        remaining = opened.st_size
        while remaining:
            chunk = os.read(fd, min(65536, remaining))
            if not chunk:
                raise ContractError("planner_output_short_read")
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise ContractError("planner_output_grew")
        after = os.fstat(fd)
        visible = path.lstat()
        for key in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
            if getattr(after, key) != getattr(opened, key):
                raise ContractError("planner_output_changed_during_read")
            if getattr(visible, key) != getattr(after, key):
                raise ContractError("planner_output_visible_generation_changed")
    finally:
        os.close(fd)
    return b"".join(chunks)


def _planner_lines(raw: bytes) -> dict[str, str]:
    try:
        text = raw.decode("ascii")
    except UnicodeDecodeError as exc:
        raise ContractError("planner_output_not_ascii") from exc
    if not text.endswith("\n"):
        raise ContractError("planner_output_framing_invalid")
    lines = text.splitlines()
    if not lines or lines[0] != PLANNER_MARKER:
        raise ContractError("planner_marker_invalid")
    values: dict[str, str] = {}
    for line in lines[1:]:
        if not line or "=" not in line:
            raise ContractError("planner_output_line_invalid")
        key, value = line.split("=", 1)
        if not key or key in values:
            raise ContractError("planner_output_duplicate_or_empty_key")
        values[key] = value
    return values


def _require_bool_line(values: dict[str, str], key: str, expected: bool) -> None:
    want = "true" if expected else "false"
    if values.get(key) != want:
        raise ContractError("planner_line_mismatch:" + key)


def _require_false_authority(body: dict[str, Any]) -> None:
    for key in AUTHORITY_FALSE_KEYS:
        if body.get(key) is not False:
            raise ContractError("planner_authority_overclaim:" + key)


def _validate_qualification_contract(
    contract: object,
    expected_head: str,
) -> dict[str, Any]:
    if not isinstance(contract, dict):
        raise ContractError("qualification_contract_invalid")
    exact = {
        "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "expected_head": expected_head,
        "root_execution_required": False,
        "nonroot_execution_required": True,
        "protected_state_read_only_required": True,
        "temporary_git_metadata_write_required": True,
        "temporary_git_metadata_cleanup_required": True,
        "qualification_git_callbacks_neutralized_required": True,
        "descriptor_bound_source_execution_required": True,
    }
    for key, expected in exact.items():
        if contract.get(key) != expected:
            raise ContractError("qualification_contract_mismatch:" + key)

    required = contract.get("required_result")
    if not isinstance(required, dict):
        raise ContractError("qualification_required_result_invalid")
    expected_result = {
        "expected_head": expected_head,
        "protected_state": BOOTSTRAP_GREEN_STATE,
        "old_lock_id": QUALIFICATION_OLD_LOCK,
        "new_lock_id": QUALIFICATION_NEW_LOCK,
        "new_candidate_id": QUALIFICATION_NEW_CAND,
        "repaired_fixed_root_verified": True,
        "predecessor_retained_verified": True,
        "upgrade_stage_absent_verified": True,
        "repaired_bootstrap_sha256": QUALIFICATION_NEW_BOOTSTRAP_SHA256,
        "repaired_manifest_sha256": QUALIFICATION_NEW_MANIFEST_SHA256,
        "predecessor_bootstrap_sha256": QUALIFICATION_OLD_BOOTSTRAP_SHA256,
        "predecessor_manifest_sha256": QUALIFICATION_OLD_MANIFEST_SHA256,
        "temporary_git_metadata_write_required": True,
        "temporary_git_metadata_write_performed": True,
        "temporary_git_metadata_cleanup_completed": True,
        "qualification_git_callbacks_neutralized": True,
        "source_repository_mutation": False,
        "source_object_fetch": False,
        "repository_config_loaded": False,
        "repository_callback_execution": False,
        "native_parent_authority_claimed": False,
        "protected_filesystem_mutation": False,
        "bootstrap_execution": False,
        "inner_installer_execution": False,
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
    }
    for key, expected in expected_result.items():
        if required.get(key) != expected:
            raise ContractError("qualification_required_result_mismatch:" + key)
    # The qualifier truthfully uses a private temporary Git directory.
    if required.get("filesystem_write") is not True:
        raise ContractError("qualification_temporary_write_truth_missing")
    return contract


def _artifact(
    value: object,
    *,
    label: str,
    expected_bytes: int,
    expected_sha256: str,
    expected_git_blob: str | None,
) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ContractError(label + "_invalid")
    if value.get("bytes") != expected_bytes:
        raise ContractError(label + "_bytes_mismatch")
    if value.get("sha256") != expected_sha256:
        raise ContractError(label + "_sha256_mismatch")
    if expected_git_blob is not None and value.get("git_blob_sha1") != expected_git_blob:
        raise ContractError(label + "_git_blob_mismatch")
    path_value = value.get("path")
    if not isinstance(path_value, str) or not path_value.startswith("/"):
        raise ContractError(label + "_path_invalid")
    return value


def validate_planner_output(raw: bytes) -> dict[str, Any]:
    values = _planner_lines(raw)
    if values.get("mode") != "plan":
        raise ContractError("planner_mode_invalid")
    _require_bool_line(values, "read_only", True)
    _require_bool_line(values, "nonroot_required", True)
    _require_bool_line(values, "installed_qualification_performed", False)
    _require_bool_line(values, "installed_qualification_required_before_bootstrap_plan", True)
    _require_bool_line(values, "qualification_nonroot_execution_required", True)
    _require_bool_line(values, "qualification_protected_state_read_only_required", True)
    _require_bool_line(values, "qualification_temporary_git_metadata_write_required", True)
    _require_bool_line(values, "qualification_git_callbacks_neutralized_required", True)
    _require_bool_line(values, "qualification_descriptor_bound_source_execution_required", True)
    _require_bool_line(values, "expected_installed_bootstrap_identity_bound", True)
    _require_bool_line(values, "accepted_launcher_identity_green", True)
    _require_bool_line(values, "launcher_runtime_head_contract_accepted", True)
    _require_bool_line(values, "launcher_superseded_v1_lock_install_authority", False)
    _require_bool_line(values, "accepted_native_identity_green", True)
    for key in (
        "bootstrap_execution_performed",
        "protected_installer_apply_performed",
        "filesystem_write",
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
    ):
        _require_bool_line(values, key, False)

    plan_id = values.get("plan_id", "")
    if (
        not plan_id.startswith(PLANNER_PREFIX)
        or len(plan_id) != len(PLANNER_PREFIX) + 64
        or HEX64.fullmatch(plan_id[len(PLANNER_PREFIX):]) is None
    ):
        raise ContractError("planner_plan_id_invalid")

    try:
        body = json.loads(values["plan_body_json"])
    except (KeyError, json.JSONDecodeError) as exc:
        raise ContractError("planner_body_invalid") from exc
    if not isinstance(body, dict):
        raise ContractError("planner_body_not_object")
    if canonical(body).decode("ascii") != values["plan_body_json"]:
        raise ContractError("planner_body_not_canonical")
    if plan_id != PLANNER_PREFIX + sha256(canonical(body)):
        raise ContractError("planner_plan_id_body_mismatch")
    if body.get("schema") != PLANNER_SCHEMA or body.get("version") != 7:
        raise ContractError("planner_schema_invalid")

    expected_head = body.get("expected_head")
    if not isinstance(expected_head, str) or HEX40.fullmatch(expected_head) is None:
        raise ContractError("planner_expected_head_invalid")
    if values.get("expected_head") != expected_head:
        raise ContractError("planner_expected_head_line_mismatch")
    if body.get("qualifier_git_blob_sha1") != QUALIFIER_BLOB:
        raise ContractError("planner_qualifier_blob_mismatch")
    if values.get("qualifier_git_blob_sha1") != QUALIFIER_BLOB:
        raise ContractError("planner_qualifier_line_mismatch")
    _require_false_authority(body)

    installed = body.get("expected_installed_bootstrap")
    if not isinstance(installed, dict):
        raise ContractError("installed_bootstrap_identity_invalid")
    expected_installed = {
        "lock_id": BOOTSTRAP_LOCK_ID,
        "candidate_id": BOOTSTRAP_CANDIDATE_ID,
        "bytes": BOOTSTRAP_BYTES,
        "sha256": BOOTSTRAP_SHA256,
        "git_blob_sha1": BOOTSTRAP_GIT_BLOB,
    }
    for key, expected in expected_installed.items():
        if installed.get(key) != expected:
            raise ContractError("installed_bootstrap_identity_mismatch:" + key)

    if body.get("accepted_launcher_lock_id") != LAUNCHER_LOCK_ID:
        raise ContractError("launcher_lock_id_mismatch")
    if body.get("accepted_launcher_candidate_id") != LAUNCHER_CANDIDATE_ID:
        raise ContractError("launcher_candidate_id_mismatch")
    if body.get("launcher_runtime_head_contract_accepted") is not True:
        raise ContractError("launcher_runtime_head_contract_missing")
    if body.get("launcher_superseded_v1_lock_install_authority") is not False:
        raise ContractError("launcher_historical_authority_overclaim")

    launcher = _artifact(
        body.get("accepted_launcher"),
        label="accepted_launcher",
        expected_bytes=LAUNCHER_BYTES,
        expected_sha256=LAUNCHER_SHA256,
        expected_git_blob=LAUNCHER_GIT_BLOB,
    )
    native = _artifact(
        body.get("accepted_native"),
        label="accepted_native",
        expected_bytes=NATIVE_BYTES,
        expected_sha256=NATIVE_SHA256,
        expected_git_blob=None,
    )
    contract = _validate_qualification_contract(
        body.get("qualification_contract"),
        expected_head,
    )

    argv = body.get("bootstrap_argv")
    if not isinstance(argv, list) or len(argv) != 8 or not all(
        isinstance(item, str) for item in argv
    ):
        raise ContractError("bootstrap_argv_invalid")
    expected_argv = [
        BOOTSTRAP_PATH,
        "--installer-plan",
        "--launcher",
        str(launcher["path"]),
        "--native",
        str(native["path"]),
        "--expected-head",
        expected_head,
    ]
    if argv != expected_argv:
        raise ContractError("bootstrap_argv_mismatch")
    try:
        emitted_argv = json.loads(values["bootstrap_argv_json"])
        emitted_contract = json.loads(values["qualification_contract_json"])
    except (KeyError, json.JSONDecodeError) as exc:
        raise ContractError("planner_structured_output_invalid") from exc
    if emitted_argv != argv:
        raise ContractError("planner_argv_line_mismatch")
    if emitted_contract != contract:
        raise ContractError("planner_qualification_line_mismatch")
    if values.get("accepted_launcher_lock_id") != LAUNCHER_LOCK_ID:
        raise ContractError("planner_launcher_lock_line_mismatch")
    if values.get("accepted_launcher_candidate_id") != LAUNCHER_CANDIDATE_ID:
        raise ContractError("planner_launcher_candidate_line_mismatch")

    return {
        "planner_plan_id": plan_id,
        "planner_body": body,
        "expected_head": expected_head,
        "qualification_contract": contract,
        "bootstrap_argv": argv,
        "launcher": launcher,
        "native": native,
    }


def execution_contract(validated: dict[str, Any]) -> dict[str, Any]:
    expected_head = validated["expected_head"]
    body = {
        "schema": SCHEMA,
        "version": 1,
        "planner_source_path": PLANNER_REL,
        "planner_source_git_blob_sha1": PLANNER_BLOB,
        "planner_proof_path": PLANNER_PROOF_REL,
        "planner_proof_git_blob_sha1": PLANNER_PROOF_BLOB,
        "planner_plan_id": validated["planner_plan_id"],
        "planner_body_sha256": sha256(canonical(validated["planner_body"])),
        "expected_head": expected_head,
        "qualification_phase": {
            "ordinal": 1,
            "run_as": "nonroot",
            "source_path": QUALIFIER_REL,
            "source_git_blob_sha1": QUALIFIER_BLOB,
            "source_execution_mode": "descriptor_bound_exact_git_object",
            "git_callbacks_neutralized_required": True,
            "interpreter": FIXED_PYTHON,
            "argv_suffix": ["--run", "--expected-head", expected_head],
            "required_contract": validated["qualification_contract"],
            "green_required_before_phase_2": True,
        },
        "root_bootstrap_plan_phase": {
            "ordinal": 2,
            "run_as": "root",
            "installed_bootstrap_path": BOOTSTRAP_PATH,
            "argv": validated["bootstrap_argv"],
            "qualification_green_required": True,
            "root_boundary_implementation":
                "separately_reviewed_operator_boundary_required",
        },
        "phase_order_exact": True,
        "qualification_execution_performed": False,
        "bootstrap_execution_performed": False,
        "protected_installer_apply_performed": False,
        "root_boundary_execution_performed": False,
        "filesystem_write": False,
        "protected_filesystem_mutation": False,
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
    }
    return {
        "contract_id": CONTRACT_PREFIX + sha256(canonical(body)),
        "body": body,
    }


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("planner_git_blob_sha1=" + PLANNER_BLOB)
    print("planner_proof_git_blob_sha1=" + PLANNER_PROOF_BLOB)
    print("qualifier_git_blob_sha1=" + QUALIFIER_BLOB)
    print("phase_order=nonroot_qualification_then_root_bootstrap_plan")
    print("qualification_source_execution_mode=descriptor_bound_exact_git_object")
    print("qualification_git_callbacks_neutralized_required=true")
    print("root_boundary_implementation=separately_reviewed_operator_boundary_required")
    print("qualification_execution_performed=false")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("root_boundary_execution_performed=false")
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


def emit_plan(result: dict[str, Any]) -> None:
    body = result["body"]
    expected_id = CONTRACT_PREFIX + sha256(canonical(body))
    if result["contract_id"] != expected_id:
        raise ContractError("execution_contract_id_mismatch")
    print(MARKER)
    print("mode=plan")
    print("status=GREEN")
    print("read_only=true")
    print("contract_id=" + result["contract_id"])
    print("contract_body_json=" + canonical(body).decode("ascii"))
    print("planner_plan_id=" + str(body["planner_plan_id"]))
    print("expected_head=" + str(body["expected_head"]))
    print("phase_order=nonroot_qualification_then_root_bootstrap_plan")
    print("qualification_source_git_blob_sha1=" + QUALIFIER_BLOB)
    print("qualification_source_execution_mode=descriptor_bound_exact_git_object")
    print("qualification_git_callbacks_neutralized_required=true")
    print("qualification_green_required_before_phase_2=true")
    print("root_boundary_implementation=separately_reviewed_operator_boundary_required")
    print(
        "root_bootstrap_plan_argv_json="
        + json.dumps(
            body["root_bootstrap_plan_phase"]["argv"],
            separators=(",", ":"),
        )
    )
    print("qualification_execution_performed=false")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("root_boundary_execution_performed=false")
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
    print(
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALLER_BOOTSTRAP_V7_EXECUTE_QUALIFICATION_AND_ROOT_PLAN"
    )


def _fixture_output() -> bytes:
    head = "a" * 40
    launcher = {
        "path": "/tmp/accepted-launcher",
        "bytes": LAUNCHER_BYTES,
        "sha256": LAUNCHER_SHA256,
        "git_blob_sha1": LAUNCHER_GIT_BLOB,
    }
    native = {
        "path": "/tmp/accepted-native",
        "bytes": NATIVE_BYTES,
        "sha256": NATIVE_SHA256,
    }
    qcontract = {
        "qualifier_source_path": "/fixture/" + QUALIFIER_REL,
        "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "qualifier_upgrader_git_blob_sha1": "1" * 40,
        "qualifier_upgrade_plan_git_blob_sha1": "2" * 40,
        "expected_head": head,
        "root_execution_required": False,
        "nonroot_execution_required": True,
        "protected_state_read_only_required": True,
        "temporary_git_metadata_write_required": True,
        "temporary_git_metadata_cleanup_required": True,
        "qualification_git_callbacks_neutralized_required": True,
        "descriptor_bound_source_execution_required": True,
        "interpreter": {"path": FIXED_PYTHON},
        "git_tool": {"path": "/usr/bin/git"},
        "required_result": {
            "expected_head": head,
            "protected_state": BOOTSTRAP_GREEN_STATE,
            "old_lock_id": QUALIFICATION_OLD_LOCK,
            "new_lock_id": QUALIFICATION_NEW_LOCK,
            "new_candidate_id": QUALIFICATION_NEW_CAND,
            "repaired_fixed_root_verified": True,
            "predecessor_retained_verified": True,
            "upgrade_stage_absent_verified": True,
            "repaired_bootstrap_sha256": QUALIFICATION_NEW_BOOTSTRAP_SHA256,
            "repaired_manifest_sha256": QUALIFICATION_NEW_MANIFEST_SHA256,
            "predecessor_bootstrap_sha256": QUALIFICATION_OLD_BOOTSTRAP_SHA256,
            "predecessor_manifest_sha256": QUALIFICATION_OLD_MANIFEST_SHA256,
            "temporary_git_metadata_write_required": True,
            "temporary_git_metadata_write_performed": True,
            "temporary_git_metadata_cleanup_completed": True,
            "qualification_git_callbacks_neutralized": True,
            "source_repository_mutation": False,
            "source_object_fetch": False,
            "repository_config_loaded": False,
            "repository_callback_execution": False,
            "native_parent_authority_claimed": False,
            "filesystem_write": True,
            "protected_filesystem_mutation": False,
            "bootstrap_execution": False,
            "inner_installer_execution": False,
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
        },
    }
    argv = [
        BOOTSTRAP_PATH,
        "--installer-plan",
        "--launcher",
        launcher["path"],
        "--native",
        native["path"],
        "--expected-head",
        head,
    ]
    body = {
        "schema": PLANNER_SCHEMA,
        "version": 7,
        "checkout": {"head": head},
        "expected_head": head,
        "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "qualification_contract": qcontract,
        "installed_qualification_performed": False,
        "installed_qualification_required_before_bootstrap_plan": True,
        "expected_installed_bootstrap": {
            "lock_id": BOOTSTRAP_LOCK_ID,
            "candidate_id": BOOTSTRAP_CANDIDATE_ID,
            "bytes": BOOTSTRAP_BYTES,
            "sha256": BOOTSTRAP_SHA256,
            "git_blob_sha1": BOOTSTRAP_GIT_BLOB,
            "manifest_bytes": 2382,
            "manifest_sha256": QUALIFICATION_NEW_MANIFEST_SHA256,
            "manifest_git_blob_sha1": "de56bacb30bea0adc418e240cf3fb8d900b061ef",
        },
        "accepted_launcher": launcher,
        "accepted_launcher_lock_id": LAUNCHER_LOCK_ID,
        "accepted_launcher_candidate_id": LAUNCHER_CANDIDATE_ID,
        "launcher_runtime_head_contract_accepted": True,
        "launcher_superseded_v1_lock_install_authority": False,
        "accepted_native": native,
        "bootstrap_argv": argv,
        "bootstrap_execution_performed": False,
        "protected_installer_apply_performed": False,
        "filesystem_write": False,
        "protected_filesystem_mutation": False,
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
    }
    plan_id = PLANNER_PREFIX + sha256(canonical(body))
    lines = [
        PLANNER_MARKER,
        "mode=plan",
        "read_only=true",
        "nonroot_required=true",
        "plan_id=" + plan_id,
        "plan_body_json=" + canonical(body).decode("ascii"),
        "expected_head=" + head,
        "qualifier_git_blob_sha1=" + QUALIFIER_BLOB,
        "installed_qualification_performed=false",
        "installed_qualification_required_before_bootstrap_plan=true",
        "qualification_nonroot_execution_required=true",
        "qualification_protected_state_read_only_required=true",
        "qualification_temporary_git_metadata_write_required=true",
        "qualification_git_callbacks_neutralized_required=true",
        "qualification_descriptor_bound_source_execution_required=true",
        "expected_installed_bootstrap_identity_bound=true",
        "accepted_launcher_identity_green=true",
        "accepted_launcher_lock_id=" + LAUNCHER_LOCK_ID,
        "accepted_launcher_candidate_id=" + LAUNCHER_CANDIDATE_ID,
        "launcher_runtime_head_contract_accepted=true",
        "launcher_superseded_v1_lock_install_authority=false",
        "accepted_native_identity_green=true",
        "bootstrap_execution_performed=false",
        "protected_installer_apply_performed=false",
        "filesystem_write=false",
        "service_mutation=false",
        "systemd_mutation=false",
        "credential_access=false",
        "private_key_access=false",
        "signing=false",
        "transaction=false",
        "rpc_call=false",
        "payment_acceptance=false",
        "public_presale_activation=false",
        "wc_void_market_activation=false",
        "treasury_liquidity_action=false",
        "funds_movement=false",
        "production_host_evidence_authority=false",
        "bootstrap_argv_json=" + json.dumps(argv, separators=(",", ":")),
        "qualification_contract_json="
        + json.dumps(qcontract, sort_keys=True, separators=(",", ":")),
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALLER_BOOTSTRAP_V7_QUALIFY_AND_EXECUTE_PLAN",
    ]
    return ("\n".join(lines) + "\n").encode("ascii")


def self_test() -> None:
    valid = validate_planner_output(_fixture_output())
    result = execution_contract(valid)
    if not result["contract_id"].startswith(CONTRACT_PREFIX):
        raise AssertionError("contract_prefix_invalid")
    if result["body"]["phase_order_exact"] is not True:
        raise AssertionError("phase_order_missing")
    if (
        result["body"]["qualification_phase"]["run_as"] != "nonroot"
        or result["body"]["root_bootstrap_plan_phase"]["run_as"] != "root"
    ):
        raise AssertionError("privilege_split_invalid")
    if (
        result["body"]["qualification_phase"]["source_execution_mode"]
        != "descriptor_bound_exact_git_object"
    ):
        raise AssertionError("qualification_source_mode_invalid")
    if result["body"]["qualification_phase"]["git_callbacks_neutralized_required"] is not True:
        raise AssertionError("qualification_callback_neutralization_missing")
    tampered = json.loads(canonical(valid["planner_body"]))
    tampered["funds_movement"] = True
    try:
        _require_false_authority(tampered)
    except ContractError:
        pass
    else:
        raise AssertionError("authority_tamper_accepted")
    print(MARKER + "_SELF_TEST_GREEN")
    print("planner_v7_generation_bound=true")
    print("planner_plan_id_recomputed=true")
    print("planner_body_canonical_required=true")
    print("qualification_contract_exact=true")
    print("qualification_nonroot_required=true")
    print("qualification_descriptor_bound_git_object_required=true")
    print("qualification_git_callbacks_neutralized_required=true")
    print("qualification_green_required_before_root_plan=true")
    print("root_bootstrap_plan_phase_required=true")
    print("root_boundary_implementation_separate=true")
    print("phase_order_exact=true")
    print("execution_not_performed=true")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    parser.add_argument("--planner-output", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if not args.planner_output:
        raise ContractError("planner_output_required")
    raw = _read_stable(Path(args.planner_output))
    emit_plan(execution_contract(validate_planner_output(raw)))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ContractError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("automatic_retry=false")
        print("qualification_execution_performed=false")
        print("bootstrap_execution_performed=false")
        print("protected_installer_apply_performed=false")
        print("root_boundary_execution_performed=false")
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
        raise SystemExit(2)
