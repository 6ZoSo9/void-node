#!/usr/bin/env python3
import hashlib
import json
import os
import sys
from decimal import Decimal, InvalidOperation

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_RECORD_CREATION_GATE_V1"

def emit(ok, state, reason, record=None):
    payload = {
        "marker": MARKER,
        "allocation_record_creation_gate": {
            "ok": bool(ok),
            "state": state,
            "reason": reason
        },
        "authority": {
            "inventory_already_reserved": bool(record is not None),
            "allocation_record_created": bool(ok and record is not None),
            "private_allocation_ledger_write": False,
            "fulfillment_execution": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False,
            "public_buyer_execution": False
        },
        "allocation_record": record
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

def as_bool(value):
    return value is True

def dec(value, field):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        emit(False, "blocked_invalid_decimal", f"{field}_invalid")

def norm_decimal(value):
    d = dec(value, "decimal")
    if d == d.to_integral_value():
        return str(int(d))
    return format(d.normalize(), "f")

def first_present(mapping, names):
    for name in names:
        if name in mapping and mapping.get(name) not in (None, ""):
            return mapping.get(name)
    return None

def stable_id(parts):
    h = hashlib.sha256()
    for part in parts:
        h.update(str(part).encode("utf-8"))
        h.update(b"\x1f")
    return "void_canary_allocation_record_" + h.hexdigest()[:32]

actual = load_json_env("CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_OUTPUT_JSON")
policy = load_json_env("CANARY_ALLOCATION_RECORD_CREATION_POLICY_JSON")

def find_dict_with_key(value, key):
    if isinstance(value, dict):
        if key in value:
            return value
        for child in value.values():
            found = find_dict_with_key(child, key)
            if found is not None:
                return found
    elif isinstance(value, list):
        for child in value:
            found = find_dict_with_key(child, key)
            if found is not None:
                return found
    return None

execute = actual.get("execute", {})
result = actual.get("result")
if not isinstance(result, dict):
    result = (
        actual.get("actual_execute_result")
        or actual.get("inventory_reserve_actual_execute_result")
        or actual.get("automatic_payment_canary_inventory_reserve_actual_execute_result")
        or find_dict_with_key(actual, "actual_execute_result_status")
        or {}
    )
authority = actual.get("authority", {})

expected_state = policy.get("expected_actual_execute_state")
expected_status = policy.get("expected_actual_execute_result_status")

if execute.get("state") != expected_state:
    emit(False, "blocked_wrong_actual_execute_state", "actual_execute_state_mismatch")

if result.get("actual_execute_result_status") != expected_status:
    emit(False, "blocked_wrong_actual_execute_result_status", "actual_execute_result_status_mismatch")

if not as_bool(result.get("inventory_reserved")):
    emit(False, "blocked_inventory_not_reserved", "inventory_reserved_not_true")

if not as_bool(authority.get("inventory_reserved")):
    emit(False, "blocked_authority_inventory_reserved_not_true", "authority_inventory_reserved_not_true")

if result.get("allocation_record_created") is not False:
    emit(False, "blocked_allocation_record_already_created", "upstream_allocation_record_created_not_false")

if result.get("private_allocation_ledger_written") is not False:
    emit(False, "blocked_private_ledger_already_written", "upstream_private_ledger_written_not_false")

if int(policy.get("canary_candidate_limit")) != 1:
    emit(False, "blocked_canary_candidate_limit_invalid", "canary_candidate_limit_not_one")

if int(policy.get("canary_allocation_records_already_created")) >= 1:
    emit(True, "blocked_canary_allocation_record_limit_exhausted", "canary_allocation_record_limit_exhausted", None)

if policy.get("allow_allocation_record_creation") is not True:
    emit(False, "blocked_allocation_record_creation_not_allowed", "policy_disallows_allocation_record_creation")

for blocked_key in [
    "allow_private_allocation_ledger_write",
    "allow_fulfillment_execution",
    "allow_wallet_signing",
    "allow_void_transfer",
    "allow_public_mutation"
]:
    if policy.get(blocked_key) is not False:
        emit(False, "blocked_downstream_authority_policy_invalid", f"{blocked_key}_must_be_false")

before = dec(result.get("inventory_remaining_before"), "inventory_remaining_before")
after = dec(result.get("inventory_remaining_after"), "inventory_remaining_after")
reserved_amount = first_present(result, [
    "reserved_void_amount",
    "requested_void_amount",
    "void_amount",
    "reserved_amount",
    "candidate_void_amount"
])

if reserved_amount is None:
    reserved_amount = before - after

reserved_amount = dec(reserved_amount, "reserved_amount")

if reserved_amount <= 0:
    emit(False, "blocked_reserved_amount_invalid", "reserved_amount_must_be_positive")

if before - reserved_amount != after:
    emit(False, "blocked_inventory_math_mismatch", "before_minus_reserved_amount_does_not_equal_after")

canonical_payment_identity = first_present(result, [
    "canonical_payment_identity",
    "payment_identity",
    "canonical_receipt_identity"
])

if not canonical_payment_identity:
    emit(False, "blocked_missing_canonical_payment_identity", "canonical_payment_identity_missing")

buyer_key = first_present(result, ["buyer_key", "opaque_buyer_key"]) or "withheld_private_buyer_key"
void_receive_address = first_present(result, ["void_receive_address", "buyer_void_receive_address"]) or "withheld_private_void_receive_address"

allocation_record_id = stable_id([
    MARKER,
    canonical_payment_identity,
    norm_decimal(reserved_amount),
    buyer_key,
    void_receive_address
])

record = {
    "allocation_record_status": "allocation_record_created_pending_private_allocation_ledger_write_gate",
    "allocation_record_id": allocation_record_id,
    "source_actual_execute_marker": actual.get("marker"),
    "source_actual_execute_state": execute.get("state"),
    "source_actual_execute_result_status": result.get("actual_execute_result_status"),
    "canonical_payment_identity": canonical_payment_identity,
    "buyer_key": buyer_key,
    "void_receive_address": void_receive_address,
    "reserved_void_amount": norm_decimal(reserved_amount),
    "inventory_remaining_before": norm_decimal(before),
    "inventory_remaining_after": norm_decimal(after),
    "canary": {
        "candidate_limit": 1,
        "allocation_record_count_after": 1,
        "operator_review_required_after_record_creation": True,
        "process_one_candidate_then_stop": True
    },
    "downstream_authority": {
        "private_allocation_ledger_write": False,
        "fulfillment_execution": False,
        "wallet_signing": False,
        "void_transfer": False,
        "public_mutation": False,
        "public_buyer_execution": False
    }
}

emit(True, "allocation_record_created_pending_private_allocation_ledger_write_gate", "allocation_record_created_without_ledger_fulfillment_or_transfer_authority", record)
