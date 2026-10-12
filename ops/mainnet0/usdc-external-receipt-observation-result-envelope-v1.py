#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

MARKER = "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_RESULT_ENVELOPE_V1"
JOB_MARKER = "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1"
QUEUE_MARKER = "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1"

ALLOWED_CLASSIFICATION_STATES = {
    "observed_receipt_success",
    "observed_receipt_not_found",
    "endpoint_blocked_403_no_retry",
    "rate_limited_429_backoff",
    "timeout_retry_backoff",
    "rpc_error_hold",
    "operator_review_required",
}

ALLOWED_RPC_ENDPOINT_CLASSES = {
    "free_public_base_rpc",
    "operator_configured_rpc",
    "unavailable",
    "endpoint_blocked",
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

def require(condition, msg):
    if not condition:
        raise AssertionError(msg)

def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("fixtures/public/usdc-external-receipt-observation-result-envelope-v1.json")
    data = json.loads(path.read_text())
    env = data["example_result_envelope"]

    require(data["marker"] == MARKER, "marker_mismatch")
    require(data["schema_definition_only"] is True, "schema_definition_only_false")
    require(data["source_job_envelope_marker"] == JOB_MARKER, "source_job_marker_mismatch")
    require(data["source_queue_marker"] == QUEUE_MARKER, "source_queue_marker_mismatch")

    for key in AUTHORITY_FALSE_KEYS:
        require(data[key] is False, f"top_authority_must_remain_false={key}")

    required = [
        "result_id",
        "job_id",
        "source_job_envelope_marker",
        "source_queue_marker",
        "chain_id",
        "tx_hash",
        "observed_at_utc",
        "observation_method",
        "rpc_endpoint_class",
        "receipt_found",
        "receipt_status",
        "block_number",
        "transfer_log_count",
        "matching_transfer_log_count",
        "classification_state",
        "retry_allowed",
        "retry_after_seconds",
        "operator_review_required",
        "canonical_payment_identity_hint",
        "authority_flags",
    ]
    for key in required:
        require(key in env, f"missing_result_field={key}")

    require(env["source_job_envelope_marker"] == JOB_MARKER, "result_job_marker_mismatch")
    require(env["source_queue_marker"] == QUEUE_MARKER, "result_queue_marker_mismatch")
    require(isinstance(env["chain_id"], int), "chain_id_not_int")
    require(re.fullmatch(r"0x[a-fA-F0-9]{64}", env["tx_hash"]), "tx_hash_invalid")
    require(env["observation_method"] == "eth_getTransactionReceipt", "observation_method_invalid")
    require(env["rpc_endpoint_class"] in ALLOWED_RPC_ENDPOINT_CLASSES, "rpc_endpoint_class_invalid")
    require(isinstance(env["receipt_found"], bool), "receipt_found_not_bool")
    require(env["receipt_status"] in ("0x1", "0x0", None), "receipt_status_invalid")
    require(isinstance(env["block_number"], int), "block_number_not_int")
    require(env["block_number"] >= 0, "block_number_negative")
    require(isinstance(env["transfer_log_count"], int), "transfer_log_count_not_int")
    require(isinstance(env["matching_transfer_log_count"], int), "matching_transfer_log_count_not_int")
    require(env["matching_transfer_log_count"] <= env["transfer_log_count"], "matching_transfer_log_count_gt_transfer_log_count")
    require(env["classification_state"] in ALLOWED_CLASSIFICATION_STATES, "classification_state_invalid")
    require(isinstance(env["retry_allowed"], bool), "retry_allowed_not_bool")
    require(isinstance(env["retry_after_seconds"], int), "retry_after_seconds_not_int")
    require(env["retry_after_seconds"] >= 0, "retry_after_seconds_negative")
    require(isinstance(env["operator_review_required"], bool), "operator_review_required_not_bool")

    identity_parts = env["canonical_payment_identity_hint"].split(":")
    require(len(identity_parts) == 6, "canonical_payment_identity_hint_parts_invalid")
    require(identity_parts[0] == str(env["chain_id"]), "canonical_chain_id_hint_mismatch")
    require(identity_parts[1] == env["tx_hash"], "canonical_tx_hash_hint_mismatch")

    flags = env["authority_flags"]
    for key in AUTHORITY_FALSE_KEYS:
        require(flags[key] is False, f"result_authority_must_remain_false={key}")

    print("VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_RESULT_ENVELOPE_V1_BEGIN")
    print(f"fixture_path={path}")
    print("required_result_fields_green=true")
    print("receipt_result_shape_green=true")
    print("allowed_classification_states_green=true")
    print("canonical_payment_identity_hint_green=true")
    print("result_envelope_authority_false_green=true")
    print("VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_RESULT_ENVELOPE_V1_GREEN")

if __name__ == "__main__":
    raise SystemExit(main())
