#!/usr/bin/env python3
import hashlib
import json
import os
import sys
from decimal import Decimal, InvalidOperation

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PACKET_HOLD_V1"

def emit(ok, state, reason, packet=None):
    print(json.dumps({
        "marker": MARKER,
        "private_allocation_ledger_write_packet_hold": {
            "ok": bool(ok),
            "state": state,
            "reason": reason
        },
        "authority": {
            "packet_created": bool(ok and packet is not None),
            "private_allocation_ledger_write_now": False,
            "private_allocation_ledger_mutation": False,
            "fulfillment_execution": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False,
            "public_buyer_execution": False
        },
        "packet": packet
    }, indent=2, sort_keys=True))
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

def stable_id(parts):
    h = hashlib.sha256()
    for part in parts:
        h.update(str(part).encode("utf-8"))
        h.update(b"\x1f")
    return "void_canary_private_allocation_ledger_write_packet_" + h.hexdigest()[:32]

source = load_json_env("CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PREFLIGHT_OUTPUT_JSON")
policy = load_json_env("CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PACKET_HOLD_POLICY_JSON")

gate = source.get("private_allocation_ledger_write_preflight", {})
preflight = source.get("preflight")
authority = source.get("authority", {})

if not isinstance(preflight, dict):
    emit(False, "blocked_missing_preflight", "preflight_missing")

if gate.get("state") != policy.get("expected_preflight_state"):
    emit(False, "blocked_wrong_preflight_state", "preflight_state_mismatch")

if preflight.get("preflight_status") != policy.get("expected_preflight_status"):
    emit(False, "blocked_wrong_preflight_status", "preflight_status_mismatch")

if authority.get("preflight_passed") is not True:
    emit(False, "blocked_preflight_not_passed", "authority_preflight_passed_not_true")

for key in [
    "private_allocation_ledger_write_now",
    "private_allocation_ledger_mutation",
    "fulfillment_execution",
    "wallet_signing",
    "void_transfer",
    "public_mutation",
    "public_buyer_execution"
]:
    if authority.get(key) is not False:
        emit(False, "blocked_upstream_authority_not_false", f"upstream_{key}_must_be_false")

if int(policy.get("canary_packet_limit")) != 1:
    emit(False, "blocked_canary_packet_limit_invalid", "packet_limit_must_be_one")

if int(policy.get("canary_packets_already_created")) >= 1:
    emit(True, "blocked_canary_packet_limit_exhausted", "canary_packet_limit_exhausted", None)

if policy.get("allow_private_allocation_ledger_write_packet_creation") is not True:
    emit(False, "blocked_packet_creation_not_allowed", "policy_disallows_packet_creation")

for key in [
    "allow_private_allocation_ledger_write_now",
    "allow_private_allocation_ledger_mutation",
    "allow_fulfillment_execution",
    "allow_wallet_signing",
    "allow_void_transfer",
    "allow_public_mutation"
]:
    if policy.get(key) is not False:
        emit(False, "blocked_downstream_authority_policy_invalid", f"{key}_must_be_false")

required = [
    "allocation_record_id",
    "canonical_payment_identity",
    "buyer_key",
    "void_receive_address",
    "reserved_void_amount",
    "inventory_remaining_before",
    "inventory_remaining_after"
]
missing = [k for k in required if not preflight.get(k)]
if missing:
    emit(False, "blocked_missing_preflight_fields", ",".join(missing))

reserved = dec(preflight.get("reserved_void_amount"), "reserved_void_amount")
before = dec(preflight.get("inventory_remaining_before"), "inventory_remaining_before")
after = dec(preflight.get("inventory_remaining_after"), "inventory_remaining_after")

if reserved <= 0:
    emit(False, "blocked_reserved_amount_invalid", "reserved_amount_must_be_positive")

if before - reserved != after:
    emit(False, "blocked_inventory_math_mismatch", "before_minus_reserved_does_not_equal_after")

packet_id = stable_id([
    MARKER,
    preflight.get("allocation_record_id"),
    preflight.get("canonical_payment_identity"),
    norm_decimal(reserved)
])

packet = {
    "packet_status": "held_pending_separate_operator_private_allocation_ledger_write_review",
    "packet_id": packet_id,
    "source_preflight_marker": source.get("marker"),
    "source_preflight_state": gate.get("state"),
    "allocation_record_id": preflight.get("allocation_record_id"),
    "canonical_payment_identity": preflight.get("canonical_payment_identity"),
    "buyer_key": preflight.get("buyer_key"),
    "void_receive_address": preflight.get("void_receive_address"),
    "reserved_void_amount": norm_decimal(reserved),
    "inventory_remaining_before": norm_decimal(before),
    "inventory_remaining_after": norm_decimal(after),
    "operator_review_required_before_actual_ledger_write": True,
    "canary": {
        "packet_limit": 1,
        "packets_created_after": 1,
        "process_one_packet_then_stop": True
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

emit(True, "held_pending_separate_operator_private_allocation_ledger_write_review", "packet_shape_created_without_ledger_write_or_downstream_authority", packet)
