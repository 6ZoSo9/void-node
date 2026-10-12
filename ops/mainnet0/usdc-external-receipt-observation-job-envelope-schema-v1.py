#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

MARKER = "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1"
QUEUE_MARKER = "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1"

ALLOWED_RPC_ENDPOINT_CLASSES = {
    "free_public_base_rpc",
    "operator_configured_rpc",
    "unavailable",
    "endpoint_blocked",
}

ALLOWED_CLASSIFICATION_STATES = {
    "queued_observation",
    "observed_receipt_success",
    "observed_receipt_not_found",
    "endpoint_blocked_403_no_retry",
    "rate_limited_429_backoff",
    "timeout_retry_backoff",
    "rpc_error_hold",
    "operator_review_required",
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
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("fixtures/public/usdc-external-receipt-observation-job-envelope-schema-v1.json")
    data = json.loads(path.read_text())
    env = data["example_envelope"]

    require(data["marker"] == MARKER, "marker_mismatch")
    require(data["parent_queue_marker"] == QUEUE_MARKER, "parent_queue_marker_mismatch")
    require(data["schema_definition_only"] is True, "schema_definition_only_false")

    for key in AUTHORITY_FALSE_KEYS:
        require(data[key] is False, f"top_authority_must_remain_false={key}")

    required = [
        "job_id",
        "queue_marker",
        "chain_id",
        "tx_hash",
        "rpc_endpoint_class",
        "created_at_utc",
        "requested_observation_method",
        "current_queue_state",
        "classification_state",
        "retry_allowed",
        "retry_after_seconds",
        "operator_review_required",
        "canonical_payment_identity_hint",
        "authority_flags",
    ]
    for key in required:
        require(key in env, f"missing_envelope_field={key}")

    require(env["queue_marker"] == QUEUE_MARKER, "envelope_queue_marker_mismatch")
    require(isinstance(env["chain_id"], int), "chain_id_not_int")
    require(re.fullmatch(r"0x[a-fA-F0-9]{64}", env["tx_hash"]), "tx_hash_invalid")
    require(env["rpc_endpoint_class"] in ALLOWED_RPC_ENDPOINT_CLASSES, "rpc_endpoint_class_invalid")
    require(env["classification_state"] in ALLOWED_CLASSIFICATION_STATES, "classification_state_invalid")
    require(env["current_queue_state"] in ALLOWED_CLASSIFICATION_STATES, "current_queue_state_invalid")
    require(env["requested_observation_method"] == "eth_getTransactionReceipt", "observation_method_invalid")
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
        require(flags[key] is False, f"envelope_authority_must_remain_false={key}")

    print("VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1_BEGIN")
    print(f"fixture_path={path}")
    print("required_fields_green=true")
    print("allowed_rpc_endpoint_classes_green=true")
    print("allowed_classification_states_green=true")
    print("canonical_payment_identity_hint_green=true")
    print("job_envelope_authority_false_green=true")
    print("VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1_GREEN")

if __name__ == "__main__":
    raise SystemExit(main())
