#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_APPROVAL_V1"

ALLOWED = {
    "approve_for_separate_private_allocation_ledger_write_execute",
    "hold_for_operator_review",
    "reject_private_allocation_ledger_write_packet",
}

EXPECTED_PACKET_HOLD_STATE = "held_pending_separate_operator_private_allocation_ledger_write_review"

def emit(ok, state, decision, reason, packet=None):
    approved = (
        ok is True
        and state == "approved_pending_separate_private_allocation_ledger_write_execute"
        and decision == "approve_for_separate_private_allocation_ledger_write_execute"
        and packet is not None
    )

    print(json.dumps({
        "marker": MARKER,
        "ok": bool(ok),
        "operator_approval": {
            "state": state,
            "decision": decision,
            "reason": reason,
            "approved_for_separate_private_allocation_ledger_write_execute": approved
        },
        "private_allocation_ledger_write_packet": packet,
        "authority": {
            "private_allocation_ledger_write_execute_approved": approved,
            "private_allocation_ledger_write_now": False,
            "private_allocation_ledger_mutation": False,
            "fulfillment_execution": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False,
            "public_buyer_execution": False
        }
    }, indent=2, sort_keys=True))

def load_json_env(name):
    path = os.environ.get(name, "")
    if not path:
        emit(False, "blocked_missing_input", None, f"{name}_required")
        raise SystemExit(1)

    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as exc:
        emit(False, "blocked_invalid_input", None, f"{name}_invalid_json:{exc}")
        raise SystemExit(1)

def require_false(mapping, keys, prefix):
    for key in keys:
        if mapping.get(key) is not False:
            emit(False, "blocked_upstream_authority_not_false", None, f"{prefix}_{key}_must_be_false")
            raise SystemExit(1)

def main():
    packet_hold = load_json_env("CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_PACKET_HOLD_OUTPUT_JSON")
    decision_doc = load_json_env("CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_DECISION_JSON")

    decision = str(decision_doc.get("operator_private_allocation_ledger_write_decision", "")).strip()
    if decision not in ALLOWED:
        emit(False, "blocked_invalid_operator_decision", decision, "invalid_operator_private_allocation_ledger_write_decision")
        raise SystemExit(1)

    if decision_doc.get("reviewer") != "operator":
        emit(False, "blocked_invalid_reviewer", decision, "reviewer_must_be_operator")
        raise SystemExit(1)

    if int(decision_doc.get("max_packet_count", 0)) != 1:
        emit(False, "blocked_invalid_max_packet_count", decision, "max_packet_count_must_be_one")
        raise SystemExit(1)

    hold = packet_hold.get("private_allocation_ledger_write_packet_hold", {})
    if hold.get("ok") is not True:
        emit(False, "blocked_packet_hold_not_ok", decision, "packet_hold_not_ok")
        raise SystemExit(1)

    if hold.get("state") != EXPECTED_PACKET_HOLD_STATE:
        emit(True, "blocked_packet_hold_not_ready", decision, "packet_hold_state:" + str(hold.get("state")))
        return

    authority = packet_hold.get("authority", {})
    if authority.get("packet_created") is not True:
        emit(False, "blocked_packet_not_created", decision, "packet_created_not_true")
        raise SystemExit(1)

    require_false(authority, [
        "private_allocation_ledger_write_now",
        "private_allocation_ledger_mutation",
        "fulfillment_execution",
        "wallet_signing",
        "void_transfer",
        "public_mutation",
        "public_buyer_execution"
    ], "authority")

    packet = packet_hold.get("packet")
    if not isinstance(packet, dict):
        emit(False, "blocked_missing_packet", decision, "private_allocation_ledger_write_packet_missing")
        raise SystemExit(1)

    if packet.get("packet_status") != EXPECTED_PACKET_HOLD_STATE:
        emit(False, "blocked_wrong_packet_status", decision, "packet_status_invalid")
        raise SystemExit(1)

    required_packet_fields = [
        "packet_id",
        "allocation_record_id",
        "canonical_payment_identity",
        "buyer_key",
        "void_receive_address",
        "reserved_void_amount",
        "inventory_remaining_before",
        "inventory_remaining_after"
    ]
    missing = [field for field in required_packet_fields if not packet.get(field)]
    if missing:
        emit(False, "blocked_missing_packet_fields", decision, ",".join(missing))
        raise SystemExit(1)

    if not str(packet.get("packet_id")).startswith("void_canary_private_allocation_ledger_write_packet_"):
        emit(False, "blocked_wrong_packet_id", decision, "packet_id_invalid")
        raise SystemExit(1)

    if packet.get("operator_review_required_before_actual_ledger_write") is not True:
        emit(False, "blocked_operator_review_not_required", decision, "operator_review_required_flag_not_true")
        raise SystemExit(1)

    downstream = packet.get("downstream_authority", {})
    require_false(downstream, [
        "private_allocation_ledger_write_now",
        "private_allocation_ledger_mutation",
        "fulfillment_execution",
        "wallet_signing",
        "void_transfer",
        "public_mutation",
        "public_buyer_execution"
    ], "downstream_authority")

    if decision == "approve_for_separate_private_allocation_ledger_write_execute":
        emit(True, "approved_pending_separate_private_allocation_ledger_write_execute", decision, "operator_approved_packet_for_separate_private_ledger_write_execute", packet)
        return

    if decision == "hold_for_operator_review":
        emit(True, "held_for_operator_review", decision, "operator_held_private_ledger_write_packet", packet)
        return

    if decision == "reject_private_allocation_ledger_write_packet":
        emit(True, "rejected_by_operator", decision, "operator_rejected_private_ledger_write_packet", packet)
        return

if __name__ == "__main__":
    main()
