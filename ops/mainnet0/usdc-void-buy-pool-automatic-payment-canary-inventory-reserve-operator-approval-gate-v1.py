#!/usr/bin/env python3
import json
import os
from pathlib import Path

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_GATE_V1"

ALLOWED = {
    "approve_for_separate_inventory_reserve_execution_packet",
    "hold_for_operator_review",
    "reject_inventory_reserve_candidate",
}

def emit(ok, state, decision, reason, reserve_candidate=None):
    approved = (
        ok is True
        and state == "approved_for_separate_inventory_reserve_execution_packet"
        and decision == "approve_for_separate_inventory_reserve_execution_packet"
        and reserve_candidate is not None
    )
    print(json.dumps({
        "marker": MARKER,
        "ok": ok,
        "operator_approval": {
            "state": state,
            "decision": decision,
            "reason": reason,
            "approved_for_separate_inventory_reserve_execution_packet": approved
        },
        "inventory_reserve_candidate": reserve_candidate,
        "authority": {
            "inventory_reserve_execution_packet_approved": approved,
            "inventory_reserved": False,
            "inventory_decremented": False,
            "allocation_record_created": False,
            "private_allocation_ledger_write": False,
            "fulfillment_executed": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False,
            "public_buyer_execution": False
        }
    }, indent=2))

def main():
    preflight_path = os.environ.get("CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON")
    decision_path = os.environ.get("CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON")

    if not preflight_path:
        emit(False, "blocked_missing_preflight_output", None, "CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON_required")
        raise SystemExit(1)
    if not decision_path:
        emit(False, "blocked_missing_operator_decision", None, "CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON_required")
        raise SystemExit(1)

    preflight = json.loads(Path(preflight_path).read_text())
    decision_doc = json.loads(Path(decision_path).read_text())

    decision = str(decision_doc.get("operator_inventory_reserve_decision", "")).strip()
    if decision not in ALLOWED:
        emit(False, "blocked_invalid_operator_decision", decision, "invalid_operator_inventory_reserve_decision")
        raise SystemExit(1)

    if not preflight.get("ok"):
        emit(False, "blocked_preflight_not_ok", decision, "preflight_not_ok")
        raise SystemExit(1)

    pf = preflight.get("preflight", {})
    if pf.get("state") != "inventory_reserve_candidate_eligible":
        emit(True, "blocked_preflight_not_eligible", decision, "preflight_state:" + str(pf.get("state")))
        return

    if pf.get("inventory_reserve_candidate_eligible") is not True:
        emit(True, "blocked_preflight_eligible_flag_false", decision, "inventory_reserve_candidate_eligible_false")
        return

    reserve_candidate = preflight.get("inventory_reserve_candidate")
    if not reserve_candidate:
        emit(False, "blocked_missing_inventory_reserve_candidate", decision, "inventory_reserve_candidate_missing")
        raise SystemExit(1)

    if reserve_candidate.get("inventory_reserve_candidate_kind") != "automatic_payment_canary_inventory_reserve_candidate":
        emit(False, "blocked_wrong_inventory_reserve_candidate_kind", decision, "inventory_reserve_candidate_kind_invalid")
        raise SystemExit(1)

    if reserve_candidate.get("inventory_reserve_candidate_status") != "eligible_pending_operator_actual_reserve":
        emit(False, "blocked_wrong_inventory_reserve_candidate_status", decision, "inventory_reserve_candidate_status_invalid")
        raise SystemExit(1)

    if decision == "approve_for_separate_inventory_reserve_execution_packet":
        emit(True, "approved_for_separate_inventory_reserve_execution_packet", decision, "operator_approved_reserve_candidate", reserve_candidate)
        return

    if decision == "hold_for_operator_review":
        emit(True, "held_for_operator_review", decision, "operator_held_reserve_candidate", reserve_candidate)
        return

    if decision == "reject_inventory_reserve_candidate":
        emit(True, "rejected_by_operator", decision, "operator_rejected_reserve_candidate", reserve_candidate)
        return

if __name__ == "__main__":
    main()
