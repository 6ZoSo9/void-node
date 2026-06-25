#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_REVIEW_GATE_V1"

ALLOWED = {
    "approve_for_allocation_candidate",
    "hold_for_operator_review",
    "reject_candidate",
}

def emit(ok, state, decision, reason, candidate=None):
    approved = (
        decision == "approve_for_allocation_candidate"
        and ok is True
        and state == "approved_for_allocation_candidate"
        and candidate is not None
    )
    print(json.dumps({
        "marker": MARKER,
        "ok": ok,
        "review": {
            "state": state,
            "decision": decision,
            "reason": reason,
            "candidate_present": candidate is not None,
            "approved_for_allocation_candidate": approved
        },
        "candidate": candidate,
        "authority": {
            "allocation_candidate_approved": approved,
            "allocation_record_created": False,
            "private_allocation_ledger_write": False,
            "inventory_reserved": False,
            "fulfillment_executed": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False,
            "public_buyer_execution": False
        }
    }, indent=2))

def main():
    bridge_output_path = os.environ.get("CANARY_BRIDGE_OUTPUT_JSON")
    review_path = os.environ.get("CANARY_CANDIDATE_REVIEW_JSON")

    if not bridge_output_path:
        emit(False, "blocked_missing_bridge_output", None, "CANARY_BRIDGE_OUTPUT_JSON_required")
        raise SystemExit(1)
    if not review_path:
        emit(False, "blocked_missing_review_input", None, "CANARY_CANDIDATE_REVIEW_JSON_required")
        raise SystemExit(1)

    bridge = json.loads(Path(bridge_output_path).read_text())
    review = json.loads(Path(review_path).read_text())

    decision = str(review.get("operator_review_decision", "")).strip()
    if decision not in ALLOWED:
        emit(False, "blocked_invalid_review_decision", decision, "invalid_review_decision")
        raise SystemExit(1)

    if not bridge.get("ok"):
        emit(False, "blocked_bridge_not_ok", decision, "bridge_not_ok")
        raise SystemExit(1)

    if bridge.get("bridge", {}).get("state") != "candidate_builder_allowed_and_completed":
        emit(True, "held_bridge_did_not_build_candidate", decision, "bridge_did_not_build_candidate")
        return

    builder_output = bridge.get("builder_output") or {}
    candidate = builder_output.get("candidate")
    if not builder_output.get("ok") or not candidate:
        emit(False, "blocked_missing_built_candidate", decision, "missing_built_candidate")
        raise SystemExit(1)

    if decision == "approve_for_allocation_candidate":
        emit(True, "approved_for_allocation_candidate", decision, "operator_approved_candidate", candidate)
        return
    if decision == "hold_for_operator_review":
        emit(True, "held_for_operator_review", decision, "operator_held_candidate", candidate)
        return
    if decision == "reject_candidate":
        emit(True, "rejected_by_operator", decision, "operator_rejected_candidate", candidate)
        return

if __name__ == "__main__":
    main()
