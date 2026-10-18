#!/usr/bin/env python3
"""Offline fail-closed evaluator for accepted presale-freeze host metadata."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
from typing import Any

MARKER = "VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_HOST_INSTALL_QUALIFICATION_V2"
SCHEMA = "void_buy_void_presale_source_freeze_host_install_qualification_v2"
CENSUS_MARKER = "VOID_BUY_VOID_PRECISION_SOURCE_FREEZE_HOST_METADATA_CENSUS_V3"
CENSUS_SCHEMA = "void_buy_void_precision_source_freeze_host_metadata_census_v3"

FREEZE_ID = (
    "voidbuypresalefreeze2_"
    "32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1"
)
SUCCESSOR_ID = (
    "voidbuypresaleenfsucc1_"
    "819fd2dbce9928145023d4077cffc34e2a9ab3a50e51428fc37dda6ca70a18ef"
)
ACCEPTANCE_ID = (
    "voidbuypresalefreezeaccept2_"
    "88fa89a3fd3ea8151f69c5f133eca2965cf98576a245d7afbb7f6992f68fa1c4"
)

CENSUS_SOURCE_REL = "scripts/void_buy_void_precision_source_freeze_host_metadata_census_v3.py"
CENSUS_SOURCE_BLOB = "266fe91ee8563efff6116be7f890f19340a0de4c"
CENSUS_PROOF_REL = "scripts/void_buy_void_precision_source_freeze_host_metadata_census_v3_proof.py"
CENSUS_PROOF_BLOB = "9a8446a3d1f02d94277606c2858ec7abd30b3b94"
CENSUS_DOC_REL = "docs/operators/buy-void-precision-source-freeze-host-metadata-census-v3.md"
CENSUS_DOC_BLOB = "b7d216e4623b0918a2aef35f138b412b3eba12ac"
CENSUS_WORKFLOW_REL = ".github/workflows/buy-void-precision-source-freeze-host-metadata-census-v3.yml"
CENSUS_WORKFLOW_BLOB = "000808f88aa4139d764f00bbc15a4272323991f3"

FREEZE_REL = "ops/security/buy-void-presale-source-freeze-candidate-v2.json"
FREEZE_BLOB = "ca9c42e2d3ab4c50ac54badadb9efde6180ad241"
SUCCESSOR_REL = "ops/security/buy-void-presale-current-source-enforcement-successor-v1.json"
SUCCESSOR_BLOB = "774db38ccb771f393b44d589a455144b99d36f6b"
ACCEPTANCE_REL = "ops/security/buy-void-presale-source-freeze-acceptance-v2.json"
ACCEPTANCE_BLOB = "5d437a37703a83908a7fa78b78da92151aa1aa99"

MAX_INPUT_BYTES = 256 * 1024
HEX40 = re.compile(r"^[0-9a-f]{40}$")

TOP_LEVEL_KEYS = frozenset(
    {
        "marker",
        "schema",
        "read_only",
        "sudo_required",
        "network_contact",
        "git_lazy_fetch",
        "git_transport_allowed",
        "secret_or_receipt_content_access",
        "credential_or_wallet_access",
        "signing_or_transaction",
        "service_or_filesystem_mutation",
        "hostname_matches_designated_precision",
        "source",
        "fixed_path_metadata",
        "expected_freeze_id",
        "expected_successor_id",
        "expected_acceptance_id",
        "source_freeze_acceptance_authority_claimed",
        "installed_receipt_authenticity_verified",
        "host_install_qualified",
        "live_process_generation_verified",
        "payment_rail_policy_accepted",
        "customer_payment_acceptance_authorized",
        "one_payment_one_fulfillment_verified",
        "wc_void_launch_coupling_verified",
        "public_presale_activation_authorized",
        "wc_void_activation_authorized",
        "funds_movement",
        "production_host_evidence_authority",
        "status",
        "next_gate",
    }
)

SOURCE_KEYS = frozenset(
    {
        "repository_directory_state",
        "head_sha",
        "freeze_review_head_locally_present",
        "freeze_source_commit_locally_present",
        "freeze_source_tree_locally_present",
        "successor_review_head_locally_present",
        "acceptance_review_head_locally_present",
        "tracked_freeze_manifest_matches",
        "tracked_enforcement_successor_matches",
        "tracked_freeze_acceptance_matches",
        "tracked_historical_enforcement_lock_matches",
        "tracked_repaired_epoch2_bootstrap_lock_matches",
    }
)

PATH_KEYS = frozenset(
    {
        "source_finality_deployment_receipt",
        "allocation_custody_mount",
        "epoch2_live_composition_root",
    }
)

PATH_METADATA_KEYS = frozenset({"state", "mode", "bytes"})
CUSTODY_PATH_METADATA_KEYS = frozenset(
    {"state", "mode", "bytes", "is_mountpoint_metadata_only"}
)
PATH_METADATA_STATES = frozenset(
    {
        "ABSENT",
        "METADATA_PERMISSION_HOLD",
        "METADATA_UNAVAILABLE_HOLD",
        "SYMLINK_HOLD",
        "REGULAR_METADATA_ONLY",
        "DIRECTORY_METADATA_ONLY",
        "SPECIAL_FILE_HOLD",
    }
)
MODE4 = re.compile(r"^[0-7]{4}$")


class QualificationError(RuntimeError):
    pass


def _require(ok: bool, reason: str) -> None:
    if not ok:
        raise QualificationError(reason)


def _plain(value: object) -> dict[str, Any]:
    _require(isinstance(value, dict), "object_required")
    return value


def _exact_keys(value: dict[str, Any], expected: frozenset[str], label: str) -> None:
    if set(value) != expected:
        raise QualificationError(label + "_keys_invalid")


def _validate_path_metadata_entry(
    value: object,
    label: str,
    *,
    custody: bool = False,
) -> dict[str, Any]:
    entry = _plain(value)
    expected = CUSTODY_PATH_METADATA_KEYS if custody else PATH_METADATA_KEYS
    _exact_keys(entry, expected, label)

    state = entry["state"]
    mode = entry["mode"]
    size = entry["bytes"]
    _require(isinstance(state, str), label + "_state_type_invalid")
    _require(state in PATH_METADATA_STATES, label + "_state_invalid")

    if state == "REGULAR_METADATA_ONLY":
        _require(
            isinstance(mode, str) and MODE4.fullmatch(mode) is not None,
            label + "_regular_mode_invalid",
        )
        _require(
            isinstance(size, int) and not isinstance(size, bool) and size >= 0,
            label + "_regular_bytes_invalid",
        )
    elif state == "DIRECTORY_METADATA_ONLY":
        _require(
            isinstance(mode, str) and MODE4.fullmatch(mode) is not None,
            label + "_directory_mode_invalid",
        )
        _require(size is None, label + "_directory_bytes_invalid")
    else:
        _require(mode is None, label + "_hold_mode_must_be_null")
        _require(size is None, label + "_hold_bytes_must_be_null")

    if custody:
        mountpoint = entry["is_mountpoint_metadata_only"]
        _require(
            isinstance(mountpoint, bool),
            label + "_mountpoint_type_invalid",
        )
        if state != "DIRECTORY_METADATA_ONLY":
            _require(
                mountpoint is False,
                label + "_nondirectory_mountpoint_must_be_false",
            )
    return entry


def _stable_json_file(path: Path) -> dict[str, Any]:
    _require(path.is_absolute(), "input_path_must_be_absolute")
    _require(os.path.normpath(str(path)) == str(path), "input_path_not_normalized")
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualificationError("input_unavailable") from exc
    _require(
        stat.S_ISREG(before.st_mode)
        and not stat.S_ISLNK(before.st_mode)
        and before.st_nlink == 1
        and 1 <= before.st_size <= MAX_INPUT_BYTES,
        "input_metadata_invalid",
    )
    raw = path.read_bytes()
    after = path.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        _require(
            getattr(before, field) == getattr(after, field),
            "input_changed:" + field,
        )
    _require(len(raw) == before.st_size, "input_short_read")
    try:
        value = json.loads(raw.decode("utf-8", "strict"))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise QualificationError("input_json_invalid") from exc
    _require(isinstance(value, dict), "input_json_root_invalid")
    return value


def _bool_false(value: object, label: str) -> None:
    _require(value is False, label + "_must_be_false")


def _validate_census(census: dict[str, Any]) -> None:
    _exact_keys(census, TOP_LEVEL_KEYS, "census")
    _require(census["marker"] == CENSUS_MARKER, "census_marker_invalid")
    _require(census["schema"] == CENSUS_SCHEMA, "census_schema_invalid")
    _require(census["read_only"] is True, "census_not_read_only")
    _require(census["sudo_required"] is False, "census_sudo_invalid")
    _require(census["network_contact"] is False, "census_network_contact")
    _require(census["git_lazy_fetch"] is False, "census_lazy_fetch")
    _require(census["git_transport_allowed"] is False, "census_transport_allowed")
    _require(
        census["secret_or_receipt_content_access"] is False,
        "census_secret_or_receipt_read",
    )
    _require(
        census["credential_or_wallet_access"] is False,
        "census_credential_or_wallet_access",
    )
    _require(
        census["signing_or_transaction"] is False,
        "census_signing_or_transaction",
    )
    _require(
        census["service_or_filesystem_mutation"] is False,
        "census_service_or_filesystem_mutation",
    )
    _require(census["expected_freeze_id"] == FREEZE_ID, "freeze_id_mismatch")
    _require(census["expected_successor_id"] == SUCCESSOR_ID, "successor_id_mismatch")
    _require(
        census["expected_acceptance_id"] == ACCEPTANCE_ID,
        "acceptance_id_mismatch",
    )
    _require(census["status"] == "HOST_RELEASE_EVIDENCE_HOLD", "census_status_invalid")
    _require(
        census["next_gate"]
        == "RETURN_JSON_FOR_VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_"
           "HOST_INSTALL_QUALIFICATION_V2",
        "census_next_gate_invalid",
    )

    for key in (
        "source_freeze_acceptance_authority_claimed",
        "installed_receipt_authenticity_verified",
        "host_install_qualified",
        "live_process_generation_verified",
        "payment_rail_policy_accepted",
        "customer_payment_acceptance_authorized",
        "one_payment_one_fulfillment_verified",
        "wc_void_launch_coupling_verified",
        "public_presale_activation_authorized",
        "wc_void_activation_authorized",
        "funds_movement",
        "production_host_evidence_authority",
    ):
        _bool_false(census[key], "census_" + key)

    source = _plain(census["source"])
    _exact_keys(source, SOURCE_KEYS, "source")
    paths = _plain(census["fixed_path_metadata"])
    _exact_keys(paths, PATH_KEYS, "fixed_path_metadata")

    _validate_path_metadata_entry(
        paths["source_finality_deployment_receipt"],
        "source_finality_deployment_receipt",
    )
    _validate_path_metadata_entry(
        paths["allocation_custody_mount"],
        "allocation_custody_mount",
        custody=True,
    )
    _validate_path_metadata_entry(
        paths["epoch2_live_composition_root"],
        "epoch2_live_composition_root",
    )


def _metadata_blockers(census: dict[str, Any]) -> list[str]:
    blockers: list[str] = []
    source = census["source"]
    paths = census["fixed_path_metadata"]

    if census["hostname_matches_designated_precision"] is not True:
        blockers.append("designated_precision_hostname_not_verified")
    if source["repository_directory_state"] != "DIRECTORY_METADATA_ONLY":
        blockers.append("repository_directory_metadata_not_present")
    head = source["head_sha"]
    if not isinstance(head, str) or HEX40.fullmatch(head) is None:
        blockers.append("repository_head_unavailable")
    for key in (
        "freeze_review_head_locally_present",
        "freeze_source_commit_locally_present",
        "freeze_source_tree_locally_present",
        "successor_review_head_locally_present",
        "acceptance_review_head_locally_present",
        "tracked_freeze_manifest_matches",
        "tracked_enforcement_successor_matches",
        "tracked_freeze_acceptance_matches",
        "tracked_historical_enforcement_lock_matches",
        "tracked_repaired_epoch2_bootstrap_lock_matches",
    ):
        if source[key] is not True:
            blockers.append("source_metadata_false:" + key)

    receipt = _plain(paths["source_finality_deployment_receipt"])
    if receipt.get("state") != "REGULAR_METADATA_ONLY":
        blockers.append("deployment_receipt_metadata_not_regular")

    custody = _plain(paths["allocation_custody_mount"])
    if custody.get("state") != "DIRECTORY_METADATA_ONLY":
        blockers.append("allocation_custody_metadata_not_directory")
    if custody.get("is_mountpoint_metadata_only") is not True:
        blockers.append("allocation_custody_mountpoint_not_observed")

    epoch2 = _plain(paths["epoch2_live_composition_root"])
    if epoch2.get("state") != "DIRECTORY_METADATA_ONLY":
        blockers.append("epoch2_live_composition_metadata_not_directory")

    return sorted(set(blockers))


def evaluate(census: dict[str, Any]) -> dict[str, Any]:
    _validate_census(census)
    metadata_blockers = _metadata_blockers(census)

    independent_requirements = [
        "authenticated_source_finality_deployment_and_live_process_receipt_evidence",
        "allocation_custody_host_and_storage_qualification_evidence",
        "epoch2_installed_live_composition_generation_qualification_evidence",
    ]

    if metadata_blockers:
        status = "HOST_INSTALL_QUALIFICATION_HOLD_METADATA_NOT_ALIGNED"
    else:
        status = "HOST_INSTALL_QUALIFICATION_HOLD_INDEPENDENT_EVIDENCE_REQUIRED"

    return {
        "marker": MARKER,
        "schema": SCHEMA,
        "version": 2,
        "status": status,
        "input_census_marker_verified": True,
        "input_census_read_only_boundary_verified": True,
        "accepted_freeze_id": FREEZE_ID,
        "accepted_enforcement_successor_id": SUCCESSOR_ID,
        "accepted_freeze_acceptance_id": ACCEPTANCE_ID,
        "metadata_alignment_green": not metadata_blockers,
        "metadata_blockers": metadata_blockers,
        "independent_evidence_required": independent_requirements,
        "deployment_receipt_metadata_is_not_authenticity": True,
        "custody_mount_metadata_is_not_custody_qualification": True,
        "epoch2_root_metadata_is_not_installed_generation_qualification": True,
        "source_freeze_accepted": True,
        "current_source_enforcement_successor_required": False,
        "installed_receipt_authenticity_verified": False,
        "allocation_custody_qualified": False,
        "epoch2_installed_generation_qualified": False,
        "host_install_qualified": False,
        "live_runtime_evidence_qualified": False,
        "payment_rail_policy_accepted": False,
        "customer_payment_acceptance_authorized": False,
        "one_payment_one_fulfillment_verified": False,
        "wc_void_launch_coupling_verified": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "wallet_or_signing_authority": False,
        "transaction_submission_authorized": False,
        "treasury_or_liquidity_action_authorized": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
        "filesystem_write": False,
        "service_mutation": False,
        "network_contact": False,
        "credential_access": False,
        "next_gate": (
            "COLLECT_AUTHENTICATED_RECEIPT_CUSTODY_AND_EPOCH2_"
            "INSTALLED_GENERATION_EVIDENCE"
        ),
    }


def self_test() -> None:
    aligned_source = {
        "repository_directory_state": "DIRECTORY_METADATA_ONLY",
        "head_sha": "a" * 40,
        "freeze_review_head_locally_present": True,
        "freeze_source_commit_locally_present": True,
        "freeze_source_tree_locally_present": True,
        "successor_review_head_locally_present": True,
        "acceptance_review_head_locally_present": True,
        "tracked_freeze_manifest_matches": True,
        "tracked_enforcement_successor_matches": True,
        "tracked_freeze_acceptance_matches": True,
        "tracked_historical_enforcement_lock_matches": True,
        "tracked_repaired_epoch2_bootstrap_lock_matches": True,
    }
    aligned_paths = {
        "source_finality_deployment_receipt": {
            "state": "REGULAR_METADATA_ONLY",
            "mode": "0600",
            "bytes": 4096,
        },
        "allocation_custody_mount": {
            "state": "DIRECTORY_METADATA_ONLY",
            "mode": "0755",
            "bytes": None,
            "is_mountpoint_metadata_only": True,
        },
        "epoch2_live_composition_root": {
            "state": "DIRECTORY_METADATA_ONLY",
            "mode": "0755",
            "bytes": None,
        },
    }
    census = {
        "marker": CENSUS_MARKER,
        "schema": CENSUS_SCHEMA,
        "read_only": True,
        "sudo_required": False,
        "network_contact": False,
        "git_lazy_fetch": False,
        "git_transport_allowed": False,
        "secret_or_receipt_content_access": False,
        "credential_or_wallet_access": False,
        "signing_or_transaction": False,
        "service_or_filesystem_mutation": False,
        "hostname_matches_designated_precision": True,
        "source": aligned_source,
        "fixed_path_metadata": aligned_paths,
        "expected_freeze_id": FREEZE_ID,
        "expected_successor_id": SUCCESSOR_ID,
        "expected_acceptance_id": ACCEPTANCE_ID,
        "source_freeze_acceptance_authority_claimed": False,
        "installed_receipt_authenticity_verified": False,
        "host_install_qualified": False,
        "live_process_generation_verified": False,
        "payment_rail_policy_accepted": False,
        "customer_payment_acceptance_authorized": False,
        "one_payment_one_fulfillment_verified": False,
        "wc_void_launch_coupling_verified": False,
        "public_presale_activation_authorized": False,
        "wc_void_activation_authorized": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
        "status": "HOST_RELEASE_EVIDENCE_HOLD",
        "next_gate": (
            "RETURN_JSON_FOR_VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_"
            "HOST_INSTALL_QUALIFICATION_V2"
        ),
    }
    result = evaluate(census)
    assert result["metadata_alignment_green"] is True
    assert (
        result["status"]
        == "HOST_INSTALL_QUALIFICATION_HOLD_INDEPENDENT_EVIDENCE_REQUIRED"
    )
    assert result["host_install_qualified"] is False
    assert result["public_presale_activation"] is False
    assert result["funds_movement"] is False
    assert len(result["independent_evidence_required"]) == 3

    bad = json.loads(json.dumps(census))
    bad["fixed_path_metadata"]["allocation_custody_mount"][
        "is_mountpoint_metadata_only"
    ] = False
    held = evaluate(bad)
    assert held["metadata_alignment_green"] is False
    assert held["status"] == "HOST_INSTALL_QUALIFICATION_HOLD_METADATA_NOT_ALIGNED"
    assert "allocation_custody_mountpoint_not_observed" in held["metadata_blockers"]

    forged = json.loads(json.dumps(census))
    forged["installed_receipt_authenticity_verified"] = True
    try:
        evaluate(forged)
    except QualificationError as exc:
        assert "must_be_false" in str(exc)
    else:
        raise AssertionError("forged_census_authority_accepted")

    malformed_cases: list[tuple[str, dict[str, Any], str]] = []

    missing = json.loads(json.dumps(census))
    del missing["fixed_path_metadata"]["source_finality_deployment_receipt"]["mode"]
    malformed_cases.append(
        ("receipt_missing_mode", missing, "source_finality_deployment_receipt_keys_invalid")
    )

    extra = json.loads(json.dumps(census))
    extra["fixed_path_metadata"]["epoch2_live_composition_root"]["unexpected"] = True
    malformed_cases.append(
        ("epoch2_extra_key", extra, "epoch2_live_composition_root_keys_invalid")
    )

    wrong_receipt_bytes = json.loads(json.dumps(census))
    wrong_receipt_bytes["fixed_path_metadata"]["source_finality_deployment_receipt"][
        "bytes"
    ] = "4096"
    malformed_cases.append(
        (
            "receipt_bytes_wrong_type",
            wrong_receipt_bytes,
            "source_finality_deployment_receipt_regular_bytes_invalid",
        )
    )

    wrong_directory_bytes = json.loads(json.dumps(census))
    wrong_directory_bytes["fixed_path_metadata"]["epoch2_live_composition_root"][
        "bytes"
    ] = 0
    malformed_cases.append(
        (
            "directory_bytes_not_null",
            wrong_directory_bytes,
            "epoch2_live_composition_root_directory_bytes_invalid",
        )
    )

    wrong_mode = json.loads(json.dumps(census))
    wrong_mode["fixed_path_metadata"]["allocation_custody_mount"]["mode"] = 0o755
    malformed_cases.append(
        (
            "custody_mode_wrong_type",
            wrong_mode,
            "allocation_custody_mount_directory_mode_invalid",
        )
    )

    wrong_mountpoint_type = json.loads(json.dumps(census))
    wrong_mountpoint_type["fixed_path_metadata"]["allocation_custody_mount"][
        "is_mountpoint_metadata_only"
    ] = 1
    malformed_cases.append(
        (
            "custody_mountpoint_wrong_type",
            wrong_mountpoint_type,
            "allocation_custody_mount_mountpoint_type_invalid",
        )
    )

    nondirectory_mountpoint = json.loads(json.dumps(census))
    nondirectory_mountpoint["fixed_path_metadata"]["allocation_custody_mount"] = {
        "state": "ABSENT",
        "mode": None,
        "bytes": None,
        "is_mountpoint_metadata_only": True,
    }
    malformed_cases.append(
        (
            "nondirectory_mountpoint_true",
            nondirectory_mountpoint,
            "allocation_custody_mount_nondirectory_mountpoint_must_be_false",
        )
    )

    hold_mode = json.loads(json.dumps(census))
    hold_mode["fixed_path_metadata"]["epoch2_live_composition_root"] = {
        "state": "ABSENT",
        "mode": "0755",
        "bytes": None,
    }
    malformed_cases.append(
        (
            "hold_mode_non_null",
            hold_mode,
            "epoch2_live_composition_root_hold_mode_must_be_null",
        )
    )

    unknown_state = json.loads(json.dumps(census))
    unknown_state["fixed_path_metadata"]["source_finality_deployment_receipt"][
        "state"
    ] = "MYSTERY_METADATA"
    malformed_cases.append(
        (
            "unknown_state",
            unknown_state,
            "source_finality_deployment_receipt_state_invalid",
        )
    )

    for label, malformed, expected_reason in malformed_cases:
        try:
            evaluate(malformed)
        except QualificationError as exc:
            assert str(exc) == expected_reason, (label, str(exc))
        else:
            raise AssertionError("malformed_nested_metadata_accepted:" + label)

    print(MARKER + "_SELF_TEST_GREEN")
    print("metadata_alignment_classifier=true")
    print("closed_nested_metadata_schema=true")
    print("malformed_nested_metadata_rejected=true")
    print("state_dependent_mode_bytes_validated=true")
    print("custody_mountpoint_type_validated=true")
    print("metadata_presence_never_becomes_authenticity=true")
    print("independent_receipt_evidence_required=true")
    print("independent_custody_evidence_required=true")
    print("independent_epoch2_installed_evidence_required=true")
    print("host_install_qualified=false")
    print("payment_rail_policy_accepted=false")
    print("customer_payment_acceptance_authorized=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--census-json", type=Path)
    args = parser.parse_args()
    if args.self_test:
        if args.census_json is not None:
            raise QualificationError("self_test_with_input_forbidden")
        self_test()
        return 0
    if args.census_json is None:
        raise QualificationError("census_json_required")
    report = evaluate(_stable_json_file(args.census_json))
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except QualificationError as exc:
        print(MARKER)
        print("status=HOST_INSTALL_QUALIFICATION_HOLD_INVALID_INPUT")
        print("reason=" + str(exc))
        print("host_install_qualified=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
