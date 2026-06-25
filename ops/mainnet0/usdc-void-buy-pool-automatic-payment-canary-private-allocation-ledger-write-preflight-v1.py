#!/usr/bin/env python3
import json
import os
import sys
from decimal import Decimal, InvalidOperation

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_V1"

def emit(ok, state, reason, preflight=None):
    payload = {
        "marker": MARKER,
        "private_allocation_ledger_write_preflight": {
            "ok": bool(ok),
            "state": state,
            "reason": reason
        },
        "authority": {
            "preflight_passed": bool(ok and preflight is not None),
            "private_allocation_ledger_write_now": False,
            "private_allocation_ledger_mutation": False,
            "fulfillment_execution": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False,
            "public_buyer_execution": False
        },
        "preflight": preflight
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    sys.exit(0 if ok else 1)

def load_json_env(name):
    path = os.environ.get(name, "")
    if not path:
        emit(False, "blocked_missing_input", f"{name}_not_set")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        emit(False, "blocked_invalid_input", f"{name}_invalid_json:{exc}")

def as_decimal(value, field):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        emit(False, "blocked_invalid_decimal", f"{field}_invalid")

def norm_decimal(value):
    d = as_decimal(value, "decimal")
    if d == d.to_integral_value():
        return str(int(d))
    return format(d.normalize(), "f")

source = load_json_env("CANARY_ALLOCATION_RECORD_CREATION_OUTPUT_JSON")
policy = load_json_env("CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_POLICY_JSON")

gate = source.get("allocation_record_creation_gate", {})
record = source.get("allocation_record")
authority = source.get("authority", {})

if not isinstance(record, dict):
    emit(False, "blocked_missing_allocation_record", "allocation_record_missing")

expected_gate_state = policy.get("expected_allocation_record_creation_state")
expected_record_status = policy.get("expected_allocation_record_status")

if gate.get("state") != expected_gate_state:
    emit(False, "blocked_wrong_allocation_record_creation_state", "allocation_record_creation_state_mismatch")

if record.get("allocation_record_status") != expected_record_status:
    emit(False, "blocked_wrong_allocation_record_status", "allocation_record_status_mismatch")

if authority.get("allocation_record_created") is not True:
    emit(False, "blocked_allocation_record_not_created", "authority_allocation_record_created_not_true")

for key in [
    "private_allocation_ledger_write",
    "fulfillment_execution",
    "wallet_signing",
    "void_transfer",
    "public_mutation",
    "public_buyer_execution"
]:
    if authority.get(key) is not False:
        emit(False, "blocked_upstream_authority_not_false", f"upstream_{key}_must_be_false")

if int(policy.get("canary_allocation_record_limit")) != 1:
    emit(False, "blocked_canary_allocation_record_limit_invalid", "limit_must_be_one")

if int(policy.get("canary_allocation_records_already_preflighted")) >= 1:
    emit(True, "blocked_canary_preflight_limit_exhausted", "canary_preflight_limit_exhausted", None)

if policy.get("allow_private_allocation_ledger_write_preflight") is not True:
    emit(False, "blocked_preflight_not_allowed", "policy_disallows_preflight")

for key in [
    "allow_private_allocation_ledger_write_now",
    "allow_fulfillment_execution",
    "allow_wallet_signing",
    "allow_void_transfer",
    "allow_public_mutation"
]:
    if policy.get(key) is not False:
        emit(False, "blocked_downstream_authority_policy_invalid", f"{key}_must_be_false")

required_record_fields = [
    "allocation_record_id",
    "canonical_payment_identity",
    "buyer_key",
    "void_receive_address",
    "reserved_void_amount",
    "inventory_remaining_before",
    "inventory_remaining_after"
]

missing = [k for k in required_record_fields if not record.get(k)]
if missing:
    emit(False, "blocked_missing_allocation_record_fields", ",".join(missing))

reserved = as_decimal(record.get("reserved_void_amount"), "reserved_void_amount")
before = as_decimal(record.get("inventory_remaining_before"), "inventory_remaining_before")
after = as_decimal(record.get("inventory_remaining_after"), "inventory_remaining_after")

if reserved <= 0:
    emit(False, "blocked_reserved_amount_invalid", "reserved_amount_must_be_positive")

if before - reserved != after:
    emit(False, "blocked_inventory_math_mismatch", "before_minus_reserved_does_not_equal_after")

preflight = {
    "preflight_status": "eligible_pending_separate_private_allocation_ledger_write_packet",
    "source_allocation_record_creation_marker": source.get("marker"),
    "source_allocation_record_creation_state": gate.get("state"),
    "allocation_record_id": record.get("allocation_record_id"),
    "canonical_payment_identity": record.get("canonical_payment_identity"),
    "buyer_key": record.get("buyer_key"),
    "void_receive_address": record.get("void_receive_address"),
    "reserved_void_amount": norm_decimal(reserved),
    "inventory_remaining_before": norm_decimal(before),
    "inventory_remaining_after": norm_decimal(after),
    "operator_review_required_before_actual_ledger_write": True,
    "canary": {
        "allocation_record_limit": 1,
        "allocation_records_preflighted_after": 1,
        "process_one_record_then_stop": True
    },
    "downstream_authority": {
        "private_allocation_ledger_write_now": False,
        "private_allocation_ledger_mutation": False,
        "fulfillment_execution": False,
        "wallet_signing": False,
        "void_transfer": False,
        "public_mutation": False,
        "public_buyer_execution": False
    }
}

emit(True, "eligible_pending_separate_private_allocation_ledger_write_packet", "preflight_passed_without_ledger_write_or_downstream_authority", preflight)
