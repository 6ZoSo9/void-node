#!/usr/bin/env python3
import json
import sys
from pathlib import Path

MARKER = "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_V1"

REQUIRED_MARKERS = {
    "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_USER_AGENT_COMPATIBILITY_REPAIR_V1",
    "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1",
    "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1",
    "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_RESULT_ENVELOPE_V1",
    "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_V1",
    "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_RUNTIME_SMOKE_V1",
}

AUTHORITY_FALSE_KEYS = [
    "public_mutation_enabled",
    "runtime_queue_enabled",
    "live_fetch_now",
    "finality_verified_now",
    "external_state_root_trust_enabled",
    "real_payment_verified_now",
    "automatic_fulfillment_enabled",
    "private_allocation_ledger_write_enabled",
    "inventory_reserved_now",
    "void_transfer_now",
]

WARNING_TRUE_KEYS = [
    "not_payment_approval",
    "not_finality_verification",
    "not_allocation_ledger_write",
    "not_inventory_reserve",
    "not_automatic_fulfillment",
    "not_void_transfer",
    "operator_review_required",
]

def require(condition, msg):
    if not condition:
        raise AssertionError(msg)

def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("fixtures/public/usdc-external-receipt-observation-evidence-bundle-v1.json")
    data = json.loads(path.read_text())

    require(data["marker"] == MARKER, "marker_mismatch")
    require(data["status"] == "evidence_bundle_defined_authority_false", "status_mismatch")
    require(data["public_evidence_index_only"] is True, "public_evidence_index_only_false")
    require(data["bundle_subject"] == "usdc_external_receipt_observation", "bundle_subject_mismatch")
    require(data["head_commit"] == "ef3214be", "head_commit_mismatch")
    require(data["runtime_smoke_final_marker"] == "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_RUNTIME_SMOKE_V1_PRECISION_SYNCED_FINAL", "runtime_smoke_final_marker_mismatch")

    markers = {item["marker"] for item in data["evidence_items"]}
    require(REQUIRED_MARKERS.issubset(markers), "missing_required_evidence_marker")

    require(len(data["evidence_items"]) == len(markers), "duplicate_evidence_marker")

    for item in data["evidence_items"]:
        require("name" in item and item["name"], "evidence_item_name_missing")
        require("proof_path" in item and item["proof_path"].startswith("ops/mainnet0/"), "evidence_item_proof_path_invalid")
        if "public_json_route" in item:
            require(item["public_json_route"].startswith("/public-node/"), "public_json_route_invalid")
            require(item["public_json_route"].endswith(".json"), "public_json_route_not_json")
        if "public_html_route" in item:
            require(item["public_html_route"].startswith("/public-node/"), "public_html_route_invalid")
            require(not item["public_html_route"].endswith(".json"), "public_html_route_is_json")

    require(any("html-route-repair-v1-local-green-20260623-120803" in t for t in data["invalid_or_superseded_tags"]), "missing_invalid_noop_tag_note")
    require(any("runtime-smoke-v1-local-green-20260623-121450" in t for t in data["invalid_or_superseded_tags"]), "missing_invalid_runtime_smoke_tag_note")

    warnings = data["reviewer_warnings"]
    for key in WARNING_TRUE_KEYS:
        require(warnings[key] is True, f"warning_must_be_true={key}")

    for key in AUTHORITY_FALSE_KEYS:
        require(data[key] is False, f"authority_must_remain_false={key}")

    print("VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_V1_BEGIN")
    print(f"fixture_path={path}")
    print("evidence_bundle_marker_green=true")
    print("evidence_bundle_required_items_green=true")
    print("evidence_bundle_invalid_tag_notes_green=true")
    print("evidence_bundle_warnings_green=true")
    print("evidence_bundle_authority_false_green=true")
    print("VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_V1_GREEN")

if __name__ == "__main__":
    raise SystemExit(main())
