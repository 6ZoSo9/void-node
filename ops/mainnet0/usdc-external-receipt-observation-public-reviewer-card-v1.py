#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

MARKER = "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_V1"
RESULT_MARKER = "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_RESULT_ENVELOPE_V1"
JOB_MARKER = "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1"
QUEUE_MARKER = "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1"

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
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("fixtures/public/usdc-external-receipt-observation-public-reviewer-card-v1.json")
    data = json.loads(path.read_text())

    require(data["marker"] == MARKER, "marker_mismatch")
    require(data["public_explanation_only"] is True, "public_explanation_only_false")
    require(data["parent_result_envelope_marker"] == RESULT_MARKER, "parent_result_marker_mismatch")
    require(data["parent_job_envelope_marker"] == JOB_MARKER, "parent_job_marker_mismatch")
    require(data["parent_queue_marker"] == QUEUE_MARKER, "parent_queue_marker_mismatch")

    claim = data["observed_receipt_claim"]
    require(claim["chain_id"] == 8453, "chain_id_mismatch")
    require(re.fullmatch(r"0x[a-fA-F0-9]{64}", claim["tx_hash"]), "tx_hash_invalid")
    require(claim["receipt_found"] is True, "receipt_found_not_true")
    require(claim["receipt_status"] == "0x1", "receipt_status_not_success")
    require(isinstance(claim["block_number"], int) and claim["block_number"] > 0, "block_number_invalid")
    require(claim["matching_transfer_log_count"] <= claim["transfer_log_count"], "matching_transfer_count_invalid")
    require(claim["classification_state"] == "observed_receipt_success", "classification_state_invalid")

    warnings = data["reviewer_warnings"]
    for key in WARNING_TRUE_KEYS:
        require(warnings[key] is True, f"warning_must_be_true={key}")

    for key in AUTHORITY_FALSE_KEYS:
        require(data[key] is False, f"authority_must_remain_false={key}")

    print("VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_V1_BEGIN")
    print(f"fixture_path={path}")
    print("public_explanation_only_green=true")
    print("parent_markers_green=true")
    print("observed_receipt_claim_shape_green=true")
    print("reviewer_warnings_green=true")
    print("public_reviewer_card_authority_false_green=true")
    print("VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_V1_GREEN")

if __name__ == "__main__":
    raise SystemExit(main())
