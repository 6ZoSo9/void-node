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
PLANNER_BLOB = "597dd61923d349980cd30bcf190fee354ff1c1f2"
PLANNER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v7.py"
)
PLANNER_PROOF_BLOB = "656075f1941e9cca302ebfd40efad09d979b4f25"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_repaired_installed_qualification_v1.py"
)
QUALIFIER_BLOB = "132e03eaea440f3f8c59aeaca879596c677c6bcf"
QUALIFIER_UPGRADER_BLOB = "d4b298dea73a4970987bf22435be3e76a5e7a02d"
QUALIFIER_UPGRADE_PLAN_BLOB = "9ba10aac284da9e44db0ad258348425cfa3c2e2c"
FIXED_PYTHON = "/usr/bin/python3"
FIXED_GIT = "/usr/bin/git"
ROOT = Path(__file__).resolve().parents[2]

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
BOOTSTRAP_MANIFEST_BYTES = 2_382
BOOTSTRAP_MANIFEST_GIT_BLOB = "de56bacb30bea0adc418e240cf3fb8d900b061ef"
QUALIFICATION_OLD_BOOTSTRAP_SHA256 = (
    "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
)
QUALIFICATION_OLD_MANIFEST_SHA256 = (
    "aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"
)

HEX40 = re.compile(r"^[0-9a-f]{40}$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")
MAX_PLANNER_OUTPUT_BYTES = 2 * 1024 * 1024

PLANNER_BODY_KEYS = frozenset({
    "schema", "version", "checkout", "expected_head",
    "qualifier_git_blob_sha1", "qualification_contract",
    "installed_qualification_performed",
    "installed_qualification_required_before_bootstrap_plan",
    "expected_installed_bootstrap", "accepted_launcher",
    "accepted_launcher_lock_id", "accepted_launcher_candidate_id",
    "launcher_runtime_head_contract_accepted",
    "launcher_superseded_v1_lock_install_authority",
    "accepted_native", "bootstrap_argv",
    "bootstrap_execution_performed", "protected_installer_apply_performed",
    "filesystem_write", "protected_filesystem_mutation",
    "service_mutation", "systemd_mutation", "credential_access",
    "private_key_access", "signing", "transaction", "rpc_call",
    "payment_acceptance", "public_presale_activation",
    "wc_void_market_activation", "treasury_liquidity_action",
    "funds_movement", "production_host_evidence_authority",
})
CHECKOUT_KEYS = frozenset({"head", "tree", "branch", "generation_sha256"})
INSTALLED_BOOTSTRAP_KEYS = frozenset({
    "lock_id", "candidate_id", "bytes", "sha256", "git_blob_sha1",
    "manifest_bytes", "manifest_sha256", "manifest_git_blob_sha1",
})
ARTIFACT_KEYS = frozenset({
    "path", "bytes", "sha256", "git_blob_sha1", "mode",
    "uid", "gid", "dev", "ino",
})
TOOL_IDENTITY_KEYS = frozenset({
    "path", "resolved_path", "bytes", "sha256", "mode",
    "uid", "gid", "dev", "ino",
})
QUALIFICATION_CONTRACT_KEYS = frozenset({
    "qualifier_source_path", "qualifier_git_blob_sha1",
    "qualifier_upgrader_git_blob_sha1", "qualifier_upgrade_plan_git_blob_sha1",
    "expected_head", "root_execution_required", "nonroot_execution_required",
    "protected_state_read_only_required", "temporary_git_metadata_write_required",
    "temporary_git_metadata_cleanup_required",
    "qualification_git_callbacks_neutralized_required",
    "preliminary_git_local_config_isolation_required",
    "preliminary_git_lazy_fetch_disabled_required",
    "preliminary_git_protocols_denied_required",
    "preliminary_git_object_alternates_rejection_required",
    "descriptor_bound_source_execution_required",
    "interpreter", "git_tool", "required_result",
})
QUALIFICATION_REQUIRED_RESULT_KEYS = frozenset({
    "expected_head", "protected_state", "old_lock_id", "new_lock_id",
    "new_candidate_id", "repaired_fixed_root_verified",
    "predecessor_retained_verified", "upgrade_stage_absent_verified",
    "repaired_bootstrap_sha256", "repaired_manifest_sha256",
    "predecessor_bootstrap_sha256", "predecessor_manifest_sha256",
    "temporary_git_metadata_write_required",
    "temporary_git_metadata_write_performed",
    "temporary_git_metadata_cleanup_completed",
    "qualification_git_callbacks_neutralized",
    "preliminary_git_local_config_isolated",
    "preliminary_git_lazy_fetch_disabled",
    "preliminary_git_protocols_denied",
    "preliminary_git_object_alternates_rejected",
    "source_repository_mutation", "source_object_fetch",
    "repository_config_loaded", "repository_callback_execution",
    "native_parent_authority_claimed", "filesystem_write",
    "protected_filesystem_mutation", "bootstrap_execution",
    "inner_installer_execution", "service_mutation", "credential_access",
    "private_key_access", "signing", "transaction", "rpc_call",
    "payment_acceptance", "public_presale_activation",
    "wc_void_market_activation", "treasury_liquidity_action",
    "funds_movement", "production_host_evidence_authority",
})
PLANNER_OUTPUT_KEYS = frozenset({
    "mode", "read_only", "nonroot_required", "plan_id", "plan_body_json",
    "expected_head", "qualifier_git_blob_sha1",
    "installed_qualification_performed",
    "installed_qualification_required_before_bootstrap_plan",
    "qualification_nonroot_execution_required",
    "qualification_protected_state_read_only_required",
    "qualification_temporary_git_metadata_write_required",
    "qualification_git_callbacks_neutralized_required",
    "qualification_preliminary_git_local_config_isolation_required",
    "qualification_preliminary_git_lazy_fetch_disabled_required",
    "qualification_preliminary_git_protocols_denied_required",
    "qualification_preliminary_git_object_alternates_rejection_required",
    "qualification_descriptor_bound_source_execution_required",
    "expected_installed_bootstrap_identity_bound",
    "accepted_launcher_identity_green", "accepted_launcher_lock_id",
    "accepted_launcher_candidate_id", "launcher_runtime_head_contract_accepted",
    "launcher_superseded_v1_lock_install_authority",
    "accepted_native_identity_green", "bootstrap_execution_performed",
    "protected_installer_apply_performed", "filesystem_write",
    "service_mutation", "systemd_mutation", "credential_access",
    "private_key_access", "signing", "transaction", "rpc_call",
    "payment_acceptance", "public_presale_activation",
    "wc_void_market_activation", "treasury_liquidity_action",
    "funds_movement", "production_host_evidence_authority",
    "bootstrap_argv_json", "qualification_contract_json", "next_action",
})

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
    try:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    except OSError as exc:
        raise ContractError("planner_output_open_failed") from exc
    try:
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
        except OSError as exc:
            raise ContractError("planner_output_io_failed") from exc
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


def _require_exact_keys(
    value: dict[str, Any],
    expected: frozenset[str],
    label: str,
) -> None:
    if frozenset(value.keys()) != expected:
        raise ContractError(label + "_keys_invalid")


def _plain_int(value: object, minimum: int = 0) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= minimum


def _normalized_absolute(value: object) -> bool:
    return (
        isinstance(value, str)
        and value.startswith("/")
        and "\n" not in value
        and "\r" not in value
        and os.path.normpath(value) == value
    )


def _validate_checkout(value: object, expected_head: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ContractError("planner_checkout_invalid")
    _require_exact_keys(value, CHECKOUT_KEYS, "planner_checkout")
    if value["head"] != expected_head:
        raise ContractError("planner_checkout_head_mismatch")
    if not isinstance(value["tree"], str) or HEX40.fullmatch(value["tree"]) is None:
        raise ContractError("planner_checkout_tree_invalid")
    if value["branch"] != "main":
        raise ContractError("planner_checkout_branch_invalid")
    if (
        not isinstance(value["generation_sha256"], str)
        or HEX64.fullmatch(value["generation_sha256"]) is None
    ):
        raise ContractError("planner_checkout_generation_invalid")
    return value


def _validate_tool_identity(
    value: object,
    *,
    label: str,
    expected_path: str,
    maximum: int,
) -> None:
    if not isinstance(value, dict):
        raise ContractError(label + "_identity_invalid")
    _require_exact_keys(value, TOOL_IDENTITY_KEYS, label + "_identity")
    if value["path"] != expected_path:
        raise ContractError(label + "_path_mismatch")
    if not _normalized_absolute(value["resolved_path"]):
        raise ContractError(label + "_resolved_path_invalid")
    if not _plain_int(value["bytes"], 1) or value["bytes"] > maximum:
        raise ContractError(label + "_bytes_invalid")
    if not isinstance(value["sha256"], str) or HEX64.fullmatch(value["sha256"]) is None:
        raise ContractError(label + "_sha256_invalid")
    mode = value["mode"]
    if (
        not isinstance(mode, str)
        or re.fullmatch(r"[0-7]{4}", mode) is None
        or int(mode, 8) & 0o022
    ):
        raise ContractError(label + "_mode_invalid")
    if value["uid"] != 0:
        raise ContractError(label + "_uid_invalid")
    for key in ("gid", "dev", "ino"):
        if not _plain_int(value[key], 0 if key != "ino" else 1):
            raise ContractError(label + "_" + key + "_invalid")


def _validate_qualification_contract(
    contract: object,
    expected_head: str,
) -> dict[str, Any]:
    if not isinstance(contract, dict):
        raise ContractError("qualification_contract_invalid")
    _require_exact_keys(contract, QUALIFICATION_CONTRACT_KEYS, "qualification_contract")

    expected_source = str(ROOT / QUALIFIER_REL)
    if contract["qualifier_source_path"] != expected_source:
        raise ContractError("qualification_contract_mismatch:qualifier_source_path")

    exact = {
        "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "qualifier_upgrader_git_blob_sha1": QUALIFIER_UPGRADER_BLOB,
        "qualifier_upgrade_plan_git_blob_sha1": QUALIFIER_UPGRADE_PLAN_BLOB,
        "expected_head": expected_head,
        "root_execution_required": False,
        "nonroot_execution_required": True,
        "protected_state_read_only_required": True,
        "temporary_git_metadata_write_required": True,
        "temporary_git_metadata_cleanup_required": True,
        "qualification_git_callbacks_neutralized_required": True,
        "preliminary_git_local_config_isolation_required": True,
        "preliminary_git_lazy_fetch_disabled_required": True,
        "preliminary_git_protocols_denied_required": True,
        "preliminary_git_object_alternates_rejection_required": True,
        "descriptor_bound_source_execution_required": True,
    }
    for key, expected in exact.items():
        if isinstance(expected, bool):
            if contract[key] is not expected:
                raise ContractError(
                    "qualification_contract_boolean_type_mismatch:" + key
                )
        elif contract[key] != expected:
            raise ContractError("qualification_contract_mismatch:" + key)

    _validate_tool_identity(
        contract["interpreter"],
        label="qualification_interpreter",
        expected_path=FIXED_PYTHON,
        maximum=512 * 1024 * 1024,
    )
    _validate_tool_identity(
        contract["git_tool"],
        label="qualification_git_tool",
        expected_path=FIXED_GIT,
        maximum=64 * 1024 * 1024,
    )

    required = contract["required_result"]
    if not isinstance(required, dict):
        raise ContractError("qualification_required_result_invalid")
    _require_exact_keys(
        required,
        QUALIFICATION_REQUIRED_RESULT_KEYS,
        "qualification_required_result",
    )
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
        "preliminary_git_local_config_isolated": True,
        "preliminary_git_lazy_fetch_disabled": True,
        "preliminary_git_protocols_denied": True,
        "preliminary_git_object_alternates_rejected": True,
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
    }
    for key, expected in expected_result.items():
        if isinstance(expected, bool):
            if required[key] is not expected:
                raise ContractError(
                    "qualification_required_result_boolean_type_mismatch:" + key
                )
        elif required[key] != expected:
            raise ContractError("qualification_required_result_mismatch:" + key)

    return {**exact, "required_result": dict(required)}

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
    _require_exact_keys(value, ARTIFACT_KEYS, label)
    if not _normalized_absolute(value["path"]):
        raise ContractError(label + "_path_invalid")
    if value["bytes"] != expected_bytes:
        raise ContractError(label + "_bytes_mismatch")
    if value["sha256"] != expected_sha256:
        raise ContractError(label + "_sha256_mismatch")
    git_blob_value = value["git_blob_sha1"]
    if expected_git_blob is not None:
        if git_blob_value != expected_git_blob:
            raise ContractError(label + "_git_blob_mismatch")
    elif not isinstance(git_blob_value, str) or HEX40.fullmatch(git_blob_value) is None:
        raise ContractError(label + "_git_blob_invalid")
    if value["mode"] != "0555":
        raise ContractError(label + "_mode_invalid")
    for key in ("uid", "gid", "dev", "ino"):
        if not _plain_int(value[key], 0 if key != "ino" else 1):
            raise ContractError(label + "_" + key + "_invalid")
    return dict(value)

def validate_planner_output(raw: bytes) -> dict[str, Any]:
    values = _planner_lines(raw)
    if frozenset(values.keys()) != PLANNER_OUTPUT_KEYS:
        raise ContractError("planner_output_keys_invalid")
    if values["mode"] != "plan":
        raise ContractError("planner_mode_invalid")
    _require_bool_line(values, "read_only", True)
    _require_bool_line(values, "nonroot_required", True)
    _require_bool_line(values, "installed_qualification_performed", False)
    _require_bool_line(values, "installed_qualification_required_before_bootstrap_plan", True)
    _require_bool_line(values, "qualification_nonroot_execution_required", True)
    _require_bool_line(values, "qualification_protected_state_read_only_required", True)
    _require_bool_line(values, "qualification_temporary_git_metadata_write_required", True)
    _require_bool_line(values, "qualification_git_callbacks_neutralized_required", True)
    _require_bool_line(values, "qualification_preliminary_git_local_config_isolation_required", True)
    _require_bool_line(values, "qualification_preliminary_git_lazy_fetch_disabled_required", True)
    _require_bool_line(values, "qualification_preliminary_git_protocols_denied_required", True)
    _require_bool_line(values, "qualification_preliminary_git_object_alternates_rejection_required", True)
    _require_bool_line(values, "qualification_descriptor_bound_source_execution_required", True)
    _require_bool_line(values, "expected_installed_bootstrap_identity_bound", True)
    _require_bool_line(values, "accepted_launcher_identity_green", True)
    _require_bool_line(values, "launcher_runtime_head_contract_accepted", True)
    _require_bool_line(values, "launcher_superseded_v1_lock_install_authority", False)
    _require_bool_line(values, "accepted_native_identity_green", True)
    for key in (
        "bootstrap_execution_performed", "protected_installer_apply_performed",
        "filesystem_write", "service_mutation", "systemd_mutation",
        "credential_access", "private_key_access", "signing", "transaction",
        "rpc_call", "payment_acceptance", "public_presale_activation",
        "wc_void_market_activation", "treasury_liquidity_action",
        "funds_movement", "production_host_evidence_authority",
    ):
        _require_bool_line(values, key, False)

    plan_id = values["plan_id"]
    if (
        not plan_id.startswith(PLANNER_PREFIX)
        or len(plan_id) != len(PLANNER_PREFIX) + 64
        or HEX64.fullmatch(plan_id[len(PLANNER_PREFIX):]) is None
    ):
        raise ContractError("planner_plan_id_invalid")

    try:
        body = json.loads(values["plan_body_json"])
    except (ValueError, RecursionError) as exc:
        raise ContractError("planner_body_invalid") from exc
    if not isinstance(body, dict):
        raise ContractError("planner_body_not_object")
    _require_exact_keys(body, PLANNER_BODY_KEYS, "planner_body")
    if canonical(body).decode("ascii") != values["plan_body_json"]:
        raise ContractError("planner_body_not_canonical")
    if plan_id != PLANNER_PREFIX + sha256(canonical(body)):
        raise ContractError("planner_plan_id_body_mismatch")
    if body["schema"] != PLANNER_SCHEMA or body["version"] != 7:
        raise ContractError("planner_schema_invalid")
    if body["installed_qualification_performed"] is not False:
        raise ContractError("planner_body_installed_qualification_performed_invalid")
    if body["installed_qualification_required_before_bootstrap_plan"] is not True:
        raise ContractError("planner_body_qualification_requirement_invalid")

    expected_head = body["expected_head"]
    if not isinstance(expected_head, str) or HEX40.fullmatch(expected_head) is None:
        raise ContractError("planner_expected_head_invalid")
    if values["expected_head"] != expected_head:
        raise ContractError("planner_expected_head_line_mismatch")
    _validate_checkout(body["checkout"], expected_head)
    if body["qualifier_git_blob_sha1"] != QUALIFIER_BLOB:
        raise ContractError("planner_qualifier_blob_mismatch")
    if values["qualifier_git_blob_sha1"] != QUALIFIER_BLOB:
        raise ContractError("planner_qualifier_line_mismatch")
    _require_false_authority(body)

    installed = body["expected_installed_bootstrap"]
    if not isinstance(installed, dict):
        raise ContractError("installed_bootstrap_identity_invalid")
    _require_exact_keys(installed, INSTALLED_BOOTSTRAP_KEYS, "installed_bootstrap_identity")
    expected_installed = {
        "lock_id": BOOTSTRAP_LOCK_ID,
        "candidate_id": BOOTSTRAP_CANDIDATE_ID,
        "bytes": BOOTSTRAP_BYTES,
        "sha256": BOOTSTRAP_SHA256,
        "git_blob_sha1": BOOTSTRAP_GIT_BLOB,
        "manifest_bytes": BOOTSTRAP_MANIFEST_BYTES,
        "manifest_sha256": QUALIFICATION_NEW_MANIFEST_SHA256,
        "manifest_git_blob_sha1": BOOTSTRAP_MANIFEST_GIT_BLOB,
    }
    for key, expected in expected_installed.items():
        if installed[key] != expected:
            raise ContractError("installed_bootstrap_identity_mismatch:" + key)

    if body["accepted_launcher_lock_id"] != LAUNCHER_LOCK_ID:
        raise ContractError("launcher_lock_id_mismatch")
    if body["accepted_launcher_candidate_id"] != LAUNCHER_CANDIDATE_ID:
        raise ContractError("launcher_candidate_id_mismatch")
    if body["launcher_runtime_head_contract_accepted"] is not True:
        raise ContractError("launcher_runtime_head_contract_missing")
    if body["launcher_superseded_v1_lock_install_authority"] is not False:
        raise ContractError("launcher_historical_authority_overclaim")

    launcher = _artifact(
        body["accepted_launcher"], label="accepted_launcher",
        expected_bytes=LAUNCHER_BYTES, expected_sha256=LAUNCHER_SHA256,
        expected_git_blob=LAUNCHER_GIT_BLOB,
    )
    native = _artifact(
        body["accepted_native"], label="accepted_native",
        expected_bytes=NATIVE_BYTES, expected_sha256=NATIVE_SHA256,
        expected_git_blob=None,
    )
    raw_contract = body["qualification_contract"]
    execution_requirements = _validate_qualification_contract(raw_contract, expected_head)

    argv = body["bootstrap_argv"]
    if not isinstance(argv, list) or len(argv) != 8 or not all(isinstance(item, str) for item in argv):
        raise ContractError("bootstrap_argv_invalid")
    expected_argv = [
        BOOTSTRAP_PATH, "--installer-plan", "--launcher", str(launcher["path"]),
        "--native", str(native["path"]), "--expected-head", expected_head,
    ]
    if argv != expected_argv:
        raise ContractError("bootstrap_argv_mismatch")
    try:
        emitted_argv = json.loads(values["bootstrap_argv_json"])
        emitted_contract = json.loads(values["qualification_contract_json"])
    except (ValueError, RecursionError) as exc:
        raise ContractError("planner_structured_output_invalid") from exc
    if emitted_argv != argv:
        raise ContractError("planner_argv_line_mismatch")
    if emitted_contract != raw_contract:
        raise ContractError("planner_qualification_line_mismatch")
    if values["accepted_launcher_lock_id"] != LAUNCHER_LOCK_ID:
        raise ContractError("planner_launcher_lock_line_mismatch")
    if values["accepted_launcher_candidate_id"] != LAUNCHER_CANDIDATE_ID:
        raise ContractError("planner_launcher_candidate_line_mismatch")

    return {
        "planner_plan_id": plan_id,
        "planner_body": body,
        "expected_head": expected_head,
        "qualification_contract": execution_requirements,
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
            "preliminary_git_local_config_isolation_required": True,
            "preliminary_git_lazy_fetch_disabled_required": True,
            "preliminary_git_protocols_denied_required": True,
            "preliminary_git_object_alternates_rejection_required": True,
            "interpreter": FIXED_PYTHON,
            "git_tool": FIXED_GIT,
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
    print("qualification_preliminary_git_local_config_isolation_required=true")
    print("qualification_preliminary_git_lazy_fetch_disabled_required=true")
    print("qualification_preliminary_git_protocols_denied_required=true")
    print("qualification_preliminary_git_object_alternates_rejection_required=true")
    print("planner_body_closed_schema_required=true")
    print("qualification_contract_closed_schema_required=true")
    print("qualification_required_result_closed_schema_required=true")
    print("unconsumed_tool_metadata_not_execution_authority=true")
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
    print("qualification_preliminary_git_local_config_isolation_required=true")
    print("qualification_preliminary_git_lazy_fetch_disabled_required=true")
    print("qualification_preliminary_git_protocols_denied_required=true")
    print("qualification_preliminary_git_object_alternates_rejection_required=true")
    print("planner_body_closed_schema_required=true")
    print("qualification_contract_closed_schema_required=true")
    print("qualification_required_result_closed_schema_required=true")
    print("unconsumed_tool_metadata_not_execution_authority=true")
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
        "path": "/tmp/accepted-launcher", "bytes": LAUNCHER_BYTES,
        "sha256": LAUNCHER_SHA256, "git_blob_sha1": LAUNCHER_GIT_BLOB,
        "mode": "0555", "uid": 1000, "gid": 1000, "dev": 1, "ino": 11,
    }
    native = {
        "path": "/tmp/accepted-native", "bytes": NATIVE_BYTES,
        "sha256": NATIVE_SHA256, "git_blob_sha1": "f" * 40,
        "mode": "0555", "uid": 1000, "gid": 1000, "dev": 1, "ino": 12,
    }
    interpreter = {
        "path": FIXED_PYTHON, "resolved_path": FIXED_PYTHON,
        "bytes": 12345, "sha256": "3" * 64, "mode": "0755",
        "uid": 0, "gid": 0, "dev": 2, "ino": 21,
    }
    git_tool = {
        "path": FIXED_GIT, "resolved_path": FIXED_GIT,
        "bytes": 23456, "sha256": "4" * 64, "mode": "0755",
        "uid": 0, "gid": 0, "dev": 2, "ino": 22,
    }
    qcontract = {
        "qualifier_source_path": str(ROOT / QUALIFIER_REL),
        "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "qualifier_upgrader_git_blob_sha1": QUALIFIER_UPGRADER_BLOB,
        "qualifier_upgrade_plan_git_blob_sha1": QUALIFIER_UPGRADE_PLAN_BLOB,
        "expected_head": head,
        "root_execution_required": False,
        "nonroot_execution_required": True,
        "protected_state_read_only_required": True,
        "temporary_git_metadata_write_required": True,
        "temporary_git_metadata_cleanup_required": True,
        "qualification_git_callbacks_neutralized_required": True,
        "preliminary_git_local_config_isolation_required": True,
        "preliminary_git_lazy_fetch_disabled_required": True,
        "preliminary_git_protocols_denied_required": True,
        "preliminary_git_object_alternates_rejection_required": True,
        "descriptor_bound_source_execution_required": True,
        "interpreter": interpreter,
        "git_tool": git_tool,
        "required_result": {
            "expected_head": head, "protected_state": BOOTSTRAP_GREEN_STATE,
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
            "preliminary_git_local_config_isolated": True,
            "preliminary_git_lazy_fetch_disabled": True,
            "preliminary_git_protocols_denied": True,
            "preliminary_git_object_alternates_rejected": True,
            "source_repository_mutation": False, "source_object_fetch": False,
            "repository_config_loaded": False, "repository_callback_execution": False,
            "native_parent_authority_claimed": False, "filesystem_write": True,
            "protected_filesystem_mutation": False, "bootstrap_execution": False,
            "inner_installer_execution": False, "service_mutation": False,
            "credential_access": False, "private_key_access": False,
            "signing": False, "transaction": False, "rpc_call": False,
            "payment_acceptance": False, "public_presale_activation": False,
            "wc_void_market_activation": False, "treasury_liquidity_action": False,
            "funds_movement": False, "production_host_evidence_authority": False,
        },
    }
    argv = [
        BOOTSTRAP_PATH, "--installer-plan", "--launcher", launcher["path"],
        "--native", native["path"], "--expected-head", head,
    ]
    body = {
        "schema": PLANNER_SCHEMA, "version": 7,
        "checkout": {
            "head": head, "tree": "b" * 40, "branch": "main",
            "generation_sha256": "c" * 64,
        },
        "expected_head": head, "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "qualification_contract": qcontract,
        "installed_qualification_performed": False,
        "installed_qualification_required_before_bootstrap_plan": True,
        "expected_installed_bootstrap": {
            "lock_id": BOOTSTRAP_LOCK_ID, "candidate_id": BOOTSTRAP_CANDIDATE_ID,
            "bytes": BOOTSTRAP_BYTES, "sha256": BOOTSTRAP_SHA256,
            "git_blob_sha1": BOOTSTRAP_GIT_BLOB,
            "manifest_bytes": BOOTSTRAP_MANIFEST_BYTES,
            "manifest_sha256": QUALIFICATION_NEW_MANIFEST_SHA256,
            "manifest_git_blob_sha1": BOOTSTRAP_MANIFEST_GIT_BLOB,
        },
        "accepted_launcher": launcher, "accepted_launcher_lock_id": LAUNCHER_LOCK_ID,
        "accepted_launcher_candidate_id": LAUNCHER_CANDIDATE_ID,
        "launcher_runtime_head_contract_accepted": True,
        "launcher_superseded_v1_lock_install_authority": False,
        "accepted_native": native, "bootstrap_argv": argv,
        "bootstrap_execution_performed": False,
        "protected_installer_apply_performed": False,
        "filesystem_write": False, "protected_filesystem_mutation": False,
        "service_mutation": False, "systemd_mutation": False,
        "credential_access": False, "private_key_access": False,
        "signing": False, "transaction": False, "rpc_call": False,
        "payment_acceptance": False, "public_presale_activation": False,
        "wc_void_market_activation": False, "treasury_liquidity_action": False,
        "funds_movement": False, "production_host_evidence_authority": False,
    }
    plan_id = PLANNER_PREFIX + sha256(canonical(body))
    lines = [
        PLANNER_MARKER, "mode=plan", "read_only=true", "nonroot_required=true",
        "plan_id=" + plan_id,
        "plan_body_json=" + canonical(body).decode("ascii"),
        "expected_head=" + head, "qualifier_git_blob_sha1=" + QUALIFIER_BLOB,
        "installed_qualification_performed=false",
        "installed_qualification_required_before_bootstrap_plan=true",
        "qualification_nonroot_execution_required=true",
        "qualification_protected_state_read_only_required=true",
        "qualification_temporary_git_metadata_write_required=true",
        "qualification_git_callbacks_neutralized_required=true",
        "qualification_preliminary_git_local_config_isolation_required=true",
        "qualification_preliminary_git_lazy_fetch_disabled_required=true",
        "qualification_preliminary_git_protocols_denied_required=true",
        "qualification_preliminary_git_object_alternates_rejection_required=true",
        "qualification_descriptor_bound_source_execution_required=true",
        "expected_installed_bootstrap_identity_bound=true",
        "accepted_launcher_identity_green=true",
        "accepted_launcher_lock_id=" + LAUNCHER_LOCK_ID,
        "accepted_launcher_candidate_id=" + LAUNCHER_CANDIDATE_ID,
        "launcher_runtime_head_contract_accepted=true",
        "launcher_superseded_v1_lock_install_authority=false",
        "accepted_native_identity_green=true", "bootstrap_execution_performed=false",
        "protected_installer_apply_performed=false", "filesystem_write=false",
        "service_mutation=false", "systemd_mutation=false",
        "credential_access=false", "private_key_access=false", "signing=false",
        "transaction=false", "rpc_call=false", "payment_acceptance=false",
        "public_presale_activation=false", "wc_void_market_activation=false",
        "treasury_liquidity_action=false", "funds_movement=false",
        "production_host_evidence_authority=false",
        "bootstrap_argv_json=" + json.dumps(argv, separators=(",", ":")),
        "qualification_contract_json="
        + json.dumps(qcontract, sort_keys=True, separators=(",", ":")),
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALLER_BOOTSTRAP_V7_QUALIFY_AND_EXECUTE_PLAN",
    ]
    return ("\n".join(lines) + "\n").encode("ascii")


def _raw_line_fixture(key: str, value: str) -> bytes:
    lines = _fixture_output().decode("ascii").splitlines()
    prefix = key + "="
    replaced = False
    for index in range(1, len(lines)):
        if lines[index].startswith(prefix):
            lines[index] = prefix + value
            replaced = True
            break
    if not replaced:
        raise AssertionError("fixture_line_missing:" + key)
    return ("\n".join(lines) + "\n").encode("ascii")


def _tampered_fixture(mutator) -> bytes:
    lines = _fixture_output().decode("ascii").splitlines()
    values: dict[str, str] = {}
    order: list[str] = []
    for line in lines[1:]:
        key, value = line.split("=", 1)
        values[key] = value
        order.append(key)
    body = json.loads(values["plan_body_json"])
    mutator(body)
    values["plan_id"] = PLANNER_PREFIX + sha256(canonical(body))
    values["plan_body_json"] = canonical(body).decode("ascii")
    values["bootstrap_argv_json"] = json.dumps(body["bootstrap_argv"], separators=(",", ":"))
    values["qualification_contract_json"] = json.dumps(
        body["qualification_contract"], sort_keys=True, separators=(",", ":")
    )
    return ("\n".join([PLANNER_MARKER] + [key + "=" + values[key] for key in order]) + "\n").encode("ascii")


def _expect_tamper_rejected(mutator) -> None:
    try:
        validate_planner_output(_tampered_fixture(mutator))
    except ContractError:
        return
    raise AssertionError("rehashed_planner_tamper_accepted")

def self_test() -> None:
    valid = validate_planner_output(_fixture_output())
    result = execution_contract(valid)
    if not result["contract_id"].startswith(CONTRACT_PREFIX):
        raise AssertionError("contract_prefix_invalid")
    if result["body"]["phase_order_exact"] is not True:
        raise AssertionError("phase_order_missing")
    phase = result["body"]["qualification_phase"]
    if phase["run_as"] != "nonroot" or result["body"]["root_bootstrap_plan_phase"]["run_as"] != "root":
        raise AssertionError("privilege_split_invalid")
    if phase["source_execution_mode"] != "descriptor_bound_exact_git_object":
        raise AssertionError("qualification_source_mode_invalid")
    if phase["git_callbacks_neutralized_required"] is not True:
        raise AssertionError("qualification_callback_neutralization_missing")
    for key in (
        "preliminary_git_local_config_isolation_required",
        "preliminary_git_lazy_fetch_disabled_required",
        "preliminary_git_protocols_denied_required",
        "preliminary_git_object_alternates_rejection_required",
    ):
        if phase[key] is not True:
            raise AssertionError("qualification_preliminary_git_requirement_missing:" + key)
    if phase["interpreter"] != FIXED_PYTHON or phase["git_tool"] != FIXED_GIT:
        raise AssertionError("qualification_fixed_tool_alias_missing")
    if any(
        key in phase["required_contract"]
        for key in ("interpreter", "git_tool", "qualifier_source_path")
    ):
        raise AssertionError("dynamic_metadata_carried_as_execution_authority")

    _expect_tamper_rejected(
        lambda body: body["qualification_contract"].__setitem__(
            "qualifier_source_path", "/tmp/unreviewed-qualifier.py"
        )
    )
    _expect_tamper_rejected(
        lambda body: body["qualification_contract"].__setitem__(
            "qualifier_upgrader_git_blob_sha1", "5" * 40
        )
    )
    _expect_tamper_rejected(
        lambda body: body["qualification_contract"].__setitem__(
            "qualifier_upgrade_plan_git_blob_sha1", "6" * 40
        )
    )
    _expect_tamper_rejected(
        lambda body: body["qualification_contract"]["interpreter"].__setitem__(
            "path", "/tmp/python"
        )
    )
    _expect_tamper_rejected(
        lambda body: body["qualification_contract"]["git_tool"].__setitem__(
            "path", "/tmp/git"
        )
    )
    _expect_tamper_rejected(
        lambda body: body["qualification_contract"].__setitem__(
            "unexpected_nested_authority", True
        )
    )
    _expect_tamper_rejected(
        lambda body: body["qualification_contract"].__setitem__(
            "root_execution_required", 0
        )
    )
    _expect_tamper_rejected(
        lambda body: body["qualification_contract"].__setitem__(
            "nonroot_execution_required", 1
        )
    )
    _expect_tamper_rejected(
        lambda body: body["qualification_contract"]["required_result"].__setitem__(
            "unexpected_result_authority", True
        )
    )
    _expect_tamper_rejected(
        lambda body: body.__setitem__("unexpected_planner_authority", True)
    )
    _expect_tamper_rejected(
        lambda body: body.__setitem__("installed_qualification_performed", True)
    )
    _expect_tamper_rejected(
        lambda body: body.__setitem__(
            "installed_qualification_required_before_bootstrap_plan", False
        )
    )
    _expect_tamper_rejected(
        lambda body: body["qualification_contract"]["required_result"].__setitem__(
            "service_mutation", 0
        )
    )
    _expect_tamper_rejected(
        lambda body: body["qualification_contract"]["required_result"].__setitem__(
            "repaired_fixed_root_verified", 1
        )
    )

    class _PlannerRaceStat:
        st_mode = stat.S_IFREG | 0o600
        st_nlink = 1
        st_size = 1
        st_dev = 11
        st_ino = 12
        st_mtime_ns = 13
        st_ctime_ns = 14

    class _PlannerRacePath:
        def __init__(self, fail_visible: bool = False):
            self.calls = 0
            self.fail_visible = fail_visible

        def __str__(self) -> str:
            return "/tmp/void-planner-output-race-fixture"

        def is_absolute(self) -> bool:
            return True

        def lstat(self):
            self.calls += 1
            if self.fail_visible and self.calls > 1:
                raise FileNotFoundError("fixture_visible_race")
            return _PlannerRaceStat()

    original_open = os.open
    try:
        def _open_race(*_args, **_kwargs):
            raise FileNotFoundError("fixture_open_race")

        os.open = _open_race
        try:
            _read_stable(_PlannerRacePath())
        except ContractError as exc:
            if str(exc) != "planner_output_open_failed":
                raise
        else:
            raise AssertionError("planner_output_open_race_not_held")
    finally:
        os.open = original_open

    original_open = os.open
    original_fstat = os.fstat
    original_read = os.read
    original_close = os.close
    read_values = [b"x", b""]
    try:
        os.open = lambda *_args, **_kwargs: 91
        os.fstat = lambda _fd: _PlannerRaceStat()
        os.read = lambda _fd, _size: read_values.pop(0)
        os.close = lambda _fd: None
        try:
            _read_stable(_PlannerRacePath(fail_visible=True))
        except ContractError as exc:
            if str(exc) != "planner_output_io_failed":
                raise
        else:
            raise AssertionError("planner_output_visible_race_not_held")
    finally:
        os.open = original_open
        os.fstat = original_fstat
        os.read = original_read
        os.close = original_close

    for raw_json in (
        '{"oversized_integer":' + ("9" * 10000) + '}',
        ("[" * 10000) + "0" + ("]" * 10000),
    ):
        try:
            validate_planner_output(_raw_line_fixture("plan_body_json", raw_json))
        except ContractError as exc:
            if str(exc) != "planner_body_invalid":
                raise
        else:
            raise AssertionError("planner_body_parser_failure_not_held")

    try:
        validate_planner_output(
            _raw_line_fixture("bootstrap_argv_json", "9" * 10000)
        )
    except ContractError as exc:
        if str(exc) != "planner_structured_output_invalid":
            raise
    else:
        raise AssertionError("planner_structured_parser_failure_not_held")

    print(MARKER + "_SELF_TEST_GREEN")
    print("planner_v7_generation_bound=true")
    print("planner_plan_id_recomputed=true")
    print("planner_body_canonical_required=true")
    print("planner_body_closed_schema_required=true")
    print("qualification_contract_exact=true")
    print("qualification_contract_closed_schema_required=true")
    print("qualification_required_result_closed_schema_required=true")
    print("qualification_execution_identity_fields_validated=true")
    print("rehashed_nested_tamper_rejected=true")
    print("qualification_state_body_fields_bound=true")
    print("qualification_required_result_boolean_types_bound=true")
    print("qualification_contract_boolean_types_bound=true")
    print("planner_output_race_oserror_holds=true")
    print("planner_json_parser_failures_hold=true")
    print("unconsumed_tool_metadata_not_execution_authority=true")
    print("qualification_nonroot_required=true")
    print("qualification_descriptor_bound_git_object_required=true")
    print("qualification_git_callbacks_neutralized_required=true")
    print("qualification_preliminary_git_boundary_required=true")
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
